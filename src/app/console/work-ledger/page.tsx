import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, users, certificates } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import {
  getWorkLedger,
  assignCommittee,
  removeCommittee,
  issueCertificate,
  deleteCertificate,
  listPendingPayments,
  updatePaymentStatus,
} from "@/app/actions/committee";

const input = "bg-soft-gray rounded-md p-3 text-body-md";
const lbl = "text-label-caps uppercase tracking-wide text-on-surface-variant";
const btn =
  "self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest";

const ROLES = ["ketua", "wakil", "sekretaris", "bendahara", "humas", "acara", "logistik", "dokumentasi", "anggota"];
const PAYMENT_LABEL: Record<string, string> = {
  not_required: "Tidak perlu bayar",
  unpaid: "Belum bayar",
  submitted: "Bukti dikirim",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export default async function WorkLedgerPage() {
  await requireModuleAccess("events");

  const [ledger, eventList, userList, payments, certRows] = await Promise.all([
    getWorkLedger(),
    db.select({ id: events.id, title: events.title, startAt: events.startAt }).from(events).orderBy(desc(events.startAt)),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(asc(users.name)),
    listPendingPayments(),
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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Work Ledger</h1>
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
        <form action={assignCommittee} className="flex flex-col gap-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={lbl}>Acara *</span>
              <select name="eventId" required className={input}>
                <option value="">Pilih acara&hellip;</option>
                {eventList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={lbl}>Pengurus *</span>
              <select name="userId" required className={input}>
                <option value="">Pilih orang&hellip;</option>
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={lbl}>Peran di acara ini</span>
              <select name="role" className={input}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={lbl}>Catatan tugas</span>
              <input name="note" placeholder="mis. PJ konsumsi" className={input} />
            </label>
          </div>
          <p className="text-label-caps text-on-surface-variant">
            Menugaskan orang yang sama dua kali di satu acara akan mengubah perannya, bukan menambah baris.
          </p>
          <button type="submit" className={btn}>
            Tugaskan
          </button>
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
                      <form action={removeCommittee}>
                        <input type="hidden" name="id" value={a.assignmentId} />
                        <button
                          type="submit"
                          className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-2 py-1 rounded shrink-0"
                        >
                          Lepas
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* ---------- Pembayaran ---------- */}
      <CollapsibleSection
        title="Verifikasi Pembayaran"
        description={`${payments.filter((p) => p.status === "submitted").length} menunggu diperiksa`}
        className="mb-6"
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          Peserta mengirim bukti transfer, bendahara acara memverifikasi. Situs tidak memproses pembayaran
          &mdash; Alipay/WeChat Pay butuh merchant account berbadan hukum Tiongkok.
        </p>
        {payments.length === 0 ? (
          <p className="text-body-md text-on-surface-variant py-4">
            Belum ada acara berbayar. Isi &ldquo;Biaya&rdquo; pada sebuah acara untuk mengaktifkan alur ini.
          </p>
        ) : (
          <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
            {payments.map((p) => (
              <li key={p.id} className="border-b border-outline-variant/60 py-4 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-md text-on-background">{p.name ?? p.email}</p>
                    <p className="text-label-caps text-on-surface-variant">
                      {p.eventTitle} · {PAYMENT_LABEL[p.status] ?? p.status}
                    </p>
                    {p.proofUrl && (
                      <a
                        href={p.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-label-caps uppercase tracking-wide text-primary-container hover:underline"
                      >
                        Lihat bukti
                      </a>
                    )}
                  </div>
                  <form action={updatePaymentStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <select name="paymentStatus" defaultValue={p.status} className="bg-soft-gray rounded-md p-2 text-body-md">
                      {Object.entries(PAYMENT_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
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
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* ---------- Sertifikat ---------- */}
      <CollapsibleSection title="Sertifikat" description={`${certRows.length} diterbitkan`} className="mb-6" defaultOpen={false}>
        <form action={issueCertificate} className="flex flex-col gap-4 max-w-2xl mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className={lbl}>Penerima *</span>
              <select name="userId" required className={input}>
                <option value="">Pilih orang&hellip;</option>
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={lbl}>Acara (opsional)</span>
              <select name="eventId" className={input}>
                <option value="">&mdash;</option>
                {eventList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={lbl}>Jenis</span>
              <select name="kind" className={input}>
                <option value="peserta">Peserta</option>
                <option value="panitia">Panitia</option>
                <option value="pemateri">Pemateri</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={lbl}>Judul *</span>
              <input name="title" required placeholder="Sertifikat Panitia Welcoming Party" className={input} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className={lbl}>Tautan berkas</span>
            <input name="fileUrl" placeholder="https://drive.google.com/…" className={input} />
            <span className="text-label-caps text-on-surface-variant">
              Boleh tautan Google Drive &mdash; unggahan langsung belum aktif (Vercel Blob belum disetel).
            </span>
          </label>
          <button type="submit" className={btn}>
            Terbitkan Sertifikat
          </button>
        </form>

        <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
          {certRows.length === 0 ? (
            <li className="py-4 text-body-md text-on-surface-variant">Belum ada sertifikat.</li>
          ) : (
            certRows.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 border-b border-outline-variant/60 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-body-md text-on-background">{c.title}</p>
                  <p className="text-label-caps text-on-surface-variant">
                    {c.holder ?? "?"} · {c.kind}
                    {c.eventTitle ? ` · ${c.eventTitle}` : ""}
                  </p>
                </div>
                <form action={deleteCertificate}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-1.5 rounded-md"
                  >
                    Hapus
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </CollapsibleSection>
    </div>
  );
}
