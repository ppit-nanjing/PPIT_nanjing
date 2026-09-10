---
name: PPIT Nanjing
description: The official portal of the Nanjing chapter of PPI Tiongkok — official but warm, built to be read from behind the Great Firewall.
colors:
  primary: "#33493c"
  primary-container: "#3f5a49"
  on-primary: "#ffffff"
  on-primary-container: "#e6f0ea"
  inverse-primary: "#a9cbb4"
  secondary: "#566058"
  secondary-container: "#dfe4df"
  on-secondary-container: "#444d46"
  tertiary: "#356057"
  tertiary-container: "#45766b"
  on-tertiary-container: "#edf5f2"
  background: "#f8f7f1"
  on-background: "#1e241f"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f2f2e9"
  surface-container: "#ecede2"
  surface-container-high: "#e6e7db"
  surface-container-highest: "#dfe0d3"
  surface-dim: "#dfe0d3"
  surface-variant: "#e9eae0"
  on-surface: "#1e241f"
  on-surface-variant: "#48514a"
  outline: "#64705f"
  outline-variant: "#d3d6c9"
  inverse-surface: "#2c332d"
  inverse-on-surface: "#f0f2ec"
  error: "#b3261e"
  on-error: "#ffffff"
  error-container: "#f9dedc"
  on-error-container: "#8c1d18"
  warm-cream: "#fbfbf4"
  soft-gray: "#eeefe7"
  muted-gold: "#a97e34"
typography:
  display:
    fontFamily: "Spectral, Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Spectral, Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Spectral, Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "'Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  stack-sm: "16px"
  stack-md: "32px"
  gutter: "32px"
  card-padding: "32px"
  section-gap: "128px"
  section-gap-mobile: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  button-hero:
    backgroundColor: "{colors.on-primary}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "{colors.soft-gray}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  chip:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: PPIT Nanjing

<!--
Generated 2026-09-09 by `/impeccable document` (scan mode). Source of truth is
`src/app/globals.css` (@theme block + six [data-theme]/[data-mode] palettes) and
the live components under `src/components/`. The prose notes in `docs/Design
System/*` are pre-2026-08 and describe a superseded Indonesian-red palette — do
not extract from them; they are being kept only as history.
Mirrored to the Obsidian vault at `Projects/PPIT Nanjing/DESIGN.md`.
-->

## Overview

**Creative North Star: "The Scholar's Courtyard"**

Nanjing is 六朝古都, the literary capital of Jiangnan, and this portal is where a
community of Indonesian students keeps its official record. The system reads like
a scholar's courtyard: a warm paper ground, serif headlines with the weight of an
inscription, and enough open space that nothing feels rushed. It is unmistakably
official — it speaks for the chapter and feeds data into the national body — but
the warmth is in every detail, because the reader might be a nervous first-year
who landed in China last week.

Restraint is the discipline. One accent colour does the brand's talking; the rest
of the screen is warm neutrals. Surfaces sit flat with a hairline border, and a
shadow — when it appears at all — is a soft ambient glow, never a hard edge.
Density is deliberately low on public pages: the audience reads on mid-range
Windows and Android devices behind the Great Firewall, so a heavy page is an
excluded reader, not a slow one.

