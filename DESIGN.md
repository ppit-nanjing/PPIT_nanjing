---
name: PPIT Nanjing
description: The official portal of the Nanjing chapter of PPI Tiongkok — an Art Deco + Art Nouveau identity in warm ivory, deep jade and antique gold, built to be read from behind the Great Firewall.
colors:
  primary: "#0a2b25"
  primary-container: "#0e3b32"
  on-primary: "#f4efe3"
  on-primary-container: "#f4efe3"
  inverse-primary: "#e2cf9d"
  secondary: "#605b4e"
  secondary-container: "#e6dec9"
  on-secondary-container: "#4a4639"
  tertiary: "#7a5c1e"
  tertiary-container: "#8a6724"
  on-tertiary-container: "#fbf4e2"
  background: "#f4efe3"
  on-background: "#1d1b14"
  surface-container-lowest: "#faf7ee"
  surface-container-low: "#f0e9d9"
  surface-container: "#ece4d2"
  surface-container-high: "#e5dcc6"
  surface-container-highest: "#ddd2b8"
  surface-dim: "#ddd3bb"
  surface-variant: "#e8dfca"
  on-surface: "#1d1b14"
  on-surface-variant: "#605b4e"
  outline: "#7a7463"
  outline-variant: "#d4ccb8"
  inverse-surface: "#0a2b25"
  inverse-on-surface: "#f4efe3"
  error: "#b3261e"
  on-error: "#ffffff"
  error-container: "#f9dedc"
  on-error-container: "#8c1d18"
  warm-cream: "#f8f3e7"
  soft-gray: "#eee7d6"
  muted-gold: "#c6a052"
  accent: "#c6a052"
  on-accent: "#0a2b25"
  gold-ink: "#7a5c1e"
  blossom: "#d98f9a"
  heading: "#0e3b32"
  band: "#0e3b32"
  on-band: "#f4efe3"
  on-band-muted: "#cfd4c8"
  band-accent: "#e2cf9d"
typography:
  display:
    fontFamily: "Cinzel, Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "54px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Cinzel, Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.02em"
  title:
    fontFamily: "Cinzel, Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Josefin Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "16.5px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Cinzel, Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.14em"
  quote:
    fontFamily: "'Cormorant Garamond', Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "8px"
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
  button-gold:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
  card:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
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
Rewritten 2026-10 for the Art Deco + Art Nouveau redesign. Source of truth is
`src/app/globals.css` (the @theme block, five [data-theme]/[data-mode] palette
blocks, and the "Art Deco + Art Nouveau ornament" layer) plus the live components
under `src/components/` (`deco/`, `quote-card`, `photo-frame`, `site-intro`, ...).
The values in the frontmatter are the default palette: zijin, light mode.
`npm run check:contrast` verifies all six palettes against WCAG AA.
`docs/Design System/*` and the old Scholar's Courtyard / Spectral / Plus Jakarta
notes are history; the files in `docs/` named Typography, Color System and
Homepage & Login were updated with this redesign.
-->

## Overview

**Creative North Star: "The Gilded Courtyard"**

A courtyard gate in a Ming-dynasty city: a jade-green wall, a gilded frame, and a
plum tree dropping petals over it. Nanjing is 六朝古都, and 梅花, the plum blossom,
is its official flower. The portal is where a community of Indonesian students
keeps its official record, so it speaks like an institution (symmetry, engraved
capitals, double hairline frames) and feels like a welcome (warm ivory paper, a
slow drift of blossoms), because the reader might be a nervous first-year who
landed in China last week.

Two traditions meet on purpose. **Art Deco** supplies the structure: sunbursts,
stepped and double frames, diamond medallions, engraved all-caps type, the dark
jade band with a gold lattice. **Art Nouveau** supplies the softness: arch-topped
windows, curved corner ornaments, plum blossoms. Neither is decoration for its own
sake; each ornament marks a place (the chapter seat is the gold arch, the leader's
words get a medallion, the cabinet gets a framed portrait).

Density stays low on public pages: the audience reads on mid-range Windows and
Android devices behind the Great Firewall, so a heavy page is an excluded reader,
not a slow one. Ornament is CSS and a handful of SVG paths, never images.

