import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MentorshipForm } from "@/components/mentorship-form";
import { getT } from "@/lib/i18n/server";
import { TrendingUp, Map, Users2 } from "lucide-react";

const BENEFITS = [
  {
    icon: TrendingUp,
    titleKey: "career.mentorship.benefit.industry.title",
    descKey: "career.mentorship.benefit.industry.desc",
  },
  {
    icon: Map,
    titleKey: "career.mentorship.benefit.careerMap.title",
    descKey: "career.mentorship.benefit.careerMap.desc",
  },
  {
    icon: Users2,
    titleKey: "career.mentorship.benefit.network.title",
    descKey: "career.mentorship.benefit.network.desc",
  },
] as const;

const STEPS = [
  {
    titleKey: "career.mentorship.step.register.title",
    descKey: "career.mentorship.step.register.desc",
  },
  {
    titleKey: "career.mentorship.step.match.title",
    descKey: "career.mentorship.step.match.desc",
  },
  {
    titleKey: "career.mentorship.step.session.title",
    descKey: "career.mentorship.step.session.desc",
  },
] as const;

export default async function MentorshipPage() {
  const session = await auth();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent("/career/mentorship")}`);

  const { t } = await getT();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div>
            <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
              Alumni Network <span className="text-primary-container">Mentorship</span>
            </h1>
            <p className="text-body-lg text-on-surface-variant">
              {t("career.mentorship.intro")}
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h2 className="text-headline-md text-on-background mb-4">{t("career.mentorship.whyTitle")}</h2>
            <ul className="flex flex-col gap-4">
              {BENEFITS.map(({ icon: Icon, titleKey, descKey }) => (
                <li key={titleKey} className="flex items-start gap-4">
                  <span className="bg-surface-container-low text-primary-container p-2 rounded-full shrink-0">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="text-body-md font-bold text-on-surface">{t(titleKey)}</h3>
                    <p className="text-body-md text-on-surface-variant mt-1">{t(descKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h2 className="text-headline-md text-on-background mb-4">{t("career.mentorship.howTitle")}</h2>
            <ol className="flex flex-col gap-4">
              {STEPS.map(({ titleKey, descKey }, i) => (
                <li key={titleKey} className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="bg-primary-container/10 text-primary-container font-bold text-body-md flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-body-md font-bold text-on-surface">{t(titleKey)}</h3>
                    <p className="text-body-md text-on-surface-variant mt-1">{t(descKey)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-10">
          <div className="mb-8 border-b border-outline-variant pb-6">
            <h2 className="text-headline-lg text-on-background">{t("career.mentorship.formTitle")}</h2>
            <p className="text-body-md text-on-surface-variant mt-2">
              {t("career.mentorship.formDesc")}
            </p>
            <p className="text-label-caps text-on-surface-variant mt-4">
              {t("career.mentorship.formPrivacy")}
            </p>
          </div>
          <MentorshipForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
