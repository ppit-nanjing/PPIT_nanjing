import { createSurvey } from "@/app/actions/survey";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import type { SurveyEventOption } from "@/lib/survey-access";

const ERROR_TEXT: Record<string, string> = {
  title: "Judul formulir wajib diisi (maksimal 150 karakter).",
  event: "Acara itu tidak valid atau kamu tidak punya akses untuk memasang formulir di sana.",
};

// Kartu "Buat Formulir". Komponen server: form memanggil Server Action createSurvey
// yang memeriksa haknya sendiri; galat validasi kembali lewat ?error=.
export function SurveyCreate({
  events,
  canCreateUnbound,
  error,
}: {
  events: SurveyEventOption[];
  canCreateUnbound: boolean;
  error?: string;
}) {
  const eventOptions = [
    ...(canCreateUnbound ? [{ value: "", label: "Tanpa acara (khusus kabinet)" }] : []),
    ...events.map((e) => ({ value: e.id, label: e.title })),
  ];

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6">
      <h2 className="text-headline-md text-on-background mb-1">Buat formulir kustom</h2>
      <p className="text-body-md text-on-surface-variant mb-5">
        Formulir dibuat sebagai draf. Susun pertanyaannya dulu, baru dibuka untuk diisi.
      </p>

      {error && ERROR_TEXT[error] && (
        <p role="alert" className="text-body-md text-error bg-error-container/30 rounded-md px-4 py-3 mb-5">
          {ERROR_TEXT[error]}
        </p>
      )}

      {eventOptions.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          Kamu belum jadi panitia acara mana pun, jadi belum ada acara yang bisa dipasangi formulir.
        </p>
      ) : (
        <form action={createSurvey} className="flex flex-col gap-4">
          <TextField name="title" label="Judul formulir" required placeholder="mis. Riset pasar makanan Indonesia" />
          <TextAreaField
            name="description"
            label="Deskripsi (opsional)"
            rows={3}
            placeholder="Tujuan formulir dan perkiraan lama mengisi."
          />
          <SelectField
            name="eventId"
            label="Terikat acara"
            defaultValue=""
            options={eventOptions}
            hint={
              canCreateUnbound
                ? "Formulir acara bisa dilihat BPH Panitia acara itu. Tanpa acara, hanya dilihat pembuatnya dan BPH kabinet."
                : "Kamu panitia, jadi formulir dipasang di salah satu acaramu."
            }
          />
          <div className="flex flex-col gap-2">
            <CheckboxField
              name="allowPublic"
              label="Boleh diisi tanpa login"
              hint="Siapa pun yang punya tautan bisa mengisi, dan tidak ada batas satu jawaban per orang. Cocok untuk riset pasar ke luar komunitas."
              className="text-body-md text-on-background"
            />
            <CheckboxField
              name="collectBiodata"
              label="Minta biodata responden (nama, universitas, kota)"
              hint="Akun dengan sensus lengkap terisi otomatis dari sensus. Selain itu responden mengisi sendiri."
              className="text-body-md text-on-background"
            />
          </div>
          <div>
            <SubmitButton
              successMessage=""
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
            >
              Buat formulir
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