The identity carries three interchangeable city palettes, each with a dark
variant: **zijin** (紫金山, jade and gold, the default), **meihua** (梅花, plum
crimson and the same gold) and **mingwall** (明城墙, Ming-wall slate and bronze).
A component is authored once and renders correctly in all six because every
colour is a token.

**Key characteristics:**
- Engraved display type (Cinzel) over a warm ivory ground (`#f4efe3`)
- Jade for authority, gold for ornament and calls to action, plum blossom for warmth
- Double gold hairline frames, diamond medallions, arch tops, a dark gold-latticed band
- Crisp corners (2–8px) and arches, never pills (except the nav and avatars)
- Six palettes, zero hard-coded colour outside the sanctioned exceptions
- Low density and fluid gutters; motion that stills, rather than vanishes, when reduced

Confirmed anti-references: **the generic SaaS dashboard** (no purple or blue
gradients, glassmorphism panels, blob illustrations, neon pills) and **the
political campaign site** (no flag-heavy red-and-white, oversized portraits, slogan
bombast). Also keep Nanjing **visibly distinct from the Chongqing chapter site**
(dark maroon + gold): here the ground is light ivory and the dark colour is jade.

## Colors

A Material-3-derived role system (surface / on-surface / container tiers) in a warm
register, plus Deco-specific roles. Values below are zijin light; the other five
palettes are in `globals.css` and are verified by `npm run check:contrast`.

### Jade (primary)
- **Jade** (`#0e3b32`, `primary-container` / `heading` / `band`): the fill of every
  primary button, headings, and the dark band. In light mode it is also the main
  *text* accent (about 190 uses), so it must stay dark.
- **Deep jade** (`#0a2b25`, `primary` / `inverse-surface` / `on-accent`): hover fill,
  the darkest text and edge colour.
- **Ivory on jade** (`#f4efe3`, `on-primary` / `on-band`): text on jade.

### Gold
- **Antique gold** (`#c6a052`, `accent` / `muted-gold`): the fill of the hero and
  header calls to action, hairlines, rings, diamonds. **Never body text on a light
  surface** (2.1:1).
- **Gold ink** (`#7a5c1e`, `gold-ink` / `tertiary`): gold that is safe as text on
  the ivory ground (5.4:1): eyebrows, category badges, the accent word in a headline.
- **Soft gold** (`#e2cf9d`, `band-accent` / `inverse-primary`): gold text on the dark
  band (8.1:1).

### Neutral
- **Ivory** (`#f4efe3`, `background`): the page ground. **Warm cream** (`#f8f3e7`):
  the hero ground. **Ivory-2** (`#ece4d2`, `surface-container`): panels and cards.
  The surface ladder (`-lowest` `#faf7ee` to `-highest` `#ddd2b8`) is how a surface
  signals raised, hovered or selected.
- **Ink** (`#1d1b14`, `on-surface`): body text, never pure black. **Muted**
  (`#605b4e`, `on-surface-variant`): secondary text (5.9:1 on ivory).
- **Hairline** (`#d4ccb8`, `outline-variant`) and **Edge** (`#7a7463`, `outline`, 3:1).

### Ornament
- **Blossom** (`#d98f9a`, `blossom`): the plum petals. Decoration only, never text.
- **Band** (`#0e3b32`, `band`, `on-band`, `on-band-muted`, `band-accent`): the dark
  Deco band (About section, footer, intro curtain).

### Error
Signal Red (`#b3261e`) with its container tokens. Unchanged across palettes.

### Named Rules

**The Gold Fill, Gold Ink Rule.** Bright gold is for fills, hairlines and ornament.
Gold *text* on a light surface is `text-gold-ink` (or `text-tertiary`). On the dark
band it is `text-band-accent`. A bright-gold word on ivory is a contrast bug.

**The Dark Band Rule.** A dark Deco surface uses the `band` tokens, not
`inverse-surface`. `inverse-surface` flips to light in dark mode; `band` stays dark
in both, which is what a gold-latticed band, a footer and an intro curtain need.

**The Shared Alarm Rule.** The four `error` tokens are the only colours that do not
change between the three city themes. An alarm that changes colour by theme is not
an alarm.

