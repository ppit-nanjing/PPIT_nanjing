import Link from "next/link";
import { restoreForm, unarchiveForm } from "@/app/actions/form-lifecycle";
import { deleteSurveyPermanently } from "@/app/actions/survey";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import type { SurveyListRow } from "@/lib/survey-access";

const when = (d: Date | null) =>
  d ? new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }) : "";

const rowClass =
  "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3";
const quietBtn =
  "text-label-caps uppercase tracking-wide px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors";
const dangerBtn =
  "text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors";

const meta = (r: SurveyListRow) => [r.eventTitle ?? "Khusus kabinet", `${r.responseCount} jawaban`].join(" · ");

// Bagian Arsip dan Sampah di bawah daftar Formulir Kustom (pola yang sama dengan Sampah Kegiatan). `canPurge` =
// BPH Kabinet atau pemegang modul Formulir; yang lain hanya bisa memulihkan.
export function SurveyShelf({
  archived,
  trashed,
  canPurge,
}: {
  archived: SurveyListRow[];
  trashed: SurveyListRow[];
  canPurge: boolean;
}) {
  return (
    <div className="mt-8 flex flex-col gap-4">
      <CollapsibleSection
        title={`Arsip${archived.length > 0 ? ` (${archived.length})` : ""}`}
        description="Formulir yang sudah selesai: ditutup dan tidak tampil di daftar aktif, tapi jawabannya tetap bisa dibuka dan diekspor."
        defaultOpen={false}
      >
        <div className="flex flex-col gap-2">
          {archived.length === 0 && <p className="text-body-md text-on-surface-variant">Arsip kosong.</p>}
          {archived.map((r) => (
            <div key={r.id} className={rowClass}>
              <Link href={`/formulir/${r.id}`} className="min-w-0 hover:underline">
                <span className="block text-body-md font-medium text-on-background truncate">{r.title}</span>
                <span className="block text-body-sm text-on-surface-variant truncate">
                  {meta(r)} · Diarsipkan {when(r.archivedAt)}
                </span>
              </Link>
              <div className="self-end sm:self-auto sm:shrink-0">
                <ConfirmButton
                  title="Keluarkan dari Arsip?"
                  message={`"${r.title}" kembali ke daftar aktif dalam keadaan Tutup. Buka lagi di Pengaturan kalau mau menerima jawaban.`}
                  confirmLabel="Ya, keluarkan"
                  action={unarchiveForm}
                  payload={{ id: r.id }}
                  danger={false}
                  successMessage="Formulir dikeluarkan dari Arsip."
                  className={quietBtn}
                >
                  Keluarkan
                </ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title={`Sampah${trashed.length > 0 ? ` (${trashed.length})` : ""}`}
        description="Formulir yang dihapus. Tidak bisa dibuka siapa pun dan tautannya tidak berfungsi, tapi pertanyaan dan jawabannya utuh. Pulihkan untuk mengembalikannya dalam keadaan Tutup."
        defaultOpen={false}
      >
        <div className="flex flex-col gap-2">
          {trashed.length === 0 && <p className="text-body-md text-on-surface-variant">Sampah kosong.</p>}
          {trashed.map((r) => (
            <div key={r.id} className={rowClass}>
              <div className="min-w-0">
                <p className="text-body-md font-medium text-on-background truncate">{r.title}</p>
                <p className="text-body-sm text-on-surface-variant">
                  {meta(r)} · Dihapus {when(r.deletedAt)}
                  {r.deletedByName ? ` oleh ${r.deletedByName}` : ""}
                </p>
              </div>
              <div className="self-end sm:self-auto flex items-center gap-2 sm:shrink-0">
                <ConfirmButton
                  title="Pulihkan formulir?"
                  message={`"${r.title}" kembali ke daftar${r.archivedAt ? " Arsip" : " aktif"} dalam keadaan Tutup.`}
                  confirmLabel="Ya, pulihkan"
                  action={restoreForm}
                  payload={{ id: r.id }}
                  danger={false}
                  successMessage="Formulir dipulihkan."
                  className={quietBtn}
                >
                  Pulihkan
                </ConfirmButton>
                {canPurge && (
                  <ConfirmButton
                    title="Hapus permanen?"
                    message={`"${r.title}" beserta semua pertanyaan dan jawabannya (${r.responseCount} jawaban) dihapus selamanya, termasuk Google Sheet langsungnya. Tindakan ini TIDAK bisa dibatalkan.`}
                    confirmLabel="Ya, hapus permanen"
                    action={deleteSurveyPermanently}
                    payload={{ id: r.id }}
                    successMessage="Formulir dihapus permanen."
                    className={dangerBtn}
                  >
                    Hapus Permanen
                  </ConfirmButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
