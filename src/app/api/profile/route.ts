import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseRouteHandler } from "@/lib/supabase";

export async function GET() {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const { data: newProfile } = await admin
      .from("profiles")
      .insert({ id: user.id, email: user.email || "", username: null, full_name: null })
      .select()
      .single();

    return NextResponse.json({ profile: newProfile });
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const admin = getSupabaseAdmin();

  if (body.username !== undefined) {
    const username = body.username?.trim() || null;

    if (username && username.length < 3) {
      return NextResponse.json({ error: "El username debe tener al menos 3 caracteres" }, { status: 400 });
    }

    if (username) {
      const { data: conflicts } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .limit(1);

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({ error: "Este username ya está en uso" }, { status: 409 });
      }
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    let result;

    if (existingProfile) {
      const { data, error } = await admin
        .from("profiles")
        .update({ username })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      const { data, error } = await admin
        .from("profiles")
        .insert({ id: user.id, email: user.email || "", username })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ profile: result });
  }

  return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
}
