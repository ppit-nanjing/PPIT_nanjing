"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { places, universities, districts, merchandise, sponsors, coverageCities } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { translateFields } from "@/lib/groq";

// Places, universities, merchandise and sponsors are all editorial content, so
// they sit behind the existing "content" scope rather than inventing a new
// module (which would need a matching change to departments.adminModuleScope in
// the seed). Donation *verification* is deliberately NOT here - money records
// are gated harder, in actions/donations.ts.
const CONTENT = "content" as const;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;
const num = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

// Isi kolom *_en: field yang admin sudah tulis sendiri (lewat form edit) dipakai
// apa adanya dan TIDAK PERNAH ditimpa AI; hanya field yang kosong di `explicit`
// yang diterjemahkan dari `source` via Groq. Create selalu memanggil ini dengan
// explicit={} (form create tidak punya input *_en), jadi semuanya diterjemahkan.
// Kalau admin mengosongkan lagi field *_en di form edit lalu simpan, itu jadi
// cara memicu terjemahan ulang. AI gagal/down -> field itu tetap null, halaman
// publik fallback ke teks sumbernya sendiri.
async function withEnglish<K extends string>(
  explicit: Partial<Record<K, string | null>>,
  source: Partial<Record<K, string | null>>,
): Promise<Record<K, string | null>> {
  const toTranslate: Record<string, string> = {};
  for (const k of Object.keys(source) as K[]) {
    if (!explicit[k] && source[k]) toTranslate[k] = source[k]!;
  }
  const translated = Object.keys(toTranslate).length > 0 ? await translateFields(toTranslate) : {};
  const result = {} as Record<K, string | null>;
  for (const k of Object.keys(source) as K[]) {
    result[k] = explicit[k] ?? translated[k] ?? null;
  }
  return result;
}

function refresh() {
  revalidatePath("/console/katalog");
  revalidatePath("/places");
  revalidatePath("/universities");
  revalidatePath("/catalogue");
  revalidatePath("/catalogue/sponsorship");
  revalidatePath("/coverage");
}

// ---------- reads ----------

export async function listCityContent() {
  await requireModuleAccess(CONTENT);
  const [placeRows, uniRows, districtRows, merchRows, sponsorRows] = await Promise.all([
    db.select().from(places).orderBy(asc(places.orderIndex), asc(places.name)),
    db.select().from(universities).orderBy(asc(universities.orderIndex), asc(universities.name)),
    db.select().from(districts).orderBy(asc(districts.orderIndex), asc(districts.name)),
    db.select().from(merchandise).orderBy(asc(merchandise.orderIndex), asc(merchandise.name)),
    db.select().from(sponsors).orderBy(asc(sponsors.orderIndex), asc(sponsors.name)),
  ]);
  return { places: placeRows, universities: uniRows, districts: districtRows, merchandise: merchRows, sponsors: sponsorRows };
}

// ---------- places ----------

export async function createPlace(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const name = str(formData, "name");
  if (!name) throw new Error("Nama tempat wajib diisi");
  const description = str(formData, "description");
  const address = str(formData, "address");
  const en = await withEnglish({}, { name, description, address });
  await db.insert(places).values({
    name,
    nameZh: str(formData, "nameZh"),
    nameEn: en.name,
    category: (str(formData, "category") ?? "tourism") as "tourism",
    district: str(formData, "district"),
    description,
    descriptionEn: en.description,
    address,
    addressZh: str(formData, "addressZh"),
    addressEn: en.address,
    imageUrl: str(formData, "imageUrl"),
    mapUrl: str(formData, "mapUrl"),
    orderIndex: num(formData, "orderIndex") ?? 0,
    published: !formData.has("publishedTouched") || bool(formData, "published"),
  });
  refresh();
}

export async function deletePlace(formData: FormData) {
  await requireModuleAccess(CONTENT);
  await db.delete(places).where(eq(places.id, String(formData.get("id") ?? "")));
  refresh();
}

