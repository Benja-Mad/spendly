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
  name: String(row.name),
  kind: row.kind as AccountKind,
  bank: (row.bank as string | null) ?? null,
  currency: "CLP",
  balance: Number(row.balance),
  creditDebt: Number(row.credit_debt),
});

const mapCategory = (row: RowRecord): Category => ({
  id: String(row.id),
  name: String(row.name),
  type: row.type as RuleType,
  isSystem: Boolean(row.is_system),
});

const mapSavingsFund = (row: RowRecord): SavingsFund => ({
  id: String(row.id),
  name: String(row.name),
  targetAmount: Number(row.target_amount),
  currentAmount: Number(row.current_amount),
  initialDeposit: Number(row.initial_deposit),
  initialAccountId: (row.initial_account_id as string | null) ?? null,
  currency: "CLP",
});

const mapSavingsAutoDeposit = (row: RowRecord): SavingsAutoDeposit => ({
  id: String(row.id),
  fundId: String(row.fund_id),
  accountId: String(row.account_id),
  amount: Number(row.amount),
  dayOfMonth: Number(row.day_of_month),
  startMonth: String(row.start_month),
  isActive: Boolean(row.is_active),
});

const mapRecurringRule = (row: RowRecord): RecurringRule => ({
  id: String(row.id),
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

const mapTransaction = (row: RowRecord): Transaction => ({
  id: String(row.id),
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
  kind: String(row.kind),
  title: String(row.title),
  body: String(row.body),
  isRead: Boolean(row.is_read),
  createdAt: String(row.created_at),
});

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

const createAlert = async (kind: string, title: string, body: string) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("alerts").insert({ kind, title, body });

  if (error) {
    throw new Error("No se pudo crear la alerta in-app.");
  }
};

const frequencyDeltaDays = (frequency: RecurringRule["frequency"]) => {
  if (frequency === "weekly") return 7;
  if (frequency === "biweekly") return 14;
  return 30;
};

const incrementRecurringDate = (rule: RecurringRule, fromDate: Date) => {
  if (rule.frequency === "monthly") {
    const base = addMonths(fromDate, 1);
    const day = Math.min(rule.dayOfMonth ?? 1, 28);
    return new Date(base.getFullYear(), base.getMonth(), day);
  }

  const delta = frequencyDeltaDays(rule.frequency);
  const next = new Date(fromDate);
  next.setDate(next.getDate() + delta);
  return next;
};

export const getDashboardData = async (): Promise<DashboardData> => {
  const supabase = getSupabaseAdmin();

  const [accountsRes, categoriesRes, fundsRes, autoRes, recurringRes, transactionsRes, alertsRes] =
    await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name", { ascending: true }),
      supabase.from("savings_funds").select("*").order("created_at", { ascending: false }),
      supabase.from("savings_auto_deposits").select("*").order("created_at", { ascending: false }),
      supabase.from("recurring_rules").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("occurred_at", { ascending: false }).limit(30),
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(20),
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
  name: string;
  kind: AccountKind;
  bank?: string | null;
  initialBalance?: number;
}) => {
  const supabase = getSupabaseAdmin();

  const name = payload.name.trim();
  if (!name) {
    throw new Error("Nombre de cuenta obligatorio.");
  }

  const initialBalance = parseNonNegativeInteger(payload.initialBalance ?? 0, "Saldo inicial");

  const dataToInsert = {
    name,
    kind: payload.kind,
    bank: payload.bank?.trim() ? payload.bank.trim() : null,
    currency: "CLP",
    balance: payload.kind === "credit" ? 0 : initialBalance,
    credit_debt: payload.kind === "credit" ? initialBalance : 0,
  };

  const { error } = await supabase.from("accounts").insert(dataToInsert);

  if (error) {
    throw new Error(`No se pudo crear la cuenta: ${error.message}`);
  }
};

