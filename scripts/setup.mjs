// Preparación inicial de Supabase. Se puede correr más de una vez sin problemas.
// Uso: node --env-file=.env.local scripts/setup.mjs
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

// 1. Buckets: fotos de productos (público) y comprobantes de transferencia (privado).
const BUCKETS = {
  "product-images": { public: true, fileSizeLimit: "5MB", allowedMimeTypes: ["image/webp"] },
  receipts: {
    public: false,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/webp", "application/pdf"],
  },
};
const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) throw listError;
for (const [name, options] of Object.entries(BUCKETS)) {
  if (buckets.some((b) => b.name === name)) {
    console.log(`Bucket "${name}" ya existe.`);
    continue;
  }
  const { error } = await supabase.storage.createBucket(name, options);
  if (error) throw error;
  console.log(`Bucket "${name}" creado.`);
}

// 2. Categorías iniciales, SOLO si no hay ninguna (después se manejan desde el panel;
//    no hay que volver a crear las que el dueño borró).
const CATEGORIES = {
  "juegos-de-mesa": [
    "Estrategia",
    "Familiares",
    "Party",
    "Cartas",
    "Infantiles",
    "Cooperativos",
  ],
  magic: ["Sobres", "Mazos"],
  pokemon: ["Sobres", "Mazos"],
};

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  const [{ total }] = await sql`select count(*)::int as total from categories`;
  let created = 0;
  for (const [section, names] of total > 0 ? [] : Object.entries(CATEGORIES)) {
    for (const name of names) {
      const rows = await sql`
        insert into categories (section, name, slug)
        values (${section}, ${name}, ${slugify(name)})
        on conflict (section, slug) do nothing
        returning id`;
      created += rows.length;
    }
  }
  console.log(`Categorías creadas: ${created}.`);
} finally {
  await sql.end();
}
