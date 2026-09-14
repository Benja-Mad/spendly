-- 007_account_last4.sql
-- Últimos 4 dígitos de la cuenta o tarjeta. Opcional: sirve para distinguir
-- dos cuentas del mismo banco, no para identificar el instrumento.
--
-- Se guarda como texto, no como entero, porque los ceros a la izquierda son
-- significativos ("0042" no es 42) y nunca se opera aritméticamente con él.

alter table public.accounts
  add column if not exists last4 text
    null
    check (last4 is null or last4 ~ '^[0-9]{4}$');
