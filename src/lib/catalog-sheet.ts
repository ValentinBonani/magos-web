import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, SECTION_LABELS, SECTIONS, type Section } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { slugify } from "@/lib/slug";

// Catálogo en Excel: exportar, y importar para crear productos nuevos (fila sin ID) o
// actualizar los existentes (fila con ID). Los productos que no están en la planilla
// no se tocan. Las fotos se cargan desde el panel.
//
// Stock: la planilla lleva una columna oculta con el stock al momento de exportar. Si
// el stock de una fila no se cambió, se respeta el de la base (puede haber habido
// ventas mientras se editaba la planilla); solo se pisa si se editó.

const SHEET = "Productos";
const LISTS_SHEET = "Listas";
const MAX_ROWS = 2000;

const COLUMNS = [
  { key: "id", header: "ID (no tocar)", width: 38 },
  { key: "name", header: "Nombre", width: 40 },
  { key: "section", header: "Sección", width: 16 },
  { key: "category", header: "Categoría", width: 18 },
  { key: "price", header: "Precio", width: 12 },
  { key: "stock", header: "Stock", width: 8 },
  { key: "description", header: "Descripción", width: 60 },
  { key: "minPlayers", header: "Jugadores mín", width: 14 },
  { key: "maxPlayers", header: "Jugadores máx", width: 14 },
  { key: "minAge", header: "Edad mín", width: 10 },
  { key: "publisher", header: "Editorial", width: 20 },
  { key: "visible", header: "Visible", width: 9 },
  { key: "stockOriginal", header: "Stock al exportar", width: 10 },
] as const;
type ColumnKey = (typeof COLUMNS)[number]["key"];

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

// ---------- Exportar ----------

