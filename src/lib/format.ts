import { CURRENCY } from "@/lib/types";

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export const formatClp = (value: number) => clpFormatter.format(value);

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Las fechas llegan del backend como "YYYY-MM-DD" (DATE de Postgres, sin hora).
 * new Date("2026-09-14") las parsea como UTC medianoche, lo que en Chile (UTC-3/-4)
 * las corre un dia hacia atras. Por eso se construye la fecha en hora local.
 */
export const formatDate = (isoDate: string | null | undefined) => {
  if (!isoDate) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
};
