import Link from "next/link";
import { auth } from "@/auth";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { runGlobalSearch, type SearchResult } from "@/lib/global-search";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const GROUPS: { label: string; type: SearchResult["type"] }[] = [
  { label: "Events", type: "event" },
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
        <form action="/search" method="get" className="flex items-center gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari event, berita, lowongan, galeri, inventaris…"
            className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-body-md text-on-background placeholder:text-on-surface-variant outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="bg-primary-container text-on-primary-container rounded-xl px-5 py-3 text-label-caps hover:opacity-90 transition-opacity"
          >
            Cari
          </button>
        </form>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {!q ? (
          <p className="text-body-md text-on-surface-variant">Masukkan kata kunci untuk mulai mencari.</p>
        ) : results.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Tidak ada hasil untuk &ldquo;{q}&rdquo;.</p>
        ) : (
          <div className="flex flex-col gap-10">
            {byType.map((group) => (
              <section key={group.type}>
                <h2 className="text-label-caps text-on-surface-variant mb-3">{group.label}</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <li key={`${item.type}:${item.href}`}>
                      <Link
                        href={item.locked ? `/sensus?returnTo=${encodeURIComponent(item.href)}` : item.href}
                        className="block bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 hover:border-primary transition-colors"
                      >
                        <span
                          className={`block text-body-md truncate ${
                            item.locked ? "text-on-surface-variant" : "text-on-background"
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="block text-label-caps text-on-surface-variant truncate">
                            {item.subtitle}
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
