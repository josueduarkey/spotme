/**
 * Eventos — selects reales a Supabase (Cuenta B).
 * Firmas idénticas al mock original; sin `.env` cae a los datos mock.
 */
import { EventItem, MOCK_EVENTS } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  date: string;
  lat: number | null;
  lng: number | null;
}

export async function getEventById(id: string): Promise<EventItem | null> {
  if (!isSupabaseConfigured) return MOCK_EVENTS.find((e) => e.id === id) ?? null;

  const { data, error } = await getSupabase()
    .from('events')
    .select('id, title, description, department, date, lat, lng')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn('getEventById:', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as EventRow;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    department: row.department ?? '',
    date: row.date,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
}

export async function getUpcomingEvents(): Promise<EventItem[]> {
  if (!isSupabaseConfigured) return [...MOCK_EVENTS].sort((a, b) => a.date.localeCompare(b.date));

  const { data, error } = await getSupabase()
    .from('events')
    .select('id, title, description, department, date, lat, lng')
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true });
  if (error) {
    console.warn('getUpcomingEvents:', error.message);
    return [];
  }
  return (data as EventRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    department: row.department ?? '',
    date: row.date,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  }));
}
