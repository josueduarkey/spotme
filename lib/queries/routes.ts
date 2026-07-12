/**
 * Rutas y Planificación — Integración con OSRM y base de datos (Cuenta B).
 */
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { Categoria, Place } from '../../constants/mock';
import { getPlaces } from './places';

/** Costo de entrada/consumo estimado por categoría de lugar (USD). */
export const COSTO_CATEGORIA: Record<string, number> = {
  naturaleza: 4,
  cultura: 10,
  gastronomia: 8,
  aventura: 15,
  playa: 6,
  historia: 10,
  urbano: 5,
};

/** Distancia haversine punto a punto en km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface PlannedRoute {
  id: string;
  userId: string;
  placeIds: string[];
  estimatedBudget: number;
  estimatedDurationMinutes: number;
  createdAt: string;
}

export interface OSRMRouteResult {
  geometry: any; // GeoJSON LineString
  distanceKm: number;
  durationMinutes: number;
  error: string | null;
}

/**
 * Llama a la API pública de OSRM para trazar la ruta óptima por carretera
 * entre una lista de coordenadas ordenadas.
 */
export async function getOSRMRoute(coordinates: { lat: number; lng: number }[]): Promise<OSRMRouteResult> {
  if (coordinates.length < 2) {
    return { geometry: null, distanceKm: 0, durationMinutes: 0, error: 'Se necesitan al menos 2 paradas.' };
  }

  try {
    // Formato OSRM: lng,lat;lng,lat...
    const coordString = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al consultar OSRM.');
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return { geometry: null, distanceKm: 0, durationMinutes: 0, error: 'No se encontró una ruta vial.' };
    }

    const route = data.routes[0];
    return {
      geometry: route.geometry, // GeoJSON
      distanceKm: parseFloat((route.distance / 1000).toFixed(1)), // De metros a km
      durationMinutes: Math.ceil(route.duration / 60), // De segundos a minutos
      error: null,
    };
  } catch (e) {
    return {
      geometry: null,
      distanceKm: 0,
      durationMinutes: 0,
      error: e instanceof Error ? e.message : 'Error de red en OSRM.',
    };
  }
}

/**
 * Calcula la distancia perpendicular en kilómetros desde un punto (lat, lng)
 * hacia una línea recta definida por dos puntos (start, end).
 */
