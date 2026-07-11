/**
 * MOCK — Cuenta B: reemplazar con select a Supabase (`uploads` agregados
 * por proximidad) para alimentar la capa de actividad de turistas.
 */
import { ActivityPoint, MOCK_ACTIVITY } from '../../constants/mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getActivityPoints(): Promise<ActivityPoint[]> {
  await delay(300);
  return MOCK_ACTIVITY;
}
