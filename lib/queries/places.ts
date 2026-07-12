/**
 * Lugares — selects reales a Supabase (Cuenta B).
 * Firmas idénticas al mock original; sin `.env` cae a los datos mock.
 */
import { Categoria, MOCK_PLACES, Place } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { reverseGeocodeDepartment } from './geocoding';
import { uploadImage } from './uploads';

interface PlaceRow {
  id: string;
  name: string;
  department: string;
  description: string | null;
  lat: number;
  lng: number;
  category: Categoria | null;
  cover_image_url: string | null;
  map_icon_url: string | null;
  source: 'official' | 'community';
  created_by: string | null;
  verification_count: number;
  is_verified: boolean;
}

const PLACE_COLUMNS =
  'id, name, department, description, lat, lng, category, cover_image_url, map_icon_url, source, created_by, verification_count, is_verified';

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    description: row.description ?? '',
    lat: row.lat,
    lng: row.lng,
    category: row.category ?? 'naturaleza',
    coverImageUrl: row.cover_image_url,
    mapIconUrl: row.map_icon_url,
    source: row.source,
    createdBy: row.created_by,
    verificationCount: row.verification_count,
    isVerified: row.is_verified,
  };
}

export async function getPlaces(): Promise<Place[]> {
  if (!isSupabaseConfigured) return MOCK_PLACES;

  const { data, error } = await getSupabase().from('places').select(PLACE_COLUMNS).order('name');
  if (error) {
    console.warn('getPlaces:', error.message);
    return [];
  }
  return (data as PlaceRow[]).map(toPlace);
}

export async function getPlaceById(id: string): Promise<Place | null> {
  if (!isSupabaseConfigured) return MOCK_PLACES.find((p) => p.id === id) ?? null;

  const { data, error } = await getSupabase().from('places').select(PLACE_COLUMNS).eq('id', id).maybeSingle();
  if (error) {
    console.warn('getPlaceById:', error.message);
    return null;
  }
  return data ? toPlace(data as PlaceRow) : null;
}

// ---------------------------------------------------------------------------
// Pivote Fase 3 — conectado a Supabase real (Cuenta B).
// createPlace: sube la foto a Storage, resuelve el departamento por reverse
// geocoding (Nominatim) e inserta con source='community'. confirmPlace:
// inserta en place_verifications; un trigger de Postgres recuenta y marca
// is_verified=true al llegar a 3 (robusto ante carreras, nada en el cliente).
// Sin `.env`, ambas caen al mock en memoria original.
// ---------------------------------------------------------------------------

export interface NewPlaceInput {
  name: string;
  category: Categoria;
  description: string;
  lat: number;
  lng: number;
  /** URI local de expo-image-picker; Cuenta B la sube a Storage. */
  photoUri: string;
}

export async function createPlace(input: NewPlaceInput): Promise<{ place: Place | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    // MOCK: inserta en memoria para que el mapa lo muestre sin backend.
    await new Promise((r) => setTimeout(r, 500));
    const place: Place = {
      id: `local-${Date.now()}`,
      name: input.name.trim(),
      department: 'Por confirmar',
      description: input.description.trim(),
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      coverImageUrl: input.photoUri,
      mapIconUrl: null,
      source: 'community',
      createdBy: 'mock-user-1',
      verificationCount: 0,
      isVerified: false,
    };
    MOCK_PLACES.push(place);
    return { place, error: null };
  }

  // Solo territorio salvadoreño: evita lugares fantasma creados desde
  // emuladores (ubicación por defecto en EE.UU.) o GPS sin señal.
  if (input.lat < 13.0 || input.lat > 14.5 || input.lng < -90.2 || input.lng > -87.6) {
    return { place: null, error: 'La ubicación está fuera de El Salvador. Mueve el pin dentro del país.' };
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { place: null, error: 'Inicia sesión para crear un lugar.' };

  // 1. Foto obligatoria → Storage (bucket público `uploads`)
  const { url: coverUrl, error: uploadError } = await uploadImage(input.photoUri, 'places', user.id);
  if (uploadError) return { place: null, error: `No se pudo subir la foto: ${uploadError}` };

  // 2. Departamento automático desde las coordenadas (alimenta el panel territorial)
  const department = (await reverseGeocodeDepartment(input.lat, input.lng)) ?? 'El Salvador';

  // 3. Insertar como lugar de comunidad sin verificar
  const { data, error } = await supabase
    .from('places')
    .insert({
      name: input.name.trim(),
      department,
      description: input.description.trim(),
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      cover_image_url: coverUrl,
      source: 'community',
      created_by: user.id,
      is_verified: false,
    })
    .select(PLACE_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') return { place: null, error: 'Ya existe un lugar con ese nombre.' };
    return { place: null, error: error.message };
  }
  return { place: toPlace(data as PlaceRow), error: null };
}

