import { Upload } from "lucide-react";
import { Select } from "@/components/console/form";
import { FileUpload } from "@/components/upload/file-upload";

/**
 * Field pertanyaan pendaftaran kustom sebuah acara — SATU sumber untuk dua
 * tempat: form pendaftaran publik (register page) dan pratinjau di console.
 * `preview` menonaktifkan semua kontrol dan mengganti uploader berkas dengan
 * kotak contoh, supaya tidak ada apa pun yang bisa terkirim/terunggah dari
 * pratinjau.
 */
export type EventQuestionRow = {
  id: string;
  label: string;
  type: string;
  options: string | null;
  required: boolean;
};

const FIELD_CLASS =
  "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container disabled:opacity-60";

export function EventQuestionFields({
  questions,
  preview = false,
  fileHint,
}: {
  questions: EventQuestionRow[];
  preview?: boolean;
  fileHint?: string;
}) {
  return (
    <>
      {questions.map((q) => {
        const options = (q.options ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
        return (
          <fieldset key={q.id} className="flex flex-col gap-2 text-left border-0 p-0 m-0">
            <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant p-0">
              {q.label}
              {q.required && (
                <span className="text-error" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </legend>
            {q.type === "text" && (
              <input name={q.id} required={q.required && !preview} disabled={preview} className={FIELD_CLASS} />
            )}
            {q.type === "textarea" && (
              <textarea
                name={q.id}
                required={q.required && !preview}
                disabled={preview}
                rows={3}
                className={`${FIELD_CLASS} resize-none`}
              />
            )}
            {q.type === "select" && (
              <Select
                name={q.id}
                required={q.required && !preview}
                disabled={preview}
                defaultValue=""
                placeholder="—"
                className="w-full"
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            )}
            {q.type === "file" &&
              (preview ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-outline-variant bg-soft-gray px-3 py-4 text-body-sm text-on-surface-variant">
                  <Upload size={14} aria-hidden="true" /> {fileHint ?? "Unggah berkas (pratinjau)"}
                </div>
              ) : (
                <FileUpload
                  name={q.id}
                  folder="event-doc"
                  required={q.required}
                  autoUpload
                  accept="application/pdf,.doc,.docx,image/*"
                  hint={fileHint}
                />
              ))}
            {(q.type === "radio" || q.type === "multiselect") &&
              options.map((o) => (
                <label
                  key={o}
                  className={`flex items-center gap-2 bg-soft-gray rounded-md p-2.5 text-body-md ${
                    preview ? "cursor-default opacity-70" : "cursor-pointer"
                  }`}
                >
                  <input
                    type={q.type === "radio" ? "radio" : "checkbox"}
                    name={q.id}
                    value={o}
                    required={q.required && q.type === "radio" && !preview}
                    disabled={preview}
                    className="h-4 w-4 accent-[var(--color-primary-container)]"
                  />
                  {o}
                </label>
              ))}
          </fieldset>
        );
      })}
    </>
  );
}
