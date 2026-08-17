-- Adds scheduled auto-publish support to events.
-- Existing event_status enum gets a new 'scheduled' value, and events gets a
-- scheduled_publish_at column. Minimal/incremental so it can be applied on top
-- of the already-created database (e.g. drizzle-kit migrate or a manual run).

ALTER TYPE "public"."event_status" ADD VALUE IF NOT EXISTS 'scheduled';--> statement-breakpoint

ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "scheduled_publish_at" timestamp;
