-- 003_juntas.sql
-- Sistema de Juntas: finanzas grupales para juntadas con amigos

-- 0. Agregar username a profiles
alter table public.profiles
  add column if not exists username text unique;

-- 1. Tabla principal de juntas
create table if not exists public.juntas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Categorías dentro de una junta (comida, alcohol, etc.)
create table if not exists public.junta_categories (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(junta_id, name)
);

-- 3. Miembros de la junta
create table if not exists public.junta_members (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique(junta_id, user_id)
);

-- 4. Productos/items que cada persona aporta
create table if not exists public.junta_products (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.junta_categories(id) on delete set null,
  name text not null,
  link text,
  image_url text,
  amount bigint not null check (amount > 0),
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Settlements: transferencias calculadas para saldar deudas
create table if not exists public.junta_settlements (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0),
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. Índices
create index if not exists idx_juntas_owner_id on public.juntas(owner_id);
create index if not exists idx_juntas_invite_code on public.juntas(invite_code);
create index if not exists idx_junta_categories_junta_id on public.junta_categories(junta_id);
create index if not exists idx_junta_members_junta_id on public.junta_members(junta_id);
create index if not exists idx_junta_members_user_id on public.junta_members(user_id);
create index if not exists idx_junta_products_junta_id on public.junta_products(junta_id);
create index if not exists idx_junta_products_user_id on public.junta_products(user_id);
create index if not exists idx_junta_settlements_junta_id on public.junta_settlements(junta_id);

-- 7. Triggers para updated_at
drop trigger if exists set_juntas_updated_at on public.juntas;
create trigger set_juntas_updated_at
before update on public.juntas
for each row execute function public.set_updated_at();

drop trigger if exists set_junta_products_updated_at on public.junta_products;
create trigger set_junta_products_updated_at
before update on public.junta_products
for each row execute function public.set_updated_at();

-- 8. RLS: habilitar en todas las tablas
alter table public.juntas enable row level security;
alter table public.junta_categories enable row level security;
alter table public.junta_members enable row level security;
alter table public.junta_products enable row level security;
alter table public.junta_settlements enable row level security;

-- 9. Políticas RLS

-- Juntas: el owner puede todo, los miembros pueden leer
create policy "Owner puede gestionar su junta"
  on public.juntas for all
  using (auth.uid() = owner_id);

create policy "Miembros pueden ver juntas donde están"
  on public.juntas for select
  using (
    exists (
      select 1 from public.junta_members
      where junta_members.junta_id = juntas.id
      and junta_members.user_id = auth.uid()
    )
  );

-- Categorías: cualquier miembro de la junta puede ver/modificar
create policy "Miembros gestionan categorías de su junta"
  on public.junta_categories for all
  using (
    exists (
      select 1 from public.junta_members
      where junta_members.junta_id = junta_categories.junta_id
      and junta_members.user_id = auth.uid()
    )
  );

-- Miembros: cualquier miembro puede ver, el owner puede gestionar
create policy "Miembros pueden ver miembros de su junta"
  on public.junta_members for select
  using (
    exists (
      select 1 from public.junta_members jm
      where jm.junta_id = junta_members.junta_id
      and jm.user_id = auth.uid()
    )
  );

create policy "Owner puede gestionar miembros"
  on public.junta_members for all
  using (
    exists (
      select 1 from public.juntas
      where juntas.id = junta_members.junta_id
      and juntas.owner_id = auth.uid()
    )
  );

-- Permitir que cualquier usuario autenticado se una con código (INSERT)
create policy "Usuarios autenticados pueden unirse a juntas"
  on public.junta_members for insert
  with check (auth.uid() = user_id);

-- Productos: cualquier miembro puede ver/crear, cada uno edita los suyos
create policy "Miembros ven productos de su junta"
  on public.junta_products for select
  using (
    exists (
      select 1 from public.junta_members
      where junta_members.junta_id = junta_products.junta_id
      and junta_members.user_id = auth.uid()
    )
  );

create policy "Miembros crean productos en su junta"
  on public.junta_products for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.junta_members
      where junta_members.junta_id = junta_products.junta_id
      and junta_members.user_id = auth.uid()
    )
  );

create policy "Miembros editan sus propios productos"
  on public.junta_products for update
  using (auth.uid() = user_id);

create policy "Miembros eliminan sus propios productos"
  on public.junta_products for delete
  using (auth.uid() = user_id);

-- Settlements: cualquier miembro puede ver, el owner puede gestionar
create policy "Miembros ven settlements de su junta"
  on public.junta_settlements for select
  using (
    exists (
      select 1 from public.junta_members
      where junta_members.junta_id = junta_settlements.junta_id
      and junta_members.user_id = auth.uid()
    )
  );

create policy "Owner puede gestionar settlements"
  on public.junta_settlements for all
  using (
    exists (
      select 1 from public.juntas
      where juntas.id = junta_settlements.junta_id
      and juntas.owner_id = auth.uid()
    )
  );

-- 10. Policy para que usuarios autenticados puedan buscar perfiles por username
-- (necesario para邀请 por username en el futuro)
create policy "Usuarios pueden buscar perfiles públicos"
  on public.profiles for select
  using (true);
