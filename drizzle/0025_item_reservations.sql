-- Reservasi aset untuk acara PPIT: blokir sebuah aset selama periode tertentu.
CREATE TYPE "item_reservation_status" AS ENUM ('active', 'released');

CREATE TABLE IF NOT EXISTS "item_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
  "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
  "reason" text NOT NULL,
  "reserved_from" date NOT NULL,
  "reserved_to" date NOT NULL,
  "status" "item_reservation_status" NOT NULL DEFAULT 'active',
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "item_reservations_item_idx" ON "item_reservations" ("item_id", "status");
