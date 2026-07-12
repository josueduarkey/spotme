/**
 * Galerías "Así se ha vivido" por evento — fotos locales de ediciones
 * anteriores, empaquetadas con la app (misma estrategia que dioramas y
 * fotos de lugares: carga instantánea, sin red).
 *
 * ⚠️ Para agregar fotos: colocar los .jpg en `assets/eventos/` y añadir el
 * require() a la lista del evento. NO referenciar archivos que no existan —
 * Metro falla al empaquetar si un require() apunta a un archivo faltante.
 */

export const FOTOS_POR_EVENTO: Record<string, any[]> = {
  'Festival Gastronómico de Juayúa': [require('../assets/ruta-flores.jpg')],
  'Noche de Museos': [require('../assets/salvador-mundo.jpg')],
  'Torneo de Surf El Tunco': [require('../assets/surf-city.jpg')],
  'Feria del Añil': [require('../assets/feria-anil.jpg')],
};

/** Fotos de ediciones pasadas del evento; [] si aún no hay curadas. */
export function getFotosEvento(titulo: string): any[] {
  return FOTOS_POR_EVENTO[titulo] ?? [];
}
