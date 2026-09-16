/**
 * Aplica el esquema completo (schema.sql + migraciones 001..007) a la base
 * remota, en orden.
 *
 * Requiere DATABASE_URL en .env.local con la contraseña real de la base
 * (Supabase -> Project Settings -> Database -> Connection string).
 *
 * Uso:
 *   pnpm add -D pg
 *   node scripts/apply-schema.mjs
 *
 * Es reejecutable: todo el SQL usa "if not exists" / "drop policy if exists".
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = {};
for (const line of readFileSync(path.join(root, ".env.local"), "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}
if (dbUrl.includes("[YOUR-PASSWORD]")) {
  console.error(
    "DATABASE_URL todavía tiene el placeholder [YOUR-PASSWORD].\n" +
      "Reemplázalo por la contraseña real de la base en .env.local y vuelve a correr.",
  );
  process.exit(1);
}

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Falta el driver de Postgres. Instálalo con:  pnpm add -D pg");
  process.exit(1);
}

const FILES = [
  "supabase/schema.sql",
  "supabase/migrations/001_users.sql",
  "supabase/migrations/002_credit_dates.sql",
  "supabase/migrations/003_juntas.sql",
  "supabase/migrations/004_fix_junta_rls.sql",
  "supabase/migrations/005_fix_profiles_rls.sql",
  "supabase/migrations/006_product_assigned_to.sql",
  "supabase/migrations/007_account_last4.sql",
];

const client = new pg.default.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Conectado.\n");

for (const file of FILES) {
  const sql = readFileSync(path.join(root, file), "utf-8");
  try {
    await client.query(sql);
    console.log(`  ✓ ${file}`);
  } catch (err) {
    console.error(`  ✗ ${file}\n    ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
);
console.log(`\n${rows.length} tablas en public: ${rows.map((r) => r.table_name).join(", ")}`);

await client.end();
console.log("\nListo. Ahora: node scripts/seed-demo-data.mjs");
