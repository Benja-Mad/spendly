export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function requestJson<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers ?? {}),
    },
  });

  // La sesión expiró: el cliente vuelve al login en vez de quedarse con datos
  // vacíos. Antes esto terminaba en pantalla en blanco.
  if (response.status === 401 && typeof window !== "undefined") {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
    throw new ApiError("Tu sesión expiró.", 401);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let result: Record<string, unknown> = {};
  if (isJson) {
    try {
      result = await response.json();
    } catch {
      throw new ApiError("La respuesta del servidor no es JSON válido.", response.status);
    }
  } else if (response.ok) {
    // Un 200 que no es JSON significa que algo intermedio (un redirect a una
    // página HTML, por ejemplo) respondió por la API. Antes se devolvía {} en
    // silencio y la UI reventaba al leer campos inexistentes.
    throw new ApiError("Respuesta inesperada del servidor.", response.status);
  }

  if (!response.ok) {
    const message =
      typeof result.error === "string" && result.error
        ? result.error
        : `Error inesperado en la petición (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return result as T;
}
