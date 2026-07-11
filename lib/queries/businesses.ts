/**
 * MOCK — Cuenta B: reemplazar con selects reales a Supabase (`businesses`).
 */
import { Business, MOCK_BUSINESSES } from '../../constants/mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getBusinesses(): Promise<Business[]> {
  await delay(300);
  return MOCK_BUSINESSES;
}

export async function getBusinessById(id: string): Promise<Business | null> {
  await delay(200);
  return MOCK_BUSINESSES.find((b) => b.id === id) ?? null;
}
