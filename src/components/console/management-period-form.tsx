"use client";

import { useActionState } from "react";
import { createManagementPeriod, type ShortLinkFormState } from "@/app/actions/short-links";

export function PeriodForm() {
  const [state, formAction] = useActionState<ShortLinkFormState, FormData>(createManagementPeriod, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 mt-3">
      <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama periode</span>
        <input
          name="label"
          required
          placeholder="mis. 2026/2027"
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
        />
      </label>
      <button
        type="submit"
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:opacity-90 transition-colors"
      >
        Simpan Periode
      </button>
      {state.error && <p className="w-full bg-error-container/40 text-on-error-container text-body-md px-4 py-2 rounded-lg">{state.error}</p>}
    </form>
  );
}
