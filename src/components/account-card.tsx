"use client";

import Link from "next/link";
import { Account } from "@/lib/types";
import { formatClp } from "@/lib/utils";

interface AccountCardProps {
  account: Account;
}

const kindGradients: Record<string, string> = {
  credit: "from-indigo-600 to-purple-700",
  debit: "from-emerald-500 to-teal-600",
  cash: "from-amber-500 to-orange-600",
  checking: "from-blue-500 to-indigo-600",
};

const kindLabels: Record<string, string> = {
  credit: "Crédito",
  debit: "Débito",
  cash: "Efectivo",
  checking: "Corriente",
};

function generateFakeCardNumber(id: string): string {
  const hash = id.replace(/-/g, "").slice(0, 16).padEnd(16, "0");
  const groups = hash.match(/.{1,4}/g) || [];
  return groups.map((g) => `****`).join(" ");
}

function generateFakeExpiry(): string {
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const year = String(new Date().getFullYear() + 1 + Math.floor(Math.random() * 4)).slice(2);
  return `${month}/${year}`;
}

export function AccountCard({ account }: AccountCardProps) {
  const gradient = kindGradients[account.kind] || "from-zinc-500 to-zinc-600";
  const label = kindLabels[account.kind] || account.kind;
  const fakeNumber = generateFakeCardNumber(account.id);
  const fakeExpiry = generateFakeExpiry();

  return (
    <Link
      href={`/tarjetas/${account.id}`}
      className={`cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}
    >
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
      <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 rounded-full bg-black/10" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            {label}
          </span>
          {account.bank && (
            <span className="text-xs font-medium text-white/70">
              {account.bank}
            </span>
          )}
        </div>

        <p className="mb-4 font-mono text-lg tracking-widest">
          {fakeNumber}
        </p>

        <div className="mb-4 flex items-center justify-between text-xs text-white/70">
          <div>
            <p className="text-[10px] uppercase">Titular</p>
            <p className="font-medium text-white">{account.name}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase">Vence</p>
            <p className="font-medium text-white">{fakeExpiry}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/20 pt-3">
          {account.kind === "credit" ? (
            <div>
              <p className="text-[10px] uppercase text-white/70">Deuda</p>
              <p className="font-semibold">{formatClp(account.creditDebt)}</p>
              {(account.statementDay || account.paymentDueDay) && (
                <div className="mt-1 flex gap-2 text-[10px] text-white/60">
                  {account.statementDay && <span>Cierre día {account.statementDay}</span>}
                  {account.paymentDueDay && <span>Vence día {account.paymentDueDay}</span>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[10px] uppercase text-white/70">Saldo</p>
              <p className="font-semibold">{formatClp(account.balance)}</p>
            </div>
          )}
          <div className="h-8 w-12 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <div className="h-6 w-8 rounded border border-white/40" />
          </div>
        </div>
      </div>
    </Link>
  );
}
