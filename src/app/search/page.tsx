import Link from "next/link";
import { auth } from "@/auth";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { runGlobalSearch, type SearchResult } from "@/lib/global-search";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Lock, Search as SearchIcon, SearchX } from "lucide-react";

const GROUPS: { label: string; type: SearchResult["type"] }[] = [
  // "Kegiatan", not "Events" - every other surface in the app uses the
  // Indonesian label for this section.
  { label: "Kegiatan", type: "event" },
  { label: "Berita", type: "news" },
  { label: "Lowongan", type: "job" },
  { label: "Galeri", type: "gallery" },
  { label: "Inventaris", type: "inventory" },
  { label: "Halaman", type: "page" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  const session = await auth();
  const hasSensus = session?.user?.id ? await hasCompletedSensus(session.user.id) : false;
  const results = q ? await runGlobalSearch(q, hasSensus) : [];
  const byType = GROUPS.map((g) => ({ ...g, items: results.filter((r) => r.type === g.type) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8">
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">Pencarian</h1>
        <form action="/search" method="get" role="search" className="flex items-center gap-3">
          <label htmlFor="global-search" className="sr-only">
            Kata kunci pencarian
          </label>
          <input
            id="global-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Cari kegiatan, berita, lowongan, galeri, inventaris…"
            className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-body-md text-on-background placeholder:text-on-surface-variant outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary-container"
          />
          <button
            type="submit"
            className="bg-primary-container text-on-primary-container rounded-xl px-5 py-3 text-label-caps hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            Cari
          </button>
        </form>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {!q ? (
          <div className="flex flex-col items-center text-center py-20">
            <SearchIcon className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">Mulai mencari</h2>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              Masukkan kata kunci untuk mencari di kegiatan, berita, lowongan, galeri, dan inventaris.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-20">
            <SearchX className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">Tidak ada hasil</h2>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              Tidak ditemukan apa pun untuk &ldquo;{q}&rdquo;. Coba kata kunci yang lebih umum.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <p className="sr-only" aria-live="polite">
              {results.length} hasil ditemukan untuk {q}
            </p>
            {byType.map((group) => (
              <section key={group.type}>
                <h2 className="text-label-caps text-on-surface-variant mb-3">{group.label}</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <li key={`${item.type}:${item.href}`}>
                      <Link
                        href={item.locked ? `/sensus?returnTo=${encodeURIComponent(item.href)}` : item.href}
                        // A locked result silently redirects to the sensus form.
                        // Say so up front instead of surprising the user.
                        aria-label={
                          item.locked
                            ? `${item.title} — lengkapi data sensus dulu untuk membuka`
                            : undefined
                        }
                        className="block bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                      >
                        <span
                          className={`flex items-center gap-1.5 text-body-md truncate ${
                            item.locked ? "text-on-surface-variant" : "text-on-background"
                          }`}
                        >
                          {item.locked && <Lock size={13} className="shrink-0" aria-hidden />}
                          <span className="truncate">{item.title}</span>
                        </span>
                        {item.subtitle && (
                          <span className="block text-label-caps text-on-surface-variant truncate">
                            {item.subtitle}
                          </span>
                        )}
                        {item.locked && (
                          <span className="block text-label-caps text-primary-container mt-0.5">
                            Perlu data sensus
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
