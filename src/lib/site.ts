// Datos del local. PROVISORIOS: reemplazar por los reales cuando el dueño los pase.
export const SITE = {
  name: "Magos del Sur",
  tagline: "Juegos de mesa, Magic y Pokémon en Quilmes",
  // Número de WhatsApp en formato internacional, sin + ni espacios (Argentina: 549 + área + número).
  whatsapp: "5491140414118",
  whatsappDisplay: "11 4041-4118",
  instagram: "valentin.bonani",
  address: "Alvear 850",
  city: "Quilmes Centro, Buenos Aires",
  hours: ["Martes a viernes de 10 a 19 hs", "Sábados de 10 a 18 hs"],
  // Botón flotante de WhatsApp (en la Etapa 5 pasa a configurarse desde el panel).
  showWhatsappButton: true,
  bank: {
    alias: "valentin.bonani",
    holder: "Valentin Bonani",
    bank: "Banco Galicia",
  },
  // A dónde llegan los avisos de pedidos nuevos y comprobantes.
  notifyEmail: "valentin.bonani@gmail.com",
};

// URL pública del sitio, para los links de los emails.
export function siteUrl() {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3005";
}

export function whatsappUrl(message?: string) {
  const base = `https://wa.me/${SITE.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const instagramUrl = `https://instagram.com/${SITE.instagram}`;

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${SITE.address}, Quilmes, Buenos Aires`,
)}`;
