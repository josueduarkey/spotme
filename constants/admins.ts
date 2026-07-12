/**
 * Administradores de Spotmi — allowlist por correo.
 * Los correos aquí listados ven el panel de administración (datos por
 * categoría de los lugares registrados). Agregar/quitar correos aquí.
 *
 * Nota PoC: es un gate de UI (los datos de `places` ya son de lectura
 * pública vía RLS). Si el panel llegara a exponer datos sensibles,
 * el control debe moverse a la base (columna is_admin + políticas RLS).
 */

export const ADMIN_EMAILS = [
  'eduardo.garcia@keyinstitute.edu.sv',
] as const;

/** ¿El correo pertenece a un administrador? (case-insensitive) */
export function esAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((a) => a === normalizado);
}
