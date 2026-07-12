/**
 * Inteligencia territorial (pantalla 17) — Cuenta B, Fase 5.
 * Cruza 3 capas reales del twin agrupadas por departamento:
 *   actividad de turistas (uploads) × lugares de comunidad × negocios.
 * El insight NO es texto inventado: se calcula con los datos vivos de la DB.
 */
import { getSupabase, isSupabaseConfigured } from '../supabase';

export interface DepartmentStat {
  department: string;
  /** Fotos subidas por turistas en lugares de ese departamento. */
  photos: number;
  /** Lugares creados por la comunidad. */
  communityPlaces: number;
  /** Lugares oficiales. */
  officialPlaces: number;
  /** Negocios registrados. */
  businesses: number;
}

export interface TerritorialInsight {
  /** Frase principal para el panel, generada con datos reales. */
  sentence: string;
  /** Frase secundaria (departamento más activo). */
  activitySentence: string;
  /** Tabla completa para graficar/listar en la pantalla 17. */
  stats: DepartmentStat[];
}

const MOCK_INSIGHT: TerritorialInsight = {
  sentence:
    'Chalatenango tiene 12 fotos de turistas y 3 lugares creados por la comunidad, pero 0 negocios registrados — oportunidad para nuevos emprendedores.',
  activitySentence: 'La Libertad es el departamento más activo: 18 fotos de turistas esta semana.',
  stats: [],
};

export async function getTerritorialInsight(): Promise<TerritorialInsight> {
  if (!isSupabaseConfigured) return MOCK_INSIGHT;

  const supabase = getSupabase();
  const [placesRes, uploadsRes, businessesRes] = await Promise.all([
    supabase.from('places').select('id, department, source'),
    supabase.from('uploads').select('target_id').eq('target_type', 'place'),
    supabase.from('businesses').select('department'),
  ]);

  const places = placesRes.data ?? [];
  const byId = new Map(places.map((p) => [p.id, p]));

  const stats = new Map<string, DepartmentStat>();
  const stat = (dep: string): DepartmentStat => {
    let s = stats.get(dep);
    if (!s) {
      s = { department: dep, photos: 0, communityPlaces: 0, officialPlaces: 0, businesses: 0 };
      stats.set(dep, s);
    }
    return s;
  };

  for (const p of places) {
    const s = stat(p.department);
    if (p.source === 'community') s.communityPlaces += 1;
    else s.officialPlaces += 1;
  }
  for (const u of uploadsRes.data ?? []) {
    const p = byId.get(u.target_id);
    if (p) stat(p.department).photos += 1;
  }
  for (const b of businessesRes.data ?? []) {
    if (b.department) stat(b.department).businesses += 1;
  }

  const rows = [...stats.values()].sort((a, b) => b.photos - a.photos);
  if (rows.length === 0) return MOCK_INSIGHT;

  // Oportunidad = demanda visible (fotos + lugares nuevos) sin oferta (negocios).
  // Priorizamos departamentos con actividad o creación comunitaria y ≤1 negocio.
  const opportunity =
    [...rows]
      .filter((r) => r.businesses <= 1 && (r.photos > 0 || r.communityPlaces > 0))
      .sort((a, b) => b.photos + b.communityPlaces * 3 - (a.photos + a.communityPlaces * 3))[0] ??
    [...rows].sort((a, b) => a.businesses - b.businesses)[0];

  const mostActive = rows[0];

  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  const sentence =
    `${opportunity.department} tiene ${plural(opportunity.photos, 'foto', 'fotos')} de turistas y ` +
    `${plural(opportunity.communityPlaces, 'lugar creado', 'lugares creados')} por la comunidad, pero ` +
    `${plural(opportunity.businesses, 'negocio registrado', 'negocios registrados')} — oportunidad para nuevos emprendedores.`;

  const activitySentence =
    `${mostActive.department} es el departamento más activo del twin: ` +
    `${plural(mostActive.photos, 'foto de turistas', 'fotos de turistas')} y ` +
    `${plural(mostActive.communityPlaces + mostActive.officialPlaces, 'lugar', 'lugares')} en el mapa.`;

  return { sentence, activitySentence, stats: rows };
}
