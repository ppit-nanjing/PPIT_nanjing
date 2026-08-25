import { requireModuleAccess, hasModuleAccess } from "@/lib/admin-scope";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { getGuide } from "@/lib/guides";
import {
  listCityContent,
  createPlace,
  deletePlace,
  updatePlace,
  createUniversity,
  deleteUniversity,
  updateUniversity,
  upsertDistrict,
  deleteDistrict,
  createMerchandise,
  deleteMerchandise,
  updateMerchandise,
  createSponsor,
  deleteSponsor,
  updateSponsor,
  listCoverageCities,
  updateCoverageCity,
} from "@/app/actions/city-content";
import {
  listDonationsForAdmin,
  listChannelsForAdmin,
  createDonationChannel,
  deleteDonationChannel,
  updateDonationStatus,
} from "@/app/actions/donations";
// Token isian memakai primitif bersama konsol supaya semua form terlihat dan
// terasa identik; label & rowBtn tetap lokal karena spesifik halaman ini.
import { fieldInput as input, primaryBtn } from "@/components/console/form";
import { ConfirmButton } from "@/components/console/confirm-button";
import { Pencil } from "lucide-react";

const label = "text-label-caps uppercase tracking-wide text-on-surface-variant";
const rowBtn =
  "text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-1.5 rounded-md";

function Row({
  children,
  onDelete,
  id,
  itemLabel,
  edit,
}: {
  children: React.ReactNode;
  onDelete: (fd: FormData) => void;
  id: string;
  itemLabel: string;
  /** Optional inline <form> rendered under a pure-HTML details toggle. */
  edit?: React.ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-outline-variant/60 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        {children}
        {edit && (
          <details className="mt-2">
            <summary className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container cursor-pointer hover:text-primary transition-colors">
              <Pencil size={12} /> Edit
            </summary>
            <div className="mt-3 pr-2">{edit}</div>
          </details>
        )}
      </div>
      <ConfirmButton
        title="Hapus entri ini?"
        message={`"${itemLabel}" akan dihapus permanen dari katalog.`}
        onConfirm={async () => {
          const fd = new FormData();
          fd.set("id", id);
          await onDelete(fd);
        }}
        className={rowBtn}
      >
        Hapus
      </ConfirmButton>
    </li>
  );
}

