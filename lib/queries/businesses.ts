/**
 * Negocios — selects reales a Supabase (Cuenta B).
 * Firmas idénticas al mock original; sin `.env` cae a los datos mock.
 */
import { Business, MOCK_BUSINESSES } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { reverseGeocodeDepartment } from './geocoding';

interface BusinessRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  schedule: string | null;
  contact: string | null;
}

const BUSINESS_COLUMNS = 'id, name, category, description, lat, lng, address, schedule, contact';

function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'Negocio',
    description: row.description ?? '',
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    address: row.address ?? '',
    schedule: row.schedule ?? '',
    contact: row.contact ?? '',
  };
}

export async function getBusinesses(): Promise<Business[]> {
  if (!isSupabaseConfigured) return MOCK_BUSINESSES;

  const { data, error } = await getSupabase()
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .not('lat', 'is', null) // solo negocios con ubicación fijada aparecen en el mapa
    .order('name');
  if (error) {
    console.warn('getBusinesses:', error.message);
    return [];
  }
  return (data as BusinessRow[]).map(toBusiness);
}

export async function getBusinessById(id: string): Promise<Business | null> {
  if (!isSupabaseConfigured) return MOCK_BUSINESSES.find((b) => b.id === id) ?? null;

  const { data, error } = await getSupabase().from('businesses').select(BUSINESS_COLUMNS).eq('id', id).maybeSingle();
  if (error) {
    console.warn('getBusinessById:', error.message);
    return null;
  }
  return data ? toBusiness(data as BusinessRow) : null;
}

export interface BusinessInput {
  name: string;
  category: string;
  description: string;
  address: string;
  schedule: string;
  contact: string;
  lat: number;
  lng: number;
}

export interface BusinessMetrics {
  totalPhotos: number;
  activityScore: number;
}

/**
 * Obtiene el negocio perteneciente al usuario logueado en la sesión activa.
 */
export async function getOwnBusiness(): Promise<Business | null> {
  if (!isSupabaseConfigured) {
    return MOCK_BUSINESSES[0];
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('businesses')
      .select(BUSINESS_COLUMNS)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('getOwnBusiness:', error.message);
      return null;
    }
    return data ? toBusiness(data as BusinessRow) : null;
  } catch (e) {
    console.warn(e);
    return null;
  }
}

/**
 * Registra o actualiza los datos comerciales y de ubicación de un negocio.
 */
export async function createOrUpdateBusiness(
  input: BusinessInput
): Promise<{ business: Business | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 500));
    const mockBus: Business = {
      id: MOCK_BUSINESSES[0].id,
      name: input.name,
      category: input.category,
      description: input.description,
      address: input.address,
      schedule: input.schedule,
      contact: input.contact,
      lat: input.lat,
      lng: input.lng,
    };
    MOCK_BUSINESSES[0] = mockBus;
    return { business: mockBus, error: null };
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { business: null, error: 'Inicia sesión para registrar tu negocio.' };

    // Departamento automático desde las coordenadas — alimenta el panel de
    // inteligencia territorial (cruce negocios × actividad por departamento).
    const department = (await reverseGeocodeDepartment(input.lat, input.lng)) ?? null;

    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let res;
    if (existing) {
      // Actualizar información
      res = await supabase
        .from('businesses')
        .update({
          name: input.name,
          category: input.category,
          description: input.description,
          address: input.address,
          schedule: input.schedule,
          contact: input.contact,
          lat: input.lat,
          lng: input.lng,
          department,
        })
        .eq('id', existing.id)
        .select(BUSINESS_COLUMNS)
        .single();
    } else {
      // Registrar nuevo negocio
      res = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: input.name,
          category: input.category,
          description: input.description,
          address: input.address,
          schedule: input.schedule,
          contact: input.contact,
          lat: input.lat,
          lng: input.lng,
          department,
        })
        .select(BUSINESS_COLUMNS)
        .single();
    }

    if (res.error) return { business: null, error: res.error.message };
    return { business: toBusiness(res.data as BusinessRow), error: null };
  } catch (e) {
    return {
      business: null,
      error: e instanceof Error ? e.message : 'Error inesperado al registrar el negocio.',
    };
  }
}

/**
 * Obtiene métricas dinámicas de interacción del gemelo digital para un negocio local
 * (ej: cantidad de fotos subidas por turistas, nivel de actividad).
 */
export async function getBusinessMetrics(businessId: string): Promise<BusinessMetrics> {
  if (!isSupabaseConfigured) {
    return { totalPhotos: 8, activityScore: 78 };
  }

  try {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'business')
      .eq('target_id', businessId);

    if (error) throw error;
    const countVal = count ?? 0;

    return {
      totalPhotos: countVal,
      activityScore: Math.min(100, countVal * 12 + 10),
    };
  } catch (e) {
    console.warn('getBusinessMetrics:', e);
    return { totalPhotos: 0, activityScore: 0 };
  }
}
