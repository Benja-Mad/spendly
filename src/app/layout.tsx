import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/app-layout";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import { AppToaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

// globals.css declara --font-sans con Inter pero la fuente nunca se cargaba,
// así que el tipo real que se renderizaba era Arial.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Spendly",
  description: "Control de finanzas personales",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        {/* Debe ir aquí y no en <head>: React 19 hoistea los scripts del head a
            un contenedor diferido, con lo que corría después de la hidratación
            (flash de tema incorrecto + mismatch de hidratación). */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <ConfirmProvider>
            <AppLayout>{children}</AppLayout>
          </ConfirmProvider>
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
