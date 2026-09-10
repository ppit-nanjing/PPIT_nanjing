-- Link peta opsional untuk events.location (dua slot - lokasi di China
-- lazimnya dibagikan lewat Amap DAN Baidu Maps sekaligus, orang biasanya
-- cuma pasang salah satu app). NULL keduanya = lokasi tampil teks biasa.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location_url" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location_url_2" text;
