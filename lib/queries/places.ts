/**
 * MOCK — Cuenta B: reemplazar con selects reales a Supabase (`places`).
 * Mantener las firmas para que las pantallas de Cuenta A no cambien.
 */
import { MOCK_PLACES, Place } from '../../constants/mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getPlaces(): Promise<Place[]> {
  await delay(300);
  return MOCK_PLACES;
}

export async function getPlaceById(id: string): Promise<Place | null> {
  await delay(200);
  return MOCK_PLACES.find((p) => p.id === id) ?? null;
}

/** Top N para el Home (Cuenta B: ordenar por actividad real de uploads). */
export async function getTopPlaces(limit = 5): Promise<Place[]> {
  await delay(300);
  return MOCK_PLACES.slice(0, limit);
}
