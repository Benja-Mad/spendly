/**
 * Supabase Auth devuelve sus mensajes en ingles. La UI es 100% en espanol,
 * asi que se traducen los casos conocidos antes de mostrarlos.
 */
const AUTH_MESSAGES: Record<string, string> = {
  "invalid login credentials": "Email o contraseña incorrectos.",
  "email not confirmed": "Todavía no confirmaste tu correo. Revisa tu bandeja de entrada.",
  "user already registered": "Ya existe una cuenta con ese email.",
  "a user with this email address has already been registered":
    "Ya existe una cuenta con ese email.",
  "password should be at least 6 characters":
    "La contraseña debe tener al menos 6 caracteres.",
  "unable to validate email address: invalid format":
    "El formato del email no es válido.",
  "email rate limit exceeded":
    "Demasiados intentos. Espera unos minutos antes de reintentar.",
  "over_email_send_rate_limit":
    "Demasiados intentos. Espera unos minutos antes de reintentar.",
  "for security purposes, you can only request this after 60 seconds":
    "Por seguridad, espera 60 segundos antes de volver a intentarlo.",
  "new password should be different from the old password":
    "La nueva contraseña debe ser distinta de la anterior.",
  "token has expired or is invalid":
    "El enlace expiró o ya fue usado. Solicita uno nuevo.",
  "auth session missing!":
    "Tu sesión expiró. Vuelve a solicitar el enlace de recuperación.",
};

export const translateAuthError = (message: string, fallback: string) => {
  if (!message) return fallback;
  const key = message.trim().toLowerCase();
  if (AUTH_MESSAGES[key]) return AUTH_MESSAGES[key];
  const partial = Object.keys(AUTH_MESSAGES).find((k) => key.includes(k));
  return partial ? AUTH_MESSAGES[partial] : message;
};

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
