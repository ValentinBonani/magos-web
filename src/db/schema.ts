import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Todas las tablas tienen RLS activado y sin políticas: la API pública de Supabase
// (clave publishable) no puede leerlas ni escribirlas. La web accede por conexión
// directa a Postgres, que no pasa por RLS.

export const SECTIONS = ["juegos-de-mesa", "magic", "pokemon"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  "juegos-de-mesa": "Juegos de mesa",
  magic: "Magic",
  pokemon: "Pokémon",
};

export const sectionEnum = pgEnum("section", SECTIONS);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    section: sectionEnum("section").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("categories_section_slug_idx").on(t.section, t.slug)],
).enableRLS();

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    // Precio en pesos argentinos, sin centavos.
    price: integer("price").notNull(),
    stock: integer("stock").notNull().default(0),
    minPlayers: integer("min_players"),
    maxPlayers: integer("max_players"),
    minAge: integer("min_age"),
    publisher: text("publisher"),
    // Oculto = no se muestra en la tienda (baja lógica).
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_created_at_idx").on(t.createdAt),
    check("products_price_positive", sql`${t.price} > 0`),
    check("products_stock_non_negative", sql`${t.stock} >= 0`),
    check(
      "products_players_range",
      sql`${t.minPlayers} is null or ${t.maxPlayers} is null or ${t.minPlayers} <= ${t.maxPlayers}`,
    ),
  ],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Ruta dentro del bucket "product-images" de Supabase Storage.
    path: text("path").notNull(),
    // Orden de las fotos; la 0 es la principal.
    position: integer("position").notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
).enableRLS();

// ---------- Pedidos ----------

// "tarjeta" es solo para ventas del mostrador (posnet).
export const PAYMENT_METHODS = ["transferencia", "efectivo", "mercadopago", "tarjeta"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);

export const COUNTER_PAYMENT_METHODS = ["efectivo", "transferencia", "tarjeta"] as const satisfies readonly PaymentMethod[];
export type CounterPaymentMethod = (typeof COUNTER_PAYMENT_METHODS)[number];

// Pedidos de la web o ventas registradas en el mostrador del local.
export const CHANNELS = ["web", "mostrador"] as const;
export type Channel = (typeof CHANNELS)[number];
export const channelEnum = pgEnum("channel", CHANNELS);

// Por ahora solo retiro en el local; "envio" llega cuando se elija la empresa de correo.
export const DELIVERY_METHODS = ["retiro"] as const;
export const deliveryMethodEnum = pgEnum("delivery_method", DELIVERY_METHODS);

export const ORDER_STATUSES = [
  "pendiente_pago", // transferencia: esperando comprobante (reserva 2 hs)
  "comprobante_recibido", // transferencia: comprobante subido, falta que el admin lo revise
  "pendiente_confirmacion", // efectivo: esperando que el cliente escriba por WhatsApp (sin reserva)
  "pendiente_mp", // Mercado Pago: el cliente está pagando (reserva 30 min)
  "confirmado", // efectivo: confirmado por el admin, stock reservado, paga al retirar
  "pagado",
  "listo_para_retirar",
  "entregado",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Número visible para el cliente: #1001, #1002...
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity({ startWith: 1001 }),
    // Token secreto del link único al pedido (/pedido/<token>).
    token: text("token").notNull().unique(),
    channel: channelEnum("channel").notNull().default("web"),
    status: orderStatusEnum("status").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),
    // En las ventas del mostrador el nombre es opcional ("Mostrador") y el email y el
    // teléfono quedan vacíos.
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    // Montos en pesos. total = subtotal - discountAmount + shippingCost.
    subtotal: integer("subtotal").notNull(),
    discountPercent: integer("discount_percent").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    shippingCost: integer("shipping_cost").notNull().default(0),
    total: integer("total").notNull(),
    // true mientras el pedido tiene descontado el stock de sus productos.
    stockReserved: boolean("stock_reserved").notNull().default(false),
    // Si no avanza antes de esta fecha, se cancela solo (null = no vence).
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    // Comprobante de transferencia (bucket privado "receipts").
    receiptPath: text("receipt_path"),
    receiptUploadedAt: timestamp("receipt_uploaded_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    customerIp: text("customer_ip"),
    // Mercado Pago: link de pago (Checkout Pro) y último pago informado.
    mpInitPoint: text("mp_init_point"),
    mpPaymentId: text("mp_payment_id"),
    mpPaymentStatus: text("mp_payment_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_email_idx").on(t.customerEmail),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Si el producto se borra, el pedido conserva el nombre y el precio.
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
).enableRLS();

// ---------- Configuración (una sola fila, id = 1) ----------

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    transferDiscountPercent: integer("transfer_discount_percent").notNull().default(10),
    cashDiscountPercent: integer("cash_discount_percent").notNull().default(15),
    // Botón flotante de WhatsApp en la tienda.
    whatsappButton: boolean("whatsapp_button").notNull().default(true),
    // Email diario de stock bajo: último día enviado (AAAA-MM-DD, hora de Argentina) y
    // productos que figuraban, para avisar solo cuando hay alguno nuevo.
    lowStockReportDay: text("low_stock_report_day"),
    lowStockReportIds: uuid("low_stock_report_ids").array().notNull().default(sql`'{}'::uuid[]`),
  },
  (t) => [
    check("settings_single_row", sql`${t.id} = 1`),
    check(
      "settings_discounts_range",
      sql`${t.transferDiscountPercent} between 0 and 90 and ${t.cashDiscountPercent} between 0 and 90`,
    ),
  ],
).enableRLS();

// ---------- Eventos del local (torneos, noches de juego...) ----------

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    // Foto opcional, en el bucket "product-images".
    imagePath: text("image_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("events_starts_at_idx").on(t.startsAt)],
).enableRLS();

// ---------- Contactos bloqueados (no pueden hacer pedidos en la web) ----------

export const BLOCK_KINDS = ["email", "phone"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export const blockKindEnum = pgEnum("block_kind", BLOCK_KINDS);

export const blockedContacts = pgTable(
  "blocked_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: blockKindEnum("kind").notNull(),
    // Normalizado: email en minúsculas; teléfono = últimos 8 dígitos (ver contactKey).
    value: text("value").notNull(),
    // Lo que se ve en el panel (el email o teléfono como se cargó) y el motivo.
    display: text("display").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("blocked_contacts_kind_value_idx").on(t.kind, t.value)],
).enableRLS();

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type BlockedContact = typeof blockedContacts.$inferSelect;
export type Event = typeof events.$inferSelect;
