/**
 * Eventos — selects reales a Supabase (Cuenta B).
 * Firmas idénticas al mock original; sin `.env` cae a los datos mock.
 *
 * Pivote Fase 6: la comunidad también crea eventos (createEvent) con el mismo
 * modelo de confianza que los lugares — 3 confirmaciones (confirmEvent) y el
 * trigger on_event_verification los marca verificados.
 */
import { EventItem, MOCK_EVENTS } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { reverseGeocodeDepartment } from './geocoding';
import { uploadImage } from './uploads';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  date: string;
  lat: number | null;
  lng: number | null;
  cover_image_url: string | null;
  source: 'official' | 'community' | null;
  created_by: string | null;
  verification_count: number | null;
  is_verified: boolean | null;
}

const EVENT_COLUMNS =
  'id, title, description, department, date, lat, lng, cover_image_url, source, created_by, verification_count, is_verified';

function toEvent(row: EventRow): EventItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    department: row.department ?? '',
    date: row.date,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    coverImageUrl: row.cover_image_url,
    source: row.source ?? 'official',
    createdBy: row.created_by,
    verificationCount: row.verification_count ?? 0,
    isVerified: row.is_verified ?? true,
  };
}

export async function getEventById(id: string): Promise<EventItem | null> {
  if (!isSupabaseConfigured) return MOCK_EVENTS.find((e) => e.id === id) ?? null;

  const { data, error } = await getSupabase().from('events').select(EVENT_COLUMNS).eq('id', id).maybeSingle();
  if (error) {
    console.warn('getEventById:', error.message);
    return null;
  }
  return data ? toEvent(data as EventRow) : null;
}

export async function getUpcomingEvents(): Promise<EventItem[]> {
  if (!isSupabaseConfigured) return [...MOCK_EVENTS].sort((a, b) => a.date.localeCompare(b.date));

  const { data, error } = await getSupabase()
    .from('events')
    .select(EVENT_COLUMNS)
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true });
  if (error) {
    console.warn('getUpcomingEvents:', error.message);
    return [];
  }
  return (data as EventRow[]).map(toEvent);
}

// ---------------------------------------------------------------------------
// Creación comunitaria de eventos (espejo de createPlace/confirmPlace)
// ---------------------------------------------------------------------------

export interface NewEventInput {
  title: string;
  description: string;
  /** Fecha y hora del evento (ISO). */
  date: string;
  lat: number;
  lng: number;
  /** URI local de expo-image-picker; opcional (un evento puede no tener foto aún). */
  photoUri?: string | null;
}

export async function createEvent(input: NewEventInput): Promise<{ event: EventItem | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 500));
    const event: EventItem = {
      id: `local-e-${Date.now()}`,
      title: input.title.trim(),
      description: input.description.trim(),
      department: 'Por confirmar',
      date: input.date,
      lat: input.lat,
      lng: input.lng,
      coverImageUrl: input.photoUri ?? null,
      source: 'community',
      createdBy: 'mock-user-1',
      verificationCount: 0,
      isVerified: false,
    };
    MOCK_EVENTS.push(event);
    return { event, error: null };
  }

  // Mismo guarda anti-fantasmas que createPlace
  if (input.lat < 13.0 || input.lat > 14.5 || input.lng < -90.2 || input.lng > -87.6) {
    return { event: null, error: 'La ubicación está fuera de El Salvador. Mueve el pin dentro del país.' };
  }
  if (new Date(input.date).getTime() < Date.now() - 24 * 3600 * 1000) {
    return { event: null, error: 'La fecha del evento ya pasó. Elige una fecha futura.' };
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { event: null, error: 'Inicia sesión para crear un evento.' };

  let coverUrl: string | null = null;
  if (input.photoUri) {
    const { url, error: uploadError } = await uploadImage(input.photoUri, 'events', user.id);
    if (uploadError) return { event: null, error: `No se pudo subir la foto: ${uploadError}` };
    coverUrl = url;
  }

  const department = (await reverseGeocodeDepartment(input.lat, input.lng)) ?? 'El Salvador';

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      department,
      date: input.date,
      lat: input.lat,
      lng: input.lng,
      cover_image_url: coverUrl,
      source: 'community',
      created_by: user.id,
      is_verified: false,
    })
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') return { event: null, error: 'Ya existe un evento con ese nombre.' };
    return { event: null, error: error.message };
  }
  return { event: toEvent(data as EventRow), error: null };
}

export async function confirmEvent(
  eventId: string,
): Promise<{ verificationCount: number; isVerified: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 400));
    const e = MOCK_EVENTS.find((x) => x.id === eventId);
    if (!e) return { verificationCount: 0, isVerified: false, error: 'Evento no encontrado.' };
    e.verificationCount = (e.verificationCount ?? 0) + 1;
    e.isVerified = e.verificationCount >= 3;
    return { verificationCount: e.verificationCount, isVerified: e.isVerified, error: null };
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { verificationCount: 0, isVerified: false, error: 'Inicia sesión para confirmar eventos.' };

  const { error } = await supabase.from('event_verifications').insert({ event_id: eventId, user_id: user.id });
  if (error) {
    let msg = error.message;
    if (error.code === '23505') msg = 'Ya confirmaste este evento.';
    if (error.code === '42501') msg = 'No puedes confirmar un evento que creaste tú.';
    return { verificationCount: 0, isVerified: false, error: msg };
  }

  // El trigger on_event_verification ya recontó; leemos el resultado final.
  const { data } = await supabase.from('events').select('verification_count, is_verified').eq('id', eventId).single();

  return {
    verificationCount: data?.verification_count ?? 0,
    isVerified: data?.is_verified ?? false,
    error: null,
  };
}
