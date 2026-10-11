import { createForm } from "@/app/actions/forms";
import { CheckboxField, SelectField, TextField } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { BPH_FORM_ROLE_LABEL, BPH_FORM_ROLES, FORM_KIND_LABEL, type FormKind } from "@/lib/form-types";

const ERROR_TEXT: Record<string, string> = {
  title: "Judul wajib diisi.",
  event: "Pilih acara dulu.",
  roles: "Pilih minimal satu posisi BPH Acara yang dibuka.",
};

const PLACEHOLDER: Record<FormKind, string> = {
  pemilu: "mis. Pendaftaran Calon Ketua Umum 2027/2028",
  oprek_bph_acara: "mis. Oprek BPH — WIF 2027",
  oprek_kepanitiaan: "mis. Oprek Kepanitiaan — WIF 2027",
};

// Kartu "Buat Formulir Baru" untuk tab Pemilu / Oprek BPH / Oprek Kepanitiaan.
// Server component: form langsung memanggil Server Action createForm yang
// memeriksa hak akses per jenis form. Error validasi dikirim balik lewat
// query `?error=` oleh action (pola paling sederhana untuk form console).
export function FormCreate({
  kind,
  events,
  error,
}: {
  kind: FormKind;
  events?: { id: string; title: string; status: string }[];
  error?: string | null;
}) {
  const message = error ? ERROR_TEXT[error] : null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-8">
      <h2 className="text-headline-md text-on-background mb-1">Buat {FORM_KIND_LABEL[kind]}</h2>
      <p className="text-body-sm text-on-surface-variant mb-4">
        {kind === "pemilu" &&
          "Formulir pendaftaran calon. Hanya bisa diisi pengurus kabinet; pertanyaan disusun setelah form dibuat."}
        {kind === "oprek_bph_acara" &&
          "Rekrut BPH Acara untuk satu acara/proker. Pilih acara dan posisi yang dibuka; pertanyaan disusun setelah form dibuat."}
        {kind === "oprek_kepanitiaan" &&
          "Rekrut panitia acara. Pilih acara tempatmu BPH Acara; divisi pilihan pelamar diambil dari Struktur Kepanitiaan acara itu."}
      </p>

      {message && (
        <p className="text-body-md text-error bg-error-container/30 rounded-md px-4 py-2 mb-4">{message}</p>
      )}

      <form action={createForm} className="flex flex-col gap-4">
        <input type="hidden" name="kind" value={kind} />

        <TextField name="title" label="Judul formulir" required placeholder={PLACEHOLDER[kind]} />

        {events && (
          <SelectField
            name="eventId"
            label="Acara"
            required
            placeholder="Pilih acara"
            options={events.map((e) => ({
              value: e.id,
              label: e.status === "completed" || e.status === "cancelled" ? `${e.title} (selesai)` : e.title,
            }))}
          />
        )}

        {kind === "oprek_bph_acara" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-1">
              Posisi BPH Acara yang dibuka
            </legend>
            {BPH_FORM_ROLES.map((role) => (
              <CheckboxField
                key={role}
                name="bphRole"
                value={role}
                defaultChecked={role === "ketua"}
                label={BPH_FORM_ROLE_LABEL[role] ?? role}
                className="text-body-md text-on-background"
              />
            ))}
            <p className="text-body-sm text-on-surface-variant">
              Yang diterima lewat form ini otomatis tercatat sebagai BPH Acara di acara tersebut.
            </p>
          </fieldset>
        )}

        <SubmitButton className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60">
          Buat Formulir
        </SubmitButton>
      </form>
    </div>
  );
}
