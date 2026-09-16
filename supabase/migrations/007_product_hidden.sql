-- 007_product_hidden.sql
-- Agregar campo hidden para ocultar productos del calculo de balances

alter table public.junta_products
  add column if not exists hidden boolean not null default false;
