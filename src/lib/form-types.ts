// Label & konstanta murni modul Formulir (Pemilu, Oprek BPH Acara, Oprek
// Kepanitiaan) — aman diimpor dari komponen klien maupun server, tanpa @/auth
// atau @/db. Dokumentasi: docs/Formulir & Oprek.md.

import { BPH_PANITIA_ROLES, type EventCommitteeRole } from "@/lib/event-capabilities";

export type FormKind = "pemilu" | "oprek_bph_acara" | "oprek_kepanitiaan" | "oprek_kadiv";

/**
 * Form yang pelamarnya memilih divisi acara (pilihan 1/2) dan penempatannya
 * menulis divisi: Oprek Kadiv dan Oprek Kepanitiaan (anggota).
 */
export function isDivisionOprekKind(kind: FormKind): boolean {
  return kind === "oprek_kepanitiaan" || kind === "oprek_kadiv";
}

/**
 * Baris form_fields khusus (type "section") yang menandai POSISI pilihan
 * Divisi 1 & 2 di form Oprek berdivisi. Tampil di Daftar Pertanyaan seperti
 * pertanyaan lain dan bisa dipindah urutannya, tapi tidak bisa dihapus/disalin;
 * pilihannya selalu = divisi di Struktur Kepanitiaan acara (event_divisions),
 * dan divisi baru yang ditambah dari sini ikut masuk ke acara. Karena jenisnya
 * "section", submit/analitik/ekspor otomatis melewatinya — jawaban divisi tetap
 * di kolom sistem choice1/choice2.
 */
export const DIVISION_FIELD_KEY = "sys_division_choice";

/** Status lamaran yang dihitung "diterima" (penempatan sudah diputuskan). */
export const FORM_ACCEPTED_STATUSES = ["accepted", "accepted_choice1", "accepted_choice2", "reassigned"] as const;

export function isAcceptedFormStatus(status: string): boolean {
  return (FORM_ACCEPTED_STATUSES as readonly string[]).includes(status);
}

/** Siapa yang melihat QR grup di halaman setelah mengirim (forms.group_qr_audience). */
export const FORM_GROUP_QR_AUDIENCES = ["submitted", "accepted"] as const;
export type FormGroupQrAudience = (typeof FORM_GROUP_QR_AUDIENCES)[number];

/**
 * QR grup hanya boleh gambar yang diunggah lewat /api/upload ke folder
 * "form-qr" (blob publik) — bukan URL bebas: halaman publik merender <img>-nya.
 */
export function isFormGroupQrUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith("/form-qr/")
    );
  } catch {
    return false;
  }
}
export const DIVISION_FIELD_LABEL = "Divisi Pilihan";

export type FormApplicationStatus =
  | "pending"
  | "accepted"
  | "accepted_choice1"
  | "accepted_choice2"
  | "reassigned"
  | "rejected";

export const FORM_KIND_LABEL: Record<FormKind, string> = {
  pemilu: "Pemilu",
  oprek_bph_acara: "Oprek BPH Acara",
  oprek_kepanitiaan: "Oprek Kepanitiaan",
  oprek_kadiv: "Oprek Kadiv",
};

// Rute tab per jenis form (dipakai navigasi console & revalidate).
export const FORM_TAB_PATH: Record<FormKind, string> = {
  pemilu: "/console/forms/pemilu",
  oprek_bph_acara: "/console/forms/oprek-bph",
  oprek_kepanitiaan: "/console/forms/oprek-kepanitiaan",
  // Oprek Kadiv tinggal di tab yang sama dengan Oprek anggota.
  oprek_kadiv: "/console/forms/oprek-kepanitiaan",
};

// Posisi BPH Acara yang boleh dibuka di Oprek BPH — SATU sumber dengan
// BPH_PANITIA_ROLES (event-capabilities) supaya tidak drift.
export const BPH_FORM_ROLES: EventCommitteeRole[] = BPH_PANITIA_ROLES;

export const BPH_FORM_ROLE_LABEL: Record<string, string> = {
  ketua: "Ketua Pelaksana",
  wakil: "Wakil Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  supervisor: "Supervisor",
};

export const FORM_STATUS_LABEL: Record<FormApplicationStatus, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  accepted_choice1: "Diterima — Pilihan 1",
  accepted_choice2: "Diterima — Pilihan 2",
  reassigned: "Dipindah divisi",
  rejected: "Ditolak",
};

export const FORM_STATUS_TONE: Record<FormApplicationStatus, string> = {
  pending: "bg-surface-container-low text-on-surface-variant",
  accepted: "bg-primary-container/15 text-primary-container",
  accepted_choice1: "bg-primary-container/15 text-primary-container",
  accepted_choice2: "bg-primary-container/15 text-primary-container",
  reassigned: "bg-gold-ink/15 text-gold-ink",
  rejected: "bg-error-container/30 text-error",
};

// Role yang boleh dipilih KADIV saat menempatkan pelamar Oprek anggota: hanya
// peran anggota divisi — Kadiv tidak boleh mengangkat orang jadi BPH/Kadiv.
export const KADIV_PLACEMENT_ROLES: EventCommitteeRole[] = ["anggota", "humas", "acara", "logistik", "dokumentasi"];

// Role yang boleh dipilih reviewer saat menempatkan pelamar kepanitiaan
// (semua label event_committee_role; default anggota).
export const PLACEMENT_ROLE_OPTIONS: EventCommitteeRole[] = [
  "anggota",
  "humas",
  "acara",
  "logistik",
  "dokumentasi",
  "bendahara",
  "sekretaris",
  "wakil",
  "ketua",
  "supervisor",
];
