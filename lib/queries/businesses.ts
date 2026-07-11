/**
 * Negocios — selects reales a Supabase (Cuenta B).
 * Firmas idénticas al mock original; sin `.env` cae a los datos mock.
 */
import { Business, MOCK_BUSINESSES } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';

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
