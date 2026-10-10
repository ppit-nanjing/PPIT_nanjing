"use server";

import { and, eq, sql, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  eventCommittee,
  eventEvaluationAnswers,
  eventEvaluationQuestions,
  eventEvaluations,
  events,
} from "@/db/schema";
import { canEditCommitteeEvaluation, requireEventConsoleAccess } from "@/lib/event-access";
import { parseChinaLocalInput } from "@/lib/datetime";
import { isUniqueViolation } from "@/lib/db-errors";
import { UUID_RE } from "@/lib/uuid";
import { type EvalFormState, validateEvalAnswer, type EvalQuestionRow } from "@/lib/event-evaluation-questions";
import { loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import {
  committeeEvalTemplateQuestions,
  committeeEvalWindowState,
} from "@/lib/committee-evaluation";

// Evaluasi panitia per-acara (kolektif), dibangun di atas builder pertanyaan
// evaluasi (PR #74) lewat kolom audience = "panitia" di event_evaluation_questions
// dan event_evaluations. Semua aksi di sini adalah batas permintaan publik:
// gerbang login + roster + jendela waktu dicek DI SINI, bukan cuma di halaman
// yang memanggilnya.

export type CommitteeEvaluationFormState = EvalFormState;

// Kirim evaluasi panitia: HARUS login, HARUS tercatat di event_committee acara
// ini, dan jendela (events.committee_eval_opens_at/closes_at) harus sedang
// terbuka saat aksi dieksekusi. Identitas pengisi = akunnya (bukan isian bebas)
// — dedup-nya unique index (event_id, user_id) untuk audience 'panitia' plus
// token `panitia:<userId>` yang menabrak unique (event_id, responder_token).
export async function submitCommitteeEvaluation(
  _prev: CommitteeEvaluationFormState,
  formData: FormData,
): Promise<CommitteeEvaluationFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "login" };
  const userId = session.user.id;

  const slug = typeof formData.get("slug") === "string" ? String(formData.get("slug")).trim() : "";
  if (!slug) return { error: "invalid" };

  const [event] = await db
    .select({
      id: events.id,
      status: events.status,
      opensAt: events.committeeEvalOpensAt,
      closesAt: events.committeeEvalClosesAt,
    })
    .from(events)
    .where(and(eq(events.slug, slug), isNull(events.deletedAt)));
  // Gerbang sama dengan halaman publiknya: draft/terjadwal tidak bisa dievaluasi,
  // dan acara yang dibatalkan tidak layak dievaluasi (K4).
  if (!event || event.status === "draft" || event.status === "scheduled" || event.status === "cancelled") {
    return { error: "invalid" };
  }

  if (committeeEvalWindowState(event.opensAt, event.closesAt) !== "open") return { error: "window" };

  // Keanggotaan panitia + snapshot divisi sekaligus (satu baris event_committee).
  const [member] = await db
    .select({ divisionId: eventCommittee.divisionId })
    .from(eventCommittee)
    .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, userId)));
  // Pesan "login" untuk orang yang sudah login tapi bukan panitia menyesatkan
  // (K4) — bedakan jadi "not_committee".
  if (!member) return { error: "not_committee" };

  // Pertanyaan audiens panitia selalu baris DB: saveCommitteeEvaluationWindow
  // menyalin template kolektif begitu jendela dipasang, dan jendela wajib ada
  // sebelum siapa pun bisa mengisi. Tanpa baris = BPH menghapus semuanya; jangan
  // jatuh ke template statis, karena jawabannya tidak akan cocok dengan kolom
  // rekap/ekspor (questionId NULL dikunci per label, bukan per pertanyaan).
  const questions: EvalQuestionRow[] = await loadEvaluationQuestions(event.id, "panitia");
  if (questions.length === 0) return { error: "not_ready" };

  const answers: { questionId: string; label: string; type: string; text: string | null; number: number | null }[] = [];
  for (const q of questions) {
    const result = validateEvalAnswer(q, formData.getAll(`q_${q.id}`));
    if (!result.ok) return { error: result.reason === "required" ? "required" : "invalid" };
    if (result.answer) {
      answers.push({
        questionId: q.id,
        label: q.label,
        type: q.type,
        text: result.answer.text,
        number: result.answer.number,
      });
    }
  }

  const evaluationId = crypto.randomUUID();
  const insertEvaluation = db.insert(eventEvaluations).values({
    id: evaluationId,
    eventId: event.id,
    audience: "panitia",
    userId,
    divisionId: member.divisionId,
    responderToken: `panitia:${userId}`,
  });

  try {
    if (answers.length > 0) {
      await db.batch([
        insertEvaluation,
        db.insert(eventEvaluationAnswers).values(
          answers.map((a) => ({
            evaluationId,
            questionId: a.questionId,
            questionLabel: a.label,
            questionType: a.type,
            valueText: a.text,
            valueNumber: a.number,
          })),
        ),
      ]);
    } else {
      await insertEvaluation;
    }
  } catch (error) {
    if (isUniqueViolation(error)) return { already: true };
    console.error("[committee-evaluation] insert failed:", error);
    return { error: "generic" };
  }

  revalidatePath(`/events/${slug}/evaluasi-panitia`);
  revalidatePath(`/console/events/${event.id}`);
  return { ok: true };
}

