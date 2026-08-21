"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { createContribution } from "@/app/actions/contributions";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const CONDITION_KEYS: Record<string, TKey> = {
  new: "inventory.condition.new",
  good: "inventory.condition.good",
  fair: "inventory.condition.fair",
  damaged: "inventory.condition.damaged",
  retired: "inventory.condition.retired",
};
const CONDITION_VALUES = Object.keys(CONDITION_KEYS);

export function ContributeForm({ categories }: { categories: string[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lend, setLend] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createContribution(fd);
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("inventory.form.submitError"));
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 bg-primary-container/10 border border-primary-container/20 rounded-lg p-5">
        <p className="text-body-md text-on-background">
          {t("inventory.contributeSuccess")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl">
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.itemName")} *</span>
        <input name="name" required className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.category")}</span>
        <input
          name="category"
          list="contribution-categories"
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
        <datalist id="contribution-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.description")}</span>
        <textarea name="description" rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
      </label>

      <ImageUploadCropper name="imageUrl" folder="inventory" label={t("inventory.form.photoOptional")} aspect={1} />

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.conditionLabel")}</span>
        <select name="condition" defaultValue="good" className="bg-soft-gray rounded-md p-3 text-body-md">
          {CONDITION_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(CONDITION_KEYS[v])}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.type")} *</span>
        <label className="flex items-center gap-2 text-body-md">
          <input type="radio" name="contributionType" value="donate" checked={!lend} onChange={() => setLend(false)} />
          {t("inventory.form.donate")}
        </label>
        <label className="flex items-center gap-2 text-body-md">
          <input type="radio" name="contributionType" value="lend_to_org" checked={lend} onChange={() => setLend(true)} />
          {t("inventory.form.lend")}
        </label>
      </fieldset>

      {lend && (
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.expectedReturn")}</span>
          <input type="date" name="expectedReturnDate" className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
      )}

      {error && <p className="text-body-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        {pending ? t("inventory.form.sending") : t("inventory.form.submit")}
      </button>
    </form>
  );
}
