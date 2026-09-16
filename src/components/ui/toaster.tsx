"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      closeButton
      richColors
      // Sonner ya anima entrada/salida deslizando desde el borde; la duración
      // se alarga un poco para que dé tiempo a leer sin sentirse lento.
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border shadow-lg",
        },
      }}
    />
  );
}
