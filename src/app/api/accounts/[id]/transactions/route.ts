import { getSupabaseRouteHandler } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase";
import { mapTransaction } from "@/lib/finance";
import { RowRecord } from "@/lib/types";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { id } = await context.params;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("transactions")
      .select("*")
      .eq("account_id", id)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    const transactions = (data ?? []).map((row) => mapTransaction(row as RowRecord));

    return NextResponse.json({ transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
