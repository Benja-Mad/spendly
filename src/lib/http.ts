/**
 * Las rutas hacen `const body = await request.json()` y destructuran directo.
 * Con los tipos actuales eso devuelve `unknown`, así que el destructuring no
 * compila. Este helper centraliza el cast en un solo lugar en vez de repetirlo
 * (o de castear a `any` suelto) en cada handler.
 */
export type JsonBody = Record<string, unknown>;

export async function readJsonBody<T extends object = JsonBody>(
  request: Request,
): Promise<Partial<T> & JsonBody> {
  try {
    return (await request.json()) as Partial<T> & JsonBody;
  } catch {
    return {} as Partial<T> & JsonBody;
  }
}
