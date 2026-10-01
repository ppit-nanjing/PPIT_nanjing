import { DecoRule } from "@/components/deco/deco-rule";

/**
 * Leadership quote on the dark band: diamond medallion on the top edge, curved
 * corner ornaments, a thin plum-blossom outline in the corner. Pure markup (the
 * look lives in .quote-card, globals.css), so it is a server component.
 * Needs <PlumSymbols /> on the page for the blossom outline.
 */
export function QuoteCard({ text, author, period }: { text: string; author: string; period: string }) {
  return (
    <figure className="quote-card">
      <span className="corner tl" aria-hidden="true" />
      <span className="corner tr" aria-hidden="true" />
      <span className="corner bl" aria-hidden="true" />
      <span className="corner br" aria-hidden="true" />
      <span className="medal" aria-hidden="true">
        <span>&ldquo;</span>
      </span>
      <svg className="bloom" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <use href="#plum-line" />
      </svg>
      <blockquote className="relative z-10">
        <p className="text-quote-text text-on-band">{text}</p>
      </blockquote>
      <DecoRule className="my-5 relative z-10" />
      <figcaption className="relative z-10">
        <strong className="block text-label-caps uppercase text-band-accent">{author}</strong>
        <span className="block text-body-sm text-on-band-muted mt-1">{period}</span>
      </figcaption>
    </figure>
  );
}
