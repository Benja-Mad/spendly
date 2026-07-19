export const CURRENCY = "CLP" as const;

export type Currency = typeof CURRENCY;

export type AccountKind = "cash" | "debit" | "checking" | "credit";
export type TransactionType =
  | "income"
  | "expense"
  | "savings_deposit"
  | "credit_payment"
  | "recurring_income"
  | "recurring_expense";

export type RuleType = "income" | "expense";
export type RuleFrequency = "monthly" | "biweekly" | "weekly";

export type RowRecord = Record<string, unknown>;

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  kind: AccountKind;
  bank: string | null;
  currency: Currency;
  balance: number;
  creditDebt: number;
  statementDay: number | null;
  paymentDueDay: number | null;
}

export interface Category {
  id: string;
  name: string;
  type: RuleType;
  isSystem: boolean;
}

export interface SavingsFund {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  initialDeposit: number;
  initialAccountId: string | null;
  currency: Currency;
}

export interface SavingsAutoDeposit {
  id: string;
  userId: string;
  fundId: string;
  accountId: string;
  amount: number;
  dayOfMonth: number;
  startMonth: string;
  isActive: boolean;
}

export interface RecurringRule {
  id: string;
  userId: string;
  name: string;
  type: RuleType;
  amount: number;
  accountId: string;
  categoryId: string | null;
  frequency: RuleFrequency;
  dayOfMonth: number | null;
  nextRun: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  categoryId: string | null;
  description: string | null;
  occurredAt: string;
  recurringRuleId: string | null;
  savingsFundId: string | null;
  origin: "manual" | "system";
}

export interface Alert {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  total: number;
  available: number;
  saved: number;
  pendingCreditDebt: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  accounts: Account[];
  categories: Category[];
  savingsFunds: SavingsFund[];
  savingsAutoDeposits: SavingsAutoDeposit[];
  recurringRules: RecurringRule[];
  transactions: Transaction[];
  alerts: Alert[];
}
