# Animated icons

Small, hand-built animated icons for the few places a motion cue genuinely
helps (nav toggle, notification bell, CTA arrows). Deliberately **not** a
library and not sprinkled everywhere — the site is an institutional portal, so
restraint is the rule.

Rules for anything added here:

- Built on `motion` (already a dependency). The global `<MotionConfig
  reducedMotion="user">` in `src/components/providers.tsx` flattens every
  animation to instant for visitors who ask for reduced motion — do not fight
  it with `repeat: Infinity` idle loops.
- No runtime CDN, no external registry. Bundled with the app (mainland-China
  reachability, see `docs/Tech Stack.md`).
- Colour comes from `currentColor`; size is a `size` prop in px. Match the
  Lucide icon it replaces so layout does not shift.
- Motion is a garnish. The real signal (unread badge, active route, button
  label) must still read with animation disabled.
