CREATE TABLE "source_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_name" text NOT NULL,
	"url" text NOT NULL,
	"content_hash" text NOT NULL,
	"raw_text" text NOT NULL,
	"fetched_at" text DEFAULT now()::text NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"processed_at" text,
	"records_extracted" integer DEFAULT 0
);
