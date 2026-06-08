import { payCreditCard } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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
