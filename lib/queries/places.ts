/**
 * Lugares — selects reales a Supabase (Cuenta B).
 * Firmas idénticas al mock original; sin `.env` cae a los datos mock.
 */
import { Categoria, MOCK_PLACES, Place } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';

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
}

const PLACE_COLUMNS = 'id, name, department, description, lat, lng, category, cover_image_url, map_icon_url';

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
