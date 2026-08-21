"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { CoverageFeature } from "@/app/coverage/page";

// Real administrative boundaries drawn as plain SVG paths - no tile provider,
// same reasoning as the national branch map (see app/organization/map): a tile
// service would be both a licence question and a reachability risk from inside
// mainland China. The GeoJSON is committed under src/data, so nothing is
// fetched at runtime either.

const WIDTH = 800;
const PAD = 16;
// Rough advance width per character for the UI sans at a given font size. Only
// needs to be close enough to detect collisions, not to lay out text.
const CHAR_W = 0.58;
// Must match the tooltip's own max width, or the flip lands it half off-screen.
const TIP_W = 240;
const TIP_H = 100;
const EDGE = 8;

type Ring = number[][];

function ringsOf(f: CoverageFeature): Ring[] {
  const g = f.geometry;
  if (g.type === "Polygon") return g.coordinates as Ring[];
  return (g.coordinates as number[][][][]).flat() as Ring[];
}

/** Shoelace area, used only to rank which label wins a collision. */
function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/** Strip accents/case so "Huai'an" matches "huaian" and "Ma’anshan" matches "maanshan". */
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’\-\s]/g, "");

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

export function CoverageMap({
  features,
  counts,
  ariaLabel = "Peta wilayah",
  hint = "Cari, arahkan kursor, atau ketuk sebuah wilayah. Batas wilayah dari data administrasi resmi Tiongkok.",
  unit = "mahasiswa Indonesia",
  emptyUnit = "jumlah mahasiswa belum diisi",
  searchLabel = "Cari wilayah",
}: {
  features: CoverageFeature[];
  counts: Record<string, number | null>;
  ariaLabel?: string;
  hint?: string;
  unit?: string;
  emptyUnit?: string;
  searchLabel?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Viewport coordinates, because the tooltip is position:fixed. Anchoring it to
  // the map container instead looked fine until the map sat in a 416px grid
  // column: the tooltip was squeezed to ~139px, wrapped to 186px tall and spilled
  // off-screen. Fixed also escapes the container's overflow-x clipping.
  const [pointer, setPointer] = useState<{ left: number; top: number; maxW: number } | null>(null);

  const { paths, height, labelled } = useMemo(() => {
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
    const fontSize = 13 * (h / 620);

    const project = ([lng, lat]: number[]) => [
      PAD + (lng - minLng) * cosLat * scale,
      // SVG y grows downward; latitude grows upward.
      h - PAD - (lat - minLat) * scale,
    ];

    const paths = features.map((f) => {
      const rings = ringsOf(f);
      const projected = rings.map((r) => r.map(project));
      return {
        id: f.properties.id,
        label: f.properties.label,
        zh: f.properties.zh,
        within: f.properties.within,
        center: project(f.properties.center),
        area: projected.reduce((s, r) => s + ringArea(r), 0),
        d: projected
          .map((ring) => "M" + ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z")
          .join(" "),
      };
    });

    // Which labels can be drawn without colliding. The previous rule only asked
    // whether a name fit inside its own polygon, which is the wrong question:
    // Xuanwu, Qinhuai and Jianye each passed that test while sitting 5-47 units
    // apart, so their labels still landed on top of each other. Place biggest
    // first and drop any label whose box hits one already placed - the dense
    // urban core then falls back to dots and is named by the tooltip.
    const placed: Box[] = [];
    const labelled = new Set<string>();
    for (const p of [...paths].sort((a, b) => b.area - a.area)) {
      const w = p.label.length * fontSize * CHAR_W;
      const box: Box = {
        x1: p.center[0] - w / 2,
        y1: p.center[1] - fontSize * 0.75,
        x2: p.center[0] + w / 2,
        y2: p.center[1] + fontSize * 0.35,
      };
      if (placed.some((q) => overlaps(box, q))) continue;
      placed.push(box);
      labelled.add(p.id);
    }

    return { paths, height: h, labelled, fontSize };
  }, [features]);

  const fontSize = 13 * (height / 620);

  const q = norm(query.trim());
  const matches = q ? paths.filter((p) => norm(p.label).includes(q) || p.zh.includes(query.trim())) : [];
  const matchIds = new Set(matches.map((m) => m.id));
  const highlighted = q ? matchIds : null;

  // Jurong sits inside Zhenjiang, so it must be painted after it or it vanishes.
  const ordered = [...paths].sort((a, b) => (a.within ? 1 : 0) - (b.within ? 1 : 0));
  const activeInfo = paths.find((p) => p.id === active) ?? (matches.length === 1 ? matches[0] : undefined);

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

  const tipStyle: React.CSSProperties | undefined = pointer
    ? { left: pointer.left, top: pointer.top, maxWidth: pointer.maxW }
    : undefined;

  const tipFor = activeInfo;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6">
      <p className="text-body-md text-on-surface-variant mb-4">{hint}</p>

      <div className="flex items-center gap-2 bg-soft-gray rounded-md px-3 mb-4 max-w-sm">
        <Search size={16} className="text-on-surface-variant shrink-0" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
          className="flex-1 bg-transparent py-2.5 text-body-md text-on-background focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Hapus pencarian"
            className="text-on-surface-variant hover:text-on-background p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {q && (
        <p aria-live="polite" className="text-label-caps text-on-surface-variant mb-3">
          {matches.length === 0
            ? "Tidak ada wilayah yang cocok."
            : `${matches.length} cocok: ${matches.map((m) => m.label).join(", ")}`}
        </p>
      )}

      <div className="relative overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-auto max-w-full min-w-[300px] max-h-[78vh]"
          role="img"
          aria-label={ariaLabel}
          onMouseLeave={() => setPointer(null)}
        >
          {ordered.map((p) => {
            const isActive = active === p.id;
            const isMatch = highlighted?.has(p.id) ?? false;
            const dimmed = highlighted != null && !isMatch;
            const n = counts[p.id];
            return (
              <path
                key={p.id}
                d={p.d}
                className={`transition-colors ${
                  isActive || isMatch
                    ? "fill-primary-container"
                    : p.within
                      ? "fill-tertiary-container"
                      : "fill-surface-container-high"
                } stroke-outline`}
                strokeWidth={p.within ? 1.6 : 1}
                opacity={dimmed ? 0.35 : 1}
                onMouseEnter={(e) => { setActive(p.id); track(e); }}
                onMouseMove={track}
                onMouseLeave={() => setActive(null)}
                // Touch has no hover, so the tap itself has to place the tooltip.
                onClick={(e) => { setActive(isActive ? null : p.id); track(e); }}
                tabIndex={0}
                onFocus={() => setActive(p.id)}
                onBlur={() => setActive(null)}
                role="button"
                aria-label={`${p.label}${n != null ? `, ${n} ${unit}` : ""}`}
                style={{ cursor: "pointer", outline: "none" }}
              />
            );
          })}

          {/* Only non-colliding labels are drawn. Everything else gets a dot and
              is named by the tooltip, the search box, or the list beside the map. */}
          {paths.map((p) => {
            const dimmed = highlighted != null && !highlighted.has(p.id);
            const isOn = active === p.id || (highlighted?.has(p.id) ?? false);
            if (!labelled.has(p.id)) {
              return (
                <circle
                  key={`d-${p.id}`}
                  cx={p.center[0]}
                  cy={p.center[1]}
                  r={(isOn ? 5 : 3.5) * (height / 620)}
                  className="fill-on-background pointer-events-none"
                  opacity={dimmed ? 0.3 : 0.85}
                />
              );
            }
            return (
              <text
                key={`t-${p.id}`}
                x={p.center[0]}
                y={p.center[1]}
                textAnchor="middle"
                className="fill-on-background pointer-events-none"
                opacity={dimmed ? 0.35 : 1}
                style={{ fontSize: p.within ? fontSize * 0.85 : fontSize, fontWeight: 500 }}
              >
                {p.label}
              </text>
            );
          })}
        </svg>

        {/* HTML, not <text>: the SVG is scaled to fit the viewport, so anything
            inside it would scale with the map. pointer-events-none keeps the
            tooltip from stealing the hover and making itself flicker. */}
        {tipFor && pointer && (
          <div
            role="tooltip"
            style={tipStyle}
            className="pointer-events-none fixed z-50 w-max rounded-lg border border-outline-variant bg-surface-container shadow-lg px-3 py-2"
          >
            <p className="text-body-md text-on-background leading-tight">
              {tipFor.label} <span className="text-on-surface-variant">{tipFor.zh}</span>
            </p>
            <p className="text-label-caps text-on-surface-variant mt-0.5">
              {counts[tipFor.id] != null ? `${counts[tipFor.id]} ${unit}` : emptyUnit}
            </p>
          </div>
        )}
      </div>

      {/* A visible readout, because colour alone must not carry the information,
          and because touch users may not keep the tooltip open. */}
      <div className="mt-4 min-h-[3rem] border-t border-outline-variant pt-4">
        {activeInfo ? (
          <p aria-live="polite" className="text-body-md text-on-background">
            <strong>{activeInfo.label}</strong> <span className="text-on-surface-variant">{activeInfo.zh}</span>
            {" — "}
            {counts[activeInfo.id] != null ? `${counts[activeInfo.id]} ${unit}` : emptyUnit}
            {activeInfo.within && (
              <span className="text-on-surface-variant">
                {" "}
                · bagian dari {paths.find((x) => x.id === activeInfo.within)?.label}
              </span>
            )}
          </p>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            {features.length} wilayah · titik kecil = wilayah yang terlalu berdempetan untuk diberi nama
          </p>
        )}
      </div>
    </div>
  );
}
