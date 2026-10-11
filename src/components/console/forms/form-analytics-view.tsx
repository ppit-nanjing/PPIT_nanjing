import { DonutChart } from "@/components/console/donut-chart";
import { SummaryList } from "@/components/console/summary-list";
import type { FormAnalytics } from "@/lib/form-analytics";
import { FORM_KIND_LABEL, type FormKind } from "@/lib/form-types";

// Ringkasan analitik form (dipakai section "Analitik" di halaman kelola):
// kartu angka + distribusi status/posisi/divisi + ringkas per pertanyaan pilihan.
export function FormAnalyticsView({ analytics, kind }: { analytics: FormAnalytics; kind: FormKind }) {
  const stat = (label: string, value: number) => (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
      <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="text-headline-lg text-on-background">{value}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stat("Total pendaftar", analytics.total)}
        {stat("Diterima", analytics.accepted)}
        {stat("Menunggu", analytics.pending)}
        {stat("Ditolak", analytics.rejected)}
      </div>

      <div>
        <h3 className="text-body-md font-semibold text-on-background mb-3">Per Status</h3>
        <DonutChart items={analytics.statusItems} />
      </div>

      {kind === "oprek_bph_acara" && analytics.positionItems.length > 0 && (
        <div>
          <h3 className="text-body-md font-semibold text-on-background mb-3">Posisi yang Dilamar</h3>
          <SummaryList items={analytics.positionItems} />
        </div>
      )}

      {kind === "oprek_kepanitiaan" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <h3 className="text-body-md font-semibold text-on-background mb-3">Distribusi Pilihan 1</h3>
            <SummaryList items={analytics.choice1Items} />
          </div>
          <div>
            <h3 className="text-body-md font-semibold text-on-background mb-3">Distribusi Pilihan 2</h3>
            <SummaryList items={analytics.choice2Items} />
          </div>
        </div>
      )}

      {analytics.questionItems.length > 0 && (
        <div className="flex flex-col gap-6">
          <h3 className="text-body-md font-semibold text-on-background">Ringkasan Pertanyaan Pilihan</h3>
          {analytics.questionItems.map((q) => (
            <div key={q.label}>
              <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{q.label}</p>
              {q.items.length <= 6 ? <DonutChart items={q.items} /> : <SummaryList items={q.items} />}
            </div>
          ))}
        </div>
      )}

      {analytics.total === 0 && (
        <p className="text-body-md text-on-surface-variant">
          Belum ada jawaban. Analitik muncul setelah pengurus mengisi {FORM_KIND_LABEL[kind].toLowerCase()}.
        </p>
      )}
    </div>
  );
}
