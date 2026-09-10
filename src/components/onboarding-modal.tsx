"use client";

import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { ClipboardList } from "lucide-react";
import { setEmailSubscription } from "@/app/actions/user";
import { saveOnboardingSensus } from "@/app/actions/sensus";
import { useT } from "@/lib/i18n/client";
import { CheckboxField } from "@/components/console/form";
import { OnboardingCensusSection, type OnboardingCensus } from "@/components/onboarding-census-section";

/**
 * Shown once, right after a user's first sign-in - session.user.emailSubscribed
 * is null until they answer (see users.emailSubscribed), so this only ever
 * renders for someone who hasn't been asked yet. Optional: they can fill a few
 * census basics now (saved + continued later from /sensus) or skip entirely.
 */
export function OnboardingModal() {
  const t = useT();
  const { data: session, update } = useSession();
  const [pending, startTransition] = useTransition();
  // Sengaja tidak pre-fill dari akun Google: nama-nya sering cuma nama panggilan
  // (form sensus butuh nama lengkap sesuai paspor) dan "email aktif" di sensus
  // boleh beda dari email login. Biar pengisi yang menentukan.
  const [census, setCensus] = useState<OnboardingCensus>({});
  const [newsletter, setNewsletter] = useState(true);
  // Tutup di sisi klien begitu tombol diklik, tak peduli hasil server-nya. Kalau
  // salah satu aksi gagal (mis. sesi belum ke-refresh setelah login), pengisi
  // tetap tidak terjebak di modal — datanya bisa dilengkapi nanti di /sensus.
  const [done, setDone] = useState(false);

  if (done || !session || session.user.emailSubscribed !== null) return null;

  const userName = session.user.name ?? "";
  const userEmail = session.user.email ?? "";

  function finish(subscribed: boolean) {
    setDone(true);
    startTransition(async () => {
      try {
        await setEmailSubscription(subscribed);
        // Merge whatever was typed - saveOnboardingSensus ignores empty fields
        // and never blanks out existing /sensus progress. No-op if nothing typed.
        await saveOnboardingSensus(census);
      } catch {
        // Swallow: the modal is already closed. emailSubscribed stays null so it
        // reappears on the next visit, which is the right nudge anyway.
      }
      await update().catch(() => {});
    });
  }

  return (
    <div className="fixed inset-0 z-[100] bg-on-background/50 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg max-w-md w-full p-8 my-auto">
        <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mb-6">
          <ClipboardList className="text-primary-container" size={22} />
        </div>
        <h2 className="text-headline-md text-on-background mb-2">
          {t("onboarding.welcome", { name: userName.split(" ")[0] })}
        </h2>
        <p className="text-body-md text-on-surface-variant mb-6">{t("onboarding.censusDesc")}</p>

        <OnboardingCensusSection value={census} onChange={setCensus} />

        <CheckboxField
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          label={t("onboarding.optIn", { email: userEmail })}
          className="mt-6 text-on-background"
        />

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={() => finish(newsletter)}
            disabled={pending}
            className="w-full bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {pending ? t("onboarding.saving") : t("onboarding.continue")}
          </button>
          <button
            onClick={() => finish(false)}
            disabled={pending}
            className="w-full bg-transparent text-on-surface-variant uppercase tracking-wide text-label-caps py-2 rounded-md border border-outline-variant hover:text-on-background disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("onboarding.skip")}
          </button>
          <p className="text-label-caps text-secondary text-center">{t("onboarding.changeLater")}</p>
        </div>
      </div>
    </div>
  );
}
