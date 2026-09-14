"use client";

import { useState } from "react";
import { Account, SavingsFund } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormBody } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";

interface Props {
  fund: SavingsFund;
  nonCreditAccounts: Account[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditSavingsModal({ fund, nonCreditAccounts, onClose, onUpdated }: Props) {
  const [name, setName] = useState(fund.name);
  const [targetAmount, setTargetAmount] = useState(String(fund.targetAmount));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "info" | "deposit" | "auto" | "delete">(null);
  const confirm = useConfirm();

  const [depositAccountId, setDepositAccountId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  const [autoAccountId, setAutoAccountId] = useState("");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoDay, setAutoDay] = useState("1");

  const progressPercent =
    fund.targetAmount > 0 ? Math.round((fund.currentAmount / fund.targetAmount) * 100) : 0;

  const infoChanged = name !== fund.name || String(fund.targetAmount) !== targetAmount;

  const run = async (
    kind: "info" | "deposit" | "auto" | "delete",
    action: () => Promise<unknown>,
    successMessage: string,
    closeAfter = false,
  ) => {
    setError(null);
    setNotice(null);
    setBusy(kind);
    try {
      await action();
      onUpdated();
      if (closeAfter) {
        onClose();
      } else {
        setNotice(successMessage);
      }
    } catch (err) {
      setError(errorMessage(err, "No se pudo completar la acción."));
    } finally {
      setBusy(null);
    }
  };

  const saveInfo = () =>
    run(
      "info",
      () =>
        requestJson(`/api/savings/funds/${fund.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, targetAmount: Number(targetAmount) }),
        }),
      "Datos del fondo actualizados.",
    );

  const addDeposit = () =>
    run(
      "deposit",
      async () => {
        await requestJson("/api/savings/deposits", {
          method: "POST",
          body: JSON.stringify({
            fundId: fund.id,
            accountId: depositAccountId,
            amount: Number(depositAmount),
          }),
        });
        setDepositAccountId("");
        setDepositAmount("");
      },
      "Depósito registrado.",
    );

  const addAutoDeposit = () =>
    run(
      "auto",
      async () => {
        await requestJson("/api/savings/auto-deposits", {
          method: "POST",
          body: JSON.stringify({
            fundId: fund.id,
            accountId: autoAccountId,
            amount: Number(autoAmount),
            dayOfMonth: Number(autoDay),
          }),
        });
        setAutoAccountId("");
        setAutoAmount("");
        setAutoDay("1");
      },
      "Depósito automático creado.",
    );

  const deleteFund = async () => {
    const ok = await confirm({
      title: `¿Eliminar "${fund.name}"?`,
      description:
        fund.currentAmount > 0
          ? `Se liberarán ${formatClp(fund.currentAmount)} a la cuenta original.`
          : "Este fondo no tiene saldo guardado.",
    });
    if (!ok) return;
    return run(
      "delete",
      () => requestJson(`/api/savings/funds/${fund.id}`, { method: "DELETE" }),
      "",
      true,
    );
  };

  const depositValid = Boolean(depositAccountId) && Number(depositAmount) > 0;
  const autoValid = Boolean(autoAccountId) && Number(autoAmount) > 0 && Number(autoDay) >= 1;
  const anyBusy = busy !== null;

  return (
    <Modal title="Editar fondo" onClose={onClose}>
      <FormBody>
        {error && (
          <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            {notice}
          </div>
        )}

        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-zinc-900 dark:text-white">{fund.name}</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatClp(fund.currentAmount)}
            </span>
          </div>
          <ProgressBar
            className="mb-2"
            value={fund.currentAmount}
            max={fund.targetAmount}
            label={`Progreso de ${fund.name}`}
          />
          <p className="text-right text-xs text-zinc-400">
            {progressPercent}% · Meta: {formatClp(fund.targetAmount)}
          </p>
        </div>

        {/*
          Antes un solo boton "Guardar cambios" disparaba en cadena la edicion,
          el deposito manual y el deposito automatico. Si habias escrito algo en
          "Agregar deposito" mientras solo querias renombrar el fondo, se movia
          plata sin querer; y si el segundo paso fallaba, el primero ya estaba
          aplicado. Ahora cada bloque se confirma por separado.
        */}
        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Información del fondo
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              {(props) => (
                <input {...props} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
              )}
            </Field>
            <Field label="Meta">
              {(props) => (
                <MoneyInput {...props} value={targetAmount} onChange={setTargetAmount} required />
              )}
            </Field>
          </div>
          <Button size="sm" variant="primary" className="mt-3" onClick={saveInfo} disabled={anyBusy || !infoChanged || !name.trim() || Number(targetAmount) <= 0}>
            {busy === "info" ? "Guardando..." : "Guardar información"}
          </Button>
        </section>

        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Agregar depósito
          </h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Cuenta origen">
              {(props) => (
                <Select
                  {...props}
                  value={depositAccountId}
                  onChange={setDepositAccountId}
                  placeholder="Selecciona una cuenta"
                  options={nonCreditAccounts.map((a) => ({ value: a.id, label: a.name, hint: formatClp(a.balance) }))}
                />
              )}
            </Field>
            <Field label="Monto" className="sm:w-40">
              {(props) => (
                <MoneyInput {...props} value={depositAmount} onChange={setDepositAmount} />
              )}
            </Field>
          </div>
          <Button size="sm" variant="primary" className="mt-3" onClick={addDeposit} disabled={anyBusy || !depositValid}>
            {busy === "deposit" ? "Depositando..." : "Depositar"}
          </Button>
        </section>

        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Depósito automático mensual
          </h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Cuenta origen">
              {(props) => (
                <Select
                  {...props}
                  value={autoAccountId}
                  onChange={setAutoAccountId}
                  placeholder="Selecciona una cuenta"
                  options={nonCreditAccounts.map((a) => ({ value: a.id, label: a.name, hint: formatClp(a.balance) }))}
                />
              )}
            </Field>
            <Field label="Monto" className="sm:w-36">
              {(props) => (
                <MoneyInput {...props} value={autoAmount} onChange={setAutoAmount} />
              )}
            </Field>
            <Field label="Día" className="sm:w-20">
              {(props) => (
                <input {...props} className={inputClass} inputMode="numeric" value={autoDay} onChange={(e) => setAutoDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />
              )}
            </Field>
          </div>
          <Button size="sm" variant="primary" className="mt-3" onClick={addAutoDeposit} disabled={anyBusy || !autoValid}>
            {busy === "auto" ? "Creando..." : "Crear depósito automático"}
          </Button>
        </section>
      </FormBody>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Button variant="danger-ghost" onClick={deleteFund} disabled={anyBusy}>
          {busy === "delete" ? "Eliminando..." : "Eliminar fondo"}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}
