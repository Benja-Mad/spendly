import { getSupabaseAdmin } from "@/lib/supabase";
import {
  Account,
  AccountKind,
  Alert,
  Category,
  DashboardData,
  RecurringRule,
  RuleType,
  SavingsAutoDeposit,
  SavingsFund,
  Transaction,
  TransactionType,
  RowRecord,
} from "@/lib/types";
import {
  addMonths,
  monthStart,
  parseNonNegativeInteger,
  parsePositiveInteger,
  toIsoDate,
} from "@/lib/utils";

const mapAccount = (row: RowRecord): Account => ({
  id: String(row.id),
  userId: String(row.user_id),
  name: String(row.name),
  kind: row.kind as AccountKind,
  bank: (row.bank as string | null) ?? null,
  currency: "CLP",
  balance: Number(row.balance),
  creditDebt: Number(row.credit_debt),
  statementDay: (row.statement_day as number | null) ?? null,
  paymentDueDay: (row.payment_due_day as number | null) ?? null,
});

const mapCategory = (row: RowRecord): Category => ({
  id: String(row.id),
  name: String(row.name),
  type: row.type as RuleType,
  isSystem: Boolean(row.is_system),
});

const mapSavingsFund = (row: RowRecord): SavingsFund => ({
  id: String(row.id),
  userId: String(row.user_id),
  name: String(row.name),
  targetAmount: Number(row.target_amount),
  currentAmount: Number(row.current_amount),
  initialDeposit: Number(row.initial_deposit),
  initialAccountId: (row.initial_account_id as string | null) ?? null,
  currency: "CLP",
});

const mapSavingsAutoDeposit = (row: RowRecord): SavingsAutoDeposit => ({
  id: String(row.id),
  userId: String(row.user_id),
  fundId: String(row.fund_id),
  accountId: String(row.account_id),
  amount: Number(row.amount),
  dayOfMonth: Number(row.day_of_month),
  startMonth: String(row.start_month),
  isActive: Boolean(row.is_active),
});

const mapRecurringRule = (row: RowRecord): RecurringRule => ({
  id: String(row.id),
  userId: String(row.user_id),
  name: String(row.name),
  type: row.type as RuleType,
  amount: Number(row.amount),
  accountId: String(row.account_id),
  categoryId: (row.category_id as string | null) ?? null,
  frequency: row.frequency as RecurringRule["frequency"],
  dayOfMonth: (row.day_of_month as number | null) ?? null,
  nextRun: String(row.next_run),
  isActive: Boolean(row.is_active),
});