The identity carries three interchangeable city palettes — **zijin** (紫金山, the
pine green of the chapter's namesake forested mountain, the default), **meihua**
(梅花, the plum blossom that is Nanjing's official flower — a rose-crimson petal
with golden stamens), and
**mingwall** (明城墙, the grey stone of the Ming city wall) — each with a dark
variant, all six checked against WCAG AA. They are part of the identity, not
decoration. A component is authored once and renders correctly in all six
because every colour is a token.

**Key Characteristics:**
- Serif display type (Spectral) over a warm off-white paper ground (`#f8f7f1`)
- One accent, six palettes, zero hard-coded colour outside three sanctioned exceptions
- Flat surfaces, hairline borders, ambient-glow shadows only
- Low density and fluid gutters — legible on constrained devices and connections
- Official without nationalism; warm without whimsy

Confirmed anti-references: **the generic SaaS dashboard** (no gradients,
glassmorphism, blob illustrations, or neon pill buttons) and **the political
campaign site** (no flag-heavy red-and-white, no oversized portraits of figures,
no slogan bombast).

## Colors

A Material-3-derived role system (surface / on-surface / container tiers) in a
warm, low-chroma register. The default palette is **zijin**: 紫金山 is a forested
mountain of pine and grey stone. The primary is that **pine green**; the tertiary
a mistier **pine-teal** — the far ridge seen through haze; and a **warm antique
gold** (`muted-gold`) is the one non-green accent, used sparingly. The name means
"purple-gold", but the palette carries no violet — it read as costume, not place.

### Primary
- **Pine** (`#33493c`): brand mark, active/current state, accent text, link
  text, focus-ring base. Used as a *text and edge* colour, sparingly.
- **Pine Bright** (`#3f5a49`, `primary-container`): the fill of every primary
  button and CTA, section top-accent bars, and low-opacity tint badges
  (`primary-container/10`). This is the colour the eye should follow to the next
  action.
- **On Primary** (`#ffffff`) / **On Primary Container** (`#e6f0ea`): text and
  icons on pine fills.
- **Sage** (`#a9cbb4`, `inverse-primary`): the accent on dark inverse surfaces
  (the footer) where the deep pine would disappear.

### Secondary
- **Green Slate** (`#566058`): secondary text and icons — quieter than
  `on-surface-variant`, for supporting metadata.
- **Slate Tint** (`#dfe4df`, `secondary-container`): neutral badges and chips
  that should not read as branded.

### Tertiary
- **Ridge Teal** (`#356057`) / **Ridge Teal Bright** (`#45766b`,
  `tertiary-container`): a mistier pine-teal — the far ridge through haze. Category
  badges, decorative rules, cultural accents. Never a primary action. Cooler and
  bluer than the primary pine, but close enough that it is *not* a second brand
  colour — it does not carry the org-chart branch coding (that uses pine / gold /
  green-slate).
- **Gold** (`#a97e34`, `muted-gold`): the "金" of the name — a warm antique gold
  for the hero's base hairline and selective decorative accents. The one accent
  that isn't a green. Not body text (it clears large-text contrast only).

### Neutral
- **Paper** (`#f8f7f1`, `background` / `surface`): the page ground. Warm off-white
  with a barely-there green cast — the whole system sits on this.
- **Card White** (`#ffffff`, `surface-container-lowest`): the fill of raised
  cards and panels sitting on Paper.
- **Surface tiers** (`surface-container-low` `#f2f2e9` → `container` `#ecede2` →
  `high` `#e6e7db` → `highest` `#dfe0d3`): tonal layering. A step up the ladder is
  how a surface signals "raised" or "hovered" or "selected" — this does the work
  a shadow would do elsewhere.
- **Ink** (`#1e241f`, `on-surface` / `on-background`): body and heading text. A
  very dark green-black, never pure `#000`.
- **Ink Muted** (`#48514a`, `on-surface-variant`): secondary body text, captions,
  the dominant eyebrow colour, and the hero's mist ridgeline.
- **Hairline** (`#d3d6c9`, `outline-variant`): the 1px border that separates
  flat surfaces. **Edge** (`#64705f`, `outline`): a firmer border for inputs and
  emphasis.
- **Inverse Surface** (`#2c332d`) / **Inverse Ink** (`#f0f2ec`): the footer,
  toasts — a dark block for contrast, not a theme.

### Extended
- **Warm Cream** (`#fbfbf4`): the ground for a large alternating section (and the
  homepage hero) — a half-step warmer than Paper.
- **Soft Gray** (`#eeefe7`): the fill of every form input and of divider zones
  that replace a hard line.
- **Muted Gold** (`#a97e34`): the warm-gold "金" accent, used selectively (hero
  base hairline, decorative rules). Not body text.

### Error
- **Signal Red** (`#b3261e`, `error`) with `error-container` (`#f9dedc`) and
  `on-error-container` (`#8c1d18`): form validation, destructive confirmation.

### Named Rules

**The One Accent Rule.** On any given screen, `primary` + `primary-container`
(pine green, or the active city's equivalent) covers well under 10% of the pixels —
the brand mark, the primary button, at most one tint badge. Everything else is
Paper and neutrals. The accent's rarity is what makes it read as "the next step".

**The Shared Alarm Rule.** The four `error` tokens are the only colours that do
**not** change between the three city themes. Meihua and mingwall re-tint
everything else; error stays Signal Red. An alarm that changes colour by theme is
not an alarm.

**The Six-Palette Rule.** Every colour is a token defined in `globals.css`. Three
sanctioned exceptions hold literal hex: the seasonal auth panel
(`.auth-season-panel`, a fixed illustration of a real place), third-party brand
SVGs (the Google "G"), and email HTML (mail clients ignore CSS variables). A
fourth hard-coded colour is a bug.

## Typography

**Display Font:** Spectral (serif) — with Georgia, Songti SC, SimSun fallbacks.
**Body / UI Font:** Plus Jakarta Sans — with PingFang SC, Hiragino Sans GB,
Microsoft YaHei, Noto Sans CJK SC fallbacks.
Both are self-hosted via `next/font` — never loaded from a CDN (China
reachability). CJK fallbacks are explicit because place, campus, and theme names
(紫金山) render inline with Latin copy.

**Character:** Spectral gives headlines the authority of a carved inscription
without stiffness — it is a contemporary literary serif, not a lawyerly one. Plus
Jakarta Sans (commissioned for Jakarta's own city branding) keeps the body warm
and Indonesian-rooted, and stays legible in the dense `/console` tables. The
pairing says "official record, kept by people who care".

### Hierarchy
- **Display** (Spectral, 800, 56px desktop / 36px mobile, line-height 1.1,
  tracking −0.03em): the single hero headline on a page. `text-display-hero`.
- **Headline** (Spectral, 700, 32px, 1.3, −0.01em): section headings on public
  pages. `text-headline-lg`.
- **Title** (Spectral, 700, 24px, 1.4, −0.01em): card titles, sub-sections,
  modal titles. `text-headline-md`.
- **Sub-heading** (Plus Jakarta Sans, 600, ~18px): H4–H6 inside body copy —
  legal, articles, detail views. Deliberately **not** serif.
- **Lead** (Plus Jakarta Sans, 400, 18px, 1.75): opening paragraph, intro text.
  `text-body-lg`.
- **Body** (Plus Jakarta Sans, 400, 16px, 1.65): default running text.
  `text-body-md`. Keep measure around 65–75 characters.
- **Label / Eyebrow** (Plus Jakarta Sans, 600, 12px, tracking +0.1em,
  UPPERCASE): eyebrows above headings, section kickers, badges, button text.
  `text-label-caps`.
- **Quote** (Spectral, 400, italic, 22px, 1.6): leadership quotes and
  testimonials, with the key phrase in `primary` or bold. `text-quote-text`.

### Named Rules

**The Serif Ceiling Rule.** Spectral stops at H3. H4 and below — and every piece
of UI chrome — are Plus Jakarta Sans. Distinguish a sub-heading from body by
weight (600), never by switching to serif.

**The Tracked-Caps Rule.** `label-caps` is always UPPERCASE with +0.1em tracking.
It is the eyebrow / kicker / badge / button voice. It never appears as a sentence
or as body copy.

**The Bold-Number Rule.** A statistic ("15K+", "32 cabang") is set at
headline-to-display scale with a small `label-caps` line beneath it — the number
carries the weight, the label names it.

## Layout

- **Container:** content maxes at **1200px** (`--container-max`), centred.
- **Page gutter:** fluid — `clamp(1rem, 4vw, 1.5rem)` — tighter on a 320px phone,
  capped at 1.5rem on larger screens.
- **Section rhythm:** **128px** between major sections on desktop, **64px** on
  mobile (`--spacing-section-gap` / `-mobile`). Vertical stacks inside a section
  use 16px / 32px steps.
- **Card padding:** 32px is the standard interior (`--spacing-card-padding`);
  smaller cards drop to 16–24px, large editorial panels go to 40–64px.
- **Grids:** responsive card grids run `grid-cols-1` → `sm:grid-cols-2` →
  `lg:grid-cols-2/3/4` by content density. Wide content (tables, the org chart,
  the coverage maps) scrolls inside its own `overflow-x-auto` container; the page
  body never scrolls sideways.
- **Breakpoints:** three phone-tier breakpoints (`s` 320px, `m` 375px, `l`
  414px) sit *below* Tailwind's `sm` 640 / `md` 768 / `lg` 1024, so the cascade
  reads base < s < m < l < sm < md < lg. `xl`/`2xl` are currently unused.

**The 1200 Rule.** 1200px container, 128/64 section rhythm, fluid
`clamp(1rem, 4vw, 1.5rem)` gutter. These three values define the page skeleton;
don't introduce a fourth container width or a fixed gutter.

## Elevation & Depth

The system is **flat by default with tonal layering**, not a shadow ladder.

- **Resting state:** a surface is flat and separated from its ground by a **1px
  `outline-variant` border**, or by sitting one step up the
  `surface-container-*` ladder. This is the primary depth cue.
- **Shadows are an ambient warm glow**, never a hard edge. The recipe is a wide,
  soft, low-alpha spread in the warm near-black
  `rgba(39, 23, 22, 0.04–0.10)`. They are reserved for things that genuinely
  float above the page: the nav pill once scrolled, modals and the gallery
  lightbox, dropdown menus, the org-chart nodes, and a few feature cards.
- There is **no coloured shadow.** (An earlier prototype used red-tinted CTA
  shadows; that idea was dropped. Do not reintroduce it in any hue.)

### Shadow Vocabulary
- **Ambient card** (`box-shadow: 0 10px 30px rgba(39,23,22,0.04)`): the softest
  lift, for a feature card or quote block that should barely separate.
- **Ambient raised** (`0 14px 40px rgba(39,23,22,0.10)`): a floating panel,
  popover, or the scrolled nav pill.
- **Modal** (`shadow-2xl` / `0 25px 50px -12px rgba(0,0,0,0.25)`): full overlays
  and the lightbox only.

**The Flat-At-Rest Rule.** Surfaces are flat at rest with a hairline border.
A shadow is a response to floating (scroll, overlay, menu) — not a default
decoration, and never a way to fake hierarchy that tonal layering should carry.

## Shapes

- **Corner scale:** `sm` 4px, `md` 12px, `lg` 16px, `xl` 24px, `full` for pills.
- **`md` (12px) is the default corner** — buttons, inputs, chips, small cards,
  icon buttons. `lg` (16px) for medium cards, dropdowns, list rows. **`xl`
  (24px)** for large content cards, feature panels, and modals. `full` for pills,
  avatars, tag chips, and circular icon buttons. `sm` (4px) is a rare exception
  (tiny inline chips).
- **Borders:** 1px `outline-variant` is the standard hairline. A `primary`
  top-border (2–3px) is a recurring motif on org-chart nodes and accent cards —
  a "bookmark" of brand colour on an otherwise neutral surface.
- **Icons:** Lucide, stroke-based, sized by a `size` prop (14–24px typical),
  coloured by `currentColor`. A small set of hand-built animated icons lives in
  `src/components/icons/` (nav toggle morph, notification bell, CTA arrow) —
  restrained, and silent under `prefers-reduced-motion`.

**The 12px Default Rule.** Reach for `rounded-md` first. Step to `rounded-xl`
only for a large surface or a modal; `rounded-full` only for something genuinely
pill- or disc-shaped. Don't mix three radii on one component.

## Components

### Buttons
- **Shape:** `rounded-md` (12px). Text is always `label-caps` — UPPERCASE, +0.1em
  tracking.
- **Primary:** `primary-container` fill, `on-primary` text, padding `12px 24px`
  (default), `16px 32px` (hero), `8px 16px` (compact). Hover: fill darkens to
  `primary` via `transition-colors`; the hero button also `scale-105`.
- **Hero / on-dark:** inverted — `on-primary` (white) fill, `primary` text — used
  on the dark hero panel.
- **Secondary:** `surface-container-low` fill, 1px `outline-variant` border,
  `on-background` text, hover to `surface-container-lowest`.
- **Ghost:** transparent, hover `bg-surface-container-low` — nav items, toolbar
  actions.
- **Focus (all):** `focus-visible:outline-none` +
  `focus-visible:ring-2 ring-primary-container` +
  `ring-offset-2 ring-offset-background`. This exact pattern is used in ~160
  places — it is the focus signature, do not vary it.
- **Reduced motion:** every hover transform/transition carries a
  `motion-reduce:` counterpart.
- **Destructive:** use `ConfirmButton` (`src/components/console/confirm-button.tsx`).
  `window.confirm` / `window.alert` are ESLint-banned.

### Cards / Containers
- **Corner:** `rounded-xl` (24px) for content cards; `rounded-lg` (16px) for
  compact list rows.
- **Background:** `surface-container-lowest` (white) on Paper.
- **Border:** 1px `outline-variant` — this is the default separator, present on
  nearly every card.
- **Shadow:** none at rest. A few feature cards add the Ambient-card glow.
- **Padding:** 32px standard (`--spacing-card-padding`); 16–24px compact.
- **Hover (clickable cards):** a small `scale-[1.02]` and/or one step up the
  surface ladder — never a big shadow jump.

### Inputs / Fields
- **Style:** `soft-gray` fill, `rounded-md`, `12px` vertical padding. Console
  forms use the shared primitives in `src/components/console/form.tsx`
  (`.pp-select` gives selects a CSS-var chevron so the native arrow can be
  removed).
- **Leading icon:** inputs with an icon get extra left padding (`pl-10`).
- **Focus:** `focus-visible:ring-2 ring-primary-container` (same signature as
  buttons); some inputs also shift `border-color` to `primary`.
- **Error:** `text-error` helper text; the field itself does not turn red
  unless the surrounding pattern already does.

### Chips / Badges
- **Style:** pill (`rounded-full`) or `rounded-sm` for inline tags. Fill is a
  low-opacity tint — `primary-container/10` with `primary-container` text for
  brand/status, `surface-container-low` with `on-surface-variant` text for
  neutral. Text is `label-caps`.
- Used for event/news categories and for status (`Pending`, `Disetujui`,
  `Ditolak`) in the console.

### Navigation
- **Public navbar:** sticky, centred, a **rounded-full pill** that is opaque and
  flat at the top of the page and, once scrolled, narrows slightly and gains the
  glass + Ambient-raised shadow. Logo left (a masked SVG that follows
  `currentColor`), inline links centre with a vertical roll-up hover, actions
  right. Below `lg` it collapses to a burger that morphs to an X.
- **Console sidebar:** fixed `w-64`, grouped by module.
- **Footer:** a dark `inverse-surface` block — logo, social icons, and
  pipe-separated (`|`) navigation, a motif taken from the national PPI Tiongkok
  site.

### Signature: the City Theme Switcher
Three named city palettes (紫金山 / 梅花 / 明城墙) plus light/dark, switched from
the footer, applied to `<html>` by an inline script before first paint. Each
theme is a pure token override — no component knows which theme is active.

### Signature: the 紫金山 ridgeline
Zijin Shan — the chapter's namesake Purple Mountain — is the recurring identity
motif: a three-layer bezier ridgeline (`RIDGE_PATH` in `auth/season-panel.tsx`)
drawn as receding Jiangnan mist. On the **homepage hero** it is three copies of
one ink (`on-surface-variant` at 0.09 / 0.16 / 0.24) along the bottom edge, over
a `warm-cream` ground that follows the theme (no dark panel to invert), with a
single `muted-gold` hairline at the base. Reuse this silhouette rather than a
generic skyline whenever a section needs a place-anchor; a licensed Nanjing
photograph can replace the hero treatment later.

### Signature: the Seasonal Auth Panel
`/login` and `/signup` show the same 紫金山 silhouette recoloured across four real
Nanjing seasons (spring/summer/autumn/winter). It has its **own fixed palette**,
independent of the city theme and dark mode — it depicts a specific real place,
not a theme-reactive surface. Do not wire it to the theme switcher.

## Do's and Don'ts

### Do:
- **Do** put every colour through a token. If a value isn't in `globals.css`,
  it's either one of the three sanctioned exceptions or a bug.
- **Do** separate surfaces with a 1px `outline-variant` border or a step up the
  `surface-container-*` ladder before reaching for a shadow.
- **Do** keep `primary` under ~10% of any screen — brand mark, one button, maybe
  one tint badge.
- **Do** use the exact focus signature (`ring-2 ring-primary-container
  ring-offset-2 ring-offset-background`) on every interactive element.
- **Do** give every hover transform a `motion-reduce:` fallback, and let Motion
  components inherit the global `MotionConfig reducedMotion="user"`.
- **Do** test a shared-token or global-UI change in all six palettes (3 cities ×
  light/dark) against WCAG AA.
- **Do** keep Spectral for H1–H3 only.
- **Do** let wide content scroll inside its own container; the page body never
  scrolls sideways.

### Don't:
- **Don't** add a gradient, a glassmorphism panel, a blob illustration, or a
  neon pill — the confirmed anti-reference is the generic SaaS dashboard.
- **Don't** lean on flag-heavy red-and-white, oversized portraits, or slogan
  bombast — the other anti-reference is the political campaign site. National
  feeling lives in the restraint, not the decoration.
- **Don't** reintroduce coloured shadows (the prototype's red CTA glow was
  removed on purpose) — in any hue.
- **Don't** use `rounded-sm` as a general corner; `md` (12px) is the default.
- **Don't** paraphrase the motto (*bersinergi, berkarya, berkontribusi* /
  *synergize, create, contribute*) or the national tagline — they are verbatim.
- **Don't** make the site look like `ppitiongkok.com` or
  `chongqing.ppitiongkok.com`. Nanjing's lighter, city-rooted look is a
  deliberate identity decision.
- **Don't** add a runtime dependency on an external font, icon, script, or image
  CDN — the reader is behind the Great Firewall.
- **Don't** switch a sub-heading (H4+) to serif to make it feel more important —
  use weight.
