// Flat dictionary, not nested - this has to cross the server/client boundary
// as plain serializable data (see src/lib/i18n/client.tsx), and a flat object
// is easy to grep and lets `en.ts`'s `satisfies Dictionary` catch missing or
// mistyped keys at `tsc` time instead of silently rendering nothing at
// runtime. Key convention: `<area>.<screen/component>.<meaning>`.
//
// Scope so far: chrome (nav/footer/account menu) + /profile. Not yet covered:
// every other public page (Phase 2), and /console (deferred, Phase 4 - see
// the i18n build spec in Obsidian).
export const id = {
  "common.save": "Simpan",
  "common.cancel": "Batal",

  "nav.home": "Beranda",
  "nav.about": "Tentang",
  "nav.events": "Kegiatan",
  "nav.news": "Berita",
  "nav.gallery": "Galeri",
  "nav.jobs": "Lowongan",
  "nav.inventory": "Inventaris",
  "nav.search": "Cari",
  "nav.searchPlaceholder": "Cari…",
  "nav.searchAria": "Cari (Ctrl/⌘ + K)",
  "nav.searchHintPrefix": "Tekan",
  "nav.searchHintSuffix": "untuk mencari cepat di semua halaman.",
  "nav.searchHintDismiss": "Mengerti",
  "nav.menuOpen": "Buka menu",
  "nav.menuClose": "Tutup menu",
  "nav.login": "Login",
  "nav.viewProfile": "Lihat Profil",
  "nav.switchLanguageAria": "Ganti bahasa ke {{lang}}",

  "discover.trigger": "Jelajahi",
  "discover.universities.label": "Kampus",
  "discover.universities.desc": "Direktori kampus di 9 kota naungan",
  "discover.places.label": "Tempat",
  "discover.places.desc": "Wisata, rumah ibadah, dan lokasi penting",
  "discover.coverage.label": "Wilayah",
  "discover.coverage.desc": "9 kota naungan PPIT Nanjing",
  "discover.map.label": "Peta Distrik",
  "discover.map.desc": "11 distrik Kota Nanjing",
  "discover.catalogue.label": "Katalog",
  "discover.catalogue.desc": "Merchandise, donasi, dan sponsorship",

  "footer.joinHeading": "Ayo bergabung dengan PPIT Nanjing.",
  "footer.joinCta": "Gabung Sekarang",
  "footer.about": "Tentang",
  "footer.aboutLinks.structure": "Struktur Organisasi",
  "footer.aboutLinks.sensus": "Isi Sensus",
  "footer.aboutLinks.terms": "Ketentuan",
  "footer.aboutLinks.privacy": "Privasi",
  "footer.aboutLinks.adart": "AD/ART",
  "footer.instagramAria": "Instagram PPIT Nanjing",

  "accountMenu.myProfile": "Profil Saya",
  "accountMenu.submissions": "Riwayat Pengajuan",
  "accountMenu.console": "Masuk ke Console",
  "accountMenu.logout": "Logout",
  "accountMenu.login": "Login",

  "profile.title": "Profil Saya",
  "profile.sectionProfile": "Profil",
  "profile.displayName": "Nama Tampilan",
  "profile.displayNamePlaceholder": "Nama yang ditampilkan di situs",
  "profile.photo": "Foto Profil",
  "profile.phone": "No. Telepon/WhatsApp",
  "profile.wechat": "WeChat ID",
  "profile.socialHeading": "Media Sosial (opsional)",
  "profile.urlPlaceholder": "URL atau handle",
  "profile.saveButton": "Simpan Profil",
  "profile.cancel": "Batal",
  "profile.sensusHeading": "Data Sensus",
  "profile.sensusComplete": "Data sensus lengkap",
  "profile.sensusIncomplete": "Data sensus belum diisi",
  "profile.sensusDesc": "Universitas, program studi, kontak darurat, dan data akademik lainnya",
  "profile.sensusEdit": "Ubah",
  "profile.sensusFill": "Isi Sekarang",
  "profile.notificationHeading": "Preferensi Notifikasi",

  "emailSub.title": "Email Berita & Kegiatan",
  "emailSub.desc": "Dapatkan info berita dan event PPIT Nanjing lewat email",

  "settings.language.label": "Bahasa",
  "settings.language.help": "Mengubah bahasa tampilan situs.",
  "settings.language.contentNotice":
    "Berita, kegiatan, dan konten lain yang ditulis pengurus tetap tampil dalam bahasa aslinya.",
  "settings.language.switching": "Mengganti bahasa…",
};

// No `as const` - that would make every VALUE a string literal too, and then
// en.ts's `satisfies Dictionary` would require en's text to literally equal
// id's Indonesian text. Only the KEYS need to be literal (they already are,
// with or without `as const`, since object property names infer as literals)
// so a missing/misspelled key in en.ts still fails `tsc --noEmit`.
export type Dictionary = Record<keyof typeof id, string>;
export type TKey = keyof Dictionary;
