'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Header() {
    const [user, setUser] = useState<any>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/auth/signin')
    }

    if (!user) return null

    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center dark:bg-gray-800 dark:text-white">
            <h1 className="text-xl font-semibold">Spendly</h1>
            <div className="flex items-center gap-4">
                <span>{user.email}</span>
                <button
                    onClick={handleLogout}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 dark:bg-red-700"
                >
                    Cerrar sesión
                </button>
            </div>
        </header>
    )
}