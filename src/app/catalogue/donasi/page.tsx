import Image from "next/image";
import Link from "next/link";
import { Heart, Info, Lock } from "lucide-react";
import { auth } from "@/auth";
import { getDonationChannels, getVerifiedDonations, submitDonation } from "@/app/actions/donations";
import { getT } from "@/lib/i18n/server";
import { Select, CheckboxField } from "@/components/console/form";

export default async function DonasiPage() {
  const { t } = await getT();
  const [session, channels, supporters] = await Promise.all([
    auth(),
    getDonationChannels(),
    getVerifiedDonations(),
  ]);
  const authed = Boolean(session?.user?.id);

  return (
    <section className="pt-8 flex flex-col gap-10">
      <p className="text-body-lg text-on-surface-variant max-w-2xl">
        {t("donation.intro")}
      </p>

      {/* Being upfront beats a surprise: donors should know a human checks this. */}
      <div className="flex items-start gap-3 bg-surface-container-low border border-outline-variant rounded-xl p-4 max-w-3xl">
        <Info size={18} className="text-on-surface-variant shrink-0 mt-0.5" aria-hidden />
        <p className="text-body-md text-on-surface-variant">
          {t("donation.noticeBefore")}{" "}
          <strong className="text-on-background">{t("donation.noticeStrong")}</strong>{" "}
          {t("donation.noticeAfter")}
        </p>
      </div>

      <div>
        <h2 className="text-headline-md text-on-background mb-1">{t("donation.channelsTitle")}</h2>
        <p className="text-body-md text-on-surface-variant mb-5">{t("donation.channelsDesc")}</p>
        {channels.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
            <p className="text-body-md text-on-surface-variant">
              {t("donation.channelsEmpty")}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {channels.map((c) => (
              <li
                key={c.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3"
              >
                <h3 className="text-headline-sm text-on-background">{c.label}</h3>
                {c.qrImageUrl && (
                  <Image
                    src={c.qrImageUrl}
                    alt={t("donation.qrAlt", { label: c.label })}
                    width={200}
                    height={200}
                    className="w-44 h-44 object-contain rounded-md self-start"
                  />
                )}
                {c.accountName && <p className="text-body-md text-on-background">{c.accountName}</p>}
                {c.accountDetail && (
                  <p className="text-body-md text-on-surface-variant font-mono break-all">{c.accountDetail}</p>
                )}
                {c.instructions && <p className="text-body-sm text-on-surface-variant">{c.instructions}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-headline-md text-on-background mb-1">{t("donation.reportTitle")}</h2>
        <p className="text-body-md text-on-surface-variant mb-5">
          {t("donation.reportDesc")}
        </p>
        {!authed ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center max-w-xl">
            <Lock className="mx-auto mb-3 text-on-surface-variant" size={22} aria-hidden />
            <p className="text-body-md text-on-background mb-3">{t("donation.loginPrompt")}</p>
            <Link
              href="/login"
              className="inline-block bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
            >
              {t("donation.loginBtn")}
            </Link>
          </div>
        ) : (
          <form
            action={submitDonation}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-4 max-w-xl"
          >
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                {t("donation.displayName")}
              </span>
              <input
                name="donorName"
                defaultValue={session?.user?.name ?? ""}
                className="bg-soft-gray rounded-md p-3 text-body-md"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("donation.amount")}</span>
                <input name="amountCny" type="number" min={1} className="bg-soft-gray rounded-md p-3 text-body-md" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("donation.viaChannel")}</span>
                <Select name="method" className="w-full" placeholder={t("donation.selectPlaceholder")}>
                  {channels.map((c) => (
                    <option key={c.id} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("donation.message")}</span>
              <textarea name="message" rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                {t("donation.proofUrl")}
              </span>
              <input name="proofUrl" placeholder="https://…" className="bg-soft-gray rounded-md p-3 text-body-md" />
            </label>
            <CheckboxField name="anonymous" label={t("donation.anonymous")} className="text-on-background" />
            <button
              type="submit"
              className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              {t("donation.submit")}
            </button>
            <p className="text-label-caps text-on-surface-variant">
              {t("donation.verifyNote")}
            </p>
          </form>
        )}
      </div>

      <div>
        <h2 className="text-headline-md text-on-background mb-1">{t("donation.supportersTitle")}</h2>
        <p className="text-body-md text-on-surface-variant mb-5">{t("donation.supportersDesc")}</p>
        {supporters.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
            <Heart className="mx-auto mb-3 text-on-surface-variant" size={22} aria-hidden />
            <p className="text-body-md text-on-surface-variant">{t("donation.supportersEmpty")}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supporters.map((s) => (
              <li key={s.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
                <p className="text-body-lg text-on-background">{s.anonymous ? t("donation.anonymousName") : s.donorName}</p>
                {s.amountCny != null && !s.anonymous && (
                  <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                    &yen; {s.amountCny}
                  </p>
                )}
                {s.message && <p className="text-body-md text-on-surface-variant mt-1">{s.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
