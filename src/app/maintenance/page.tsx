import { Wrench } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { DecoRule } from "@/components/deco/deco-rule";

export default async function MaintenancePage() {
  const { t } = await getT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)]">
      <div className="text-center max-w-lg">
        <div className="medal-ring w-20 h-20 mx-auto mb-8">
          <Wrench className="text-primary-container" size={28} aria-hidden />
        </div>
        <h1 className="text-headline-lg text-heading mb-3">{t("maintenance.title")}</h1>
        <DecoRule className="mb-5" />
        <p className="text-body-md text-on-surface-variant mb-2">
          {t("maintenance.body")}
        </p>
        <p className="text-label-caps text-secondary uppercase mt-8">
          {t("maintenance.helpPrefix")}{" "}
          <a
            href="https://instagram.com/ppit_nanjing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            @ppit_nanjing
          </a>
        </p>
      </div>
    </div>
  );
}
