# Spotmi — Digital Twin Turístico de El Salvador

Hackathon de Turismo Creativo Vol. 1 — PoC construido en 2 días con dos cuentas de Fable 5 trabajando en paralelo.

## Bitácora de estado (actualizar en cada sync)

**Fase 1 — Cuenta A: COMPLETA ✅**

- Setup: Expo SDK 56 + expo-router (bajado de 57 por compatibilidad con Expo Go; ver nota de dev build abajo), estructura según sección 4.1 (`app/`, `components/`, `constants/`, `lib/queries/`, `supabase/`), `.env.example` listo.
- Sistema de diseño decidido — ver sección 6.1 (paleta torogoz, tipografía, elemento "peana").
- Pantallas 1-3 construidas: Splash (motivo de 3 capas de mapa isométricas), Login/Registro (con tabs, validación, estados de carga/error), Selección de tipo de cuenta (cards Turista/Negocio con ruteo a stubs de Home y Dashboard).
- Seam de auth para Cuenta B: `lib/queries/auth.ts` tiene `signIn`, `signUp`, `setAccountType` mockeados con las firmas ya definidas — Cuenta B solo reemplaza el cuerpo con Supabase real, las pantallas no cambian.

**Fase 1 — Cuenta B: COMPLETA ✅** (proyecto cloud `bvmzrmvrdbfpkdhwazgv`, schema aplicado y verificado end-to-end: signup → trigger de perfil → login → setAccountType → lectura anónima de `places`. `.env` local ya tiene URL + publishable key. Confirm email: resuelto con el trigger de auto-confirmación en `schema.sql`.)

- `supabase/schema.sql` versionado: 8 tablas de la sección 2 (con lat/lng agregados a `events` porque el mock de Cuenta A los usa), RLS en todas, trigger `handle_new_user` que crea la fila de `profiles` al registrarse, y seeds idempotentes (10 lugares reales, 4 eventos, 4 retos).
- `lib/supabase.ts`: cliente con AsyncStorage + auto-refresh de sesión en foreground. Exporta `isSupabaseConfigured`.
- `lib/queries/auth.ts`: `signIn`/`signUp`/`setAccountType` reales con las firmas originales intactas; si no existe `.env`, caen al comportamiento mock (las pantallas de Cuenta A funcionan igual con o sin credenciales).
- Hecho 2026-07-11: proyecto creado en supabase.com, schema + seeds aplicados vía pooler, `.env` local con URL y publishable key (las keys nuevas `sb_publishable_...` funcionan como anon key en supabase-js).

**Fase 2 — Cuenta A & B: COMPLETA ✅**

- **Cuenta A (Frontend):** Home, Ficha de lugar y Mapa 100% integrados y funcionales. El mapa muestra pines interactivos con capas conmutables de Lugares, Negocios y Calor de Actividad.
- **Cuenta B (Backend):** Queries reales conectadas a Supabase. `getTopPlaces` ordena por actividad real de fotos, `activity` calcula el heatmap agrupando fotos reales en celdas de ~1km.
- **Dioramas integrados localmente:** Los archivos del zip `14departamentos.zip` se extrajeron en `assets/dioramas/` y se vinculan estáticamente mediante `constants/dioramas.ts`. El componente `MarcadorMapa` los resuelve de forma local, evitando subir las imágenes a Supabase Storage y optimizando la carga y ancho de banda en Expo Go.
- **Geocoding listo:** `lib/queries/geocoding.ts` resuelto con Nominatim para el onboarding de negocios (Fase 4).
- **Auto-confirmación de Email:** Se agregó el trigger en `supabase/schema.sql` y se documentó para auto-confirmar cuentas al registrarse en desarrollo/demo.

**⚠️ Cambio de flujo de demo (2026-07-11): development build en vez de Expo Go para Android**

- Expo Go en Android ya no incluye API key de Google Maps → el mapa renderizaba negro. Solución aplicada: development build con EAS (`expo-dev-client`, package `com.spotmi.app`, proyecto EAS `spotme` en cuenta `josueduard10`).
- **APK instalado y verificado en dispositivo real — el mapa funciona.** Link del build: https://expo.dev/accounts/josueduard10/projects/spotme/builds (perfil `development`).
- Flujo de trabajo idéntico: `npx expo start` + QR, pero se abre con la app **Spotmi** instalada (no Expo Go). Hot reload normal. En iPhone, Expo Go sigue funcionando (Apple Maps).
- Solo se recompila el APK si cambia algo nativo (nueva librería con código nativo o config de `app.json`). Todo el código JS/TS de las Fases 3-6 se ve sin rebuild. Comando: `npx eas-cli build --profile development --platform android --non-interactive --no-wait` (keystore local en `credentials/`, gitignoreado — no borrar).
- Para la demo: instalar este mismo APK en los 2-3 celulares del equipo + un celular corriendo Metro, o EAS Update si hay tiempo.

