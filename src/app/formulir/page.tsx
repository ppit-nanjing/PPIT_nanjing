import { ClipboardList, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { SurveyCreate } from "@/components/survey/survey-create";
import { SURVEY_STATE_LABEL, surveyOpenState, type SurveyOpenState } from "@/lib/survey";
import { listManageableSurveys, listSurveyEvents, requireSurveyHub } from "@/lib/survey-access";

const STATE_TONE: Record<SurveyOpenState, string> = {
  open: "bg-primary-container/15 text-primary-container",
  closed: "bg-surface-container-low text-on-surface-variant",
  not_yet: "bg-gold-ink/15 text-gold-ink",
  ended: "bg-surface-container-low text-on-surface-variant",
};

export default async function FormulirHubPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sa = await requireSurveyHub();
  const { error } = await searchParams;
  const [surveys, events] = await Promise.all([listManageableSurveys(sa), listSurveyEvents(sa)]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-headline-lg text-on-background mb-2">Formulir Kustom</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Buat formulir sendiri ala Google Forms, dengan judul dan pertanyaan bebas: riset pasar, kuesioner, atau
          pengumpulan masukan. Hasilnya tampil sebagai grafik dan tabel, bisa dibuka di Google Sheets, dan diunduh
          sebagai CSV atau Excel (jam Tiongkok, CST). Hanya pengurus kabinet dan panitia acara yang bisa membuatnya;
          hasilnya dilihat pembuat, BPH Panitia acara terikatnya, dan admin.
        </p>
      </header>

      <SurveyCreate events={events} canCreateUnbound={sa.canCreateUnbound} error={error} />

      <section aria-labelledby="formulir-saya">
        <h2 id="formulir-saya" className="text-headline-md text-on-background mb-4">
          {sa.access.isFull || sa.access.canForms ? "Semua formulir" : "Formulir yang bisa kamu kelola"}
        </h2>
        {surveys.length === 0 ? (
          <p className="text-body-md text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            Belum ada formulir. Buat yang pertama di atas.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {surveys.map((s) => {
              const state = surveyOpenState(s);
              return (
                <li key={s.id}>
                  <Link
                    href={`/formulir/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl px-5 py-4 hover:bg-surface-container-low/60 transition-colors"
                  >
                    <span className="flex items-start gap-3 min-w-0">
                      <ClipboardList size={20} className="shrink-0 mt-1 text-primary-container" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-body-lg text-on-background truncate">{s.title}</span>
                        <span className="block text-body-sm text-on-surface-variant truncate">
                          {s.eventTitle ?? "Khusus kabinet"}
                          {!s.createdByMe && " · dibuat orang lain"}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span
                        className="inline-flex items-center gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant"
                        title={s.allowPublic ? "Boleh diisi tanpa login" : "Wajib login"}
                      >
                        {s.allowPublic ? <Globe size={14} aria-hidden /> : <Lock size={14} aria-hidden />}
                        {s.allowPublic ? "Publik" : "Login"}
                      </span>
                      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                        {s.responseCount} jawaban
                      </span>
                      <span className={`text-label-caps uppercase tracking-wide px-2 py-1 rounded ${STATE_TONE[state]}`}>
                        {SURVEY_STATE_LABEL[state]}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