export const mapTransaction = (row: RowRecord): Transaction => ({
  id: String(row.id),
  userId: String(row.user_id),
  accountId: String(row.account_id),
  type: row.type as TransactionType,
  amount: Number(row.amount),
  currency: "CLP",
  categoryId: (row.category_id as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  occurredAt: String(row.occurred_at),
  recurringRuleId: (row.recurring_rule_id as string | null) ?? null,
  savingsFundId: (row.savings_fund_id as string | null) ?? null,
  origin: row.origin as Transaction["origin"],
});

const mapAlert = (row: RowRecord): Alert => ({
  id: String(row.id),
  userId: String(row.user_id),
  kind: String(row.kind),
  title: String(row.title),
  body: String(row.body),
  isRead: Boolean(row.is_read),
  createdAt: String(row.created_at),
});

const isEditableMovementType = (
  type: TransactionType,
): type is Extract<TransactionType, "income" | "expense"> =>
  type === "income" || type === "expense";

const getAccount = async (accountId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (error || !data) {
    throw new Error("Cuenta no encontrada.");
  }

  return mapAccount(data as RowRecord);
};

const applyMovementToAccount = async (
  account: Account,
  type: "income" | "expense",
  amount: number,
) => {
  const supabase = getSupabaseAdmin();

  if (account.kind === "credit") {
    if (type === "expense") {
      const { error } = await supabase
        .from("accounts")
        .update({ credit_debt: account.creditDebt + amount })
        .eq("id", account.id);

      if (error) {
        throw new Error("No se pudo registrar deuda de tarjeta de crédito.");
      }

      return;
    }

    throw new Error("En tarjetas de crédito solo puedes registrar gastos directos.");
  }

  const nextBalance = type === "income" ? account.balance + amount : account.balance - amount;

  if (nextBalance < 0) {
    throw new Error("Saldo insuficiente para registrar el movimiento.");
  }

  const { error } = await supabase
    .from("accounts")
    .update({ balance: nextBalance })
    .eq("id", account.id);

  if (error) {
    throw new Error("No se pudo actualizar el saldo de la cuenta.");
  }
};

const reverseMovementFromAccount = async (
  account: Account,
  type: "income" | "expense",
  amount: number,
) => {
  const supabase = getSupabaseAdmin();

  if (account.kind === "credit") {
    if (type === "expense") {
      const nextDebt = account.creditDebt - amount;
      if (nextDebt < 0) {
        throw new Error("La deuda de crédito no puede ser negativa.");
      }

      const { error } = await supabase
        .from("accounts")
        .update({ credit_debt: nextDebt })
        .eq("id", account.id);

      if (error) {
        throw new Error("No se pudo revertir la deuda de tarjeta de crédito.");
      }

      return;
    }

    throw new Error("Movimiento inválido para tarjeta de crédito.");
  }

  const nextBalance = type === "income" ? account.balance - amount : account.balance + amount;

  if (nextBalance < 0) {
    throw new Error("No se pudo revertir el movimiento por saldo inconsistente.");
  }

  const { error } = await supabase
    .from("accounts")
    .update({ balance: nextBalance })
    .eq("id", account.id);

  if (error) {
    throw new Error("No se pudo revertir el saldo de la cuenta.");
  }
};

const createAlert = async (
  userId: string,
  kind: string,
  title: string,
  body: string,
) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("alerts")
    .insert({ user_id: userId, kind, title, body });

  if (error) {
    throw new Error("No se pudo crear la alerta in-app.");
  }
};

const frequencyDeltaDays = (frequency: RecurringRule["frequency"]) => {
  if (frequency === "weekly") return 7;
  if (frequency === "biweekly") return 14;
  throw new Error("Monthly frequency should not be passed to frequencyDeltaDays.");
};

const incrementRecurringDate = (rule: RecurringRule, fromDate: Date) => {
  if (rule.frequency === "monthly") {
    const base = addMonths(fromDate, 1);
    const day = Math.min(rule.dayOfMonth ?? 1, 28);
    return new Date(base.getFullYear(), base.getMonth(), day);
  }

  const delta = frequencyDeltaDays(rule.frequency);
  const next = new Date(fromDate.getTime());
  next.setDate(next.getDate() + delta);
  return next;
};

