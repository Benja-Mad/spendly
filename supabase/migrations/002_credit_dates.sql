-- 002_credit_dates.sql
-- Agrega fecha de facturación (cierre) y vencimiento a tarjetas de crédito

alter table public.accounts
  add column statement_day integer
    null
    check (statement_day is null or (statement_day between 1 and 28));

alter table public.accounts
  add column payment_due_day integer
    null
    check (payment_due_day is null or (payment_due_day between 1 and 28));
