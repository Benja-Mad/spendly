import { NextResponse } from "next/server";
import { getSupabaseRouteHandler, getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { inviteCode } = body;

  if (!inviteCode || typeof inviteCode !== "string") {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: junta, error: juntaError } = await admin
    .from("juntas")
    .select("id")
    .eq("invite_code", inviteCode.trim())
    .single();

  if (juntaError || !junta) {
    return NextResponse.json({ error: "Código de invitación inválido" }, { status: 404 });
  }

  const { data: existingMember } = await supabase
    .from("junta_members")
    .select("id")
    .eq("junta_id", junta.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return NextResponse.json({ error: "Ya eres miembro de esta junta" }, { status: 409 });
  }

  const { error: memberError } = await supabase
    .from("junta_members")
    .insert({ junta_id: junta.id, user_id: user.id, role: "member" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, juntaId: junta.id });
}
