import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, users, certificates } from "@/db/schema";
import { requireModuleAccess, hasModuleAccess } from "@/lib/admin-scope";
import { getScopedEventIds } from "@/lib/event-access";
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
import { Field, TextField, SelectField, Select, FormActions, primaryBtn } from "@/components/console/form";
import { ConfirmButton } from "@/components/console/confirm-button";
import { SubmitButton } from "@/components/console/submit-button";

// Peran penugasan baru. humas/acara/logistik/dokumentasi sengaja tidak ada:
// itu nama DIVISI, bukan peran - di skema nilainya tinggal demi baris lama.
const ROLES = ["ketua", "wakil", "sekretaris", "bendahara", "supervisor", "anggota"];

export default async function WorkLedgerPage() {
  const session = await requireModuleAccess("events");
  // Payment verification is financial data, gated on "organization" - not
  // everyone with ordinary "events" access should see proof/status here.
  const canVerifyPayments = hasModuleAccess(session.user.adminScope, "organization");

  // Akses modul Kegiatan kini spesifik per acara: pemegang scope "events"
  // non-full hanya melihat acara yang dia buat / divisinya jadi PJ. Work Ledger
  // ikut dibatasi supaya tidak jadi jalan pintas lintas-acara.
  const scopedEventIds = await getScopedEventIds();

  const [ledger, eventList, userList, payments, certRows] = await Promise.all([
    getWorkLedger(),
    // Dropdown acara untuk menugaskan panitia: hanya acara yang tidak di
    // Sampah, dan (untuk non-full) yang boleh dilihat pemakai ini.
    scopedEventIds === null
      ? db
          .select({ id: events.id, title: events.title, startAt: events.startAt })
          .from(events)
          .where(isNull(events.deletedAt))
          .orderBy(sql`${events.startAt} desc nulls last`)
      : scopedEventIds.length > 0
        ? db
            .select({ id: events.id, title: events.title, startAt: events.startAt })
            .from(events)
            .where(and(inArray(events.id, scopedEventIds), isNull(events.deletedAt)))
            .orderBy(sql`${events.startAt} desc nulls last`)
        : Promise.resolve([] as { id: string; title: string; startAt: Date | null }[]),
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
      // Sertifikat tanpa acara (lama/manual) tetap tampil; yang terikat acara
      // dibatasi ke acara yang boleh dilihat.
      .where(
        scopedEventIds === null
          ? undefined
          : or(isNull(certificates.eventId), inArray(certificates.eventId, scopedEventIds)),
      )
      .orderBy(desc(certificates.issuedAt)),
  ]);

  const guide = await getGuide("work-ledger");

  // "Selesai" = acara ditandai completed/cancelled ATAU waktu selesainya (atau
  // waktu mulai bila tidak ada waktu selesai) sudah lewat — acara beberapa hari
  // tetap aktif sampai hari terakhirnya. Kepanitiaan selesai dipisah dari beban aktif: tetap tampil sebagai
  // riwayat, tapi tidak menambah hitungan "kepanitiaan" maupun peringatan beban.
  // eslint-disable-next-line react-hooks/purity -- current time dibutuhkan untuk menentukan acara lampau; server component.
  const now = Date.now();
  const isEventDone = (a: { eventStatus: string | null; eventStartAt: Date | null; eventEndAt: Date | null }) =>
    a.eventStatus === "completed" ||
    a.eventStatus === "cancelled" ||
    ((a.eventEndAt ?? a.eventStartAt) != null && new Date((a.eventEndAt ?? a.eventStartAt)!).getTime() < now);
  const people = ledger
    .map((p) => {
      const active = p.assignments.filter((a) => !isEventDone(a));
      const done = p.assignments.filter((a) => isEventDone(a));
      return { ...p, active, done, activeCount: active.length };
    })
    .sort((a, b) => b.activeCount - a.activeCount || b.assignments.length - a.assignments.length);
  const overloadedActive = people.filter((p) => p.activeCount >= 3);

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

      {overloadedActive.length > 0 && (
        <div className="bg-tertiary-container/10 border border-outline-variant rounded-xl p-4 mb-6 max-w-3xl">
          <p className="text-body-md text-on-background">
            <strong>{overloadedActive.length} orang</strong> memegang 3 kepanitiaan aktif atau lebih:{" "}
            {overloadedActive.map((p) => p.name).join(", ")}.
          </p>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Cek apakah beban tugasnya masih wajar sebelum menambah penugasan baru. Acara yang sudah selesai tidak
            dihitung.
          </p>
        </div>
      )}

      {/* ---------- Tugaskan panitia ---------- */}
      <CollapsibleSection title="Tugaskan Panitia" className="mb-6" defaultOpen={false}>
        <form action={assignCommittee} className="flex flex-col gap-3 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Acara" required>
              <Select name="eventId" required defaultValue="" placeholder="Pilih acara…" className="w-full">
                {eventList.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="Orang" required>
              <Select name="userId" required defaultValue="" placeholder="Pilih orang…" className="w-full">
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </Select>
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
            <SubmitButton successMessage="Panitia ditugaskan." className={primaryBtn}>Tugaskan</SubmitButton>
          </FormActions>
        </form>
      </CollapsibleSection>

      {/* ---------- Ledger ---------- */}
      <CollapsibleSection
        title="Beban Kepanitiaan"
        description={`${people.length} orang tercatat · acara selesai dipisah & tidak menambah beban`}
        className="mb-6"
      >
        {people.length === 0 ? (
          <p className="text-body-md text-on-surface-variant py-4">Belum ada penugasan panitia.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {people.map((p) => (
              <li key={p.userId} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <p className="text-body-lg text-on-background">{p.name}</p>
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                    {p.activeCount} kepanitiaan aktif
                    {p.done.length > 0 ? ` · ${p.done.length} selesai` : ""}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {[...p.active, ...p.done].map((a) => {
                    const done = p.done.includes(a);
                    return (
                      <li
                        key={a.assignmentId}
                        className={`flex items-center justify-between gap-3 text-body-md ${
                          done ? "opacity-60" : ""
                        }`}
                      >
                        <span className="text-on-surface-variant min-w-0">
                          {done && (
                            <span className="inline-block align-middle mr-2 text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded">
                              Selesai
                            </span>
                          )}
                          <span className="text-on-background">{a.eventTitle ?? "(acara dihapus)"}</span>
                          {" — "}
                          {a.role}
                          {a.note ? ` · ${a.note}` : ""}
                        </span>
                        <ConfirmButton
                          title="Lepas penugasan?"
                          message={`${p.name} dilepas dari "${a.eventTitle ?? "(acara dihapus)"}" sebagai ${a.role}.`}
                          confirmLabel="Ya, lepas"
                          action={removeCommittee}
                          payload={{ id: a.assignmentId }}
                          className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-2 py-1 rounded shrink-0"
                        >
                          Lepas
                        </ConfirmButton>
                      </li>
                    );
                  })}
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
              <Select name="userId" required defaultValue="" placeholder="Pilih orang…" className="w-full">
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </Select>
            </Field>
            <Field label="Acara (opsional)">
              <Select name="eventId" defaultValue="" className="w-full">
                <option value="">—</option>
                {eventList.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </Select>
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
            required
            hint="Wajib, alamat https://… — sertifikat tidak terbit tanpa tautan berkas. Pilih penyimpanan yang bisa dibuka dari Tiongkok (Google Drive sering terblokir tanpa VPN)."
            placeholder="https://…"
          />
          <FormActions>
            <SubmitButton successMessage="Sertifikat diterbitkan." className={primaryBtn}>Terbitkan Sertifikat</SubmitButton>
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
                    <SubmitButton
                      successMessage="Tautan berkas tersimpan."
                      className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors"
                    >
                      Simpan
                    </SubmitButton>
                  </form>
                  <ConfirmButton
                    title="Hapus sertifikat?"
                    message={`Sertifikat "${c.title}" (${c.holder ?? "?"}) dihapus permanen dari ledger.`}
                    action={deleteCertificate}
                    payload={{ id: c.id }}
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
