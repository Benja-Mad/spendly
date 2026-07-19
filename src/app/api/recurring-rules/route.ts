import { getSupabaseRouteHandler } from "@/lib/supabase";
import { createRecurringRule } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      type?: "income" | "expense";
      amount?: number;
      accountId?: string;
      categoryId?: string | null;
      dayOfMonth?: number;
      nextRun?: string;
    };

    if (!body.name || !body.type || !body.amount || !body.accountId || !body.dayOfMonth) {
      return NextResponse.json(
        { error: "name, type, amount, accountId y dayOfMonth son obligatorios." },
        { status: 400 },
      );
    }

    await createRecurringRule({
      userId: user.id,
      name: body.name,
      type: body.type,
      amount: body.amount,
      accountId: body.accountId,
      categoryId: body.categoryId,
      dayOfMonth: body.dayOfMonth,
      frequency: "monthly",
      nextRun: body.nextRun,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
