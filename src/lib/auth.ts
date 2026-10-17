import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Un usuario es admin si tiene app_metadata.role = "admin" en Supabase Auth.
// app_metadata solo se puede modificar con la clave secreta (scripts/make-admin.mjs).
export async function getAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.app_metadata?.role !== "admin") return null;
  return { email: claims.email as string };
}

// Para páginas y Server Actions del panel: corta si no es admin.
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
