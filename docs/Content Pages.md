# Content Pages — News, Gallery, Legal

> Bagian dari [Information Architecture](./Information%20Architecture.md).

## News (`/news`)

`news_ppit_nanjing`, kanonik `news_master_edition`. Listing artikel berita organisasi (kegiatan, pengumuman) — preview-nya juga tampil di [Homepage](./Homepage%20&%20Login.md) § Latest News.

## Gallery (`/gallery`, `/gallery/archive`)

`gallery_ppit_nanjing`, kanonik `gallery_master_edition`, + `gallery_archive_filters_ppit_nanjing` (filter berdasarkan tahun/kategori/event). Album biasanya terkait ke satu event tertentu (lihat [GALLERY_ALBUM](./Data%20Dictionary.md) § `event_id`).

## Terms & Privacy (`/terms`, `/privacy`)

`terms_privacy_ppit_nanjing` — halaman legal statis, kemungkinan besar konten hardcode (markdown/CMS sederhana), bukan data dinamis dari database.

## Entitas terkait

[NEWS_ARTICLE](./Data%20Dictionary.md), [GALLERY_ALBUM](./Data%20Dictionary.md), [GALLERY_PHOTO](./Data%20Dictionary.md)

## Terkait

[Event Flow](./Event%20Flow.md) (gallery album ↔ event), [Homepage & Login](./Homepage%20&%20Login.md) (preview di beranda)
