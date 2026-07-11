# Spotmi — Digital Twin Turístico de El Salvador

Hackathon de Turismo Creativo Vol. 1 — PoC construido en 2 días con dos cuentas de Fable 5 trabajando en paralelo.

## 0. Resumen del producto

Spotmi es un mapa interactivo (digital twin) de El Salvador donde:
- **Turistas** descubren lugares emblemáticos por departamento, suben fotos, planifican rutas con presupuesto estimado, y ganan recompensas por retos (fotos, visitas, retos ambientales).
- **Negocios / microemprendedores** se registran, fijan su ubicación y suben fotos de su local para ser descubiertos por los turistas.

El "twin" no es un modelo 3D: es un mapa 2D vivo que se llena con contenido real generado por los propios usuarios (UGC), capa por capa.

### Por qué esto es un digital twin (y no solo un mapa)

El reto original pide explícitamente **múltiples capas de información que normalmente no se visualizan en conjunto**, para generar un insight cruzando al menos dos de ellas. Spotmi cumple esto con capas togglables sobre el mismo mapa:

1. **Capa de lugares turísticos** (estática, precargada)
2. **Capa de negocios/microemprendedores** (crece con cada registro)
3. **Capa de actividad de turistas** (heatmap de fotos subidas — dónde está la gente realmente)
4. **Capa de eventos** (temporal, por fecha)
5. **Capa de retos ambientales/sostenibilidad** (dónde se están completando retos de reciclaje, etc.)

El mapa no es solo un directorio de pines: es una **representación viva del territorio** que un usuario puede leer combinando capas — por ejemplo, cruzar "actividad de turistas" con "negocios registrados" para ver zonas con alta afluencia pero baja densidad de negocios (oportunidad de negocio real). Esa lectura cruzada es lo que hace que Spotmi sea un digital twin y no un mapa turístico más — y es literalmente el criterio "Mejora" del framework COTMEA del hackathon.

## 1. Stack técnico

| Capa | Herramienta | Por qué |
|---|---|---|
| Frontend | Expo (React Native) | App móvil real, instalable en celular físico vía Expo Go (QR) para la demo, sin pelear con build nativo en 2 días |
| Navegación | expo-router | Sistema de rutas por archivos, rápido de armar el flujo de 16 pantallas |
| Mapa | @rnmapbox/maps (Mapbox SDK para React Native) | Capas, expansión por departamento, pines custom, funciona nativo en iOS/Android |
| Geolocalización | expo-location | Permisos y ubicación del turista para geotag de fotos y cálculo de rutas |
| Cámara / galería | expo-image-picker | Subir foto desde cámara o galería |
| Geocoding | Mapbox Geocoding API | Convertir dirección de negocio → lat/lng |
| Rutas | Mapbox Directions API | Ordenar y trazar la ruta planificada |
| Navegación externa | Linking de Expo a Google Maps | `Linking.openURL('google.navigation:q={lat},{lng}')` o deep link universal a Maps |
| Backend/DB | Supabase (Postgres + Auth + Storage) | Todo en uno, sin backend custom, SDK oficial de JS funciona igual en Expo |
| Imágenes placeholder de lugares | Modelo de generación de imágenes (tipo Nano Banana / Gemini 2.5 Flash Image) | Generar imagen representativa por punto turístico mientras no haya foto real |
| Build/preview | Expo Go + EAS Build (opcional) | Expo Go para demo instantánea por QR; EAS solo si da tiempo de generar un .apk/.ipa real |
| Notificaciones (si alcanza el tiempo) | expo-notifications | Opcional, no bloquea el MVP |

### Variables de entorno necesarias
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MAPBOX_TOKEN=
EXPO_PUBLIC_IMAGE_GEN_API_KEY=   # si se usa generación de imágenes por API
```

## 2. Modelo de datos (Supabase / Postgres)

```sql
-- usuarios (extiende auth.users de Supabase)
profiles (
  id uuid PK references auth.users,
  full_name text,
  account_type text check (account_type in ('turista','negocio')),
  avatar_url text,
  points int default 0,
  created_at timestamp default now()
)

