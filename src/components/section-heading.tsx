import { DecoRule } from "@/components/deco/deco-rule";
import { MovingArrow } from "@/components/icons/moving-arrow";
import { getT } from "@/lib/i18n/server";

/**
 * Shared section header: kicker (eyebrow) + title + deco divider + optional
 * description and "view all" link, centred. Used by the home page's sections.
 * `tone="band"` is for the dark band (About), where the text colours flip to the
 * band tokens. The kicker is gold-ink (the text-safe gold), never the bright gold.
 */
export async function SectionHeading({
  kicker,
  title,
  href,
  linkLabel,
  description,
  tone = "default",
}: {
  kicker: string;
  title: string;
  href?: string;
  linkLabel?: string;
  description?: string;
  tone?: "default" | "band";
}) {
  const { t } = await getT();
  const resolvedLinkLabel = linkLabel ?? t("common.viewAll");
  const band = tone === "band";
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <span className={`text-label-caps uppercase tracking-[0.3em] ${band ? "text-band-accent" : "text-gold-ink"}`}>{kicker}</span>
      <h2 className={`text-headline-lg text-balance ${band ? "text-band-accent" : "text-on-background"}`}>{title}</h2>
      <DecoRule />
      {description && (
        <p className={`text-body-md max-w-2xl text-pretty ${band ? "text-on-band-muted" : "text-on-surface-variant"}`}>{description}</p>
      )}
      {href && (
        <a
          href={href}
          className="group inline-flex items-center gap-1 text-label-caps uppercase text-primary-container hover:text-primary transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {resolvedLinkLabel} <MovingArrow size={16} />
        </a>
      )}
    </div>
  );
}
