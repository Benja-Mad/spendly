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
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

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
