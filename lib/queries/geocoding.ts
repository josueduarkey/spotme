/**
 * Geocoding con Nominatim (OpenStreetMap) — gratis, sin API key (Cuenta B).
 * Lo usa el onboarding de negocio (Fase 4): dirección → lat/lng.
 * Política de Nominatim: máx 1 request/segundo — no llamar en cada tecla,
 * solo al confirmar la dirección.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Dirección normalizada que devolvió OpenStreetMap, para confirmar con el usuario. */
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;

  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=sv&q=' +
    encodeURIComponent(query);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'spotmi-hackathon/1.0 (turismo El Salvador PoC)' },
    });
    if (!res.ok) return null;
    const results: { lat: string; lon: string; display_name: string }[] = await res.json();
    if (!results.length) return null;
    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch (e) {
    console.warn('geocodeAddress:', e);
    return null;
  }
}

/**
 * lat/lng → nombre del departamento de El Salvador (ej. "Chalatenango").
 * Lo usa createPlace() para etiquetar lugares de comunidad automáticamente
 * (el panel de inteligencia territorial agrupa por departamento).
 */
export async function reverseGeocodeDepartment(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=8`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'spotmi-hackathon/1.0 (turismo El Salvador PoC)' },
    });
    if (!res.ok) return null;
    const data: { address?: { state?: string } } = await res.json();
    const state = data.address?.state;
    return state ? state.replace(/^Departamento de /i, '').trim() : null;
  } catch (e) {
    console.warn('reverseGeocodeDepartment:', e);
    return null;
  }
}