**The Six-Palette Rule.** Every colour is a token defined in `globals.css`. Sanctioned
exceptions hold literal hex: the seasonal auth panel (`.auth-season-panel`, a fixed
illustration of a real place), third-party brand SVGs (the Google "G"), the theme
switcher swatches, hex inside `data:` SVGs (the select chevron), and email HTML. Any
other hard-coded colour is a bug. After touching a token, run `npm run check:contrast`.

## Typography

**Display font:** Cinzel (engraved capitals, Trajan-inspired) with Georgia, Songti SC,
SimSun fallbacks.
**Body and UI font:** Josefin Sans (geometric, 1920s) with PingFang SC, Hiragino Sans
GB, Microsoft YaHei, Noto Sans CJK SC fallbacks.
**Quote font:** Cormorant Garamond, italic only.
All three are variable fonts self-hosted through `next/font`: never loaded from a CDN
(China reachability, and the CSP is `font-src 'self'`). CJK fallbacks are explicit
because place and campus names (紫金山) render inline with Latin copy.

**Character:** Cinzel gives headings the authority of an inscription on a gate;
Josefin Sans keeps running text open and modern against it; Cormorant gives the
leader's words a literary voice. Plus Jakarta Sans and Spectral (the previous
faces) stay loaded with `preload: false` only for the event-description font picker.

### Hierarchy
- **Display** (Cinzel 600, 54px desktop / 30px mobile, 1.15, +0.01em): the single hero
  headline. `text-display-hero`.
- **Headline** (Cinzel 600, 30px, 1.25, +0.02em): section headings. `text-headline-lg`.
- **Title** (Cinzel 600, 22px, 1.35, +0.02em): card titles, sub-sections.
  `text-headline-md`. **Small title** (18px, +0.03em): `text-headline-sm`.
- **Sub-heading** (Josefin Sans 600): H4–H6 inside body copy.
- **Lead** (Josefin Sans 400, 19px, 1.75): `text-body-lg`. **Body** (16.5px, 1.65):
  `text-body-md`. **Small** (14.5px): `text-body-sm`. Josefin's x-height is small, so
  each step is half a point above the old Jakarta scale.
- **Label / eyebrow** (Cinzel 600, 12px, +0.14em, UPPERCASE): eyebrows, badges, button
  text, table headers. `text-label-caps`; eyebrows add `tracking-[0.3em]`.
- **Quote** (Cormorant Garamond italic, 24px, 1.55): `text-quote-text`.

### Named Rules

**The Engraving Rule.** Cinzel is for lines, not paragraphs: headings, labels,
buttons, numerals. The token classes (`text-display-hero`, `text-headline-*`,
`text-label-caps`) carry the face themselves, so they work on `<p>` and `<span>`
too. Never set a paragraph in Cinzel.

**The Tracked-Caps Rule.** `label-caps` is always UPPERCASE with positive tracking.
It is the eyebrow / kicker / badge / button voice, never a sentence.

**The Body Weight Rule.** Josefin Sans body text is weight 400 or heavier. Weight 300
is too thin on a low-end Android screen.

**The Quote Rule.** Cormorant is for the leader's quote and nothing else.

## Layout

- **Container:** 1200px max (`--container-max`), centred.
- **Page gutter:** fluid, `clamp(1rem, 4vw, 1.5rem)`.
- **Section rhythm:** 128px between major sections on desktop, 64px on mobile.
- **Bands:** a full-bleed section (the dark About band, the ivory-2 photo section)
  holds a `max-w-[var(--container-max)]` container inside; text never runs edge to edge.
- **Breakpoints:** three phone tiers (`s` 320, `m` 375, `l` 414) below Tailwind's
  `sm` 640 / `md` 768 / `lg` 1024. The Deco intro and the arch/ornament simplifications
  switch at 680px.

**The 1200 Rule.** 1200px container, 128/64 section rhythm, fluid gutter. Don't
introduce a fourth container width.

## Elevation & Depth

Flat by default, separated by **hairlines and double frames**, not shadows.

