"use client";

import * as RadixSelect from "@radix-ui/react-select";

export interface SelectOption {
  value: string;
  label: string;
  /** Dato secundario (saldo, deuda…). Nunca se concatena al label. */
  hint?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

/**
 * Reemplaza al <select> nativo, que se renderiza con el estilo del sistema.
 *
 * El disparador es SIEMPRE de una línea: el label se trunca y el dato
 * secundario (`hint`) va aparte, alineado a la derecha y sin encogerse. Antes
 * el monto se concatenaba dentro del label ("Cuenta Corriente · $1.850.000") y
 * con cifras largas el control saltaba a dos líneas.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecciona una opción",
  id,
  name,
  required,
  disabled,
  className = "",
  ...rest
}: SelectProps) {
  const selected = options.find((o) => o.value === value);

  return (
    <RadixSelect.Root value={value} onValueChange={onChange} name={name} required={required} disabled={disabled}>
      <RadixSelect.Trigger
        id={id}
        aria-describedby={rest["aria-describedby"]}
        className={`flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-left text-sm text-zinc-900 transition-colors hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-600 ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">
          <RadixSelect.Value placeholder={<span className="text-zinc-400">{placeholder}</span>} />
        </span>
        {selected?.hint && (
          <span className="shrink-0 text-xs tabular-nums text-zinc-400">{selected.hint}</span>
        )}
        <RadixSelect.Icon asChild>
          <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-[90] max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl data-[state=closed]:animate-[selectOut_120ms_ease-in] data-[state=open]:animate-[selectIn_180ms_cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 dark:bg-zinc-900"
        >
          <RadixSelect.ScrollUpButton className="flex h-6 items-center justify-center text-zinc-400">
            <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </RadixSelect.ScrollUpButton>

          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg py-2 pl-3 pr-9 text-sm text-zinc-700 outline-none transition-colors data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700 dark:text-zinc-200 dark:data-[highlighted]:bg-emerald-950/40 dark:data-[highlighted]:text-emerald-400"
              >
                <RadixSelect.ItemText>
                  <span className="truncate">{option.label}</span>
                </RadixSelect.ItemText>
                {option.hint && (
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-400">{option.hint}</span>
                )}
                <RadixSelect.ItemIndicator className="absolute right-3 inline-flex">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>

          <RadixSelect.ScrollDownButton className="flex h-6 items-center justify-center text-zinc-400">
            <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
