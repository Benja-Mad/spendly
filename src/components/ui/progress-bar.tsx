export function ProgressBar({
  value,
  max,
  label,
  className = "",
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  const percent = Math.round(ratio * 100);
  // La barra se corta en 100% pero el porcentaje muestra el real, para que el
  // sobre-ahorro no quede invisible.
  const width = Math.min(Math.max(ratio, 0), 1) * 100;

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent >= 100
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
              : "bg-gradient-to-r from-emerald-500 to-teal-500"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
