/**
 * Buscador de lugares — Google Places API (New) con fallback a Nominatim (Cuenta B).
 *
 * Uso pensado para Cuenta A: barra de búsqueda en el mapa o en "Crear lugar".
 * Un resultado trae nombre + coordenadas + categoría sugerida: sirve para
 * centrar el mapa o para prellenar la pantalla 7b (el usuario solo agrega la
 * foto) — así el buscador alimenta la creación comunitaria, no la reemplaza.
 *
 * La key es la misma de Google Maps de app.json (Places API ya habilitada,
 * verificada contra el proyecto real). Si Google fallara, cae a Nominatim.
 */
import Constants from 'expo-constants';
import { Categoria } from '../../constants/mock';

const GOOGLE_KEY: string =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 'AIzaSyBE5rKSq03ZEN8tlGbSaQhOnGgf6IIEoJ4';

/** Caja que encierra El Salvador, para sesgar resultados al territorio. */
const SV_BOUNDS = {
  low: { latitude: 13.0, longitude: -90.2 },
  high: { latitude: 14.5, longitude: -87.6 },
};

export interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Categoría sugerida para prellenar "Crear lugar". */
  category: Categoria;
  source: 'google' | 'osm';
}

function toCategoria(types: string[] = []): Categoria {
  const t = types.join(' ');
  if (/restaurant|cafe|coffee|food|bakery|bar|meal/.test(t)) return 'gastronomia';
  if (/museum|church|historical|monument|cultural|art_gallery|town_square/.test(t)) return 'cultura';
  if (/hiking|amusement|adventure|sports|climbing|surf/.test(t)) return 'aventura';
  return 'naturaleza';
}

async function searchGoogle(query: string): Promise<PlaceSearchResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types',
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'es',
      regionCode: 'SV',
      maxResultCount: 8,
      locationBias: { rectangle: SV_BOUNDS },
    }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}`);
  const data: {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      types?: string[];
    }[];
  } = await res.json();

  return (data.places ?? [])
    .filter((p) => p.location && p.displayName?.text)
    .map((p) => ({
      name: p.displayName!.text!,
      address: p.formattedAddress ?? '',
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      category: toCategoria(p.types),
      source: 'google' as const,
    }));
}

async function searchNominatim(query: string): Promise<PlaceSearchResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=sv&q=' +
    encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'spotmi-hackathon/1.0 (turismo El Salvador PoC)' },
  });
  if (!res.ok) return [];
  const rows: { display_name: string; lat: string; lon: string; class?: string }[] = await res.json();
  return rows.map((r) => ({
    name: r.display_name.split(',')[0],
    address: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    category: 'naturaleza' as Categoria,
    source: 'osm' as const,
  }));
}

// ---------------------------------------------------------------------------
// Búsqueda por cercanía (Places API New, searchNearby) — enriquece la zona de
// "Mi aventura" con lugares reales de Google alrededor del ancla del match.
// ---------------------------------------------------------------------------

/** Tipos de Places API (New) por categoría — conservadores para evitar 400. */
const TIPOS_POR_CATEGORIA: Record<Categoria, string[]> = {
  naturaleza: ['national_park', 'park'],
  cultura: ['museum', 'historical_landmark', 'art_gallery'],
  gastronomia: ['restaurant', 'cafe'],
  aventura: ['amusement_park', 'tourist_attraction'],
  playa: ['beach'],
  historia: ['historical_landmark', 'museum'],
  urbano: ['tourist_attraction', 'shopping_mall'],
};

async function fetchNearby(
  lat: number,
  lng: number,
  radiusM: number,
  includedTypes: string[],
): Promise<PlaceSearchResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types',
    },
    body: JSON.stringify({
      languageCode: 'es',
      regionCode: 'SV',
      maxResultCount: 10,
      rankPreference: 'POPULARITY',
      includedTypes,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radiusM, 50000) },
      },
    }),
  });
  if (!res.ok) throw new Error(`searchNearby ${res.status}`);
  const data: {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      types?: string[];
    }[];
  } = await res.json();
  return (data.places ?? [])
    .filter((p) => p.location && p.displayName?.text)
    .map((p) => ({
      name: p.displayName!.text!,
      address: p.formattedAddress ?? '',
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      category: toCategoria(p.types),
      source: 'google' as const,
    }));
}

/**
 * Lugares reales de Google cerca de un punto, filtrados por los intereses del
 * turista. Si algún tipo no es válido para la API, reintenta con
 * tourist_attraction; si Google falla del todo, devuelve [] (la aventura
 * funciona igual solo con el catálogo del twin).
 */
export async function nearbyPlaces(
  lat: number,
  lng: number,
  categorias: Categoria[],
  radiusKm = 25,
): Promise<PlaceSearchResult[]> {
  const tipos = [...new Set(categorias.flatMap((c) => TIPOS_POR_CATEGORIA[c] ?? []))].slice(0, 5);
  try {
    return await fetchNearby(lat, lng, radiusKm * 1000, tipos.length ? tipos : ['tourist_attraction']);
  } catch (e) {
    console.warn('nearbyPlaces:', e);
    try {
      return await fetchNearby(lat, lng, radiusKm * 1000, ['tourist_attraction']);
    } catch {
      return [];
    }
  }
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const results = await searchGoogle(q);
    if (results.length > 0) return results;
  } catch (e) {
    console.warn('searchPlaces (Google):', e);
  }
  try {
    return await searchNominatim(q);
  } catch (e) {
    console.warn('searchPlaces (Nominatim):', e);
    return [];
  }
}
