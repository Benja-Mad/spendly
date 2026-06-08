import { createAccount } from "@/lib/finance";
import { AccountKind } from "@/lib/types";
import { NextResponse } from "next/server";

const validKinds = new Set<AccountKind>(["cash", "debit", "checking", "credit"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      kind?: AccountKind;
      bank?: string | null;
      initialBalance?: number;
    };

    if (!body.kind || !validKinds.has(body.kind)) {
      return NextResponse.json({ error: "Tipo de cuenta inválido." }, { status: 400 });
    }

    await createAccount({
      name: body.name ?? "",
      kind: body.kind,
      bank: body.bank,
      initialBalance: body.initialBalance ?? 0,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
