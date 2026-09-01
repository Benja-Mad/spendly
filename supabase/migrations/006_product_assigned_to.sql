-- 006_product_assigned_to.sql
-- Agregar campo assigned_to para responsable del producto (no es quien lo agrega)

alter table public.junta_products
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists idx_junta_products_assigned_to on public.junta_products(assigned_to);
