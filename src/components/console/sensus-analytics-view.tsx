import type { AnalyticsQuestion } from "@/lib/sensus-analytics";
import { SummaryList } from "@/components/console/summary-list";
import { DonutChart } from "@/components/console/donut-chart";

// One card per sensus question, Google Forms' own "Ringkasan" view is the
// reference: same question order as the form, a chart per question, counts
// always shown as plain text alongside the chart (never color-only).
export function SensusAnalyticsView({ questions }: { questions: AnalyticsQuestion[] }) {
  return (
    <div className="flex flex-col gap-4">
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
