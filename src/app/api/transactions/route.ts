import { getSupabaseRouteHandler } from "@/lib/supabase";
import { createManualTransaction } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      accountId?: string;
      type?: "income" | "expense";
      amount?: number;
      categoryId?: string | null;
      description?: string | null;
      occurredAt?: string;
    };

    if (!body.accountId || !body.type || !body.amount) {
      return NextResponse.json({ error: "accountId, type y amount son obligatorios." }, { status: 400 });
    }

    await createManualTransaction({
      userId: user.id,
      accountId: body.accountId,
      type: body.type,
      amount: body.amount,
      categoryId: body.categoryId,
      description: body.description,
      occurredAt: body.occurredAt,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
