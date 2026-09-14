"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
}

const groupDigits = (digits: string) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Campo de monto en CLP.
 *
 * Reemplaza a <input type="number">, que dibuja las flechas del sistema, deja
 * escribir decimales y notación científica, y muestra "1850000" sin separar.
 * Aquí solo entran dígitos, se agrupan de a miles mientras se escribe y el
 * valor que sale sigue siendo un entero en texto plano.
 */
export function MoneyInput({ value, onChange, id, placeholder = "0", required, disabled, ...rest }: Props) {
  const digits = value.replace(/\D/g, "");

  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
        $
      </span>
      <input
        id={id}
        aria-describedby={rest["aria-describedby"]}
        // inputMode numérico abre el teclado de números en móvil sin heredar
        // el comportamiento de type="number".
        inputMode="numeric"
        autoComplete="off"
        required={required}
        disabled={disabled}
        value={digits ? groupDigits(digits) : ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-7 pr-3.5 text-sm tabular-nums text-zinc-900 transition-colors placeholder:text-zinc-400 hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-600"
      />
    </div>
  );
}
