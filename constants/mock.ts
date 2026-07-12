/**
 * Datos mock para las Fases 1-2 (Cuenta A trabaja sin backend).
 * Cuenta B los reemplaza al conectar Supabase real.
 * Las coordenadas de lugares son reales.
 */

export type AccountType = 'turista' | 'negocio';
export type Categoria = 'naturaleza' | 'cultura' | 'gastronomia' | 'aventura';

export interface MockProfile {
  id: string;
  fullName: string;
  email: string;
  accountType: AccountType | null;
  points: number;
}

export interface Place {
  id: string;
  name: string;
  department: string;
  description: string;
  lat: number;
  lng: number;
  category: Categoria;
  coverImageUrl: string | null; // Cuenta B: foto real o generada
  mapIconUrl: string | null; // Cuenta B: diorama isométrico
  // Campos del pivote (opcionales para no romper las queries de Cuenta B;
  // `undefined` se trata como lugar oficial ya verificado)
  source?: 'official' | 'community';
  createdBy?: string | null;
  verificationCount?: number;
  isVerified?: boolean;
}

/** Helpers de lectura para los campos del pivote. */
export const esComunidad = (p: Place) => p.source === 'community';
export const estaVerificado = (p: Place) => p.source !== 'community' || p.isVerified === true;

export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  schedule: string;
  contact: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  department: string;
  date: string; // ISO
  lat: number;
  lng: number;
}

/** Punto de actividad: foto subida por un turista (capa de heatmap). */
export interface ActivityPoint {
  id: string;
  lat: number;
  lng: number;
  /** intensidad relativa 1-10 para dimensionar el círculo */
  weight: number;
}

export const CATEGORIAS: Record<Categoria, { etiqueta: string }> = {
  naturaleza: { etiqueta: 'Naturaleza' },
  cultura: { etiqueta: 'Cultura' },
  gastronomia: { etiqueta: 'Gastronomía' },
  aventura: { etiqueta: 'Aventura' },
};

export const MOCK_PROFILE: MockProfile = {
  id: 'mock-user-1',
  fullName: 'Valeria Escobar',
  email: 'valeria@example.com',
  accountType: null,
  points: 120,
};