-- lugares turísticos precargados
places (
  id uuid PK,
  name text,
  department text,
  description text,
  lat float,
  lng float,
  category text,          -- naturaleza, cultura, gastronomía, aventura
  cover_image_url text,   -- foto real, si existe
  map_icon_url text,      -- diorama isométrico generado (ver sección 7), usado como ícono de pin en el mapa
  is_generated_image boolean default false,
  created_at timestamp default now()
)

-- negocios
businesses (
  id uuid PK,
  owner_id uuid references profiles(id),
  name text,
  category text,
  description text,
  lat float,
  lng float,
  address text,
  schedule text,
  contact text,
  created_at timestamp default now()
)

-- fotos subidas por usuarios (UGC), asociadas a un lugar o negocio
uploads (
  id uuid PK,
  user_id uuid references profiles(id),
  target_type text check (target_type in ('place','business')),
  target_id uuid,
  image_url text,
  lat float,
  lng float,
  created_at timestamp default now()
)

-- retos y recompensas
challenges (
  id uuid PK,
  title text,
  description text,
  points_reward int,
  type text  -- 'upload_photo','visit_places','environmental'
)

user_challenges (
  id uuid PK,
  user_id uuid references profiles(id),
  challenge_id uuid references challenges(id),
  status text check (status in ('in_progress','completed')),
  completed_at timestamp
)

-- eventos
events (
  id uuid PK,
  title text,
  description text,
  department text,
  date timestamp,
  cover_image_url text
)

