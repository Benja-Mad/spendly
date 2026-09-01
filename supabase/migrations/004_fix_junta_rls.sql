-- 004_fix_junta_rls.sql
-- Fix: recursión infinita en RLS de junta_members

-- Eliminar políticas problematicas de junta_members
drop policy if exists "Miembros pueden ver miembros de su junta" on public.junta_members;
drop policy if exists "Owner puede gestionar miembros" on public.junta_members;
drop policy if exists "Usuarios autenticados pueden unirse a juntas" on public.junta_members;

-- Función security definer para verificar membresía (rompe la recursión)
create or replace function public.is_junta_member(junta_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.junta_members jm
    where jm.junta_id = $1
    and jm.user_id = auth.uid()
  );
$$;

-- Función para verificar si es owner
create or replace function public.is_junta_owner(junta_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.juntas j
    where j.id = $1
    and j.owner_id = auth.uid()
  );
$$;

-- Políticas simples para junta_members usando las funciones
create policy "Miembros pueden ver miembros de su junta"
  on public.junta_members for select
  using (public.is_junta_member(junta_members.junta_id));

create policy "Owner puede gestionar miembros"
  on public.junta_members for all
  using (public.is_junta_owner(junta_members.junta_id));

create policy "Usuarios autenticados pueden unirse a juntas"
  on public.junta_members for insert
  with check (auth.uid() = user_id);

-- Recriar políticas de otras tablas usando funciones (seguras)
-- Categorías
drop policy if exists "Miembros gestionan categorías de su junta" on public.junta_categories;
create policy "Miembros gestionan categorías de su junta"
  on public.junta_categories for all
  using (public.is_junta_member(junta_categories.junta_id));

-- Productos
drop policy if exists "Miembros ven productos de su junta" on public.junta_products;
drop policy if exists "Miembros crean productos en su junta" on public.junta_products;
create policy "Miembros ven productos de su junta"
  on public.junta_products for select
  using (public.is_junta_member(junta_products.junta_id));
create policy "Miembros crean productos en su junta"
  on public.junta_products for insert
  with check (auth.uid() = user_id and public.is_junta_member(junta_products.junta_id));

-- Juntas select policy
drop policy if exists "Miembros pueden ver juntas donde están" on public.juntas;
create policy "Miembros pueden ver juntas donde están"
  on public.juntas for select
  using (public.is_junta_member(juntas.id));

-- Settlements
drop policy if exists "Miembros ven settlements de su junta" on public.junta_settlements;
drop policy if exists "Owner puede gestionar settlements" on public.junta_settlements;
create policy "Miembros ven settlements de su junta"
  on public.junta_settlements for select
  using (public.is_junta_member(junta_settlements.junta_id));
create policy "Owner puede gestionar settlements"
  on public.junta_settlements for all
  using (public.is_junta_owner(junta_settlements.junta_id));
