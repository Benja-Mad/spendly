import { getSupabaseRouteHandler } from "@/lib/supabase";
import { createSavingsFund } from "@/lib/finance";
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
      targetAmount?: number;
      initialDeposit?: number;
      initialAccountId?: string | null;
    };

    if (!body.name || !body.targetAmount) {
      return NextResponse.json(
        { error: "name y targetAmount son obligatorios." },
        { status: 400 },
      );
    }

    const result = await createSavingsFund({
      userId: user.id,
      name: body.name,
      targetAmount: body.targetAmount,
      initialDeposit: body.initialDeposit ?? 0,
      initialAccountId: body.initialAccountId,
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