-- rutas planificadas
planned_routes (
  id uuid PK,
  user_id uuid references profiles(id),
  place_ids uuid[],
  estimated_budget numeric,
  estimated_duration_minutes int,
  created_at timestamp default now()
)
```

## 3. Mapa de pantallas

**Compartidas**
1. Splash
2. Login / Register
3. Selección de tipo de cuenta: turista o negocio

**Turista**
4. Onboarding turista (permisos de ubicación + selección de intereses)
5. Home (CTA + mini-mapa, Top 5 lugares, Eventos próximos)
6. Mapa full (departamentos expandibles, **selector de capas togglables**: Lugares / Negocios / Actividad de turistas / Eventos / Retos ambientales — este selector es el corazón del digital twin)
7. Ficha de lugar o negocio (fotos, descripción, botón "Cómo llegar", botón "Subir foto")
8. Subir foto (cámara/galería + geolocalización automática)
9. Planificar ruta (selección múltiple de lugares en el mapa)
10. Ruta generada (trazado, orden sugerido, tiempo, presupuesto, botón "Iniciar navegación")
11. Retos y recompensas (lista de retos activos + catálogo canjeable)
12. Perfil turista (fotos, puntos, insignias, historial)
13. Eventos (lista + detalle)
17. **Panel de inteligencia territorial** — accesible desde el mapa o el perfil, cruza al menos 2 capas de datos y muestra un insight en texto plano, ej: "El Trifinio tiene alta actividad de turistas esta semana pero solo 2 negocios registrados — oportunidad para nuevos emprendedores." Esta es la pantalla que demuestra ante el jurado que el twin genera valor real, no solo se ve bonito.

**Negocio**
14. Onboarding negocio (datos del negocio + ubicación en mapa)
15. Dashboard negocio (vista pública + métricas simples: vistas, interacciones)
16. Editar perfil de negocio (fotos, horario, descripción, pin arrastrable)

## 4. División en 2 cuentas paralelas de Fable 5

**Cuenta A — Frontend / UX** (pantallas 1-13, componentes visuales, navegación)
**Cuenta B — Backend / Datos / Mapa** (Supabase, modelo de datos, integración Mapbox, Directions API, generación de imágenes placeholder)

Sincronizan cada 4-6 horas para conectar frontend con backend real (antes de eso, Cuenta A trabaja con datos mock).

### 4.1 Un solo repositorio, no dos

Supabase no es un servidor que Cuenta B programe aparte — es un servicio en la nube que se configura desde su dashboard y se consume con su SDK de JS desde el mismo código de la app. Solo hay una aplicación móvil. Dos repos separados solo generarían fricción de integración que no hay tiempo de resolver en 1-2 días.

**Setup recomendado (primeros 15 minutos, antes de arrancar la Fase 1):**
1. Una persona crea el repo en GitHub: `spotmi/`.
2. Invita a la otra cuenta/persona como colaboradora de inmediato.
3. Cuenta B crea el proyecto de Supabase (en supabase.com, no en el repo) y comparte la URL + anon key en un `.env` que se sube al repo (sin subir a git público si el repo es público — usar `.env.example` con placeholders y `.env` real solo local/compartido por chat).

**Estructura de carpetas dentro del repo:**
```
spotmi/
├── app/              # pantallas (expo-router) — Cuenta A
├── components/       # componentes UI reutilizables — Cuenta A
├── lib/
│   ├── supabase.ts   # cliente de Supabase — Cuenta B
│   └── queries/      # funciones de acceso a datos (getPlaces, uploadPhoto, etc.) — Cuenta B
├── constants/        # colores, tipografía del sistema de diseño — Cuenta A
├── supabase/
│   └── schema.sql    # el modelo de datos de la sección 2, versionado — Cuenta B
├── .env.example
└── CLAUDE.md
```

**Flujo de trabajo:** ambas cuentas trabajan sobre `main` directamente (no vale la pena manejar pull requests en 2 días), pero cada una se mantiene dentro de su carpeta para minimizar conflictos. Cuenta A importa las funciones de `lib/queries/` en sus pantallas — nunca escribe queries de Supabase directamente dentro de `app/`. Hacen commit y push seguido (cada 30-60 min) para que la otra cuenta siempre tenga la última versión al sincronizar.

## 5. Fases de desarrollo

### Día 1 — Mañana (Fase 1: Fundaciones)
**Cuenta A:** Setup del proyecto Expo (React Native) con expo-router, sistema de diseño (colores, tipografía, componentes base), pantallas 1-3 (splash, login, selección de cuenta) con datos mock.
**Cuenta B:** Setup de Supabase, crear todas las tablas del modelo de datos, configurar Auth, cargar 8-10 lugares turísticos precargados (uno por departamento clave) con datos reales o generados.

*Done cuando:* login funcional conecta con Supabase Auth real, y `places` tiene datos cargados.

### Día 1 — Tarde (Fase 2: Descubrimiento)
**Cuenta A:** Home (pantalla 5) con Top 5 y eventos, pantalla de mapa full (6) integrando Mapbox **con el selector de capas togglables** (Lugares/Negocios como mínimo en esta fase), ficha de lugar (7).
**Cuenta B:** Integrar Mapbox GL con capas de lugares/negocios reales desde Supabase (cada capa como fuente de datos independiente que se puede mostrar/ocultar), generar imágenes placeholder para los lugares que no tengan foto (API de generación de imágenes), endpoint de geocoding para negocios.

*Done cuando:* el mapa muestra pines reales desde la base de datos, se pueden togglear al menos 2 capas, y cada pin abre su ficha con datos reales.

### Día 1 — Noche (Fase 3: Contenido generado por usuario)
**Cuenta A:** Pantalla de subir foto (8), conexión con cámara/galería del dispositivo.
**Cuenta B:** Storage de Supabase para fotos, guardar geolocalización automática, lógica de asociar foto subida a lugar/negocio más cercano.

*Done cuando:* un usuario puede subir una foto real y verla reflejada en la ficha del lugar.

### Día 2 — Mañana (Fase 4: Planificación y negocio)
**Cuenta A:** Pantallas 9-10 (planificar ruta, ruta generada con botón de navegación externa), pantallas 14-16 (flujo completo de negocio).
**Cuenta B:** Integrar Directions API de Mapbox para calcular orden/tiempo/distancia de la ruta, lógica de presupuesto estimado (simple: costo fijo o rango por categoría de lugar), endpoint para que negocio guarde su ubicación vía geocoding.

*Done cuando:* seleccionar 3 lugares en el mapa genera una ruta trazada con tiempo y presupuesto, y un negocio puede registrarse y aparecer en el mapa.

### Día 2 — Mediodía (Fase 5: Gamificación + inteligencia territorial)
**Cuenta A:** Pantallas 11-12 (retos y recompensas, perfil con puntos e insignias), pantalla 17 (panel de inteligencia territorial) y las capas restantes del selector de mapa (Actividad de turistas como heatmap de `uploads`, Eventos, Retos ambientales).
**Cuenta B:** Lógica de asignación de puntos (subir foto = X puntos, completar reto = Y puntos), tabla `user_challenges` funcional, query que cruce 2 capas (ej. `uploads` agrupados por departamento vs. conteo de `businesses` por departamento) para alimentar el panel de insights con un dato real, no inventado.

*Done cuando:* subir una foto o completar un reto suma puntos visibles en el perfil, y el panel de inteligencia territorial muestra al menos un insight generado con datos reales cruzando 2 capas.

### Día 2 — Tarde (Fase 6: Pulido y demo)
**Ambas cuentas juntas:** revisar consistencia visual, cargar contenido real/curado para los 8-10 lugares (fotos, descripciones), pruebas de extremo a extremo del flujo completo (registro → mapa → subir foto → planificar ruta → ver puntos), preparar guion de demo en vivo, publicar con `expo publish` o dejar el QR de Expo Go listo en 2-3 celulares del equipo por si falla el wifi del venue.

*Done cuando:* se puede hacer el recorrido completo de la demo sin errores, en un dispositivo real.

## 6. Estilo visual de los íconos de mapa (dioramas isométricos)

Cada lugar turístico se representa en el mapa con un **ícono diorama en 3D low-poly**, no con una foto plana. Referencia: miniatura del Monumento al Divino Salvador del Mundo — figura central estilizada sobre una base circular tipo "peana de exhibición", con vegetación low-poly alrededor y una placa con el nombre del lugar. Este es el estándar visual para los ~8-10 lugares del MVP, y debe sentirse como una colección coherente de piezas de museo/coleccionable, no como ilustraciones sueltas de estilos distintos.

**Reglas de consistencia (aplican a los 8-10 lugares):**
- Ángulo de cámara isométrico, siempre el mismo (3/4, ligeramente elevado).
- Base circular o elíptica de madera clara, con placa de texto en la parte frontal con el nombre del lugar.
- Estilo low-poly geométrico (facetas visibles, sin texturas fotorrealistas).
- Paleta de colores consistente entre piezas: tonos tierra/piedra para estructuras, verdes para vegetación, fondo blanco/transparente.
- Un solo elemento central protagonista por lugar (el monumento, la iglesia, el volcán, el lago, etc.), sin saturar de detalles secundarios.
- Fondo blanco puro o transparente (para que se vea limpio como marcador de mapa).

**Template de prompt para generación de imagen** (usar con el modelo de generación de imágenes, uno por lugar):
```
Low-poly isometric 3D diorama miniature of {NOMBRE_DEL_LUGAR}, {DEPARTAMENTO}, El Salvador.
{ELEMENTO_CENTRAL_DESCRIPCIÓN} as the main centerpiece, geometric faceted low-poly style,
circular light wood display base, small nameplate on the front reading "{NOMBRE_DEL_LUGAR}",
surrounded by simplified low-poly trees/vegetation matching the landscape,
soft studio lighting, clean white background, collectible figurine aesthetic,
consistent art style across a series, 3/4 isometric camera angle.
```

Ejemplo concreto para Santa Ana: `{ELEMENTO_CENTRAL_DESCRIPCIÓN}` = "the Santa Ana volcano with a crater lake, low-poly green slopes". Para la Catedral de Santa Ana: "a gothic-revival cathedral facade in cream tones".

**Dónde vive esto en el flujo de trabajo:** Cuenta B genera estos 8-10 íconos en la Fase 2 (Día 1 tarde) y los sube a Supabase Storage, guardando la URL en `places.map_icon_url`. Cuenta A los usa como ícono custom de cada marcador en Mapbox (no como el pin default).

## 7. Criterios de éxito del MVP (checklist final)

- [ ] Registro/login funcional (turista y negocio)
- [ ] Mapa muestra al menos 8 lugares reales por departamento
- [ ] Ficha de lugar muestra info + fotos (reales o generadas)
- [ ] Turista puede subir foto geolocalizada
- [ ] Negocio puede registrar su ubicación y aparecer en el mapa
- [ ] Planificar ruta genera trazado + tiempo + presupuesto estimado
- [ ] Botón "cómo llegar" abre navegación externa (Google Maps)
- [ ] Sistema de puntos/retos suma puntos visibles en perfil
- [ ] El mapa tiene al menos 3 capas togglables (lugares, negocios, actividad de turistas)
- [ ] El panel de inteligencia territorial muestra un insight real cruzando al menos 2 capas
- [ ] App corre en Expo Go vía QR en un celular real para la demo
- [ ] Los 8-10 lugares tienen su ícono diorama generado y consistente en el mapa

## 8. Prompts iniciales para arrancar Fase 1 (copiar y pegar en cada cuenta)

### Prompt para Cuenta A (Frontend / UX)
```
Estás construyendo el frontend de Spotmi, un digital twin turístico de El Salvador,
como app móvil con Expo (React Native). Lee el archivo CLAUDE.md completo antes de
empezar — ahí está el modelo de datos, el mapa de pantallas y el estilo visual.

