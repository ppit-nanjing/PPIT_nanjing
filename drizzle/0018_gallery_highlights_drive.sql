-- Gallery albums document events: public pages show highlight photos only,
-- the full set lives behind a Drive link on the album.
ALTER TABLE "gallery_albums" ADD COLUMN "drive_url" text;
ALTER TABLE "gallery_photos" ADD COLUMN "is_highlight" boolean NOT NULL DEFAULT false;
