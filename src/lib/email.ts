// Envío de emails con Resend (https://resend.com/docs/api-reference/emails/send-email).
// El dominio magosdelsur.com.ar está verificado en Resend (registros DNS en Vercel).

import { SITE } from "./site";

const FROM = process.env.EMAIL_FROM ?? `${SITE.name} <${SITE.email}>`;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY no configurada; no se envió "${subject}" a ${to}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error(`[email] Resend respondió ${res.status} para "${subject}": ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    // Un email que falla nunca tiene que romper un pedido.
    console.error(`[email] Error enviando "${subject}":`, error);
    return false;
  }
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
