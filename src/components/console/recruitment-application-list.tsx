"use client";

import { reviewRecruitmentApplication } from "@/app/actions/event-recruitment";
import { ConfirmButton } from "@/components/console/confirm-button";
import { CollapsibleRecordList, type BadgeTone } from "@/components/console/collapsible-record-list";
import { SubmitButton } from "@/components/console/submit-button";

export interface RecruitmentApplication {
  id: string;
  userName: string | null;
  userEmail: string | null;
  answersJson: Record<string, string> | null;
  questionLabels: Record<string, string>;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<RecruitmentApplication["status"], string> = {
  pending: "Menunggu",
  approved: "Diterima",
  rejected: "Ditolak",
};

const STATUS_TONE: Record<RecruitmentApplication["status"], BadgeTone> = {
  pending: "info",
  approved: "success",
  rejected: "danger",
};

export function RecruitmentApplicationList({ applications }: { applications: RecruitmentApplication[] }) {
  return (
    <CollapsibleRecordList
      records={applications}
      countLabel={(n) => `${n} lamaran`}
      emptyText="Belum ada yang mendaftar."
      defaultOpen={(v) => v.status === "pending"}
      renderSummary={(v) => ({
        title: v.userName ?? v.userEmail ?? "(tanpa nama)",
        subtitle: `didaftarkan · ${new Date(v.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`,
        badge: { text: STATUS_LABEL[v.status], tone: STATUS_TONE[v.status] },
      })}
      renderDetail={(v) => (
        <>
          <div className="flex flex-col gap-1.5">
            {v.userEmail && (
              <p className="text-body-sm text-on-surface-variant break-all">{v.userEmail}</p>
            )}
            {v.answersJson && Object.entries(v.answersJson).length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-md">
                {Object.entries(v.answersJson).map(([qId, answer]) => (
                  <>
                    <dt className="text-label-caps text-on-surface-variant">{v.questionLabels[qId] ?? qId}</dt>
                    <dd className="text-on-background whitespace-pre-wrap">{answer}</dd>
                  </>
                ))}
              </dl>
            )}
            {v.reviewNote && (
              <p className="mt-1 text-body-sm text-on-surface-variant">
                <span className="text-label-caps">Catatan: </span>
                {v.reviewNote}
              </p>
            )}
          </div>

          {v.status === "pending" && (
            <div className="flex gap-2 mt-2">
              <form action={reviewRecruitmentApplication} className="flex-1">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="decision" value="approved" />
                <SubmitButton
                  successMessage="Lamaran diterima."
                  className="w-full rounded-md bg-primary-container px-3 py-1.5 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary motion-reduce:transition-none"
                >
                  Terima
                </SubmitButton>
              </form>
              <ConfirmButton
                title="Tolak lamaran?"
                message={`Lamaran ini akan ditandai ditolak.`}
                confirmLabel="Ya, tolak"
                action={reviewRecruitmentApplication}
                payload={{ id: v.id, decision: "rejected" }}
                className="w-full flex-1 rounded-md border border-error/40 px-3 py-1.5 text-label-caps uppercase tracking-wide text-error transition-colors hover:bg-error-container/30 motion-reduce:transition-none"
              >
                Tolak
              </ConfirmButton>
            </div>
          )}
        </>
      )}
    />
  );
}