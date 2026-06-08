import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spendly",
  description: "Control de finanzas personales en CLP con conexión real a DB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
