import { db } from "@/db";
import { regionalBranches } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MapPin } from "lucide-react";

// Simple equirectangular projection over China's approximate bounding box
// (lat 18-53N, lng 73-135E) - not a licensed map tile provider (Google
// Maps/Mapbox are both foreign-hosted, same reachability concern as Google
// Fonts documented in docs/Tech Stack.md), just real lat/lng plotted onto an
// SVG. Schematic, not cartographically precise - good enough to show
// relative distribution of branches across the country.
const BOUNDS = { minLat: 18, maxLat: 53, minLng: 73, maxLng: 135 };
const VIEW = { width: 800, height: 600 };

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * VIEW.width;
  const y = VIEW.height - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW.height;
  return { x, y };
}

export default async function DistributionMapPage() {
  const branches = await db.select().from(regionalBranches);
  const plottable = branches.filter((b) => b.lat != null && b.lng != null);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
          Widespread Connection
        </span>
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">
          Peta Persebaran PPI Tiongkok
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Sebaran cabang PPI Tiongkok di seluruh negeri. Peta skematik berdasarkan koordinat kota
          asli, bukan peta kartografis presisi tinggi.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {plottable.length === 0 ? (
          <p className="text-body-md text-on-surface-variant text-center py-24">
            Belum ada cabang dengan koordinat terdaftar.
          </p>
        ) : (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 md:p-10">
            <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="w-full h-auto" role="img" aria-label="Peta persebaran cabang">
              <rect x={0} y={0} width={VIEW.width} height={VIEW.height} rx={16} fill="var(--color-surface-container-lowest)" />
              {/* light reference grid, not a real coastline - kept honest, no fabricated map outline */}
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={`v${f}`}
                  x1={VIEW.width * f}
                  y1={0}
                  x2={VIEW.width * f}
                  y2={VIEW.height}
                  stroke="var(--color-outline-variant)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
              ))}
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={`h${f}`}
                  x1={0}
                  y1={VIEW.height * f}
                  x2={VIEW.width}
                  y2={VIEW.height * f}
                  stroke="var(--color-outline-variant)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
              ))}
              {plottable.map((b) => {
                const { x, y } = project(b.lat!, b.lng!);
                const isNanjing = b.cityName === "Nanjing";
                return (
                  <g key={b.id}>
                    <circle cx={x} cy={y} r={isNanjing ? 10 : 7} fill={isNanjing ? "var(--color-primary-container)" : "var(--color-primary)"} opacity={isNanjing ? 1 : 0.75} />
                    {isNanjing && <circle cx={x} cy={y} r={16} fill="var(--color-primary-container)" opacity={0.2} />}
                    <text x={x} y={y - 14} textAnchor="middle" fontSize={13} fontWeight={isNanjing ? 700 : 500} fill="var(--color-on-background)">
                      {b.cityName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {branches.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-2 px-4 py-3 rounded-md text-body-md ${
                b.cityName === "Nanjing"
                  ? "bg-primary-container/10 text-primary-container font-semibold"
                  : "bg-surface-container-low text-on-background"
              }`}
            >
              <MapPin size={16} />
              {b.cityName}
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
