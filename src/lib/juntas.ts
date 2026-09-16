import { Junta, RowRecord } from "@/lib/types";

/**
 * Fila de `juntas` → el tipo Junta.
 *
 * La base usa snake_case y el tipo camelCase. Sin esta traducción las rutas
 * devolvían la fila cruda y `junta.inviteCode` quedaba `undefined` en el
 * cliente: el chip del código de invitación de la lista de juntas llevaba
 * vacío, sin error visible, porque TypeScript confiaba en el tipo declarado.
 */
export const mapJunta = (row: RowRecord): Junta => ({
  id: String(row.id),
  name: String(row.name),
  description: (row.description as string | null) ?? null,
  inviteCode: String(row.invite_code),
  ownerId: String(row.owner_id),
  isClosed: Boolean(row.is_closed),
  createdAt: String(row.created_at),
});
