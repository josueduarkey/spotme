# Spotmi — El Espejo Turístico y Territorial de El Salvador 🇸🇻

Spotmi es una aplicación móvil nativa construida con **Expo (React Native)** y **Supabase** que funciona como un **Digital Twin (Gemelo Digital) interactivo** del territorio de El Salvador. 

El proyecto permite a los turistas descubrir y registrar lugares, a los negocios locales posicionarse en el mapa, y al ecosistema en general beneficiarse de la inteligencia territorial en tiempo real generada a través de datos dinámicos comunitarios (UGC).

---

## Resumen Ejecutivo

### ¿Qué es Spotmi?
Spotmi es una representación viva y dinámica del territorio salvadoreño que combina mapas nativos interactivos, geolocalización en tiempo real y dinámicas de gamificación comunitaria. No es solo un catálogo de turismo: es una plataforma que captura y procesa las interacciones entre turistas y el territorio físico en tiempo real.

### El Problema que Resuelve
El turismo y el desarrollo económico local en El Salvador sufren de asimetría de información. Muchos rincones y microemprendimientos no aparecen en mapas oficiales ni en directorios comerciales. Al mismo tiempo, los promotores y tomadores de decisiones carecen de datos agregados en tiempo real sobre el flujo real y comportamiento geográfico de los viajeros.

### Nuestra Solución
Spotmi digitaliza el territorio de abajo hacia arriba. A través de dinámicas donde los propios usuarios mapean, fotografían y verifican la existencia de lugares comunitarios, Spotmi crea un gemelo digital vivo. El mapa se actualiza constantemente y genera insights territoriales prácticos sobre afluencia de personas, brechas de mercado y oportunidades de negocio.

---

## Propuesta de Valor

### 🎒 Para Turistas
* **Descubrimiento Real:** Acceso a una capa de lugares oficiales curados e interactivos y una capa emergente de lugares comunitarios descubiertos por otros turistas.
* **Gamificación y Recompensas:** Gana puntos e insignias por explorar, documentar con fotos geolocalizadas y verificar nuevos puntos turísticos.
* **Planificación Inteligente:** Rutas multi-paradas con estimación de duración y presupuestos de viaje.

### 🏪 Para Negocios y Emprendedores
* **Visibilidad Sin Costo:** Registra la ubicación física de tu negocio, horarios y contacto para aparecer en el mapa en la ruta de los turistas.
* **Métricas Directas:** Acceso a un panel de control con métricas simples de visualizaciones e interacciones en la plataforma.
* **Análisis de Oportunidades:** Identificación de zonas con alto tráfico de turistas pero baja concentración de servicios.

### 🏛️ Para Instituciones y Gobiernos
* **Monitoreo de Afluencia:** Visualización en tiempo real de heatmaps de actividad basados en el contenido real que suben los turistas.
* **Catalogación Participativa:** Un inventario turístico del país que crece de forma orgánica y autogestionada por la propia comunidad.
* **Planificación del Territorio:** Datos limpios y estructurados sobre dónde se está concentrando la actividad para planificar infraestructuras y seguridad.

### 🇸🇻 Para el País
* Fomento del turismo rural y descentralizado, visibilizando departamentos y destinos que no cuentan con presupuestos de marketing tradicionales.

---

## ¿Por qué es un Digital Twin?

A diferencia de los gemelos digitales tradicionales basados en escaneos 3D estáticos, Spotmi es un **gemelo digital de comportamiento y datos (Data-Driven Digital Twin)**. 

El sistema vincula bidireccionalmente el territorio físico con su modelo digital:

1. **El Mundo Físico** alimenta la plataforma a través de las coordenadas GPS del turista, las fotos tomadas en el lugar y el registro físico del negocio.
2. **El Modelo Digital** procesa estos datos en tiempo real mediante triggers y agregaciones SQL (agrupando fotos en celdas de calor de 1 km, procesando confirmaciones de existencia).
3. **El Estado del Mapa cambia dinámicamente**: los pins cambian de apariencia (de *"Nuevo"* a *"Verificado"*), la densidad del mapa de calor se expande y se generan analíticas en el panel.
4. **Se Generan Insights territoriales útiles** para que turistas, emprendedores y gestores tomen mejores decisiones en el territorio real.

