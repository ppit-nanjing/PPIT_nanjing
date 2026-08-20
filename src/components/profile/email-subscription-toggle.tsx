"use client";

import { useState, useTransition } from "react";
import { setEmailSubscription } from "@/app/actions/user";
import { useT } from "@/lib/i18n/client";

export function EmailSubscriptionToggle({ initialSubscribed }: { initialSubscribed: boolean | null }) {
  const [subscribed, setSubscribed] = useState(initialSubscribed ?? false);
  const [pending, startTransition] = useTransition();
  const t = useT();

  function toggle() {
    const next = !subscribed;
    setSubscribed(next); // optimistic
    startTransition(async () => {
      await setEmailSubscription(next);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-surface-container-low border border-outline-variant rounded-lg p-5">
      <div>
        <p className="text-body-md font-medium text-on-background">{t("emailSub.title")}</p>
        <p className="text-label-caps text-on-surface-variant">{t("emailSub.desc")}</p>
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        role="switch"
        aria-checked={subscribed}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-60 ${
          subscribed ? "bg-primary-container" : "bg-outline-variant"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-on-primary transition-transform ${
            subscribed ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
