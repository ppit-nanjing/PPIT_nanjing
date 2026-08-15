import { db } from "@/db";
import { regionalBranches } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MapPin, Map, Users, Phone } from "lucide-react";

const REGION_LABEL: Record<string, string> = {
  north: "North (Utara)",
  east: "East (Timur)",
  south: "South (Selatan)",
  central: "Central (Tengah)",
  west: "West (Barat)",
};

export default async function RegionalBranchesPage() {
  const branches = await db.select().from(regionalBranches);
  const byRegion = branches.reduce<Record<string, typeof branches>>((acc, b) => {
    (acc[b.region] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
          Widespread Connection
        </span>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          Cabang Regional PPI Tiongkok
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl mb-6">
          PPI Tiongkok memiliki cabang aktif di berbagai kota besar di Tiongkok. PPIT Nanjing
          adalah salah satunya, di wilayah Timur.
        </p>
        <a
          href="/organization/map"
          className="inline-flex items-center gap-2 text-label-caps text-primary-container hover:text-primary transition-colors"
        >
          <Map size={16} /> Lihat Peta Persebaran
        </a>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.entries(byRegion).map(([region, list]) => (
          <div key={region} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h2 className="text-headline-md text-on-background mb-4 pb-3 border-b border-outline-variant">
              {REGION_LABEL[region] ?? region}
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map((b) => (
                <li
                  key={b.id}
                  className={`flex flex-col gap-1 px-4 py-3 rounded-md text-body-md ${
                    b.cityName === "Nanjing"
                      ? "bg-primary-container/10 text-primary-container font-semibold"
                      : "bg-surface-container-low text-on-background"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    {b.cityName}
                    {b.cityName === "Nanjing" && <span className="text-label-caps ml-auto">Kamu di sini</span>}
                  </div>
                  {(b.memberCount != null || b.contactInfo) && (
                    <div className="flex flex-col gap-0.5 pl-6 text-label-caps text-on-surface-variant font-normal">
                      {b.memberCount != null && (
                        <span className="flex items-center gap-1.5">
                          <Users size={12} /> ~{b.memberCount} anggota
                        </span>
                      )}
                      {b.contactInfo && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={12} /> {b.contactInfo}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
