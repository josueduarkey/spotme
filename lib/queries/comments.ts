/**
 * Comentarios de la comunidad sobre lugares/negocios/eventos.
 * Planos (sin respuestas anidadas), con una reacción de corazón por usuario
 * (toggle). Sin `.env` cae a un arreglo mock en memoria.
 */
import { getSupabase, isSupabaseConfigured } from '../supabase';

export type CommentTarget = 'place' | 'business' | 'event';

export interface CommentItem {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  /** El usuario actual ya reaccionó a este comentario. */
  likedByMe: boolean;
  /** El comentario es del usuario actual. */
  mine: boolean;
}

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  comment_reactions: { user_id: string }[];
}

// ---- Mock en memoria (sin backend) ----
const MOCK_COMMENTS: (CommentItem & { targetType: CommentTarget; targetId: string })[] = [];

export async function getComments(targetType: CommentTarget, targetId: string): Promise<CommentItem[]> {
  if (!isSupabaseConfigured) {
    return MOCK_COMMENTS.filter((c) => c.targetType === targetType && c.targetId === targetId);
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('comments')
    .select('id, user_id, content, created_at, profiles(full_name), comment_reactions(user_id)')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('getComments:', error.message);
    return [];
  }

  return (data as unknown as CommentRow[]).map((row) => ({
    id: row.id,
    author: row.profiles?.full_name?.trim() || 'Viajero anónimo',
    content: row.content,
    createdAt: row.created_at,
    likes: row.comment_reactions.length,
    likedByMe: user ? row.comment_reactions.some((r) => r.user_id === user.id) : false,
    mine: user ? row.user_id === user.id : false,
  }));
}

export async function addComment(
  targetType: CommentTarget,
  targetId: string,
  content: string,
): Promise<{ error: string | null }> {
  const texto = content.trim();
  if (!texto) return { error: 'Escribe algo antes de publicar.' };
  if (texto.length > 500) return { error: 'Máximo 500 caracteres.' };

  if (!isSupabaseConfigured) {
    MOCK_COMMENTS.unshift({
      id: `local-c-${Date.now()}`,
      author: 'Tú',
      content: texto,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      mine: true,
      targetType,
      targetId,
    });
    return { error: null };
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Inicia sesión para comentar.' };

  const { error } = await supabase
    .from('comments')
    .insert({ user_id: user.id, target_type: targetType, target_id: targetId, content: texto });
  return { error: error?.message ?? null };
}

/** Pone o quita la reacción de corazón del usuario actual (toggle). */
export async function toggleReaction(commentId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    const c = MOCK_COMMENTS.find((x) => x.id === commentId);
    if (c) {
      c.likedByMe = !c.likedByMe;
      c.likes += c.likedByMe ? 1 : -1;
    }
    return { error: null };
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Inicia sesión para reaccionar.' };

  // Intentar quitar primero; si no había nada que quitar, es un "like" nuevo.
  const { data: deleted, error: delError } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .select('id');
  if (delError) return { error: delError.message };
  if (deleted && deleted.length > 0) return { error: null };

  const { error } = await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: user.id });
  // Carrera benigna: si otro tap ya lo insertó, el unique lo bloquea — ignorar.
  if (error && error.code !== '23505') return { error: error.message };
  return { error: null };
}
