import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  // useSearchParams() (para honrar ?next=) obliga a un límite de Suspense
  // o el prerender estático de /login falla.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-zinc-50 dark:bg-black">
          <div
            role="status"
            aria-label="Cargando"
            className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
