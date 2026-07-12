-- ============================================================
-- Spotmi — Schema completo (Fase 1, Cuenta B)
-- Digital Twin Turístico de El Salvador
--
-- Ejecutar en el SQL Editor del proyecto de Supabase (o vía MCP).
-- Idempotente: se puede re-ejecutar sin duplicar datos.
--
-- Nota sobre el modelo de la sección 2 del CLAUDE.md:
--   * `events` gana columnas lat/lng (el mock de Cuenta A las usa
--     para la capa de eventos del mapa).
--   * `places.name` y `events.title` son UNIQUE para que el seed
--     sea idempotente.
-- ============================================================

-- =============== TABLAS ===============

-- usuarios (extiende auth.users de Supabase)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  account_type text check (account_type in ('turista', 'negocio')),
  avatar_url text,
  points int not null default 0,
  created_at timestamptz not null default now()
);

-- lugares turísticos (oficiales Y creados por la comunidad — pivote Fase 3)
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  department text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  category text check (category in ('naturaleza', 'cultura', 'gastronomia', 'aventura', 'playa', 'historia', 'urbano')),
  cover_image_url text,
  map_icon_url text,
  is_generated_image boolean not null default false,
  source text not null default 'community',
  created_by uuid references public.profiles (id),
  verification_count int not null default 0,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Migración pivote Fase 3 (idempotente, para bases creadas antes del pivote)
alter table public.places add column if not exists source text not null default 'community';
alter table public.places add column if not exists created_by uuid references public.profiles (id);
alter table public.places add column if not exists verification_count int not null default 0;
alter table public.places add column if not exists is_verified boolean not null default false;
alter table public.places drop constraint if exists places_source_check;
alter table public.places add constraint places_source_check check (source in ('official', 'community'));
-- Los seeds (sin created_by) son la capa oficial verificada.
update public.places set source = 'official', is_verified = true
  where created_by is null and source = 'community';

-- Migración categorías ampliadas (idempotente): playa, historia, urbano
alter table public.places drop constraint if exists places_category_check;
alter table public.places add constraint places_category_check
  check (category in ('naturaleza', 'cultura', 'gastronomia', 'aventura', 'playa', 'historia', 'urbano'));

-- confirmaciones comunitarias de lugares (un usuario no confirma 2 veces el mismo lugar)
create table if not exists public.place_verifications (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

-- negocios / microemprendedores
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  category text,
  description text,
  lat double precision,
  lng double precision,
  address text,
  schedule text,
  contact text,
  department text,
  created_at timestamptz not null default now()
);

-- Migración Fase 5: departamento del negocio (para el panel de inteligencia
-- territorial, que cruza capas agrupando por departamento).
alter table public.businesses add column if not exists department text;
update public.businesses b set department = v.dep
  from (values
    ('Café Albania', 'Sonsonate'),
    ('Pupusería La Esquina de Suchi', 'Cuscatlán'),
    ('Hostal Punta Roca', 'La Libertad'),
    ('Artesanías Añil Real', 'Cuscatlán'),
    ('Kayak Coatepeque Tours', 'Santa Ana')
  ) as v(name, dep)
  where b.name = v.name and b.department is null;

-- fotos subidas por usuarios (UGC), asociadas a un lugar o negocio
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('place', 'business')),
  target_id uuid not null,
  image_url text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- retos
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text,
  points_reward int not null default 0,
  type text check (type in ('upload_photo', 'visit_places', 'environmental', 'create_place'))
);

-- Migración pivote Fase 3: nuevo tipo de reto 'create_place'
alter table public.challenges drop constraint if exists challenges_type_check;
alter table public.challenges add constraint challenges_type_check
  check (type in ('upload_photo', 'visit_places', 'environmental', 'create_place'));

create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

-- eventos
create table if not exists public.events (
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
create table if not exists public.planned_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_ids uuid[] not null default '{}',
  estimated_budget numeric,
  estimated_duration_minutes int,
  created_at timestamptz not null default now()
);

