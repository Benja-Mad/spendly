import { NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: membership } = await supabase
    .from("junta_members")
    .select("id")
    .eq("junta_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json();
  const { name, categoryId, assignedTo, link, imageUrl, amount, quantity } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
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
      amount: Math.round(amount),
      quantity: quantity && quantity > 0 ? quantity : 1,
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const prodId = searchParams.get("prodId");

  if (!prodId) {
    return NextResponse.json({ error: "prodId is required" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("junta_products")
    .select("user_id")
    .eq("id", prodId)
    .eq("junta_id", id)
    .single();

  if (!product || product.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.categoryId !== undefined) updates.category_id = body.categoryId;
  if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo || null;
  if (body.link !== undefined) updates.link = body.link;
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
  if (body.amount !== undefined) updates.amount = Math.round(body.amount);
  if (body.quantity !== undefined) updates.quantity = body.quantity;

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const prodId = searchParams.get("prodId");

  if (!prodId) {
    return NextResponse.json({ error: "prodId is required" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("junta_products")
    .select("user_id")
    .eq("id", prodId)
    .eq("junta_id", id)
    .single();

  if (!product || product.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