export default async function ConsoleKatalogPage() {
  const session = await requireModuleAccess("content");
  // Perf: everything below is independent of each other - one parallel batch
  // instead of listCityContent -> coverage -> guide stacked serially.
  const canSeeDonations = hasModuleAccess(session.user.adminScope, "organization");
  const [data, coverage, donationRows, channelRows, guide] = await Promise.all([
    listCityContent(),
    listCoverageCities(),
    // Donations are gated harder than the rest of this page, so the section is
    // only rendered for scopes that may actually act on it.
    canSeeDonations ? listDonationsForAdmin() : Promise.resolve([]),
    canSeeDonations ? listChannelsForAdmin() : Promise.resolve([]),
    getGuide("katalog"),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Konten Kota &amp; Katalog</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="katalog" />}
      </div>
      <p className="text-body-md text-on-surface-variant mb-6 max-w-3xl">
        Mengisi halaman Tempat, Kampus, dan Katalog di situs publik.
      </p>

      {/* ---------- Tempat ---------- */}
      <CollapsibleSection title="Tempat" description={`${data.places.length} tempat`} className="mb-6" defaultOpen={false}>
        <form action={createPlace} className="flex flex-col gap-4 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={label}>Nama *</span>
              <input name="name" required className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Nama Mandarin</span>
              <input name="nameZh" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Kategori</span>
              <select name="category" className={input}>
                <option value="tourism">Wisata</option>
                <option value="culture">Sejarah &amp; Budaya</option>
                <option value="nature">Alam &amp; Rekreasi</option>
                <option value="food">Kuliner</option>
                <option value="shopping">Belanja</option>
                <option value="spiritual">Ibadah</option>
                <option value="practical">Kebutuhan Sehari-hari</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Distrik</span>
              <input name="district" placeholder="mis. Gulou" className={input} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className={label}>Deskripsi</span>
            <textarea name="description" rows={2} className={`${input} resize-none`} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={label}>Alamat</span>
              <input name="address" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Alamat Mandarin</span>
              <input name="addressZh" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Tautan Peta</span>
              <input name="mapUrl" placeholder="https://…" className={input} />
            </label>
          </div>
          <ImageUploadCropper name="imageUrl" folder="catalog" label="Gambar" placeholder="Tempel URL atau unggah gambar" />
          <button type="submit" className={primaryBtn}>
            Tambah Tempat
          </button>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {data.places.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada tempat.</li>
          ) : (
            data.places.map((p) => (
              <Row
                key={p.id}
                id={p.id}
                onDelete={deletePlace}
                itemLabel={p.name}
                edit={
                  <form action={updatePlace} className="flex flex-col gap-3 max-w-xl">
                    <input type="hidden" name="id" value={p.id} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input name="name" required defaultValue={p.name} placeholder="Nama *" className={input} />
                      <input name="nameZh" defaultValue={p.nameZh ?? ""} placeholder="Nama Mandarin" className={input} />
                      <select name="category" defaultValue={p.category ?? "tourism"} className={input} aria-label="Kategori">
                        <option value="tourism">Wisata</option>
                        <option value="culture">Sejarah & Budaya</option>
                        <option value="nature">Alam & Rekreasi</option>
                        <option value="food">Kuliner</option>
                        <option value="shopping">Belanja</option>
                        <option value="spiritual">Ibadah</option>
                        <option value="practical">Kebutuhan Sehari-hari</option>
                      </select>
                      <input name="district" defaultValue={p.district ?? ""} placeholder="Distrik" className={input} />
                    </div>
                    <textarea name="description" rows={2} defaultValue={p.description ?? ""} placeholder="Deskripsi" className={`${input} resize-none`} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input name="address" defaultValue={p.address ?? ""} placeholder="Alamat" className={input} />
                      <input name="addressZh" defaultValue={p.addressZh ?? ""} placeholder="Alamat Mandarin" className={input} />
                      <input name="mapUrl" defaultValue={p.mapUrl ?? ""} placeholder="Tautan Peta" className={input} />
                      <input name="orderIndex" type="number" defaultValue={p.orderIndex} placeholder="Urutan" className={input} />
                    </div>
                    <ImageUploadCropper name="imageUrl" folder="catalog" label="Gambar" placeholder="Tempel URL atau unggah gambar" defaultValue={p.imageUrl ?? ""} />
                    <label className="flex items-center gap-2 text-body-md text-on-background">
                      <input type="checkbox" name="published" defaultChecked={p.published} />
                      Tampil di situs publik
                    </label>
                    <button type="submit" className={primaryBtn}>
                      Simpan Perubahan
                    </button>
                  </form>
                }
              >
                <p className="text-body-md text-on-background">
                  {p.name} {p.nameZh && <span className="text-on-surface-variant">{p.nameZh}</span>}
                </p>
                <p className="text-label-caps text-on-surface-variant">
                  {p.category}
                  {p.district ? ` · ${p.district}` : ""}
                  {p.published ? "" : " · disembunyikan"}
                </p>
              </Row>
            ))
          )}
        </ul>
      </CollapsibleSection>

      {/* ---------- Wilayah naungan ---------- */}
      <CollapsibleSection
        title="Wilayah Naungan"
        description={`${coverage.filter((c) => c.memberCount != null).length} dari ${coverage.length} kota sudah ada angkanya`}
        className="mb-6"
        defaultOpen={false}
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          Sembilan kota naungan PPIT Nanjing. Batas wilayahnya tetap (dari data administrasi resmi Tiongkok),
          jadi di sini hanya jumlah mahasiswa dan kontak yang bisa diubah.
        </p>
        <ul className="flex flex-col gap-3">
          {coverage.map((c) => (
            <li key={c.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
              <form action={updateCoverageCity} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={c.id} />
                <span className="text-body-md text-on-background min-w-[7rem]">{c.label}</span>
                <label className="flex flex-col gap-1">
                  <span className={label}>Jumlah mahasiswa</span>
                  <input
                    name="memberCount"
                    type="number"
                    min={0}
                    defaultValue={c.memberCount ?? ""}
                    className="bg-soft-gray rounded-md p-2 text-body-md w-32"
                  />
                </label>
                <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
                  <span className={label}>Kontak</span>
                  <input name="contactInfo" defaultValue={c.contactInfo ?? ""} className="bg-soft-gray rounded-md p-2 text-body-md" />
                </label>
                <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
                  <span className={label}>Catatan</span>
                  <input name="note" defaultValue={c.note ?? ""} className="bg-soft-gray rounded-md p-2 text-body-md" />
                </label>
                <button
                  type="submit"
                  className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
                >
                  Simpan
                </button>
              </form>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* ---------- Distrik ---------- */}
      <CollapsibleSection
        title="Distrik"
        description="Teks pengantar per distrik pada halaman Kampus. Kirim ulang nama yang sama untuk memperbarui."
        className="mb-6"
        defaultOpen={false}
      >
        <form action={upsertDistrict} className="flex flex-col gap-4 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className={label}>Nama *</span>
              <input name="name" required placeholder="Gulou" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Mandarin</span>
              <input name="nameZh" placeholder="鼓楼区" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Urutan</span>
              <input name="orderIndex" type="number" defaultValue={0} className={input} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className={label}>Deskripsi distrik</span>
            <textarea name="description" rows={3} className={`${input} resize-none`} />
          </label>
          <button type="submit" className={primaryBtn}>
            Simpan Distrik
          </button>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {data.districts.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada distrik.</li>
          ) : (
            data.districts.map((d) => (
              <Row key={d.id} id={d.id} onDelete={deleteDistrict} itemLabel={d.name}>
                <p className="text-body-md text-on-background">
                  {d.name} {d.nameZh && <span className="text-on-surface-variant">{d.nameZh}</span>}
                </p>
                {d.description && <p className="text-label-caps text-on-surface-variant">{d.description.slice(0, 90)}</p>}
              </Row>
            ))
          )}
        </ul>
      </CollapsibleSection>

      {/* ---------- Universitas ---------- */}
      <CollapsibleSection
        title="Universitas"
        description={`${data.universities.length} kampus`}
        className="mb-6"
        defaultOpen={false}
      >
        <form action={createUniversity} className="flex flex-col gap-4 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={label}>Nama *</span>
              <input name="name" required placeholder="Nanjing University" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Nama Mandarin</span>
              <input name="nameZh" placeholder="南京大学" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Singkatan</span>
              <input name="abbreviation" placeholder="NJU" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Kota *</span>
              <input name="city" placeholder="Nanjing" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Distrik (opsional, khusus Nanjing)</span>
              <input name="district" placeholder="Gulou" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Koordinator</span>
              <input name="coordinatorName" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Email koordinator</span>
              <input name="coordinatorEmail" type="email" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Situs</span>
              <input name="websiteUrl" placeholder="https://…" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Perkiraan mahasiswa Indonesia</span>
              <input name="studentCount" type="number" min={0} className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Urutan</span>
              <input name="orderIndex" type="number" defaultValue={0} className={input} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className={label}>Deskripsi</span>
            <textarea name="description" rows={2} className={`${input} resize-none`} />
          </label>
          <ImageUploadCropper name="logoUrl" folder="catalog" label="Logo" placeholder="Tempel URL atau unggah gambar" />
          <label className="flex items-center gap-2 text-body-md text-on-background">
            <input type="checkbox" name="isPartner" />
            Kampus mitra
          </label>
          <button type="submit" className={primaryBtn}>
            Tambah Universitas
          </button>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {data.universities.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada universitas.</li>
          ) : (
            data.universities.map((u) => (
              <Row
                key={u.id}
                id={u.id}
                onDelete={deleteUniversity}
                itemLabel={u.name}
                edit={
                  <form action={updateUniversity} className="flex flex-col gap-3 max-w-xl">
                    <input type="hidden" name="id" value={u.id} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input name="name" required defaultValue={u.name} placeholder="Nama *" className={input} />
                      <input name="nameZh" defaultValue={u.nameZh ?? ""} placeholder="Nama Mandarin" className={input} />
                      <input name="abbreviation" defaultValue={u.abbreviation ?? ""} placeholder="Singkatan" className={input} />
                      <input name="city" defaultValue={u.city ?? ""} placeholder="Kota *" className={input} />
                      <input name="district" defaultValue={u.district ?? ""} placeholder="Distrik (khusus Nanjing)" className={input} />
                      <input name="coordinatorName" defaultValue={u.coordinatorName ?? ""} placeholder="Koordinator" className={input} />
                      <input name="coordinatorEmail" type="email" defaultValue={u.coordinatorEmail ?? ""} placeholder="Email koordinator" className={input} />
                      <input name="websiteUrl" defaultValue={u.websiteUrl ?? ""} placeholder="Situs" className={input} />
                      <input name="studentCount" type="number" min={0} defaultValue={u.studentCount ?? ""} placeholder="Perkiraan mahasiswa Indo" className={input} />
                      <input name="orderIndex" type="number" defaultValue={u.orderIndex} placeholder="Urutan" className={input} />
                    </div>
                    <textarea name="description" rows={2} defaultValue={u.description ?? ""} placeholder="Deskripsi" className={`${input} resize-none`} />
                    <ImageUploadCropper name="logoUrl" folder="catalog" label="Logo" placeholder="Tempel URL atau unggah gambar" defaultValue={u.logoUrl ?? ""} />
                    <label className="flex items-center gap-2 text-body-md text-on-background">
                      <input type="checkbox" name="isPartner" defaultChecked={u.isPartner} />
                      Kampus mitra
                    </label>
                    <button type="submit" className={primaryBtn}>
                      Simpan Perubahan
                    </button>
                  </form>
                }
              >
                <p className="text-body-md text-on-background">
                  {u.name} {u.abbreviation && <span className="text-on-surface-variant">({u.abbreviation})</span>}
                </p>
                <p className="text-label-caps text-on-surface-variant">
                  {u.city ?? "tanpa kota"}
                  {u.coordinatorName ? ` · ${u.coordinatorName}` : ""}
                  {u.isPartner ? " · mitra" : ""}
                </p>
              </Row>
            ))
          )}
        </ul>
      </CollapsibleSection>

      {/* ---------- Merchandise ---------- */}
      <CollapsibleSection
        title="Merchandise"
        description={`${data.merchandise.length} item — etalase, bukan toko`}
        className="mb-6"
        defaultOpen={false}
      >
        <form action={createMerchandise} className="flex flex-col gap-4 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={label}>Nama *</span>
              <input name="name" required className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Harga (¥)</span>
              <input name="priceCny" type="number" min={0} className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Status</span>
              <select name="status" className={input}>
                <option value="unavailable">Belum tersedia</option>
                <option value="preorder">Pre-order</option>
                <option value="available">Tersedia</option>
              </select>
            </label>
          </div>
          <ImageUploadCropper name="imageUrl" folder="catalog" label="Gambar" placeholder="Tempel URL atau unggah gambar" />
          <label className="flex flex-col gap-2">
            <span className={label}>Deskripsi</span>
            <textarea name="description" rows={2} className={`${input} resize-none`} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={label}>Catatan pemesanan</span>
            <input name="contactNote" placeholder="mis. Pesan lewat WhatsApp pengurus" className={input} />
          </label>
          <button type="submit" className={primaryBtn}>
            Tambah Item
          </button>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {data.merchandise.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada item.</li>
          ) : (
            data.merchandise.map((m) => (
              <Row
                key={m.id}
                id={m.id}
                onDelete={deleteMerchandise}
                itemLabel={m.name}
                edit={
                  <form action={updateMerchandise} className="flex flex-col gap-3 max-w-xl">
                    <input type="hidden" name="id" value={m.id} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input name="name" required defaultValue={m.name} placeholder="Nama *" className={input} />
                      <input name="priceCny" type="number" min={0} defaultValue={m.priceCny ?? ""} placeholder="Harga (¥)" className={input} />
                      <select name="status" defaultValue={m.status ?? "unavailable"} className={input} aria-label="Status">
                        <option value="unavailable">Belum tersedia</option>
                        <option value="preorder">Pre-order</option>
                        <option value="available">Tersedia</option>
                      </select>
                      <input name="orderIndex" type="number" defaultValue={m.orderIndex} placeholder="Urutan" className={input} />
                    </div>
                    <ImageUploadCropper name="imageUrl" folder="catalog" label="Gambar" placeholder="Tempel URL atau unggah gambar" defaultValue={m.imageUrl ?? ""} />
                    <textarea name="description" rows={2} defaultValue={m.description ?? ""} placeholder="Deskripsi" className={`${input} resize-none`} />
                    <input name="contactNote" defaultValue={m.contactNote ?? ""} placeholder="Catatan pemesanan" className={input} />
                    <button type="submit" className={primaryBtn}>
                      Simpan Perubahan
                    </button>
                  </form>
                }
              >
                <p className="text-body-md text-on-background">{m.name}</p>
                <p className="text-label-caps text-on-surface-variant">
                  {m.status}
                  {m.priceCny != null ? ` · ¥${m.priceCny}` : ""}
                </p>
              </Row>
            ))
          )}
        </ul>
      </CollapsibleSection>

      {/* ---------- Sponsor ---------- */}
      <CollapsibleSection
        title="Sponsor & Mitra"
        description={`${data.sponsors.length} sponsor`}
        className="mb-6"
        defaultOpen={false}
      >
        <form action={createSponsor} className="flex flex-col gap-4 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={label}>Nama *</span>
              <input name="name" required className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Tingkat</span>
              <select name="tier" className={input}>
                <option value="partner">Mitra</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Situs</span>
              <input name="websiteUrl" placeholder="https://…" className={input} />
            </label>
          </div>
          <ImageUploadCropper name="logoUrl" folder="catalog" label="Logo" placeholder="Tempel URL atau unggah gambar" />
          <label className="flex flex-col gap-2">
            <span className={label}>Deskripsi</span>
            <textarea name="description" rows={2} className={`${input} resize-none`} />
          </label>
          <button type="submit" className={primaryBtn}>
            Tambah Sponsor
          </button>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {data.sponsors.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada sponsor.</li>
          ) : (
            data.sponsors.map((s) => (
              <Row
                key={s.id}
                id={s.id}
                onDelete={deleteSponsor}
                itemLabel={s.name}
                edit={
                  <form action={updateSponsor} className="flex flex-col gap-3 max-w-xl">
                    <input type="hidden" name="id" value={s.id} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input name="name" required defaultValue={s.name} placeholder="Nama *" className={input} />
                      <select name="tier" defaultValue={s.tier ?? "partner"} className={input} aria-label="Tingkat">
                        <option value="partner">Mitra</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                      <input name="websiteUrl" defaultValue={s.websiteUrl ?? ""} placeholder="Situs" className={input} />
                      <input name="orderIndex" type="number" defaultValue={s.orderIndex} placeholder="Urutan" className={input} />
                    </div>
                    <ImageUploadCropper name="logoUrl" folder="catalog" label="Logo" placeholder="Tempel URL atau unggah gambar" defaultValue={s.logoUrl ?? ""} />
                    <textarea name="description" rows={2} defaultValue={s.description ?? ""} placeholder="Deskripsi" className={`${input} resize-none`} />
                    <button type="submit" className={primaryBtn}>
                      Simpan Perubahan
                    </button>
                  </form>
                }
              >
                <p className="text-body-md text-on-background">{s.name}</p>
                <p className="text-label-caps text-on-surface-variant">{s.tier}</p>
              </Row>
            ))
          )}
        </ul>
      </CollapsibleSection>

      {/* ---------- Donasi (BPH saja) ---------- */}
      {canSeeDonations && (
        <>
          <CollapsibleSection
            title="Kanal Donasi"
            description="QR Alipay/WeChat atau rekening yang ditampilkan di halaman donasi."
            className="mb-6"
            defaultOpen={false}
          >
            <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
              Situs ini tidak memproses pembayaran. Alipay dan WeChat Pay tidak bisa diintegrasikan tanpa
              rekening merchant berbadan hukum Tiongkok, jadi yang ditampilkan hanya QR/rekening, dan
              donasi dicatat manual setelah diverifikasi.
            </p>
            <form action={createDonationChannel} className="flex flex-col gap-4 max-w-2xl mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className={label}>Nama kanal *</span>
                  <input name="label" required placeholder="Alipay / WeChat Pay / Transfer BCA" className={input} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={label}>Atas nama</span>
                  <input name="accountName" className={input} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={label}>Nomor / detail</span>
                  <input name="accountDetail" className={input} />
                </label>
              </div>
              <ImageUploadCropper name="qrImageUrl" folder="donation" label="Gambar QR" placeholder="Tempel URL atau unggah gambar" />
              <label className="flex flex-col gap-2">
                <span className={label}>Petunjuk</span>
                <input name="instructions" className={input} />
              </label>
              <button type="submit" className={primaryBtn}>
                Tambah Kanal
              </button>
            </form>

            <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
              {channelRows.length === 0 ? (
                <li className="py-4 text-body-md text-on-surface-variant">Belum ada kanal.</li>
              ) : (
                channelRows.map((c) => (
                  <Row key={c.id} id={c.id} onDelete={deleteDonationChannel} itemLabel={c.label}>
                    <p className="text-body-md text-on-background">{c.label}</p>
                    <p className="text-label-caps text-on-surface-variant">
                      {c.accountName ?? ""} {c.accountDetail ?? ""}
                    </p>
                  </Row>
                ))
              )}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection
            title="Laporan Donasi"
            description={`${donationRows.filter((d) => d.status === "pending").length} menunggu verifikasi`}
            className="mb-6"
          >
            <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
              Cocokkan dengan mutasi rekening sebelum memverifikasi &mdash; laporan ini diisi sendiri oleh
              donatur, jadi belum tentu benar. Hanya yang berstatus terverifikasi yang tampil publik.
            </p>
            <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
              {donationRows.length === 0 ? (
                <li className="py-4 text-body-md text-on-surface-variant">Belum ada laporan donasi.</li>
              ) : (
                donationRows.map((d) => (
                  <li key={d.id} className="border-b border-outline-variant/60 py-4 last:border-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-body-md text-on-background">
                          {d.donorName}
                          {d.anonymous && <span className="text-on-surface-variant"> (minta anonim)</span>}
                        </p>
                        <p className="text-label-caps text-on-surface-variant">
                          {d.amountCny != null ? `¥${d.amountCny}` : "jumlah tidak diisi"}
                          {d.method ? ` · ${d.method}` : ""} · {d.status}
                        </p>
                        {d.message && <p className="text-body-md text-on-surface-variant mt-1">{d.message}</p>}
                        {d.proofUrl && (
                          <a
                            href={d.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-label-caps uppercase tracking-wide text-primary-container hover:underline"
                          >
                            Lihat bukti
                          </a>
                        )}
                      </div>
                      <form action={updateDonationStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={d.id} />
                        <select name="status" defaultValue={d.status} className="bg-soft-gray rounded-md p-2 text-body-md">
                          <option value="pending">Menunggu</option>
                          <option value="verified">Terverifikasi</option>
                          <option value="rejected">Ditolak</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
                        >
                          Simpan
                        </button>
                      </form>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