export const createManualTransaction = async (payload: {
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

  await applyMovementToAccount(account, payload.type, amount);

  const { error } = await supabase.from("transactions").insert({
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
    .single();

  if (existingError || !existingData) {
    throw new Error("Movimiento no encontrado.");
  }

  const existing = mapTransaction(existingData as RowRecord);

  if (existing.origin !== "manual" || !["income", "expense"].includes(existing.type)) {
    throw new Error("Solo se pueden editar movimientos manuales de ingreso/gasto.");
  }

  const oldAccount = await getAccount(existing.accountId);
  await reverseMovementFromAccount(oldAccount, existing.type as "income" | "expense", existing.amount);

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
      .eq("id", transactionId);

    if (error) {
      throw new Error(`No se pudo editar movimiento: ${error.message}`);
    }
  } catch (error) {
    const rollbackAccount = await getAccount(existing.accountId);
    await applyMovementToAccount(
      rollbackAccount,
      existing.type as "income" | "expense",
      existing.amount,
    );

    throw error;
  }
};

export const deleteManualTransaction = async (transactionId: string) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error || !data) {
    throw new Error("Movimiento no encontrado.");
  }

  const transaction = mapTransaction(data as RowRecord);

  if (transaction.origin !== "manual" || !["income", "expense"].includes(transaction.type)) {
    throw new Error("Solo se pueden eliminar movimientos manuales de ingreso/gasto.");
  }

  const account = await getAccount(transaction.accountId);
  await reverseMovementFromAccount(account, transaction.type as "income" | "expense", transaction.amount);

  const { error: deleteError } = await supabase.from("transactions").delete().eq("id", transaction.id);

  if (deleteError) {
    await applyMovementToAccount(
      await getAccount(transaction.accountId),
      transaction.type as "income" | "expense",
      transaction.amount,
    );

    throw new Error(`No se pudo eliminar movimiento: ${deleteError.message}`);
  }
};

export const createSavingsFund = async (payload: {
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

  if (sourceAccount) {
    const { error: accountError } = await supabase
      .from("accounts")
      .update({ balance: sourceAccount.balance - initialDeposit })
      .eq("id", sourceAccount.id);

    if (accountError) {
      await supabase.from("savings_funds").delete().eq("id", insertedFund.id);
      throw new Error("No se pudo descontar el depósito inicial de la cuenta origen.");
    }

    const { error: movementError } = await supabase.from("transactions").insert({
      account_id: sourceAccount.id,
      type: "savings_deposit",
      amount: initialDeposit,
      currency: "CLP",
      description: `Depósito inicial fondo ${name}`,
      occurred_at: toIsoDate(new Date()),
      savings_fund_id: insertedFund.id,
      origin: "system",
    });

    if (movementError) {
      throw new Error("Fondo creado pero no se pudo registrar movimiento de depósito inicial.");
    }
  }
};

export const createSavingsAutoDeposit = async (payload: {
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
    throw new Error("El día debe estar entre 1 y 28.");
  }

  const account = await getAccount(payload.accountId);

  if (account.kind === "credit") {
    throw new Error("El depósito automático debe salir de una cuenta disponible, no de crédito.");
  }

  const startMonth = payload.startMonth ?? toIsoDate(addMonths(monthStart(), 1));

  const { error } = await supabase.from("savings_auto_deposits").insert({
    fund_id: payload.fundId,
    account_id: payload.accountId,
    amount,
    day_of_month: dayOfMonth,
    start_month: startMonth,
    is_active: true,
  });

  if (error) {
    throw new Error(`No se pudo crear depósito automático: ${error.message}`);
  }
};

export const payCreditCard = async (payload: {
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
      account_id: sourceAccount.id,
      type: "credit_payment",
      amount,
      currency: "CLP",
      description: `Pago tarjeta ${creditAccount.name}`,
      occurred_at: occurredAt,
      origin: "system",
    },
    {
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

      const nextRunDate = incrementRecurringDate(rule, new Date(runDate));

      const { error: updateRuleError } = await supabase
        .from("recurring_rules")
        .update({ next_run: toIsoDate(nextRunDate) })
        .eq("id", rule.id);

      if (updateRuleError) {
        throw new Error(updateRuleError.message);
      }
    } catch {
      await createAlert(
        "recurring_failed",
        "Regla recurrente no ejecutada",
        `No se pudo ejecutar '${rule.name}' por saldo insuficiente o error de datos.`,
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

    if (account.kind === "credit" || account.balance < entry.amount) {
      await createAlert(
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
      continue;
    }

    const { error: fundUpdateError } = await supabase
      .from("savings_funds")
      .update({ current_amount: fund.currentAmount + entry.amount })
      .eq("id", fund.id);

    if (fundUpdateError) {
      await supabase
        .from("accounts")
        .update({ balance: account.balance })
        .eq("id", account.id);

      continue;
    }

    await supabase.from("transactions").insert({
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

export const markAlertAsRead = async (alertId: string) => {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", alertId);

  if (error) {
    throw new Error(`No se pudo marcar alerta como leída: ${error.message}`);
  }
};