Este es un repo único y compartido con otra persona/sesión que trabaja el backend
(Cuenta B). Trabajas dentro de `app/`, `components/` y `constants/` — nunca escribas
queries de Supabase directamente ahí, esas van a vivir en `lib/queries/` y las
importas cuando existan (sección 4.1 del CLAUDE.md tiene la estructura completa).
Haz commit y push seguido para que el trabajo quede sincronizado.

Tu trabajo en esta sesión es la Fase 1 (Día 1 mañana):
1. Setup de proyecto Expo con expo-router para la navegación.
2. Define un sistema de diseño simple: paleta de colores, tipografía, espaciados,
   componentes base (botón, card, input) — inspirado en un estilo limpio, cálido,
   con acentos de color que evoquen turismo (usa tonos tierra/verde/turquesa, no
   corporativo genérico).
3. Construye las pantallas 1-3 del flujo: Splash, Login/Register, y selección de
   tipo de cuenta (turista/negocio).
4. Usa datos mock por ahora (Cuenta B conectará Supabase real más tarde).
5. Deja los componentes de estas pantallas listos para recibir props reales sin
   refactor mayor.
6. Verifica que el proyecto corra en Expo Go (celular físico vía QR) — esa es la
   forma en que van a demostrar la app en vivo ante el jurado.