export async function buildCatalogWorkbook() {
  const [rows, cats] = await Promise.all([
    db
      .select({ product: products, section: categories.section, category: categories.name })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .orderBy(asc(categories.section), asc(categories.name), asc(products.name)),
    db.select().from(categories).orderBy(asc(categories.section), asc(categories.name)),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Magos del Sur";
  wb.created = new Date();
  const ws = wb.addWorksheet(SHEET, { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] });
  ws.columns = COLUMNS.map((c) => ({ key: c.key, header: c.header, width: c.width }));
  ws.getRow(1).font = { bold: true };
  ws.getColumn("id").font = { color: { argb: "FF999999" } };
  ws.getColumn("stockOriginal").hidden = true;
  ws.getColumn("price").numFmt = '"$" #,##0';
  ws.getColumn("description").alignment = { wrapText: false };

  for (const { product: p, section, category } of rows) {
    ws.addRow({
      id: p.id,
      name: p.name,
      section: SECTION_LABELS[section],
      category,
      price: p.price,
      stock: p.stock,
      description: p.description,
      minPlayers: p.minPlayers,
      maxPlayers: p.maxPlayers,
      minAge: p.minAge,
      publisher: p.publisher,
      visible: p.active ? "Sí" : "No",
      stockOriginal: p.stock,
    });
  }

  // Listas para los desplegables (y de referencia).
  const lists = wb.addWorksheet(LISTS_SHEET);
  lists.columns = [
    { header: "Sección", key: "section", width: 16 },
    { header: "Categoría", key: "category", width: 20 },
    { header: "", key: "gap", width: 4 },
    { header: "Secciones", key: "sections", width: 16 },
    { header: "Visible", key: "yesno", width: 8 },
  ];
  lists.getRow(1).font = { bold: true };
  cats.forEach((c, i) => {
    lists.getCell(i + 2, 1).value = SECTION_LABELS[c.section];
    lists.getCell(i + 2, 2).value = c.name;
  });
  SECTIONS.forEach((s, i) => (lists.getCell(i + 2, 4).value = SECTION_LABELS[s]));
  ["Sí", "No"].forEach((v, i) => (lists.getCell(i + 2, 5).value = v));

  const lastRow = Math.max(rows.length + 1, 500);
  const colLetter = (key: ColumnKey) => ws.getColumn(key).letter;
  const catRange = `${LISTS_SHEET}!$B$2:$B$${Math.max(cats.length + 1, 2)}`;
  for (let r = 2; r <= lastRow; r++) {
    ws.getCell(`${colLetter("section")}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`${LISTS_SHEET}!$D$2:$D$${SECTIONS.length + 1}`],
    };
    ws.getCell(`${colLetter("category")}${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [catRange] };
    ws.getCell(`${colLetter("visible")}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`${LISTS_SHEET}!$E$2:$E$3`],
    };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- Importar ----------

export type FieldChange = { field: string; from: string; to: string };
export type ImportPlan = {
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
  creates: { row: number; name: string; summary: string }[];
  updates: { row: number; id: string; name: string; changes: FieldChange[] }[];
  unchanged: number;
};

type ProductValues = {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  stock: number;
  minPlayers: number | null;
  maxPlayers: number | null;
  minAge: number | null;
  publisher: string | null;
  active: boolean;
};

// Valor de una celda como texto (las celdas pueden tener fórmulas, links o formato).
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((t) => t.text).join("").trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value) return String(value.text).trim();
  }
  return String(value).trim();
}

// "$ 15.000", "15000", 15000 -> 15000. "" -> null. Inválido -> NaN.
function parseInteger(text: string) {
  if (text === "") return null;
  const clean = text.replace(/[$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function parseYesNo(text: string) {
  const t = normalize(text);
  if (["si", "s", "true", "1", "visible"].includes(t)) return true;
  if (["no", "n", "false", "0", "oculto"].includes(t)) return false;
  return undefined;
}

type ParsedRow = { row: number; cells: Partial<Record<ColumnKey, string>> };

async function readRows(file: ArrayBuffer): Promise<ParsedRow[] | { error: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(file);
  } catch {
    return { error: "No se pudo leer el archivo. Tiene que ser una planilla de Excel (.xlsx)." };
  }
  const ws = wb.getWorksheet(SHEET) ?? wb.worksheets[0];
  if (!ws) return { error: "La planilla está vacía." };

  // Las columnas se reconocen por el título (se pueden reordenar o borrar las que no se usan).
  const byHeader = new Map(COLUMNS.map((c) => [normalize(c.header), c.key]));
  byHeader.set("id", "id");
  const columnOf = new Map<number, ColumnKey>();
  ws.getRow(1).eachCell((cell, col) => {
    const key = byHeader.get(normalize(cellText(cell.value)));
    if (key) columnOf.set(col, key);
  });
  const present = new Set(columnOf.values());
  if (!present.has("name")) return { error: 'No se encontró la columna "Nombre" en la primera fila.' };

  const rows: ParsedRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: ParsedRow["cells"] = {};
    let any = false;
    columnOf.forEach((key, col) => {
      const text = cellText(row.getCell(col).value);
      cells[key] = text;
      if (text && key !== "stockOriginal") any = true;
    });
    if (any) rows.push({ row: rowNumber, cells });
  });
  if (rows.length > MAX_ROWS) return { error: `La planilla tiene más de ${MAX_ROWS} filas.` };
  return rows;
}

const FIELD_LABELS: Record<keyof ProductValues, string> = {
  name: "Nombre",
  description: "Descripción",
  categoryId: "Categoría",
  price: "Precio",
  stock: "Stock",
  minPlayers: "Jugadores mín",
  maxPlayers: "Jugadores máx",
  minAge: "Edad mín",
  publisher: "Editorial",
  active: "Visible",
};

type Prepared = {
  plan: ImportPlan;
  inserts: (ProductValues & { slug: string })[];
  patches: { id: string; set: Partial<ProductValues> }[];
};

async function prepareImport(file: ArrayBuffer): Promise<Prepared | { error: string }> {
  const rows = await readRows(file);
  if ("error" in rows) return rows;

  const [existing, cats] = await Promise.all([db.select().from(products), db.select().from(categories)]);
  const productsById = new Map(existing.map((p) => [p.id, p]));
  const sectionByLabel = new Map<string, Section>(SECTIONS.map((s) => [normalize(SECTION_LABELS[s]), s]));
  const categoryByKey = new Map(cats.map((c) => [`${c.section}|${normalize(c.name)}`, c]));
  const categoryName = new Map(cats.map((c) => [c.id, `${SECTION_LABELS[c.section]} · ${c.name}`]));
  const takenSlugs = new Set(existing.map((p) => p.slug));
  const existingNames = new Set(existing.map((p) => normalize(p.name)));
  const seenIds = new Set<string>();

  const plan: ImportPlan = { errors: [], warnings: [], creates: [], updates: [], unchanged: 0 };
  const inserts: Prepared["inserts"] = [];
  const patches: Prepared["patches"] = [];

  for (const { row, cells } of rows) {
    const errors: string[] = [];
    const id = cells.id ?? "";
    const current = id ? productsById.get(id) : undefined;
    if (id && !current) {
      plan.errors.push({ row, message: "El ID no corresponde a ningún producto. Para un producto nuevo, dejá el ID vacío." });
      continue;
    }
    if (id && seenIds.has(id)) {
      plan.errors.push({ row, message: "Este producto aparece repetido en la planilla." });
      continue;
    }
    if (id) seenIds.add(id);
    const isNew = !current;
    const has = (key: ColumnKey) => key in cells;

    const values: Partial<ProductValues> = {};

    if (has("name")) {
      const name = cells.name!;
      if (name.length < 2) errors.push("Falta el nombre.");
      else if (name.length > 120) errors.push("El nombre es muy largo (máximo 120).");
      else values.name = name;
    }
    if (has("description")) {
      const d = cells.description!;
      if (!d) errors.push("Falta la descripción.");
      else if (d.length > 5000) errors.push("La descripción es muy larga.");
      else values.description = d;
    }
    if (has("section") || has("category")) {
      const section = sectionByLabel.get(normalize(cells.section ?? ""));
      if (!section) errors.push(`Sección inválida: "${cells.section ?? ""}". Usá ${SECTIONS.map((s) => SECTION_LABELS[s]).join(", ")}.`);
      else {
        const category = categoryByKey.get(`${section}|${normalize(cells.category ?? "")}`);
        if (!category) errors.push(`La categoría "${cells.category ?? ""}" no existe en ${SECTION_LABELS[section]} (ver la hoja "Listas").`);
        else values.categoryId = category.id;
      }
    }
    if (has("price")) {
      const price = parseInteger(cells.price!);
      if (price === null || Number.isNaN(price) || price < 1) errors.push("El precio tiene que ser un número mayor a 0.");
      else values.price = price;
    }

    let stockNote: string | null = null;
    if (has("stock")) {
      const stock = parseInteger(cells.stock!) ?? 0;
      const original = has("stockOriginal") ? parseInteger(cells.stockOriginal!) : null;
      if (Number.isNaN(stock) || stock < 0 || stock > 100000) errors.push("El stock tiene que ser un número de 0 en adelante.");
      else if (isNew || original === null || Number.isNaN(original) || stock !== original) {
        values.stock = stock;
        if (current && original !== null && !Number.isNaN(original) && current.stock !== original) {
          stockNote = `El stock cambió desde que bajaste la planilla (era ${original}, ahora hay ${current.stock}). Se va a poner ${stock}, como dice la planilla.`;
        }
      }
    }

    for (const [key, label, max] of [
      ["minPlayers", "Jugadores mín", 100],
      ["maxPlayers", "Jugadores máx", 100],
      ["minAge", "Edad mín", 99],
    ] as const) {
      if (!has(key)) continue;
      const n = parseInteger(cells[key]!);
      if (n !== null && (Number.isNaN(n) || n < 1 || n > max)) errors.push(`${label}: tiene que ser un número de 1 a ${max}.`);
      else values[key] = n;
    }
    if (has("publisher")) {
      const p = cells.publisher!;
      if (p.length > 80) errors.push("La editorial es muy larga.");
      else values.publisher = p || null;
    }
    if (has("visible") && cells.visible) {
      const v = parseYesNo(cells.visible);
      if (v === undefined) errors.push('Visible: poné "Sí" o "No".');
      else values.active = v;
    }

    const min = values.minPlayers !== undefined ? values.minPlayers : current?.minPlayers ?? null;
    const max = values.maxPlayers !== undefined ? values.maxPlayers : current?.maxPlayers ?? null;
    if (min && max && min > max) errors.push("Jugadores mín no puede ser mayor que jugadores máx.");

    if (isNew) {
      if (!values.name && !errors.some((e) => e.includes("nombre"))) errors.push("Falta el nombre.");
      if (!values.categoryId && !has("section")) errors.push("Faltan la sección y la categoría.");
      if (values.price === undefined && !has("price")) errors.push("Falta el precio.");
      if (!values.description && !has("description")) errors.push("Falta la descripción.");
    }

    if (errors.length) {
      plan.errors.push(...errors.map((message) => ({ row, message })));
      continue;
    }
    if (stockNote) plan.warnings.push({ row, message: stockNote });

    if (isNew) {
      const base = slugify(values.name!) || "producto";
      let slug = base;
      for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
      takenSlugs.add(slug);
      // Típico al subir dos veces la misma planilla: las filas sin ID se crearían de nuevo.
      if (existingNames.has(normalize(values.name!))) {
        plan.warnings.push({
          row,
          message: `Ya hay un producto llamado "${values.name}": se va a crear otro. Si es el mismo, poné su ID (bajá la planilla de nuevo) o borrá la fila.`,
        });
      }
      existingNames.add(normalize(values.name!));
      // Sin fotos no se muestra en la tienda: queda oculto hasta cargarlas en el panel.
      if (values.active) plan.warnings.push({ row, message: `"${values.name}" se crea oculto: cargale las fotos desde el panel y marcalo visible.` });
      inserts.push({
        name: values.name!,
        description: values.description!,
        categoryId: values.categoryId!,
        price: values.price!,
        stock: values.stock ?? 0,
        minPlayers: values.minPlayers ?? null,
        maxPlayers: values.maxPlayers ?? null,
        minAge: values.minAge ?? null,
        publisher: values.publisher ?? null,
        active: false,
        slug,
      });
      plan.creates.push({
        row,
        name: values.name!,
        summary: `${categoryName.get(values.categoryId!)} · ${formatPrice(values.price!)} · stock ${values.stock ?? 0}`,
      });
      continue;
    }

    const set: Partial<ProductValues> = {};
    const changes: FieldChange[] = [];
    const show = (key: keyof ProductValues, v: unknown) => {
      if (v === null || v === undefined || v === "") return "(vacío)";
      if (key === "price") return formatPrice(v as number);
      if (key === "active") return v ? "Sí" : "No";
      if (key === "categoryId") return categoryName.get(v as string) ?? "?";
      if (key === "description") return `${String(v).slice(0, 40)}${String(v).length > 40 ? "…" : ""}`;
      return String(v);
    };
    for (const key of Object.keys(values) as (keyof ProductValues)[]) {
      if (values[key] === current![key]) continue;
      (set as Record<string, unknown>)[key] = values[key];
      changes.push({ field: FIELD_LABELS[key], from: show(key, current![key]), to: show(key, values[key]) });
    }
    if (changes.length === 0) {
      plan.unchanged++;
      continue;
    }
    patches.push({ id: current!.id, set });
    plan.updates.push({ row, id: current!.id, name: values.name ?? current!.name, changes });
  }

  return { plan, inserts, patches };
}

export async function previewImport(file: ArrayBuffer) {
  const prepared = await prepareImport(file);
  return "error" in prepared ? prepared : prepared.plan;
}

// Aplica todo o nada. Si la planilla tiene errores no aplica nada.
export async function applyImport(file: ArrayBuffer) {
  const prepared = await prepareImport(file);
  if ("error" in prepared) return prepared;
  const { plan, inserts, patches } = prepared;
  if (plan.errors.length) return { error: "La planilla tiene errores. Corregilos y volvé a subirla." };

  await db.transaction(async (tx) => {
    for (const p of patches) await tx.update(products).set(p.set).where(eq(products.id, p.id));
    if (inserts.length) await tx.insert(products).values(inserts);
  });
  return { created: inserts.length, updated: patches.length };
}
