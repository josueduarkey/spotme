/**
 * Métricas de administración — agregaciones sobre las tablas públicas del twin
 * (profiles, places, uploads, businesses son de lectura abierta por RLS).
 * Sin `.env` caen a los datos mock, igual que el resto de lib/queries.
 */
import { CATEGORIAS, Categoria, MOCK_BUSINESSES, MOCK_PLACES } from '../../constants/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';

export interface ConteoCategoria {
  categoria: Categoria;
  total: number;
}

export interface PuntoDia {
  /** Etiqueta corta del día, ej. "lun" */
  label: string;
  count: number;
}

export interface AdminMetrics {
  totalUsuarios: number;
  totalLugares: number;
  totalFotos: number;
  totalNegocios: number;
  usuariosTuristas: number;
  usuariosNegocios: number;
  lugaresOficiales: number;
  lugaresComunidad: number;
  lugaresVerificados: number;
  lugaresPorCategoria: ConteoCategoria[];
  /** Fotos subidas por día, últimos 7 días (incluye hoy). */
  fotosPorDia: PuntoDia[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  accountType: 'turista' | 'negocio' | null;
  points: number;
  createdAt: string | null;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Serie de los últimos 7 días (incluye hoy) a partir de timestamps. */
function agruparPorDia(timestamps: string[]): PuntoDia[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias: { fecha: Date; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const f = new Date(hoy);
    f.setDate(hoy.getDate() - i);
    dias.push({ fecha: f, label: DIAS[f.getDay()], count: 0 });
  }
  for (const t of timestamps) {
    const f = new Date(t);
    f.setHours(0, 0, 0, 0);
    const slot = dias.find((d) => d.fecha.getTime() === f.getTime());
    if (slot) slot.count += 1;
  }
  return dias.map(({ label, count }) => ({ label, count }));
}

function conteoPorCategoria(cats: (Categoria | null)[]): ConteoCategoria[] {
  const mapa = new Map<Categoria, number>();
  for (const c of Object.keys(CATEGORIAS) as Categoria[]) mapa.set(c, 0);
  for (const c of cats) {
    if (c && mapa.has(c)) mapa.set(c, (mapa.get(c) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

const MOCK_METRICS: AdminMetrics = {
  totalUsuarios: 12,
  totalLugares: MOCK_PLACES.length,
  totalFotos: 34,
  totalNegocios: MOCK_BUSINESSES.length,
  usuariosTuristas: 9,
  usuariosNegocios: 3,
  lugaresOficiales: MOCK_PLACES.filter((p) => p.source !== 'community').length,
  lugaresComunidad: MOCK_PLACES.filter((p) => p.source === 'community').length,
  lugaresVerificados: MOCK_PLACES.filter((p) => p.source !== 'community' || p.isVerified).length,
  lugaresPorCategoria: conteoPorCategoria(MOCK_PLACES.map((p) => p.category)),
  fotosPorDia: agruparPorDia([]).map((d, i) => ({ ...d, count: [2, 5, 3, 8, 6, 9, 4][i] })),
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  if (!isSupabaseConfigured) return MOCK_METRICS;

  const supabase = getSupabase();
  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 6);
  hace7dias.setHours(0, 0, 0, 0);

  const [perfilesRes, lugaresRes, fotosCountRes, fotosSemanaRes, negociosRes] = await Promise.all([
    supabase.from('profiles').select('account_type'),
    supabase.from('places').select('category, source, is_verified'),
    supabase.from('uploads').select('id', { count: 'exact', head: true }),
    supabase.from('uploads').select('created_at').gte('created_at', hace7dias.toISOString()),
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
  ]);

  const perfiles = perfilesRes.data ?? [];
  const lugares = lugaresRes.data ?? [];

  return {
    totalUsuarios: perfiles.length,
    totalLugares: lugares.length,
    totalFotos: fotosCountRes.count ?? 0,
    totalNegocios: negociosRes.count ?? 0,
    usuariosTuristas: perfiles.filter((p) => p.account_type === 'turista').length,
    usuariosNegocios: perfiles.filter((p) => p.account_type === 'negocio').length,
    lugaresOficiales: lugares.filter((l) => l.source === 'official').length,
    lugaresComunidad: lugares.filter((l) => l.source === 'community').length,
    lugaresVerificados: lugares.filter((l) => l.is_verified).length,
    lugaresPorCategoria: conteoPorCategoria(lugares.map((l) => l.category as Categoria | null)),
    fotosPorDia: agruparPorDia((fotosSemanaRes.data ?? []).map((u) => u.created_at)),
  };
}

const MOCK_USERS: AdminUser[] = [
  { id: 'u1', fullName: 'Valeria Escobar', accountType: 'turista', points: 320, createdAt: '2026-07-10T12:00:00Z' },
  { id: 'u2', fullName: 'Marco Antonio Ruiz', accountType: 'turista', points: 145, createdAt: '2026-07-11T09:30:00Z' },
  { id: 'u3', fullName: 'Café Albania', accountType: 'negocio', points: 0, createdAt: '2026-07-11T15:00:00Z' },
];

export async function getAdminUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return MOCK_USERS;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, account_type, points, created_at')
    .order('points', { ascending: false });
  if (error) {
    console.warn('getAdminUsers:', error.message);
    return [];
  }
  return data.map((p) => ({
    id: p.id,
    fullName: p.full_name ?? 'Sin nombre',
    accountType: p.account_type,
    points: p.points ?? 0,
    createdAt: p.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Reportes — texto/CSV listos para compartir con Share nativo.
// ---------------------------------------------------------------------------

/** Reporte ejecutivo en texto plano (para WhatsApp/correo). */
export function construirReporteGeneral(m: AdminMetrics): string {
  const fecha = new Date().toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });
  const lineasCategoria = m.lugaresPorCategoria
    .filter((c) => c.total > 0)
    .map((c) => `  • ${CATEGORIAS[c.categoria].etiqueta}: ${c.total}`)
    .join('\n');
  return (
    `📊 SPOTMI — Reporte general (${fecha})\n\n` +
    `USUARIOS: ${m.totalUsuarios} (${m.usuariosTuristas} turistas, ${m.usuariosNegocios} negocios)\n` +
    `LUGARES: ${m.totalLugares} (${m.lugaresOficiales} oficiales, ${m.lugaresComunidad} de comunidad, ${m.lugaresVerificados} verificados)\n` +
    `FOTOS SUBIDAS: ${m.totalFotos}\n` +
    `NEGOCIOS REGISTRADOS: ${m.totalNegocios}\n\n` +
    `LUGARES POR CATEGORÍA:\n${lineasCategoria}\n\n` +
    `Actividad última semana: ${m.fotosPorDia.reduce((s, d) => s + d.count, 0)} fotos.\n` +
    `Generado desde el panel de administración de Spotmi.`
  );
}

/** CSV de lugares por categoría. */
export function construirCsvCategorias(m: AdminMetrics): string {
  const filas = m.lugaresPorCategoria.map((c) => `${CATEGORIAS[c.categoria].etiqueta},${c.total}`);
  return `categoria,total\n${filas.join('\n')}`;
}

/** CSV de usuarios. */
export function construirCsvUsuarios(usuarios: AdminUser[]): string {
  const filas = usuarios.map(
    (u) => `"${u.fullName.replace(/"/g, '""')}",${u.accountType ?? 'sin tipo'},${u.points},${u.createdAt ?? ''}`,
  );
  return `nombre,tipo,puntos,registrado\n${filas.join('\n')}`;
}