export const MOCK_PLACES: Place[] = [
  {
    id: 'p1',
    name: 'Divino Salvador del Mundo',
    department: 'San Salvador',
    description:
      'El monumento más emblemático del país, en plena Plaza Salvador del Mundo. Punto de encuentro, celebraciones y postal obligada de la capital.',
    lat: 13.7013,
    lng: -89.2247,
    category: 'cultura',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p2',
    name: 'Volcán de Santa Ana',
    department: 'Santa Ana',
    description:
      'El Ilamatepec, volcán más alto de El Salvador (2,381 m). La caminata al cráter revela una laguna turquesa que parece de otro planeta.',
    lat: 13.8536,
    lng: -89.63,
    category: 'aventura',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p3',
    name: 'Lago de Coatepeque',
    department: 'Santa Ana',
    description:
      'Caldera volcánica convertida en un lago azul profundo. Miradores, kayak y atardeceres que cambian de color según la temporada.',
    lat: 13.8667,
    lng: -89.55,
    category: 'naturaleza',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p4',
    name: 'Suchitoto',
    department: 'Cuscatlán',
    description:
      'Pueblo colonial de calles empedradas frente al lago Suchitlán. Capital cultural del país: galerías, añil y la iglesia Santa Lucía.',
    lat: 13.938,
    lng: -89.028,
    category: 'cultura',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p5',
    name: 'Playa El Tunco',
    department: 'La Libertad',
    description:
      'La playa más famosa de la costa salvadoreña: surf de clase mundial, la roca del Tunco y una escena de atardeceres inigualable.',
    lat: 13.4933,
    lng: -89.381,
    category: 'aventura',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p6',
    name: 'Juayúa — Ruta de las Flores',
    department: 'Sonsonate',
    description:
      'Corazón de la Ruta de las Flores. Su festival gastronómico de fin de semana y los Chorros de la Calera lo hacen parada obligatoria.',
    lat: 13.841,
    lng: -89.746,
    category: 'gastronomia',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p7',
    name: 'Joya de Cerén',
    department: 'La Libertad',
    description:
      'La "Pompeya de América", Patrimonio de la Humanidad UNESCO. Una aldea maya sepultada por ceniza hace 1,400 años, intacta.',
    lat: 13.8272,
    lng: -89.3672,
    category: 'cultura',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p8',
    name: 'Parque Nacional El Imposible',
    department: 'Ahuachapán',
    description:
      'El bosque más biodiverso del país. Senderos entre cañones, pumas, tucanes y vistas que llegan hasta el Pacífico.',
    lat: 13.84,
    lng: -89.95,
    category: 'naturaleza',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p9',
    name: 'Bahía de Jiquilisco',
    department: 'Usulután',
    description:
      'Reserva de biosfera con los manglares más extensos de Centroamérica. Tortugas marinas, islas y pesca artesanal.',
    lat: 13.23,
    lng: -88.55,
    category: 'naturaleza',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  {
    id: 'p10',
    name: 'Playa Las Flores',
    department: 'San Miguel',
    description:
      'Joya del oriente salvadoreño: olas largas y consistentes que atraen surfistas de todo el mundo, arena dorada y ambiente tranquilo.',
    lat: 13.175,
    lng: -88.105,
    category: 'aventura',
    coverImageUrl: null,
    mapIconUrl: null,
  },
  // Lugares de comunidad (pivote Fase 3) — ejemplos para desarrollo sin backend
  {
    id: 'c1',
    name: 'Cascada Los Tercios',
    department: 'Cuscatlán',
    description: 'Cascada sobre columnas hexagonales de basalto, a 20 minutos de Suchitoto. La descubrimos siguiendo un sendero local.',
    lat: 13.929,
    lng: -89.015,
    category: 'naturaleza',
    coverImageUrl: null,
    mapIconUrl: null,
    source: 'community',
    createdBy: 'mock-user-2',
    verificationCount: 1,
    isVerified: false,
  },
  {
    id: 'c2',
    name: 'Mirador El Boquerón Sur',
    department: 'San Salvador',
    description: 'Vista al cráter del volcán de San Salvador desde el lado menos conocido. Ideal al atardecer.',
    lat: 13.723,
    lng: -89.288,
    category: 'aventura',
    coverImageUrl: null,
    mapIconUrl: null,
    source: 'community',
    createdBy: 'mock-user-3',
    verificationCount: 3,
    isVerified: true,
  },
];

export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'b1',
    name: 'Café Albania',
    category: 'Cafetería',
    description: 'Café de altura cultivado en la Ruta de las Flores, con mirador al valle.',
    lat: 13.8355,
    lng: -89.7519,
    address: 'Km 82, carretera a Juayúa, Sonsonate',
    schedule: 'Lun-Dom 8:00–18:00',
    contact: '+503 7000 0001',
  },
  {
    id: 'b2',
    name: 'Pupusería La Esquina de Suchi',
    category: 'Restaurante',
    description: 'Pupusas de maíz azul frente al parque central de Suchitoto.',
    lat: 13.9374,
    lng: -89.0292,
    address: 'Calle Francisco Morazán, Suchitoto',
    schedule: 'Mié-Dom 10:00–20:00',
    contact: '+503 7000 0002',
  },
  {
    id: 'b3',
    name: 'Hostal Punta Roca',
    category: 'Hospedaje',
    description: 'Hostal surfero a 50 m de la playa El Tunco, con renta de tablas.',
    lat: 13.4941,
    lng: -89.3822,
    address: 'Calle principal, El Tunco, La Libertad',
    schedule: '24 horas',
    contact: '+503 7000 0003',
  },
  {
    id: 'b4',
    name: 'Artesanías Añil Real',
    category: 'Artesanías',
    description: 'Taller de teñido con añil: talleres en vivo y piezas hechas a mano.',
    lat: 13.9391,
    lng: -89.0271,
    address: 'Barrio El Centro, Suchitoto',
    schedule: 'Mar-Dom 9:00–17:00',
    contact: '+503 7000 0004',
  },
  {
    id: 'b5',
    name: 'Kayak Coatepeque Tours',
    category: 'Turismo',
    description: 'Paseos en kayak y lancha por el lago de Coatepeque al atardecer.',
    lat: 13.8709,
    lng: -89.5568,
    address: 'Muelle público, Lago de Coatepeque',
    schedule: 'Vie-Dom 7:00–17:00',
    contact: '+503 7000 0005',
  },
];

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'e1',
    title: 'Festival Gastronómico de Juayúa',
    description: 'Todos los fines de semana: parrilladas, comida típica y música en vivo en el parque central.',
    department: 'Sonsonate',
    date: '2026-07-12T10:00:00Z',
    lat: 13.841,
    lng: -89.746,
  },
  {
    id: 'e2',
    title: 'Torneo de Surf El Tunco',
    description: 'Competencia local de surf con categorías amateur y profesional.',
    department: 'La Libertad',
    date: '2026-07-18T08:00:00Z',
    lat: 13.4933,
    lng: -89.381,
  },
  {
    id: 'e3',
    title: 'Feria del Añil',
    description: 'Talleres de teñido, venta de textiles y recorridos por talleres históricos de Suchitoto.',
    department: 'Cuscatlán',
    date: '2026-07-25T09:00:00Z',
    lat: 13.938,
    lng: -89.028,
  },
  {
    id: 'e4',
    title: 'Noche de Museos',
    description: 'Museos y galerías del centro histórico de San Salvador abren gratis hasta medianoche.',
    department: 'San Salvador',
    date: '2026-07-31T18:00:00Z',
    lat: 13.6989,
    lng: -89.1914,
  },
];

/** Fotos subidas (mock): clusters alrededor de los lugares más visitados. */
export const MOCK_ACTIVITY: ActivityPoint[] = [
  { id: 'a1', lat: 13.4933, lng: -89.381, weight: 10 }, // El Tunco
  { id: 'a2', lat: 13.4985, lng: -89.3877, weight: 6 },
  { id: 'a3', lat: 13.8536, lng: -89.63, weight: 8 }, // Volcán Santa Ana
  { id: 'a4', lat: 13.8601, lng: -89.6215, weight: 5 },
  { id: 'a5', lat: 13.938, lng: -89.028, weight: 7 }, // Suchitoto
  { id: 'a6', lat: 13.8667, lng: -89.55, weight: 6 }, // Coatepeque
  { id: 'a7', lat: 13.7013, lng: -89.2247, weight: 9 }, // Divino Salvador
  { id: 'a8', lat: 13.841, lng: -89.746, weight: 7 }, // Juayúa
  { id: 'a9', lat: 13.175, lng: -88.105, weight: 4 }, // Las Flores
  { id: 'a10', lat: 13.23, lng: -88.55, weight: 2 }, // Jiquilisco
];
