import { getSupabaseRouteHandler } from "@/lib/supabase";
import { payCreditCard } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const body = (await request.json()) as {
      creditAccountId?: string;
      sourceAccountId?: string;
      amount?: number;
      occurredAt?: string;
    };

    if (!body.creditAccountId || !body.sourceAccountId || !body.amount) {
      return NextResponse.json(
        { error: "creditAccountId, sourceAccountId y amount son obligatorios." },
        { status: 400 },
      );
    }

    await payCreditCard({
      userId: user.id,
      creditAccountId: body.creditAccountId,
      sourceAccountId: body.sourceAccountId,
      amount: body.amount,
      occurredAt: body.occurredAt,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
