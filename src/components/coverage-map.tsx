"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { CoverageFeature } from "@/app/coverage/page";
import { useT } from "@/lib/i18n/client";

// Real administrative boundaries drawn as plain SVG paths - no tile provider,
// same reasoning as the national branch map (see app/organization/map): a tile
// service would be both a licence question and a reachability risk from inside
// mainland China. The GeoJSON is committed under src/data, so nothing is
// fetched at runtime either.

const WIDTH = 800;
const PAD = 16;
// Must match the tooltip's own max width, or the flip lands it half off-screen.
const TIP_W = 240;
const TIP_H = 100;
const EDGE = 8;
// The gold contour sits this many screen pixels outside the outline.
const CONTOUR_GAP = 4;

type Ring = number[][];
type Shape = {
  id: string;
  label: string;
  zh: string;
  within: string | null;
  d: string;
  at: [number, number];
};

function ringsOf(f: CoverageFeature): Ring[] {
  const g = f.geometry;
  if (g.type === "Polygon") return g.coordinates as Ring[];
  return (g.coordinates as number[][][][]).flat() as Ring[];
}

/** Shoelace area, used to pick a shape's main ring. */
function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

const LABEL_GRID = 28;
// A name is wider than it is tall, so room to the sides counts for less than room above and below.
const LABEL_ASPECT = 1.7;

/**
 * Where a name has the most room: the point inside `ring` (and outside `holes`)
 * farthest from any outline, found on a coarse grid. A centroid is not good
 * enough here - Qixia is a strip along the Yangtze and Jiangning wraps around
 * the city centre, so their centroids land on a neighbour or on the thin part.
 */
function labelPoint(ring: Ring, holes: Ring[]): [number, number] {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of ring) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  let best: [number, number] = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestRoom = -1;
  for (let i = 1; i < LABEL_GRID; i++) {
    for (let j = 1; j < LABEL_GRID; j++) {
      const px = x0 + ((x1 - x0) * i) / LABEL_GRID;
      const py = y0 + ((y1 - y0) * j) / LABEL_GRID;
      let room = Infinity;
      let ok = true;
      for (const [k, r] of [ring, ...holes].entries()) {
        let inside = false;
        for (let a = 0, b = r.length - 1; a < r.length; b = a++) {
          const ax = r[a][0], ay = r[a][1], bx = r[b][0], by = r[b][1];
          if (ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
          // Squared distance from the point to this segment, with x compressed.
          const ux = (ax - px) / LABEL_ASPECT, uy = ay - py;
          const vx = (bx - ax) / LABEL_ASPECT, vy = by - ay;
          const len = vx * vx + vy * vy;
          const along = len ? Math.max(0, Math.min(1, -(ux * vx + uy * vy) / len)) : 0;
          const qx = ux + along * vx, qy = uy + along * vy;
          room = Math.min(room, qx * qx + qy * qy);
        }
        // Must be inside the shape itself (k = 0) and outside every hole.
        if (inside !== (k === 0)) { ok = false; break; }
      }
      if (ok && room > bestRoom) { bestRoom = room; best = [px, py]; }
    }
  }
  return best;
}

// Four steps, not a continuous ramp: a name has to stay readable on top of the
// fill, and the middle of the ramp passes neither dark nor light text. 32% is
// the most the third step can carry before on-surface text drops under 4.5:1 in
// dark mode.
// The ramp is `heading`, not `primary-container`: in dark mode primary-container
// is the same gold as `accent`, so the busiest region and the highlighted one
// would be indistinguishable. `heading` is jade on ivory and ivory on jade.
const LEVEL_FILL = ["fill-surface-container-high", "fill-heading/18", "fill-heading/32", "fill-heading"] as const;
const LEVEL_SWATCH = ["bg-surface-container-high", "bg-heading/18", "bg-heading/32", "bg-heading"] as const;
const LEVEL_INK = ["text-on-surface", "text-on-surface", "text-on-surface", "text-background"] as const;

/** "鼓楼区" -> "鼓楼", "南京市" -> "南京": the suffix is noise at label size. */
const shortZh = (zh: string) => zh.replace(/[区市]$/, "");

/**
 * The map stands directly on the page, with no panel behind it: a gold contour
 * follows its outline the way the double hairline follows a framed card.
 */
