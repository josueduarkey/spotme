/**
 * Auth real con Supabase — Cuenta B.
 * Firmas idénticas al mock original de Cuenta A: las pantallas no cambian.
 * Si no hay `.env` configurado, cae al comportamiento mock para no
 * bloquear el trabajo de frontend.
 */
import { AccountType, MOCK_PROFILE, MockProfile } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';

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

