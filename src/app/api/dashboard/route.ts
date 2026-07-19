import { getSupabaseRouteHandler } from "@/lib/supabase";
import { getDashboardData } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const data = await getDashboardData(user.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
