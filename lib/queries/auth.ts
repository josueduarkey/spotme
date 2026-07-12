/**
 * Auth real con Supabase — Cuenta B.
 * Firmas idénticas al mock original de Cuenta A: las pantallas no cambian.
 * Si no hay `.env` configurado, cae al comportamiento mock para no
 * bloquear el trabajo de frontend.
 */
import { AccountType, MOCK_PROFILE, MockProfile } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

try {
  WebBrowser.maybeCompleteAuthSession();
} catch (e) {
  console.warn(e);
}

export interface AuthResult {
  profile: MockProfile | null;
  error: string | null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ProfileRow {
  id: string;
  full_name: string | null;
  account_type: AccountType | null;
  points: number | null;
}

function toProfile(row: ProfileRow | null, userId: string, email: string, fallbackName = ''): MockProfile {
  return {
    id: row?.id ?? userId,
    fullName: row?.full_name || fallbackName,
    email,
    accountType: row?.account_type ?? null,
    points: row?.points ?? 0,
  };
}

function toSpanish(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
  if (m.includes('network')) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return message;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!email.includes('@')) return { profile: null, error: 'Ingresa un correo válido.' };
  if (password.length < 6) return { profile: null, error: 'La contraseña debe tener al menos 6 caracteres.' };

  if (!isSupabaseConfigured) {
    await delay(600);
    return { profile: { ...MOCK_PROFILE, email }, error: null };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { profile: null, error: toSpanish(error?.message ?? 'No se pudo iniciar sesión.') };
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('id, full_name, account_type, points')
    .eq('id', data.user.id)
    .single();

  return { profile: toProfile(row, data.user.id, email), error: null };
}

export async function signUp(fullName: string, email: string, password: string): Promise<AuthResult> {
  if (fullName.trim().length < 2) return { profile: null, error: 'Ingresa tu nombre.' };
  if (!email.includes('@')) return { profile: null, error: 'Ingresa un correo válido.' };
  if (password.length < 6) return { profile: null, error: 'La contraseña debe tener al menos 6 caracteres.' };

  if (!isSupabaseConfigured) {
    await delay(600);
    return { profile: { ...MOCK_PROFILE, fullName, email }, error: null };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // El trigger `handle_new_user` crea la fila en `profiles` con este nombre.
    options: { data: { full_name: fullName.trim() } },
  });
  if (error || !data.user) {
    return { profile: null, error: toSpanish(error?.message ?? 'No se pudo crear la cuenta.') };
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('id, full_name, account_type, points')
    .eq('id', data.user.id)
    .single();

  return { profile: toProfile(row, data.user.id, email, fullName.trim()), error: null };
}

export async function getCurrentProfile(): Promise<MockProfile | null> {
  if (!isSupabaseConfigured) {
    return MOCK_PROFILE;
  }

  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: row } = await supabase
    .from('profiles')
    .select('id, full_name, account_type, points')
    .eq('id', session.user.id)
    .single();

  return toProfile(row, session.user.id, session.user.email ?? '', row?.full_name ?? '');
}

export async function setAccountType(userId: string, accountType: AccountType): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    await delay(300);
    return { error: null };
  }

  const supabase = getSupabase();
  let targetId = userId;

  if (userId === MOCK_PROFILE.id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      targetId = session.user.id;
    }
  }

  const { error } = await supabase.from('profiles').update({ account_type: accountType }).eq('id', targetId);
  return { error: error ? toSpanish(error.message) : null };
}

export async function signOut(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    await delay(300);
    return { error: null };
  }

  const { error } = await getSupabase().auth.signOut();
  return { error: error ? error.message : null };
}

/**
 * Inicia sesión utilizando Google OAuth a través de Supabase.
 * Abre una pestaña de navegador integrada y redirige de vuelta a la app.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    await delay(600);
    return { profile: MOCK_PROFILE, error: null };
  }

  try {
    const supabase = getSupabase();
    // Generar la URL profunda de retorno configurada en app.json (scheme: spotme)
    const redirectUrl = Linking.createURL('/auth-callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { profile: null, error: toSpanish(error.message) };
    if (!data?.url) return { profile: null, error: 'No se pudo generar el enlace de Google.' };

    // Abrir la sesión de autenticación en el navegador del dispositivo
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success' && result.url) {
      // Parsear tokens de la URL hash fragment o query params
      const cleanedUrl = result.url.replace('#', '?');
      const parts = cleanedUrl.split('?');
      const params: Record<string, string> = {};
      if (parts.length > 1) {
        const query = parts[1];
        const pairs = query.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            params[decodeURIComponent(key)] = decodeURIComponent(value);
          }
        }
      }

      const access_token = params.access_token;
      const refresh_token = params.refresh_token;

      if (access_token && refresh_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) return { profile: null, error: toSpanish(sessionError.message) };

        const userId = sessionData.user?.id || '';
        const email = sessionData.user?.email || '';

        // Obtener el perfil asociado en profiles
        const { data: row } = await supabase
          .from('profiles')
          .select('id, full_name, account_type, points')
          .eq('id', userId)
          .maybeSingle();

        let profileRow = row;
        if (!profileRow && userId) {
          // Crear un perfil básico si el trigger en la base de datos no lo creó todavía
          const { data: inserted } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: sessionData.user?.user_metadata?.full_name || 'Usuario Google',
              account_type: 'turista',
              points: 0,
            })
            .select()
            .single();
          profileRow = inserted;
        }

        return {
          profile: toProfile(
            profileRow,
            userId,
            email,
            sessionData.user?.user_metadata?.full_name || 'Usuario Google'
          ),
          error: null,
        };
      }
    }

    return { profile: null, error: 'Inicio de sesión cancelado.' };
  } catch (e) {
    return {
      profile: null,
      error: e instanceof Error ? e.message : 'Error inesperado al conectar con Google.',
    };
  }
}

