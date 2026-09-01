// Warna halaman acara (opsional). Menyuntik <style> yang dilingkupi ke elemen
// ber-`data-event-themed`. Ketiga warna diverifikasi HEX di server (parseHex).
//
// LIGHT MODE SAJA. Ketiga warna itu warna terang dari poster - dipaksakan ke
// mode gelap hasilnya selalu meleset. Jadi di mode gelap tema kustom TIDAK
// dipakai sama sekali: halaman kembali ke tema gelap situs + latar poster blur
// (aturan menyembunyikan latar blur di bawah pun cuma untuk mode terang).
//
// Prinsip lain: warna = PERMUKAAN & tint saja, tak pernah jadi warna
// teks/ikon/tombol (kontras tetap pakai token situs).
//
// Kelas yang disediakan (hanya aktif di mode terang saat tema di-set):
//   .evt-surface   - kartu utama: tint aksen + border aksen
//   .evt-tintcard  - kartu sekunder (sidebar): tint aksen-2
//   .evt-rail      - garis vertikal timeline agenda (border)
//   .evt-dot       - titik timeline
//   .evt-chip      - chip di hero (isi aksen, teks gelap)
//   [data-ambient] - latar poster blur; disembunyikan saat tema terang aktif

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

  const L = `[data-mode="light"] [data-event-themed]`;
  const css = `
${L}{background-color:${bg};--evt-accent:${accent};--evt-accent-2:${accent2};}
${L} [data-ambient]{display:none;}
${L} .evt-surface{
  background-color:color-mix(in srgb, var(--evt-accent) 10%, #ffffff);
  border-color:color-mix(in srgb, var(--evt-accent) 45%, transparent);
}
${L} .evt-tintcard{
  background-color:color-mix(in srgb, var(--evt-accent-2) 16%, #ffffff);
  border-color:color-mix(in srgb, var(--evt-accent-2) 42%, transparent);
}
${L} .evt-rail{border-color:color-mix(in srgb, var(--evt-accent) 75%, #8b7ca8);}
${L} .evt-dot{background-color:color-mix(in srgb, var(--evt-accent) 60%, #6b5b8a);}
${L} .evt-chip{background-color:var(--evt-accent);color:#2b2733;}
`.trim();

  return <style>{css}</style>;
}
