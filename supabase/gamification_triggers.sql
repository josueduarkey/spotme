-- ===========================================================================
-- =============== TRIGGERS DE GAMIFICACIÓN REAL (Fase 5) ====================
-- ===========================================================================
-- Para evitar errores de bloqueo (deadlocks), ejecuta estos tres bloques
-- de código de forma INDIVIDUAL (uno por uno) en el editor SQL de Supabase.

-- ===========================================================================
-- BLOQUE 1: Retos para Fotos Subidas (uploads)
-- ===========================================================================
-- Otorga 25 puntos de exploración al usuario por subir fotos.
-- Si es su primera foto, completa el reto "Primera postal" (+50 pts).

create or replace function public.handle_new_upload()
returns trigger as $$
declare
  first_upload_challenge_id uuid;
  total_uploads int;
begin
  -- Sumar 25 puntos al creador de la foto
  update public.profiles
  set points = points + 25
  where id = new.user_id;

  -- Buscar ID del reto 'Primera postal'
  select id into first_upload_challenge_id
  from public.challenges
  where title = 'Primera postal'
  limit 1;

  if first_upload_challenge_id is not null then
    -- Contar cuántas fotos ha subido
    select count(*) into total_uploads
    from public.uploads
    where user_id = new.user_id;

    if total_uploads = 1 then
      -- Completar el reto en la tabla de relación
      insert into public.user_challenges (user_id, challenge_id, status, completed_at)
      values (new.user_id, first_upload_challenge_id, 'completed', now())
      on conflict (user_id, challenge_id) do update
      set status = 'completed', completed_at = now();

      -- Otorgar premio adicional de 50 puntos
      update public.profiles
      set points = points + 50
      where id = new.user_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_upload on public.uploads;
create trigger on_new_upload
  after insert on public.uploads
  for each row execute function public.handle_new_upload();


-- ===========================================================================
-- BLOQUE 2: Reto al Crear Lugar (places - Insert)
-- ===========================================================================
-- Otorga 50 puntos al creador al registrar un lugar comunitario.
-- Si es su primer lugar, completa el reto "Fundador" (+100 pts).

create or replace function public.handle_new_place()
returns trigger as $$
declare
  founder_challenge_id uuid;
  total_created int;
begin
  if new.source = 'community' and new.created_by is not null then
    -- Sumar 50 puntos al perfil del creador
    update public.profiles
    set points = points + 50
    where id = new.created_by;

    -- Buscar ID del reto 'Fundador'
    select id into founder_challenge_id
    from public.challenges
    where title = 'Fundador'
    limit 1;

    if founder_challenge_id is not null then
      -- Contar cuántos lugares comunitarios ha creado
      select count(*) into total_created
      from public.places
      where created_by = new.created_by;

      if total_created = 1 then
        -- Completar el reto en la tabla de relación
        insert into public.user_challenges (user_id, challenge_id, status, completed_at)
        values (new.created_by, founder_challenge_id, 'completed', now())
        on conflict (user_id, challenge_id) do update
        set status = 'completed', completed_at = now();

        -- Otorgar premio adicional de 100 puntos
        update public.profiles
        set points = points + 100
        where id = new.created_by;
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


-- ===========================================================================
-- BLOQUE 3: Reto al Verificar Lugar (places - Update)
-- ===========================================================================
-- Al llegar a 3 confirmaciones, completa el reto "Cartógrafo comunitario" (+300 pts) al creador original.

create or replace function public.handle_place_verification_gamify()
returns trigger as $$
declare
  cartographer_challenge_id uuid;
begin
  if new.is_verified = true and old.is_verified = false and new.created_by is not null then
    -- Buscar ID del reto 'Cartógrafo comunitario'
    select id into cartographer_challenge_id
    from public.challenges
    where title = 'Cartógrafo comunitario'
    limit 1;

    if cartographer_challenge_id is not null then
      -- Completar el reto en la tabla de relación
      insert into public.user_challenges (user_id, challenge_id, status, completed_at)
      values (new.created_by, cartographer_challenge_id, 'completed', now())
      on conflict (user_id, challenge_id) do update
      set status = 'completed', completed_at = now();

      -- Otorgar premio adicional de 300 puntos
      update public.profiles
      set points = points + 300
      where id = new.created_by;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_place_verification_gamify on public.places;
create trigger on_place_verification_gamify
  after update on public.places
  for each row execute function public.handle_place_verification_gamify();
