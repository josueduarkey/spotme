/**
 * MOCK — Cuenta B: reemplazar estas funciones con Supabase Auth real
 * (supabase.auth.signInWithPassword / signUp + upsert en `profiles`).
 * Las firmas están pensadas para que las pantallas de Cuenta A no cambien.
 */
import { AccountType, MOCK_PROFILE, MockProfile } from '../../constants/mock';

export interface AuthResult {
  profile: MockProfile | null;
  error: string | null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function signIn(email: string, password: string): Promise<AuthResult> {
  await delay(600);
  if (!email.includes('@')) return { profile: null, error: 'Ingresa un correo válido.' };
  if (password.length < 6) return { profile: null, error: 'La contraseña debe tener al menos 6 caracteres.' };
  return { profile: { ...MOCK_PROFILE, email }, error: null };
}

export async function signUp(fullName: string, email: string, password: string): Promise<AuthResult> {
  await delay(600);
  if (fullName.trim().length < 2) return { profile: null, error: 'Ingresa tu nombre.' };
  if (!email.includes('@')) return { profile: null, error: 'Ingresa un correo válido.' };
  if (password.length < 6) return { profile: null, error: 'La contraseña debe tener al menos 6 caracteres.' };
  return { profile: { ...MOCK_PROFILE, fullName, email }, error: null };
}

export async function setAccountType(userId: string, accountType: AccountType): Promise<{ error: string | null }> {
  await delay(300);
  return { error: null };
}
