import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { MessageSquare, ArrowRight } from "lucide-react";

export default async function ConsoleDashboardPage() {
  const [{ count: totalFeedback }] = await db.select({ count: sql<number>`count(*)::int` }).from(feedback);
  const [{ count: newFeedback }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedback)
    .where(eq(feedback.status, "new"));
  const recent = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(5);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Dashboard</h1>

      <CollapsibleSection title="Ringkasan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
            <p className="text-display-hero-mobile text-on-background">{totalFeedback}</p>
            <p className="text-label-caps text-on-surface-variant uppercase tracking-widest mt-1">
              Total Masukan
            </p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
            <p className="text-display-hero-mobile text-primary-container">{newFeedback}</p>
            <p className="text-label-caps text-on-surface-variant uppercase tracking-widest mt-1">
              Belum Ditinjau
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Masukan Terbaru" description="5 masukan terbaru dari seluruh halaman.">
        <div className="flex justify-end mb-4">
          <a
            href="/console/feedback"
            className="flex items-center gap-1 text-label-caps text-primary-container hover:text-primary transition-colors"
          >
            Lihat Semua <ArrowRight size={14} />
          </a>
        </div>
        <div className="flex flex-col gap-2">
          {recent.length === 0 && <p className="text-body-md text-on-surface-variant">Belum ada masukan.</p>}
          {recent.map((f) => (
            <a
              key={f.id}
              href="/console/feedback"
              className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 hover:bg-surface-container-low transition-colors"
            >
              <MessageSquare size={16} className="text-secondary shrink-0" />
              <span className="text-body-md text-on-background truncate flex-1">{f.message}</span>
              <span className="text-label-caps text-on-surface-variant shrink-0">
                {new Date(f.createdAt).toLocaleDateString("id-ID")}
              </span>
            </a>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