### Diagrama de Flujo del Gemelo Digital

```
         MUNDO FÍSICO
    ┌──────────────────────┐
    │ Turistas • Negocios  │
    │  Eventos • Fotos     │
    │     Ubicaciones      │
    └──────────┬───────────┘
               │
               │ Actualizaciones continuas (UGC)
               ▼
    ┌──────────────────────┐
    │     DIGITAL TWIN     │
    │ ──────────────────── │
    │ Mapa Vivo • Heatmaps │
    │  Capas de Datos      │
    │  Verificación Real   │
    └──────────┬───────────┘
               │
               │ Territorial Insights (Analítica)
               ▼
    ┌──────────────────────┐
    │  TOMA DE DECISIONES  │
    │ ──────────────────── │
    │ Turistas • Empresas  │
    │      Gobiernos       │
    └──────────────────────┘
```

---

## ¿Cómo funciona Spotmi?

El ciclo de vida del gemelo digital y la validación de la información funciona mediante un flujo comunitario autogestionado:

```
   [ Turista ]
        │
        ▼
 ┌──────────────┐
 │ Descubre un  │
 │ lugar físico │
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ Crea el punto│  ◄── (Asigna coordenadas del pin o GPS local)
 │ en el mapa   │
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ Sube foto de │  ◄── (Se almacena en Supabase Storage)
 │  portada     │
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ Comunidad    │  ◄── (Trigger impide votos duplicados o propios)
 │ verifica (3x)│
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ El Twin se   │  ◄── (El pin pasa a estado "Verificado")
 │  actualiza   │
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │ Se generan   │  ◄── (Deduce departamentos y agrupa insights)
 │  insights    │
 └──────────────┘
```

---

## Arquitectura del Sistema

Spotmi está diseñado para funcionar de manera modular, desacoplando el renderizado de la UI de las consultas de base de datos a través de una capa de servicios unificada (`lib/queries`).

```
      ┌─────────────────────────┐
      │  React Native (Expo)    │
      └────────────┬────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
  ┌─────────────┐     ┌─────────────┐
  │  Supabase   │     │  Servicios  │
  │    Auth     │     │  Externos   │
  └──────┬──────┘     └──────┬──────┘
         │                   │
         ▼                   ▼
  ┌─────────────┐     ┌─────────────┐
  │ PostgreSQL  │     │ Nominatim   │
  │ (Database)  │     │ Geocoding   │
  └──────┬──────┘     └──────┬──────┘
         │                   │
         ▼                   ▼
  ┌─────────────┐     ┌─────────────┐
  │  Supabase   │     │  OSRM       │
  │   Storage   │     │  Routing    │
  └─────────────┘     └─────────────┘
         │
         ▼
  ┌─────────────┐
  │ RN Maps +   │
  │  CartoDB    │
  └─────────────┘
```

### Flujo de Datos Técnico
1. **Frontend (Expo):** Renderiza el mapa y los componentes nativos. Envía las coordenadas del usuario y las URIs de los archivos multimedia locales.
2. **Supabase Auth & Storage:** Autentica a los usuarios y aloja las fotos de portadas de lugares y fotos subidas (UGC).
3. **Base de Datos (PostgreSQL):** Ejecuta triggers para validar transacciones, manejar contadores de verificación RLS y evitar votos duplicados.
4. **Geocoding (Nominatim):** Traduce coordenadas GPS a nombres de departamentos y municipios de El Salvador para indexar los datos sin requerir API keys de terceros.
5. **Rutas (OSRM):** Traza rutas multiparada y calcula distancias y duraciones sin costo de uso.
6. **Mapa (React Native Maps & CartoDB):** Renderiza el mapa y dibuja encima una capa de tiles personalizados (CartoDB Voyager) y los marcadores nativos.

---

