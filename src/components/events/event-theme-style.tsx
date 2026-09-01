// Warna halaman acara (opsional). Menyuntik <style> yang mengatur variabel &
// beberapa kelas dekoratif, dilingkupi ke elemen ber-`data-event-themed`.
// Ketiga warna diverifikasi HEX di server (parseHex) sebelum sampai ke sini,
// jadi aman ditaruh di <style>.
//
// Prinsip: ketiga warna terang → hanya dipakai sebagai PERMUKAAN & tint, tidak
// pernah jadi warna teks/ikon/tombol (kontras itu tetap pakai token situs).
//
// Kelas yang disediakan:
//   .evt-surface   - kartu utama: tint aksen 10% + border aksen
//   .evt-tintcard  - kartu sekunder (sidebar): tint aksen-2
//   .evt-rail      - garis vertikal timeline agenda
//   .evt-chip      - chip di hero (isi aksen, teks gelap)

export function EventThemeStyle({
  bg,
  accent,
  accent2,
}: {
  bg: string | null;
  accent: string | null;
  accent2: string | null;
}) {
  const HEX = /^#[0-9a-f]{6}$/i;
  if (!bg || !accent || !accent2 || !HEX.test(bg) || !HEX.test(accent) || !HEX.test(accent2)) {
    return null;
  }

  const css = `
[data-event-themed]{--evt-accent:${accent};--evt-accent-2:${accent2};}
[data-mode="light"] [data-event-themed]{background-color:${bg};}
[data-event-themed] .evt-surface{
  background-color:color-mix(in srgb, var(--evt-accent) 10%, #ffffff);
  border-color:color-mix(in srgb, var(--evt-accent) 45%, transparent);
}
[data-mode="dark"] [data-event-themed] .evt-surface{
  background-color:color-mix(in srgb, var(--evt-accent) 14%, transparent);
}
[data-event-themed] .evt-tintcard{
  background-color:color-mix(in srgb, var(--evt-accent-2) 16%, #ffffff);
  border-color:color-mix(in srgb, var(--evt-accent-2) 42%, transparent);
}
[data-mode="dark"] [data-event-themed] .evt-tintcard{
  background-color:color-mix(in srgb, var(--evt-accent-2) 16%, transparent);
}
[data-event-themed] .evt-rail{border-color:color-mix(in srgb, var(--evt-accent) 75%, #8b7ca8);}
[data-event-themed] .evt-dot{background-color:color-mix(in srgb, var(--evt-accent) 60%, #6b5b8a);}
[data-event-themed] .evt-chip{background-color:var(--evt-accent);color:#2b2733;}
`.trim();

  return <style>{css}</style>;
}
