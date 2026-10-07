"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/console/submit-button";
import { SubmitButton } from "@/components/console/submit-button";
import type { FormTemplateEditState } from "@/app/actions/forms";

const INPUT =
  "w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const LABEL = "text-label-caps uppercase tracking-wide text-on-surface-variant";

export function DuplicateTemplateForm({
  templates,
  action,
}: {
  templates: { id: string; title: string }[];
  action: (prev: FormTemplateEditState, formData: FormData) => Promise<FormTemplateEditState>;
}) {
  const [state, formAction, isPending] = useActionState<FormTemplateEditState, FormData>(action, {});
  useActionToast(isPending, state.error, "Template duplikat dibuat.");

  return (
    <form action={formAction} className="flex flex-col gap-3 mt-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Salin dari</span>
          <select name="sourceId" className={INPUT} required>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Judul baru</span>
          <input name="title" required maxLength={200} placeholder="Rekrutmen 2027" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Slug baru</span>
          <input name="slug" required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="recruitment-2027" className={INPUT} />
        </label>
      </div>
      {state.error && <p className="text-body-sm text-error">{state.error}</p>}
      <SubmitButton
        successMessage=""
        disabled={isPending}
        className="self-start bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-surface-container-lowest transition-colors disabled:opacity-60"
      >
        Duplikat
      </SubmitButton>
    </form>
  );
}
