"use client";

import { useActionState } from "react";
import { saveSubmissionNote, type FormTemplateEditState } from "@/app/actions/forms";
import { SubmitButton, useActionToast } from "@/components/console/submit-button";

export function SubmissionNoteForm({
  submissionId,
  initialNote,
}: {
  submissionId: string;
  initialNote: string | null;
}) {
  const [state, formAction, isPending] = useActionState<FormTemplateEditState, FormData>(saveSubmissionNote, {});
  useActionToast(isPending, state.error, "Catatan disimpan.");

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={submissionId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Catatan internal</span>
        <textarea
          name="internalNote"
          defaultValue={initialNote ?? ""}
          maxLength={2000}
          rows={2}
          placeholder="Catatan khusus panitia — tidak terlihat oleh pengisi formulir."
          className="w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-y"
        />
      </label>
      <SubmitButton
        successMessage=""
        className="self-start text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors disabled:opacity-60"
      >
        {isPending ? "Menyimpan…" : "Simpan catatan"}
      </SubmitButton>
    </form>
  );
}
