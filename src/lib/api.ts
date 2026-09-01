export async function requestJson<T = Record<string, unknown>>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  let result: Record<string, unknown> = {};
  try {
    result = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error("La respuesta del servidor no es JSON válido.");
    }
  }

  if (!response.ok) {
    throw new Error((result.error as string) ?? "Error inesperado en la petición");
  }

  return result as T;
}
