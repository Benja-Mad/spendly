"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password";

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
