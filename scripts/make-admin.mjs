// Le da permisos de admin a un usuario ya creado en Supabase Auth.
// Uso: node --env-file=.env.local scripts/make-admin.mjs email@ejemplo.com
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Falta el email. Uso: node --env-file=.env.local scripts/make-admin.mjs <email>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = data.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error(`No existe un usuario con el email ${email}. Crealo primero en Supabase.`);
  process.exit(1);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  app_metadata: { ...user.app_metadata, role: "admin" },
});
if (updateError) throw updateError;
console.log(`Listo: ${email} ahora es admin.`);
