import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseRouteHandler } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: membership } = await supabase
    .from("junta_members")
    .select("id")
    .eq("junta_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  const [juntaRes, membersRes, categoriesRes, productsRes, settlementsRes] = await Promise.all([
    admin.from("juntas").select("*").eq("id", id).single(),
    admin.from("junta_members").select("*").eq("junta_id", id),
    admin.from("junta_categories").select("*").eq("junta_id", id),
    admin.from("junta_products").select("*").eq("junta_id", id).order("created_at", { ascending: false }),
    admin.from("junta_settlements").select("*").eq("junta_id", id),
  ]);

  if (juntaRes.error) {
    return NextResponse.json({ error: juntaRes.error.message }, { status: 500 });
  }

  const userIds = [...new Set([
    ...(membersRes.data || []).map((m) => m.user_id),
    ...(productsRes.data || []).map((p) => p.user_id),
    ...(productsRes.data || []).map((p) => p.assigned_to).filter(Boolean),
    ...(settlementsRes.data || []).map((s) => s.from_user_id),
    ...(settlementsRes.data || []).map((s) => s.to_user_id),
  ])];

  let profiles: { id: string; username: string | null; email: string }[] = [];
  if (userIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);
    profiles = data || [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const members = (membersRes.data || []).map((m) => ({
    id: m.id,
    juntaId: m.junta_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    profile: profileMap.get(m.user_id) || null,
  }));

  const products = (productsRes.data || []).map((p) => ({
    id: p.id,
    juntaId: p.junta_id,
    userId: p.user_id,
    assignedTo: p.assigned_to || null,
    categoryId: p.category_id || null,
    name: p.name,
    link: p.link || null,
    imageUrl: p.image_url || null,
    amount: p.amount,
    quantity: p.quantity,
    createdAt: p.created_at,
    user: profileMap.get(p.user_id) || null,
    assignedUser: p.assigned_to ? profileMap.get(p.assigned_to) || null : null,
    category: (categoriesRes.data || []).find((c) => c.id === p.category_id) || null,
  }));

  const settlements = (settlementsRes.data || []).map((s) => ({
    id: s.id,
    juntaId: s.junta_id,
    fromUserId: s.from_user_id,
    toUserId: s.to_user_id,
    amount: s.amount,
    isPaid: s.is_paid,
    createdAt: s.created_at,
    fromUser: profileMap.get(s.from_user_id) || null,
    toUser: profileMap.get(s.to_user_id) || null,
  }));

  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const balances = (membersRes.data || []).map((m) => {
    const memberProducts = (productsRes.data || []).filter((p) => p.user_id === m.user_id);
    const totalSpent = memberProducts.reduce((sum, p) => sum + p.amount * p.quantity, 0);
    return {
      userId: m.user_id,
      username: profileMap.get(m.user_id)?.username || null,
      totalSpent,
    };
  });

  const totalPool = balances.reduce((sum, b) => sum + b.totalSpent, 0);
  const perPerson = balances.length > 0 ? totalPool / balances.length : 0;

  const balancesWithNet = balances.map((b) => ({
    ...b,
    totalOwed: perPerson,
    net: b.totalSpent - perPerson,
  }));

  return NextResponse.json({
    junta: {
      id: juntaRes.data.id,
      name: juntaRes.data.name,
      description: juntaRes.data.description,
      inviteCode: juntaRes.data.invite_code,
      ownerId: juntaRes.data.owner_id,
      isClosed: juntaRes.data.is_closed,
      createdAt: juntaRes.data.created_at,
    },
    members,
    categories: (categoriesRes.data || []).map((c) => ({
      id: c.id,
      juntaId: c.junta_id,
      name: c.name,
    })),
    products,
    settlements,
    balances: balancesWithNet,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: junta } = await supabase
    .from("juntas")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!junta || junta.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.isClosed !== undefined) updates.is_closed = body.isClosed;

  const { data, error } = await supabase
    .from("juntas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ junta: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseRouteHandler();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: junta } = await supabase
    .from("juntas")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!junta || junta.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("juntas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