export const getDashboardData = async (userId: string): Promise<DashboardData> => {
  const supabase = getSupabaseAdmin();

  const [accountsRes, categoriesRes, fundsRes, autoRes, recurringRes, transactionsRes, alertsRes] =
    await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name", { ascending: true }),
      supabase.from("savings_funds").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("savings_auto_deposits").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("recurring_rules").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(30),
      supabase.from("alerts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);

  const responses = [accountsRes, categoriesRes, fundsRes, autoRes, recurringRes, transactionsRes, alertsRes];

  for (const response of responses) {
    if (response.error) {
      throw new Error(`Error consultando base de datos: ${response.error.message}`);
    }
  }

  const accounts = (accountsRes.data ?? []).map((row) => mapAccount(row as RowRecord));
  const categories = (categoriesRes.data ?? []).map((row) => mapCategory(row as RowRecord));
  const savingsFunds = (fundsRes.data ?? []).map((row) => mapSavingsFund(row as RowRecord));
  const savingsAutoDeposits = (autoRes.data ?? []).map((row) => mapSavingsAutoDeposit(row as RowRecord));
  const recurringRules = (recurringRes.data ?? []).map((row) => mapRecurringRule(row as RowRecord));
  const transactions = (transactionsRes.data ?? []).map((row) => mapTransaction(row as RowRecord));
  const alerts = (alertsRes.data ?? []).map((row) => mapAlert(row as RowRecord));

  const available = accounts
    .filter((account) => account.kind !== "credit")
    .reduce((sum, account) => sum + account.balance, 0);
  const saved = savingsFunds.reduce((sum, fund) => sum + fund.currentAmount, 0);
  const pendingCreditDebt = accounts
    .filter((account) => account.kind === "credit")
    .reduce((sum, account) => sum + account.creditDebt, 0);

  return {
    summary: {
      available,
      saved,
      total: available + saved,
      pendingCreditDebt,
    },
    accounts,
    categories,
    savingsFunds,
    savingsAutoDeposits,
    recurringRules,
    transactions,
    alerts,
  };
};

export const createAccount = async (payload: {
  userId: string;
  name: string;
  kind: AccountKind;
  bank?: string | null;
  initialBalance?: number;
  statementDay?: number | null;
  paymentDueDay?: number | null;
}) => {
  const supabase = getSupabaseAdmin();

  const name = payload.name.trim();
  if (!name) {
    throw new Error("Nombre de cuenta obligatorio.");
  }

  const initialBalance = parseNonNegativeInteger(payload.initialBalance ?? 0, "Saldo inicial");

  if (payload.kind === "credit") {
    if (payload.statementDay && (payload.statementDay < 1 || payload.statementDay > 28)) {
      throw new Error("El día de facturación debe estar entre 1 y 28.");
    }
    if (payload.paymentDueDay && (payload.paymentDueDay < 1 || payload.paymentDueDay > 28)) {
      throw new Error("El día de vencimiento debe estar entre 1 y 28.");
    }
  }

  const dataToInsert: Record<string, unknown> = {
    user_id: payload.userId,
    name,
    kind: payload.kind,
    bank: payload.bank?.trim() ? payload.bank.trim() : null,
    currency: "CLP",
    balance: payload.kind === "credit" ? 0 : initialBalance,
    credit_debt: payload.kind === "credit" ? initialBalance : 0,
    statement_day: payload.kind === "credit" ? (payload.statementDay ?? null) : null,
    payment_due_day: payload.kind === "credit" ? (payload.paymentDueDay ?? null) : null,
  };

  const { error } = await supabase.from("accounts").insert(dataToInsert);

  if (error) {
    throw new Error(`No se pudo crear la cuenta: ${error.message}`);
  }
};

export const createManualTransaction = async (payload: {
  userId: string;
  accountId: string;
  type: "income" | "expense";
  amount: number;
  categoryId?: string | null;
  description?: string | null;
  occurredAt?: string;
}) => {
  const supabase = getSupabaseAdmin();

  const amount = parsePositiveInteger(payload.amount, "Monto");
  const account = await getAccount(payload.accountId);

  if (account.userId !== payload.userId) {
    throw new Error("No tienes permiso para operar en esta cuenta.");
  }

  await applyMovementToAccount(account, payload.type, amount);

  const { error } = await supabase.from("transactions").insert({
    user_id: payload.userId,
    account_id: payload.accountId,
    type: payload.type,
    amount,
    category_id: payload.categoryId ?? null,
    description: payload.description?.trim() || null,
    occurred_at: payload.occurredAt ?? toIsoDate(new Date()),
    currency: "CLP",
    origin: "manual",
  });

  if (error) {
    await reverseMovementFromAccount(await getAccount(payload.accountId), payload.type, amount);
    throw new Error(`No se pudo registrar movimiento: ${error.message}`);
  }
};

export const updateManualTransaction = async (
  transactionId: string,
  payload: {
    userId: string;
    accountId: string;
    type: "income" | "expense";
    amount: number;
    categoryId?: string | null;
    description?: string | null;
    occurredAt?: string;
  },
) => {
  const supabase = getSupabaseAdmin();
  const nextAmount = parsePositiveInteger(payload.amount, "Monto");

  const { data: existingData, error: existingError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", payload.userId)
    .single();

  if (existingError || !existingData) {
    throw new Error("Movimiento no encontrado.");
  }

  const existing = mapTransaction(existingData as RowRecord);

  if (existing.origin !== "manual" || !isEditableMovementType(existing.type)) {
    throw new Error("Solo se pueden editar movimientos manuales de ingreso/gasto.");
  }
  const existingType = existing.type;

  const oldAccount = await getAccount(existing.accountId);
  await reverseMovementFromAccount(oldAccount, existingType, existing.amount);

  try {
    const nextAccount = await getAccount(payload.accountId);
    await applyMovementToAccount(nextAccount, payload.type, nextAmount);

    const { error } = await supabase
      .from("transactions")
      .update({
        account_id: payload.accountId,
        type: payload.type,
        amount: nextAmount,
        category_id: payload.categoryId ?? null,
        description: payload.description?.trim() || null,
        occurred_at: payload.occurredAt ?? existing.occurredAt,
      })
      .eq("id", transactionId)
      .eq("user_id", payload.userId);

    if (error) {
      throw new Error(`No se pudo editar movimiento: ${error.message}`);
    }
  } catch (error) {
    const rollbackAccount = await getAccount(existing.accountId);
    await applyMovementToAccount(rollbackAccount, existingType, existing.amount);

    throw error;
  }
};

export const deleteManualTransaction = async (
  transactionId: string,
  userId: string,
) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Movimiento no encontrado.");
  }

  const transaction = mapTransaction(data as RowRecord);

  if (transaction.origin !== "manual" || !isEditableMovementType(transaction.type)) {
    throw new Error("Solo se pueden eliminar movimientos manuales de ingreso/gasto.");
  }
  const transactionType = transaction.type;

  const account = await getAccount(transaction.accountId);
  await reverseMovementFromAccount(account, transactionType, transaction.amount);

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transaction.id)
    .eq("user_id", userId);

  if (deleteError) {
    await applyMovementToAccount(
      await getAccount(transaction.accountId),
      transactionType,
      transaction.amount,
    );

    throw new Error(`No se pudo eliminar movimiento: ${deleteError.message}`);
  }
};

