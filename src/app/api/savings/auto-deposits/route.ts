import { getSupabaseRouteHandler } from "@/lib/supabase";
import { createSavingsAutoDeposit } from "@/lib/finance";
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
      dayOfMonth?: number;
      startMonth?: string;
    };

    if (!body.fundId || !body.accountId || !body.amount || !body.dayOfMonth) {
      return NextResponse.json(
        { error: "fundId, accountId, amount y dayOfMonth son obligatorios." },
        { status: 400 },
      );
    }

    await createSavingsAutoDeposit({
      userId: user.id,
      fundId: body.fundId,
      accountId: body.accountId,
      amount: body.amount,
      dayOfMonth: body.dayOfMonth,
      startMonth: body.startMonth,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
