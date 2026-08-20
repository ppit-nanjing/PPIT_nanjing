"use client";

import { useMemo, useState } from "react";
import type { CoverageFeature } from "@/app/coverage/page";

// Real administrative boundaries drawn as plain SVG paths - no tile provider,
// same reasoning as the national branch map (see app/organization/map): a tile
// service would be both a licence question and a reachability risk from inside
// mainland China. The GeoJSON is committed under src/data, so nothing is
// fetched at runtime either.
//
// Equirectangular projection: fine at this scale (two provinces), and it keeps
// the maths to two lines instead of pulling in a projection library.

const VIEW = { w: 800, h: 620, pad: 16 };

type Ring = number[][];

function ringsOf(f: CoverageFeature): Ring[] {
  const g = f.geometry;
  if (g.type === "Polygon") return g.coordinates as Ring[];
  return (g.coordinates as number[][][][]).flat() as Ring[];
}

export function CoverageMap({
  features,
  counts,
  ariaLabel = "Peta wilayah",
  hint = "Arahkan kursor atau ketuk sebuah wilayah untuk melihat namanya. Batas wilayah dari data administrasi resmi Tiongkok.",
  unit = "mahasiswa Indonesia",
  emptyUnit = "jumlah mahasiswa belum diisi",
}: {
  features: CoverageFeature[];
  counts: Record<string, number | null>;
  ariaLabel?: string;
  hint?: string;
  unit?: string;
  emptyUnit?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  const { paths, bounds } = useMemo(() => {
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
    // Preserve aspect ratio: without this, Jiangsu comes out visibly stretched.
    const spanLng = maxLng - minLng;
    const spanLat = maxLat - minLat;
    const scale = Math.min((VIEW.w - VIEW.pad * 2) / spanLng, (VIEW.h - VIEW.pad * 2) / spanLat);
    const offX = (VIEW.w - spanLng * scale) / 2;
    const offY = (VIEW.h - spanLat * scale) / 2;
    const project = ([lng, lat]: number[]) => [
      offX + (lng - minLng) * scale,
      // SVG y grows downward; latitude grows upward.
      VIEW.h - offY - (lat - minLat) * scale,
    ];

    const paths = features.map((f) => ({
      id: f.properties.id,
      label: f.properties.label,
      zh: f.properties.zh,
      within: f.properties.within,
      center: project(f.properties.center),
      d: ringsOf(f)
        .map((ring) => "M" + ring.map(project).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z")
        .join(" "),
    }));
    return { paths, bounds: { minLng, maxLng, minLat, maxLat } };
  }, [features]);

  // Jurong sits inside Zhenjiang, so it must be painted after it or it vanishes.
  const ordered = [...paths].sort((a, b) => (a.within ? 1 : 0) - (b.within ? 1 : 0));
  const activeInfo = paths.find((p) => p.id === active);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6">
      <p className="text-body-md text-on-surface-variant mb-4">
        {hint}
      </p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          className="w-full h-auto min-w-[320px]"
          role="img"
          aria-label={ariaLabel}
        >
          {ordered.map((p) => {
            const isActive = active === p.id;
            const n = counts[p.id];
            return (
              <g key={p.id}>
                <path
                  d={p.d}
                  className={`transition-colors ${
                    isActive ? "fill-primary-container" : p.within ? "fill-tertiary-container" : "fill-surface-container-high"
                  } stroke-outline`}
                  strokeWidth={p.within ? 1.6 : 1}
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
              </g>
            );
          })}

          {/* Labels last so no polygon can cover them. */}
          {paths.map((p) => (
            <text
              key={`t-${p.id}`}
              x={p.center[0]}
              y={p.center[1]}
              textAnchor="middle"
              className="fill-on-background pointer-events-none"
              style={{ fontSize: p.within ? 11 : 13, fontWeight: 500 }}
            >
              {p.label}
            </text>
          ))}
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
            {features.length} wilayah · {bounds.minLat.toFixed(1)}&ndash;{bounds.maxLat.toFixed(1)}&deg;LU
          </p>
        )}
      </div>
    </div>
  );
}
