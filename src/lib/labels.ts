import type { AccountKind, TransactionType } from "@/lib/types";

/**
 * La UI mostraba el valor crudo cuando el tipo no era income/expense, así que
 * en pantalla aparecían literales como "savings_deposit" o "credit_payment".
 */
export const TX_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Ingreso",
  expense: "Gasto",
  savings_deposit: "Ahorro",
  credit_payment: "Pago tarjeta",
  recurring_income: "Ingreso recurrente",
  recurring_expense: "Gasto recurrente",
};

export const INCOME_TYPES: TransactionType[] = ["income", "recurring_income"];

export const isIncomeType = (type: TransactionType) => INCOME_TYPES.includes(type);

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  cash: "Efectivo",
  debit: "Débito",
  checking: "Corriente",
  credit: "Crédito",
};
