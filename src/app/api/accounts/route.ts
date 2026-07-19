import { getSupabaseRouteHandler } from "@/lib/supabase";
import { createAccount } from "@/lib/finance";
import { AccountKind } from "@/lib/types";
import { NextResponse } from "next/server";

const validKinds = new Set<AccountKind>(["cash", "debit", "checking", "credit"]);

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      kind?: AccountKind;
      bank?: string | null;
      initialBalance?: number;
      statementDay?: number | null;
      paymentDueDay?: number | null;
    };

    if (!body.kind || !validKinds.has(body.kind)) {
      return NextResponse.json({ error: "Tipo de cuenta inválido." }, { status: 400 });
    }

    await createAccount({
      userId: user.id,
      name: body.name ?? "",
      kind: body.kind,
      bank: body.bank,
      initialBalance: body.initialBalance ?? 0,
      statementDay: body.statementDay,
      paymentDueDay: body.paymentDueDay,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