**Fase 3 — Cuenta A: COMPLETA ✅ (2026-07-11)** Pivote de creación comunitaria en frontend:

- Pantalla 7b `app/crear-lugar.tsx`: 3 pasos sin fricción (pin central sobre el mapa + "usar mi ubicación" con expo-location → foto obligatoria con expo-image-picker cámara/galería → nombre/categoría/descripción → publicar). Entrada: FAB "+" en el mapa.
- Ficha (7): badge "Nuevo · sin verificar" (acento) / "Verificado por la comunidad" (primario), caja "¿Estuviste aquí?" con contador "X de 3" y botón "Confirmar que existe" (se deshabilita tras confirmar); muestra `coverImageUrl` como portada cuando existe.
- `MarcadorMapa` con 3 estados: oficial (diorama), comunidad sin verificar (foto thumbnail circular + badge "Nuevo"), comunidad verificado (foto + check primario). Capas "Lugares" divididas en **Oficiales** y **Comunidad**; el mapa refetchea al recibir foco (el lugar recién creado aparece al volver).
- `Place` con campos opcionales del pivote + helpers `esComunidad`/`estaVerificado` en `constants/mock.ts`. Call-sites usan `createPlace`/`confirmPlace` de `lib/queries/places.ts` (ya conectados por Cuenta B ✅).
- ⚠️ **expo-image-picker y expo-location son módulos nativos nuevos** + sus config plugins en `app.json` → el APK dev build de Android **sí necesita rebuild** para las pantallas 7b/8 (en iPhone/Expo Go funciona ya). Rebuild lanzado por el usuario el 2026-07-11.
- **Pantalla 8 hecha** (`app/subir-foto.tsx`): cámara/galería + GPS automático (fallback a las coordenadas del lugar si niegan el permiso), llama a `uploadPhoto()` real de B con el destino de la ficha o asociación automática al más cercano. La ficha (7) ahora navega ahí desde "Subir foto" pasando id/tipo/nombre/lat/lng, y muestra galería horizontal "Fotos de la comunidad" vía `getPhotosFor()` con refresh al volver (useFocusEffect). Fase 3 cerrada por completo en frontend.

**Fase 3 — Cuenta B: COMPLETA ✅** (verificada E2E contra Supabase real: crear lugar → foto a Storage → 3 confirmaciones de usuarios distintos → `is_verified=true` automático por trigger; creador no puede autoconfirmar (RLS 42501), doble confirmación bloqueada (unique 23505))

- `createPlace(input)` real en `lib/queries/places.ts`: sube `photoUri` al bucket `uploads` (helper `uploadImage` en `lib/queries/uploads.ts`, usa `expo-file-system/legacy` — nativo ya incluido en el APK, no requiere rebuild), resuelve el **departamento automáticamente por reverse geocoding** (`reverseGeocodeDepartment` en `geocoding.ts`) e inserta con `source='community'`. Error legible si el nombre ya existe.
- `confirmPlace(placeId)` real: inserta en `place_verifications`; el trigger `on_place_verification` (SECURITY DEFINER) recuenta y marca `is_verified` a las 3 — nada de lógica de conteo en el cliente, robusto ante carreras.
- `getPlaces()` ya incluye lugares de comunidad con los campos nuevos (`source`, `createdBy`, `verificationCount`, `isVerified`) mapeados al tipo `Place` extendido.
- Schema migrado en DB real (idempotente): columnas nuevas en `places` (seeds marcados `official`+verificados), tabla `place_verifications`, reto tipo `create_place` (+2 retos seed: Fundador, Cartógrafo comunitario), políticas RLS anti-trampa.

**Fase 4 — Cuenta A & B: COMPLETA ✅** (rutas OSRM en `lib/queries/routes.ts` + `app/ruta.tsx`/`planificar-ruta.tsx`; flujo negocio con `getOwnBusiness`/`createOrUpdateBusiness`/`getBusinessMetrics` + dashboard. Extra fuera de plan: tab "3D Real" con Cesium + Google Photorealistic 3D Tiles en WebView, login con Google.)

**Fase 5 — Cuenta B: COMPLETA ✅ (2026-07-12)** Gamificación consolidada + inteligencia territorial + catálogo ampliado:

