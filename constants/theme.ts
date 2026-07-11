/**
 * Sistema de diseño Spotmi
 *
 * Paleta oficial del proyecto (flat, vibrante) + tokens semánticos.
 * La firma visual se mantiene: la "peana" (borde inferior sólido) con la
 * que botones y cards se asientan, eco de los dioramas del mapa.
 */
export const Paleta = {
  azulOceano: '#1A54A6',
  naranjaSol: '#E67E22',
  verdeCafetal: '#2ECC71',
  azulLago: '#3498DB',
  rojoAnil: '#E74C3C',
  amarilloSol: '#F1C40F',
  blancoPapel: '#F8F9FA',
  grisVolcan: '#2C3E50',
} as const;

export const Colors = {
  ...Paleta,

  // Semánticos
  primario: Paleta.azulOceano,
  primarioOscuro: '#123E7D',
  acento: Paleta.naranjaSol,
  fondo: Paleta.blancoPapel,
  superficie: '#FFFFFF',
  tinta: Paleta.grisVolcan, // fondos oscuros (splash, CTA, fecha de evento)
  tintaOscura: '#1F2D3D',

  borde: '#DEE5EC',
  bordeOscuro: '#C4CFD9',
  rellenoSuave: '#E9EFF6', // portadas placeholder, insignias

  texto: Paleta.grisVolcan,
  textoSuave: '#6C7A89',
  textoInvertido: Paleta.blancoPapel,

  error: Paleta.rojoAnil,
  exito: Paleta.verdeCafetal,
} as const;

export const Fonts = {
  display: 'SpaceGrotesk_600SemiBold', // titulares — geométrica, con carácter
  displayBold: 'SpaceGrotesk_700Bold',
  cuerpo: 'PlusJakartaSans_400Regular',
  cuerpoMedium: 'PlusJakartaSans_500Medium',
  cuerpoSemiBold: 'PlusJakartaSans_600SemiBold',
  cuerpoBold: 'PlusJakartaSans_700Bold',
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

/** Grosor de la "peana": borde inferior que firma cards y botones. */
export const Peana = {
  grosor: 4,
} as const;
