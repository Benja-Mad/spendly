import { NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/lib/supabase";

export async function GET() {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memberships, error } = await supabase
    .from("junta_members")
    .select("junta_id")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ juntas: [] });
  }

  const juntaIds = memberships.map((m) => m.junta_id);

  const { data: juntas, error: juntasError } = await supabase
    .from("juntas")
    .select("*")
    .in("id", juntaIds)
    .order("created_at", { ascending: false });

  if (juntasError) {
    return NextResponse.json({ error: juntasError.message }, { status: 500 });
  }

  return NextResponse.json({ juntas });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: junta, error: juntaError } = await supabase
    .from("juntas")
    .insert({ name: name.trim(), description: description?.trim() || null, owner_id: user.id })
    .select()
    .single();

  if (juntaError) {
    return NextResponse.json({ error: juntaError.message }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from("junta_members")
    .insert({ junta_id: junta.id, user_id: user.id, role: "owner" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { data: categories } = await supabase
    .from("junta_categories")
    .insert([
      { junta_id: junta.id, name: "Comida" },
      { junta_id: junta.id, name: "Bebidas" },
      { junta_id: junta.id, name: "Otros" },
    ])
    .select();

  return NextResponse.json({ junta, categories });
}
