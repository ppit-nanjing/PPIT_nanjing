-- UI language preference. Nullable, additive, no default - existing rows are
-- unaffected (same pattern as email_subscribed).
ALTER TABLE "users" ADD COLUMN "locale" text;
