# Spendly

Aplicación de finanzas personales enfocada en **CLP**, con conexión real a base de datos (Supabase/PostgreSQL).

## Requisitos

- Node.js 20+
- Proyecto de Supabase

## Configuración

1. Instala dependencias:

```bash
npm ci
```

2. Configura variables de entorno en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Las tres se sacan del dashboard de Supabase:

| Variable | Dónde | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API | URL del proyecto. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys | Key pública (`sb_publishable_...`), reemplaza a la antigua `anon`. Se expone al browser a propósito; la seguridad la dan las policies de RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → Secret keys | Key secreta (`sb_secret_...`), reemplaza a la antigua `service_role`. **Nunca** con prefijo `NEXT_PUBLIC_`: se salta RLS. |

> Supabase reemplazó las keys JWT (`anon` / `service_role`) por `sb_publishable_...` /
> `sb_secret_...`. Las antiguas siguen funcionando en paralelo pero quedan deprecadas
> a fines de 2026. El nombre de la variable lo define esta app, no Supabase: en
> `SUPABASE_SERVICE_ROLE_KEY` va el valor `sb_secret_...`.

3. Crea tablas ejecutando el SQL de `/supabase/schema.sql` en tu base de datos.

4. Ejecuta la app:

```bash
npm run dev
```

## Scripts

- `npm run dev` - desarrollo
- `npm run lint` - lint
- `npm run build` - build producción

## Alcance implementado

- Moneda única: **CLP**.
- Cuentas/tarjetas con banco opcional.
- Tarjetas de crédito con deuda visible de inmediato y pago sin doble descuento.
- Fondos de ahorro con:
  - meta,
  - depósito inicial opcional,
  - descuentos inmediatos desde cuenta seleccionada,
  - depósitos automáticos mensuales desde el mes siguiente (múltiples reglas).
- Resumen de saldos:
  - Total,
  - Disponible,
  - Ahorrado,
  - Deuda de crédito pendiente.
- Categorías base y categorización manual.
- Reglas recurrentes (mensual) con ejecución inmediata cuando corresponde.
- Movimientos manuales editables/eliminables.
- Alertas in-app.
