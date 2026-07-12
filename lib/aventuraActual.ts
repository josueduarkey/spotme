/**
 * Handoff de la aventura generada entre pantallas (aventura → reservar).
 * Un itinerario completo no cabe cómodo en params de router; este módulo
 * actúa como buzón en memoria: aventura.tsx lo escribe justo antes de
 * navegar y reservar.tsx lo lee al montar.
 */
import { AventuraGenerada } from './queries/routes';

let actual: AventuraGenerada | null = null;

export function setAventuraActual(a: AventuraGenerada) {
  actual = a;
}

export function getAventuraActual(): AventuraGenerada | null {
  return actual;
}
