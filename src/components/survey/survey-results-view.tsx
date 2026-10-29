import { DonutChart } from "@/components/console/donut-chart";
import { SummaryList } from "@/components/console/summary-list";
import type { QuestionResult } from "@/lib/survey";

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

// Ringkasan hasil per pertanyaan ala Google Forms: pilihan sebagai diagram
// (donut untuk sedikit opsi, batang untuk banyak), skala dengan rata-rata,
// angka dengan rata-rata/terendah/tertinggi, dan teks bebas sebagai daftar.
// Semua dihitung di server dari jawaban yang SUDAH boleh dilihat pembacanya.
export function SurveyResultsView({ results, total }: { results: QuestionResult[]; total: number }) {
  if (total === 0) {
    return (
      <p className="text-body-md text-on-surface-variant">
        Belum ada jawaban. Ringkasan muncul setelah ada yang mengisi.
      </p>
    );
  }
  if (results.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Formulir ini belum punya pertanyaan.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {results.map((r, i) => (
        <article
          key={r.key}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6"
        >
          <header className="mb-4">
            <h3 className="text-body-lg text-on-background">
              <span className="text-on-surface-variant">{i + 1}. </span>
              {r.label}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              {r.answered} dari {total} menjawab
            </p>
          </header>
          <Body result={r} />
        </article>
      ))}
    </div>
  );
}

function Body({ result: r }: { result: QuestionResult }) {
  if (r.answered === 0) return <p className="text-body-md text-on-surface-variant">Belum ada yang menjawab.</p>;

  switch (r.kind) {
    case "choice":
      return r.items.length <= 6 ? <DonutChart items={r.items} /> : <SummaryList items={r.items} />;

    case "scale":
      return (
        <div className="flex flex-col gap-4">
          <p className="text-headline-lg text-on-background">
            {r.average == null ? "—" : nf.format(r.average)}
            <span className="text-body-md text-on-surface-variant"> rata-rata</span>
          </p>
          <SummaryList items={r.items} />
        </div>
      );

    case "number":
      return (
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Rata-rata" value={r.average} />
          <Stat label="Terendah" value={r.min} />
          <Stat label="Tertinggi" value={r.max} />
        </dl>
      );

    case "text":
      return (
        <div>
          <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {r.samples.map((text, idx) => (
              // Teks jawaban pengisi: dirender sebagai teks biasa, tidak pernah jadi tautan atau HTML.
              <li key={idx} className="bg-soft-gray rounded-md px-3 py-2 text-body-md text-on-background whitespace-pre-wrap break-words">
                {text}
              </li>
            ))}
          </ul>
          {r.hasMore && (
            <p className="text-body-sm text-on-surface-variant mt-2">
              Menampilkan {r.samples.length} jawaban terbaru. Semuanya ada di tab tabel dan berkas unduhan.
            </p>
          )}
        </div>
      );

    case "grid":
      return (
        <div className="flex flex-col gap-5">
          {r.rows.map((row) => (
            <div key={row.label}>
              <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{row.label}</p>
              <SummaryList items={row.items} />
            </div>
          ))}
        </div>
      );
  }
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-soft-gray rounded-md px-3 py-3">
      <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="text-headline-md text-on-background">{value == null ? "—" : nf.format(value)}</dd>
    </div>
  );
}
