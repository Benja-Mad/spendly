import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import HeaderWrapper from '@/components/HeaderWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Spendly',
    description: 'App de finanzas personales',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
        <body className={`${inter.className} bg-white text-black dark:bg-gray-900 dark:text-white`}>
        <HeaderWrapper />
        <main className="container mx-auto p-4">
            {children}
        </main>
        </body>
        </html>
    )
}