-- =============== TRIGGER: perfil automático al registrarse ===============

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============== TRIGGER: auto-confirmar email al registrarse (desarrollo/demo) ===============

create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.email_confirmed_at := now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_confirm on auth.users;
create trigger on_auth_user_created_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_email();


-- =============== TRIGGER: verificación comunitaria de lugares (pivote Fase 3) ===============
-- Al insertar una confirmación, recuenta y marca is_verified al llegar a 3.
-- SECURITY DEFINER: el usuario que confirma no es dueño de la fila de `places`,
-- así que su update directo lo bloquearía RLS; el trigger lo hace por él.
-- (Es función de trigger — PostgREST no puede invocarla directamente.)

create or replace function public.handle_place_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  select count(*) into v_count
    from public.place_verifications
    where place_id = new.place_id;

  update public.places
    set verification_count = v_count,
        is_verified = (v_count >= 3)
    where id = new.place_id;

  -- Nota: el premio al creador cuando el lugar se verifica lo maneja el reto
  -- "Cartógrafo comunitario" (trigger on_place_verification_gamify + pagador
  -- único on_challenge_points) — aquí NO se suman puntos.

  return new;
end;
$$;

drop trigger if exists on_place_verification on public.place_verifications;
create trigger on_place_verification
  after insert on public.place_verifications
  for each row execute function public.handle_place_verification();

-- =============== GAMIFICACIÓN: pagador único de premios de retos ===============
-- Reglas de puntos (un solo sistema, sin dobles pagos):
--   * Puntos base: +25 por foto y +50 por lugar de comunidad — los pagan
--     handle_new_upload / handle_new_place (sección de triggers al final).
--   * Premios de retos (points_reward): los paga SOLO este trigger cuando una
--     fila de user_challenges pasa a 'completed' (venga de otro trigger o del
--     cliente vía syncChallenges). Jamás sumar premios en otro lado.

-- Limpieza de triggers de una versión anterior que pagaba doble:
drop trigger if exists on_upload_points on public.uploads;
drop function if exists public.award_points_on_upload();
drop trigger if exists on_place_points on public.places;
drop function if exists public.award_points_on_place();

create or replace function public.award_points_on_challenge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward int;
begin
  if new.status = 'completed'
     and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    select points_reward into v_reward from public.challenges where id = new.challenge_id;
    update public.profiles set points = points + coalesce(v_reward, 0) where id = new.user_id;
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists on_challenge_points on public.user_challenges;
create trigger on_challenge_points
  before insert or update on public.user_challenges
  for each row execute function public.award_points_on_challenge();

-- =============== RLS ===============

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.businesses enable row level security;
alter table public.uploads enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;
alter table public.events enable row level security;
alter table public.planned_routes enable row level security;

-- Lectura pública: el mapa (lugares, negocios, actividad, eventos, retos)
-- es visible sin importar el tipo de cuenta. Perfiles legibles para mostrar
-- autor de fotos y ranking de puntos.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "places_select_all" on public.places;
create policy "places_select_all" on public.places
  for select using (true);

-- Pivote Fase 3: cualquier usuario autenticado crea lugares de comunidad,
-- pero no puede falsificar lugares 'official' ni atribuírselos a otro.
drop policy if exists "places_insert_community" on public.places;
create policy "places_insert_community" on public.places
  for insert to authenticated
  with check (source = 'community' and (select auth.uid()) = created_by);

alter table public.place_verifications enable row level security;

drop policy if exists "place_verifications_select_all" on public.place_verifications;
create policy "place_verifications_select_all" on public.place_verifications
  for select using (true);

-- Confirmar: solo a nombre propio y nunca el lugar que uno mismo creó.
drop policy if exists "place_verifications_insert_own" on public.place_verifications;
create policy "place_verifications_insert_own" on public.place_verifications
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.places p
      where p.id = place_id and p.created_by = (select auth.uid())
    )
  );

