-- ============================================================
-- Spotmi — Políticas de Storage (Fase 2/3, Cuenta B)
-- Buckets (creados vía API de Storage, ambos públicos):
--   * map-icons : dioramas isométricos de lugares (sube Cuenta B con secret key)
--   * uploads   : fotos UGC de turistas (sube la app con usuario autenticado)
-- Separado de schema.sql porque toca storage.objects (permisos distintos).
-- ============================================================

-- Lectura pública de ambos buckets (además del endpoint /object/public/).
drop policy if exists "spotmi_public_read" on storage.objects;
create policy "spotmi_public_read" on storage.objects
  for select using (bucket_id in ('map-icons', 'uploads'));

-- Turistas autenticados suben fotos al bucket de UGC.
drop policy if exists "spotmi_uploads_insert" on storage.objects;
create policy "spotmi_uploads_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads');
