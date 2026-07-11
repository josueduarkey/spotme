/**
 * Mapeo local de dioramas (Fase 2).
 * Carga las imágenes directamente desde los assets locales de la app
 * sin necesidad de descargarlas de Supabase Storage.
 */

export const DIORAMAS_POR_LUGAR: Record<string, any> = {
  'Divino Salvador del Mundo': require('../assets/dioramas/parque_la_familia.png'),
  'Volcán de Santa Ana': require('../assets/dioramas/cerro_verde.png'),
  'Lago de Coatepeque': require('../assets/dioramas/catedral_santa_ana.png'),
  'Suchitoto': require('../assets/dioramas/cuscatlan.png'),
  'Playa El Tunco': require('../assets/dioramas/la_libertad.png'),
  'Juayúa — Ruta de las Flores': require('../assets/dioramas/sonsonate.png'),
  'Joya de Cerén': require('../assets/dioramas/mirador_de_cristal.png'),
  'Parque Nacional El Imposible': require('../assets/dioramas/ahuachapan.png'),
  'Bahía de Jiquilisco': require('../assets/dioramas/la_paz.png'),
  'Playa Las Flores': require('../assets/dioramas/san_vicente.png'),
};

export const DIORAMAS_POR_DEPARTAMENTO: Record<string, any> = {
  'Ahuachapán': require('../assets/dioramas/ahuachapan.png'),
  'Cabañas': require('../assets/dioramas/cabanas.png'),
  'Cuscatlán': require('../assets/dioramas/cuscatlan.png'),
  'La Libertad': require('../assets/dioramas/la_libertad.png'),
  'Sonsonate': require('../assets/dioramas/sonsonate.png'),
  'San Salvador': require('../assets/dioramas/parque_la_familia.png'),
  'Usulután': require('../assets/dioramas/la_paz.png'),
  'San Miguel': require('../assets/dioramas/san_vicente.png'),
  'La Paz': require('../assets/dioramas/la_paz.png'),
  'San Vicente': require('../assets/dioramas/san_vicente.png'),
  'Santa Ana': require('../assets/dioramas/cerro_verde.png'),
  'Chalatenango': require('../assets/dioramas/mirador_las_pilas.png'),
};

export function getDioramaSource(placeName: string, department: string): any {
  return DIORAMAS_POR_LUGAR[placeName] || DIORAMAS_POR_DEPARTAMENTO[department] || null;
}