drop policy if exists "businesses_select_all" on public.businesses;
create policy "businesses_select_all" on public.businesses
  for select using (true);

drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own" on public.businesses
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own" on public.businesses
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "uploads_select_all" on public.uploads;
create policy "uploads_select_all" on public.uploads
  for select using (true);

drop policy if exists "uploads_insert_own" on public.uploads;
create policy "uploads_insert_own" on public.uploads
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "challenges_select_all" on public.challenges;
create policy "challenges_select_all" on public.challenges
  for select using (true);

drop policy if exists "user_challenges_select_own" on public.user_challenges;
create policy "user_challenges_select_own" on public.user_challenges
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_challenges_insert_own" on public.user_challenges;
create policy "user_challenges_insert_own" on public.user_challenges
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_challenges_update_own" on public.user_challenges;
create policy "user_challenges_update_own" on public.user_challenges
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "events_select_all" on public.events;
create policy "events_select_all" on public.events
  for select using (true);

drop policy if exists "planned_routes_select_own" on public.planned_routes;
create policy "planned_routes_select_own" on public.planned_routes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "planned_routes_insert_own" on public.planned_routes;
create policy "planned_routes_insert_own" on public.planned_routes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "planned_routes_delete_own" on public.planned_routes;
create policy "planned_routes_delete_own" on public.planned_routes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =============== SEED: 10 lugares reales (uno por departamento clave) ===============

insert into public.places (name, department, description, lat, lng, category) values
  ('Divino Salvador del Mundo', 'San Salvador',
   'El monumento más emblemático del país, en plena Plaza Salvador del Mundo. Punto de encuentro, celebraciones y postal obligada de la capital.',
   13.7013, -89.2247, 'cultura'),
  ('Volcán de Santa Ana', 'Santa Ana',
   'El Ilamatepec, volcán más alto de El Salvador (2,381 m). La caminata al cráter revela una laguna turquesa que parece de otro planeta.',
   13.8536, -89.6300, 'aventura'),
  ('Lago de Coatepeque', 'Santa Ana',
   'Caldera volcánica convertida en un lago azul profundo. Miradores, kayak y atardeceres que cambian de color según la temporada.',
   13.8667, -89.5500, 'naturaleza'),
  ('Suchitoto', 'Cuscatlán',
   'Pueblo colonial de calles empedradas frente al lago Suchitlán. Capital cultural del país: galerías, añil y la iglesia Santa Lucía.',
   13.9380, -89.0280, 'cultura'),
  ('Playa El Tunco', 'La Libertad',
   'La playa más famosa de la costa salvadoreña: surf de clase mundial, la roca del Tunco y una escena de atardeceres inigualable.',
   13.4933, -89.3810, 'aventura'),
  ('Juayúa — Ruta de las Flores', 'Sonsonate',
   'Corazón de la Ruta de las Flores. Su festival gastronómico de fin de semana y los Chorros de la Calera lo hacen parada obligatoria.',
   13.8410, -89.7460, 'gastronomia'),
  ('Joya de Cerén', 'La Libertad',
   'La "Pompeya de América", Patrimonio de la Humanidad UNESCO. Una aldea maya sepultada por ceniza hace 1,400 años, intacta.',
   13.8272, -89.3672, 'cultura'),
  ('Parque Nacional El Imposible', 'Ahuachapán',
   'El bosque más biodiverso del país. Senderos entre cañones, pumas, tucanes y vistas que llegan hasta el Pacífico.',
   13.8400, -89.9500, 'naturaleza'),
  ('Bahía de Jiquilisco', 'Usulután',
   'Reserva de biosfera con los manglares más extensos de Centroamérica. Tortugas marinas, islas y pesca artesanal.',
   13.2300, -88.5500, 'naturaleza'),
  ('Playa Las Flores', 'San Miguel',
   'Joya del oriente salvadoreño: olas largas y consistentes que atraen surfistas de todo el mundo, arena dorada y ambiente tranquilo.',
   13.1750, -88.1050, 'aventura')
