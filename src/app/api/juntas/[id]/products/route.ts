import { NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/lib/supabase";
import { readJsonBody } from "@/lib/http";

type ProductBody = {
  name: string;
  categoryId: string | null;
  assignedTo: string | null;
  link: string | null;
  imageUrl: string | null;
  amount: number;
  quantity: number;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id } = await params;

  const { data: membership } = await supabase
    .from("junta_members")
    .select("id")
    .eq("junta_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No eres miembro de esta junta." }, { status: 403 });
  }

  const body = await readJsonBody<ProductBody>(request);
  const { name, categoryId, assignedTo, link, imageUrl, amount, quantity } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("junta_products")
    .insert({
      junta_id: id,
      user_id: user.id,
      assigned_to: assignedTo || null,
      category_id: categoryId || null,
      name: name.trim(),
      link: link || null,
      image_url: imageUrl || null,
      amount: Math.round(Number(amount)),
      // Number() acepta decimales igual que parseFloat y además tolera que el
      // cuerpo llegue sin tipar.
      quantity: quantity && Number(quantity) > 0 ? Number(quantity) : 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const prodId = searchParams.get("prodId");

  if (!prodId) {
    return NextResponse.json({ error: "prodId is required" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("junta_products")
    .select("id")
    .eq("id", prodId)
    .eq("junta_id", id)
    .single();

  /*
   * Cualquier MIEMBRO puede editar o borrar, no solo quien lo creó (decisión de
   * 18c871c). Pero ese commit quitaba la comprobación de propiedad sin poner
   * nada en su lugar, y PATCH/DELETE nunca verificaron membresía: la propiedad
   * era la única autorización que había. Sin esto, cualquier usuario con sesión
   * podría editar productos de una junta a la que no pertenece.
   */
  const { data: membership } = await supabase
    .from("junta_members")
    .select("id")
    .eq("junta_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No eres miembro de esta junta." }, { status: 403 });
  }

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  const body = await readJsonBody(request);
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.categoryId !== undefined) updates.category_id = body.categoryId;
  if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo || null;
  if (body.link !== undefined) updates.link = body.link;
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
  if (body.amount !== undefined) updates.amount = Math.round(Number(body.amount));
  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (!Number.isFinite(q) || q <= 0) {
      return NextResponse.json({ error: "La cantidad debe ser mayor que 0." }, { status: 400 });
    }
    updates.quantity = q;
  }

  const { data, error } = await supabase
    .from("junta_products")
    .update(updates)
    .eq("id", prodId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const prodId = searchParams.get("prodId");

  if (!prodId) {
    return NextResponse.json({ error: "prodId is required" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("junta_products")
    .select("id")
    .eq("id", prodId)
    .eq("junta_id", id)
    .single();

  /*
   * Cualquier MIEMBRO puede editar o borrar, no solo quien lo creó (decisión de
   * 18c871c). Pero ese commit quitaba la comprobación de propiedad sin poner
   * nada en su lugar, y PATCH/DELETE nunca verificaron membresía: la propiedad
   * era la única autorización que había. Sin esto, cualquier usuario con sesión
   * podría editar productos de una junta a la que no pertenece.
   */
  const { data: membership } = await supabase
    .from("junta_members")
    .select("id")
    .eq("junta_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No eres miembro de esta junta." }, { status: 403 });
  }

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  const { error } = await supabase
    .from("junta_products")
    .delete()
    .eq("id", prodId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
