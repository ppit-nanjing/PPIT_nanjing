import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, users, certificates } from "@/db/schema";
import { requireModuleAccess, hasModuleAccess } from "@/lib/admin-scope";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import {
  getWorkLedger,
  assignCommittee,
  removeCommittee,
  issueCertificate,
  deleteCertificate,
  updateCertificateFileUrl,
  listPendingPayments,
} from "@/app/actions/committee";
import { PAYMENT_STATUS_LABEL } from "@/lib/payment-status-labels";
import { Field, TextField, SelectField, FormActions, primaryBtn, fieldInput } from "@/components/console/form";
import { ConfirmButton } from "@/components/console/confirm-button";

// Peran penugasan baru. humas/acara/logistik/dokumentasi sengaja tidak ada:
// itu nama DIVISI, bukan peran - di skema nilainya tinggal demi baris lama.
const ROLES = ["ketua", "wakil", "sekretaris", "bendahara", "supervisor", "anggota"];

export default async function WorkLedgerPage() {
  const session = await requireModuleAccess("events");
  // Payment verification is financial data, gated on "organization" - not
  // everyone with ordinary "events" access should see proof/status here.
  const canVerifyPayments = hasModuleAccess(session.user.adminScope, "organization");

  const [ledger, eventList, userList, payments, certRows] = await Promise.all([
    getWorkLedger(),
    db
      .select({ id: events.id, title: events.title, startAt: events.startAt })
      .from(events)
      // NULLS LAST keeps unscheduled events from crowding the dropdown top.
      .orderBy(sql`${events.startAt} desc nulls last`),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(asc(users.name)),
    canVerifyPayments ? listPendingPayments() : Promise.resolve([]),
    db
      .select({
        id: certificates.id,
        title: certificates.title,
        kind: certificates.kind,
        fileUrl: certificates.fileUrl,
        issuedAt: certificates.issuedAt,
        holder: users.name,
        eventTitle: events.title,
      })
      .from(certificates)
      .leftJoin(users, eq(certificates.userId, users.id))
      .leftJoin(events, eq(certificates.eventId, events.id))
      .orderBy(desc(certificates.issuedAt)),
  ]);

  const overloaded = ledger.filter((p) => p.assignments.length >= 3);
  const guide = await getGuide("work-ledger");

  // Verification itself happens on each event's own page (has the note field,
  // fee/instructions context) - this is just a cross-event "where's my
  // attention needed" pointer, not a second copy of that form.
  const paymentsByEvent = new Map<string, { eventTitle: string; submitted: number; total: number }>();
  for (const p of payments) {
    if (!p.eventId) continue;
    const cur = paymentsByEvent.get(p.eventId) ?? { eventTitle: p.eventTitle ?? "(acara tanpa judul)", submitted: 0, total: 0 };
    cur.total += 1;
    if (p.status === "submitted") cur.submitted += 1;
    paymentsByEvent.set(p.eventId, cur);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Work Ledger</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="work-ledger" />}
      </div>
      <p className="text-body-md text-on-surface-variant mb-6 max-w-3xl">
        Siapa jadi panitia di acara apa. Peran di sini berlaku <strong className="text-on-background">per acara</strong>{" "}
        &mdash; bendahara sebuah acara tidak harus bendahara kabinet.
      </p>

      {overloaded.length > 0 && (
        <div className="bg-tertiary-container/25 border border-outline-variant rounded-xl p-4 mb-6 max-w-3xl">
          <p className="text-body-md text-on-background">
            <strong>{overloaded.length} orang</strong> memegang 3 kepanitiaan atau lebih:{" "}
            {overloaded.map((p) => p.name).join(", ")}.
          </p>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Cek apakah beban tugasnya masih wajar sebelum menambah penugasan baru.
          </p>
        </div>
      )}

      {/* ---------- Tugaskan panitia ---------- */}
      <CollapsibleSection title="Tugaskan Panitia" className="mb-6" defaultOpen={false}>
        <form action={assignCommittee} className="flex flex-col gap-3 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Acara" required>
              <select name="eventId" required defaultValue="" className={fieldInput}>
                <option value="" disabled>Pilih acara…</option>
                {eventList.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Orang" required>
              <select name="userId" required defaultValue="" className={fieldInput}>
                <option value="" disabled>Pilih orang…</option>
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            </Field>
            <SelectField
              name="role"
              label="Peran di acara ini"
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
            <TextField name="note" label="Catatan tugas" placeholder="mis. PJ konsumsi" />
          </div>
          <p className="text-xs text-on-surface-variant">
            Menugaskan orang yang sama dua kali di satu acara akan mengubah perannya, bukan menambah baris.
          </p>
          <FormActions>
            <button type="submit" className={primaryBtn}>Tugaskan</button>
          </FormActions>
        </form>
      </CollapsibleSection>

      {/* ---------- Ledger ---------- */}
      <CollapsibleSection title="Beban Kepanitiaan" description={`${ledger.length} orang tercatat`} className="mb-6">
        {ledger.length === 0 ? (
          <p className="text-body-md text-on-surface-variant py-4">Belum ada penugasan panitia.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ledger.map((p) => (
              <li key={p.userId} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <p className="text-body-lg text-on-background">{p.name}</p>
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                    {p.assignments.length} kepanitiaan
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {p.assignments.map((a) => (
                    <li key={a.assignmentId} className="flex items-center justify-between gap-3 text-body-md">
                      <span className="text-on-surface-variant min-w-0">
                        <span className="text-on-background">{a.eventTitle ?? "(acara dihapus)"}</span>
                        {" — "}
                        {a.role}
                        {a.note ? ` · ${a.note}` : ""}
                      </span>
                      <ConfirmButton
                        title="Lepas penugasan?"
                        message={`${p.name} dilepas dari "${a.eventTitle ?? "(acara dihapus)"}" sebagai ${a.role}.`}
                        confirmLabel="Ya, lepas"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", a.assignmentId);
                          await removeCommittee(fd);
                        }}
                        className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-2 py-1 rounded shrink-0"
                      >
                        Lepas
                      </ConfirmButton>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* ---------- Pembayaran ---------- */}
      {canVerifyPayments && (
      <CollapsibleSection
        title="Pembayaran Acara"
        description={`${payments.filter((p) => p.status === "submitted").length} menunggu diperiksa`}
        className="mb-6"
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          Peserta mengirim bukti transfer, bendahara acara memverifikasi &mdash; dari halaman acara masing-masing
          (ada kolom catatan di sana). Daftar ini cuma penunjuk lintas-acara supaya tidak ada yang kelewat.
        </p>
        {paymentsByEvent.size === 0 ? (
          <p className="text-body-md text-on-surface-variant py-4">
            Belum ada acara berbayar. Aktifkan &ldquo;Kegiatan berbayar (HTM)&rdquo; pada sebuah acara untuk
            mengaktifkan alur ini.
          </p>
        ) : (
          <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
            {[...paymentsByEvent.entries()].map(([eventId, e]) => (
              <li key={eventId} className="border-b border-outline-variant/60 py-4 last:border-0">
                <a
                  href={`/console/events/${eventId}`}
                  className="flex items-center justify-between gap-3 hover:text-primary-container transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-body-md text-on-background truncate">{e.eventTitle}</p>
                    <p className="text-label-caps text-on-surface-variant">
                      {e.total} laporan pembayaran
                      {e.submitted > 0 ? ` · ${e.submitted} ${PAYMENT_STATUS_LABEL.submitted.toLowerCase()}` : ""}
                    </p>
                  </div>
                  <span className="text-label-caps uppercase tracking-wide text-primary-container shrink-0">
                    Lihat &amp; verifikasi &rarr;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
      )}

      {/* ---------- Sertifikat ---------- */}
      <CollapsibleSection title="Sertifikat" description={`${certRows.length} diterbitkan`} className="mb-6" defaultOpen={false}>
        <form action={issueCertificate} className="flex flex-col gap-3 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Penerima" required>
              <select name="userId" required defaultValue="" className={fieldInput}>
                <option value="" disabled>Pilih orang…</option>
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            </Field>
            <Field label="Acara (opsional)">
              <select name="eventId" defaultValue="" className={fieldInput}>
                <option value="">—</option>
                {eventList.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </Field>
            <SelectField
              name="kind"
              label="Jenis"
              options={[
                { value: "peserta", label: "Peserta" },
                { value: "panitia", label: "Panitia" },
                { value: "pemateri", label: "Pemateri" },
                { value: "lainnya", label: "Lainnya" },
              ]}
            />
            <TextField name="title" label="Judul" required placeholder="Sertifikat Panitia Welcoming Party" />
          </div>
          <TextField
            name="fileUrl"
            label="Tautan berkas"
            hint="Boleh tautan Google Drive — bisa juga diisi belakangan dari daftar di bawah."
            placeholder="https://drive.google.com/…"
          />
          <FormActions>
            <button type="submit" className={primaryBtn}>Terbitkan Sertifikat</button>
          </FormActions>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {certRows.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada sertifikat.</li>
          ) : (
            certRows.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/60 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-body-md text-on-background">{c.title}</p>
                  <p className="text-label-caps text-on-surface-variant">
                    {c.holder ?? "?"} · {c.kind}
                    {c.eventTitle ? ` · ${c.eventTitle}` : ""}
                    {c.fileUrl ? " · berkas tertaut" : " · tanpa berkas"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <form action={updateCertificateFileUrl} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="fileUrl"
                      defaultValue={c.fileUrl ?? ""}
                      placeholder="tautan berkas (Drive)…"
                      className="bg-soft-gray rounded-md p-2 text-body-md w-44"
                    />
                    <button
                      type="submit"
                      className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors"
                    >
                      Simpan
                    </button>
                  </form>
                  <ConfirmButton
                    title="Hapus sertifikat?"
                    message={`Sertifikat "${c.title}" (${c.holder ?? "?"}) dihapus permanen dari ledger.`}
                    onConfirm={async () => {
                      const fd = new FormData();
                      fd.set("id", c.id);
                      await deleteCertificate(fd);
                    }}
                    className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-1.5 rounded-md"
                  >
                    Hapus
                  </ConfirmButton>
                </div>
              </li>
            ))
          )}
        </ul>
      </CollapsibleSection>
    </div>
  );
}
