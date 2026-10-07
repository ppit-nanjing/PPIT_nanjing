import type { Metadata } from "next";
import { PublicFormPage } from "@/components/forms/public-form-page";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("forms.participantMetaTitle") };
}

export default function ParticipantEvaluationPage() {
  return <PublicFormPage slug="evaluation-participant" kicker="forms.participantKicker" />;
}
