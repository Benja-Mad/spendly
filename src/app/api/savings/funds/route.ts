import { createSavingsFund } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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

    await createSavingsFund({
      name: body.name,
      targetAmount: body.targetAmount,
      initialDeposit: body.initialDeposit ?? 0,
      initialAccountId: body.initialAccountId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
