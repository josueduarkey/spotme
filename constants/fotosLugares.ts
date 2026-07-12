/**
 * Fotos locales curadas para los lugares oficiales destacados (Top 5 del Home).
 * Igual que los dioramas: se empaquetan con la app para carga instantánea,
 * sin depender de Supabase Storage ni de la red.
 */

export const FOTOS_POR_LUGAR: Record<string, any[]> = {
  'Divino Salvador del Mundo': [
    require('../assets/lugares/divino-salvador-del-mundo-san-salvador-1.jpg'),
    require('../assets/lugares/divino-salvador-del-mundo-san-salvador-2.jpg'),
    require('../assets/lugares/divino-salvador-del-mundo-san-salvador-3.jpg'),
  ],
  'Lago de Coatepeque': [
    require('../assets/lugares/lago-coatepeque-santa-ana-1.jpg'),
    require('../assets/lugares/lago-coatepeque-santa-ana-2.jpg'),
    require('../assets/lugares/lago-coatepeque-santa-ana-3.jpg'),
  ],
  'Juayúa — Ruta de las Flores': [
    require('../assets/lugares/juayua-ruta-de-las-flores-sonsonate-1.jpg'),
    require('../assets/lugares/juayua-ruta-de-las-flores-sonsonate-2.jpg'),
    require('../assets/lugares/juayua-ruta-de-las-flores-sonsonate-3.jpg'),
  ],
  'Joya de Cerén': [
    require('../assets/lugares/joya-de-ceren-valle-de-zapotitlan-1.jpg'),
    require('../assets/lugares/joya-de-ceren-valle-de-zapotitlan-2.jpg'),
    require('../assets/lugares/joya-de-ceren-valle-de-zapotitlan-3.jpg'),
  ],
  'Bahía de Jiquilisco': [
    require('../assets/lugares/bahia-de-jiquilisco-usulutan-1.jpg'),
    require('../assets/lugares/bahia-de-jiquilisco-usulutan-2.jpg'),
    require('../assets/lugares/bahia-de-jiquilisco-usulutan-3.jpg'),
  ],
};

/** Portada del lugar (primera foto curada), si existe; null si no hay. */
export function getFotoLugar(placeName: string): any {
  return FOTOS_POR_LUGAR[placeName]?.[0] ?? null;
}

/** Las 3 fotos curadas del lugar, para mostrar junto a las de la comunidad; [] si no hay. */
export function getFotosLugar(placeName: string): any[] {
  return FOTOS_POR_LUGAR[placeName] ?? [];
}
