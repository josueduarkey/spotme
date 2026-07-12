/**
 * Subida de imágenes a Supabase Storage (Cuenta B — Fase 3).
 * Bucket público `uploads` (política: insert solo autenticado, lectura pública).
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getSupabase, isSupabaseConfigured } from '../supabase';

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

// Fórmula de Haversine para calcular distancia en km entre dos coordenadas GPS
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Distancia máxima (km) para asociar una foto al lugar/negocio más cercano. */
const MAX_ASSOC_KM = 15;

export interface UploadRecord {
  id: string;
  user_id: string;
  target_type: 'place' | 'business';
  target_id: string;
  image_url: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface UploadPhotoResult {
  upload: UploadRecord | null;
  targetName?: string | null;
  error: string | null;
}

/**
 * Sube una foto de un turista a Supabase y la asocia a un lugar o negocio.
 * Si no se pasa targetId/targetType, calcula automáticamente el lugar o negocio
 * más cercano en base a las coordenadas de la foto (UGC automático).
 */
export async function uploadPhoto(
  photoUri: string,
  lat: number,
  lng: number,
  targetId?: string,
  targetType?: 'place' | 'business'
): Promise<UploadPhotoResult> {
  if (!isSupabaseConfigured) {
    // MOCK fallback en memoria
    await new Promise((r) => setTimeout(r, 600));
    return {
      upload: {
        id: `mock-upload-${Date.now()}`,
        user_id: 'mock-user-1',
        target_type: targetType || 'place',
        target_id: targetId || 'p1',
        image_url: photoUri,
        lat,
        lng,
        created_at: new Date().toISOString(),
      },
      targetName: targetId ? undefined : 'Divino Salvador del Mundo',
      error: null,
    };
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { upload: null, targetName: null, error: 'Inicia sesión para subir fotos.' };

    // 1. Sube la foto al bucket uploads
    const { url: imageUrl, error: uploadError } = await uploadImage(photoUri, 'photos', user.id);
    if (uploadError || !imageUrl) {
      return { upload: null, targetName: null, error: uploadError || 'Error al subir la imagen.' };
    }

    let finalTargetId = targetId;
    let finalTargetType = targetType;
    let closestItemName: string | undefined = undefined;

    // 2. Si no se pasa destino, asociarlo al lugar/negocio más cercano en base a lat/lng
    if (!finalTargetId || !finalTargetType) {
      const [placesRes, businessesRes] = await Promise.all([
        supabase.from('places').select('id, name, lat, lng'),
        supabase.from('businesses').select('id, name, lat, lng'),
      ]);

      let closestItem: { id: string; name: string; type: 'place' | 'business'; distance: number } | null = null;

      // Calcular distancia a lugares
      if (placesRes.data) {
        for (const p of placesRes.data) {
          const dist = getDistance(lat, lng, p.lat, p.lng);
          if (!closestItem || dist < closestItem.distance) {
            closestItem = { id: p.id, name: p.name, type: 'place', distance: dist };
          }
        }
      }

      // Calcular distancia a negocios
      if (businessesRes.data) {
        for (const b of businessesRes.data) {
          if (b.lat !== null && b.lng !== null) {
            const dist = getDistance(lat, lng, b.lat as number, b.lng as number);
            if (!closestItem || dist < closestItem.distance) {
              closestItem = { id: b.id, name: b.name, type: 'business', distance: dist };
            }
          }
        }
      }

      if (!closestItem || closestItem.distance > MAX_ASSOC_KM) {
        return {
          upload: null,
          targetName: null,
          error:
            'No hay ningún lugar del mapa cerca de esta foto. Si descubriste un rincón nuevo, ¡créalo con el botón “+” del mapa!',
        };
      }

      finalTargetId = closestItem.id;
      finalTargetType = closestItem.type;
      closestItemName = closestItem.name;
    }

    // 3. Registrar el upload en la base de datos
    const { data: row, error: insertError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        target_type: finalTargetType,
        target_id: finalTargetId,
        image_url: imageUrl,
        lat,
        lng,
      })
      .select()
      .single();

    if (insertError) return { upload: null, targetName: null, error: insertError.message };

    return { upload: row as UploadRecord, targetName: closestItemName, error: null };
  } catch (e) {
    return {
      upload: null,
      targetName: null,
      error: e instanceof Error ? e.message : 'Error inesperado al subir y asociar la foto.',
    };
  }
}

/** Fotos de un lugar/negocio para la galería de la ficha (pantalla 7). */
export async function getPhotosFor(targetType: 'place' | 'business', targetId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase()
    .from('uploads')
    .select('image_url')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) {
    console.warn('getPhotosFor:', error.message);
    return [];
  }
  return (data as { image_url: string }[]).map((r) => r.image_url);
}