- **Catálogo oficial ampliado a 37 lugares cubriendo los 14 departamentos** (antes 10). Seeds idempotentes en `schema.sql`.
- **Buscador**: `searchPlaces()` en `lib/queries/search.ts` — Google **Places API (New)** (verificada activa en la key existente), sesgada a El Salvador, con categoría sugerida para prellenar "Crear lugar"; fallback automático a Nominatim. Cuenta A: montar barra de búsqueda en mapa/crear-lugar.
- **Puntos — UN solo sistema, reglas oficiales**: +25 por foto (`handle_new_upload`), +50 por lugar de comunidad (`handle_new_place`), y los premios de retos los paga ÚNICAMENTE `on_challenge_points` al completarse la fila de `user_challenges`. ⚠️ Hubo doble pago por triggers duplicados de ambas cuentas — ya consolidado y los saldos reconciliados con la regla `RECONCILIACIÓN DE PUNTOS` al final de `schema.sql` (idempotente, recalcula desde los hechos). **No agregar sumas de puntos en ningún otro lado.**
- **Retos**: "Primera postal", "Fundador" y "Cartógrafo comunitario" se completan solos por triggers de DB; `syncChallenges()` en `profile.ts` evalúa y completa los que la DB no puede ver sola ("Cazador de dioramas", "Ruta de las Flores completa") y devuelve los recién completados para la celebración en UI.
- **Panel territorial (pantalla 17)**: `getTerritorialInsight()` en `lib/queries/insights.ts` — cruza uploads × lugares comunidad × negocios por departamento y genera la frase del insight con datos reales (+ tabla `stats` para graficar). `businesses` ganó columna `department` (auto por reverse geocoding al registrar).
- **Capas en el gemelo 3D (rúbrica)**: el tab "3D Real" ahora tiene los chips Lugares/Negocios/Actividad y renderiza las 3 capas en Cesium (pines de negocios azules clickeables → ficha, círculos de actividad por peso). Toggle por postMessage sin recargar el globo.
- Guarda anti-fantasmas: `createPlace` rechaza coordenadas fuera de El Salvador (un emulador en EE.UU. había creado un lugar en San Francisco — borrado).

**Fase 6 — pendiente (pulido y demo):** contenido curado, prueba E2E del recorrido completo en dispositivo, guion de demo. Nota: las capas 3D nuevas son JS puro — llegan por Metro sin rebuild del APK.

**🔄 PIVOTE (2026-07-11): la Fase 3 ahora incluye crear lugares desde cero, no solo subir fotos a lugares existentes.** Ver sección 0 para la justificación completa (esto refuerza el digital twin, no lo diluye) y sección 9 para los prompts actualizados de Cuenta A y Cuenta B. Cambios de modelo de datos: `places` ganó `source`, `created_by`, `verification_count`, `is_verified`; nueva tabla `place_verifications`. Cambios de pantallas: nueva pantalla 7b "Crear lugar nuevo"; pantalla 7 (ficha) gana botón "Confirmar que existe" para lugares sin verificar. Usar los prompts de la sección 9, no los de la sección 8 (esos ya están completados).

## 0. Resumen del producto

**⚡ Pivote decidido (2026-07-11):** el twin ya no depende de un catálogo curado. Los turistas pueden **crear lugares nuevos desde cero** (pin en el mapa + nombre + descripción + foto), no solo fotografiar los ya existentes. Los 8-10 lugares oficiales se quedan como capa "semilla" verificada, pero el crecimiento real del mapa lo hace la comunidad. Esto no es un desvío del digital twin — es la versión más legítima del concepto (ver justificación abajo).

Spotmi es un mapa interactivo (digital twin) de El Salvador donde:

- **Turistas** descubren lugares (oficiales y creados por otros turistas), **crean lugares nuevos que aún no existen en el mapa**, suben fotos, planifican rutas con presupuesto estimado, y ganan recompensas y puntos por explorar, crear y documentar.
- **Negocios / microemprendedores** se registran, fijan su ubicación y suben fotos de su local para ser descubiertos por los turistas.

El "twin" no es un modelo 3D ni un catálogo fijo: es un mapa 2D vivo que la propia comunidad construye, capa por capa, en tiempo real.

### Por qué esto es un digital twin (y no solo un mapa) — y por qué el pivote lo hace más fuerte, no menos

La literatura académica sobre digital twins en turismo distingue dos enfoques. El más común y más débil usa escaneo 3D y GIS para habilitar visitas en VR/AR, donde el twin solo recibe datos del original sin comunicación bilateral, y no captura datos dinámicos del sistema turístico real — es, en esencia, una foto fija bonita. El enfoque que sí califica como digital twin en el sentido estricto es el que aprovecha **fuentes de datos dinámicas — minería de contenido generado por usuarios, sensores, comportamiento real** — para monitorear actividad turística y dar retroalimentación útil a quienes toman decisiones sobre el territorio.

