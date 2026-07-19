import { getSupabaseRouteHandler } from "@/lib/supabase";
import { createManualSavingsDeposit } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      fundId?: string;
      accountId?: string;
      amount?: number;
    };

    if (!body.fundId || !body.accountId || !body.amount) {
      return NextResponse.json(
        { error: "fundId, accountId y amount son obligatorios." },
        { status: 400 },
      );
    }

    await createManualSavingsDeposit({
      userId: user.id,
      fundId: body.fundId,
      accountId: body.accountId,
      amount: body.amount,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
