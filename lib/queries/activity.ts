/**
 * Actividad de turistas — agrega `uploads` reales en celdas de ~1 km
 * para la capa de heatmap del mapa (Cuenta B).
 * Firma idéntica al mock original; sin `.env` cae a los datos mock.
 */
import { ActivityPoint, MOCK_ACTIVITY } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';

/** Tamaño de celda en grados (~1 km en El Salvador). */
const CELL = 0.01;

export async function getActivityPoints(): Promise<ActivityPoint[]> {
  if (!isSupabaseConfigured) return MOCK_ACTIVITY;

  const { data, error } = await getSupabase()
    .from('uploads')
    .select('lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);
  if (error) {
    console.warn('getActivityPoints:', error.message);
    return [];
  }

  // Agrupa fotos por celda y promedia su posición.
  const cells = new Map<string, { lat: number; lng: number; count: number }>();
  for (const { lat, lng } of data as { lat: number; lng: number }[]) {
    const key = `${Math.round(lat / CELL)}:${Math.round(lng / CELL)}`;
    const cell = cells.get(key);
    if (cell) {
      cell.lat += lat;
      cell.lng += lng;
      cell.count += 1;
    } else {
      cells.set(key, { lat, lng, count: 1 });
    }
  }

  const maxCount = Math.max(1, ...[...cells.values()].map((c) => c.count));
  return [...cells.entries()].map(([key, c]) => ({
    id: key,
    lat: c.lat / c.count,
    lng: c.lng / c.count,
    weight: Math.max(1, Math.round((c.count / maxCount) * 10)),
  }));
}