- **Resting:** a surface sits on the ground with a 1px `outline-variant` border or
  one step up the `surface-container-*` ladder. Feature panels use the **double gold
  frame** (`.deco-frame`): an outer 1px gold hairline and an inset second hairline.
- **Shadows** are for things that float or lean: the scrolled nav pill, hovered cards
  (`0 14px 40px rgba(29,27,20,0.12)`), the quote card on the dark band, modals.
  Never coloured.
- **Gold hairline** (`--deco-line`, 58% gold) and **soft hairline** (`--deco-line-soft`,
  32%) are the ornament colours.

## Shapes

- **Corner scale:** `sm` 2px, `md` 4px (default), `lg` 6px, `xl` 8px, `full` for
  avatars and the nav pill. Deco is geometric: step to a bigger radius only for a
  large surface.
- **Arch** (`.arch-top`): a rounded-top window shape (Nouveau) for the city cards and
  the framed photograph. The sweep is a custom property (`--arch-r`).
- **Diamond:** a rotated square is the medallion, divider and crest shape
  (`.deco-rule`, the quote medallion, the photo crest).
- **Brackets and cartouche** (`.deco-cartouche`): a plate with bracket ends, used
  once, for the motto.
- **Icons:** Lucide, stroke-based, `currentColor`. A small set of hand-built animated
  icons lives in `src/components/icons/`.

## Components

### Buttons
- **Shape:** `rounded-md` (4px). Text is always `label-caps`.
- **Primary:** `primary-container` (jade) fill, `on-primary` text, `12px 24px`.
  Hover darkens to `primary`.
- **Gold call to action:** `bg-accent text-on-accent` plus `.deco-btn` (an inset double
  hairline like an engraved plate). Hero, header login, footer join. Hover is
  `brightness-95`.
- **Secondary:** `surface-container-low` fill, 1px `outline-variant`, hover to
  `surface-container-lowest`. **Ghost:** transparent, hover `surface-container-low`.
- **Focus (all):** `focus-visible:ring-2 ring-primary-container ring-offset-2
  ring-offset-background` (on the dark band: `ring-band-accent ring-offset-band`).
- **Reduced motion:** every hover transform or transition carries a `motion-reduce:`
  counterpart. Destructive actions use `ConfirmButton`.

### Cards
- `surface-container-low` (or `-lowest`) with a 1px `outline-variant` border,
  `rounded-lg`. Hover: border to `muted-gold`, a small lift, never a big shadow jump.
- **Statistic medal:** a double-framed card (`.deco-frame`), the figure inside a gold
  ring (`.medal-ring`), a gold-ink label beneath. The Bold-Number Rule holds: the
  figure carries the weight.
- **Arch city card** (`CitiesGrid`): an arch top with a fan ornament, the Chinese name
  under the Latin one. The chapter seat is the **gold** card (`bg-accent`).
- **Content card** (`ContentCard`): cover image, gold-ink category badge, Cinzel title,
  jade "read" button.

### Quote card
`QuoteCard` on the dark band: a diamond medallion with the opening quote mark on the
top edge, four curved corner ornaments, a line-diamond-line divider, name in
`band-accent` and the term in `on-band-muted`, and a thin gold plum-blossom outline in
the corner (hidden under 680px, where it would cross the name).

### Framed photograph
`PhotoFrame`: an arch-topped double gold mat with a diamond crest and a caption. The
image is `next/image` from the same origin, lazy-loaded.

### Navigation
- **Public navbar:** a sticky centred `rounded-full` pill, opaque and flat at the top,
  narrower with a soft blur and shadow once scrolled, with a 1px gold hairline. The
  logo is a CSS mask of `/logo-mark.svg` (`.brand-logo`) that takes the text colour.
  Gold login button. Below `lg` it collapses to a burger.
- **Console sidebar:** fixed `w-64`, grouped by module.
- **Footer:** the dark `band` with the gold lattice: a framed join card, logo and
  wordmark in soft gold, pipe-separated link columns, the theme switcher.

### Inputs, chips
`soft-gray` fill, `rounded-md`; chips are a low-opacity tint of `gold-ink` or
`primary-container` with `label-caps` text. Errors use `text-error`.