Spotmi con el pivote cae directamente en el segundo enfoque: el mapa no es una lista que alguien decidió de antemano, es un espejo que se actualiza con lo que la gente real está descubriendo, visitando y documentando. Cada lugar nuevo creado por un turista es un dato fresco entrando al twin — el mapa literalmente cambia de forma con el comportamiento real de la gente, que es la definición central de un digital twin: una representación virtual data-driven que integra datos en tiempo real para reflejar el estado de su contraparte física.

**Las capas togglables sobre el mismo mapa:**

1. **Capa de lugares oficiales** (semilla verificada, los 8-10 precargados)
2. **Capa de lugares creados por la comunidad** (crece con cada turista que descubre algo nuevo — el corazón del pivote)
3. **Capa de negocios/microemprendedores** (crece con cada registro)
4. **Capa de actividad de turistas** (heatmap de fotos subidas — dónde está la gente realmente)
5. **Capa de eventos** (temporal, por fecha)
6. **Capa de retos ambientales/sostenibilidad** (dónde se están completando retos de reciclaje, etc.)

El insight cruzado que pedía el framework original (Contexto/Oportunidad/Mejora) ahora es más rico: se puede leer, por ejemplo, dónde la comunidad está creando lugares nuevos que el sector oficial de turismo ni siquiera tenía mapeados — eso es inteligencia territorial real generada de abajo hacia arriba, no simulada.

## 1. Stack técnico

| Capa                                  | Herramienta                                                                  | Por qué                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontend                              | Expo (React Native)                                                          | App móvil real, instalable en celular físico vía Expo Go (QR) para la demo, sin pelear con build nativo en 2 días |
| Navegación                            | expo-router                                                                  | Sistema de rutas por archivos, rápido de armar el flujo de 16 pantallas                                           |
| Mapa                                  | react-native-maps (Apple/Google Maps)                                        | Mapbox nativo no corre en Expo Go y la demo depende del QR; react-native-maps sí, con capas y pines custom        |
| Geolocalización                       | expo-location                                                                | Permisos y ubicación del turista para geotag de fotos y cálculo de rutas                                          |
| Cámara / galería                      | expo-image-picker                                                            | Subir foto desde cámara o galería                                                                                 |
| Geocoding                             | Nominatim (OpenStreetMap)                                                    | Dirección de negocio → lat/lng. Gratis, sin API key. Límite 1 req/s + header User-Agent obligatorio               |
| Rutas                                 | OSRM público (router.project-osrm.org)                                       | Ruta multi-parada con geometría GeoJSON, duración y distancia. Gratis, sin API key. Verificado para El Salvador   |
| Navegación externa                    | Linking de Expo a Google Maps                                                | `Linking.openURL('google.navigation:q={lat},{lng}')` o deep link universal a Maps                                 |
| Backend/DB                            | Supabase (Postgres + Auth + Storage)                                         | Todo en uno, sin backend custom, SDK oficial de JS funciona igual en Expo                                         |
| Imágenes placeholder de lugares       | Modelo de generación de imágenes (tipo Nano Banana / Gemini 2.5 Flash Image) | Generar imagen representativa por punto turístico mientras no haya foto real                                      |
| Build/preview                         | Expo Go + EAS Build (opcional)                                               | Expo Go para demo instantánea por QR; EAS solo si da tiempo de generar un .apk/.ipa real                          |
| Notificaciones (si alcanza el tiempo) | expo-notifications                                                           | Opcional, no bloquea el MVP                                                                                       |

