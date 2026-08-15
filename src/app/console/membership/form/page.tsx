import { asc } from "drizzle-orm";
import { db } from "@/db";
import { membershipFormFields } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { MembershipTabs } from "@/components/console/membership-tabs";
import {
  createFormField,
  deleteFormField,
  initFormFields,
  reorderFormField,
  updateFormField,
} from "@/app/actions/membership";

const FIELD_TYPES = ["text", "textarea", "email", "tel", "number", "select", "date"] as const;

export default async function MembershipFormPage() {
  await requireModuleAccess("membership");

  let rows = await db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  if (rows.length === 0) {
    await initFormFields();
    rows = await db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  }

  return (
    <div className="px-8 py-10">
      <h1 className="text-headline-lg text-on-background mb-2">Formulir Pendaftaran</h1>
      <p className="text-body-md text-on-surface-variant mb-4">
        Atur field form pendaftaran seperti Google Form &mdash; tambah, ubah tipe, wajibkan, urutkan, atau hapus.
        Perubahan langsung berlaku di halaman /join-us.
      </p>
      <MembershipTabs active="form" />

      <form action={createFormField} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-8 flex flex-col gap-4 max-w-2xl">
        <h2 className="text-headline-md text-on-background">Tambah Field Baru</h2>
        <div className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Label</span>
          <input name="label" placeholder="mis. Surat Motivasi (link)" className="bg-soft-gray rounded-md p-3 text-body-md" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tipe</span>
          <select name="type" className="bg-soft-gray rounded-md p-3 text-body-md">
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          Tambah Field
        </button>
      </form>

      <div className="space-y-4">
        {rows.map((f, i) => (
          <div key={f.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <form action={updateFormField} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={f.id} />
              <div className="flex flex-col gap-2">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Label</span>
                <input name="label" defaultValue={f.label} className="bg-soft-gray rounded-md p-3 text-body-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tipe</span>
                  <select name="type" defaultValue={f.type} className="bg-soft-gray rounded-md p-3 text-body-md">
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-body-md text-on-background self-end pb-3">
                  <input type="checkbox" name="required" defaultChecked={f.required} />
                  Wajib diisi
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Placeholder</span>
                <input name="placeholder" defaultValue={f.placeholder ?? ""} className="bg-soft-gray rounded-md p-3 text-body-md" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Teks Bantuan</span>
                <input name="helpText" defaultValue={f.helpText ?? ""} className="bg-soft-gray rounded-md p-3 text-body-md" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Opsi (untuk tipe select, satu per baris)</span>
                <textarea
                  name="options"
                  rows={3}
                  defaultValue={f.options ?? ""}
                  className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
                />
              </div>
              <button
                type="submit"
                className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors"
              >
                Simpan
              </button>
            </form>
            <div className="flex items-center gap-3 mt-4">
              <form action={reorderFormField} className="inline">
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="dir" value="up" />
                <button type="submit" disabled={i === 0} className="bg-soft-gray text-on-background px-3 py-2.5 rounded-md disabled:opacity-40">
                  ↑
                </button>
              </form>
              <form action={reorderFormField} className="inline">
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="dir" value="down" />
                <button type="submit" disabled={i === rows.length - 1} className="bg-soft-gray text-on-background px-3 py-2.5 rounded-md disabled:opacity-40">
                  ↓
                </button>
              </form>
              {!f.isCore && (
                <form action={deleteFormField} className="inline">
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="bg-error-container text-on-error-container text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:opacity-90">
                    Hapus
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
