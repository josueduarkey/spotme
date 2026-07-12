/**
 * Subida de imágenes a Supabase Storage (Cuenta B — Fase 3).
 * Bucket público `uploads` (política: insert solo autenticado, lectura pública).
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getSupabase } from '../supabase';

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function contentTypeFromUri(uri: string): { ext: string; mime: string } {
  const lower = uri.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return { ext: 'png', mime: 'image/png' };
  if (lower.endsWith('.webp')) return { ext: 'webp', mime: 'image/webp' };
  if (lower.endsWith('.heic')) return { ext: 'heic', mime: 'image/heic' };
  return { ext: 'jpg', mime: 'image/jpeg' };
}

/**
 * Sube una imagen local (URI de expo-image-picker) al bucket `uploads` y
 * devuelve su URL pública. `folder` separa usos: 'places' (portadas de
 * lugares nuevos), 'photos' (fotos UGC de la pantalla 8).
 */
export async function uploadImage(
  localUri: string,
  folder: 'places' | 'photos',
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = getSupabase();
    const { ext, mime } = contentTypeFromUri(localUri);
    const path = `${folder}/${userId}-${Date.now()}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const { error } = await supabase.storage.from('uploads').upload(path, base64ToBytes(base64), {
      contentType: mime,
      upsert: false,
    });
    if (error) return { url: null, error: error.message };

    const { data } = supabase.storage.from('uploads').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'No se pudo subir la imagen.' };
  }
}
