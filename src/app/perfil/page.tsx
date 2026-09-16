import { redirect } from "next/navigation";

/**
 * Perfil dejó de ser una sección: los ajustes se abren desde el pie del
 * sidebar, en un modal. La ruta se conserva solo para no romper enlaces viejos.
 */
export default function PerfilPage() {
  redirect("/dashboard");
}
