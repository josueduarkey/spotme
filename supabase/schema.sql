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
  category text check (category in ('naturaleza', 'cultura', 'gastronomia', 'aventura')),
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
  created_at timestamptz not null default now()
);

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

  return new;
end;
$$;

drop trigger if exists on_place_verification on public.place_verifications;
create trigger on_place_verification
  after insert on public.place_verifications
  for each row execute function public.handle_place_verification();

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
   'San Salvador', '2026-07-31T18:00:00Z', 13.6989, -89.1914)
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
