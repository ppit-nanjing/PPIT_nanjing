"use server";

import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { donations, donationChannels } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";

// The app never touches money. Alipay/WeChat Pay cannot be integrated without a
// PRC-registered merchant account, and personal receive-QR codes expose no
// webhook - so a donor pays outside the app and *reports* it here, and an admin
// verifies it by hand before it appears publicly.
export async function getDonationChannels() {
  return db
    .select()
    .from(donationChannels)
    .where(eq(donationChannels.published, true))
    .orderBy(asc(donationChannels.orderIndex), asc(donationChannels.label));
}

/** Only verified donations are ever shown publicly. */
export async function getVerifiedDonations(limit = 60) {
  return db
    .select({
      id: donations.id,
      donorName: donations.donorName,
      amountCny: donations.amountCny,
      message: donations.message,
      anonymous: donations.anonymous,
      verifiedAt: donations.verifiedAt,
    })
    .from(donations)
    .where(eq(donations.status, "verified"))
    .orderBy(desc(donations.verifiedAt))
    .limit(limit);
}

export async function submitDonation(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Silakan masuk terlebih dahulu untuk melaporkan donasi");

  const donorName = String(formData.get("donorName") ?? "").trim() || session.user.name || "Anonim";
  const rawAmount = String(formData.get("amountCny") ?? "").trim();
  const amountCny = rawAmount ? Number(rawAmount) : null;
  if (amountCny != null && (!Number.isFinite(amountCny) || amountCny <= 0)) {
    throw new Error("Jumlah donasi tidak valid");
  }

  // Bukti dirender sebagai link "Lihat bukti" di console, jadi hanya http(s)
  // yang diterima - skema lain (javascript:, data:) ditolak di sini.
  const proofUrl = String(formData.get("proofUrl") ?? "").trim() || null;
  if (proofUrl && !isHttpUrl(proofUrl)) {
    throw new Error("Tautan bukti donasi harus berupa alamat http(s) yang valid");
  }

  await db.insert(donations).values({
    userId: session.user.id,
    donorName,
    amountCny,
    method: String(formData.get("method") ?? "").trim() || null,
    message: String(formData.get("message") ?? "").trim() || null,
    proofUrl,
    anonymous: formData.get("anonymous") === "on",
    // Never trust the reporter: it stays pending until a human checks it.
    status: "pending",
  });

  revalidatePath("/catalogue/donasi");
}

// Verifying a donation is a financial record, not editorial content, so it is
// gated on "organization" - which ASSIGNABLE_SCOPE_KEYS marks sensitive/BPH-only
// - rather than the "content" scope the rest of the catalogue uses.
export async function updateDonationStatus(formData: FormData) {
  await requireModuleAccess("organization");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["pending", "verified", "rejected"].includes(status)) throw new Error("Status tidak valid");

  await db
    .update(donations)
    .set({
      status: status as "verified",
      verifiedAt: status === "verified" ? new Date() : null,
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .where(eq(donations.id, id));

  // Path console-nya /console/katalog (dulu salah tulis /console/catalogue,
  // jadi daftar & angka "menunggu verifikasi" bisa stale setelah Simpan).
  revalidatePath("/console/katalog");
  revalidatePath("/catalogue/donasi");
}

// ---------- kanal donasi (admin) ----------

export async function listDonationsForAdmin() {
  await requireModuleAccess("organization");
  return db.select().from(donations).orderBy(desc(donations.createdAt));
}

export async function listChannelsForAdmin() {
  await requireModuleAccess("organization");
  return db.select().from(donationChannels).orderBy(asc(donationChannels.orderIndex), asc(donationChannels.label));
}

export async function createDonationChannel(formData: FormData) {
  await requireModuleAccess("organization");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Nama kanal wajib diisi");
  const opt = (k: string) => String(formData.get(k) ?? "").trim() || null;
  await db.insert(donationChannels).values({
    label,
    accountName: opt("accountName"),
    accountDetail: opt("accountDetail"),
    qrImageUrl: opt("qrImageUrl"),
    instructions: opt("instructions"),
    orderIndex: Number(String(formData.get("orderIndex") ?? "0")) || 0,
  });
  revalidatePath("/console/katalog");
  revalidatePath("/catalogue/donasi");
}

export async function deleteDonationChannel(formData: FormData) {
  await requireModuleAccess("organization");
  await db.delete(donationChannels).where(eq(donationChannels.id, String(formData.get("id") ?? "")));
  revalidatePath("/console/katalog");
  revalidatePath("/catalogue/donasi");
}

// Edit kanal yang sudah ada (dulu hanya bisa tambah/hapus - ganti QR berarti
// hapus lalu buat ulang, nomor kanal ikut berubah).
export async function updateDonationChannel(formData: FormData) {
  await requireModuleAccess("organization");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Kanal tidak ditemukan");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Nama kanal wajib diisi");
  const opt = (k: string) => String(formData.get(k) ?? "").trim() || null;

  await db
    .update(donationChannels)
    .set({
      label,
      accountName: opt("accountName"),
      accountDetail: opt("accountDetail"),
      qrImageUrl: opt("qrImageUrl"),
      instructions: opt("instructions"),
      orderIndex: Number(String(formData.get("orderIndex") ?? "0")) || 0,
    })
    .where(eq(donationChannels.id, id));

  revalidatePath("/console/katalog");
  revalidatePath("/catalogue/donasi");
}

// Sembunyikan/tampilkan kanal tanpa menghapusnya (donation_channels.published).
export async function toggleDonationChannelPublished(formData: FormData) {
  await requireModuleAccess("organization");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Kanal tidak ditemukan");

  await db
    .update(donationChannels)
    .set({ published: formData.get("next") === "true" })
    .where(eq(donationChannels.id, id));

  revalidatePath("/console/katalog");
  revalidatePath("/catalogue/donasi");
}

/** Validasi ringan untuk input pelapor: hanya skema http(s) yang diterima. */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