export const createManualSavingsDeposit = async (payload: {
  userId: string;
  fundId: string;
  accountId: string;
  amount: number;
}) => {
  const supabase = getSupabaseAdmin();

  const amount = parsePositiveInteger(payload.amount, "Monto");

  const account = await getAccount(payload.accountId);
  if (account.kind === "credit") {
    throw new Error("El depósito debe salir de una cuenta disponible, no de crédito.");
  }
  if (account.userId !== payload.userId) {
    throw new Error("No tienes permiso para operar en esta cuenta.");
  }
  if (account.balance < amount) {
    throw new Error("Saldo insuficiente en la cuenta origen.");
  }

  const { data: fundData, error: fundError } = await supabase
    .from("savings_funds")
    .select("*")
    .eq("id", payload.fundId)
    .eq("user_id", payload.userId)
    .single();

  if (fundError || !fundData) {
    throw new Error("Fondo de ahorro no encontrado.");
  }

  const fund = mapSavingsFund(fundData as RowRecord);

  const { error: accountError } = await supabase
    .from("accounts")
    .update({ balance: account.balance - amount })
    .eq("id", account.id);

  if (accountError) {
    throw new Error("No se pudo descontar el saldo de la cuenta origen.");
  }

  const { error: fundError2 } = await supabase
    .from("savings_funds")
    .update({ current_amount: fund.currentAmount + amount })
    .eq("id", fund.id);

  if (fundError2) {
    await supabase
      .from("accounts")
      .update({ balance: account.balance })
      .eq("id", account.id);

    throw new Error("No se pudo actualizar el fondo de ahorro.");
  }

  const { error: transactionError } = await supabase.from("transactions").insert({
    user_id: payload.userId,
    account_id: account.id,
    type: "savings_deposit",
    amount,
    currency: "CLP",
    description: `Depósito manual a fondo ${fund.name}`,
    occurred_at: toIsoDate(new Date()),
    savings_fund_id: fund.id,
    origin: "system",
  });

  if (transactionError) {
    throw new Error("Depósito realizado pero no se pudo registrar la transacción.");
  }
};

