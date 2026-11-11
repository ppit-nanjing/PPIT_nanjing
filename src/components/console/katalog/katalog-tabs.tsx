import { Download } from "lucide-react";
import {
  createMerchandise,
  deleteMerchandise,
  updateMerchandise,
  createSponsor,
  deleteSponsor,
  updateSponsor,
  type listCityContent,
} from "@/app/actions/city-content";
import {
  createDonationChannel,
  deleteDonationChannel,
  updateDonationChannel,
  toggleDonationChannelPublished,
  updateDonationStatus,
  type listChannelsForAdmin,
  type listDonationsForAdmin,
} from "@/app/actions/donations";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { SelectField, TextAreaField, TextField } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { FilterList } from "./filter-list";
import { AddPanel, EnglishFields, EntryRow, FormFooter, RowBadge, TabIntro } from "./shared";

type CityContent = Awaited<ReturnType<typeof listCityContent>>;
type Merch = CityContent["merchandise"][number];
type Sponsor = CityContent["sponsors"][number];
type Channel = Awaited<ReturnType<typeof listChannelsForAdmin>>[number];
type Donation = Awaited<ReturnType<typeof listDonationsForAdmin>>[number];

const MERCH_STATUSES = [
  { value: "unavailable", label: "Belum tersedia" },
  { value: "preorder", label: "Pre-order" },
  { value: "available", label: "Tersedia" },
];
const SPONSOR_TIERS = [
  { value: "partner", label: "Mitra" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];
const labelOf = (options: { value: string; label: string }[], value: string | null) =>
  options.find((o) => o.value === value)?.label ?? value ?? "";

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2";
const decideBtn =
  "rounded-md bg-primary-container px-3.5 py-2 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary";
const quietBtn =
  "rounded-md border border-outline-variant px-3.5 py-2 text-label-caps uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-background";

// ---------- Merchandise ----------

function MerchForm({ item }: { item?: Merch }) {
  return (
    <form action={item ? updateMerchandise : createMerchandise} className="flex max-w-3xl flex-col gap-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className={grid}>
        <TextField name="name" label="Nama" required defaultValue={item?.name} />
        <TextField name="priceCny" label="Harga (¥)" type="number" min={0} defaultValue={item?.priceCny} />
        <SelectField name="status" label="Status" options={MERCH_STATUSES} defaultValue={item?.status ?? "unavailable"} />
        <TextField name="orderIndex" label="Urutan" hint="Angka kecil tampil lebih dulu." type="number" defaultValue={item?.orderIndex ?? 0} />
      </div>
      <ImageUploadCropper name="imageUrl" folder="catalog" label="Gambar" placeholder="Tempel URL atau unggah gambar" defaultValue={item?.imageUrl ?? ""} />
      <TextAreaField name="description" label="Deskripsi" rows={2} defaultValue={item?.description} />
      <TextField
        name="contactNote"
        label="Cara memesan"
        hint="Situs ini tidak punya keranjang belanja; tulis ke mana pembeli harus menghubungi."
        placeholder="mis. Pesan lewat WhatsApp pengurus"
        defaultValue={item?.contactNote}
      />
      {item && (
        <EnglishFields>
          <TextField name="nameEn" label="Nama (Inggris)" defaultValue={item.nameEn} />
          <TextAreaField name="descriptionEn" label="Deskripsi (Inggris)" rows={2} defaultValue={item.descriptionEn} />
        </EnglishFields>
      )}
      <FormFooter
        submitLabel={item ? "Simpan Perubahan" : "Tambah Item"}
        successMessage={item ? "Item tersimpan." : "Item ditambahkan."}
        remove={item && { action: deleteMerchandise, id: item.id, itemLabel: item.name }}
      />
    </form>
  );
}

export function MerchandiseTab({ items }: { items: Merch[] }) {
  return (
    <div className="flex flex-col gap-5">
      <TabIntro href="/catalogue" hrefLabel="Lihat halaman Katalog">
        Etalase merchandise di halaman Katalog. Ini bukan toko: pembeli memesan lewat kontak yang kamu tulis di tiap item.
      </TabIntro>
      <AddPanel label="Tambah Item">
        <MerchForm />
      </AddPanel>
      <FilterList
        noun="item"
        searchPlaceholder="Cari nama item"
        empty="Belum ada merchandise. Tambahkan yang pertama lewat tombol di atas."
        items={items.map((m) => ({
          id: m.id,
          text: [m.name, m.nameEn].filter(Boolean).join(" "),
          node: (
            <EntryRow
              image={items.some((x) => x.imageUrl) ? m.imageUrl : undefined}
              title={m.name}
              meta={[labelOf(MERCH_STATUSES, m.status), m.priceCny != null && `¥${m.priceCny}`].filter(Boolean).join(" · ")}
            >
              <MerchForm item={m} />
            </EntryRow>
          ),
        }))}
      />
    </div>
  );
}

// ---------- Sponsor ----------

function SponsorForm({ sponsor: s }: { sponsor?: Sponsor }) {
  return (
    <form action={s ? updateSponsor : createSponsor} className="flex max-w-3xl flex-col gap-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className={grid}>
        <TextField name="name" label="Nama" required defaultValue={s?.name} />
        <SelectField name="tier" label="Tingkat" options={SPONSOR_TIERS} defaultValue={s?.tier ?? "partner"} />
        <TextField name="websiteUrl" label="Situs" placeholder="https://…" defaultValue={s?.websiteUrl} />
        <TextField name="orderIndex" label="Urutan" hint="Angka kecil tampil lebih dulu." type="number" defaultValue={s?.orderIndex ?? 0} />
      </div>
      <ImageUploadCropper name="logoUrl" folder="catalog" label="Logo" placeholder="Tempel URL atau unggah gambar" defaultValue={s?.logoUrl ?? ""} />
      <TextAreaField name="description" label="Deskripsi" rows={2} defaultValue={s?.description} />
      {s && (
        <EnglishFields>
          <TextAreaField name="descriptionEn" label="Deskripsi (Inggris)" rows={2} defaultValue={s.descriptionEn} />
        </EnglishFields>
      )}
      <FormFooter
        submitLabel={s ? "Simpan Perubahan" : "Tambah Sponsor"}
        successMessage={s ? "Sponsor tersimpan." : "Sponsor ditambahkan."}
        remove={s && { action: deleteSponsor, id: s.id, itemLabel: s.name }}
      />
    </form>
  );
}

export function SponsorsTab({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <div className="flex flex-col gap-5">
      <TabIntro href="/catalogue/sponsorship" hrefLabel="Lihat halaman Sponsor">
        Sponsor dan mitra yang logonya tampil di halaman Sponsor, diurutkan menurut tingkatnya.
      </TabIntro>
      <AddPanel label="Tambah Sponsor">
        <SponsorForm />
      </AddPanel>
      <FilterList
        noun="sponsor"
        searchPlaceholder="Cari nama sponsor"
        empty="Belum ada sponsor. Tambahkan yang pertama lewat tombol di atas."
        items={sponsors.map((s) => ({
          id: s.id,
          text: s.name,
          node: (
            <EntryRow image={sponsors.some((x) => x.logoUrl) ? s.logoUrl : undefined} title={s.name} meta={labelOf(SPONSOR_TIERS, s.tier)}>
              <SponsorForm sponsor={s} />
            </EntryRow>
          ),
        }))}
      />
    </div>
  );
}

// ---------- Donasi ----------

function ChannelForm({ channel: c }: { channel?: Channel }) {
  return (
    <form action={c ? updateDonationChannel : createDonationChannel} className="flex max-w-3xl flex-col gap-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className={grid}>
        <TextField name="label" label="Nama kanal" required placeholder="Alipay / WeChat Pay / Transfer BCA" defaultValue={c?.label} />
        <TextField name="accountName" label="Atas nama" defaultValue={c?.accountName} />
        <TextField name="accountDetail" label="Nomor / detail" defaultValue={c?.accountDetail} />
        {c && <TextField name="orderIndex" label="Urutan" type="number" defaultValue={c.orderIndex} />}
      </div>
      <ImageUploadCropper name="qrImageUrl" folder="donation" label="Gambar QR" placeholder="Tempel URL atau unggah gambar" defaultValue={c?.qrImageUrl ?? ""} />
      <TextField name="instructions" label="Petunjuk" defaultValue={c?.instructions} />
      <FormFooter
        submitLabel={c ? "Simpan Kanal" : "Tambah Kanal"}
        successMessage={c ? "Kanal tersimpan." : "Kanal ditambahkan."}
        remove={c && { action: deleteDonationChannel, id: c.id, itemLabel: c.label }}
      />
    </form>
  );
}

const DONATION_STATUS: Record<string, string> = { pending: "Menunggu", verified: "Terverifikasi", rejected: "Ditolak" };

function DonationRow({ donation: d }: { donation: Donation }) {
  const pending = d.status === "pending";
  return (
    <li className="flex flex-col gap-3 border-b border-outline-variant/70 px-4 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-body-md text-on-background">
          {d.donorName}
          {d.anonymous && <span className="text-on-surface-variant"> (minta anonim)</span>}
        </p>
        <p className="text-body-sm tabular-nums text-on-surface-variant">
          {[
            d.amountCny != null ? `¥${d.amountCny}` : "Jumlah tidak diisi",
            d.method,
            d.createdAt.toLocaleDateString("id-ID", { timeZone: "Asia/Shanghai", dateStyle: "medium" }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {d.message && <p className="mt-1 text-body-sm text-on-surface-variant">“{d.message}”</p>}
        {d.proofUrl && (
          <a
            href={d.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-body-sm text-primary-container underline-offset-4 hover:underline"
          >
            Lihat bukti transfer
          </a>
        )}
      </div>
      <form action={updateDonationStatus} className="flex shrink-0 flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={d.id} />
        {pending ? (
          <>
            {/* Dua tombol kirim di satu form: hanya satu yang membawa toast, supaya tidak muncul dua kali. */}
            <SubmitButton name="status" value="verified" successMessage="Status donasi tersimpan." className={decideBtn}>
              Verifikasi
            </SubmitButton>
            <SubmitButton name="status" value="rejected" successMessage="" className={quietBtn}>
              Tolak
            </SubmitButton>
          </>
        ) : (
          <>
            <RowBadge tone={d.status === "verified" ? "ok" : "muted"}>{DONATION_STATUS[d.status] ?? d.status}</RowBadge>
            <SubmitButton name="status" value="pending" successMessage="Dikembalikan ke Menunggu." className={quietBtn}>
              Batalkan
            </SubmitButton>
          </>
        )}
      </form>
    </li>
  );
}

export function DonationsTab({ donations, channels }: { donations: Donation[]; channels: Channel[] }) {
  // Yang menunggu keputusan selalu di atas; sisanya tetap menurut waktu masuk (terbaru dulu).
  const ordered = [...donations.filter((d) => d.status === "pending"), ...donations.filter((d) => d.status !== "pending")];
  const waiting = donations.filter((d) => d.status === "pending").length;

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="donasi-laporan" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="donasi-laporan" className="text-headline-sm text-on-background">
            Laporan Donasi
          </h2>
          {donations.length > 0 && (
            <a
              href="/api/console/katalog/donations/export"
              download
              className="inline-flex items-center gap-1.5 text-body-sm text-primary-container underline-offset-4 hover:underline"
            >
              <Download size={13} aria-hidden /> Unduh CSV
            </a>
          )}
        </div>
        <TabIntro href="/catalogue/donasi" hrefLabel="Lihat halaman Donasi">
          Laporan ini diisi sendiri oleh donatur, jadi cocokkan dulu dengan mutasi rekening sebelum memverifikasi. Hanya yang
          terverifikasi yang tampil publik.
        </TabIntro>
        {donations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-outline-variant p-6 text-body-md text-on-surface-variant">
            Belum ada laporan donasi.
          </p>
        ) : (
          <>
            <p className="text-body-sm tabular-nums text-on-surface-variant">
              {waiting > 0 ? `${waiting} laporan menunggu verifikasi` : "Semua laporan sudah diputuskan"}, {donations.length} total.
            </p>
            <ul className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
              {ordered.map((d) => (
                <DonationRow key={d.id} donation={d} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="donasi-kanal" className="flex flex-col gap-4">
        <h2 id="donasi-kanal" className="text-headline-sm text-on-background">
          Kanal Donasi
        </h2>
        <TabIntro>
          QR Alipay/WeChat atau rekening yang tampil di halaman Donasi. Situs ini tidak memproses pembayaran: donasi dicatat
          manual setelah diverifikasi.
        </TabIntro>
        <AddPanel label="Tambah Kanal">
          <ChannelForm />
        </AddPanel>
        <FilterList
          noun="kanal"
          searchPlaceholder="Cari kanal"
          empty="Belum ada kanal donasi. Tambahkan yang pertama lewat tombol di atas."
          items={channels.map((c) => ({
            id: c.id,
            text: [c.label, c.accountName].filter(Boolean).join(" "),
            node: (
              <EntryRow
                image={channels.some((x) => x.qrImageUrl) ? c.qrImageUrl : undefined}
                title={c.label}
                meta={[c.accountName, c.accountDetail].filter(Boolean).join(" · ")}
                badge={!c.published && <RowBadge>Disembunyikan</RowBadge>}
              >
                <div className="flex flex-col gap-5">
                  <ChannelForm channel={c} />
                  <form action={toggleDonationChannelPublished} className="border-t border-outline-variant/70 pt-4">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="next" value={c.published ? "false" : "true"} />
                    <SubmitButton successMessage={c.published ? "Kanal disembunyikan." : "Kanal ditampilkan."} className={quietBtn}>
                      {c.published ? "Sembunyikan dari halaman Donasi" : "Tampilkan di halaman Donasi"}
                    </SubmitButton>
                  </form>
                </div>
              </EntryRow>
            ),
          }))}
        />
      </section>
    </div>
  );
}