### Signature: the Plum Blossom
`PlumBlossoms` + `PlumSymbols`: five-petal blossoms (`blossom` token, three tones)
drifting over the hero and the dark band, a few falling across the hero. Pure CSS,
decoration only, `aria-hidden`. **Under reduced motion they stay, but still.**

### Signature: the Sunburst and the Foil
A twelve-ray sunburst turns very slowly behind the hero headline (`Sunburst`); a gold
foil hairline shimmers under the hero (`.deco-foil`).

### Signature: the Intro
`SiteIntro` on `/` only. Desktop: a five-slat jade curtain with the logo that lifts
away in a stagger. Phones (680px and below): one full jade layer with the logo that
fades (five tall slats wrap into a second grid row on a narrow screen). Pure CSS: it
ends by itself even if JS never runs, the page content is in the DOM underneath, the
overlay is `aria-hidden` and `pointer-events: none`. It plays once per tab session in
production, on every load in development, never on Back/Forward, always with
`?intro`, never with `?nointro`, and **not at all under reduced motion**. The rule
lives in `src/lib/intro-gate.ts`.

### Signature: the City Theme Switcher
Three named palettes (紫金山 / 梅花 / 明城墙) plus light/dark, switched from the footer,
applied to `<html>` by an inline script before first paint. A theme is a pure token
override; no component knows which is active.

### Signature: the Seasonal Auth Panel
`/login` and `/signup` show the 紫金山 silhouette recoloured across four real Nanjing
seasons. It has its **own fixed palette**, independent of the theme and dark mode.
Do not wire it to the theme switcher.

## Motion

- **Entrances:** `Reveal`, `AnimatedHeroHeading`, `CountUp` (Motion library) are
  transform-led; the hero headline is never hidden until JS runs.
- **Ambient:** blossoms (`deco-drift`, `deco-fall`), sunburst (`deco-spin`), foil
  (`deco-foil`). All CSS.
- **Reduced motion:** the global rule collapses animation and transition durations to
  ~0. State and hierarchy must survive that: blossoms freeze in place (falling ones
  rest at their `--y`), the intro is removed, hover transforms have `motion-reduce:`
  fallbacks. Never let a collapsed animation end in an invisible state.

## Do's and Don'ts

### Do:
- **Do** put every colour through a token, and run `npm run check:contrast` after
  changing one.
- **Do** use `text-gold-ink` for gold text on light surfaces and `text-band-accent` on
  the dark band.
- **Do** use `band` tokens for dark Deco surfaces.
- **Do** keep ornament decorative: `aria-hidden`, no meaning carried by it.
- **Do** keep Cinzel to headings, labels, buttons and numerals.
- **Do** give every hover transform a `motion-reduce:` fallback and let Motion
  components inherit the global `MotionConfig reducedMotion="user"`.
- **Do** test a shared-token or global-UI change in all six palettes (3 cities x
  light/dark) and on a 375px phone.
- **Do** keep the hero legible without JavaScript or animation.
- **Do** let wide content scroll inside its own container; the page body never
  scrolls sideways.

### Don't:
- **Don't** use bright gold as body text on ivory.
- **Don't** use a gradient as the fill of a button, card or page. Gradients are
  allowed only as the gold hairline fade (`.deco-rule`, `.deco-foil`) and the faint
  diagonal lattice on a dark band.
- **Don't** add a glassmorphism panel (the scrolled nav pill's soft blur is the one
  exception), a blob illustration, or a neon pill.
- **Don't** lean on flag-heavy red-and-white, oversized portraits, or slogan bombast.
  The cabinet photo is a framed group portrait, not a hero image of a person.
- **Don't** reintroduce coloured shadows.
- **Don't** paraphrase the motto (*bersinergi, berkarya, berkontribusi* /
  *synergize, create, contribute*) or the national tagline: they are verbatim.
- **Don't** make the site look like `ppitiongkok.com` or `chongqing.ppitiongkok.com`.
- **Don't** add a runtime dependency on an external font, icon, script, or image CDN:
  the reader is behind the Great Firewall.
- **Don't** set a paragraph in Cinzel or switch an H4+ to the display face.
- **Don't** replay the intro on reload in production or let it block interaction.
