import {
  createPlace,
  deletePlace,
  updatePlace,
  createUniversity,
  deleteUniversity,
  updateUniversity,
  upsertDistrict,
  deleteDistrict,
  updateCoverageCity,
  type listCityContent,
  type listCoverageCities,
} from "@/app/actions/city-content";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { CheckboxField, Field, SelectField, TextAreaField, TextField, ToggleSwitch, fieldInput } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { NANJING_DISTRICTS, canonicalDistrict } from "@/lib/nanjing-districts";
import { FilterList } from "./filter-list";
import { AddPanel, EnglishFields, EntryRow, FormFooter, RowBadge, TabIntro } from "./shared";

type CityContent = Awaited<ReturnType<typeof listCityContent>>;
type Place = CityContent["places"][number];
type University = CityContent["universities"][number];
type District = CityContent["districts"][number];
type CoverageCity = Awaited<ReturnType<typeof listCoverageCities>>[number];

export const PLACE_CATEGORIES = [
  { value: "tourism", label: "Wisata" },
  { value: "culture", label: "Sejarah & Budaya" },
  { value: "nature", label: "Alam & Rekreasi" },
  { value: "food", label: "Kuliner" },
  { value: "shopping", label: "Belanja" },
  { value: "spiritual", label: "Ibadah" },
  { value: "practical", label: "Kebutuhan Sehari-hari" },
];
const categoryLabel = (value: string | null) => PLACE_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "";

/**
 * Pilihan distrik untuk <select>. Nilai lama yang bukan nama baku (mis. diketik dalam
 * Mandarin) tetap ditawarkan apa adanya, supaya membuka lalu menyimpan form tidak mengubahnya diam-diam.
 */
function districtOptions(current: string | null) {
  const options = [
    { value: "", label: "Tanpa distrik" },
    ...NANJING_DISTRICTS.map((d) => ({ value: d.label, label: `${d.label} ${d.zh}` })),
  ];
  if (current && !NANJING_DISTRICTS.some((d) => d.label === current)) options.push({ value: current, label: current });
  return options;
}

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2";

// ---------- Tempat ----------

function PlaceForm({ place }: { place?: Place }) {
  return (
    <form action={place ? updatePlace : createPlace} className="flex max-w-3xl flex-col gap-4">
      {place && <input type="hidden" name="id" value={place.id} />}
      <div className={grid}>
        <TextField name="name" label="Nama" required defaultValue={place?.name} />
        <TextField name="nameZh" label="Nama Mandarin" defaultValue={place?.nameZh} />
        <SelectField name="category" label="Kategori" options={PLACE_CATEGORIES} defaultValue={place?.category ?? "tourism"} />
        <SelectField
          name="district"
          label="Distrik"
          hint="Menentukan di distrik mana tempat ini dihitung pada Peta Nanjing."
          options={districtOptions(place?.district ?? null)}
          defaultValue={place?.district ?? ""}
        />
      </div>
      <TextAreaField name="description" label="Deskripsi" rows={2} defaultValue={place?.description} />
      <div className={grid}>
        {/* Kolom DB-nya masih `address`; isinya sekarang stasiun metro terdekat. */}
        <TextField
          name="address"
          label="Stasiun metro terdekat"
          placeholder="mis. Metro Line 2 Muxuyuan Station, Exit 1"
          defaultValue={place?.address}
        />
        <TextField name="addressZh" label="Alamat Mandarin" hint="Untuk ditunjukkan ke sopir taksi atau ditempel di aplikasi peta." defaultValue={place?.addressZh} />
        <TextField name="mapUrl" label="Tautan peta" placeholder="https://…" defaultValue={place?.mapUrl} />
      </div>
      <ImageUploadCropper name="imageUrl" folder="catalog" label="Gambar" placeholder="Tempel URL atau unggah gambar" defaultValue={place?.imageUrl ?? ""} />
      {place && (
        <>
          <EnglishFields>
            <TextField name="nameEn" label="Nama (Inggris)" defaultValue={place.nameEn} />
            <TextAreaField name="descriptionEn" label="Deskripsi (Inggris)" rows={2} defaultValue={place.descriptionEn} />
          </EnglishFields>
          <ToggleSwitch name="published" defaultChecked={place.published} label="Tampil di situs publik" />
        </>
      )}
      <FormFooter
        submitLabel={place ? "Simpan Perubahan" : "Tambah Tempat"}
        successMessage={place ? "Tempat tersimpan." : "Tempat ditambahkan."}
        remove={place && { action: deletePlace, id: place.id, itemLabel: place.name }}
      />
    </form>
  );
}

