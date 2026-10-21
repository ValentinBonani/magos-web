// Captcha invisible de Cloudflare Turnstile en el checkout
// (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
// Sin claves configuradas no se exige (desarrollo local).

export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

export async function verifyTurnstile(token: string | null, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("[turnstile] Verificación rechazada:", data["error-codes"]);
    return data.success;
  } catch (error) {
    // Si Cloudflare no responde, no frenar las ventas.
    console.error("[turnstile] No se pudo verificar:", error);
    return true;
  }
}
