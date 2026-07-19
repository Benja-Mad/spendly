-- 001_users.sql
-- Agrega sistema de usuarios: profiles, user_id en tablas existentes, RLS

-- 1. Tabla de perfiles (vinculada a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- 2. Agregar user_id a todas las tablas de datos
alter table public.accounts
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.savings_funds
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.savings_auto_deposits
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.recurring_rules
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.transactions
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.alerts
  add column user_id uuid references auth.users(id) on delete cascade;

-- 3. Índices para filtrado por usuario
create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_savings_funds_user_id on public.savings_funds(user_id);
create index if not exists idx_savings_auto_deposits_user_id on public.savings_auto_deposits(user_id);
create index if not exists idx_recurring_rules_user_id on public.recurring_rules(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_alerts_user_id on public.alerts(user_id);

-- 4. Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. RLS: habilitar en todas las tablas
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.savings_funds enable row level security;
alter table public.savings_auto_deposits enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.transactions enable row level security;
alter table public.alerts enable row level security;

-- 6. Políticas RLS: cada usuario solo ve/edita sus propios datos
create policy "Usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios ven sus cuentas"
  on public.accounts for all
  using (auth.uid() = user_id);

create policy "Usuarios ven sus fondos de ahorro"
  on public.savings_funds for all
  using (auth.uid() = user_id);

create policy "Usuarios ven sus auto-depósitos"
  on public.savings_auto_deposits for all
  using (auth.uid() = user_id);

create policy "Usuarios ven sus reglas recurrentes"
  on public.recurring_rules for all
  using (auth.uid() = user_id);

create policy "Usuarios ven sus transacciones"
  on public.transactions for all
  using (auth.uid() = user_id);

create policy "Usuarios ven sus alertas"
  on public.alerts for all
  using (auth.uid() = user_id);
