/**
 * Leaderboard comunitario — rankings de turistas por métrica, calculados de
 * los mismos hechos vivos del twin (todas las tablas son de lectura pública
 * por RLS). El objetivo es incentivar la creación: publicar lugares, eventos
 * y fotos sube posiciones visiblemente.
 */
import { getSupabase, isSupabaseConfigured } from '../supabase';

export type MetricaRanking = 'puntos' | 'lugares' | 'eventos' | 'visitas';

export interface LeaderEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Valor de la métrica (puntos, lugares creados, etc.). */
  valor: number;
  /** Posición 1-based en el ranking. */
  posicion: number;
  /** Es el usuario de la sesión actual. */
  esYo: boolean;
}

export type Leaderboards = Record<MetricaRanking, LeaderEntry[]>;

const MOCK_NOMBRES = ['Valeria M.', 'Carlos R.', 'Fátima L.', 'Diego A.', 'Sofía P.'];

function mockRanking(base: number): LeaderEntry[] {
  return MOCK_NOMBRES.map((name, i) => ({
    userId: `mock-${i}`,
    name,
    avatarUrl: null,
    valor: Math.max(1, Math.round(base / (i + 1))),
    posicion: i + 1,
    esYo: i === 2,
  }));
}

const TOP_N = 20;

export async function getLeaderboards(): Promise<Leaderboards> {
  if (!isSupabaseConfigured) {
    return {
      puntos: mockRanking(320),
      lugares: mockRanking(6),
      eventos: mockRanking(3),
      visitas: mockRanking(9),
    };
  }

  const supabase = getSupabase();
  const [{ data: { user } }, perfilesRes, lugaresRes, eventosRes, uploadsRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('id, full_name, avatar_url, points').eq('account_type', 'turista'),
    supabase.from('places').select('created_by').eq('source', 'community'),
    supabase.from('events').select('created_by').eq('source', 'community'),
    supabase.from('uploads').select('user_id, target_id').eq('target_type', 'place'),
  ]);

  interface PerfilRow {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    points: number;
  }
  const perfiles = (perfilesRes.data ?? []) as PerfilRow[];

  const lugaresPorUsuario = new Map<string, number>();
  for (const r of (lugaresRes.data ?? []) as { created_by: string | null }[]) {
    if (r.created_by) lugaresPorUsuario.set(r.created_by, (lugaresPorUsuario.get(r.created_by) ?? 0) + 1);
  }

  const eventosPorUsuario = new Map<string, number>();
  for (const r of (eventosRes.data ?? []) as { created_by: string | null }[]) {
    if (r.created_by) eventosPorUsuario.set(r.created_by, (eventosPorUsuario.get(r.created_by) ?? 0) + 1);
  }

  // "Visitas" = lugares DISTINTOS fotografiados (huella real de exploración).
  const visitados = new Map<string, Set<string>>();
  for (const r of (uploadsRes.data ?? []) as { user_id: string; target_id: string }[]) {
    let s = visitados.get(r.user_id);
    if (!s) {
      s = new Set();
      visitados.set(r.user_id, s);
    }
    s.add(r.target_id);
  }

  function armar(valorDe: (p: PerfilRow) => number): LeaderEntry[] {
    return perfiles
      .map((p) => ({ perfil: p, valor: valorDe(p) }))
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, TOP_N)
      .map((x, i) => ({
        userId: x.perfil.id,
        name: x.perfil.full_name?.trim() || 'Viajero anónimo',
        avatarUrl: x.perfil.avatar_url,
        valor: x.valor,
        posicion: i + 1,
        esYo: user?.id === x.perfil.id,
      }));
  }

  return {
    puntos: armar((p) => p.points),
    lugares: armar((p) => lugaresPorUsuario.get(p.id) ?? 0),
    eventos: armar((p) => eventosPorUsuario.get(p.id) ?? 0),
    visitas: armar((p) => visitados.get(p.id)?.size ?? 0),
  };
}
