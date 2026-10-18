ALTER TYPE "public"."order_status" ADD VALUE 'pendiente_mp' BEFORE 'confirmado';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_init_point" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_payment_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_payment_status" text;