// Field set mirrors createPlace exactly - fixing one coordinator email or a
// typo must not require delete + recreate (which also loses the image upload).
export async function updatePlace(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const id = String(formData.get("id") ?? "");
  const name = str(formData, "name");
  if (!id || !name) throw new Error("Nama tempat wajib diisi");
  const description = str(formData, "description");
  const address = str(formData, "address");
  const en = await withEnglish(
    { name: str(formData, "nameEn"), description: str(formData, "descriptionEn"), address: str(formData, "addressEn") },
    { name, description, address },
  );
  await db
    .update(places)
    .set({
      name,
      nameZh: str(formData, "nameZh"),
      nameEn: en.name,
      category: (str(formData, "category") ?? "tourism") as "tourism",
      district: str(formData, "district"),
      description,
      descriptionEn: en.description,
      address,
      addressZh: str(formData, "addressZh"),
      addressEn: en.address,
      imageUrl: str(formData, "imageUrl"),
      mapUrl: str(formData, "mapUrl"),
      orderIndex: num(formData, "orderIndex") ?? 0,
      published: bool(formData, "published"),
    })
    .where(eq(places.id, id));
  refresh();
}

export async function togglePlacePublished(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const id = String(formData.get("id") ?? "");
  await db.update(places).set({ published: formData.get("next") === "true" }).where(eq(places.id, id));
  refresh();
}

// ---------- universities & districts ----------

export async function createUniversity(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const name = str(formData, "name");
  if (!name) throw new Error("Nama universitas wajib diisi");
  const description = str(formData, "description");
  const en = await withEnglish({}, { description });
  await db.insert(universities).values({
    name,
    nameZh: str(formData, "nameZh"),
    abbreviation: str(formData, "abbreviation"),
    city: str(formData, "city"),
    district: str(formData, "district"),
    coordinatorName: str(formData, "coordinatorName"),
    coordinatorEmail: str(formData, "coordinatorEmail"),
    description,
    descriptionEn: en.description,
    websiteUrl: str(formData, "websiteUrl"),
    logoUrl: str(formData, "logoUrl"),
    studentCount: num(formData, "studentCount"),
    isPartner: bool(formData, "isPartner"),
    orderIndex: num(formData, "orderIndex") ?? 0,
  });
  refresh();
}

export async function deleteUniversity(formData: FormData) {
  await requireModuleAccess(CONTENT);
  await db.delete(universities).where(eq(universities.id, String(formData.get("id") ?? "")));
  refresh();
}

export async function updateUniversity(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const id = String(formData.get("id") ?? "");
  const name = str(formData, "name");
  if (!id || !name) throw new Error("Nama universitas wajib diisi");
  const description = str(formData, "description");
  const en = await withEnglish({ description: str(formData, "descriptionEn") }, { description });
  await db
    .update(universities)
    .set({
      name,
      nameZh: str(formData, "nameZh"),
      abbreviation: str(formData, "abbreviation"),
      city: str(formData, "city"),
      district: str(formData, "district"),
      coordinatorName: str(formData, "coordinatorName"),
      coordinatorEmail: str(formData, "coordinatorEmail"),
      description,
      descriptionEn: en.description,
      websiteUrl: str(formData, "websiteUrl"),
      logoUrl: str(formData, "logoUrl"),
      studentCount: num(formData, "studentCount"),
      isPartner: bool(formData, "isPartner"),
      orderIndex: num(formData, "orderIndex") ?? 0,
    })
    .where(eq(universities.id, id));
  refresh();
}

export async function upsertDistrict(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const name = str(formData, "name");
  if (!name) throw new Error("Nama distrik wajib diisi");
  const description = str(formData, "description");
  // Satu form dipakai untuk create MAUPUN update (kirim nama yang sama =
  // update), jadi field descriptionEn di form ini selalu "explicit" - beda
  // dari tabel lain yang punya form create terpisah tanpa input *_en.
  const en = await withEnglish({ description: str(formData, "descriptionEn") }, { description });
  const [existing] = await db.select({ id: districts.id }).from(districts).where(eq(districts.name, name));
  const values = {
    nameZh: str(formData, "nameZh"),
    description,
    descriptionEn: en.description,
    orderIndex: num(formData, "orderIndex") ?? 0,
  };
  if (existing) await db.update(districts).set(values).where(eq(districts.id, existing.id));
  else await db.insert(districts).values({ name, ...values });
  refresh();
}

