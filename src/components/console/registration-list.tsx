"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { checkInRegistration } from "@/app/actions/admin-events";

interface Registration {
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
}

interface QuestionRef {
  id: string;
  label: string;
}

const STATUS_LABEL: Record<Registration["status"], string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  attended: "Hadir",
  cancelled: "Dibatalkan",
};

export function RegistrationList({
  eventId,
  registrations,
  questions = [],
}: {
  eventId: string;
  registrations: Registration[];
  questions?: QuestionRef[];
}) {
  const [, startTransition] = useTransition();

  if (registrations.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Belum ada yang mendaftar.</p>;
  }

  // Jawaban dirakit sekali per baris; pertanyaan yang sudah dihapus dari acara
  // menyisakan kunci mati di answersJson - dilewati, bukan ditampilkan kosong.
  const answersOf = (r: Registration) =>
    questions
      .map((q) => ({ label: q.label, value: r.answers?.[q.id] ?? "" }))
      .filter((a) => a.value);

  const AnswerList = ({ r }: { r: Registration }) => {
    const answers = answersOf(r);
    if (answers.length === 0) return null;
    return (
      <ul className="mt-2 flex flex-col gap-0.5">
        {answers.map((a) => (
          <li key={a.label} className="text-label-caps text-on-surface-variant">
            {a.label}: <span className="text-on-background normal-case">{a.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-md min-w-[480px]">
          <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-5 py-3">Peserta</th>
              <th className="text-left px-5 py-3">Asal</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id} className="border-t border-outline-variant">
                <td className="px-5 py-3">
                  <p className="font-medium text-on-background">{r.userName ?? "(tanpa nama)"}</p>
                  <p className="text-label-caps text-on-surface-variant">{r.userEmail}</p>
                  <AnswerList r={r} />
                </td>
                <td className="px-5 py-3">
                  <p className="text-on-background">{r.branch ?? "—"}</p>
                  <p className="text-label-caps text-on-surface-variant">{r.membership}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded">
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {r.status !== "attended" && (
                    <button
                      onClick={() => startTransition(() => checkInRegistration(r.id, eventId))}
                      className="flex items-center gap-1 text-label-caps text-primary-container hover:text-primary"
                    >
                      <CheckCircle2 size={14} /> Check-in
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {registrations.map((r) => (
          <div key={r.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
            <div>
              <p className="font-medium text-on-background">{r.userName ?? "(tanpa nama)"}</p>
              <p className="text-label-caps text-on-surface-variant">{r.userEmail}</p>
              <p className="text-label-caps text-on-surface-variant">
                {r.branch ?? "—"} &middot; {r.membership}
              </p>
              <AnswerList r={r} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded">
                {STATUS_LABEL[r.status]}
              </span>
              {r.status !== "attended" && (
                <button
                  onClick={() => startTransition(() => checkInRegistration(r.id, eventId))}
                  className="flex items-center gap-1 text-label-caps text-primary-container hover:text-primary"
                >
                  <CheckCircle2 size={14} /> Check-in
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
