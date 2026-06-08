import { deleteManualTransaction, updateManualTransaction } from "@/lib/finance";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    await updateManualTransaction(id, {
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteManualTransaction(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
