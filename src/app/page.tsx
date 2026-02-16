import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  // 1. createClient ya maneja cookies internamente
  const supabase = await createClient() // ← await aquí

  // 2. Cambia 'todos' por una tabla que exista en tu DB
  // Por ahora, probemos con una consulta simple
  const { data, error } = await supabase.from('cards').select('*')

  // 3. Manejo de error básico
  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
      <ul>
        {data?.map((item) => (
            <li key={item.id}>{JSON.stringify(item)}</li>
        ))}
      </ul>
  )
}