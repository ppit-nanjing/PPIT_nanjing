import { Download, Trash2 } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { eventEvaluations } from "@/db/schema";
import { ConfirmButton } from "@/components/console/confirm-button";
import { deleteEventEvaluation } from "@/app/actions/event-evaluations";

type Evaluation = InferSelectModel<typeof eventEvaluations>;

const RATING_ROWS: { key: string; label: string; pick: (e: Evaluation) => number }[] = [
  { key: "registration", label: "Registrasi", pick: (e) => e.ratingRegistration },
  { key: "facilities", label: "Fasilitas", pick: (e) => e.ratingFacilities },
  { key: "cgt", label: "Sharing CGT", pick: (e) => e.ratingCgt },
  { key: "overall", label: "Keseluruhan", pick: (e) => e.ratingOverall },
];

const TEXT_ROWS: { key: string; label: string; pick: (e: Evaluation) => string | null }[] = [
  { key: "improveRegistration", label: "Improve registrasi (2027)", pick: (e) => e.improveRegistration },
  { key: "improveFacilities", label: "Improve fasilitas & sarpras (2027)", pick: (e) => e.improveFacilities },
  { key: "cgtMessage", label: "Kesan & pesan sharing CGT", pick: (e) => e.cgtMessage },
  { key: "improveService", label: "Improve pelayanan panitia & games", pick: (e) => e.improveService },
  { key: "overallMessage", label: "Kesan, pesan & saran keseluruhan", pick: (e) => e.overallMessage },
  { key: "heartwarming", label: "Heartwarming untuk panitia", pick: (e) => e.heartwarming },
];

function ExportLinks({ eventId }: { eventId: string }) {
  const base = `/api/console/events/${eventId}/evaluasi/export`;
  const cls =
    "inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-2 text-label-caps uppercase tracking-wide text-on-background hover:bg-surface-container-low transition-colors";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`${base}?format=csv`} className={cls}>
        <Download size={14} aria-hidden="true" /> CSV
      </a>
      <a href={`${base}?format=xlsx`} className={cls}>
        <Download size={14} aria-hidden="true" /> Excel
      </a>
    </div>
  );
}

function formatWhen(date: Date): string {
  return new Date(date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function EvaluationResults({ eventId, evaluations }: { eventId: string; evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Belum ada respons. Bagikan tautan <code className="text-on-background">/events/&lt;slug&gt;/evaluasi</code> ke
          grup peserta — buat short link + QR-nya di menu Tautan supaya gampang disebar di WeChat.
        </p>
        <ExportLinks eventId={eventId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-md text-on-surface-variant">
          <span className="text-on-background font-semibold">{evaluations.length}</span> respons · skala 1–10
        </p>
        <ExportLinks eventId={eventId} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RATING_ROWS.map((row) => {
          const values = evaluations.map(row.pick);
          const avg = values.reduce((s, v) => s + v, 0) / values.length;
          const counts = Array.from({ length: 10 }, (_, i) => values.filter((v) => v === i + 1).length);
          const max = Math.max(...counts, 1);
          return (
            <div key={row.key} className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{row.label}</p>
              <p className="text-headline-lg text-on-background leading-none mt-1">{avg.toFixed(1)}</p>
              <div className="mt-3 flex items-end gap-1" aria-hidden="true">
                {counts.map((c, i) => (
                  <span
                    key={i}
                    className="w-full rounded-sm bg-primary-container/70"
                    style={{ height: `${Math.max(2, Math.round((c / max) * 32))}px` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-on-surface-variant">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          );
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {evaluations.map((e) => {
          const texts = TEXT_ROWS.filter((row) => row.pick(e));
          return (
            <li key={e.id} className="rounded-lg border border-outline-variant p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body-md font-semibold text-on-background">
                    {e.anonymous || !e.respondentName ? "Anonim" : e.respondentName}
                    {e.respondentCity && !e.anonymous ? (
                      <span className="ml-2 text-body-sm font-normal text-on-surface-variant">{e.respondentCity}</span>
                    ) : null}
                  </p>
                  <p className="text-label-caps text-on-surface-variant">
                    {formatWhen(e.createdAt)}
                    {e.anonymous ? " · anonim" : ""}
                  </p>
                </div>
                <ConfirmButton
                  action={deleteEventEvaluation}
                  payload={{ id: e.id, eventId }}
                  message="Hapus respons evaluasi ini? Tindakan ini tidak bisa dibatalkan."
                  aria-label="Hapus respons"
                  className="rounded-md border border-outline-variant p-2 text-error hover:bg-error-container/30 transition-colors"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </ConfirmButton>
              </div>

              <div className="flex flex-wrap gap-2">
                {RATING_ROWS.map((row) => (
                  <span key={row.key} className="rounded-md bg-surface-container-low px-2.5 py-1 text-label-caps text-on-surface-variant">
                    {row.label}: <b className="text-on-background">{row.pick(e)}</b>
                  </span>
                ))}
              </div>

              {texts.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-outline-variant/60 pt-3">
                  {texts.map((row) => (
                    <div key={row.key}>
                      <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{row.label}</p>
                      <p className="text-body-md text-on-background whitespace-pre-wrap">{row.pick(e)}</p>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
