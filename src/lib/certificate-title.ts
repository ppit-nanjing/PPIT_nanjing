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
  // Kadiv: "Ketua Divisi Acara" — nama divisi acara kadang sudah diawali "Divisi".
  const kadivLabel = (unit: string) => (/^divisi\b/i.test(unit) ? `Ketua ${unit}` : `Ketua Divisi ${unit}`);
  const label = unitName
    ? role === "anggota"
      ? `Anggota ${unitName}`
      : role === "kadiv"
        ? kadivLabel(unitName)
        : `${titleCase(role)} ${unitName}`
    : role === "kadiv"
      ? "Ketua Divisi"
      : TOP_LEVEL[role] ?? titleCase(role);
  return eventTitle ? `${label} — ${eventTitle}` : label;
}