## Tecnologías Utilizadas

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | React Native (Expo SDK 56) | Aplicación móvil nativa multiplataforma. |
| **Navegación** | expo-router | Navegación basada en carpetas y archivos. |
| **Base de Datos** | Supabase (PostgreSQL) | Gestión de datos, triggers y autenticación de usuarios. |
| **Almacenamiento** | Supabase Storage | buckets públicos para iconos de mapas y fotos UGC. |
| **Mapa** | react-native-maps | Renderizador de mapas nativo con pines personalizados. |
| **Capas de Mapa** | CartoDB Voyager Tiles | Capa de diseño estilizada y rápida. |
| **Ubicación** | expo-location | Obtención de permisos y coordenadas GPS del turista. |
| **Cámara / Archivos** | expo-image-picker | Selección e importación de fotos en el dispositivo. |
| **Rutas** | OSRM (Open Source Routing Machine) | Trazado de rutas en carretera de El Salvador. |
| **Geocoding** | Nominatim (OpenStreetMap) | Búsqueda de direcciones y geocodificación inversa. |
| **Build & Deploy** | EAS (Expo Application Services) | Creación de compilaciones nativas de desarrollo (APK). |

---

## Modelo de Datos (Esquema de Supabase)

El esquema de base de datos implementa restricciones RLS (Row Level Security) y triggers automatizados para garantizar la coherencia de la información:

```sql
-- usuarios (extiende auth.users de Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  account_type text check (account_type in ('turista', 'negocio')),
  avatar_url text,
  points int not null default 0,
  created_at timestamptz not null default now()
);

-- lugares turísticos (oficiales y de la comunidad)
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  department text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  category text check (category in ('naturaleza', 'cultura', 'gastronomia', 'aventura')),
  cover_image_url text,
  map_icon_url text,
  is_generated_image boolean not null default false,
  source text check (source in ('official', 'community')) default 'community',
  created_by uuid references public.profiles(id),
  verification_count int not null default 0,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- confirmaciones de existencia de lugares comunitarios
create table public.place_verifications (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

-- negocios / comercios
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  category text,
  description text,
  lat double precision,
  lng double precision,
  address text,
  schedule text,
  contact text,
  created_at timestamptz not null default now()
);

-- fotos subidas por los turistas
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('place', 'business')),
  target_id uuid not null,
  image_url text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- retos de gamificación
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text,
  points_reward int not null default 0,
  type text check (type in ('upload_photo', 'visit_places', 'environmental', 'create_place'))
);

-- retos completados por usuario
create table public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

-- eventos del territorio
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text,
  department text,
  date timestamptz not null,
  lat double precision,
  lng double precision,
  cover_image_url text
);

-- rutas planificadas
create table public.planned_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_ids uuid[] not null default '{}',
  estimated_budget numeric,
  estimated_duration_minutes int,
  created_at timestamptz not null default now()
);
```

---

## Estado Actual del Proyecto (Fin de la Fase 3)

La aplicación tiene implementada y verificada de extremo a extremo la lógica de **autenticación real, descubrimiento en mapa, creación comunitaria y carga de fotos**:

* **Autenticación Directa:** Registro e inicio de sesión integrados con Supabase. Soporta direccionamiento automático según tipo de cuenta.
* **Mapa de 4 Capas Conmutables:** Renderiza pines dinámicos en tiempo real con filtros independientes para **Lugares Oficiales**, **Lugares de la Comunidad**, **Negocios locales** y **Mapa de Calor de Actividad**.
* **Dioramas Locales:** Los iconos 3D low-poly de los lugares oficiales se resuelven y cargan localmente, ahorrando ancho de banda y ofreciendo fluidez de navegación.
* **Creación de Puntos Comunitarios:** Un usuario puede soltar un pin en el mapa, subir una foto de portada y publicar el lugar. El sistema deduce el departamento automáticamente por reverse-geocoding y lo publica como *sin verificar*.
* **Verificación Colectiva Real:** Otros usuarios pueden pulsar *"Confirmar que existe"* en la ficha del lugar. El trigger en la base de datos restringe duplicados y autovotos, y actualiza el pin a *"Verificado por la comunidad"* de forma inmediata al llegar a 3 confirmaciones.
* **Subida y Vinculación de Fotos (UGC):** Los turistas pueden tomar fotos y publicarlas. La función `uploadPhoto()` en el backend determina automáticamente el lugar o comercio más cercano por GPS y lo asocia al punto.

### Tabla de Funcionalidades