export function CoverageMap({
  features,
  counts,
  ariaLabel: ariaLabelProp,
  unit: unitProp,
  emptyUnit: emptyUnitProp,
  links,
  onSelect,
  highlight,
  highlightLabel,
  spotlight,
  labels = true,
  only,
}: {
  features: CoverageFeature[];
  counts: Record<string, number | null>;
  ariaLabel?: string;
  unit?: string;
  emptyUnit?: string;
  /** Region id -> href. A region with a link is a real anchor; the others only show their figure. */
  links?: Record<string, string>;
  /** Handles a plain click on a linked region in place of the navigation (modified clicks still follow the href). */
  onSelect?: (id: string) => void;
  /** Region drawn in gold: the selected district on /map, the chapter seat on /coverage. */
  highlight?: string | null;
  highlightLabel?: string;
  /** Region raised from outside the map, e.g. while its row in a list is hovered. */
  spotlight?: string | null;
  /**
   * false leaves the map bare: a name then shows only on the region raised from
   * outside the map. Under the pointer the tooltip already names the region.
   */
  labels?: boolean;
  /** When set, every other region is drawn faint - e.g. the matches of a search. */
  only?: string[] | null;
}) {
  const t = useT();
  const uid = useId();
  // Defaults resolved here, not as default parameter values - a default can't call useT().
  const ariaLabel = ariaLabelProp ?? t("cmap.ariaDefault");
  const unit = unitProp ?? t("cmap.unitDefault");
  const emptyUnit = emptyUnitProp ?? t("cmap.emptyUnitDefault");
  const [active, setActive] = useState<string | null>(null);
  // Viewport coordinates, because the tooltip is position:fixed, which also
  // keeps it from being squeezed or clipped by the map's own column.
  const [pointer, setPointer] = useState<{ left: number; top: number; maxW: number } | null>(null);

  const { shapes, height } = useMemo(() => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const f of features) {
      for (const ring of ringsOf(f)) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }

    // A degree of longitude is shorter than a degree of latitude, by cos(lat).
    // Without this correction Nanjing came out ~18% too wide.
    const cosLat = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
    const spanX = (maxLng - minLng) * cosLat;
    const spanY = maxLat - minLat;

    // The canvas follows the region's real proportions instead of a fixed
    // landscape box - Nanjing is tall and narrow, and a fixed 800x620 left
    // 53% of the width empty while squashing the districts into a column.
    const scale = (WIDTH - PAD * 2) / spanX;
    const h = Math.round(spanY * scale + PAD * 2);

    const project = ([lng, lat]: number[]) => [
      PAD + (lng - minLng) * cosLat * scale,
      // SVG y grows downward; latitude grows upward.
      h - PAD - (lat - minLat) * scale,
    ];

    const rings = new Map(features.map((f) => [f.properties.id, ringsOf(f).map((r) => r.map(project))]));
    const mainRing = (id: string) => rings.get(id)!.reduce((best, r) => (ringArea(r) > ringArea(best) ? r : best));

    const shapes: Shape[] = features.map((f) => {
      const id = f.properties.id;
      // Jurong is painted on top of Zhenjiang, so Zhenjiang's name must keep clear of it.
      const keepOut = features.filter((x) => x.properties.within === id).map((x) => mainRing(x.properties.id));
      return {
        id,
        label: f.properties.label,
        zh: f.properties.zh,
        within: f.properties.within,
        at: labelPoint(mainRing(id), keepOut),
        d: rings
          .get(id)!
          .map((ring) => "M" + ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z")
          .join(" "),
      };
    });

    return { shapes, height: h };
  }, [features]);

  const max = Math.max(0, ...shapes.map((s) => counts[s.id] ?? 0));
  const lowTop = Math.floor(max / 3);
  const midTop = Math.floor((2 * max) / 3);
  const levelOf = (id: string) => {
    const n = counts[id] ?? 0;
    if (!n) return 0;
    return n > midTop ? 3 : n > lowTop ? 2 : 1;
  };
  const range = (lo: number, hi: number) => (lo > hi ? null : lo === hi ? String(lo) : `${lo}–${hi}`);
  const legend =
    max > 0
      ? [
          { level: 0, text: shapes.some((s) => !counts[s.id]) ? t("cmap.legendNone") : null },
          { level: 1, text: range(1, lowTop) },
          { level: 2, text: range(lowTop + 1, midTop) },
          { level: 3, text: range(midTop + 1, max) },
        ].filter((step): step is { level: number; text: string } => step.text != null)
      : [];

  // Jurong sits inside Zhenjiang, so it must be painted after it or it vanishes.
  const ordered = [...shapes].sort((a, b) => (a.within ? 1 : 0) - (b.within ? 1 : 0));
  const byId = new Map(shapes.map((s) => [s.id, s]));
  const raised = byId.get(active ?? spotlight ?? "");
  const ref = (s: Shape) => `#${uid}${s.id}`;
  const fillOf = (s: Shape) => (highlight === s.id ? "fill-accent" : LEVEL_FILL[levelOf(s.id)]);
  // A faint region also gives up its colour: a busy district at 30% opacity is
  // the same tone as a quiet one at full strength, and would pass for a match.
  const isFaint = (id: string) => !!only && !only.includes(id);
  const figureOf = (id: string) => (counts[id] != null ? `${counts[id]} ${unit}` : emptyUnit);

  // Prefer the bottom-right of the cursor, flip when that would overflow, then
  // clamp. Flipping alone is not enough on a phone: a 240px tooltip flipped at
  // x=216 on a 375px screen still hangs 38px off the left edge.
  function track(e: React.MouseEvent) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(TIP_W, vw - EDGE * 2);

    let left = e.clientX + 14;
    if (left + maxW > vw - EDGE) left = e.clientX - 14 - maxW;
    left = Math.max(EDGE, Math.min(left, vw - maxW - EDGE));

    let top = e.clientY + 14;
    if (top + TIP_H > vh - EDGE) top = e.clientY - 14 - TIP_H;
    top = Math.max(EDGE, Math.min(top, vh - TIP_H - EDGE));

    setPointer({ left, top, maxW });
  }

  const tip = active ? byId.get(active) : undefined;
  const at = (x: number, y: number) => ({ left: `${(x / WIDTH) * 100}%`, top: `${(y / height) * 100}%` });

  return (
    <figure className="flex flex-col gap-6">
      {(legend.length > 0 || (highlight && highlightLabel)) && (
        <ul aria-label={t("cmap.legend")} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-on-surface-variant">
          {legend.map((step) => (
            <li key={step.level} className="flex items-center gap-1.5">
              <span aria-hidden className={`block h-3 w-3 rounded-sm ${LEVEL_SWATCH[step.level]}`} />
              {step.text}
            </li>
          ))}
          {legend.length > 0 && <li>{unit}</li>}
          {highlight && highlightLabel && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="block h-3 w-3 rounded-sm bg-accent" />
              {highlightLabel}
            </li>
          )}
        </ul>
      )}

      <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${height}` }}>
        {/* overflow-visible: the contour is drawn outside the outline and would
            otherwise be cut where a shape touches the edge of the canvas. */}
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="block h-full w-full overflow-visible"
          role="group"
          aria-label={ariaLabel}
          onMouseLeave={() => setPointer(null)}
        >
          {/* Each outline is defined once and drawn several times through <use>,
              so the path data is not repeated in the HTML. */}
          <defs>
            {ordered.map((s) => (
              <path key={s.id} id={`${uid}${s.id}`} d={s.d} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            ))}
          </defs>

          {/* The contour: a wide gold stroke with a slightly narrower ground-coloured
              one on top leaves a 1px line at a constant distance from the outline. */}
          <g aria-hidden className="pointer-events-none">
            <g className="fill-muted-gold stroke-muted-gold opacity-60" strokeWidth={CONTOUR_GAP * 2 + 2}>
              {ordered.map((s) => <use key={s.id} href={ref(s)} />)}
            </g>
            <g className="fill-background stroke-background" strokeWidth={CONTOUR_GAP * 2}>
              {ordered.map((s) => <use key={s.id} href={ref(s)} />)}
            </g>
          </g>

          {ordered.map((s) => {
            const hover = {
              onMouseEnter: (e: React.MouseEvent) => { setActive(s.id); track(e); },
              onMouseMove: track,
              onMouseLeave: () => setActive(null),
            };
            const piece = (
              <use
                href={ref(s)}
                strokeWidth={1.5}
                className={`cursor-pointer stroke-background transition-[fill,opacity] motion-reduce:transition-none ${
                  isFaint(s.id) ? "fill-surface-container-high opacity-50" : fillOf(s)
                }`}
              />
            );
            const name = `${s.label}, ${figureOf(s.id)}`;
            const href = links?.[s.id];
            if (href) {
              return (
                <Link
                  key={s.id}
                  href={href}
                  prefetch={false}
                  scroll={false}
                  aria-label={name}
                  className="outline-none"
                  onFocus={() => setActive(s.id)}
                  onBlur={() => setActive(null)}
                  onClick={(e) => {
                    if (!onSelect || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    onSelect(s.id);
                  }}
                  {...hover}
                >
                  {piece}
                </Link>
              );
            }
            return (
              <g
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={name}
                className="outline-none"
                onFocus={() => setActive(s.id)}
                onBlur={() => setActive(null)}
                // Touch has no hover, so the tap itself has to place the tooltip.
                onClick={(e) => { setActive(active === s.id ? null : s.id); track(e); }}
                {...hover}
              >
                {piece}
              </g>
            );
          })}

          {/* The hovered or focused piece again, lifted and outlined. Drawn last so
              its neighbours cannot cover the outline; it is also the keyboard focus
              indicator, since focus sets `active`. */}
          {raised && (
            <motion.use
              key={raised.id}
              href={ref(raised)}
              initial={{ y: 0 }}
              animate={{ y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              strokeWidth={2.5}
              // gold-ink, not on-surface: a black outline read as an error state on the
              // ivory ground. It is dark gold in light mode and soft gold in dark mode.
              className={`pointer-events-none stroke-gold-ink ${fillOf(raised)}`}
            />
          )}
        </svg>

        {/* HTML, not <text>: the SVG is scaled to fit its column, so anything inside
            it would shrink with the map and be unreadable on a phone. */}
        {shapes.map((s) => (
          <span
            key={s.id}
            aria-hidden
            style={at(s.at[0], s.at[1])}
            // The name rises and grows with its piece, so the map answers the pointer
            // as one object instead of a shape moving under a fixed caption.
            className={`pointer-events-none absolute -translate-x-1/2 text-center font-serif leading-none transition-[opacity,translate,scale] duration-200 ease-out motion-reduce:transition-none ${
              raised?.id === s.id ? "z-10 -translate-y-[calc(50%+6px)] scale-[1.22]" : "-translate-y-1/2"
            } ${!labels && !(active == null && spotlight === s.id) ? "opacity-0" : isFaint(s.id) ? "opacity-30" : ""} ${
              isFaint(s.id) ? "text-on-surface" : highlight === s.id ? "text-on-accent" : LEVEL_INK[levelOf(s.id)]
            }`}
          >
            {/* Chinese only: the Latin name fitted in some shapes and not in others,
                which read as an inconsistency. Sans, not the display serif: Songti's
                hairline strokes wash out at this size. */}
            <span lang="zh" className="block whitespace-nowrap font-sans text-[12px] font-medium sm:text-[15px]">{shortZh(s.zh)}</span>
          </span>
        ))}
      </div>

      <figcaption className="text-body-sm text-on-surface-variant">{t("cmap.source")}</figcaption>

      {/* pointer-events-none keeps the tooltip from stealing the hover and making itself flicker. */}
      {tip && pointer && (
        <div
          role="tooltip"
          style={{ left: pointer.left, top: pointer.top, maxWidth: pointer.maxW }}
          className="pointer-events-none fixed z-50 w-max rounded-lg border border-outline-variant bg-surface-container px-3 py-2 shadow-lg"
        >
          <p className="text-body-md leading-tight text-on-background">
            {tip.label} <span lang="zh" className="text-on-surface-variant">{tip.zh}</span>
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {figureOf(tip.id)}
            {tip.within && ` · ${t("coverage.partOf", { parent: byId.get(tip.within)?.label ?? "" })}`}
          </p>
        </div>
      )}
    </figure>
  );
}