// Gerbang MENGUBAH evaluasi panitia (B2 + kunci kepanitiaan): BPH Kabinet/
// Teknologi, atau BPH Panitia acara ini selama acara belum terkunci (14 hari
// setelah selesai). Aturannya di canEditCommitteeEvaluation (event-access.ts),
// dipakai juga halaman konsol untuk menyembunyikan editornya.
async function requireCommitteeEvalEditor(eventId: string) {
  const access = await requireEventConsoleAccess(eventId);
  if (!canEditCommitteeEvaluation(access)) redirect(`/console/events/${eventId}`);
  return access;
}

// Pasang/hapus jendela waktu. Ditujukan untuk tab "Panitia" di section
// "Evaluasi Acara" konsol kegiatan: opensAt/closesAt datang sebagai nilai
// datetime-local (boleh kosong). Kosong dua-duanya = jadwal dilepas (kembali
// "belum dijadwalkan"). Salah isi DIBALAS sebagai error form state, bukan
// diam-diam diabaikan — kalau tidak, tombol simpan tetap tampak berhasil (M4).
export async function saveCommitteeEvaluationWindow(
  _prev: CommitteeEvalWindowFormState,
  formData: FormData,
): Promise<CommitteeEvalWindowFormState> {
  const eventId = typeof formData.get("eventId") === "string" ? String(formData.get("eventId")).trim() : "";
  if (!UUID_RE.test(eventId)) return { error: "Acara tidak valid." };
  await requireCommitteeEvalEditor(eventId);

  // Nilai datetime-local dibaca sebagai jam Tiongkok, bukan jam server: fungsi
  // Vercel berjalan di UTC, jadi `new Date(value)` membuat jendela buka/tutup
  // 8 jam lebih lambat dari yang diketik BPH. Isian tak valid ditolak, bukan
  // diam-diam dianggap kosong (kosong = melepas jadwal).
  const rawOpens = String(formData.get("opensAt") ?? "").trim();
  const rawCloses = String(formData.get("closesAt") ?? "").trim();
  const opensAt = rawOpens ? parseChinaLocalInput(rawOpens) : null;
  const closesAt = rawCloses ? parseChinaLocalInput(rawCloses) : null;
  if ((rawOpens && !opensAt) || (rawCloses && !closesAt)) {
    return { error: "Format tanggal/jam tidak valid." };
  }
  if (opensAt && closesAt && closesAt <= opensAt) {
    return { error: "Waktu tutup harus setelah waktu buka." };
  }
  if (closesAt && !opensAt && closesAt.getTime() <= Date.now()) {
    return { error: "Waktu tutup sudah lewat — isi ulang atau kosongkan." };
  }

  const [event] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) return { error: "Acara tidak ditemukan." };

  await db
    .update(events)
    .set({ committeeEvalOpensAt: opensAt, committeeEvalClosesAt: closesAt })
    .where(eq(events.id, eventId));

  // Begitu jendela dipasang, pastikan acara punya pertanyaan panitia sebagai
  // baris DB (salinan template kolektif bila BPH belum menyusun sendiri). Jendela
  // wajib ada sebelum siapa pun bisa mengisi, jadi setiap jawaban panitia selalu
  // menunjuk questionId uuid yang asli dan rekap/ekspor membaca kolom yang benar.
  //
  // Satu transaksi (db.batch): advisory lock per acara dulu, baru INSERT ...
  // WHERE NOT EXISTS. Tanpa lock, dua BPH yang menyimpan bersamaan sama-sama
  // melihat 0 pertanyaan dan template tersalin dua kali. Dengan lock, transaksi
  // kedua menunggu yang pertama selesai, lalu NOT EXISTS-nya melihat baris itu.
  if (opensAt || closesAt) {
    const rows = sql.join(
      committeeEvalTemplateQuestions().map(
        (q, i) => sql`(${q.label}::text, ${q.type}::text, ${q.required}::boolean, ${i + 1}::int)`,
      ),
      sql`, `,
    );
    await db.batch([
      db.execute(sql`select pg_advisory_xact_lock(hashtext(${`ceval-template:${eventId}`}))`),
      db.execute(sql`
        insert into ${eventEvaluationQuestions} (event_id, audience, label, type, options, required, order_index)
        select ${eventId}::uuid, 'panitia', t.label, t.type, null, t.required, t.order_index
        from (values ${rows}) as t(label, type, required, order_index)
        where not exists (
          select 1 from ${eventEvaluationQuestions}
          where ${eventEvaluationQuestions.eventId} = ${eventId}::uuid and ${eventEvaluationQuestions.audience} = 'panitia'
        )
      `),
    ]);
  }

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath(`/events/${event.slug}/evaluasi-panitia`);
  return { ok: true };
}

export type CommitteeEvalWindowFormState = {
  ok?: boolean;
  error?: string;
};
