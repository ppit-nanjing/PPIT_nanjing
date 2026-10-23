-- Guidebook maba (issue #65), fase P1 dari docs/Guidebook Maba.md.
--
-- Semuanya aditif: tidak ada kolom atau tabel yang dihapus, jadi rollback
-- aplikasi tidak butuh DROP. Isi kontennya belum ada di sini; migrasi ini hanya
-- menyiapkan tempatnya - metadata topik, dokumen sumber, potongan untuk
-- pencarian FTS, cache jawaban, kuota harian, progres checklist maba, dan log
-- pertanyaan untuk KPI.

-- 1. Topik guidebook = help_articles yang punya `phase`. `content` tetap kolom
--    yang disunting pengurus (SSoT); `parsed_markdown` hanya ditulis script
--    ingest dan dipakai panel merge di console.
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "phase" text;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "source_label" text;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "source_doc_slug" text;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "parsed_markdown" text;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid REFERENCES "users"("id");
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
CREATE INDEX IF NOT EXISTS "help_articles_phase_idx" ON "help_articles" ("phase", "sort_order");

-- 2. Dokumen sumber. PDF aslinya tidak pernah jadi SSoT - ini hanya provenance,
--    plus hash supaya ingest ulang bisa melewati file yang tidak berubah.
CREATE TABLE IF NOT EXISTS "guide_documents" (
  "slug" text PRIMARY KEY,
  "title" text NOT NULL,
  "source_label" text NOT NULL,
  "pdf_url" text,
  "pdf_hash" text,
  "page_count" integer,
  "version" text,
  "ingested_at" timestamp NOT NULL DEFAULT now()
);

-- 3. Potongan untuk pencarian. Penanda [[pN]] di markdown jadi page_from/page_to.
--    `tsv` juga dipetakan di src/db/schema.ts (customType) supaya `db:push`
--    tidak menawarkan DROP kolom ini. to_tsvector(regconfig, text) immutable,
--    jadi GENERATED ... STORED sah.
CREATE TABLE IF NOT EXISTS "guide_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "article_id" uuid NOT NULL REFERENCES "help_articles"("id") ON DELETE CASCADE,
  "ordinal" integer NOT NULL,
  "heading" text,
  "page_from" integer,
  "page_to" integer,
  "text" text NOT NULL,
  "text_stemmed" text NOT NULL DEFAULT '',
  "tsv" tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce("heading", '') || ' ' || "text" || ' ' || "text_stemmed")
  ) STORED
);
-- Kalau tabelnya sudah ada tanpa `tsv` - misalnya dibuat `drizzle-kit push`
-- sebelum kolom itu dipetakan di schema.ts - CREATE TABLE di atas dilewati dan
-- indeks GIN di bawah akan gagal tanpa baris ini.
ALTER TABLE "guide_chunks" ADD COLUMN IF NOT EXISTS "tsv" tsvector GENERATED ALWAYS AS (
  to_tsvector('simple'::regconfig, coalesce("heading", '') || ' ' || "text" || ' ' || "text_stemmed")
) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS "guide_chunks_article_ordinal_idx" ON "guide_chunks" ("article_id", "ordinal");
CREATE INDEX IF NOT EXISTS "guide_chunks_tsv_idx" ON "guide_chunks" USING gin ("tsv");

-- 4. Satu baris saja. corpus_version adalah kunci cache: setiap konten atau
--    status tinjauan berubah, versinya naik dan cache lama otomatis diabaikan.
--    ai_enabled = kill switch tanpa deploy.
CREATE TABLE IF NOT EXISTS "guide_meta" (
  "one_row" boolean PRIMARY KEY DEFAULT true,
  "corpus_version" bigint NOT NULL DEFAULT 1,
  "chunker_version" integer NOT NULL DEFAULT 1,
  "ai_enabled" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
INSERT INTO "guide_meta" ("one_row") VALUES (true) ON CONFLICT DO NOTHING;

-- 5. Cache jawaban. Kuncinya (question_hash, corpus_version), jadi konten yang
--    berubah tidak perlu membersihkan baris lama - versi baru hanya tidak
--    mencocokkannya.
CREATE TABLE IF NOT EXISTS "guide_answers" (
  "question_hash" text NOT NULL,
  "corpus_version" bigint NOT NULL,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "chunk_ids" uuid[] NOT NULL,
  "hits" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("question_hash", "corpus_version")
);

-- 6. Kuota AI per akun per hari (15 pertanyaan/hari di ambang batas Groq gratis).
CREATE TABLE IF NOT EXISTS "ai_usage" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "day" date NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("user_id", "day")
);

-- 7. Progres checklist maba. Hanya langkah yang selesai yang disimpan.
CREATE TABLE IF NOT EXISTS "guidebook_progress" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "article_id" uuid NOT NULL REFERENCES "help_articles"("id") ON DELETE CASCADE,
  "done_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "article_id")
);

-- 8. Log pertanyaan untuk KPI. Yang disimpan hanya pertanyaan yang sudah
--    disunting (question_redacted); teks mentahnya tidak pernah masuk sini.
CREATE TABLE IF NOT EXISTS "ai_query_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "question_hash" text NOT NULL,
  "question_redacted" text,
  "chunk_ids" uuid[],
  "scores" real[],
  "cache_hit" boolean NOT NULL DEFAULT false,
  "used_llm" boolean NOT NULL DEFAULT false,
  "degraded_reason" text,
  "latency_ms" integer,
  "model" text,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);