export const createSavingsFund = async (payload: {
  userId: string;
  name: string;
  targetAmount: number;
  initialDeposit: number;
  initialAccountId?: string | null;
}) => {
  const supabase = getSupabaseAdmin();

  const name = payload.name.trim();
  if (!name) {
    throw new Error("Nombre del fondo obligatorio.");
  }

  const targetAmount = parsePositiveInteger(payload.targetAmount, "Meta");
  const initialDeposit = parseNonNegativeInteger(payload.initialDeposit, "Depósito inicial");

  if (initialDeposit > 0 && !payload.initialAccountId) {
    throw new Error("Debes seleccionar cuenta origen del depósito inicial.");
  }

  let sourceAccount: Account | null = null;
  if (initialDeposit > 0 && payload.initialAccountId) {
    sourceAccount = await getAccount(payload.initialAccountId);
    if (sourceAccount.kind === "credit") {
      throw new Error("El depósito inicial debe salir de una cuenta disponible, no de crédito.");
    }
    if (sourceAccount.balance < initialDeposit) {
      throw new Error("Saldo insuficiente para el depósito inicial.");
    }
  }

  const { data: insertedFund, error: fundError } = await supabase
    .from("savings_funds")
    .insert({
      user_id: payload.userId,
      name,
      target_amount: targetAmount,
      current_amount: initialDeposit,
      initial_deposit: initialDeposit,
      initial_account_id: payload.initialAccountId ?? null,
      currency: "CLP",
    })
    .select("id")
    .single();

  if (fundError || !insertedFund) {
    throw new Error(`No se pudo crear fondo de ahorro: ${fundError?.message ?? "error desconocido"}`);
  }

  const fundId = String(insertedFund.id);

  if (sourceAccount) {
    const { error: accountError } = await supabase
      .from("accounts")
      .update({ balance: sourceAccount.balance - initialDeposit })
      .eq("id", sourceAccount.id);

    if (accountError) {
      await supabase.from("savings_funds").delete().eq("id", fundId);
      throw new Error("No se pudo descontar el depósito inicial de la cuenta origen.");
    }

    const { error: movementError } = await supabase.from("transactions").insert({
      user_id: payload.userId,
      account_id: sourceAccount.id,
      type: "savings_deposit",
      amount: initialDeposit,
      currency: "CLP",
      description: `Depósito inicial fondo ${name}`,
      occurred_at: toIsoDate(new Date()),
      savings_fund_id: fundId,
      origin: "system",
    });

    if (movementError) {
      throw new Error("Fondo creado pero no se pudo registrar movimiento de depósito inicial.");
    }
  }

  return { id: fundId };
};

export const createSavingsAutoDeposit = async (payload: {
  userId: string;
  fundId: string;
  accountId: string;
  amount: number;
  dayOfMonth: number;
  startMonth?: string;
}) => {
  const supabase = getSupabaseAdmin();

  const amount = parsePositiveInteger(payload.amount, "Monto");
  const dayOfMonth = parsePositiveInteger(payload.dayOfMonth, "Día");

  if (dayOfMonth > 28) {
    throw new Error("El día debe estar entre 1 y 28 (inclusive).");
  }

  const account = await getAccount(payload.accountId);

  if (account.kind === "credit") {
    throw new Error("El depósito automático debe salir de una cuenta disponible, no de crédito.");
  }

  const startMonthDate = payload.startMonth ?? toIsoDate(addMonths(monthStart(), 1));

  const { error } = await supabase.from("savings_auto_deposits").insert({
    user_id: payload.userId,
    fund_id: payload.fundId,
    account_id: payload.accountId,
    amount,
    day_of_month: dayOfMonth,
    start_month: startMonthDate,
    is_active: true,
  });

  if (error) {
    throw new Error(`No se pudo crear depósito automático: ${error.message}`);
  }
};

