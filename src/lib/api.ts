export async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  let result: any = {};
  try {
    result = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error("La respuesta del servidor no es JSON válido.");
    }
  }

  if (!response.ok) {
    throw new Error(result.error ?? "Error inesperado en la petición");
  }

  return result;
}
