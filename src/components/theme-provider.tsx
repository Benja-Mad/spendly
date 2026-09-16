"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "spendly-theme";

/** Se inyecta antes del primer paint para que no haya flash de tema incorrecto. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

/*
 * La preferencia vive en localStorage, que es un sistema externo al arbol de
 * React. useSyncExternalStore es la forma correcta de leerlo: evita el
 * setState-dentro-de-useEffect (que dispara renders en cascada) y da un
 * snapshot de servidor estable para que no haya mismatch de hidratacion.
 */
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // "storage" cubre el caso de otra pestaña cambiando el tema.
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", emit);
  };
};

const readStored = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage puede lanzar en modo privado.
  }
  return "system";
};

const getServerSnapshot = (): Theme => "system";

const resolve = (theme: Theme) =>
  theme === "dark" ||
  (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light";

const applyToDocument = (theme: Theme) => {
  document.documentElement.setAttribute("data-theme", resolve(theme));
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistir es opcional; el tema igual se aplica en esta sesion.
    }
    applyToDocument(next);
    emit();
  }, []);

  return { theme, setTheme };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  // Cuando la preferencia es "system", hay que seguir los cambios del SO.
  // Es una suscripcion a un sistema externo, no un setState en cascada.
  useSystemThemeSync(theme);

  // reducedMotion="user" hace que motion respete prefers-reduced-motion en
  // todas las variants sin tener que comprobarlo en cada componente.
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

function useSystemThemeSync(theme: Theme) {
  const subscribeToSystem = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        applyToDocument(theme);
        listener();
      };
      applyToDocument(theme);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [theme],
  );

  useSyncExternalStore(
    subscribeToSystem,
    () => document.documentElement.getAttribute("data-theme") ?? "light",
    () => "light",
  );
}