on conflict (name) do nothing;

-- =============== SEED: catálogo ampliado (Fase 5 — cobertura de los 14 departamentos) ===============

insert into public.places (name, department, description, lat, lng, category) values
  ('Puerta del Diablo', 'San Salvador',
   'Formación rocosa con vistas de vértigo al valle y al Pacífico. Rappel, senderos y la leyenda más famosa de Panchimalco.',
   13.6047, -89.1923, 'aventura'),
  ('El Boquerón', 'San Salvador',
   'El cráter del volcán de San Salvador: 1.5 km de diámetro, jardines de hortensias y miradores sobre la capital.',
   13.7358, -89.2884, 'naturaleza'),
  ('Centro Histórico de San Salvador', 'San Salvador',
   'Palacio Nacional, Teatro Nacional, Catedral e Iglesia El Rosario — el corazón arquitectónico del país, renovado.',
   13.6989, -89.1914, 'cultura'),
  ('Ruinas de Tazumal', 'Santa Ana',
   'La pirámide maya más importante de El Salvador, en Chalchuapa. 1,200 años de historia y museo de sitio.',
   13.9789, -89.6742, 'cultura'),
  ('Teatro de Santa Ana', 'Santa Ana',
   'Joya arquitectónica de 1910, el teatro más bello del país. Frescos, palcos dorados y agenda cultural viva.',
   13.9946, -89.5598, 'cultura'),
  ('Cerro Verde', 'Santa Ana',
   'Bosque nebuloso sobre un volcán extinto, con miradores hacia el Izalco y el Ilamatepec. Senderos entre orquídeas.',
   13.8261, -89.6236, 'naturaleza'),
  ('Volcán de Izalco', 'Sonsonate',
   'El "Faro del Pacífico": el volcán más joven y fotogénico del país. Ascenso exigente con recompensa total.',
   13.8133, -89.6331, 'aventura'),
  ('Nahuizalco', 'Sonsonate',
   'Pueblo náhuat-pipil de la Ruta de las Flores, famoso por su mercado nocturno de velas y artesanías de mimbre.',
   13.7775, -89.7364, 'cultura'),
  ('Concepción de Ataco', 'Ahuachapán',
   'Callecitas empedradas y murales de colores en lo alto de la Ruta de las Flores. Café de altura y clima de montaña.',
   13.8703, -89.8481, 'cultura'),
  ('Apaneca', 'Ahuachapán',
   'Entre cafetales y laberintos verdes: canopy, buggies y la mejor taza de café de la cordillera Apaneca-Ilamatepec.',
   13.8592, -89.8033, 'gastronomia'),
  ('Playa El Zonte', 'La Libertad',
   'Surf City y cuna de Bitcoin Beach: olas de clase mundial, atardeceres naranjas y ambiente de pueblo surfero.',
   13.4922, -89.4433, 'aventura'),
  ('Parque Arqueológico San Andrés', 'La Libertad',
   'Centro ceremonial maya en el valle de Zapotitán, con acrópolis, museo y campos que cuentan 2,000 años.',
   13.7994, -89.3906, 'cultura'),
  ('Malecón del Puerto de La Libertad', 'La Libertad',
   'El mercado de mariscos más famoso del país sobre el muelle histórico. Ostras frescas viendo romper las olas.',
   13.4869, -89.3222, 'gastronomia'),
  ('La Palma', 'Chalatenango',
   'El pueblo-galería de Fernando Llort: fachadas pintadas a mano y talleres de artesanía en madera y semillas.',
   14.3178, -89.1697, 'cultura'),
  ('Cerro El Pital', 'Chalatenango',
   'El punto más alto de El Salvador (2,730 m): bosques de pino, neblina, fresas con crema y clima de abrigo.',
   14.3908, -89.1225, 'naturaleza'),
  ('Cascada Los Tercios', 'Cuscatlán',
   'Cortina de columnas hexagonales de basalto cerca de Suchitoto — una rareza geológica que parece esculpida a mano.',
   13.9297, -89.0192, 'naturaleza'),
  ('Ilobasco', 'Cabañas',
   'Capital del barro: talleres de miniaturas y "sorpresas" de cerámica que caben en una cáscara de huevo.',
   13.8417, -88.8483, 'cultura'),
  ('Bosque de Cinquera', 'Cabañas',
   'Bosque renacido tras la guerra, con senderos, pozas y memoria histórica. Turismo comunitario auténtico.',
   13.8636, -88.9569, 'naturaleza'),
  ('Volcán Chichontepec', 'San Vicente',
   'El coloso de dos picos del valle del Jiboa. Ascenso entre cafetales e infiernillos humeantes en su falda.',
   13.5953, -88.8369, 'aventura'),
  ('Laguna de Apastepeque', 'San Vicente',
   'Laguna cratérica de aguas turquesa, ideal para nadar, kayak y picnic sin multitudes.',
   13.6664, -88.7639, 'naturaleza'),
  ('Costa del Sol', 'La Paz',
   'La franja de playa más larga del país: estero de Jaltepeque, cocoteros y paseos en lancha entre manglares.',
   13.3364, -88.8942, 'naturaleza'),
  ('Laguna de Alegría', 'Usulután',
   'La "Esmeralda de América": laguna sulfurosa dentro del cráter del volcán Tecapa, junto al pueblo florido de Alegría.',
   13.4931, -88.4864, 'naturaleza'),
  ('Volcán Chaparrastique', 'San Miguel',
   'El cono perfecto del oriente. Ascenso serio para madrugadores, con vista al Pacífico y al valle migueleño.',
   13.4342, -88.2692, 'aventura'),
  ('Perquín', 'Morazán',
   'Capital de la memoria histórica: Museo de la Revolución, aire de pino y la ruta de paz de Morazán.',
   13.9578, -88.1614, 'cultura'),
  ('Río Sapo', 'Morazán',
   'Pozas cristalinas de agua esmeralda entre bosque protegido — uno de los ríos más limpios de Centroamérica.',
   13.9740, -88.1030, 'naturaleza'),
  ('Playa El Tamarindo', 'La Unión',
   'Bahía de aguas tranquilas en el extremo oriental, con vista a los volcanes del Golfo de Fonseca.',
   13.1592, -87.9014, 'naturaleza'),
  ('Isla Meanguera del Golfo', 'La Unión',
   'Isla habitada en pleno Golfo de Fonseca: lanchas, pescado fresco y tres países a la vista desde el mirador.',
   13.1900, -87.7150, 'aventura')
