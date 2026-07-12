/**
 * Perfil y Gamificación — Consultas a Supabase (Cuenta B).
 */
import { getSupabase, isSupabaseConfigured } from '../supabase';

/** Lugares que cuentan para el reto "Ruta de las Flores completa". */
const RUTA_DE_LAS_FLORES = ['Juayúa — Ruta de las Flores', 'Apaneca', 'Concepción de Ataco', 'Nahuizalco', 'Salcoatitán'];

export interface TouristStats {
  points: number;
  placesVisitedCount: number;
  uniqueDepartmentsCount: number;
  placesCreatedCount: number;
  totalPhotosCount: number;
}

export interface UserChallengeInfo {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  type: string;
  status: 'in_progress' | 'completed';
}

/**
 * Obtiene las estadísticas acumuladas de exploración y gamificación del turista.
 */
export async function getTouristStats(): Promise<TouristStats> {
  if (!isSupabaseConfigured) {
    // Fallback Mock en Memoria
    return {
      points: 250,
      placesVisitedCount: 4,
      uniqueDepartmentsCount: 3,
      placesCreatedCount: 1,
      totalPhotosCount: 5,
    };
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        points: 0,
        placesVisitedCount: 0,
        uniqueDepartmentsCount: 0,
        placesCreatedCount: 0,
        totalPhotosCount: 0,
      };
    }

    // 1. Obtener puntos del perfil
    const { data: profile } = await supabase.from('profiles').select('points').eq('id', user.id).single();
    const points = profile?.points ?? 0;

    // 2. Obtener total de lugares comunitarios creados por el usuario
    const { count: placesCreated } = await supabase
      .from('places')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id);

    // 3. Obtener cantidad de fotos subidas
    const { count: totalPhotos } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 4. Obtener paradas y departamentos únicos visitados (basado en fotos subidas a lugares)
    const { data: uploads } = await supabase
      .from('uploads')
      .select('target_id')
      .eq('user_id', user.id)
      .eq('target_type', 'place');

    const visitedPlaceIds = Array.from(new Set((uploads ?? []).map((u) => u.target_id)));
    let uniqueDepartmentsCount = 0;

    if (visitedPlaceIds.length > 0) {
      const { data: places } = await supabase.from('places').select('department').in('id', visitedPlaceIds);

      const departments = new Set((places ?? []).map((p) => p.department));
      uniqueDepartmentsCount = departments.size;
    }

    return {
      points,
      placesVisitedCount: visitedPlaceIds.length,
      uniqueDepartmentsCount,
      placesCreatedCount: placesCreated ?? 0,
      totalPhotosCount: totalPhotos ?? 0,
    };
  } catch (e) {
    console.warn('getTouristStats error:', e);
    return { points: 0, placesVisitedCount: 0, uniqueDepartmentsCount: 0, placesCreatedCount: 0, totalPhotosCount: 0 };
  }
}

/**
 * Obtiene la lista completa de retos de gamificación y si el usuario los ha completado.
 */
export async function getUserChallenges(): Promise<UserChallengeInfo[]> {
  if (!isSupabaseConfigured) {
    return [
      {
        id: '1',
        title: 'Primera postal',
        description: 'Sube tu primera foto geolocalizada en cualquier lugar del mapa.',
        pointsReward: 50,
        type: 'upload_photo',
        status: 'completed',
      },
      {
        id: '2',
        title: 'Cazador de dioramas',
        description: 'Visita y sube fotos en 3 lugares distintos.',
        pointsReward: 150,
        type: 'visit_places',
        status: 'in_progress',
      },
      {
        id: '3',
        title: 'Fundador',
        description: 'Crea tu primer lugar en el mapa — un rincón que aún no existía.',
        pointsReward: 100,
        type: 'create_place',
        status: 'in_progress',
      },
      {
        id: '4',
        title: 'Cartógrafo comunitario',
        description: 'Logra que un lugar creado por ti sea verificado por la comunidad.',
        pointsReward: 300,
        type: 'create_place',
        status: 'in_progress',
      },
    ];
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const [challengesRes, userChallengesRes] = await Promise.all([
      supabase.from('challenges').select('id, title, description, points_reward, type'),
      supabase.from('user_challenges').select('challenge_id, status').eq('user_id', user.id),
    ]);

    const completedMap = new Map<string, string>();
    for (const uc of userChallengesRes.data ?? []) {
      completedMap.set(uc.challenge_id, uc.status);
    }

    return (challengesRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? '',
      pointsReward: c.points_reward,
      type: c.type,
      status: (completedMap.get(c.id) as 'in_progress' | 'completed') || 'in_progress',
    }));
  } catch (e) {
    console.warn('getUserChallenges error:', e);
    return [];
  }
}