export const payCreditCard = async (payload: {
  userId: string;
  creditAccountId: string;
  sourceAccountId: string;
  amount: number;
  occurredAt?: string;
}) => {
  const supabase = getSupabaseAdmin();

  const amount = parsePositiveInteger(payload.amount, "Monto");

  const creditAccount = await getAccount(payload.creditAccountId);
  const sourceAccount = await getAccount(payload.sourceAccountId);

  if (creditAccount.kind !== "credit") {
    throw new Error("La cuenta a pagar debe ser de crédito.");
  }

  if (sourceAccount.kind === "credit") {
    throw new Error("La cuenta de pago no puede ser de crédito.");
  }

  if (creditAccount.userId !== payload.userId || sourceAccount.userId !== payload.userId) {
    throw new Error("No tienes permiso para operar estas cuentas.");
  }

  if (sourceAccount.balance < amount) {
    throw new Error("Saldo insuficiente para pagar la tarjeta.");
  }

  if (creditAccount.creditDebt < amount) {
    throw new Error("El pago supera la deuda pendiente de la tarjeta.");
  }

  const { error: sourceError } = await supabase
    .from("accounts")
    .update({ balance: sourceAccount.balance - amount })
    .eq("id", sourceAccount.id);

  if (sourceError) {
    throw new Error("No se pudo descontar el pago de la cuenta origen.");
  }

  const { error: debtError } = await supabase
    .from("accounts")
    .update({ credit_debt: creditAccount.creditDebt - amount })
    .eq("id", creditAccount.id);

  if (debtError) {
    await supabase
      .from("accounts")
      .update({ balance: sourceAccount.balance })
      .eq("id", sourceAccount.id);

    throw new Error("No se pudo reducir deuda de la tarjeta.");
  }

  const occurredAt = payload.occurredAt ?? toIsoDate(new Date());

  const { error: transactionError } = await supabase.from("transactions").insert([
    {
      user_id: payload.userId,
      account_id: sourceAccount.id,
      type: "credit_payment",
      amount,
      currency: "CLP",
      description: `Pago tarjeta ${creditAccount.name}`,
      occurred_at: occurredAt,
      origin: "system",
    },
    {
      user_id: payload.userId,
      account_id: creditAccount.id,
      type: "credit_payment",
      amount,
      currency: "CLP",
      description: `Pago recibido desde ${sourceAccount.name}`,
      occurred_at: occurredAt,
      origin: "system",
    },
  ]);

  if (transactionError) {
    throw new Error("Pago aplicado, pero no se pudo registrar transacción de pago.");
  }
};

export const createRecurringRule = async (payload: {
  userId: string;
  name: string;
  type: RuleType;
  amount: number;
  accountId: string;
  categoryId?: string | null;
  frequency?: "monthly";
  dayOfMonth: number;
  nextRun?: string;
}) => {
  const supabase = getSupabaseAdmin();

  const amount = parsePositiveInteger(payload.amount, "Monto");
  const dayOfMonth = parsePositiveInteger(payload.dayOfMonth, "Día del mes");

  if (dayOfMonth > 28) {
    throw new Error("El día del mes debe estar entre 1 y 28.");
  }

  const { error } = await supabase.from("recurring_rules").insert({
    user_id: payload.userId,
    name: payload.name.trim(),
    type: payload.type,
    amount,
    account_id: payload.accountId,
    category_id: payload.categoryId ?? null,
    frequency: payload.frequency ?? "monthly",
    day_of_month: dayOfMonth,
    next_run: payload.nextRun ?? toIsoDate(new Date()),
    is_active: true,
  });

  if (error) {
    throw new Error(`No se pudo crear regla recurrente: ${error.message}`);
  }
};