### Variables de entorno necesarias

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_IMAGE_GEN_API_KEY=   # si se usa generación de imágenes por API
```

(Nominatim y OSRM no necesitan API key — se eliminó `EXPO_PUBLIC_MAPBOX_TOKEN`.)

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

-- lugares turísticos (oficiales Y creados por la comunidad)
places (
  id uuid PK,
  name text,
  department text,
  description text,
  lat float,
  lng float,
  category text,          -- naturaleza, cultura, gastronomía, aventura
  cover_image_url text,   -- foto real, si existe
  map_icon_url text,      -- diorama isométrico generado (solo lugares oficiales, ver sección 6)
  is_generated_image boolean default false,
  source text check (source in ('official','community')) default 'community',
  created_by uuid references profiles(id),  -- null si es oficial (seed)
  verification_count int default 0,          -- cuántos otros usuarios confirmaron el lugar
  is_verified boolean default false,          -- true automáticamente al llegar a 3 confirmaciones
  created_at timestamp default now()
)

-- confirmaciones de lugares creados por la comunidad (evita que un mismo usuario confirme 2 veces)
place_verifications (
  id uuid PK,
  place_id uuid references places(id),
  user_id uuid references profiles(id),
  created_at timestamp default now(),
  unique (place_id, user_id)
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
  type text  -- 'upload_photo','visit_places','environmental','create_place'
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

**Turista** 4. Onboarding turista (permisos de ubicación + selección de intereses) 5. Home (CTA + mini-mapa, Top 5 lugares, Eventos próximos) 6. Mapa full (departamentos expandibles, **selector de capas togglables**: Lugares oficiales / Lugares de la comunidad / Negocios / Actividad de turistas / Eventos / Retos ambientales — este selector es el corazón del digital twin; botón flotante "+" para crear lugar) 7. Ficha de lugar o negocio (fotos, descripción, botón "Cómo llegar", botón "Subir foto"; si es lugar de comunidad sin verificar: botón "Confirmar que existe" + badge "Nuevo, sin verificar") 7b. **Crear lugar nuevo** — el turista suelta un pin en el mapa (o usa su ubicación actual), completa nombre, categoría, descripción corta y una foto obligatoria; se publica de inmediato como lugar de comunidad "sin verificar" 8. Subir foto (cámara/galería + geolocalización automática) 9. Planificar ruta (selección múltiple de lugares en el mapa, oficiales o de comunidad) 10. Ruta generada (trazado, orden sugerido, tiempo, presupuesto, botón "Iniciar navegación") 11. Retos y recompensas (lista de retos activos + catálogo canjeable; incluye retos de "crear lugar" y "explorador") 12. Perfil turista (fotos, puntos, insignias —incluye insignia "Explorador" por lugares creados—, historial) 13. Eventos (lista + detalle) 17. **Panel de inteligencia territorial** — accesible desde el mapa o el perfil, cruza al menos 2 capas de datos y muestra un insight en texto plano, ej: "Se crearon 5 lugares nuevos esta semana en Chalatenango, una zona sin negocios registrados — oportunidad para nuevos emprendedores." Esta es la pantalla que demuestra ante el jurado que el twin genera valor real, no solo se ve bonito.

**Negocio** 14. Onboarding negocio (datos del negocio + ubicación en mapa) 15. Dashboard negocio (vista pública + métricas simples: vistas, interacciones) 16. Editar perfil de negocio (fotos, horario, descripción, pin arrastrable)

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

_Done cuando:_ login funcional conecta con Supabase Auth real, y `places` tiene datos cargados.

### Día 1 — Tarde (Fase 2: Descubrimiento)

**Cuenta A:** Home (pantalla 5) con Top 5 y eventos, pantalla de mapa full (6) integrando Mapbox **con el selector de capas togglables** (Lugares/Negocios como mínimo en esta fase), ficha de lugar (7).
**Cuenta B:** Integrar Mapbox GL con capas de lugares/negocios reales desde Supabase (cada capa como fuente de datos independiente que se puede mostrar/ocultar), subir los íconos diorama ya generados a Supabase Storage y vincular cada URL en `places.map_icon_url`, endpoint de geocoding para negocios.

_Done cuando:_ el mapa muestra pines reales desde la base de datos, se pueden togglear al menos 2 capas, y cada pin abre su ficha con datos reales.

### Día 1 — Noche (Fase 3: Creación comunitaria de lugares + contenido generado por usuario)

**Cuenta A:** Pantalla "Crear lugar nuevo" (7b): soltar pin en el mapa o usar ubicación actual, formulario (nombre, categoría, descripción, foto obligatoria), publicación inmediata como lugar de comunidad sin verificar. Pantalla de subir foto (8) para lugares ya existentes. Botón "Confirmar que existe" en la ficha de lugares de comunidad sin verificar (7). Badges visuales "Nuevo" vs. verificado en los pines (sección 6.2).
**Cuenta B:** `createPlace()` en `lib/queries/places.ts` (inserta en `places` con `source='community'`, `created_by`, `is_verified=false`). `confirmPlace()` que inserta en `place_verifications` (respetando el unique constraint) y actualiza `verification_count`, marcando `is_verified=true` al llegar a 3. Storage de Supabase para fotos, geolocalización automática, lógica de asociar foto subida al lugar más cercano cuando no se está creando uno nuevo.

_Done cuando:_ un turista puede crear un lugar nuevo desde cero, aparece de inmediato en el mapa de otro usuario con el badge "Nuevo", y al recibir 3 confirmaciones distintas pasa a verificado automáticamente.

### Día 2 — Mañana (Fase 4: Planificación y negocio)

**Cuenta A:** Pantallas 9-10 (planificar ruta, ruta generada con botón de navegación externa), pantallas 14-16 (flujo completo de negocio).
**Cuenta B:** Integrar Directions API de Mapbox para calcular orden/tiempo/distancia de la ruta, lógica de presupuesto estimado (simple: costo fijo o rango por categoría de lugar), endpoint para que negocio guarde su ubicación vía geocoding.

_Done cuando:_ seleccionar 3 lugares en el mapa genera una ruta trazada con tiempo y presupuesto, y un negocio puede registrarse y aparecer en el mapa.

### Día 2 — Mediodía (Fase 5: Gamificación + inteligencia territorial)

**Cuenta A:** Pantallas 11-12 (retos y recompensas, perfil con puntos e insignias —incluye insignia "Explorador" por lugares creados—), pantalla 17 (panel de inteligencia territorial) y las capas restantes del selector de mapa (Actividad de turistas como heatmap de `uploads`, Eventos, Retos ambientales).
**Cuenta B:** Lógica de asignación de puntos (crear lugar = X puntos, subir foto = Y puntos, completar reto = Z puntos, lugar creado llega a verificado = puntos extra para el creador), tabla `user_challenges` funcional, query que cruce 2 capas (ej. lugares de comunidad creados agrupados por departamento vs. conteo de `businesses` por departamento) para alimentar el panel de insights con un dato real, no inventado.

_Done cuando:_ subir una foto o completar un reto suma puntos visibles en el perfil, y el panel de inteligencia territorial muestra al menos un insight generado con datos reales cruzando 2 capas.

### Día 2 — Tarde (Fase 6: Pulido y demo)

**Ambas cuentas juntas:** revisar consistencia visual, cargar contenido real/curado para los 8-10 lugares (fotos, descripciones), pruebas de extremo a extremo del flujo completo (registro → mapa → subir foto → planificar ruta → ver puntos), preparar guion de demo en vivo, publicar con `expo publish` o dejar el QR de Expo Go listo en 2-3 celulares del equipo por si falla el wifi del venue.

_Done cuando:_ se puede hacer el recorrido completo de la demo sin errores, en un dispositivo real.

## 6. Estilo visual de los íconos de mapa (dioramas isométricos)

Cada lugar turístico se representa en el mapa con un **ícono diorama en 3D low-poly**, no con una foto plana. Referencia: miniatura del Monumento al Divino Salvador del Mundo — figura central estilizada sobre una base circular tipo "peana de exhibición", con vegetación low-poly alrededor y una placa con el nombre del lugar. Este es el estándar visual para los ~8-10 lugares del MVP, y debe sentirse como una colección coherente de piezas de museo/coleccionable, no como ilustraciones sueltas de estilos distintos.

**Estado: ya generados.** El equipo generó estos íconos fuera del flujo de Fable (no es una tarea pendiente de ninguna cuenta). Lo que queda es solo **carga y vinculación**: subir los archivos a Supabase Storage y guardar cada URL en `places.map_icon_url` (tarea de Cuenta B, ver Fase 2). Las reglas de consistencia y el template de prompt quedan documentados abajo como referencia, por si hace falta generar 1-2 íconos adicionales sobre la marcha.

**Reglas de consistencia (aplican a los 8-10 lugares):**

- Ángulo de cámara isométrico, siempre el mismo (3/4, ligeramente elevado).
- Base circular o elíptica de madera clara, con placa de texto en la parte frontal con el nombre del lugar.
- Estilo low-poly geométrico (facetas visibles, sin texturas fotorrealistas).
- Paleta de colores consistente entre piezas: tonos tierra/piedra para estructuras, verdes para vegetación, fondo blanco/transparente.
- Un solo elemento central protagonista por lugar (el monumento, la iglesia, el volcán, el lago, etc.), sin saturar de detalles secundarios.
- Fondo blanco puro o transparente (para que se vea limpio como marcador de mapa).

**Template de prompt usado** (referencia, uno por lugar):

```
Low-poly isometric 3D diorama miniature of {NOMBRE_DEL_LUGAR}, {DEPARTAMENTO}, El Salvador.
{ELEMENTO_CENTRAL_DESCRIPCIÓN} as the main centerpiece, geometric faceted low-poly style,
circular light wood display base, small nameplate on the front reading "{NOMBRE_DEL_LUGAR}",
surrounded by simplified low-poly trees/vegetation matching the landscape,
soft studio lighting, clean white background, collectible figurine aesthetic,
consistent art style across a series, 3/4 isometric camera angle.
```

### 6.1 Sistema de diseño (decidido por Cuenta A en Fase 1)

Vive en `constants/theme.ts`. No renegociar esto en fases futuras salvo que algo no funcione — es la identidad visual ya construida.

- **Paleta "torogoz"** (ave nacional de El Salvador): turquesa `#0E9AA3` como primario, tierra `#C75B39` como acento, verde selva `#152A20` para fondos oscuros, crema y madera como neutros.
- **Tipografía:** Fraunces para titulares (con aire editorial/museo, conecta con la estética de los dioramas), Figtree para cuerpo de texto.
- **Elemento firma — la "peana":** botones y cards llevan una base inferior sólida, como pequeños pedestales de exhibición, en eco directo a los dioramas del mapa. Mantener este detalle en todo componente nuevo para que la UI y los íconos del mapa se sientan como el mismo universo visual.