| Funcionalidad | Estado | Fase |
|---|---|---|
| Registro e Inicio de Sesión | ✅ Completado | Fase 1 |
| Selección de tipo de cuenta | ✅ Completado | Fase 1 |
| Mapa Interactivo (pines personalizados) | ✅ Completado | Fase 2 |
| Capas de mapa conmutables (Lugares/Negocios) | ✅ Completado | Fase 2 |
| Integración de dioramas locales | ✅ Completado | Fase 2 |
| Heatmap de Actividad (Celda 1km) | ✅ Completado | Fase 2 |
| Creación de lugares comunitarios (Cámara/GPS) | ✅ Completado | Fase 3 |
| Asignación automática de departamento (Geocoding) | ✅ Completado | Fase 3 |
| Sistema de Verificación Comunitaria (3x votos) | ✅ Completado | Fase 3 |
| Subida de fotos UGC a Storage | ✅ Completado | Fase 3 |
| Asociación automática de fotos al lugar más cercano | ✅ Completado | Fase 3 |
| Gemelo Digital 3D Real (Google Earth Tiles + Cesium) | ✅ Completado | Fase 3 |
| Planeación de rutas multiparadas (OSRM) | ✅ Completado | Fase 4 |
| Registro de ubicación y datos de negocio | 🚧 Pendiente | Fase 4 |
| Dashboard de métricas del comercio | 🚧 Pendiente | Fase 4 |
| Gamificación (Retos, Puntos y Perfil) | 🚧 Pendiente | Fase 5 |
| Panel de Inteligencia Territorial (Insights) | 🚧 Pendiente | Fase 5 |
| Pulido final y preparación de demo | 🚧 Pendiente | Fase 6 |

---

## Roadmap del Proyecto

