'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignIn() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) setError(error.message)
        else router.push('/')
    }

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Columna izquierda - Branding con gradiente */}
            <div className="flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white md:w-1/2 dark:from-blue-800 dark:to-purple-900">
                <div className="max-w-md text-center md:text-left">
                    <div className="mb-6 flex justify-center md:justify-start">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-lg">
                            <span className="text-4xl font-bold">S</span>
                        </div>
                    </div>
                    <h1 className="mb-4 text-5xl font-bold">Spendly</h1>
                    <p className="text-xl opacity-90">
                        Controla tus finanzas de manera simple y eficiente. Lleva el registro de tus tarjetas y gastos en un solo lugar.
                    </p>
                </div>
            </div>

            {/* Columna derecha - Formulario centrado */}
            <div className="flex items-center justify-center bg-gray-50 p-6 md:w-1/2 dark:bg-gray-900">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 dark:text-white">
                    <h2 className="mb-6 text-3xl font-semibold">Iniciar sesión</h2>
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/50 dark:text-red-200">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div className="text-right">
                            <a href="#" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>
                        <button
                            type="submit"
                            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                        >
                            Ingresar
                        </button>
                    </form>
                    <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        ¿No tienes cuenta?{' '}
                        <a href="/auth/signup" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                            Regístrate
                        </a>
                    </p>
                    <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-500">
                        © 2025 Spendly. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        </div>
    )
}