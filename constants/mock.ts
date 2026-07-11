/**
 * Datos mock para la Fase 1 (Cuenta A trabaja sin backend).
 * Cuenta B los reemplaza al conectar Supabase real en la Fase 2.
 */

export type AccountType = 'turista' | 'negocio';

export interface MockProfile {
  id: string;
  fullName: string;
  email: string;
  accountType: AccountType | null;
  points: number;
}

export const MOCK_PROFILE: MockProfile = {
  id: 'mock-user-1',
  fullName: 'Valeria Escobar',
  email: 'valeria@example.com',
  accountType: null,
  points: 120,
};
