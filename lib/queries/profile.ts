/**
 * Perfil y Gamificación — Consultas a Supabase (Cuenta B).
 */
import { getSupabase, isSupabaseConfigured } from '../supabase';

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
