import { Home, Compass } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { DecoRule } from "@/components/deco/deco-rule";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)]">
      <div className="deco-frame w-full max-w-lg bg-surface-container-lowest rounded-lg p-10 text-center">
        <p className="text-display-hero-mobile text-gold-ink mb-3">404</p>
        <h1 className="text-headline-lg text-heading mb-3">{t("notFound.title")}</h1>
        <DecoRule className="mb-5" />
        <p className="text-body-md text-on-surface-variant mb-8">{t("notFound.desc")}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="deco-btn inline-flex items-center justify-center gap-2 bg-accent text-on-accent text-label-caps uppercase px-6 py-3 rounded-md hover:brightness-95 transition-[filter]"
          >
            <Home size={18} /> {t("notFound.home")}
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
          >
            <Compass size={18} /> {t("notFound.explore")}
          </Link>
        </div>
      </div>
    </div>
  );
}
