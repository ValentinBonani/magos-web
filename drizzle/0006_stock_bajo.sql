ALTER TABLE "settings" ADD COLUMN "low_stock_report_day" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "low_stock_report_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;