export function PlacesTab({ places }: { places: Place[] }) {
  return (
    <div className="flex flex-col gap-5">
      <TabIntro href="/places" hrefLabel="Lihat halaman Tempat">
        Tempat wisata, kuliner, ibadah, dan kebutuhan sehari-hari yang tampil di halaman Tempat dan dihitung di Peta Nanjing.
      </TabIntro>
      <AddPanel label="Tambah Tempat">
        <PlaceForm />
      </AddPanel>
      <FilterList
        noun="tempat"
        searchPlaceholder="Cari nama atau distrik"
        facets={PLACE_CATEGORIES}
        facetLabel="Semua kategori"
        empty="Belum ada tempat. Tambahkan yang pertama lewat tombol di atas."
        items={places.map((p) => ({
          id: p.id,
          text: [p.name, p.nameZh, p.nameEn, p.district].filter(Boolean).join(" "),
          facet: p.category,
          node: (
            <EntryRow
              image={places.some((x) => x.imageUrl) ? p.imageUrl : undefined}
              title={p.name}
              aside={p.nameZh}
              meta={[categoryLabel(p.category), p.district].filter(Boolean).join(" · ")}
              badge={!p.published && <RowBadge>Disembunyikan</RowBadge>}
            >
              <PlaceForm place={p} />
            </EntryRow>
          ),
        }))}
      />
    </div>
  );
}

// ---------- Kampus ----------

function UniversityForm({ university: u }: { university?: University }) {
  return (
    <form action={u ? updateUniversity : createUniversity} className="flex max-w-3xl flex-col gap-4">
      {u && <input type="hidden" name="id" value={u.id} />}
      <div className={grid}>
        <TextField name="name" label="Nama" required placeholder="Nanjing University" defaultValue={u?.name} />
        <TextField name="nameZh" label="Nama Mandarin" placeholder="南京大学" defaultValue={u?.nameZh} />
        <TextField name="abbreviation" label="Singkatan" placeholder="NJU" defaultValue={u?.abbreviation} />
        <Field label="Kota" hint="Kampus dikelompokkan per kota di halaman Kampus.">
          {/* Saran kotanya (datalist katalog-kota) dipasang sekali di UniversitiesTab. */}
          <input name="city" list="katalog-kota" placeholder="Nanjing" defaultValue={u?.city ?? undefined} className={fieldInput} />
        </Field>
        <SelectField
          name="district"
          label="Distrik"
          hint="Hanya untuk kampus di Nanjing."
          options={districtOptions(u?.district ?? null)}
          defaultValue={u?.district ?? ""}
        />
        <TextField name="studentCount" label="Perkiraan mahasiswa Indonesia" type="number" min={0} defaultValue={u?.studentCount} />
        <TextField name="coordinatorName" label="Koordinator" defaultValue={u?.coordinatorName} />
        <TextField name="coordinatorEmail" label="Email koordinator" type="email" defaultValue={u?.coordinatorEmail} />
        <TextField name="websiteUrl" label="Situs" placeholder="https://…" defaultValue={u?.websiteUrl} />
        <TextField name="orderIndex" label="Urutan" hint="Angka kecil tampil lebih dulu." type="number" defaultValue={u?.orderIndex ?? 0} />
      </div>
      <TextAreaField name="description" label="Deskripsi" rows={2} defaultValue={u?.description} />
      <ImageUploadCropper name="logoUrl" folder="catalog" label="Logo" placeholder="Tempel URL atau unggah gambar" defaultValue={u?.logoUrl ?? ""} />
      {u && (
        <EnglishFields>
          <TextAreaField name="descriptionEn" label="Deskripsi (Inggris)" rows={2} defaultValue={u.descriptionEn} />
        </EnglishFields>
      )}
      <CheckboxField name="isPartner" defaultChecked={u?.isPartner} label="Kampus mitra" className="text-on-background" />
      <FormFooter
        submitLabel={u ? "Simpan Perubahan" : "Tambah Kampus"}
        successMessage={u ? "Kampus tersimpan." : "Kampus ditambahkan."}
        remove={u && { action: deleteUniversity, id: u.id, itemLabel: u.name }}
      />
    </form>
  );
}

