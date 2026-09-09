// Definisi kolom ekspor sensus, dipakai bersama oleh:
//  - /api/console/generate-report  (jenis "Ringkasan Sensus")
//  - /api/console/sensus/export    (tombol ekspor di /console/sensus & ranting)
// Ditaruh di satu tempat supaya urutan/label kolom tidak menyimpang antar rute.

import type { sensusProfiles } from "@/db/schema";
import type { ReportColumn } from "@/lib/report-export";
import { MEMBERSHIP_LABEL, membershipStatus } from "@/lib/membership-status";

type SensusRow = typeof sensusProfiles.$inferSelect;

// Urut persis form Sensus PPI Tiongkok pusat (Biodata → Data Mahasiswa →
// Kontak); field chapter Nanjing di belakang supaya kolom yang dibaca pusat
// tidak bergeser. Ini ekspor PENUH — memuat nomor paspor, hanya untuk pemegang
// modul "sensus".
export const SENSUS_EXPORT_COLUMNS_FULL: ReportColumn[] = [
  { header: "Nama Lengkap", key: "fullName" },
  { header: "Nomor Paspor", key: "passportNumber" },
  { header: "Jenis Kelamin", key: "gender" },
  { header: "Tanggal Maksimal Berlaku Paspor", key: "passportExpiry" },
  { header: "Asal Provinsi", key: "province" },
  { header: "Tanggal Lahir", key: "birthDate" },
  { header: "Asal Cabang", key: "branch" },
  { header: "Status Mahasiswa", key: "studentStatus" },
  { header: "Nama Universitas", key: "university" },
  { header: "Jenjang Pendidikan", key: "degreeLevel" },
  { header: "Jurusan", key: "major" },
  { header: "Sumber Pembiayaan", key: "fundingSource" },
  { header: "Tahun Masuk", key: "entryYear" },
  { header: "Perkiraan Tahun Kelulusan", key: "graduationYear" },
  { header: "WeChat ID", key: "wechatId" },
  { header: "Nomor Telepon Aktif", key: "phoneActive" },
  { header: "Nomor WhatsApp", key: "whatsappNumber" },
  { header: "Kartu Tanda Mahasiswa", key: "studentCardUrl" },
  { header: "Setuju S&K", key: "agreeTerms" },
  { header: "Newsletter", key: "subscribeNewsletter" },
  { header: "Nama Mandarin", key: "mandarinName" },
  { header: "Email Aktif", key: "activeEmail" },
  { header: "Bahasa Pengantar", key: "mediumOfInstruction" },
  { header: "Kemampuan Mandarin", key: "mandarinAbility" },
  { header: "Kontak Darurat", key: "emergencyContact" },
  { header: "Alamat di Tiongkok", key: "chinaAddress" },
  { header: "Status", key: "completionStatus" },
  { header: "Status Keanggotaan", key: "membershipStatus" },
];

export function sensusExportRowFull(r: SensusRow): Record<string, unknown> {
  return {
    fullName: r.fullName,
    passportNumber: r.passportNumber,
    gender: r.gender,
    passportExpiry: r.passportExpiry,
    province: r.province,
    birthDate: r.birthDate,
    branch: r.branch,
    studentStatus: r.studentStatus,
    university: r.university,
    degreeLevel: r.degreeLevel,
    major: r.major,
    fundingSource: r.fundingSource,
    entryYear: r.entryYear,
    graduationYear: r.graduationYear,
    wechatId: r.wechatId,
    phoneActive: r.phoneActive,
    whatsappNumber: r.whatsappNumber,
    studentCardUrl: r.studentCardUrl,
    agreeTerms: r.agreeTerms ? "Ya" : "Tidak",
    subscribeNewsletter: r.subscribeNewsletter ? "Ya" : "Tidak",
    mandarinName: r.mandarinName,
    activeEmail: r.activeEmail,
    mediumOfInstruction: r.mediumOfInstruction,
    mandarinAbility: r.mandarinAbility,
    emergencyContact: r.emergencyContact,
    chinaAddress: r.chinaAddress,
    completionStatus: r.completionStatus,
    membershipStatus: MEMBERSHIP_LABEL[membershipStatus(r)],
  };
}

// Ekspor RINGKAS — tanpa PII (paspor, tanggal lahir, kontak). Untuk pengurus
// ranting (modul "sensus-ranting"): sekadar "siapa yang sudah/belum isi".
export const SENSUS_EXPORT_COLUMNS_RANTING: ReportColumn[] = [
  { header: "Nama", key: "name" },
  { header: "Universitas", key: "university" },
  { header: "Jurusan", key: "major" },
  { header: "Jenjang", key: "degreeLevel" },
  { header: "Status Sensus", key: "completionStatus" },
  { header: "Ada Kartu / LOA", key: "hasCard" },
];

export function sensusExportRowRanting(
  r: SensusRow,
  fallbackName: string | null | undefined
): Record<string, unknown> {
  return {
    name: r.fullName || fallbackName || "",
    university: r.university,
    major: r.major,
    degreeLevel: r.degreeLevel,
    completionStatus: r.completionStatus === "complete" ? "Lengkap" : "Belum lengkap",
    hasCard: r.studentCardUrl ? "Ya" : "Tidak",
  };
}
