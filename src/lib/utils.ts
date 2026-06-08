export const formatClp = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

export const parsePositiveInteger = (value: unknown, field: string) => {
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error(`${field} debe ser un entero positivo.`);
  }

  return numeric;
};

export const parseNonNegativeInteger = (value: unknown, field: string) => {
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`${field} debe ser un entero mayor o igual a 0.`);
  }

  return numeric;
};

export const monthStart = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
