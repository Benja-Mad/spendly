-- 005_fix_profiles_rls.sql
-- Fix: agregar políticas INSERT y UPDATE para profiles

-- La política de SELECT existente es para que otros usuarios vean perfiles públicos
-- Agregamos INSERT y UPDATE para que el usuario gestione su propio perfil

-- Eliminar la política de select restrictiva anterior (solo ve su propio perfil)
drop policy if exists "Usuarios ven su propio perfil" on public.profiles;

-- Mantener la política de select pública (ya existente de 003)
-- "Usuarios pueden buscar perfiles públicos" ya existe

-- INSERT: el usuario solo puede crear su propio perfil
create policy "Usuarios crean su propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- UPDATE: el usuario solo puede actualizar su propio perfil
create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);
