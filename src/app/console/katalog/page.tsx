import type { Metadata } from "next";
import { requireModuleAccess, hasModuleAccess } from "@/lib/admin-scope";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { listCityContent, listCoverageCities } from "@/app/actions/city-content";
import { listDonationsForAdmin, listChannelsForAdmin } from "@/app/actions/donations";
import { KATALOG_TABS, KatalogTabs, type KatalogTab } from "@/components/console/katalog/shared";
import { CoverageTab, DistrictsTab, PlacesTab, UniversitiesTab } from "@/components/console/katalog/kota-tabs";
import { DonationsTab, MerchandiseTab, SponsorsTab } from "@/components/console/katalog/katalog-tabs";

export const metadata: Metadata = { title: "Kota & Katalog" };

export default async function ConsoleKatalogPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireModuleAccess("content");
  // Donasi digerbang lebih ketat dari sisa halaman ini: tab dan datanya hanya ada
  // untuk pemegang modul Organisasi (action-nya memeriksa ulang hal yang sama).
  const canSeeDonations = hasModuleAccess(session.user.adminScope, "organization");
  const [{ tab: requested }, data, coverage, donations, channels, guide] = await Promise.all([
    searchParams,
    listCityContent(),
    listCoverageCities(),
    canSeeDonations ? listDonationsForAdmin() : Promise.resolve([]),
    canSeeDonations ? listChannelsForAdmin() : Promise.resolve([]),
    getGuide("katalog"),
  ]);

  // Nilai ?tab= hanya dikenali kalau ada di daftar dan boleh dibuka akun ini.
  const known = KATALOG_TABS.find((t) => t.key === requested)?.key;
  const tab: KatalogTab = known && (known !== "donasi" || canSeeDonations) ? known : "tempat";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-on-background sm:text-headline-lg">Kota &amp; Katalog</h1>
          <p className="mt-1 max-w-3xl text-body-md text-on-surface-variant">
            Isi halaman Tempat, Kampus, Wilayah Naungan, dan Katalog di situs publik.
          </p>
        </div>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="katalog" />}
      </div>

      <KatalogTabs
        active={tab}
        pendingDonations={donations.filter((d) => d.status === "pending").length}
        counts={{
          tempat: data.places.length,
          kampus: data.universities.length,
          distrik: data.districts.length,
          wilayah: coverage.length,
          merchandise: data.merchandise.length,
          sponsor: data.sponsors.length,
          ...(canSeeDonations ? { donasi: donations.length } : {}),
        }}
      />

      <div className="pt-6">
        {tab === "tempat" && <PlacesTab places={data.places} />}
        {tab === "kampus" && <UniversitiesTab universities={data.universities} cities={coverage.map((c) => c.label)} />}
        {tab === "distrik" && <DistrictsTab districts={data.districts} places={data.places} universities={data.universities} />}
        {tab === "wilayah" && <CoverageTab cities={coverage} />}
        {tab === "merchandise" && <MerchandiseTab items={data.merchandise} />}
        {tab === "sponsor" && <SponsorsTab sponsors={data.sponsors} />}
        {tab === "donasi" && <DonationsTab donations={donations} channels={channels} />}
      </div>
    </div>
  );
}