### 6.2 Pines de comunidad vs. pines oficiales (nuevo por el pivote)

Los dioramas de arriba solo existen para los 8-10 lugares oficiales — no se genera un diorama por cada lugar que cree un turista, sería inviable en el tiempo del hackathon. Para lugares de comunidad:

- El pin usa **la primera foto que subió el creador** como thumbnail circular (con un borde delgado en el turquesa primario), no un diorama.
- Mientras `is_verified = false`: el pin lleva un badge pequeño "Nuevo" en tierra `#C75B39`.
- Al llegar a 3 confirmaciones (`verification_count >= 3` vía `place_verifications`), `is_verified` pasa a `true` y el badge cambia a un check turquesa — visualmente comunica "esto ya lo confirmó la comunidad" sin necesitar moderación manual de nadie del equipo durante la demo.
- Esta distinción (diorama = oficial/curado, foto de usuario = comunidad/emergente) es también parte de la narrativa del pitch: se ve a simple vista qué parte del mapa es la semilla y qué parte está creciendo en vivo.

## 7. Criterios de éxito del MVP (checklist final)

- [ ] Registro/login funcional (turista y negocio)
- [ ] Mapa muestra al menos 8 lugares oficiales reales por departamento
- [ ] Un turista puede crear un lugar nuevo desde cero (pin + nombre + descripción + foto) y aparece de inmediato en el mapa de otros usuarios
- [ ] Existe un mecanismo de confianza comunitaria simple (confirmaciones que verifican un lugar de comunidad)
- [ ] Ficha de lugar muestra info + fotos (reales o generadas)
- [ ] Turista puede subir foto geolocalizada
- [ ] Negocio puede registrar su ubicación y aparecer en el mapa
- [ ] Planificar ruta genera trazado + tiempo + presupuesto estimado
- [ ] Botón "cómo llegar" abre navegación externa (Google Maps)
- [ ] Sistema de puntos/retos suma puntos visibles en perfil, incluyendo puntos por crear lugares
- [ ] El mapa tiene al menos 4 capas togglables (lugares oficiales, lugares de comunidad, negocios, actividad de turistas)
- [ ] El panel de inteligencia territorial muestra un insight real cruzando al menos 2 capas
- [x] App corre en celular real para la demo (Android: APK dev build de EAS + Metro; iPhone: Expo Go vía QR)
- [ ] Los 8-10 lugares oficiales tienen su ícono diorama generado y consistente en el mapa

