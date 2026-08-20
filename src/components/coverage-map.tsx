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
// A polygon narrower than this share of the map cannot hold its own name, so it
// gets a dot instead and is identified through search, hover, or the list below.
// Expressed as a fraction because the SVG is scaled to fit the viewport, so an
// absolute pixel threshold would mean different things on different screens.
const MIN_LABEL_SHARE = 0.11;

type Ring = number[][];

function ringsOf(f: CoverageFeature): Ring[] {
  const g = f.geometry;
  if (g.type === "Polygon") return g.coordinates as Ring[];
  return (g.coordinates as number[][][][]).flat() as Ring[];
}

/** Strip accents/case so "Huai'an" matches "huaian" and "Ma’anshan" matches "maanshan". */
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’\-\s]/g, "");

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

  const { paths, height } = useMemo(() => {
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

    const paths = features.map((f) => {
      const rings = ringsOf(f);
      let wMin = Infinity, wMax = -Infinity;
      for (const r of rings) for (const [lng] of r) { if (lng < wMin) wMin = lng; if (lng > wMax) wMax = lng; }
      return {
        id: f.properties.id,
        label: f.properties.label,
        zh: f.properties.zh,
        within: f.properties.within,
        center: project(f.properties.center),
        widthShare: ((wMax - wMin) * cosLat * scale) / (WIDTH - PAD * 2),
        d: rings
          .map((ring) => "M" + ring.map(project).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z")
          .join(" "),
      };
    });
    return { paths, height: h };
  }, [features]);

  const q = norm(query.trim());
  const matches = q ? paths.filter((p) => norm(p.label).includes(q) || p.zh.includes(query.trim())) : [];
  const matchIds = new Set(matches.map((m) => m.id));
  const highlighted = q ? matchIds : null;

  // Jurong sits inside Zhenjiang, so it must be painted after it or it vanishes.
  const ordered = [...paths].sort((a, b) => (a.within ? 1 : 0) - (b.within ? 1 : 0));
  const activeInfo = paths.find((p) => p.id === active) ?? (matches.length === 1 ? matches[0] : undefined);

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

      <div className="overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-auto max-w-full min-w-[300px] max-h-[78vh]"
          role="img"
          aria-label={ariaLabel}
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
                onMouseEnter={() => setActive(p.id)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(isActive ? null : p.id)}
                tabIndex={0}
                onFocus={() => setActive(p.id)}
                onBlur={() => setActive(null)}
                role="button"
                aria-label={`${p.label}${n != null ? `, ${n} ${unit}` : ""}`}
                style={{ cursor: "pointer", outline: "none" }}
              />
            );
          })}

          {/* Labels last so no polygon can cover them. Districts too narrow to
              hold their name get a dot; the search box and the list name them. */}
          {paths.map((p) => {
            const fits = p.widthShare >= MIN_LABEL_SHARE;
            const dimmed = highlighted != null && !highlighted.has(p.id);
            if (!fits) {
              return (
                <circle
                  key={`d-${p.id}`}
                  cx={p.center[0]}
                  cy={p.center[1]}
                  r={(active === p.id || highlighted?.has(p.id) ? 5 : 3.5) * (height / 620)}
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
                style={{ fontSize: (p.within ? 11 : 13) * (height / 620), fontWeight: 500 }}
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* A visible readout, because colour alone must not carry the information. */}
      <div className="mt-4 min-h-[3rem] border-t border-outline-variant pt-4">
        {activeInfo ? (
          <p className="text-body-md text-on-background">
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
            {features.length} wilayah · titik kecil = wilayah yang terlalu sempit untuk diberi nama di peta
          </p>
        )}
      </div>
    </div>
  );
}
