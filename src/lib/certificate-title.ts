// Judul sertifikat panitia, dirakit dari peran + nama divisi + nama acara supaya
// "Ketua Departemen Perlengkapan — WIF 2026" tidak perlu diketik satu per satu.
// Tanpa divisi, peran berdiri sendiri sebagai jabatan tingkat acara: "ketua" jadi
// Ketua Pelaksana, bukan "Ketua " menggantung tanpa nama unit. Itu yang membuat
// BPH + SC terbaca benar.

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildCertificateTitle(role: string, unitName: string | null, eventTitle: string | null): string {
  const TOP_LEVEL: Record<string, string> = {
    ketua: "Ketua Pelaksana",
    wakil: "Wakil Ketua Pelaksana",
    supervisor: "Supervisory Committee",
    sekretaris: "Sekretaris",
    bendahara: "Bendahara",
    anggota: "Panitia",
  };
  const label = unitName
    ? role === "anggota"
      ? `Anggota ${unitName}`
      : `${titleCase(role)} ${unitName}`
    : TOP_LEVEL[role] ?? titleCase(role);
  return eventTitle ? `${label} — ${eventTitle}` : label;
}