## 8. Prompts de Fase 1 (histórico — ya completados, se dejan solo de referencia)

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
ahí está el modelo de datos completo, las fases, el estilo visual de los
íconos de mapa y la bitácora de estado al inicio del archivo.

Este es un repo único y compartido con otra persona/sesión que ya construyó
el frontend de la Fase 1 (Cuenta A) — no crees un repo aparte, clona el
existente. Trabajas dentro de `lib/supabase.ts`, `lib/queries/` y
`supabase/schema.sql` (sección 4.1 del CLAUDE.md tiene la estructura completa).
El proyecto de Supabase se crea en supabase.com (no es código del repo), pero
versiona el schema SQL dentro de `supabase/schema.sql` para que quede
documentado. Haz commit y push seguido para que Cuenta A pueda importar tus
queries en cuanto existan.

Nota importante: Cuenta A ya dejó `lib/queries/auth.ts` con `signIn`, `signUp`
y `setAccountType` mockeados con las firmas ya definidas — tu trabajo de auth
es reemplazar el cuerpo de esas funciones con llamadas reales a Supabase,
sin cambiar la firma, para no romper las pantallas ya construidas.

Los íconos diorama de los lugares (sección 6) ya fueron generados por el
equipo fuera de este flujo — no los generes tú. Cuando te los compartan,
tu tarea es solo subirlos a Supabase Storage y guardar la URL en
`places.map_icon_url`.

