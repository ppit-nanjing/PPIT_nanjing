import type { AnalyticsQuestion } from "@/lib/sensus-analytics";
import { SummaryList } from "@/components/console/summary-list";
import { DonutChart } from "@/components/console/donut-chart";

// One card per sensus question, Google Forms' own "Ringkasan" view is the
// reference: same question order as the form, a chart per question, counts
// always shown as plain text alongside the chart (never color-only).
export function SensusAnalyticsView({ questions }: { questions: AnalyticsQuestion[] }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Panel bantuan: pengurus sering bertanya apa arti "Tidak diisi" di
          ringkasan - ini jawaban kosong karena sensusnya belum selesai
          (progres per langkah tersimpan otomatis), bukan data gagal
          tersimpan. Sekaligus menjelaskan bahwa analitik tidak terpengaruh
          filter tab Daftar + alur tindak lanjutnya. */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-body-sm text-on-surface-variant">
          Ringkasan di tab ini dihitung dari <strong className="text-on-background">semua sensus yang pernah diisi</strong>, termasuk yang belum lengkap — tidak ikut menyempit walau kamu memakai filter di tab Daftar.
        </p>
        <p className="text-body-sm text-on-surface-variant mt-2">
          Label <strong className="text-on-background">“Tidak diisi”</strong> berarti pertanyaannya masih kosong: sensus hanya berstatus <em>lengkap</em> setelah semua pertanyaan wajib diisi dan tombol Kirim ditekan, dan setiap langkah yang sudah dilewati tersimpan otomatis. Jadi ini pengisi yang <strong className="text-on-background">belum menyelesaikan sensusnya</strong> — bukan data yang gagal tersimpan.
        </p>
        <p className="text-body-sm text-on-surface-variant mt-2">
          Mau menindaklanjuti yang belum lengkap? Buka tab <strong className="text-on-background">Daftar</strong>, saring <em>Kelengkapan → Belum lengkap</em>, lalu klik nama pengisinya.
        </p>
      </div>
      {questions.map((q) => (
        <div key={q.key} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="text-headline-sm text-on-background">{q.title}</h3>
            <span className="text-label-caps text-on-surface-variant shrink-0">{q.totalResponses} respons</span>
          </div>
          {q.kind === "donut" ? <DonutChart items={q.items} /> : <SummaryList items={q.items} />}
        </div>
      ))}
    </div>
  );
}
