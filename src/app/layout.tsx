import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/app-layout";

export const metadata: Metadata = {
  title: "Spendly",
  description: "Control de finanzas personales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