Tu trabajo en esta sesión es la Fase 1 (Día 1 mañana):
1. Configura un proyecto Supabase: crea todas las tablas definidas en la
   sección 2 del CLAUDE.md (profiles, places, businesses, uploads, challenges,
   user_challenges, events, planned_routes).
2. Configura Supabase Auth (email/password como mínimo) y conecta
   `lib/queries/auth.ts` con las llamadas reales.
3. Carga manualmente 8-10 lugares turísticos reales de El Salvador en la tabla
   `places`, uno por departamento relevante, con nombre, departamento,
   descripción corta, categoría y coordenadas lat/lng reales.

No construyas pantallas de frontend. Al terminar, resume el estado de las
tablas y comparte las credenciales/config que Cuenta A necesitará (URL y
anon key de Supabase) para conectar en la Fase 2.
```

Cuando ambas cuentas terminen la Fase 1, sincronicen: Cuenta A conecta login real con las credenciales de Supabase que generó Cuenta B, y arrancan la Fase 2 juntas.

## 9. Prompts para arrancar Fase 3 (usar estos AHORA — Fases 1 y 2 ya están completas)

### Prompt para Cuenta A (Frontend / UX)

```
Estás construyendo el frontend de Spotmi, un digital twin turístico de El Salvador,
en Expo (React Native). Lee el CLAUDE.md completo, especialmente la Bitácora de
estado, la sección 0 (el pivote: los turistas ahora pueden crear lugares nuevos,
no solo fotografiar los existentes) y la sección 6.2 (cómo se ven los pines de
comunidad vs. oficiales).

Las Fases 1 y 2 ya están completas: hay auth real, mapa con Mapbox/react-native-maps
funcionando con capas togglables, y dioramas de los 8-10 lugares oficiales cargados.
Este pivote es la Fase 3.

Tu trabajo en esta sesión:
1. Pantalla "Crear lugar nuevo" (7b del mapa de pantallas): el usuario suelta un pin
   en el mapa full o usa su ubicación actual, completa un formulario corto (nombre,
   categoría, descripción, foto obligatoria vía expo-image-picker) y publica. Debe
   sentirse rápido — máximo 3 pasos, sin fricción, porque la gamificación depende de
   que sea fácil crear.
2. Actualiza la ficha de lugar (pantalla 7): si el lugar es de comunidad y no está
   verificado, muestra el badge "Nuevo" y un botón "Confirmar que existe" visible.
3. Actualiza los pines del mapa (componente de marcador) para distinguir oficial
   (diorama) vs. comunidad no verificado (foto + badge tierra) vs. comunidad
   verificado (foto + check turquesa) — sección 6.2 tiene el detalle exacto.
4. Usa mocks para createPlace/confirmPlace si Cuenta B aún no las tiene listas;
   deja los call-sites claros para que Cuenta B solo reemplace el cuerpo.

No toques lib/queries/ más allá de importar funciones que ya existan o dejar mocks
claramente marcados como TODO. Al terminar, resume qué construiste y qué necesitas
de Cuenta B para que quede 100% real.
```

### Prompt para Cuenta B (Backend / Datos / Mapa)

```
Estás construyendo el backend de Spotmi, un digital twin turístico de El Salvador,
sobre Supabase. Lee el CLAUDE.md completo, especialmente la Bitácora de estado, la
sección 0 (el pivote: los turistas ahora pueden crear lugares nuevos) y la sección 2
(el modelo de datos ya tiene los campos nuevos: places.source, places.created_by,
places.verification_count, places.is_verified, y la tabla place_verifications).

Las Fases 1 y 2 ya están completas. Este pivote es la Fase 3.

Tu trabajo en esta sesión:
1. Actualiza supabase/schema.sql con los campos nuevos de `places` y la tabla
   `place_verifications` (con el unique constraint place_id+user_id para que un
   mismo usuario no pueda confirmar el mismo lugar dos veces).
2. Implementa `createPlace()` en lib/queries/places.ts: inserta en `places` con
   source='community', created_by=usuario actual, is_verified=false.
3. Implementa `confirmPlace()`: inserta en `place_verifications`, incrementa
   `verification_count` en `places`, y marca `is_verified=true` automáticamente
   al llegar a 3 confirmaciones (hazlo con un trigger de Postgres si es más
   robusto que hacerlo desde el cliente).
4. Actualiza las RLS policies de `places` para permitir insert a cualquier
   usuario autenticado, pero mantener las reglas de lectura abiertas.
5. Asegúrate de que la query que alimenta el mapa (la que ya existe de Fase 2)
   incluya ahora también los lugares de comunidad, no solo los oficiales.

No construyas pantallas de frontend. Al terminar, resume las funciones nuevas
disponibles en lib/queries/places.ts para que Cuenta A las conecte.
```
