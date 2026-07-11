/**
 * Sistema de diseño Spotmi
 *
 * Paleta anclada en el torogoz (ave nacional): turquesa + naranja óxido,
 * sobre verdes volcánicos y neutros cálidos. El tono "madera" viene de las
 * peanas de los dioramas coleccionables que representan cada lugar en el
 * mapa (CLAUDE.md, sección 6).
 */
export const Colors = {
  // Marca
  turquesa: '#0E9AA3', // primario — plumaje del torogoz
  turquesaOscuro: '#0A7178',
  tierra: '#C75B39', // acento — pecho del torogoz, barro cocido
  selva: '#152A20', // tinta — verde volcánico profundo (fondos oscuros, texto)

  // Neutros cálidos
  crema: '#FAF6ED', // fondo general
  blanco: '#FFFFFF',
  madera: '#E9DABE', // peana de diorama — bordes, bases, chips
  maderaOscura: '#C7B18A',

  // Texto
  texto: '#22362B',
  textoSuave: '#68796D',
  textoInvertido: '#F4EFE3',

  // Estado
  error: '#B3402A',
  exito: '#2E7D5B',
} as const;

export const Fonts = {
  display: 'Fraunces_600SemiBold', // titulares — cálida, de museo/coleccionable
  displayBold: 'Fraunces_700Bold',
  cuerpo: 'Figtree_400Regular',
  cuerpoMedium: 'Figtree_500Medium',
  cuerpoSemiBold: 'Figtree_600SemiBold',
  cuerpoBold: 'Figtree_700Bold',
} as const;

export const Type = {
  display: { fontFamily: Fonts.displayBold, fontSize: 34, lineHeight: 40 },
  titulo: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 32 },
  subtitulo: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 26 },
  cuerpo: { fontFamily: Fonts.cuerpo, fontSize: 16, lineHeight: 24 },
  cuerpoDestacado: { fontFamily: Fonts.cuerpoSemiBold, fontSize: 16, lineHeight: 24 },
  nota: { fontFamily: Fonts.cuerpoMedium, fontSize: 13, lineHeight: 18 },
  etiqueta: {
    fontFamily: Fonts.cuerpoBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  s: 10,
  m: 16,
  l: 24,
  pill: 999,
} as const;

/** Grosor de la "peana": borde inferior en madera que firma cards y botones. */
export const Peana = {
  grosor: 4,
} as const;
