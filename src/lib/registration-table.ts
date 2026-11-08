// Bentuk data pendaftar acara untuk konsol: dipakai daftar kartu
// (registration-list.tsx) dan tampilan tabel (data-table.tsx). Murni dan aman
// di sisi klien.
//
// Yang boleh dilihat ditentukan SERVER saat menyusun `Registration`: pembaca
// versi ringkas menerima email, biodata, dan jawaban sebagai null/kosong. Fungsi
// di sini hanya merakit apa yang sudah ada, jadi `detail` cukup memilih kolom.
import { formatChinaDateTimeIso, timeHeader } from "@/lib/datetime";
import type { CheckInBlock } from "@/lib/event-checkin";
import { markLongColumns, type TableCell, type TableColumn, type TableData, type TableRow } from "@/lib/table-view";

export interface Registration {
  id: string;
  userName: string | null;
  userEmail: string | null;
  status: "pending" | "confirmed" | "attended" | "cancelled";
  registeredAt: string;
  // Turunan dari sensus (lihat src/lib/membership-status.ts), bukan kolom di
  // database. `branch` diisi dari sensus kalau lengkap, kalau tidak dari jawaban
  // peserta saat mendaftar; null untuk pendaftaran lama sebelum ditanyakan.
  membership: string;
  branch: string | null;
  // Jawaban pertanyaan kustom acara, { [questionId]: string }.
  answers?: Record<string, string> | null;
  // Kategori tarif yang dipilih peserta, mis. "Freshmen (¥15)". null = acara
  // gratis / tarif tunggal / pendaftaran lama.
  feeLabel?: string | null;
  // Nama kategori tarif MENTAH (mis. "Freshmen"), tanpa nominal/tahap harga -
  // dipakai untuk filter, supaya "Freshmen" tetap satu grup walau nominalnya
  // berubah antar waktu (early bird / normal / digratiskan sponsor). feeLabel
  // di atas tidak stabil untuk ini karena beda nominal = beda string.
  feeCategory?: string | null;
  // WeChat ID — bagian dari versi RINGKAS (Humas menghubungi peserta). Diambil
  // dari snapshot biodata atau fallback sensus di server; null kalau dua-duanya
  // kosong.
  wechatId?: string | null;
  // Asal kampus — snapshot biodata atau fallback sensus (acara requiresSensus
  // seperti Fun Hike). Selalu tampil di baris ringkas.
  university?: string | null;
  // Biodata lengkap yang di-snapshot saat mendaftar (acara requiresBiodata).
  // Hanya dikirim ke versi LENGKAP (BPH Kabinet + Divisi Teknologi + BPH
  // Panitia acara ini).
  biodata?: Record<string, string> | null;
  // Alasan peserta ini belum boleh di-check-in (dihitung di server dari status
  // pendaftaran + status bayar). null = boleh.
  checkInBlocked?: CheckInBlock | null;
  // Kapan & oleh siapa peserta ini di-check-in (event_registrations.checked_in_by).
  // null kalau belum hadir atau data lama sebelum kolomnya ada.
  checkedInAt?: string | null;
  checkedInByName?: string | null;
}

export interface QuestionRef {
  id: string;
  label: string;
}

export const BIODATA_LABEL: Record<string, string> = {
  fullName: "Nama Lengkap",
  passportNumber: "Nomor Paspor",
  wechatId: "WeChat ID",
  chinaPhone: "No. Telpon China",
  branch: "Kota / Ranting",
  university: "Universitas",
  major: "Jurusan",
  entryYear: "Tahun Angkatan",
  studentProofUrl: "Bukti Mahasiswa Aktif",
};

export const STATUS_LABEL: Record<Registration["status"], string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  attended: "Hadir",
  cancelled: "Dibatalkan",
};

// Kolom biodata yang tersembunyi sampai pembaca menyalakannya.
const SENSITIVE_BIODATA = new Set(["passportNumber", "chinaPhone", "studentProofUrl"]);
// WeChat dan kampus sudah punya kolom sendiri (snapshot biodata atau sensus),
// jadi tidak diulang dari blok biodata.
const COVERED_BY_OWN_COLUMN = new Set(["wechatId", "university"]);

// Jawaban pilihan ganda tersimpan sebagai larik di database walau tipenya string.
function answerText(v: unknown): string {
  return Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";
}

/**
 * Pendaftar -> tabel. Versi ringkas (`detail` false) hanya memuat nama, status,
 * keanggotaan, kota, kampus, WeChat, tarif, dan check-in. Versi lengkap menambah
 * email, waktu daftar, biodata, dan jawaban pertanyaan acara.
 */
export function buildRegistrationTable(
  registrations: Registration[],
  questions: QuestionRef[],
  detail: boolean,
): TableData {
  const anyFee = registrations.some((r) => r.feeLabel);
  const biodataKeys = detail
    ? Object.keys(BIODATA_LABEL).filter(
        (k) => !COVERED_BY_OWN_COLUMN.has(k) && registrations.some((r) => r.biodata?.[k]),
      )
    : [];

  const columns: TableColumn[] = [
    { key: "name", header: "Nama", kind: "text" },
    ...(detail ? [{ key: "email", header: "Email", kind: "text" } as TableColumn] : []),
    { key: "status", header: "Status", kind: "text" },
    ...(detail ? [{ key: "registeredAt", header: timeHeader("Waktu Daftar"), kind: "date" } as TableColumn] : []),
    { key: "membership", header: "Keanggotaan", kind: "text" },
    { key: "branch", header: "Cabang", kind: "text" },
    { key: "university", header: "Kampus", kind: "text" },
    { key: "wechatId", header: "WeChat ID", kind: "text" },
    ...(anyFee ? [{ key: "fee", header: "Kategori Tarif", kind: "text" } as TableColumn] : []),
    { key: "checkedInAt", header: timeHeader("Waktu Check-in"), kind: "date" },
    { key: "checkedInBy", header: "Di-check-in oleh", kind: "text" },
    ...biodataKeys.map(
      (k): TableColumn => ({
        key: `bio:${k}`,
        header: BIODATA_LABEL[k],
        kind: "text",
        ...(SENSITIVE_BIODATA.has(k) ? { sensitive: true } : {}),
      }),
    ),
    ...(detail ? questions.map((q): TableColumn => ({ key: `q:${q.id}`, header: q.label, kind: "text" })) : []),
  ];

  const rows: TableRow[] = registrations.map((r) => {
    const cells: Record<string, TableCell> = {
      name: r.userName ?? "",
      status: STATUS_LABEL[r.status],
      membership: r.membership,
      branch: r.branch ?? "",
      university: r.university ?? "",
      wechatId: r.wechatId ?? "",
      fee: r.feeLabel ?? "",
      checkedInAt: r.checkedInAt ? formatChinaDateTimeIso(new Date(r.checkedInAt)) : "",
      checkedInBy: r.checkedInByName ?? "",
    };
    if (detail) {
      cells.email = r.userEmail ?? "";
      cells.registeredAt = formatChinaDateTimeIso(new Date(r.registeredAt));
      for (const k of biodataKeys) cells[`bio:${k}`] = r.biodata?.[k] ?? "";
      for (const q of questions) cells[`q:${q.id}`] = answerText(r.answers?.[q.id]);
    }
    return { id: r.id, cells };
  });

  return { columns: markLongColumns(columns, rows), rows };
}
