/**
 * MOCK — Cuenta B: reemplazar con selects reales a Supabase (`events`).
 */
import { EventItem, MOCK_EVENTS } from '../../constants/mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getUpcomingEvents(): Promise<EventItem[]> {
  await delay(300);
  return [...MOCK_EVENTS].sort((a, b) => a.date.localeCompare(b.date));
}
