CREATE TYPE "public"."delivery_method" AS ENUM('retiro');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pendiente_pago', 'comprobante_recibido', 'pendiente_confirmacion', 'confirmado', 'pagado', 'listo_para_retirar', 'entregado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('transferencia', 'efectivo', 'mercadopago');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "orders_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"token" text NOT NULL,
	"status" "order_status" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"delivery_method" "delivery_method" NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"subtotal" integer NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"stock_reserved" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"receipt_path" text,
	"receipt_uploaded_at" timestamp with time zone,
	"cancel_reason" text,
	"customer_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"transfer_discount_percent" integer DEFAULT 10 NOT NULL,
	"cash_discount_percent" integer DEFAULT 15 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_discounts_range" CHECK ("settings"."transfer_discount_percent" between 0 and 90 and "settings"."cash_discount_percent" between 0 and 90)
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