export async function deleteDistrict(formData: FormData) {
  await requireModuleAccess(CONTENT);
  await db.delete(districts).where(eq(districts.id, String(formData.get("id") ?? "")));
  refresh();
}

// ---------- merchandise ----------

export async function createMerchandise(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const name = str(formData, "name");
  if (!name) throw new Error("Nama item wajib diisi");
  const description = str(formData, "description");
  const en = await withEnglish({}, { name, description });
  await db.insert(merchandise).values({
    name,
    nameEn: en.name,
    description,
    descriptionEn: en.description,
    priceCny: num(formData, "priceCny"),
    imageUrl: str(formData, "imageUrl"),
    status: (str(formData, "status") ?? "unavailable") as "unavailable",
    contactNote: str(formData, "contactNote"),
    orderIndex: num(formData, "orderIndex") ?? 0,
  });
  refresh();
}

export async function deleteMerchandise(formData: FormData) {
  await requireModuleAccess(CONTENT);
  await db.delete(merchandise).where(eq(merchandise.id, String(formData.get("id") ?? "")));
  refresh();
}

export async function updateMerchandise(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const id = String(formData.get("id") ?? "");
  const name = str(formData, "name");
  if (!id || !name) throw new Error("Nama item wajib diisi");
  const description = str(formData, "description");
  const en = await withEnglish(
    { name: str(formData, "nameEn"), description: str(formData, "descriptionEn") },
    { name, description },
  );
  await db
    .update(merchandise)
    .set({
      name,
      nameEn: en.name,
      description,
      descriptionEn: en.description,
      priceCny: num(formData, "priceCny"),
      imageUrl: str(formData, "imageUrl"),
      status: (str(formData, "status") ?? "unavailable") as "unavailable",
      contactNote: str(formData, "contactNote"),
      orderIndex: num(formData, "orderIndex") ?? 0,
    })
    .where(eq(merchandise.id, id));
  refresh();
}

// ---------- sponsors ----------

export async function createSponsor(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const name = str(formData, "name");
  if (!name) throw new Error("Nama sponsor wajib diisi");
  const description = str(formData, "description");
  const en = await withEnglish({}, { description });
  await db.insert(sponsors).values({
    name,
    tier: (str(formData, "tier") ?? "partner") as "partner",
    logoUrl: str(formData, "logoUrl"),
    websiteUrl: str(formData, "websiteUrl"),
    description,
    descriptionEn: en.description,
    orderIndex: num(formData, "orderIndex") ?? 0,
  });
  refresh();
}

export async function deleteSponsor(formData: FormData) {
  await requireModuleAccess(CONTENT);
  await db.delete(sponsors).where(eq(sponsors.id, String(formData.get("id") ?? "")));
  refresh();
}

export async function updateSponsor(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const id = String(formData.get("id") ?? "");
  const name = str(formData, "name");
  if (!id || !name) throw new Error("Nama sponsor wajib diisi");
  const description = str(formData, "description");
  const en = await withEnglish({ description: str(formData, "descriptionEn") }, { description });
  await db
    .update(sponsors)
    .set({
      name,
      tier: (str(formData, "tier") ?? "partner") as "partner",
      logoUrl: str(formData, "logoUrl"),
      websiteUrl: str(formData, "websiteUrl"),
      description,
      descriptionEn: en.description,
      orderIndex: num(formData, "orderIndex") ?? 0,
    })
    .where(eq(sponsors.id, id));
  refresh();
}

// ---------- wilayah naungan ----------
// Barisnya sudah di-seed sesuai berkas GeoJSON; admin hanya memperbarui angka
// dan kontak, tidak menambah/menghapus kota.
export async function listCoverageCities() {
  await requireModuleAccess(CONTENT);
  return db.select().from(coverageCities).orderBy(asc(coverageCities.label));
}

export async function updateCoverageCity(formData: FormData) {
  await requireModuleAccess(CONTENT);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Kota tidak dikenal");
  await db
    .update(coverageCities)
    .set({
      memberCount: num(formData, "memberCount"),
      contactInfo: str(formData, "contactInfo"),
      note: str(formData, "note"),
      updatedAt: new Date(),
    })
    .where(eq(coverageCities.id, id));
  refresh();
}
