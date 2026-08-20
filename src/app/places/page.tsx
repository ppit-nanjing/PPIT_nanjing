import { asc, eq, and } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import { MapPin, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { places } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const CATEGORY_LABEL: Record<string, string> = {
  tourism: "Wisata",
  spiritual: "Ibadah",
  practical: "Kebutuhan Sehari-hari",
};

const FILTERS = [
  { id: "", label: "Semua" },
  { id: "tourism", label: CATEGORY_LABEL.tourism },
  { id: "spiritual", label: CATEGORY_LABEL.spiritual },
  { id: "practical", label: CATEGORY_LABEL.practical },
];

export const metadata = {
  title: "Tempat di Nanjing - PPIT Nanjing",
  description: "Tempat wisata, rumah ibadah, dan lokasi penting di Nanjing untuk mahasiswa Indonesia.",
};

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const valid = kategori && kategori in CATEGORY_LABEL ? kategori : undefined;

  const rows = await db
    .select()
    .from(places)
    .where(
      valid
        ? and(eq(places.published, true), eq(places.category, valid as "tourism"))
        : eq(places.published, true),
    )
    .orderBy(asc(places.orderIndex), asc(places.name));

  const districts = [...new Set(rows.map((p) => p.district).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">Jelajahi</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          Tempat di Nanjing
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
          {rows.length > 0
            ? `${rows.length} tempat pilihan${districts.length ? ` di ${districts.length} distrik` : ""} — dari situs bersejarah sampai rumah ibadah, masing-masing dengan sedikit konteks.`
            : "Daftar tempat pilihan di Nanjing untuk mahasiswa Indonesia."}
        </p>

        <nav aria-label="Saring menurut kategori" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (valid ?? "") === f.id;
            return (
              <Link
                key={f.id || "all"}
                href={f.id ? `/places?kategori=${f.id}` : "/places"}
                aria-current={active ? "page" : undefined}
                className={`text-label-caps uppercase tracking-wide px-4 py-2 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "border-primary-container bg-primary-container text-on-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {rows.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <MapPin className="mx-auto mb-4 text-on-surface-variant" size={28} />
            <p className="text-body-lg text-on-background mb-1">Belum ada tempat yang ditampilkan</p>
            <p className="text-body-md text-on-surface-variant">
              Pengurus bisa menambahkannya lewat Console &rarr; Tempat.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((p) => (
              <li
                key={p.id}
                className="flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"
              >
                {p.imageUrl && (
                  <div className="relative w-full aspect-[4/3] bg-surface-container">
                    <Image src={p.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                  </div>
                )}
                <div className="flex flex-col gap-2 p-5 flex-1">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                    {CATEGORY_LABEL[p.category]}
                    {p.district ? ` · ${p.district}` : ""}
                  </span>
                  <h2 className="text-headline-sm text-on-background">
                    {p.name}
                    {p.nameZh && <span className="text-body-md text-on-surface-variant"> {p.nameZh}</span>}
                  </h2>
                  {p.description && <p className="text-body-md text-on-surface-variant flex-1">{p.description}</p>}
                  {p.address && (
                    <p className="text-body-sm text-on-surface-variant flex items-start gap-1.5">
                      <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                      <span>
                        {p.address}
                        {p.addressZh && <span className="block">{p.addressZh}</span>}
                      </span>
                    </p>
                  )}
                  {p.mapUrl && (
                    <a
                      href={p.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                    >
                      Buka peta <ExternalLink size={13} aria-hidden />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
