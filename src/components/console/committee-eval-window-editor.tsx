"use client";

import { useState } from "react";
import { CalendarClock, Eraser } from "lucide-react";
import { saveCommitteeEvaluationWindow } from "@/app/actions/committee-evaluation";
import { SubmitButton } from "@/components/console/submit-button";

// Editor jendela waktu evaluasi panitia, ditampilkan di konsol kegiatan. Dua
// input datetime-local (boleh dikosongkan) + tombol pintasan "1 minggu setelah
// acara" yang mengisi keduanya dari akhir acara. Menyimpan lewat server action
// saveCommitteeEvaluationWindow — validasi ulang tetap di server.
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

  return (
    <form action={saveCommitteeEvaluationWindow} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-3">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant flex items-center gap-2">
          <CalendarClock size={16} aria-hidden="true" /> {windowLabel}
        </p>
        <p className="text-body-sm text-on-surface-variant">{windowNote}</p>
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
            <select name="presetDays" defaultValue="7" className="bg-soft-gray rounded-md p-3 text-body-md">
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
              const select = document.querySelector<HTMLSelectElement>('select[name="presetDays"]');
              const days = Number.parseInt(select?.value ?? "7", 10) || 7;
              setOpens(presetOpens);
              setCloses(new Date(base + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
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
        <SubmitButton
          successMessage={saveLabel}
          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          {saveLabel}
        </SubmitButton>
        <p className="text-body-sm text-on-surface-variant">{clearConfirmNote}</p>
      </div>
    </form>
  );
}