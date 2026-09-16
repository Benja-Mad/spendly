/**
 * Encabezado de página: solo identifica dónde estás.
 *
 * `actions` existe para acciones que aplican a la página entera, y en la
 * práctica ninguna vista lo necesita: crear una cuenta, un fondo o una junta
 * actúa sobre UNA sección, así que el botón va en el encabezado de esa sección
 * (SectionHeader), pegado a lo que modifica. Ver PATTERNS.md.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Encabezado de sección, con la acción que actúa sobre ella.
 *
 * Es el sitio de los botones de crear: "+ Tarjeta" junto a las tarjetas,
 * "+ Nuevo fondo" junto a los fondos. Antes cada vista decidía por su cuenta y
 * unas los ponían aquí mientras otras los dejaban arriba, a la altura del
 * título de la página.
 */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">{title}</h2>
      {action}
    </div>
  );
}