### Fase 1: Fundaciones (Completada)
* Proyecto de Expo con `expo-router` integrado.
* Sistema de diseño "Torogoz" implementado ([constants/theme.ts](file:///Users/josuegarcia/code/dev/spotme/constants/theme.ts)).
* Pantallas base: Splash, Login/Registro, Selección de Cuenta.

### Fase 2: Descubrimiento (Completada)
* Integración de `react-native-maps` y customización de marcadores.
* Queries reales para lugares, negocios y eventos próximos.
* Lógica del heatmap basada en densidad de uploads de fotos.
* Integración local de dioramas.

### Fase 3: Creación Comunitaria y UGC (Completada)
* Implementación de la pantalla de creación comunitaria de lugares ([app/crear-lugar.tsx](file:///Users/josuegarcia/code/dev/spotme/app/crear-lugar.tsx)).
* Integración de `expo-image-picker` y `expo-location` para captura multimedia y GPS.
* Triggers SQL en Supabase para validación y auto-verificación comunitaria de lugares.
* Subida de fotos asociadas al punto más cercano ([lib/queries/uploads.ts](file:///Users/josuegarcia/code/dev/spotme/lib/queries/uploads.ts)).

### Fase 4: Planificación y Negocio (Siguiente paso)
* Trazado de rutas multiparada en el mapa con OSRM.
* Algoritmo de cálculo de presupuestos estimados.
* Formulario e integración de negocios reales en Supabase.
* Dashboard de métricas para dueños de comercios.

### Fase 5: Gamificación e Inteligencia Territorial (Planificado)
* Historial de retos, canje de recompensas y perfil del turista con puntajes reales.
* Panel de Inteligencia Territorial (Consultas SQL complejas que cruzan capas de datos para devolver insights reales).

---

## Desarrollo del Hackathon (Bitácora de Trabajo)

Esta sección contiene el registro detallado de las actividades de desarrollo realizadas por las dos sesiones en paralelo durante el Hackathon:

### Bitácora de Sincronización

#### Fase 1 — Cuenta A (Frontend)
* Setup de Expo SDK 56 y estructura base del proyecto.
* Creación de Splash, Login y Registro, y Selección de Tipo de Cuenta con datos mock.
* Definición de paleta de colores y componentes base de la UI.

#### Fase 1 — Cuenta B (Backend)
* Creación del proyecto Supabase `bvmzrmvrdbfpkdhwazgv`.
* Definición de las 8 tablas principales del esquema e inserción de seeds idempotentes.
* Configuración de la base de Supabase Auth.
* Implementación del trigger `handle_new_user` para la creación automática de filas de perfil.

#### Fase 2 — Cuenta A & B
* **Frontend:** Home y ficha de detalles conectadas al backend. Mapa con capas de lugares, negocios y calor de actividad funcionales.
* **Backend:** Queries reales conectadas a Supabase. Heatmap calculado agrupando subidas en celdas de 1 km.
* **Dioramas:** Extraídos en `assets/dioramas/` y vinculados estáticamente mediante `constants/dioramas.ts` para evitar la carga lenta por red.
* **Geocoding:** Configuración de Nominatim para geocodificación en El Salvador.

#### Fase 3 — Cuenta A & B
* **Frontend:** Pantallas de creación de lugar (`app/crear-lugar.tsx`) y subida de fotos (`app/subir-foto.tsx`) construidas e integradas. Pines de mapa actualizados para reflejar tres estados visuales (Diorama oficial, foto sin verificar, foto verificado con check). Ficha con botón de confirmar e indicador de votos.
* **Backend:** Actualización del esquema de Supabase con la tabla `place_verifications` y campos de control. Trigger Postgres para el conteo automático de verificaciones. Función `createPlace` con geolocalización inversa automática y `uploadPhoto` con auto-asociación de coordenadas al lugar más cercano.

---

### Historial de Prompts Utilizados

#### Prompt Utilizado para Iniciar Fase 3 (Frontend - Cuenta A)
```
Estás construyendo el frontend de Spotmi, un digital twin turístico de El Salvador,
en Expo (React Native). Lee el CLAUDE.md completo, especialmente la Bitácora de
estado, la sección 0 (el pivote: los turistas ahora pueden crear lugares nuevos,
no solo fotografiar los existentes) y la sección 6.2 (cómo se ven los pines de
comunidad vs. oficiales).

Las Fases 1 y 2 ya están completas: hay auth real, mapa con react-native-maps
funcionando con capas togglables, y dioramas de los 8-10 lugares oficiales cargados.
Este pivote es la Fase 3.

Tu trabajo en esta sesión:
1. Pantalla "Crear lugar nuevo" (7b del mapa de pantallas): el usuario suelta un pin
   en el mapa o usa su ubicación actual, completa un formulario corto (nombre,
   categoría, descripción, foto obligatoria vía expo-image-picker) y publica. Debe
   sentirse rápido — máximo 3 pasos, sin fricción.
2. Actualiza la ficha de lugar (pantalla 7): si el lugar es de comunidad y no está
   verificado, muestra el badge "Nuevo" y un botón "Confirmar que existe" visible.
3. Actualiza los pines del mapa (componente de marcador) para distinguir oficial
   (diorama) vs. comunidad no verificado (foto + badge tierra) vs. comunidad
   verificado (foto + check turquesa).
4. Usa mocks para createPlace/confirmPlace si Cuenta B aún no las tiene listas.
```

#### Prompt Utilizado para Iniciar Fase 3 (Backend - Cuenta B)
```
Estás construyendo el backend de Spotmi, un digital twin turístico de El Salvador,
sobre Supabase. Lee el CLAUDE.md completo, especialmente la Bitácora de estado, la
sección 0 (el pivote: los turistas ahora pueden crear lugares nuevos) y la sección 2
(el modelo de datos ya tiene los campos nuevos: places.source, places.created_by,
places.verification_count, places.is_verified, y la tabla place_verifications).

Las Fases 1 y 2 ya están completas. Este pivote es la Fase 3.

Tu trabajo en esta sesión:
1. Actualiza supabase/schema.sql con los campos nuevos de `places` y la tabla
   `place_verifications` (con el unique constraint place_id+user_id).
2. Implementa `createPlace()` en lib/queries/places.ts: inserta en `places` con
   source='community', created_by=usuario actual, is_verified=false.
3. Implementa `confirmPlace()`: inserta en `place_verifications`, incrementa
   `verification_count` en `places`, y marca `is_verified=true` automáticamente
   al llegar a 3 confirmaciones (con trigger de Postgres).
4. Actualiza las RLS policies de `places` para permitir insert a cualquier
   usuario autenticado, pero mantener las reglas de lectura abiertas.
5. Asegúrate de que la query que alimenta el mapa incluya también los lugares de comunidad.
```
