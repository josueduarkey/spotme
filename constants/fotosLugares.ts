/**
 * Fotos locales curadas para los lugares oficiales destacados (Top 5 del Home).
 * Igual que los dioramas: se empaquetan con la app para carga instantánea,
 * sin depender de Supabase Storage ni de la red.
 */

export const FOTOS_POR_LUGAR: Record<string, any> = {
  'Divino Salvador del Mundo': require('../assets/salvador-mundo.jpg'),
  'Lago de Coatepeque': require('../assets/lago.jpg'),
  'Juayúa — Ruta de las Flores': require('../assets/ruta-flores.jpg'),
  'Joya de Cerén': require('../assets/joya-ceren.jpg'),
  'Bahía de Jiquilisco': require('../assets/bahia-jiquilisco.jpg'),
};

/** Foto local del lugar, si está curada; null si no existe. */
export function getFotoLugar(placeName: string): any {
  return FOTOS_POR_LUGAR[placeName] ?? null;
}
