import { NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { id } = await params;

  const { data: membership } = await supabase
    .from("junta_members")
    .select("id")
    .eq("junta_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No eres miembro de esta junta." }, { status: 403 });
  }

  const { data: members } = await supabase
    .from("junta_members")
    .select("user_id")
    .eq("junta_id", id);

  const { data: products } = await supabase
    .from("junta_products")
    .select("user_id, assigned_to, amount, quantity")
    .eq("junta_id", id);

  if (!members || !products) {
    return NextResponse.json({ error: "No se pudieron cargar los datos." }, { status: 500 });
  }

  const userTotals = new Map<string, number>();

  for (const m of members) {
    userTotals.set(m.user_id, 0);
  }

  const memberIds = new Set(members.map((m) => m.user_id));

  for (const p of products) {
    // Misma regla que /api/juntas/[id]: responsable asignado si sigue siendo
    // miembro, si no el creador. Garantiza que la suma cuadre con el total.
    const payer = p.assigned_to && memberIds.has(p.assigned_to) ? p.assigned_to : p.user_id;
    const current = userTotals.get(payer) || 0;
    userTotals.set(payer, current + p.amount * p.quantity);
  }

  const totalPool = Array.from(userTotals.values()).reduce((s, v) => s + v, 0);
  const memberCount = members.length;
  const perPerson = memberCount > 0 ? totalPool / memberCount : 0;

  const balances: { userId: string; totalSpent: number; net: number }[] = [];
  for (const [userId, totalSpent] of userTotals) {
    balances.push({
      userId,
      totalSpent,
      net: totalSpent - perPerson,
    });
  }

  const debtors = balances
    .filter((b) => b.net < -0.5)
    .sort((a, b) => a.net - b.net);

  const creditors = balances
    .filter((b) => b.net > 0.5)
    .sort((a, b) => b.net - a.net);

  const transfers: { from: string; to: string; amount: number }[] = [];

  const debtCopy = debtors.map((d) => ({ ...d, net: Math.abs(d.net) }));
  const creditCopy = creditors.map((c) => ({ ...c }));

  let i = 0;
  let j = 0;

  while (i < debtCopy.length && j < creditCopy.length) {
    const amount = Math.min(debtCopy[i].net, creditCopy[j].net);

    if (amount > 0.5) {
      transfers.push({
        from: debtCopy[i].userId,
        to: creditCopy[j].userId,
        amount: Math.round(amount),
      });
    }

    debtCopy[i].net -= amount;
    creditCopy[j].net -= amount;

    if (debtCopy[i].net < 0.5) i++;
    if (creditCopy[j].net < 0.5) j++;
  }

  return NextResponse.json({
    totalPool,
    perPerson: Math.round(perPerson),
    balances,
    transfers,
  });
}
