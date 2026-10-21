CREATE TYPE "public"."block_kind" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('web', 'mostrador');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'tarjeta';--> statement-breakpoint
CREATE TABLE "blocked_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "block_kind" NOT NULL,
	"value" text NOT NULL,
	"display" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel" "channel" DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "whatsapp_button" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_contacts_kind_value_idx" ON "blocked_contacts" USING btree ("kind","value");