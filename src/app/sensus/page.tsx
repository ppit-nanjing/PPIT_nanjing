import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { regionalBranches, sensusProfiles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SensusWizard } from "@/components/sensus/sensus-wizard";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function SensusPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent("/sensus")}`);

  const [existing] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, session.user.id));
  const branches = (await db.select({ cityName: regionalBranches.cityName }).from(regionalBranches))
    .map((b) => b.cityName)
    .sort((a, b) => a.localeCompare(b));
  const { t } = await getT();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">{t("sensus.title")}</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          {existing
            ? t("sensus.subtitleEdit")
            : t("sensus.subtitleNew")}
        </p>

        {existing?.completionStatus !== "complete" && (
          <div className="flex items-start gap-3 bg-error-container/40 border-l-4 border-error rounded-r-lg p-4 mb-8">
            <AlertTriangle className="text-error shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-body-md font-semibold text-on-background">{t("sensus.attention")}</p>
              <p className="text-body-md text-on-surface-variant mt-1">
                {returnTo
                  ? t("sensus.attentionReturnTo")
                  : existing
                    ? t("sensus.attentionIncomplete")
                    : t("sensus.attentionNew")}
              </p>
            </div>
          </div>
        )}
        {existing?.completionStatus === "complete" && (
          <div className="flex items-start gap-3 bg-primary-container/10 border border-primary-container/20 rounded-lg p-4 mb-8">
            <ShieldCheck className="text-primary-container shrink-0 mt-0.5" size={18} />
            <p className="text-body-md text-on-background">{t("sensus.completeNote")}</p>
          </div>
        )}

        <SensusWizard
          returnTo={returnTo}
          branchOptions={branches}
          initial={{
            fullName: existing?.fullName ?? "",
            passportNumber: existing?.passportNumber ?? "",
            gender: existing?.gender ?? "",
            passportExpiry: existing?.passportExpiry ?? "",
            province: existing?.province ?? "",
            birthDate: existing?.birthDate ?? "",
            branch: existing?.branch ?? "",
            studentStatus: existing?.studentStatus ?? "",
            university: existing?.university ?? "",
            degreeLevel: existing?.degreeLevel ?? "",
            major: existing?.major ?? "",
            fundingSource: existing?.fundingSource ?? "",
            entryYear: existing?.entryYear ? String(existing.entryYear) : "",
            graduationYear: existing?.graduationYear ? String(existing.graduationYear) : "",
            wechatId: existing?.wechatId ?? "",
            phoneActive: existing?.phoneActive ?? "",
            whatsappNumber: existing?.whatsappNumber ?? "",
            studentCardUrl: existing?.studentCardUrl ?? "",
            agreeTerms: existing?.agreeTerms ?? false,
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