on conflict (name) do nothing;

-- Todos los seeds (sin created_by) son capa oficial verificada — corre después
-- de los inserts para cubrir también una base recién creada en una sola pasada.
update public.places set source = 'official', is_verified = true
  where created_by is null and source = 'community';

-- =============== SEED: eventos ===============

insert into public.events (title, description, department, date, lat, lng) values
  ('Festival Gastronómico de Juayúa',
   'Todos los fines de semana: parrilladas, comida típica y música en vivo en el parque central.',
   'Sonsonate', '2026-07-12T10:00:00Z', 13.8410, -89.7460),
  ('Torneo de Surf El Tunco',
   'Competencia local de surf con categorías amateur y profesional.',
   'La Libertad', '2026-07-18T08:00:00Z', 13.4933, -89.3810),
  ('Feria del Añil',
   'Talleres de teñido, venta de textiles y recorridos por talleres históricos de Suchitoto.',
   'Cuscatlán', '2026-07-25T09:00:00Z', 13.9380, -89.0280),
  ('Noche de Museos',
   'Museos y galerías del centro histórico de San Salvador abren gratis hasta medianoche.',
   'San Salvador', '2026-07-31T18:00:00Z', 13.6989, -89.1914),
  ('Fiestas Agostinas',
   'La fiesta más grande del país en honor al Divino Salvador del Mundo: desfiles, ruedas, conciertos y la tradicional Bajada.',
   'San Salvador', '2026-08-01T10:00:00Z', 13.7013, -89.2247),
  ('Bolas de Fuego de Nejapa',
   'Tradición única en el mundo: dos bandos se lanzan bolas de fuego en las calles de Nejapa, en memoria de la erupción de El Playón.',
   'San Salvador', '2026-08-31T19:00:00Z', 13.8153, -89.2311)