function getDistanceToSegment(
  latP: number,
  lngP: number,
  latS: number,
  lngS: number,
  latE: number,
  lngE: number
): number {
  // Convertir a radianes aproximados
  const x = lngP - lngS;
  const y = latP - latS;
  const dx = lngE - lngS;
  const dy = latE - latS;

  const lenSq = dx * dx + dy * dy;
  let param = -1;
  if (lenSq !== 0) {
    param = (x * dx + y * dy) / lenSq;
  }

  let xx, yy;
  if (param < 0) {
    xx = lngS;
    yy = latS;
  } else if (param > 1) {
    xx = lngE;
    yy = latE;
  } else {
    xx = lngS + param * dx;
    yy = latS + param * dy;
  }

  // Distancia haversine entre P y la proyección más cercana en el segmento
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((yy - latP) * Math.PI) / 180;
  const dLon = ((xx - lngP) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((latP * Math.PI) / 180) *
      Math.cos((yy * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Recomienda lugares turísticos que están "de camino" (a menos de 8 km)
 * entre un punto de inicio y un destino.
 */
export async function recommendPlacesAlongRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  excludeIds: string[] = []
): Promise<Place[]> {
  const allPlaces = await getPlaces();
  const excludeSet = new Set(excludeIds);

  return allPlaces.filter((p) => {
    if (excludeSet.has(p.id)) return false;
    
    // Filtro rápido por Bounding Box expandido
    const padding = 0.12; // ~12 km de margen de holgura
    const minLat = Math.min(startLat, endLat) - padding;
    const maxLat = Math.max(startLat, endLat) + padding;
    const minLng = Math.min(startLng, endLng) - padding;
    const maxLng = Math.max(startLng, endLng) + padding;

    if (p.lat < minLat || p.lat > maxLat || p.lng < minLng || p.lng > maxLng) {
      return false;
    }

    // Distancia exacta al segmento de viaje
    const dist = getDistanceToSegment(p.lat, p.lng, startLat, startLng, endLat, endLng);
    return dist <= 8; // Recomendar si está a menos de 8 km del trayecto recto
  });
}

/**
 * Guarda una ruta planificada en la base de datos de Supabase.
 */
export async function savePlannedRoute(
  placeIds: string[],
  estimatedBudget: number,
  estimatedDurationMinutes: number
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, error: null };
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Inicia sesión para guardar rutas.' };

    const { error } = await supabase.from('planned_routes').insert({
      user_id: user.id,
      place_ids: placeIds,
      estimated_budget: estimatedBudget,
      estimated_duration_minutes: estimatedDurationMinutes,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al guardar la ruta.' };
  }
}

/**
 * Recupera el historial de rutas planificadas del usuario logueado.
 */
export async function getPlannedRoutes(): Promise<PlannedRoute[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('planned_routes')
      .select('id, user_id, place_ids, estimated_budget, estimated_duration_minutes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getPlannedRoutes:', error.message);
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      placeIds: row.place_ids,
      estimatedBudget: parseFloat(row.estimated_budget ?? 0),
      estimatedDurationMinutes: row.estimated_duration_minutes ?? 0,
      createdAt: row.created_at,
    }));
  } catch (e) {
    console.warn(e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Mi aventura — roadmap personalizado por intereses y días disponibles.
// El turista elige qué le gusta y cuánto tiempo tiene; el generador agrupa
// lugares reales del twin por cercanía geográfica en días coherentes.
// ---------------------------------------------------------------------------

export interface DiaAventura {
  dia: number;
  /** Departamento dominante del día, ej. "Santa Ana". */
  titulo: string;
  lugares: Place[];
  /** Entradas/consumo + transporte estimado del día (USD). */
  presupuesto: number;
  /** Kilómetros encadenados entre los lugares del día. */
  distanciaKm: number;
}

/** Base del turista: San Salvador (punto de llegada típico). */
const BASE_SS = { lat: 13.6989, lng: -89.1914 };
const COSTO_KM = 0.15; // mismo criterio que la pantalla de ruta

/**
 * Genera el roadmap: filtra por intereses, ordena por cercanía (vecino más
 * próximo desde San Salvador) y parte en días de 2-3 lugares.
 */
export async function generarAventura(intereses: Categoria[], dias: number): Promise<DiaAventura[]> {
  const todos = await getPlaces();
  const setIntereses = new Set(intereses);

  // 1. Prioridad: lugares que matchean intereses; verificados primero.
  const puntaje = (p: Place) =>
    (setIntereses.has(p.category) ? 2 : 0) + (p.source !== 'community' || p.isVerified ? 1 : 0);
  const candidatos = [...todos].sort((a, b) => puntaje(b) - puntaje(a));

  // 2. Cupo total: 2-3 lugares por día según catálogo disponible.
  const porDia = candidatos.length >= dias * 3 ? 3 : 2;
  const cupo = Math.min(dias * porDia, candidatos.length);
  const seleccion = candidatos.slice(0, cupo);

  // 3. Orden geográfico: vecino más cercano partiendo de San Salvador,
  //    para que los días avancen por el territorio sin zigzaguear.
  const ordenados: Place[] = [];
  const pendientes = [...seleccion];
  let cursor = BASE_SS;
  while (pendientes.length > 0) {
    let mejorIdx = 0;
    let mejorDist = Infinity;
    for (let i = 0; i < pendientes.length; i++) {
      const d = haversineKm(cursor.lat, cursor.lng, pendientes[i].lat, pendientes[i].lng);
      if (d < mejorDist) {
        mejorDist = d;
        mejorIdx = i;
      }
    }
    const [siguiente] = pendientes.splice(mejorIdx, 1);
    ordenados.push(siguiente);
    cursor = { lat: siguiente.lat, lng: siguiente.lng };
  }

  // 4. Partir en días consecutivos (la cadena ya es geográficamente coherente).
  const resultado: DiaAventura[] = [];
  for (let d = 0; d < dias && d * porDia < ordenados.length; d++) {
    const lugares = ordenados.slice(d * porDia, (d + 1) * porDia);
    if (lugares.length === 0) break;

    let distancia = 0;
    for (let i = 1; i < lugares.length; i++) {
      distancia += haversineKm(lugares[i - 1].lat, lugares[i - 1].lng, lugares[i].lat, lugares[i].lng);
    }
    const entradas = lugares.reduce((s, p) => s + (COSTO_CATEGORIA[p.category] ?? 5), 0);

    // Departamento dominante como título del día
    const porDepto = new Map<string, number>();
    for (const l of lugares) porDepto.set(l.department, (porDepto.get(l.department) ?? 0) + 1);
    const titulo = [...porDepto.entries()].sort((a, b) => b[1] - a[1])[0][0];

    resultado.push({
      dia: d + 1,
      titulo,
      lugares,
      presupuesto: Math.ceil(entradas + distancia * COSTO_KM),
      distanciaKm: Math.round(distancia),
    });
  }
  return resultado;
}
