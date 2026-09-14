import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { coverageCities, sensusProfiles, universities } from "@/db/schema";
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
  // Cabang di sini SENGAJA memakai coverageCities (9 kota naungan PPIT
  // Nanjing) + universities (direktori kampus per kota), bukan
  // regionalBranches/branchUniversities (skema nasional PPI Tiongkok, ~32
  // cabang). Yang nasional itu ternyata cuma punya "Nanjing" untuk seluruh
  // wilayah ini - 8 kota lain (Xuzhou, Jurong, dst.) tidak ada padanan cabang
  // pusatnya sendiri, jadi member di luar kota Nanjing tidak punya opsi kota
  // aslinya sama sekali di dropdown lama. Siapa pun yang mengisi sensus INI
  // sudah pasti anggota PPIT Nanjing (chapter lain punya sensus sendiri-
  // sendiri), jadi granularitas 9-kota justru yang relevan di sini.
  const rows = await db
    .select({
      cityName: coverageCities.label,
      universityName: universities.name,
      orderIndex: universities.orderIndex,
    })
    .from(coverageCities)
    .leftJoin(universities, and(eq(universities.city, coverageCities.label), eq(universities.published, true)))
    .orderBy(asc(coverageCities.label), asc(universities.orderIndex));

  const universitiesByBranch: Record<string, string[]> = {};
  for (const row of rows) {
    // leftJoin: cabang tanpa kampus terdaftar tetap muncul (dengan daftar
    // kosong) supaya masih bisa dipilih — pengisinya lalu memakai "Lainnya".
    universitiesByBranch[row.cityName] ??= [];
    if (row.universityName) universitiesByBranch[row.cityName].push(row.universityName);
  }
  const branches = Object.keys(universitiesByBranch).sort((a, b) => a.localeCompare(b));
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
          universitiesByBranch={universitiesByBranch}
          initial={{
            fullName: existing?.fullName ?? "",
            mandarinName: existing?.mandarinName ?? "",
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
            mediumOfInstruction: existing?.mediumOfInstruction ?? "",
            mandarinAbility: existing?.mandarinAbility ?? "",
            fundingSource: existing?.fundingSource ?? "",
            entryYear: existing?.entryYear ? String(existing.entryYear) : "",
            graduationYear: existing?.graduationYear ? String(existing.graduationYear) : "",
            activeEmail: existing?.activeEmail ?? "",
            wechatId: existing?.wechatId ?? "",
            phoneActive: existing?.phoneActive ?? "",
            whatsappNumber: existing?.whatsappNumber ?? "",
            emergencyContact: existing?.emergencyContact ?? "",
            chinaAddress: existing?.chinaAddress ?? "",
            studentCardUrl: existing?.studentCardUrl ?? "",
            agreeTerms: existing?.agreeTerms ?? false,
            subscribeNewsletter: existing?.subscribeNewsletter ?? false,
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
