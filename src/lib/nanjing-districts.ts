import geo from "@/data/nanjing-districts.geo.json";

// 11 distrik Nanjing dari berkas batas wilayah yang sama dengan peta /map, supaya
// pilihan distrik di konsol tidak bisa beda ejaan dengan yang dicocokkan peta.
export const NANJING_DISTRICTS: { label: string; zh: string }[] = (
  geo as unknown as { features: { properties: { label: string; zh: string } }[] }
).features.map((f) => ({ label: f.properties.label, zh: f.properties.zh }));

/**
 * Nama distrik baku untuk teks yang diketik admin ("gulou", "鼓楼区", "鼓楼"), atau null
 * bila bukan distrik Nanjing. Aturannya sama dengan pencocokan di /map.
 */
export function canonicalDistrict(value: string | null | undefined): string | null {
  const key = value?.trim().toLowerCase();
  if (!key) return null;
  const hit = NANJING_DISTRICTS.find(
    (d) => d.label.toLowerCase() === key || d.zh === key || d.zh.replace(/区$/, "") === key,
  );
  return hit?.label ?? null;
}