/**
 * Confirma que el lugar existe; opcionalmente con calificación 1-5 estrellas
 * (columna `rating` en place_verifications — el promedio sale de ahí, una
 * sola opinión por usuario garantizada por el unique).
 */
export async function confirmPlace(
  placeId: string,
  rating?: number,
): Promise<{ verificationCount: number; isVerified: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    // MOCK: muta el lugar en memoria.
    await new Promise((r) => setTimeout(r, 400));
    const p = MOCK_PLACES.find((x) => x.id === placeId);
    if (!p) return { verificationCount: 0, isVerified: false, error: 'Lugar no encontrado.' };
    p.verificationCount = (p.verificationCount ?? 0) + 1;
    p.isVerified = p.verificationCount >= 3;
    return { verificationCount: p.verificationCount, isVerified: p.isVerified, error: null };
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { verificationCount: 0, isVerified: false, error: 'Inicia sesión para confirmar lugares.' };

  const { error } = await supabase
    .from('place_verifications')
    .insert({ place_id: placeId, user_id: user.id, ...(rating ? { rating } : {}) });
  if (error) {
    let msg = error.message;
    if (error.code === '23505') msg = 'Ya confirmaste este lugar.';
    if (error.code === '42501') msg = 'No puedes confirmar un lugar que creaste tú.';
    return { verificationCount: 0, isVerified: false, error: msg };
  }

  // El trigger on_place_verification ya recontó; leemos el resultado final.
  const { data } = await supabase
    .from('places')
    .select('verification_count, is_verified')
    .eq('id', placeId)
    .single();

  return {
    verificationCount: data?.verification_count ?? 0,
    isVerified: data?.is_verified ?? false,
    error: null,
  };
}

/** Promedio de calificación del lugar (estrellas dadas al confirmarlo). */
export async function getPlaceRating(placeId: string): Promise<{ average: number; count: number }> {
  if (!isSupabaseConfigured) return { average: 4.5, count: 2 };

  const { data, error } = await getSupabase()
    .from('place_verifications')
    .select('rating')
    .eq('place_id', placeId)
    .not('rating', 'is', null);
  if (error || !data || data.length === 0) return { average: 0, count: 0 };

  const ratings = (data as { rating: number }[]).map((r) => r.rating);
  const average = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return { average: Math.round(average * 10) / 10, count: ratings.length };
}

/** Top N para el Home, ordenado por actividad real (cantidad de fotos subidas). */
export async function getTopPlaces(limit = 5): Promise<Place[]> {
  if (!isSupabaseConfigured) return MOCK_PLACES.slice(0, limit);

  const supabase = getSupabase();
  const [placesRes, uploadsRes] = await Promise.all([
    supabase.from('places').select(PLACE_COLUMNS),
    supabase.from('uploads').select('target_id').eq('target_type', 'place'),
  ]);
  if (placesRes.error) {
    console.warn('getTopPlaces:', placesRes.error.message);
    return [];
  }

  const counts = new Map<string, number>();
  for (const u of (uploadsRes.data ?? []) as { target_id: string }[]) {
    counts.set(u.target_id, (counts.get(u.target_id) ?? 0) + 1);
  }

  return (placesRes.data as PlaceRow[])
    .map(toPlace)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