export function UniversitiesTab({ universities, cities }: { universities: University[]; cities: string[] }) {
  const cityFacets = [...new Set(universities.map((u) => u.city).filter((c): c is string => !!c))]
    .sort()
    .map((city) => ({ value: city, label: city }));
  return (
    <div className="flex flex-col gap-5">
      <TabIntro href="/universities" hrefLabel="Lihat halaman Kampus">
        Kampus tempat mahasiswa Indonesia belajar, beserta koordinatornya. Tampil di halaman Kampus.
      </TabIntro>
      <datalist id="katalog-kota">
        {cities.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
      <AddPanel label="Tambah Kampus">
        <UniversityForm />
      </AddPanel>
      <FilterList
        noun="kampus"
        searchPlaceholder="Cari nama, singkatan, atau koordinator"
        facets={cityFacets.length > 1 ? cityFacets : undefined}
        facetLabel="Semua kota"
        empty="Belum ada kampus. Tambahkan yang pertama lewat tombol di atas."
        items={universities.map((u) => ({
          id: u.id,
          text: [u.name, u.nameZh, u.abbreviation, u.city, u.district, u.coordinatorName].filter(Boolean).join(" "),
          facet: u.city,
          node: (
            <EntryRow
              image={universities.some((x) => x.logoUrl) ? u.logoUrl : undefined}
              title={u.name}
              aside={u.abbreviation}
              meta={[u.city ?? "Kota belum diisi", u.district, u.coordinatorName && `Koordinator: ${u.coordinatorName}`]
                .filter(Boolean)
                .join(" · ")}
              badge={u.isPartner && <RowBadge tone="ok">Mitra</RowBadge>}
            >
              <UniversityForm university={u} />
            </EntryRow>
          ),
        }))}
      />
    </div>
  );
}

// ---------- Distrik ----------

function DistrictForm({ district: d }: { district?: District }) {
  return (
    // Satu action untuk tambah dan ubah: upsertDistrict mencocokkan lewat nama, jadi
    // saat mengedit namanya dikunci (mengganti nama akan membuat distrik baru).
    <form action={upsertDistrict} className="flex max-w-3xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nama" required hint={d ? "Nama tidak bisa diubah." : "Pilih dari daftar atau ketik sendiri."}>
          <input
            name="name"
            required
            readOnly={!!d}
            list={d ? undefined : "katalog-distrik"}
            placeholder="Gulou"
            defaultValue={d?.name}
            className={`${fieldInput} ${d ? "text-on-surface-variant" : ""}`}
          />
          {!d && (
            <datalist id="katalog-distrik">
              {NANJING_DISTRICTS.map((x) => (
                <option key={x.label} value={x.label} />
              ))}
            </datalist>
          )}
        </Field>
        <TextField name="nameZh" label="Mandarin" placeholder="鼓楼区" defaultValue={d?.nameZh} />
        <TextField name="orderIndex" label="Urutan" type="number" defaultValue={d?.orderIndex ?? 0} />
      </div>
      <TextAreaField name="description" label="Deskripsi distrik" rows={3} defaultValue={d?.description} />
      <EnglishFields>
        <TextAreaField name="descriptionEn" label="Deskripsi distrik (Inggris)" rows={3} defaultValue={d?.descriptionEn} />
      </EnglishFields>
      <FormFooter
        submitLabel={d ? "Simpan Perubahan" : "Tambah Distrik"}
        successMessage="Distrik tersimpan."
        remove={d && { action: deleteDistrict, id: d.id, itemLabel: d.name }}
      />
    </form>
  );
}

export function DistrictsTab({ districts, places, universities }: { districts: District[]; places: Place[]; universities: University[] }) {
  // Jumlah isi per distrik, dicocokkan dengan aturan yang sama dengan Peta Nanjing.
  const tally = (rows: { district: string | null }[]) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = canonicalDistrict(row.district);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  // Hanya yang terbit, seperti /map: angka di sini harus sama dengan yang dilihat pengunjung.
  const placeCounts = tally(places.filter((p) => p.published));
  const campusCounts = tally(universities.filter((u) => u.published));
  const missing = NANJING_DISTRICTS.filter((x) => !districts.some((d) => canonicalDistrict(d.name) === x.label));

  return (
    <div className="flex flex-col gap-5">
      {/* Tabel districts belum dibaca halaman publik mana pun (dicek 2026-11); jangan menjanjikan tempat tampilnya. */}
      <TabIntro href="/map" hrefLabel="Lihat Peta Nanjing">
        Teks pengantar tiap distrik Nanjing. Teks ini belum ditampilkan di situs publik; hitungan tempat dan kampus di tiap
        baris adalah angka yang muncul di Peta Nanjing.
      </TabIntro>
      <AddPanel label="Tambah Distrik">
        <DistrictForm />
      </AddPanel>
      {missing.length > 0 && (
        <p className="text-body-sm text-on-surface-variant">
          Belum punya teks pengantar: {missing.map((x) => x.label).join(", ")}.
        </p>
      )}
      <FilterList
        noun="distrik"
        searchPlaceholder="Cari distrik"
        empty="Belum ada distrik. Tambahkan yang pertama lewat tombol di atas."
        items={districts.map((d) => {
          const key = canonicalDistrict(d.name);
          const nPlaces = (key && placeCounts.get(key)) || 0;
          const nCampus = (key && campusCounts.get(key)) || 0;
          return {
            id: d.id,
            text: [d.name, d.nameZh].filter(Boolean).join(" "),
            node: (
              <EntryRow
                title={d.name}
                aside={d.nameZh}
                meta={`${nPlaces} tempat · ${nCampus} kampus`}
                badge={!d.description && <RowBadge tone="attention">Belum ada deskripsi</RowBadge>}
              >
                <DistrictForm district={d} />
              </EntryRow>
            ),
          };
        })}
      />
    </div>
  );
}

// ---------- Wilayah Naungan ----------

const coverageCols = "xl:grid-cols-[9rem_10rem_1fr_1fr_6rem] xl:gap-x-3";
const coverageLabel = "text-label-caps uppercase tracking-wide text-on-surface-variant";

function CoverageInput({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue: string | number | null }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={`${coverageLabel} xl:sr-only`}>{label}</span>
      <input name={name} type={type} min={type === "number" ? 0 : undefined} defaultValue={defaultValue ?? undefined} className={fieldInput} />
    </label>
  );
}

