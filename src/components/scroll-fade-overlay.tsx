// Fixed top/bottom gradient overlays that fade page content into the
// background at the viewport edges - purely decorative, no JS. Ported from
// the ScrollFadeOverlay pattern (website-portofolio reference), re-expressed
// with this project's --color-background token instead of a hardcoded color.
export function ScrollFadeOverlay() {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-16 md:h-24 pointer-events-none z-40"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-background) 0%, color-mix(in srgb, var(--color-background) 70%, transparent) 50%, transparent 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed bottom-0 left-0 right-0 h-16 md:h-24 pointer-events-none z-40"
        style={{
          background:
            "linear-gradient(to top, var(--color-background) 0%, color-mix(in srgb, var(--color-background) 70%, transparent) 50%, transparent 100%)",
        }}
      />
    </>
  );
}
