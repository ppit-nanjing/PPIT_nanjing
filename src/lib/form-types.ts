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
