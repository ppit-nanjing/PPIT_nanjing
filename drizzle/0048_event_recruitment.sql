-- Rekrutmen panitia acara
-- BPH bisa membuat pertanyaan kustom, anggota PPIT daftar lewat form publik,
-- BPH meninjau & menyetujui/menolak.

CREATE TYPE recruit_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE event_recruitment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers_json JSONB,
  status recruit_status NOT NULL DEFAULT 'pending',
  review_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX event_recruitment_application_unique
  ON event_recruitment_applications(event_id, user_id);

CREATE INDEX event_recruitment_application_event_idx
  ON event_recruitment_applications(event_id);

CREATE TABLE event_recruitment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options TEXT,
  required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX event_recruitment_questions_event_idx
  ON event_recruitment_questions(event_id, order_index);

ALTER TABLE events ADD COLUMN recruit_enabled BOOLEAN NOT NULL DEFAULT false;