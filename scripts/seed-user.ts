/**
 * Script para crear un usuario en Supabase Auth y asociar datos existentes.
 *
 * Uso:
 *   npx tsx scripts/seed-user.ts --email=tu@email.com --password=tuPassword
 *
 * Requisitos:
 *   - La migración 001_users.sql debe haberse ejecutado en la BD
 *   - NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar en .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv
  .find((a) => a.startsWith("--email="))
  ?.split("=")[1];
const password = process.argv
  .find((a) => a.startsWith("--password="))
  ?.split("=")[1];

if (!email || !password) {
  console.error("Uso: npx tsx scripts/seed-user.ts --email=user@example.com --password=123456");
  process.exit(1);
}

async function main() {
  // 1. Verificar si el usuario ya existe
  const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    console.error("Error listando usuarios:", listError.message);
    process.exit(1);
  }

  const existingUser = existingUsers.users.find((u) => u.email === email);
  let userId: string;

  if (existingUser) {
    console.log(`El usuario ${email} ya existe con ID: ${existingUser.id}`);
    userId = existingUser.id;
  } else {
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("Error creando usuario:", createError.message);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log(`Usuario creado: ${email} (ID: ${userId})`);
  }

  // 2. Verificar/crear perfil
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!existingProfile) {
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      email,
      full_name: email.split("@")[0],
    });

    if (profileError) {
      console.error("Error creando perfil:", profileError.message);
      process.exit(1);
    }
    console.log("Perfil creado.");
  } else {
    console.log("Perfil ya existe.");
  }

  // 3. Asociar datos existentes al usuario
  const tables = [
    "accounts",
    "savings_funds",
    "savings_auto_deposits",
    "recurring_rules",
    "transactions",
    "alerts",
  ];

  for (const table of tables) {
    const { data: rows } = await adminClient
      .from(table)
      .select("id")
      .is("user_id", null)
      .limit(1);

    if (rows && rows.length > 0) {
      const { error: updateError } = await adminClient
        .from(table)
        .update({ user_id: userId })
        .is("user_id", null);

      if (updateError) {
        console.warn(`Error actualizando ${table}: ${updateError.message}`);
      } else {
        console.log(`Datos de ${table} asociados al usuario.`);
      }
    } else {
      console.log(`${table}: sin datos sin asignar.`);
    }
  }

  console.log("\n¡Proceso completado!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("\nAhora puedes iniciar sesión en /login");
}

main().catch(console.error);
