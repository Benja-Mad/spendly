create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('cash', 'debit', 'checking', 'credit')),
  bank text,
  currency text not null default 'CLP' check (currency = 'CLP'),
  balance bigint not null default 0,
  credit_debt bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('income', 'expense')),
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_funds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount bigint not null check (target_amount > 0),
  current_amount bigint not null default 0,
  initial_deposit bigint not null default 0,
  initial_account_id uuid references public.accounts(id),
  currency text not null default 'CLP' check (currency = 'CLP'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_auto_deposits (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.savings_funds(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  amount bigint not null check (amount > 0),
  day_of_month int not null check (day_of_month between 1 and 28),
  start_month date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount > 0),
  account_id uuid not null references public.accounts(id),
  category_id uuid references public.categories(id),
  frequency text not null default 'monthly' check (frequency in ('monthly', 'biweekly', 'weekly')),
  day_of_month int check (day_of_month between 1 and 28),
  next_run date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id),
  type text not null check (
    type in (
      'income',
      'expense',
      'savings_deposit',
      'credit_payment',
      'recurring_income',
      'recurring_expense'
    )
  ),
  amount bigint not null check (amount > 0),
  currency text not null default 'CLP' check (currency = 'CLP'),
  category_id uuid references public.categories(id),
  description text,
  occurred_at date not null default current_date,
  recurring_rule_id uuid references public.recurring_rules(id),
  savings_fund_id uuid references public.savings_funds(id),
  origin text not null default 'manual' check (origin in ('manual', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_savings_funds_updated_at on public.savings_funds;
create trigger set_savings_funds_updated_at
before update on public.savings_funds
for each row execute function public.set_updated_at();

drop trigger if exists set_recurring_rules_updated_at on public.recurring_rules;
create trigger set_recurring_rules_updated_at
before update on public.recurring_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

insert into public.categories (name, type, is_system)
values
  ('Sueldo', 'income', true),
  ('Inversión', 'income', true),
  ('Comida', 'expense', true),
  ('Transporte', 'expense', true),
  ('Hogar', 'expense', true),
  ('Entretenimiento', 'expense', true),
  ('Salud', 'expense', true)
on conflict (name) do nothing;
