"use client";

import { useActionState, useState } from "react";
import { CalendarClock, Eraser } from "lucide-react";
import { saveCommitteeEvaluationWindow } from "@/app/actions/committee-evaluation";
import { SubmitButton, useActionToast } from "@/components/console/submit-button";

// nilai datetime-local pakai jam dinding browser, BUKAN UTC — isinya tidak
// membawa zona, jadi toISOString() (UTC) membuat pintasan meleset sebesar
// offset zona (8 jam di Tiongkok). Lihat src/lib/datetime.ts.
function toLocalInput(ms: number): string {
  const off = new Date(ms).getTimezoneOffset() * 60000;
  return new Date(ms - off).toISOString().slice(0, 16);
}

// Editor jendela waktu evaluasi panitia, ditampilkan di konsol kegiatan. Dua
// input datetime-local (boleh dikosongkan) + tombol pintasan "1 minggu setelah
// acara" yang mengisi keduanya dari akhir acara. Menyimpan lewat server action
// saveCommitteeEvaluationWindow — validasi ulang tetap di server. Aksinya
// membalas form state: error tampil inline + toast error, dan toast sukses
// hanya saat benar-benar tersimpan (SubmitButton saja tidak bisa membedakan).
export function CommitteeEvalWindowEditor({
  eventId,
  opensAt,
  closesAt,
  presetOpens,
  windowLabel,
  windowNote,
  scheduleLabel,
  opensLabel,
  closesLabel,
  presetLabel,
  clearLabel,
  saveLabel,
  clearConfirmNote,
}: {
  eventId: string;
  opensAt: string;
  closesAt: string;
  presetOpens: string;
  windowLabel: string;
  windowNote: string;
  scheduleLabel: string;
  opensLabel: string;
  closesLabel: string;
  presetLabel: string;
  clearLabel: string;
  saveLabel: string;
  clearConfirmNote: string;
}) {
  const [opens, setOpens] = useState(opensAt);
  const [closes, setCloses] = useState(closesAt);
  const [presetDays, setPresetDays] = useState("7");
  const [state, formAction, isPending] = useActionState(saveCommitteeEvaluationWindow, {});
  useActionToast(isPending, state.error, saveLabel);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-3">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant flex items-center gap-2">
          <CalendarClock size={16} aria-hidden="true" /> {windowLabel}
        </p>
        <p className="text-body-sm text-on-surface-variant">{windowNote}</p>
        {state.error && (
          <p role="alert" className="rounded-md bg-error-container/40 px-3 py-2 text-body-sm text-on-error-container">
            {state.error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{opensLabel}</span>
            <input
              type="datetime-local"
              name="opensAt"
              value={opens}
              onChange={(e) => setOpens(e.target.value)}
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{closesLabel}</span>
            <input
              type="datetime-local"
              name="closesAt"
              value={closes}
              onChange={(e) => setCloses(e.target.value)}
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{scheduleLabel}</span>
            <select
              name="presetDays"
              value={presetDays}
              onChange={(e) => setPresetDays(e.target.value)}
              className="bg-soft-gray rounded-md p-3 text-body-md"
            >
              <option value="3">3 hari</option>
              <option value="7">7 hari</option>
              <option value="14">14 hari</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              const base = new Date(presetOpens).getTime();
              if (Number.isNaN(base)) return;
              const days = Number.parseInt(presetDays, 10) || 7;
              setOpens(presetOpens);
              setCloses(toLocalInput(base + days * 24 * 60 * 60 * 1000));
            }}
            className="inline-flex items-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-3 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <CalendarClock size={16} aria-hidden="true" /> {presetLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpens("");
              setCloses("");
            }}
            className="inline-flex items-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-3 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Eraser size={16} aria-hidden="true" /> {clearLabel}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* successMessage "" = matikan toast bawaan SubmitButton — aksi ini membalas
            form state (bukan throw), jadi sukses/gagalnya diumumkan useActionToast. */}
        <SubmitButton
          successMessage=""
          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          {isPending ? "Menyimpan…" : saveLabel}
        </SubmitButton>
        <p className="text-body-sm text-on-surface-variant">{clearConfirmNote}</p>
      </div>
    </form>
  );
}
