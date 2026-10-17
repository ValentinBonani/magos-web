// Preparación inicial de Supabase. Se puede correr más de una vez sin problemas.
// Uso: node --env-file=.env.local scripts/setup.mjs
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

// 1. Bucket público para las fotos de productos.
const BUCKET = "product-images";
const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) throw listError;
if (buckets.some((b) => b.name === BUCKET)) {
  console.log(`Bucket "${BUCKET}" ya existe.`);
} else {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/webp"],
  });
  if (error) throw error;
  console.log(`Bucket "${BUCKET}" creado.`);
}

// 2. Categorías iniciales (se pueden editar desde el panel).
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
  let created = 0;
  for (const [section, names] of Object.entries(CATEGORIES)) {
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