export function CoverageTab({ cities }: { cities: CoverageCity[] }) {
  const filled = cities.filter((c) => c.memberCount != null);
  const total = filled.reduce((sum, c) => sum + (c.memberCount ?? 0), 0);
  return (
    <div className="flex flex-col gap-5">
      <TabIntro href="/coverage" hrefLabel="Lihat peta Wilayah Naungan">
        Kota naungan PPIT Nanjing. Daftar kota dan batas wilayahnya tetap; yang diisi di sini jumlah mahasiswa, kontak, dan
        catatan tiap kota.
      </TabIntro>
      <p className="text-body-sm tabular-nums text-on-surface-variant">
        {filled.length} dari {cities.length} kota sudah ada angkanya{filled.length > 0 ? `, total ${total} mahasiswa` : ""}.
      </p>
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
        {/* Di layar lebar kepala kolom cukup sekali; di layar sempit tiap isian membawa labelnya sendiri. */}
        <div aria-hidden className={`hidden border-b border-outline-variant px-4 py-2.5 xl:grid ${coverageCols} ${coverageLabel}`}>
          <span>Kota</span>
          <span>Jumlah mahasiswa</span>
          <span>Kontak</span>
          <span>Catatan</span>
          <span />
        </div>
        <ul>
          {cities.map((c) => (
            <li key={c.id} className="border-b border-outline-variant/70 px-4 py-3.5 last:border-b-0">
              <form action={updateCoverageCity} className={`grid grid-cols-1 items-center gap-3 sm:grid-cols-2 ${coverageCols}`}>
                <input type="hidden" name="id" value={c.id} />
                <p className="text-body-md text-on-background sm:col-span-2 xl:col-span-1">{c.label}</p>
                <CoverageInput name="memberCount" label="Jumlah mahasiswa" type="number" defaultValue={c.memberCount} />
                <CoverageInput name="contactInfo" label="Kontak" defaultValue={c.contactInfo} />
                <CoverageInput name="note" label="Catatan" defaultValue={c.note} />
                <SubmitButton
                  successMessage={`${c.label} tersimpan.`}
                  pendingLabel="Menyimpan…"
                  className="justify-self-start rounded-md border border-outline-variant px-4 py-2.5 text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:bg-surface-container-low"
                >
                  Simpan
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
