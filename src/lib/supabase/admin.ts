import { createClient } from "@supabase/supabase-js";

// Cliente con la clave secreta: saltea todos los permisos.
// Usar solo en el servidor y después de verificar que el usuario es admin.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
