/**
 * Cliente de Supabase — Cuenta B.
 *
 * Lee credenciales de `.env` (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY).
 * Si el `.env` aún no existe, `isSupabaseConfigured` es false y las
 * funciones de `lib/queries/` caen a los datos mock — así Cuenta A
 * puede seguir trabajando sin credenciales.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase no está configurado: copia .env.example a .env y llena EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Patrón recomendado por Supabase para React Native: refrescar el
    // token solo mientras la app está en primer plano.
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
  }
  return client;
}