on conflict (title) do nothing;

-- =============== SEED: retos ===============

insert into public.challenges (title, description, points_reward, type) values
  ('Primera postal', 'Sube tu primera foto geolocalizada en cualquier lugar del mapa.', 50, 'upload_photo'),
  ('Cazador de dioramas', 'Visita y sube fotos en 3 lugares distintos.', 150, 'visit_places'),
  ('Guardián de la costa', 'Participa en una jornada de limpieza de playa y documenta con foto.', 200, 'environmental'),
  ('Ruta de las Flores completa', 'Visita Juayúa y 2 puntos más de la Ruta de las Flores.', 250, 'visit_places'),
  ('Fundador', 'Crea tu primer lugar en el mapa — un rincón que aún no existía.', 100, 'create_place'),
  ('Cartógrafo comunitario', 'Logra que un lugar creado por ti sea verificado por la comunidad.', 300, 'create_place')
on conflict (title) do nothing;

-- =============== SEED: negocios demo (capa de negocios del mapa) ===============
-- Sin owner_id (nullable): son negocios de muestra hasta que se registren reales.

insert into public.businesses (name, category, description, lat, lng, address, schedule, contact)
select v.* from (values
  ('Café Albania', 'Cafetería',
   'Café de altura cultivado en la Ruta de las Flores, con mirador al valle.',
   13.8355, -89.7519, 'Km 82, carretera a Juayúa, Sonsonate', 'Lun-Dom 8:00–18:00', '+503 7000 0001'),
  ('Pupusería La Esquina de Suchi', 'Restaurante',
   'Pupusas de maíz azul frente al parque central de Suchitoto.',
   13.9374, -89.0292, 'Calle Francisco Morazán, Suchitoto', 'Mié-Dom 10:00–20:00', '+503 7000 0002'),
  ('Hostal Punta Roca', 'Hospedaje',
   'Hostal surfero a 50 m de la playa El Tunco, con renta de tablas.',
   13.4941, -89.3822, 'Calle principal, El Tunco, La Libertad', '24 horas', '+503 7000 0003'),
  ('Artesanías Añil Real', 'Artesanías',
   'Taller de teñido con añil: talleres en vivo y piezas hechas a mano.',
   13.9391, -89.0271, 'Barrio El Centro, Suchitoto', 'Mar-Dom 9:00–17:00', '+503 7000 0004'),
  ('Kayak Coatepeque Tours', 'Turismo',
   'Paseos en kayak y lancha por el lago de Coatepeque al atardecer.',
   13.8709, -89.5568, 'Muelle público, Lago de Coatepeque', 'Vie-Dom 7:00–17:00', '+503 7000 0005')
) as v(name, category, description, lat, lng, address, schedule, contact)
where not exists (select 1 from public.businesses b where b.name = v.name);

-- =============== SEED: uploads demo (capa de actividad de turistas) ===============
-- 1-3 fotos por lugar, atribuidas al primer perfil existente, con jitter de
-- ~400 m para que el heatmap se vea orgánico. Solo corre si uploads está vacío.

insert into public.uploads (user_id, target_type, target_id, image_url, lat, lng)
select
  p.id,
  'place',
  pl.id,
  'https://picsum.photos/seed/spotmi-' || pl.id || '-' || n || '/800/600',
  pl.lat + (random() - 0.5) * 0.008,
  pl.lng + (random() - 0.5) * 0.008
