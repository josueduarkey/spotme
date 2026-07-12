/**
 * Experiencia guiada — el modelo de negocio de Spotmi como guía turístico.
 *
 * El itinerario de "Mi aventura" se vende como paquete todo-arreglado para
 * turistas (especialmente extranjeros): entradas + transporte + guía local
 * + servicio Spotmi. El desglose es transparente — es también el pitch de
 * monetización ante el jurado: Spotmi cobra una comisión de servicio por
 * cada experiencia reservada y conecta la demanda con guías/negocios locales.
 */
import { AventuraGenerada } from './queries/routes';

/** Tarifa diaria del guía local (se comparte entre el grupo). */
export const GUIA_POR_DIA_USD = 35;
/** Comisión de servicio Spotmi sobre el subtotal (el modelo de ingresos). */
export const SERVICIO_PCT = 0.12;
/** WhatsApp del equipo/guías (formato internacional sin +). */
export const WHATSAPP_RESERVAS = '50376753999';

export interface PrecioExperiencia {
  dias: number;
  personas: number;
  /** Entradas + transporte estimado, por persona. */
  basePorPersona: number;
  /** Guía local compartido entre el grupo, por persona. */
  guiaPorPersona: number;
  /** Comisión de servicio Spotmi, por persona. */
  servicioPorPersona: number;
  totalPorPersona: number;
  totalGrupo: number;
}

export function calcularPrecio(aventura: AventuraGenerada, personas: number): PrecioExperiencia {
  const dias = aventura.dias.length;
  const basePorPersona = aventura.dias.reduce((s, d) => s + d.presupuesto, 0);
  const guiaPorPersona = (GUIA_POR_DIA_USD * dias) / Math.max(1, personas);
  const subtotal = basePorPersona + guiaPorPersona;
  const servicioPorPersona = subtotal * SERVICIO_PCT;
  const totalPorPersona = Math.ceil(subtotal + servicioPorPersona);
  return {
    dias,
    personas,
    basePorPersona: Math.ceil(basePorPersona),
    guiaPorPersona: Math.ceil(guiaPorPersona),
    servicioPorPersona: Math.ceil(servicioPorPersona),
    totalPorPersona,
    totalGrupo: totalPorPersona * personas,
  };
}

/** Precio "desde" para el CTA (grupo de 2, el caso típico). */
export function precioDesde(aventura: AventuraGenerada): number {
  return calcularPrecio(aventura, 2).totalPorPersona;
}

/** Mensaje de solicitud de reserva listo para WhatsApp. */
export function mensajeReserva(aventura: AventuraGenerada, precio: PrecioExperiencia): string {
  const lineasDias = aventura.dias
    .map((d) => `  Día ${d.dia} · ${d.titulo}: ${d.lugares.map((l) => l.name).join(' → ')}`)
    .join('\n');
  return (
    `🌋 ¡Hola Spotmi! Quiero reservar esta experiencia:\n\n` +
    `📍 Zona: ${aventura.zonas.join(' → ')}\n` +
    `🗓 ${precio.dias} ${precio.dias === 1 ? 'día' : 'días'} · 👥 ${precio.personas} ${precio.personas === 1 ? 'persona' : 'personas'}\n\n` +
    `${lineasDias}\n\n` +
    `💵 Total estimado: $${precio.totalGrupo} USD ($${precio.totalPorPersona}/persona)\n\n` +
    `¿Me confirman disponibilidad y guía local?`
  );
}
