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
};

export function whatsappUrl(message?: string) {
  const base = `https://wa.me/${SITE.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const instagramUrl = `https://instagram.com/${SITE.instagram}`;

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${SITE.address}, Quilmes, Buenos Aires`,
)}`;