from (select id from public.profiles limit 1) p
cross join public.places pl
cross join lateral generate_series(1, 1 + (floor(random() * 3))::int) as n
where not exists (select 1 from public.uploads);

-- ===========================================================================
-- =============== TRIGGERS DE GAMIFICACIÓN REAL (Fase 5) ====================
-- ===========================================================================

-- 1. Al subir una foto:
--    - Otorga 25 puntos de exploración al usuario.
--    - Si es su primera foto, completa el reto "Primera postal" (+50 pts).
create or replace function public.handle_new_upload()
returns trigger as $$
declare
  first_upload_challenge_id uuid;
  total_uploads int;
begin
  update public.profiles
  set points = points + 25
  where id = new.user_id;

  select id into first_upload_challenge_id
  from public.challenges
  where title = 'Primera postal'
  limit 1;

  if first_upload_challenge_id is not null then
    select count(*) into total_uploads
    from public.uploads
    where user_id = new.user_id;

    if total_uploads = 1 then
      -- El premio del reto lo paga on_challenge_points (único pagador de
      -- points_reward) al insertarse esta fila — no sumar aquí para no duplicar.
      insert into public.user_challenges (user_id, challenge_id, status, completed_at)
      values (new.user_id, first_upload_challenge_id, 'completed', now())
      on conflict (user_id, challenge_id) do update
      set status = 'completed', completed_at = now();
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_upload on public.uploads;
create trigger on_new_upload
  after insert on public.uploads
  for each row execute function public.handle_new_upload();


-- 2. Al crear un lugar comunitario:
--    - Otorga 50 puntos al creador.
--    - Si es su primer lugar, completa el reto "Fundador" (+100 pts).
create or replace function public.handle_new_place()
returns trigger as $$
declare
  founder_challenge_id uuid;
  total_created int;
begin
  if new.source = 'community' and new.created_by is not null then
    update public.profiles
    set points = points + 50
    where id = new.created_by;

    select id into founder_challenge_id
    from public.challenges
    where title = 'Fundador'
    limit 1;

    if founder_challenge_id is not null then
      select count(*) into total_created
      from public.places
      where created_by = new.created_by;

      if total_created = 1 then
        -- Premio del reto: lo paga on_challenge_points, no sumar aquí.
        insert into public.user_challenges (user_id, challenge_id, status, completed_at)
        values (new.created_by, founder_challenge_id, 'completed', now())
        on conflict (user_id, challenge_id) do update
        set status = 'completed', completed_at = now();
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_place on public.places;
create trigger on_new_place
  after insert on public.places
  for each row execute function public.handle_new_place();


-- 3. Al marcar un lugar como verificado por llegar a 3 confirmaciones:
--    - Completa el reto "Cartógrafo comunitario" (+300 pts) al creador.
create or replace function public.handle_place_verification_gamify()
returns trigger as $$
declare
  cartographer_challenge_id uuid;
begin
  if new.is_verified = true and old.is_verified = false and new.created_by is not null then
    select id into cartographer_challenge_id
    from public.challenges
    where title = 'Cartógrafo comunitario'
    limit 1;

    if cartographer_challenge_id is not null then
      -- Premio del reto (+300): lo paga on_challenge_points, no sumar aquí.
      insert into public.user_challenges (user_id, challenge_id, status, completed_at)
      values (new.created_by, cartographer_challenge_id, 'completed', now())
      on conflict (user_id, challenge_id) do update
      set status = 'completed', completed_at = now();
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_place_verification_gamify on public.places;
create trigger on_place_verification_gamify
  after update on public.places
  for each row execute function public.handle_place_verification_gamify();

-- =============== FASE 6: eventos comunitarios, ratings y comentarios ===============
-- La comunidad ya crea lugares; ahora también EVENTOS, con el mismo modelo de
-- confianza (3 confirmaciones → verificado). Además: rating 1-5 al confirmar
-- un lugar, y comentarios planos (sin respuestas) con reacción de corazón.

