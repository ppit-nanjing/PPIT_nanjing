// WCAG AA contrast check for the six palettes (3 city themes x light/dark).
//
// Reads src/app/globals.css as-is, resolves each palette the way the browser's
// cascade does (base @theme -> [data-theme] -> [data-mode="dark"] ->
// [data-mode="dark"][data-theme]), then checks the pairs the UI actually uses.
// Run: npm run check:contrast. Exits 1 on any failing pair or missing token.
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Palette = Record<string, string>;

const css = readFileSync(join(__dirname, "..", "src", "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");

/** Body of the first `selector { ... }` block (brace-matched). */
function block(selector: string): Palette {
  const at = css.indexOf(selector + " {");
  if (at < 0) throw new Error(`globals.css: block not found: ${selector}`);
  const open = css.indexOf("{", at);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const out: Palette = {};
  for (const m of css.slice(open, end).matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const base = block("@theme");
const meihua = block('[data-theme="meihua"]');
const mingwall = block('[data-theme="mingwall"]');
const dark = block('[data-mode="dark"]');
const darkMeihua = block('[data-mode="dark"][data-theme="meihua"]');
const darkMingwall = block('[data-mode="dark"][data-theme="mingwall"]');

const palettes: Record<string, Palette> = {
  "zijin-light": { ...base },
  "meihua-light": { ...base, ...meihua },
  "mingwall-light": { ...base, ...mingwall },
  "zijin-dark": { ...base, ...dark },
  "meihua-dark": { ...base, ...meihua, ...dark, ...darkMeihua },
  "mingwall-dark": { ...base, ...mingwall, ...dark, ...darkMingwall },
};

const failures: string[] = [];

// Every override block must define every non-error token itself. Otherwise a theme
// silently inherits a zijin value that was never checked against its own ground.
const ERROR_TOKENS = new Set(["error", "on-error", "error-container", "on-error-container"]);
const required = Object.keys(base).filter((k) => !ERROR_TOKENS.has(k));
const overrideBlocks: Record<string, Palette> = { meihua, mingwall, dark, "dark+meihua": darkMeihua, "dark+mingwall": darkMingwall };
for (const [name, pal] of Object.entries(overrideBlocks)) {
  const missing = required.filter((k) => !(k in pal));
  if (missing.length) failures.push(`block ${name} does not define: ${missing.join(", ")}`);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // WCAG AA, normal text
const UI = 3.0; // WCAG AA, UI components and large text
const surfaces = ["background", "surface-container-lowest", "surface-container-low", "surface-container", "surface-container-high"];

type Pair = [fg: string, bg: string, min: number];
const pairs: Pair[] = [];
for (const s of surfaces) {
  for (const fg of ["on-surface", "on-surface-variant", "primary", "primary-container", "secondary", "tertiary", "gold-ink", "heading"]) pairs.push([fg, s, TEXT]);
}
pairs.push(
  ["on-primary", "primary-container", TEXT],
  ["on-primary", "primary", TEXT],
  ["on-primary-container", "primary-container", TEXT],
  ["on-secondary-container", "secondary-container", TEXT],
  ["on-surface", "secondary-container", TEXT],
  ["on-tertiary-container", "tertiary-container", TEXT],
  ["on-accent", "accent", TEXT],
  ["on-band", "band", TEXT],
  ["on-band-muted", "band", TEXT],
  ["band-accent", "band", TEXT],
  ["inverse-on-surface", "inverse-surface", TEXT],
  ["inverse-primary", "inverse-surface", TEXT],
  ["on-surface", "soft-gray", TEXT],
  ["on-surface-variant", "soft-gray", TEXT],
  ["on-surface", "warm-cream", TEXT],
  ["outline", "background", UI],
  ["outline", "surface-container", UI],
  ["error", "background", TEXT],
  ["on-error", "error", TEXT],
  ["on-error-container", "error-container", TEXT],
);

/** `tint` laid over `ground` at `alpha`: what `bg-<tint>/<n>` renders as. */
function blend(tint: string, ground: string, alpha: number): string {
  const a = parseInt(tint.slice(1), 16);
  const b = parseInt(ground.slice(1), 16);
  const mix = (shift: number) => Math.round(((a >> shift) & 255) * alpha + ((b >> shift) & 255) * (1 - alpha));
  return "#" + ((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0");
}

// Tinted chips: text on `bg-<tint>/<alpha>` over a surface. These once shipped as
// `bg-primary-container/40 text-on-primary-container`, cream text on a pale tint
// (~2:1), and the opaque pairs above could not catch it.
const tintedChips: [fg: string, tint: string, alpha: number][] = [
  ["primary-container", "primary-container", 0.15],
  ["tertiary", "tertiary-container", 0.1],
  ["gold-ink", "gold-ink", 0.1],
  ["on-surface", "accent", 0.1],
];
const chipGrounds = ["background", "surface-container-lowest", "surface-container-low"];

for (const [name, pal] of Object.entries(palettes)) {
  const bad: string[] = [];
  for (const [fg, tint, alpha] of tintedChips) {
    for (const g of chipGrounds) {
      if (!pal[fg] || !pal[tint] || !pal[g]) {
        bad.push(`${fg} on ${tint}/${alpha * 100}% over ${g}: token missing`);
        continue;
      }
      const r = ratio(pal[fg], blend(pal[tint], pal[g], alpha));
      if (r < TEXT) bad.push(`${fg} on ${tint}/${alpha * 100}% over ${g} = ${r.toFixed(2)}:1 (needs ${TEXT}:1)`);
    }
  }
  for (const [fg, bg, min] of pairs) {
    if (!pal[fg] || !pal[bg]) {
      bad.push(`${fg} on ${bg}: token missing`);
      continue;
    }
    const r = ratio(pal[fg], pal[bg]);
    if (r < min) bad.push(`${fg} on ${bg} = ${r.toFixed(2)}:1 (needs ${min}:1)`);
  }
  const summary = [
    ["on-surface", "background"],
    ["primary-container", "background"],
    ["gold-ink", "background"],
    ["on-band", "band"],
  ]
    .map(([a, b]) => `${a}/${b} ${ratio(pal[a], pal[b]).toFixed(1)}`)
    .join("  ");
  console.log(`${bad.length ? "FAIL" : " ok "}  ${name.padEnd(15)} ${summary}`);
  for (const b of bad) failures.push(`${name}: ${b}`);
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nAll ${Object.keys(palettes).length} palettes pass WCAG AA (${pairs.length} pairs each).`);
