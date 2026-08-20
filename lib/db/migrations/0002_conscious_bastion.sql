CREATE TABLE "user_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"locality_id" integer NOT NULL,
	"description" text,
	"reporter_ip_hash" text,
	"created_at" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;