-- --- Eventos de comunidad (espejo del pivote de places) ---
alter table public.events add column if not exists source text
  check (source in ('official','community')) default 'official';
alter table public.events add column if not exists created_by uuid references public.profiles (id);
alter table public.events add column if not exists verification_count int not null default 0;
alter table public.events add column if not exists is_verified boolean not null default false;

-- Seeds existentes = capa oficial verificada
update public.events set is_verified = true, source = 'official' where created_by is null;

create table if not exists public.event_verifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create or replace function public.handle_event_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  select count(*) into v_count
    from public.event_verifications
    where event_id = new.event_id;

  update public.events
    set verification_count = v_count,
        is_verified = (v_count >= 3)
    where id = new.event_id;

  return new;
end;
$$;

drop trigger if exists on_event_verification on public.event_verifications;
create trigger on_event_verification
  after insert on public.event_verifications
  for each row execute function public.handle_event_verification();

-- Cualquier autenticado crea eventos de comunidad a su nombre (no 'official')
drop policy if exists "events_insert_community" on public.events;
create policy "events_insert_community" on public.events
  for insert to authenticated
  with check (source = 'community' and (select auth.uid()) = created_by);

alter table public.event_verifications enable row level security;

drop policy if exists "event_verifications_select_all" on public.event_verifications;
create policy "event_verifications_select_all" on public.event_verifications
  for select using (true);

-- Confirmar: a nombre propio y nunca el evento que uno mismo creó
drop policy if exists "event_verifications_insert_own" on public.event_verifications;
create policy "event_verifications_insert_own" on public.event_verifications
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = (select auth.uid())
    )
  );

-- --- Rating 1-5 opcional al confirmar que un lugar existe ---
alter table public.place_verifications add column if not exists rating int
  check (rating between 1 and 5);

-- --- Comentarios planos (sin respuestas) con reacción de corazón ---
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('place', 'business', 'event')),
  target_id uuid not null,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_target_idx on public.comments (target_type, target_id, created_at desc);

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;

drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all" on public.comments
  for select using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "comment_reactions_select_all" on public.comment_reactions;
create policy "comment_reactions_select_all" on public.comment_reactions
  for select using (true);

drop policy if exists "comment_reactions_insert_own" on public.comment_reactions;
create policy "comment_reactions_insert_own" on public.comment_reactions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Quitar la reacción propia (toggle del corazón)
drop policy if exists "comment_reactions_delete_own" on public.comment_reactions;
create policy "comment_reactions_delete_own" on public.comment_reactions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =============== GAMIFICACIÓN: puntos por crear eventos (+40) ===============
-- Mismo criterio del pagador único: los puntos base los paga el trigger del
-- hecho (foto 25, lugar 50, evento 40); los retos, on_challenge_points.

create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'community' and new.created_by is not null then
    update public.profiles set points = points + 40 where id = new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_new_event on public.events;
create trigger on_new_event
  after insert on public.events
  for each row execute function public.handle_new_event();

-- =============== RECONCILIACIÓN DE PUNTOS ===============
-- Recalcula profiles.points desde los hechos (fotos, lugares, eventos, retos)
-- con las reglas oficiales: 25/foto + 50/lugar comunidad + 40/evento comunidad
-- + points_reward por reto completado. Idempotente; vive al FINAL del archivo
-- porque referencia columnas que las secciones anteriores agregan.
update public.profiles pr
set points =
  coalesce((select count(*) * 25 from public.uploads u where u.user_id = pr.id), 0)
  + coalesce((select count(*) * 50 from public.places p
              where p.created_by = pr.id and p.source = 'community'), 0)
  + coalesce((select count(*) * 40 from public.events e
              where e.created_by = pr.id and e.source = 'community'), 0)
  + coalesce((select sum(c.points_reward)
              from public.user_challenges uc
              join public.challenges c on c.id = uc.challenge_id
              where uc.user_id = pr.id and uc.status = 'completed'), 0);
