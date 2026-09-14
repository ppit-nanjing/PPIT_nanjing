import { eq } from "drizzle-orm";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sensusProfiles } from "@/db/schema";
import { RANTINGS, rantingCodeFromUniversity } from "@/lib/rantings";

export default async function SensusSuccessPage() {
  const { t } = await getT();

  // Ranting (INA/JIA) punya grup WeChat kampus sendiri, di luar grup utama
  // PPIT Nanjing di bawah - ditentukan dari `university` yang baru saja
  // disimpan, bukan dari role admin (setiap mahasiswa ranting, bukan cuma
  // pengurusnya, perlu tahu ini).
  const session = await auth();
  let ranting: (typeof RANTINGS)[keyof typeof RANTINGS] | null = null;
  if (session?.user?.id) {
    const [profile] = await db
      .select({ university: sensusProfiles.university })
      .from(sensusProfiles)
      .where(eq(sensusProfiles.userId, session.user.id));
    const code = rantingCodeFromUniversity(profile?.university);
    if (code) ranting = RANTINGS[code];
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      {/* Wider when a ranting WeChat card joins the main one side-by-side -
          max-w-md (the common case, no ranting) stays exactly as before. */}
      <main
        className={`${
          ranting ? "max-w-2xl" : "max-w-md"
        } mx-auto px-[var(--spacing-container-padding)] py-16 text-center`}
      >
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} />
        </div>
        <h1
          tabIndex={-1}
          autoFocus
          className="text-headline-lg text-on-background mb-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded-sm"
        >
          {t("sensus.successTitle")}
        </h1>
        <div role="status" className="text-body-md text-on-surface-variant mb-8">
          {t("sensus.successNote")}
        </div>

        {/* Langkah terakhir sensus: gabung grup WeChat PPIT Nanjing. Menggantikan
            kewajiban unggah screenshot follow Instagram - sekarang cukup diarahkan
            ke sini setelah selesai. Mahasiswa ranting (INA/JIA) juga punya grup
            kampus sendiri di luar grup utama ini - kartunya tampil berdampingan
            (grid, bukan ditumpuk) ketika ranting terdeteksi dari kampus yang
            baru saja disimpan. */}
        <div className={`mb-10 grid gap-4 ${ranting ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col items-center gap-3">
            <h2 className="text-headline-sm text-on-background">{t("sensus.wechatJoinTitle")}</h2>
            {/* QR: <img> biasa, bukan next/image - kode QR butuh piksel tajam tanpa
                re-encode, dan berkasnya statis di /public. Tampil apa adanya
                (screenshot kartu WeChat: logo + QR + "scan to add"), jadi biarkan
                rasio aslinya. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wechat-ppit-nanjing.png"
              alt={t("sensus.wechatJoinTitle")}
              width={592}
              height={794}
              className="w-full max-w-[260px] h-auto rounded-lg border border-outline-variant bg-white p-2"
            />
            <p className="text-body-sm text-on-surface-variant">
              {t("sensus.wechatIdLabel")}:{" "}
              <span className="font-medium text-on-background select-all">ppitnanjing</span>
            </p>
            <p className="text-body-sm text-on-surface-variant">{t("sensus.wechatJoinNote")}</p>
          </div>

          {ranting?.wechatId && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col items-center justify-center gap-3">
              <h2 className="text-headline-sm text-on-background">
                {t("sensus.rantingWechatJoinTitle", { label: ranting.label })}
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                {t("sensus.wechatIdLabel")}:{" "}
                <span className="font-medium text-on-background select-all">{ranting.wechatId}</span>
              </p>
              <p className="text-body-sm text-on-surface-variant">{t("sensus.rantingWechatJoinNote")}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sensus"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("sensus.viewData")}
          </Link>
          <Link
            href="/"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("sensus.backHome")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
