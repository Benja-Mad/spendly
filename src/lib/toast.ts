"use client";

import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";

export const notify = {
  success: (message: string) => toast.success(message),
  error: (error: unknown, fallback = "No se pudo completar la acción.") =>
    toast.error(errorMessage(error, fallback)),
  info: (message: string) => toast(message),
  /** Envuelve una acción: muestra el estado en curso y el resultado. */
  promise: <T>(
    action: Promise<T>,
    messages: { loading: string; success: string; error?: string },
  ) =>
    toast.promise(action, {
      loading: messages.loading,
      success: messages.success,
      error: (e: unknown) => errorMessage(e, messages.error ?? "No se pudo completar la acción."),
    }),
};

export { toast };
