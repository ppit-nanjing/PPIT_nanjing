"use client";

import { setVolunteerStatus } from "@/app/actions/volunteers";
import { ConfirmButton } from "@/components/console/confirm-button";
import { CollapsibleRecordList, type BadgeTone } from "@/components/console/collapsible-record-list";

export interface VolunteerApplication {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  divisionName: string | null;
  accountName: string | null;
}

const STATUS_LABEL: Record<VolunteerApplication["status"], string> = {
  pending: "Menunggu",
  approved: "Diterima",
  rejected: "Ditolak",
};

const STATUS_TONE: Record<VolunteerApplication["status"], BadgeTone> = {
  pending: "info",
  approved: "success",
  rejected: "danger",
};

export function VolunteerApplicationList({ applications }: { applications: VolunteerApplication[] }) {
  return (
    <CollapsibleRecordList
      records={applications}
      countLabel={(n) => `${n} lamaran`}
      emptyText="Belum ada yang melamar."
      defaultOpen={(v) => v.status === "pending"}
      renderSummary={(v) => ({
        title: v.fullName,
        subtitle: `minat: ${v.divisionName ?? "bebas"}`,
        badge: { text: STATUS_LABEL[v.status], tone: STATUS_TONE[v.status] },
      })}
      renderDetail={(v) => (
        <>
          <div className="flex flex-col gap-0.5 text-label-caps text-on-surface-variant">
            <span className="break-all normal-case">
              {v.email}
              {v.whatsapp ? ` · ${v.whatsapp}` : ""}
            </span>
            <span>
              Minat: <span className="text-on-background normal-case">{v.divisionName ?? "bebas"}</span>
              {v.status === "approved" && v.accountName ? ` · akun: ${v.accountName}` : ""}
            </span>
            {v.note && <span className="mt-1 text-body-sm normal-case">{v.note}</span>}
          </div>

          {v.status === "pending" && (
            <div className="flex gap-2">
              <form action={setVolunteerStatus} className="flex-1">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="decision" value="approved" />
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary-container px-3 py-1.5 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary motion-reduce:transition-none"
                >
                  Terima
                </button>
              </form>
              <ConfirmButton
                title="Tolak lamaran?"
                message={`Lamaran volunteer ${v.fullName} akan ditandai ditolak.`}
                confirmLabel="Ya, tolak"
                action={setVolunteerStatus}
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
