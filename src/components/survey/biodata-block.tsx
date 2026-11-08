import { Info, UserRound } from "lucide-react";
import type { SurveyBiodata } from "@/db/schema";

// Blok biodata di atas pertanyaan formulir yang meminta biodata. Komponen server:
// "sensus" menampilkan data dari sensus (hanya baca, diambil lagi di server saat
// mengirim), "manual" menampilkan isian biasa. Nama input (bio_*) dibaca
// parseManualBiodata di src/lib/survey.ts.

const inputClass = "w-full bg-soft-gray rounded-md p-3 text-body-md";

export function SurveyBiodataBlock({
  mode,
  sensus,
  defaultName,
  loggedIn,
}: {
  mode: "sensus" | "manual";
  sensus?: SurveyBiodata | null;
  defaultName?: string;
  loggedIn: boolean;
}) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-label-caps uppercase tracking-wide text-on-surface-variant flex items-center gap-2">
        <UserRound size={14} aria-hidden /> Biodata
      </h2>

      {mode === "sensus" && sensus ? (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Item label="Nama" value={sensus.fullName} />
            <Item label="Universitas / instansi" value={sensus.university} />
            <Item label="Kota" value={sensus.city} />
          </dl>
          <p className="flex items-start gap-2 text-body-sm text-on-surface-variant bg-surface-container-low rounded-md px-3 py-2">
            <Info size={15} className="shrink-0 mt-0.5 text-primary-container" aria-hidden />
            Biodata diambil dari sensusmu dan dikirim bersama jawaban. Data sensus lain (paspor, telepon, dan sebagainya)
            tidak ikut.
          </p>
        </>
      ) : (
        <>
          <div id="field-bio_fullName">
            <label htmlFor="bio_fullName" className="block text-body-md text-on-background mb-2">
              Nama lengkap <span className="text-error">*</span>
            </label>
            <input
              id="bio_fullName"
              name="bio_fullName"
              type="text"
              maxLength={120}
              autoComplete="name"
              defaultValue={defaultName}
              className={`${inputClass} sm:max-w-sm`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bio_university" className="block text-body-md text-on-background mb-2">
                Universitas / instansi
              </label>
              <input id="bio_university" name="bio_university" type="text" maxLength={120} className={inputClass} />
            </div>
            <div>
              <label htmlFor="bio_city" className="block text-body-md text-on-background mb-2">
                Kota
              </label>
              <input id="bio_city" name="bio_city" type="text" maxLength={120} className={inputClass} />
            </div>
          </div>
          <p className="flex items-start gap-2 text-body-sm text-on-surface-variant bg-surface-container-low rounded-md px-3 py-2">
            <Info size={15} className="shrink-0 mt-0.5 text-primary-container" aria-hidden />
            {loggedIn
              ? "Sensusmu belum lengkap, jadi biodata diisi sendiri. Kalau sensusmu sudah lengkap, isian ini terisi otomatis dari sensus."
              : "Biodata ini dikirim bersama jawabanmu. Kalau kamu punya akun dan sensusnya sudah lengkap, masuk dulu supaya terisi otomatis."}
          </p>
        </>
      )}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="text-body-lg text-on-background">{value || "—"}</dd>
    </div>
  );
}