export const runRecurringRules = async (runDate: string = toIsoDate(new Date())) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("is_active", true)
    .lte("next_run", runDate);

  if (error) {
    throw new Error(`No se pudo consultar reglas recurrentes: ${error.message}`);
  }

  const rules = (data ?? []).map((row) => mapRecurringRule(row as RowRecord));

  for (const rule of rules) {
    const account = await getAccount(rule.accountId);

    try {
      await applyMovementToAccount(account, rule.type, rule.amount);

      const { error: movementError } = await supabase.from("transactions").insert({
        user_id: rule.userId,
        account_id: rule.accountId,
        type: rule.type === "income" ? "recurring_income" : "recurring_expense",
        amount: rule.amount,
        currency: "CLP",
        category_id: rule.categoryId,
        description: `Movimiento recurrente: ${rule.name}`,
        occurred_at: runDate,
        recurring_rule_id: rule.id,
        origin: "system",
      });

      if (movementError) {
        throw new Error(movementError.message);
      }

      const nextScheduledRun = incrementRecurringDate(rule, new Date(runDate));

      const { error: updateRuleError } = await supabase
        .from("recurring_rules")
        .update({ next_run: toIsoDate(nextScheduledRun) })
        .eq("id", rule.id);

      if (updateRuleError) {
        throw new Error(updateRuleError.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      await createAlert(
        rule.userId,
        "recurring_failed",
        "Regla recurrente no ejecutada",
        `No se pudo ejecutar '${rule.name}': ${message}`,
      );
    }
  }

  await runSavingsAutoDeposits(runDate);
};

const runSavingsAutoDeposits = async (runDate: string) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("savings_auto_deposits")
    .select("*")
    .eq("is_active", true)
    .lte("start_month", runDate);

  if (error) {
    throw new Error(`No se pudo consultar depósitos automáticos: ${error.message}`);
  }

  const entries = (data ?? []).map((row) => mapSavingsAutoDeposit(row as RowRecord));
  const runDateParsed = new Date(runDate);

  for (const entry of entries) {
    if (runDateParsed.getDate() !== entry.dayOfMonth) {
      continue;
    }

    const account = await getAccount(entry.accountId);

    if (account.balance < entry.amount) {
      await createAlert(
        entry.userId,
        "savings_auto_deposit_failed",
        "Depósito automático no ejecutado",
        `No hay saldo suficiente para depositar ${entry.amount} en un fondo de ahorro.`,
      );
      continue;
    }

    const { data: fundData, error: fundError } = await supabase
      .from("savings_funds")
      .select("*")
      .eq("id", entry.fundId)
      .single();

    if (fundError || !fundData) {
      await createAlert(
        entry.userId,
        "savings_auto_deposit_failed",
        "Depósito automático no ejecutado",
        "No se encontró fondo de ahorro para el depósito automático.",
      );
      continue;
    }

    const fund = mapSavingsFund(fundData as RowRecord);

    const { error: accountUpdateError } = await supabase
      .from("accounts")
      .update({ balance: account.balance - entry.amount })
      .eq("id", account.id);

    if (accountUpdateError) {
      await createAlert(
        entry.userId,
        "savings_auto_deposit_failed",
        "Depósito automático no ejecutado",
        `No se pudo descontar saldo de '${account.name}' para fondo '${fund.name}': ${accountUpdateError.message}`,
      );
      continue;
    }

    const { error: fundUpdateError } = await supabase
      .from("savings_funds")
      .update({ current_amount: fund.currentAmount + entry.amount })
      .eq("id", fund.id);

    if (fundUpdateError) {
      const { error: rollbackError } = await supabase
        .from("accounts")
        .update({ balance: account.balance })
        .eq("id", account.id);

      const rollbackMessage = rollbackError
        ? ` Además falló el rollback en cuenta: ${rollbackError.message}.`
        : "";

      await createAlert(
        entry.userId,
        "savings_auto_deposit_failed",
        "Depósito automático no ejecutado",
        `No se pudo actualizar fondo '${fund.name}': ${fundUpdateError.message}.${rollbackMessage}`,
      );

      continue;
    }

    await supabase.from("transactions").insert({
      user_id: entry.userId,
      account_id: account.id,
      type: "savings_deposit",
      amount: entry.amount,
      currency: "CLP",
      description: `Depósito automático a fondo ${fund.name}`,
      occurred_at: runDate,
      savings_fund_id: fund.id,
      origin: "system",
    });
  }
};

export const markAlertAsRead = async (alertId: string, userId: string) => {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("alerts")
    .update({ is_read: true })
    .eq("id", alertId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`No se pudo marcar alerta como leída: ${error.message}`);
  }
};

