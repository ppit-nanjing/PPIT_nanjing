import type { Session } from "next-auth";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  borrowRequests,
  eventRegistrations,
  jobApplications,
  membershipApplications,
} from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { getEventAccess } from "@/lib/event-access";
import { type PrivateFileFolder, privateFileUrl } from "@/lib/private-files";

// Siapa boleh membaca berkas di store Blob private (lihat private-files.ts).
// Dua jalur, sama untuk semua folder:
//
//  1. PEMILIK. Upload route menaruh berkas pengguna yang login di
//     `<folder>/<userId>/...`, jadi segmen kedua key = id pemilik. Ini juga
//     yang membuat pratinjau berkas yang baru diunggah (belum tersimpan di
//     baris DB mana pun) tetap jalan. Untuk berkas lama hasil migrasi (key
//     tanpa segmen pemilik), pemilik dicari lewat baris DB yang menyimpannya.
//  2. PENGURUS yang memang memeriksa berkas itu di konsol, dengan gerbang yang
//     SAMA seperti halaman konsolnya (modul admin, atau kapabilitas acara).
//
// Mencari baris DB lewat URL: kolom teks dibandingkan persis, kolom jsonb
// dicari sebagai nilai string utuh ("<url>") lewat strpos - bukan LIKE, supaya
// `_` dan `%` di nama berkas tidak jadi wildcard.

type Scope = Session["user"]["adminScope"];

const MAX_MATCHING_ROWS = 20;

const jsonContains = (column: unknown, url: string) =>
  sql`strpos(${column}::text, ${`"${url}"`}) > 0`;

export async function canReadPrivateFile(
  session: Session,
  folder: PrivateFileFolder,
  pathname: string,
): Promise<boolean> {
  const userId = session.user.id;
  const scope: Scope = session.user.adminScope;
  const url = privateFileUrl(pathname);

  // Jalur 1a: key milik user ini.
  if (pathname.split("/")[1] === userId) return true;

  switch (folder) {
    case "resume": {
      if (hasModuleAccess(scope, "career")) return true;
      const rows = await db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(and(eq(jobApplications.resumeUrl, url), eq(jobApplications.userId, userId)))
        .limit(1);
      return rows.length > 0;
    }

    case "membership": {
      if (hasModuleAccess(scope, "membership")) return true;
      const rows = await db
        .select({ id: membershipApplications.id })
        .from(membershipApplications)
        .where(and(jsonContains(membershipApplications.responses, url), eq(membershipApplications.userId, userId)))
        .limit(1);
      return rows.length > 0;
    }

    case "borrow-doc": {
      // Peminjam pihak luar tidak punya akun, jadi berkasnya tak punya pemilik;
      // satu-satunya pembaca selain peminjam yang login adalah Logistik.
      if (hasModuleAccess(scope, "inventory")) return true;
      const rows = await db
        .select({ id: borrowRequests.id })
        .from(borrowRequests)
        .where(and(eq(borrowRequests.statementUrl, url), eq(borrowRequests.userId, userId)))
        .limit(1);
      return rows.length > 0;
    }

    case "payment-proof": {
      // Rekap keuangan lintas-acara digerbang modul "organization"
      // (listPendingPayments tanpa eventId).
      if (hasModuleAccess(scope, "organization")) return true;
      const rows = await db
        .select({ eventId: eventRegistrations.eventId, userId: eventRegistrations.userId })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.paymentProofUrl, url))
        .limit(MAX_MATCHING_ROWS);
      if (rows.some((r) => r.userId === userId)) return true;
      // Verifikasi bayar = kapabilitas keuangan acara pemilik pendaftaran.
      for (const eventId of new Set(rows.map((r) => r.eventId))) {
        if ((await getEventAccess(eventId)).can("event.manageFinance")) return true;
      }
      return false;
    }

    case "event-doc": {
      // Bukti mahasiswa (biodata) dan jawaban pertanyaan tipe `file` ada di
      // daftar pendaftar acara - dibaca siapa pun yang boleh melihat pendaftar.
      const rows = await db
        .select({ eventId: eventRegistrations.eventId, userId: eventRegistrations.userId })
        .from(eventRegistrations)
        .where(
          sql`${eventRegistrations.biodataJson} ->> 'studentProofUrl' = ${url} or ${jsonContains(eventRegistrations.answersJson, url)}`,
        )
        .limit(MAX_MATCHING_ROWS);
      if (rows.some((r) => r.userId === userId)) return true;
      for (const eventId of new Set(rows.map((r) => r.eventId))) {
        if ((await getEventAccess(eventId)).can("event.viewRegistrants")) return true;
      }
      return false;
    }
  }
}
