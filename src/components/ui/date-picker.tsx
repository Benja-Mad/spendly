"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { formatDate } from "@/lib/format";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
// La semana chilena empieza el lunes.
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "YYYY-MM-DD" a Date local (new Date(iso) lo interpreta como UTC y corre un día). */
const fromIso = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

interface Props {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  "aria-describedby"?: string;
}

/**
 * Calendario propio. <input type="date"> abre el datepicker del sistema
 * operativo, que ignora por completo la estética de la app y varía entre
 * navegadores.
 */
export function DatePicker({ value, onChange, id, ...rest }: Props) {
  const selected = value ? fromIso(value) : null;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => selected ?? new Date());

  const today = useMemo(() => {
    const d = new Date();
    return toIso(d);
  }, []);

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // getDay(): 0 = domingo. Se corre para que lunes sea la primera columna.
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: total }, (_, i) => new Date(year, month, i + 1)),
    ];
  }, [cursor]);

  const shift = (months: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + months, 1));

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          aria-describedby={rest["aria-describedby"]}
          className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-left text-sm transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
        >
          <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`min-w-0 flex-1 truncate ${selected ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`}>
            {selected ? formatDate(value) : "Hoy"}
          </span>
          {selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Quitar fecha"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); onChange(""); } }}
              className="shrink-0 rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[90] w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl data-[state=closed]:animate-[selectOut_120ms_ease-in] data-[state=open]:animate-[selectIn_180ms_cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} aria-label="Mes anterior" className="cursor-pointer rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span aria-live="polite" className="text-sm font-medium capitalize text-zinc-900 dark:text-white">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <button type="button" onClick={() => shift(1)} aria-label="Mes siguiente" className="cursor-pointer rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="py-1 text-[11px] font-medium text-zinc-400">{d}</span>
            ))}
            {days.map((day, i) => {
              if (!day) return <span key={`empty-${i}`} />;
              const iso = toIso(day);
              const isSelected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false); }}
                  aria-current={isToday ? "date" : undefined}
                  className={`h-8 cursor-pointer rounded-lg text-sm tabular-nums transition-colors ${
                    isSelected
                      ? "bg-emerald-600 font-medium text-white"
                      : isToday
                      ? "font-semibold text-emerald-600 hover:bg-zinc-100 dark:text-emerald-400 dark:hover:bg-zinc-800"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => { onChange(today); setOpen(false); }}
            className="mt-2 w-full cursor-pointer rounded-lg py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            Hoy
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
