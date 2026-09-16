/**
 * Puebla la base con datos de prueba realistas para un usuario YA EXISTENTE.
 *
 * No crea cuentas de usuario: toma el usuario que ya está en auth.users
 * (o el que le pases con --email=) y le cuelga cuentas, movimientos, fondos
 * de ahorro, reglas recurrentes y una junta con productos.
 *
 * Uso:
 *   node scripts/seed-demo-data.mjs
 *   node scripts/seed-demo-data.mjs --email=tu@correo.cl
 *   node scripts/seed-demo-data.mjs --reset    (borra lo anterior del usuario)
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
 * Corre con node a secas: no necesita tsx.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const has = (name) => process.argv.includes(`--${name}`);

const die = (label, error) => {
  if (!error) return;
  console.error(`  ✗ ${label}: ${error.message}`);
  process.exit(1);
};

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

async function main() {
  const { data: userList, error: userErr } = await db.auth.admin.listUsers();
  die("listar usuarios", userErr);

  const wanted = arg("email");

  if (!wanted && userList.users.length > 1) {
    // Con más de una cuenta, elegir "la primera" es una ruleta: el orden que
    // devuelve listUsers() no es estable y sembrarías la cuenta equivocada.
    console.error(
      `Hay ${userList.users.length} usuarios. Indica cuál sembrar con --email=:\n` +
        userList.users.map((u) => `  --email=${u.email}`).join("\n"),
    );
    process.exit(1);
  }

  const user = wanted
    ? userList.users.find((u) => u.email === wanted)
    : userList.users[0];

  if (!user) {
    console.error(
      wanted
        ? `No existe un usuario con email ${wanted}.`
        : "No hay ningún usuario en auth.users. Regístrate primero en /signup.",
    );
    process.exit(1);
  }

  // --reset borra datos: confirmar a quién antes de tocar nada.
  if (has("reset")) {
    console.log(`--reset: se borrarán los datos de ${user.email} ÚNICAMENTE.`);
  }
  console.log(`Usuario: ${user.email} (${user.id})\n`);

  // El trigger handle_new_user solo corre en registros nuevos. Si el usuario
  // se creó antes de aplicar el esquema, su fila en profiles no existe.
  const { data: profile } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) {
    die("crear perfil", (await db.from("profiles").insert({
      id: user.id,
      email: user.email,
      username: user.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, ""),
      full_name: user.email.split("@")[0],
    })).error);
    console.log("  ✓ perfil creado (faltaba)");
  }

  if (has("reset")) {
    console.log("Borrando datos previos...");
    for (const t of ["transactions", "savings_auto_deposits", "recurring_rules", "savings_funds", "alerts", "accounts"]) {
      await db.from(t).delete().eq("user_id", user.id);
    }
    const { data: owned } = await db.from("juntas").select("id").eq("owner_id", user.id);
    for (const j of owned ?? []) await db.from("juntas").delete().eq("id", j.id);
    console.log("  ✓ limpio\n");
  }

  // --- Cuentas -------------------------------------------------------------
  const { data: accounts, error: accErr } = await db
    .from("accounts")
    .insert(
      [
        { name: "Cuenta Corriente", kind: "checking", bank: "Banco de Chile", balance: 1_850_000 },
        { name: "Tarjeta Débito", kind: "debit", bank: "BCI", balance: 420_000 },
        { name: "Efectivo", kind: "cash", bank: null, balance: 65_000 },
        { name: "Visa Signature", kind: "credit", bank: "Santander", credit_debt: 738_500, statement_day: 5, payment_due_day: 20 },
        { name: "Mastercard Black", kind: "credit", bank: "Itaú", credit_debt: 154_900, statement_day: 12, payment_due_day: 28 },
      ].map((a) => ({
        // Todas las filas deben tener las mismas claves: PostgREST alinea las
        // columnas del batch y manda null donde falta, ignorando el default.
        user_id: user.id,
        bank: null,
        balance: 0,
        credit_debt: 0,
        statement_day: null,
        payment_due_day: null,
        ...a,
      })),
    )
    .select();
  die("crear cuentas", accErr);
  const byName = Object.fromEntries(accounts.map((a) => [a.name, a]));
  console.log(`  ✓ ${accounts.length} cuentas`);

  // --- Categorías (las del schema son globales) ----------------------------
  const { data: cats } = await db.from("categories").select("id, name, type");
  const cat = (n) => cats?.find((c) => c.name === n)?.id ?? null;

  // --- Movimientos ---------------------------------------------------------
  const tx = [
    { account_id: byName["Cuenta Corriente"].id, type: "income", amount: 1_450_000, category_id: cat("Sueldo"), description: "Sueldo septiembre", occurred_at: daysAgo(12) },
    { account_id: byName["Cuenta Corriente"].id, type: "expense", amount: 620_000, category_id: cat("Hogar"), description: "Arriendo", occurred_at: daysAgo(11) },
    { account_id: byName["Visa Signature"].id, type: "expense", amount: 89_990, category_id: cat("Comida"), description: "Supermercado Jumbo", occurred_at: daysAgo(9) },
    { account_id: byName["Tarjeta Débito"].id, type: "expense", amount: 12_500, category_id: cat("Transporte"), description: "Bip! recarga", occurred_at: daysAgo(7) },
    { account_id: byName["Visa Signature"].id, type: "expense", amount: 45_800, category_id: cat("Entretenimiento"), description: "Cine + once", occurred_at: daysAgo(5) },
    { account_id: byName["Efectivo"].id, type: "expense", amount: 8_000, category_id: cat("Comida"), description: "Almuerzo", occurred_at: daysAgo(4) },
    { account_id: byName["Mastercard Black"].id, type: "expense", amount: 154_900, category_id: cat("Salud"), description: "Dentista", occurred_at: daysAgo(3) },
    { account_id: byName["Cuenta Corriente"].id, type: "income", amount: 180_000, category_id: cat("Inversión"), description: "Dividendos", occurred_at: daysAgo(2) },
    { account_id: byName["Tarjeta Débito"].id, type: "expense", amount: 23_400, category_id: cat("Comida"), description: "Delivery", occurred_at: daysAgo(1) },
  ].map((t) => ({ currency: "CLP", origin: "manual", ...t, user_id: user.id }));
  die("crear movimientos", (await db.from("transactions").insert(tx)).error);
  console.log(`  ✓ ${tx.length} movimientos`);

  // --- Fondos de ahorro ----------------------------------------------------
  const { data: funds, error: fundErr } = await db
    .from("savings_funds")
    .insert([
      { user_id: user.id, name: "Viaje a Japón", target_amount: 3_500_000, current_amount: 1_120_000, initial_deposit: 500_000, initial_account_id: byName["Cuenta Corriente"].id },
      { user_id: user.id, name: "Fondo de emergencia", target_amount: 2_000_000, current_amount: 2_150_000, initial_deposit: 300_000, initial_account_id: byName["Cuenta Corriente"].id },
      { user_id: user.id, name: "Notebook nuevo", target_amount: 1_200_000, current_amount: 180_000, initial_deposit: 180_000, initial_account_id: byName["Tarjeta Débito"].id },
    ])
    .select();
  die("crear fondos", fundErr);
  console.log(`  ✓ ${funds.length} fondos (uno supera la meta, para ver el caso >100%)`);

  const startMonth = iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  die("depósitos automáticos", (await db.from("savings_auto_deposits").insert([
    { user_id: user.id, fund_id: funds[0].id, account_id: byName["Cuenta Corriente"].id, amount: 150_000, day_of_month: 5, start_month: startMonth },
    { user_id: user.id, fund_id: funds[2].id, account_id: byName["Tarjeta Débito"].id, amount: 60_000, day_of_month: 15, start_month: startMonth },
  ])).error);
  console.log("  ✓ 2 depósitos automáticos");

  const nextRun = iso(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
  die("reglas recurrentes", (await db.from("recurring_rules").insert([
    { user_id: user.id, name: "Sueldo mensual", type: "income", amount: 1_450_000, account_id: byName["Cuenta Corriente"].id, category_id: cat("Sueldo"), day_of_month: 1, next_run: nextRun },
    { user_id: user.id, name: "Arriendo", type: "expense", amount: 620_000, account_id: byName["Cuenta Corriente"].id, category_id: cat("Hogar"), day_of_month: 2, next_run: nextRun },
    { user_id: user.id, name: "Netflix", type: "expense", amount: 9_900, account_id: byName["Visa Signature"].id, category_id: cat("Entretenimiento"), day_of_month: 8, next_run: nextRun },
  ])).error);
  console.log("  ✓ 3 reglas recurrentes");

  die("alertas", (await db.from("alerts").insert([
    { user_id: user.id, kind: "credit", title: "Vence tu Visa Signature", body: "El pago de $738.500 vence el día 20.", is_read: false },
    { user_id: user.id, kind: "savings", title: "Meta alcanzada", body: "Fondo de emergencia superó su meta de $2.000.000.", is_read: false },
    { user_id: user.id, kind: "info", title: "Reglas ejecutadas", body: "Se aplicaron 3 reglas recurrentes este mes.", is_read: true },
  ])).error);
  console.log("  ✓ 3 alertas");

  // --- Junta ---------------------------------------------------------------
  const { data: junta, error: juntaErr } = await db
    .from("juntas")
    .insert({ name: "Asado del viernes", description: "Casa de Javi, 8pm", owner_id: user.id })
    .select()
    .single();
  die("crear junta", juntaErr);

  await db.from("junta_members").insert({ junta_id: junta.id, user_id: user.id, role: "owner" });

  const { data: jcats, error: jcatErr } = await db
    .from("junta_categories")
    .insert([
      { junta_id: junta.id, name: "Carnes" },
      { junta_id: junta.id, name: "Bebidas" },
      { junta_id: junta.id, name: "Acompañamientos" },
    ])
    .select();
  die("categorías junta", jcatErr);

  die("productos junta", (await db.from("junta_products").insert([
    { junta_id: junta.id, user_id: user.id, category_id: jcats[0].id, name: "Lomo vetado", amount: 18_990, quantity: 2 },
    { junta_id: junta.id, user_id: user.id, category_id: jcats[0].id, name: "Chorizo", amount: 6_500, quantity: 3 },
    { junta_id: junta.id, user_id: user.id, category_id: jcats[1].id, name: "Cerveza (six pack)", amount: 7_990, quantity: 4 },
    { junta_id: junta.id, user_id: user.id, category_id: jcats[1].id, name: "Bebidas", amount: 3_200, quantity: 2 },
    { junta_id: junta.id, user_id: user.id, category_id: jcats[2].id, name: "Pan amasado", amount: 4_500, quantity: 1 },
    { junta_id: junta.id, user_id: user.id, category_id: null, name: "Carbón", amount: 5_990, quantity: 2 },
  ])).error);
  console.log(`  ✓ junta "${junta.name}" (código ${junta.invite_code}) con 3 categorías y 6 productos`);

  console.log("\nListo. Entra a /dashboard.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
