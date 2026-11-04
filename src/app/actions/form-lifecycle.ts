"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { auditLogs, forms, type FormRow } from "@/db/schema";
import { requireFormManage, requireTrashedFormManage } from "@/lib/form-access";

// Arsip dan Sampah untuk Formulir Kustom (jenis "survei" di tabel forms, migrasi 0058). Pemilu dan Oprek
// tidak memakainya: semua aksi di sini 404 untuk jenis lain.
// - Arsip: formulir selesai. Ia ditutup dan hilang dari daftar aktif, hasilnya tetap bisa dibuka.
//   Keluarkan dari Arsip TIDAK membukanya kembali (buka lagi dari Pengaturan).
// - Sampah (soft delete): hilang dari semua halaman, tautan publiknya 404, dan tidak bisa dikelola siapa
//   pun sampai dipulihkan; pertanyaan dan jawaban utuh. Dipulihkan dalam keadaan Tutup.
// Hapus permanen ada di survey.ts (deleteSurveyPermanently) karena ikut menghapus Google Sheet langsung.
// Setiap aksi memeriksa haknya sendiri lewat gerbang di form-access.ts.

async function manageSurvey(formData: FormData) {
  const gate = await requireFormManage(String(formData.get("id") ?? ""));
  if (gate.form.kind !== "survei") notFound();
  return gate;
}

async function manageTrashedSurvey(formData: FormData) {
  const gate = await requireTrashedFormManage(String(formData.get("id") ?? ""));
  if (gate.form.kind !== "survei") notFound();
  return gate;
}

function revalidateSurveySurfaces(formId: string) {
  revalidatePath("/formulir");
  revalidatePath(`/formulir/${formId}`);
  revalidatePath(`/f/${formId}`);
}

async function audit(actorUserId: string, form: Pick<FormRow, "id" | "kind" | "title">, action: string) {
  await db.insert(auditLogs).values({
    actorUserId,
    entityType: "form",
    entityId: form.id,
    action,
    afterJson: { title: form.title, kind: form.kind },
  });
}

export async function archiveForm(formData: FormData) {
  const { form, access } = await manageSurvey(formData);
  if (!form.archivedAt) {
    await db
      .update(forms)
      .set({ archivedAt: new Date(), archivedBy: access.userId, isOpen: false, updatedAt: new Date() })
      .where(eq(forms.id, form.id));
    await audit(access.userId, form, "form.archived");
  }
  revalidateSurveySurfaces(form.id);
  redirect("/formulir");
}

export async function unarchiveForm(formData: FormData) {
  const { form, access } = await manageSurvey(formData);
  if (form.archivedAt) {
    await db.update(forms).set({ archivedAt: null, archivedBy: null, updatedAt: new Date() }).where(eq(forms.id, form.id));
    await audit(access.userId, form, "form.unarchived");
  }
  revalidateSurveySurfaces(form.id);
}

export async function trashForm(formData: FormData) {
  const { form, access } = await manageSurvey(formData);
  const moved = await db
    .update(forms)
    // Ditutup juga: lapis kedua kalau ada jalur isi yang lupa menyaring deletedAt.
    .set({ deletedAt: new Date(), deletedBy: access.userId, isOpen: false, updatedAt: new Date() })
    .where(and(eq(forms.id, form.id), isNull(forms.deletedAt)))
    .returning({ id: forms.id });
  if (moved.length > 0) await audit(access.userId, form, "form.trashed");
  revalidateSurveySurfaces(form.id);
  redirect("/formulir");
}

export async function restoreForm(formData: FormData) {
  const { form, access } = await manageTrashedSurvey(formData);
  await db.update(forms).set({ deletedAt: null, deletedBy: null, updatedAt: new Date() }).where(eq(forms.id, form.id));
  await audit(access.userId, form, "form.restored");
  revalidateSurveySurfaces(form.id);
}
