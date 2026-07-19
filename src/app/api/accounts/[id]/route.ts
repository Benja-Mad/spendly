import { getSupabaseRouteHandler } from "@/lib/supabase";
import { getAccountById, updateAccount } from "@/lib/finance";
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
    const account = await getAccountById(id, user.id);
    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      bank?: string | null;
      statementDay?: number | null;
      paymentDueDay?: number | null;
    };

    const account = await updateAccount({
      userId: user.id,
      accountId: id,
      name: body.name,
      bank: body.bank,
      statementDay: body.statementDay,
      paymentDueDay: body.paymentDueDay,
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
