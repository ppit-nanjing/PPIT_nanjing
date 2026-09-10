import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function SensusSuccessPage() {
  const { t } = await getT();
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
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
            ke sini setelah selesai. */}
        <div className="mb-10 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col items-center gap-3">
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
