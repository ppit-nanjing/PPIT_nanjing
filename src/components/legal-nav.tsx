import { ChevronRight } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export async function LegalNav({ active }: { active: string }) {
  const { t } = await getT();
  const LINKS = [
    { key: "terms", label: t("legal.navTerms"), href: "/terms" },
    { key: "privacy", label: t("legal.navPrivacy"), href: "/privacy" },
    { key: "ad-art", label: t("footer.aboutLinks.adart"), href: "/organization/ad-art" },
  ] as const;

  return (
    <aside className="w-full md:w-64 shrink-0 md:sticky md:top-24 h-fit">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <h2 className="text-headline-md text-on-background mb-4 border-b border-outline-variant pb-4">
          {t("legal.navTitle")}
        </h2>
        <nav className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <a
              key={l.key}
              href={l.href}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-body-md transition-colors ${
                active === l.key
                  ? "bg-surface-container-low text-primary-container font-semibold border-l-2 border-primary-container"
                  : "text-on-surface-variant hover:text-on-background hover:bg-surface-container-low"
              }`}
            >
              {l.label}
              {active === l.key && <ChevronRight size={16} />}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
