"use client";

import Link from "next/link";
import { Account } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { TiltHandlers, useTilt } from "@/components/ui/tilt";

interface AccountCardProps {
  account: Account;
  /** Si viene, la tarjeta abre el detalle en un modal en vez de navegar. */
  onSelect?: () => void;
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

const MASKED_GROUP = "****";

/** Los 4 dígitos son opcionales; sin ellos la tarjeta se ve igual de completa. */
const maskedNumber = (last4: string | null) =>
  `${MASKED_GROUP} ${MASKED_GROUP} ${MASKED_GROUP} ${last4 ?? MASKED_GROUP}`;

// Derivado del id para que sea estable entre servidor y cliente (Math.random()
// aqui provocaba un hydration mismatch y un valor distinto en cada render).
function decorativeExpiry(id: string): string {
  const seed = id.replace(/[^0-9a-f]/gi, "").slice(0, 8) || "0";
  const n = parseInt(seed, 16) || 0;
  const month = String((n % 12) + 1).padStart(2, "0");
  const year = String(new Date().getFullYear() + 1 + (n % 4)).slice(2);
  return `${month}/${year}`;
}

export function AccountCard({ account, onSelect }: AccountCardProps) {
  const gradient = kindGradients[account.kind] || "from-zinc-500 to-zinc-600";
  const label = kindLabels[account.kind] || account.kind;
  const expiry = decorativeExpiry(account.id);
  const tilt = useTilt();

  return (
    <Wrapper
      account={account}
      onSelect={onSelect}
      tilt={tilt}
      className={`card-tilt group block w-full cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-left text-white shadow-lg hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-black`}
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

        {/* Decorativo: el dato util ya va en el aria-label del contenedor. */}
        <p aria-hidden="true" className="mb-4 font-mono text-lg tracking-widest">
          {maskedNumber(account.last4)}
        </p>

        <div className="mb-4 flex items-center justify-between text-xs text-white/70">
          <div>
            <p className="text-[10px] uppercase">Titular</p>
            <p className="font-medium text-white">{account.name}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase">Vence</p>
            <p className="font-medium text-white">{expiry}</p>
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
          <div className="h-8 w-12 rounded bg-white/20 backdrop-blur-sm transition-colors duration-[240ms] group-hover:bg-white/30 flex items-center justify-center">
            <div className="h-6 w-8 rounded border border-white/40" />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

/**
 * Botón cuando el detalle se abre en modal; enlace cuando no hay handler, para
 * que la vista completa siga siendo navegable (y compartible por URL).
 */
function Wrapper({
  account,
  onSelect,
  className,
  tilt,
  children,
}: {
  account: Account;
  onSelect?: () => void;
  className: string;
  tilt: TiltHandlers;
  children: React.ReactNode;
}) {
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} aria-label={describe(account)} className={className} {...tilt}>
        {children}
      </button>
    );
  }
  return (
    <Link href={`/tarjetas/${account.id}`} aria-label={describe(account)} className={className} {...tilt}>
      {children}
    </Link>
  );
}

const describe = (account: Account) =>
  account.last4
    ? `Ver detalle de ${account.name}, terminada en ${account.last4}`
    : `Ver detalle de ${account.name}`;