export const getAccountById = async (accountId: string, userId: string) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Cuenta no encontrada.");
  }

  return mapAccount(data as RowRecord);
};

export const updateSavingsFund = async (payload: {
  userId: string;
  fundId: string;
  name?: string;
  targetAmount?: number;
}) => {
  const supabase = getSupabaseAdmin();

  const { data: existingFund, error: existingError } = await supabase
    .from("savings_funds")
    .select("*")
    .eq("id", payload.fundId)
    .eq("user_id", payload.userId)
    .single();

  if (existingError || !existingFund) {
    throw new Error("Fondo de ahorro no encontrado.");
  }

  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) throw new Error("Nombre del fondo obligatorio.");
    updates.name = trimmed;
  }

  if (payload.targetAmount !== undefined) {
    updates.target_amount = parsePositiveInteger(payload.targetAmount, "Meta");
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("savings_funds")
    .update(updates)
    .eq("id", payload.fundId)
    .eq("user_id", payload.userId);

  if (error) {
    throw new Error(`No se pudo actualizar el fondo: ${error.message}`);
  }
};

export const deleteSavingsFund = async (fundId: string, userId: string) => {
  const supabase = getSupabaseAdmin();

  const { data: fundData, error: fundError } = await supabase
    .from("savings_funds")
    .select("*")
    .eq("id", fundId)
    .eq("user_id", userId)
    .single();

  if (fundError || !fundData) {
    throw new Error("Fondo de ahorro no encontrado.");
  }

  const fund = mapSavingsFund(fundData as RowRecord);

  if (fund.currentAmount > 0 && fund.initialAccountId) {
    const account = await getAccount(fund.initialAccountId);

    if (account.userId !== userId) {
      throw new Error("No tienes permiso para operar esta cuenta.");
    }

    if (account.kind !== "credit") {
      const { error: accountError } = await supabase
        .from("accounts")
        .update({ balance: account.balance + fund.currentAmount })
        .eq("id", account.id);

      if (accountError) {
        throw new Error("No se pudo liberar el saldo del fondo.");
      }

      const { error: transactionError } = await supabase.from("transactions").insert({
        user_id: userId,
        account_id: account.id,
        type: "income",
        amount: fund.currentAmount,
        currency: "CLP",
        description: `Liberación de fondo de ahorro: ${fund.name}`,
        occurred_at: toIsoDate(new Date()),
        savings_fund_id: fund.id,
        origin: "system",
      });

      if (transactionError) {
        throw new Error("Saldo liberado pero no se pudo registrar la transacción.");
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("savings_funds")
    .delete()
    .eq("id", fund.id)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`No se pudo eliminar el fondo: ${deleteError.message}`);
  }
};

export const updateAccount = async (payload: {
  userId: string;
  accountId: string;
  name?: string;
  bank?: string | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
}) => {
  const supabase = getSupabaseAdmin();

  const existing = await getAccountById(payload.accountId, payload.userId);

  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) throw new Error("Nombre de cuenta obligatorio.");
    updates.name = trimmed;
  }

  if (payload.bank !== undefined) {
    updates.bank = payload.bank?.trim() ? payload.bank.trim() : null;
  }

  if (existing.kind === "credit") {
    if (payload.statementDay !== undefined) {
      if (payload.statementDay !== null && (payload.statementDay < 1 || payload.statementDay > 28)) {
        throw new Error("El día de facturación debe estar entre 1 y 28.");
      }
      updates.statement_day = payload.statementDay;
    }
    if (payload.paymentDueDay !== undefined) {
      if (payload.paymentDueDay !== null && (payload.paymentDueDay < 1 || payload.paymentDueDay > 28)) {
        throw new Error("El día de vencimiento debe estar entre 1 y 28.");
      }
      updates.payment_due_day = payload.paymentDueDay;
    }
  }

  if (Object.keys(updates).length === 0) return existing;

  const { error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", payload.accountId)
    .eq("user_id", payload.userId);

  if (error) {
    throw new Error(`No se pudo actualizar la cuenta: ${error.message}`);
  }

  return getAccountById(payload.accountId, payload.userId);
};