No implementes lógica de backend. No inventes pantallas fuera de las que están en
el CLAUDE.md. Al terminar, resume qué construiste y qué falta para conectar con
el backend real.
```

### Prompt para Cuenta B (Backend / Datos / Mapa)
```
Estás construyendo el backend y la capa de datos de Spotmi, un digital twin
turístico de El Salvador. Lee el archivo CLAUDE.md completo antes de empezar —
ahí está el modelo de datos completo, las fases y el estilo visual de los
íconos de mapa.

Este es un repo único y compartido con otra persona/sesión que trabaja el
frontend (Cuenta A) — no crees un repo aparte. Trabajas dentro de `lib/supabase.ts`,
`lib/queries/` y `supabase/schema.sql` (sección 4.1 del CLAUDE.md tiene la
estructura completa). El proyecto de Supabase se crea en supabase.com (no es
código del repo), pero versiona el schema SQL dentro de `supabase/schema.sql`
para que quede documentado. Haz commit y push seguido para que Cuenta A pueda
importar tus queries en cuanto existan.

Tu trabajo en esta sesión es la Fase 1 (Día 1 mañana):
1. Configura un proyecto Supabase: crea todas las tablas definidas en la
   sección 2 del CLAUDE.md (profiles, places, businesses, uploads, challenges,
   user_challenges, events, planned_routes).
2. Configura Supabase Auth (email/password como mínimo).
3. Carga manualmente 8-10 lugares turísticos reales de El Salvador en la tabla
   `places`, uno por departamento relevante, con nombre, departamento,
   descripción corta, categoría y coordenadas lat/lng reales.
4. Deja preparada (pero no ejecutada aún) la estrategia para generar los
   íconos diorama de la sección 6 — necesitas definir qué API de generación
   de imágenes usarás y cómo automatizarás las 8-10 llamadas.

No construyas pantallas de frontend. Al terminar, resume el estado de las
tablas y comparte las credenciales/config que Cuenta A necesitará (URL y
anon key de Supabase) para conectar en la Fase 2.
```

Cuando ambas cuentas terminen la Fase 1, sincronicen: Cuenta A conecta login real con las credenciales de Supabase que generó Cuenta B, y arrancan la Fase 2 juntas.