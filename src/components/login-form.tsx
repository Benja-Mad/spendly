"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { translateAuthError } from "@/lib/errors";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(translateAuthError(signInError.message, "No se pudo iniciar sesión."));
      }

      // router.refresh() revalida el middleware con la cookie nueva; antes se
      // hacia window.location.href, que recargaba la app entera.
      // Vuelve a donde el usuario intentaba entrar, si lo hubo.
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      notify.error(err, "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Spendly</h1>
          <p className="mt-1 text-sm text-zinc-500">Control de finanzas personales</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Iniciar sesión</h2>


          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="password">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" variant="primary" block disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
