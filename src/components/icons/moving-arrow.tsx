import { ArrowRight } from "lucide-react";

/**
 * ArrowRight that eases a few px to the right when an ancestor marked `group`
 * is hovered or focus-visible. Pure CSS (matches the nav's existing
 * group-hover/transition idiom) so it needs no client component; put `group` on
 * the <Link>/<button> that wraps the label + arrow.
 */
export function MovingArrow({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <ArrowRight
      size={size}
      aria-hidden="true"
      className={
        "transition-transform duration-200 ease-out group-hover:translate-x-1 " +
        "group-focus-visible:translate-x-1 motion-reduce:transition-none " +
        "motion-reduce:group-hover:translate-x-0 " +
        className
      }
    />
  );
}