export interface CompletedChallenge {
  id: string;
  title: string;
  pointsReward: number;
}

/**
 * Evalúa los retos contra los datos reales del usuario y marca como
 * completados los que ya cumplió. El trigger `on_challenge_points` de la DB
 * suma los puntos — aquí no se toca `profiles.points`.
 *
 * Devuelve SOLO los retos recién completados en esta pasada, para que la UI
 * muestre la celebración ("¡Reto completado! +100 pts"). Llamar al entrar a
 * la pantalla de retos/perfil o después de subir foto / crear lugar.
 */
export async function syncChallenges(): Promise<CompletedChallenge[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const [challengesRes, doneRes, uploadsRes, createdRes] = await Promise.all([
      supabase.from('challenges').select('id, title, points_reward, type'),
      supabase.from('user_challenges').select('challenge_id').eq('user_id', user.id).eq('status', 'completed'),
      supabase.from('uploads').select('target_id, target_type').eq('user_id', user.id),
      supabase.from('places').select('id, is_verified').eq('created_by', user.id),
    ]);

    const alreadyDone = new Set((doneRes.data ?? []).map((d) => d.challenge_id));
    const uploads = uploadsRes.data ?? [];
    const created = createdRes.data ?? [];

    const visitedPlaceIds = [...new Set(uploads.filter((u) => u.target_type === 'place').map((u) => u.target_id))];
    let visitedNames: string[] = [];
    if (visitedPlaceIds.length > 0) {
      const { data: visited } = await supabase.from('places').select('name').in('id', visitedPlaceIds);
      visitedNames = (visited ?? []).map((p) => p.name);
    }
    const florasVisitadas = visitedNames.filter((n) => RUTA_DE_LAS_FLORES.includes(n)).length;

    function cumple(title: string, type: string): boolean {
      switch (title) {
        case 'Primera postal':
          return uploads.length >= 1;
        case 'Cazador de dioramas':
          return visitedPlaceIds.length >= 3;
        case 'Fundador':
          return created.length >= 1;
        case 'Cartógrafo comunitario':
          return created.some((p) => p.is_verified);
        case 'Ruta de las Flores completa':
          return florasVisitadas >= 3;
        default:
          // Retos nuevos sin regla específica: heurística por tipo.
          if (type === 'upload_photo') return uploads.length >= 1;
          if (type === 'create_place') return created.length >= 1;
          return false;
      }
    }

    const nuevos = (challengesRes.data ?? []).filter((c) => !alreadyDone.has(c.id) && cumple(c.title, c.type));
    if (nuevos.length === 0) return [];

    const { error } = await supabase.from('user_challenges').upsert(
      nuevos.map((c) => ({ user_id: user.id, challenge_id: c.id, status: 'completed' })),
      { onConflict: 'user_id,challenge_id' }
    );
    if (error) {
      console.warn('syncChallenges upsert:', error.message);
      return [];
    }

    return nuevos.map((c) => ({ id: c.id, title: c.title, pointsReward: c.points_reward }));
  } catch (e) {
    console.warn('syncChallenges error:', e);
    return [];
  }
}
