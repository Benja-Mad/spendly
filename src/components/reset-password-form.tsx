"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { translateAuthError } from "@/lib/errors";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setChecking(false);
    };

    // Si el enlace ya dejo sesion activa se resuelve de inmediato; si no,
    // se espera el evento PASSWORD_RECOVERY con un timeout como red de
    // seguridad, en vez de bloquear siempre 3 segundos.
    supabase.auth.getSession().then((result: { data: { session: unknown | null } }) => {
      if (result.data.session) finish();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") finish();
    });

    const timeout = setTimeout(finish, 3000);

    return () => {
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      notify.error(new Error("Las contraseñas no coinciden"));
      return;
    }

    if (password.length < 6) {
      notify.error(new Error("La contraseña debe tener al menos 6 caracteres"));
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw new Error(translateAuthError(updateError.message, "No se pudo actualizar la contraseña."));
      }

      setSuccess(true);
    } catch (err) {
      notify.error(err, "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div role="status" aria-label="Verificando enlace" className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg">
              S
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Spendly</h1>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Contraseña actualizada</h2>
              <p className="mt-2 text-sm text-zinc-500">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Spendly</h1>
          <p className="mt-1 text-sm text-zinc-500">Nueva contraseña</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Restablecer contraseña</h2>


          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="password">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="confirmPassword">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" variant="primary" block disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
