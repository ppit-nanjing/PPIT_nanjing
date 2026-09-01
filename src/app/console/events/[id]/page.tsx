import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { certificates, events, eventDivisions, eventFeeOptions, eventQuestions, eventRegistrations, eventVolunteers, sensusProfiles, users } from "@/db/schema";
import { MEMBERSHIP_LABEL, effectiveBranch, membershipStatus } from "@/lib/membership-status";
import { updateEvent, saveEventQuestion, deleteEventQuestion, saveFeeOption, deleteFeeOption } from "@/app/actions/admin-events";
import { setVolunteerStatus } from "@/app/actions/volunteers";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { RegistrationList } from "@/components/console/registration-list";
import { EventCommitteeStructure } from "@/components/console/event-committee-structure";
import { listEventDivisions, updatePaymentStatus, issueParticipantCertificates } from "@/app/actions/committee";
import { requireModuleAccess, hasModuleAccess } from "@/lib/admin-scope";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { EventThemeFields } from "@/components/console/event-theme-fields";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { HtmFields } from "@/components/console/htm-fields";
import { Select, CheckboxField, CheckField } from "@/components/console/form";
import { PAYMENT_STATUS_LABEL } from "@/lib/payment-status-labels";
import { checkInBlockReason } from "@/lib/event-checkin";
import { toDateLocalInput } from "@/lib/datetime";
import { ConfirmButton } from "@/components/console/confirm-button";
import { ProofView } from "@/components/console/proof-view";
import { Download } from "lucide-react";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "Teks Pendek",
  textarea: "Teks Panjang",
  select: "Dropdown",
  radio: "Pilihan (radio)",
  multiselect: "Pilih Banyak (centang)",
  file: "Unggah Berkas (PDF/dokumen/gambar)",
};

export default async function ConsoleEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModuleAccess("events");
  const { id } = await params;
  await publishDueEvents();
  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event) notFound();

  const registrations = await db
    .select({
      reg: eventRegistrations,
      userName: users.name,
      userEmail: users.email,
      // Sensus di-join supaya roster bisa menjawab "siapa saja yang hadir":
      // anggota Nanjing, mahasiswa dari cabang lain, atau tamu luar.
      sensusBranch: sensusProfiles.branch,
      sensusCompletion: sensusProfiles.completionStatus,
    })
    .from(eventRegistrations)
    .leftJoin(users, eq(eventRegistrations.userId, users.id))
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, eventRegistrations.userId))
    .where(eq(eventRegistrations.eventId, id))
    .orderBy(desc(eventRegistrations.registeredAt));

  // Struktur kepanitiaan acara ini (Departemen -> sub-tim) + daftar orang yang
  // bisa ditugaskan. Kandidatnya SEMUA akun, bukan cuma anggota departemen:
  // kepanitiaan acara memang tidak terikat jabatan struktural.
  const { divisions, members: committee } = await listEventDivisions(id);
  const questions = await db
    .select()
    .from(eventQuestions)
    .where(eq(eventQuestions.eventId, id))
    .orderBy(eventQuestions.orderIndex, eventQuestions.id);
  const feeOptions = await db
    .select()
    .from(eventFeeOptions)
    .where(eq(eventFeeOptions.eventId, id))
    .orderBy(eventFeeOptions.orderIndex, eventFeeOptions.id);
  const feeOptionLabel = new Map(feeOptions.map((o) => [o.id, `${o.label} (¥${o.amountCny})`]));
  const volunteerApps = await db
    .select({
      app: eventVolunteers,
      divisionName: eventDivisions.name,
      accountName: users.name,
    })
    .from(eventVolunteers)
    .leftJoin(eventDivisions, eq(eventVolunteers.divisionId, eventDivisions.id))
    .leftJoin(users, eq(eventVolunteers.assignedUserId, users.id))
    .where(eq(eventVolunteers.eventId, id))
    .orderBy(desc(eventVolunteers.createdAt));
  const pendingVolunteers = volunteerApps.filter((v) => v.app.status === "pending");
  const candidates = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(users.name);
  const issuedCerts = await db
    .select({ userId: certificates.userId, kind: certificates.kind })
    .from(certificates)
    .where(eq(certificates.eventId, id));
  const committeeCertUserIds = issuedCerts.filter((c) => c.kind === "panitia").map((c) => c.userId);
  const participantCertCount = issuedCerts.filter((c) => c.kind === "peserta").length;

  // Payment verification is financial data - gated on "organization", not the
  // ordinary "events" scope everyone with events access already has. Derived
  // from `registrations` (already fetched above) instead of a second query;
  // only rendering is gated, so nothing sensitive reaches an unauthorized
  // viewer's page even though it briefly exists in server memory here.
  const canVerifyPayments = hasModuleAccess(session.user.adminScope, "organization");
  const feeOptionAmount = new Map(feeOptions.map((o) => [o.id, o.amountCny]));
  const pendingPayments = canVerifyPayments
    ? registrations
        .filter((r) => r.reg.paymentStatus !== "not_required")
        .map((r) => ({
          id: r.reg.id,
          status: r.reg.paymentStatus,
          proofUrl: r.reg.paymentProofUrl,
          note: r.reg.paymentNote,
          registeredAt: r.reg.registeredAt,
          name: r.userName,
          email: r.userEmail,
          // Nominal yang wajib dibayar peserta ini: kategori tarifnya bila ada,
          // kalau tidak tarif tunggal acara.
          expected: r.reg.feeOptionId ? feeOptionAmount.get(r.reg.feeOptionId) ?? null : event.feeCny,
          feeLabel: r.reg.feeOptionId ? feeOptionLabel.get(r.reg.feeOptionId) ?? null : null,
        }))
    : [];

  const attended = registrations.filter((r) => r.reg.status === "attended").length;
  // Berhak sertifikat kehadiran = pendaftar yang diterima: confirmed maupun
  // attended (pending belum diterima, cancelled batal). Harus sinkron dengan
  // aturan di issueParticipantCertificates supaya angkanya tidak menipu.
  const eligible = registrations.filter(
    (r) => r.reg.status === "confirmed" || r.reg.status === "attended"
  ).length;

  return (
    <div className="py-2">
      <header className="mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">{event.title}</h1>
        <p className="text-body-md text-on-surface-variant">
          {registrations.length} terdaftar &middot; {attended} hadir
          {event.capacity ? ` &middot; kapasitas ${event.capacity}` : ""}
        </p>
      </header>

      {/* Layar lebar: kerja utama di kiri; ringkasan + antrean tindakan
          (volunteer, verifikasi bayar) menempel di kolom kanan. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
      <details className="bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          Edit Detail Kegiatan
        </summary>
        <form action={updateEvent.bind(null, id)} className="px-6 pb-6 flex flex-col gap-4">
          {/* Bagian 1 - identitas acara */}
          <details open className="border border-outline-variant rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container">
              1 · Info Acara
            </summary>
            <div className="px-4 pb-4 flex flex-col gap-4">
              <input id="event-title" name="title" defaultValue={event.title} required className="bg-soft-gray rounded-md p-3 text-body-md" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input id="event-category" name="category" defaultValue={event.category ?? ""} placeholder="Kategori" className="bg-soft-gray rounded-md p-3 text-body-md" />
                <input id="event-location" name="location" defaultValue={event.location ?? ""} placeholder="Lokasi" className="bg-soft-gray rounded-md p-3 text-body-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <input
                    name="startAt"
                    type="datetime-local"
                    defaultValue={event.startAt ? toDateLocalInput(new Date(event.startAt)) : ""}
                    className="bg-soft-gray rounded-md p-3 text-body-md"
                  />
                  <p className="text-xs text-on-surface-variant">Kapan acara berlangsung (tanggal & jam mulai).</p>
                </div>
                  <input name="capacity" type="number" min={1} defaultValue={event.capacity ?? ""} placeholder="Kapasitas" className="bg-soft-gray rounded-md p-3 text-body-md" />
                </div>
              <ImageUploadCropper
                name="coverImageUrl"
                folder="events"
                label="Gambar Sampul"
                placeholder="Tempel URL atau unggah gambar"
                defaultValue={event.coverImageUrl ?? ""}
                aspect={16 / 9}
                allowPaste
                hint="Ideal 1920 × 1080 px (16:9) — gambar di-crop & dikompres otomatis."
              />
              <EventThemeFields
                defaults={{
                  themeBg: event.themeBg,
                  themeAccent: event.themeAccent,
                  themeAccent2: event.themeAccent2,
                }}
              />
            </div>
          </details>

          {/* Bagian 2 - aturan pendaftaran & HTM */}
          <details open className="border border-outline-variant rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container">
              2 · Pendaftaran &amp; Biaya
            </summary>
            <div className="px-4 pb-4 flex flex-col gap-4">
              <CheckField name="requiresSensus" defaultChecked={event.requiresSensus} label="Hanya untuk peserta yang sudah lengkap mengisi sensus (mahasiswa Indo di China)" />
              <CheckField
                name="requiresBiodata"
                defaultChecked={event.requiresBiodata}
                label="Kumpulkan biodata lengkap peserta saat mendaftar (WIF dsb.)"
                hint="Nama, paspor, WeChat, no. HP China, kota/ranting, universitas, angkatan, bukti mahasiswa aktif. Peserta yang sensusnya lengkap tidak mengetik ulang — datanya diambil dari sensus."
              />
              <CheckField name="certificateForParticipants" defaultChecked={event.certificateForParticipants} label="Peserta mendapat e-sertifikat kehadiran" />
              <CheckField
                name="volunteerSignupOpen"
                defaultChecked={event.volunteerSignupOpen}
                label="Buka pendaftaran volunteer publik"
                hint="Orang luar bisa melamar jadi volunteer di halaman acara"
              />
              <HtmFields
                defaultIsPaid={event.isPaid}
                defaultFeeCny={event.feeCny}
                defaultInstructions={event.paymentInstructions}
                defaultQrUrl={event.paymentQrUrl}
                defaultAlipayUid={event.alipayUid}
              />
              {event.isPaid && (
                <p className="text-xs text-on-surface-variant">
                  Butuh tarif bertingkat (mis. Freshmen ¥15 / Non-freshmen ¥25)? Atur di bagian
                  &ldquo;Kategori Tarif&rdquo; di bawah — kalau ada minimal satu kategori, peserta wajib memilih
                  saat mendaftar dan nominal itu yang dipakai, bukan angka tunggal di atas.
                </p>
              )}
              <div className="flex flex-col gap-1">
                <input
                  name="registrationDeadline"
                  type="datetime-local"
                  defaultValue={event.registrationDeadline ? toDateLocalInput(new Date(event.registrationDeadline)) : ""}
                  placeholder="Batas Pendaftaran"
                  className="bg-soft-gray rounded-md p-3 text-body-md"
                />
                <p className="text-xs text-on-surface-variant">Batas waktu peserta boleh mendaftar. Lewat dari ini tombol daftar tertutup otomatis. Kosongkan bila tak ada batas.</p>
              </div>
            </div>
          </details>

          {/* Bagian 3 - konten & jadwal rilis */}
          <details open className="border border-outline-variant rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-on-surface-variant">
              3 · Deskripsi, Agenda &amp; Jadwal Rilis
            </summary>
            <div className="px-4 pb-4 flex flex-col gap-4">
              <div>
                <textarea id="event-description" name="description" defaultValue={event.description ?? ""} rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none w-full" />
                <AIImproveButton context="event" targetId="event-description" className="mt-1" />
              </div>
              <textarea
                id="event-agenda"
                name="agenda"
                defaultValue={event.agenda ?? ""}
                placeholder={"Agenda/Jadwal (satu baris per item, contoh:\n18:00 - Registrasi\n19:00 - Pembukaan)"}
                rows={3}
                className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
              />
              <div className="flex flex-col gap-1">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Info Setelah Daftar</span>
                <textarea
                  name="confirmationInfo"
                  defaultValue={event.confirmationInfo ?? ""}
                  placeholder={"Muncul di halaman tiket peserta setelah mereka mendaftar (contoh:\nMasuk grup WeChat WIF 2026 — add salah satu:\nWechat ID: rhpxzz (Gwen)\nWechat ID: athayamzzra (Athaya))"}
                  rows={3}
                  className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
                />
                <p className="text-xs text-on-surface-variant">Tidak tampil di halaman acara publik — hanya pendaftar yang melihatnya.</p>
              </div>
              <div className="flex flex-col gap-1">
                <input
                  name="scheduledPublishAt"
                  type="datetime-local"
                  defaultValue={event.scheduledPublishAt ? toDateLocalInput(new Date(event.scheduledPublishAt)) : ""}
                  placeholder="Jadwal Rilis Publikasi (opsional)"
                  className="bg-soft-gray rounded-md p-3 text-body-md"
                />
                <p className="text-xs text-on-surface-variant">Isi bila acara mau tampil ke publik hanya SETELAH tanggal/waktu ini (status &quot;Terjadwal&quot; dulu, rilis sendiri nanti). Kosongkan = langsung Draf, rilis saat kamu klik Publish manual.</p>
              </div>
            </div>
          </details>

          <AIReviewButton
            context="event"
            fields={[
              { id: "event-title", label: "Judul" },
              { id: "event-category", label: "Kategori" },
              { id: "event-location", label: "Lokasi" },
              { id: "event-description", label: "Deskripsi" },
              { id: "event-agenda", label: "Agenda" },
            ]}
          />
          <Select
            name="statusSelect"
            defaultValue={event.status}
            aria-label="Status acara"
            className="w-full"
            options={[
              { value: "draft", label: "Draf" },
              { value: "scheduled", label: "Terjadwal (belum rilis)" },
              { value: "published", label: "Dipublikasikan" },
              { value: "registration_closed", label: "Pendaftaran Ditutup" },
              { value: "completed", label: "Selesai" },
              { value: "cancelled", label: "Dibatalkan" },
            ]}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="status"
              value="draft"
              className="self-start bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Simpan sebagai Draft
            </button>
            <button
              type="submit"
              name="status"
              value="published"
              className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Publikasikan
            </button>
            <button
              type="submit"
              className="self-start bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </details>

      <CollapsibleSection
        title="Pertanyaan Pendaftaran"
        description={questions.length > 0 ? `${questions.length} pertanyaan` : "tidak ada — form standar"}
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          Kosong = pendaftar cuma isi form standar. Tambahkan pertanyaan di bawah bila acara ini butuh
          (mis. preferensi makanan, ukuran kaos); pertanyaannya muncul di form pendaftaran publik dan
          jawabannya tampil di Daftar Pendaftar.
        </p>
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <form
              key={q.id}
              action={saveEventQuestion}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-3"
            >
              <input type="hidden" name="id" value={q.id} />
              <input type="hidden" name="eventId" value={id} />
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                    Pertanyaan {i + 1}
                  </span>
                  <input name="label" defaultValue={q.label} required className="bg-soft-gray rounded-md p-2.5 text-body-md" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tipe</span>
                  <Select name="type" defaultValue={q.type} className="w-full">
                    {Object.entries(QUESTION_TYPE_LABELS).map(([value, lbl]) => (
                      <option key={value} value={value}>{lbl}</option>
                    ))}
                  </Select>
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                  Opsi (satu per baris — untuk Dropdown / Pilihan / Pilih Banyak)
                </span>
                <textarea
                  name="options"
                  defaultValue={q.options ?? ""}
                  rows={2}
                  placeholder={"Vegetarian\nHalal saja\nBiasa"}
                  className="bg-soft-gray rounded-md p-2.5 text-body-md resize-none"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CheckboxField name="required" defaultChecked={q.required} label="Wajib diisi" />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors"
                  >
                    Simpan
                  </button>
                  <ConfirmButton
                    title="Hapus pertanyaan?"
                    message={`"${q.label}" dihapus dari form pendaftaran. Jawaban yang sudah terkumpul tidak ikut terhapus.`}
                    action={deleteEventQuestion}
                    payload={{ id: q.id }}
                    className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-1.5 rounded-md"
                  >
                    Hapus
                  </ConfirmButton>
                </div>
              </div>
            </form>
          ))}
        </div>
        <form action={saveEventQuestion} className="mt-4 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-3">
          <input type="hidden" name="eventId" value={id} />
          <p className="text-label-caps uppercase tracking-wide text-primary-container">+ Tambah Pertanyaan</p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input name="label" required placeholder="Pertanyaan (mis. Preferensi makanan)" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
            <Select name="type" defaultValue="text" className="w-full" aria-label="Tipe pertanyaan">
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, lbl]) => (
                <option key={value} value={value}>{lbl}</option>
              ))}
            </Select>
          </div>
          <textarea
            name="options"
            rows={2}
            placeholder={"Opsi (satu per baris, hanya untuk Dropdown / Pilihan / Pilih Banyak):\nVegetarian\nHalal saja\nBiasa"}
            className="bg-soft-gray rounded-md p-2.5 text-body-md resize-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CheckboxField name="required" label="Wajib diisi" />
            <button
              type="submit"
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
            >
              Tambah
            </button>
          </div>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        title="Kategori Tarif"
        description={feeOptions.length > 0 ? `${feeOptions.length} kategori` : "tidak ada — tarif tunggal"}
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          Kosong = pakai satu nominal (angka HTM di form Edit). Tambahkan kategori bila tarifnya
          bertingkat — <strong className="text-on-background">Freshmen ¥15 / Non-freshmen ¥25</strong> untuk WIF,
          satu baris flat untuk booth, satu baris per nomor untuk olahraga. Peserta wajib memilih satu
          saat mendaftar, dan nominal kategori itulah yang harus dibayar.
        </p>
        <div className="flex flex-col gap-3">
          {feeOptions.map((o) => (
            <form
              key={o.id}
              action={saveFeeOption}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="eventId" value={id} />
              <label className="flex flex-col gap-1 flex-1 min-w-[10rem]">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Label</span>
                <input name="label" defaultValue={o.label} required className="bg-soft-gray rounded-md p-2.5 text-body-md" />
              </label>
              <label className="flex flex-col gap-1 w-32">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nominal (¥)</span>
                <input name="amountCny" type="number" min={0} defaultValue={o.amountCny} required className="bg-soft-gray rounded-md p-2.5 text-body-md" />
              </label>
              <button
                type="submit"
                className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-2 rounded-md hover:bg-surface-container-low transition-colors"
              >
                Simpan
              </button>
              <ConfirmButton
                title="Hapus kategori tarif?"
                message={`"${o.label}" dihapus. Pendaftar yang sudah memilihnya kehilangan label kategori (riwayatnya tetap ada).`}
                action={deleteFeeOption}
                payload={{ id: o.id }}
                className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-2 rounded-md"
              >
                Hapus
              </ConfirmButton>
            </form>
          ))}
        </div>
        <form action={saveFeeOption} className="mt-4 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="eventId" value={id} />
          <label className="flex flex-col gap-1 flex-1 min-w-[10rem]">
            <span className="text-label-caps uppercase tracking-wide text-primary-container">+ Label kategori</span>
            <input name="label" required placeholder="mis. Freshmen" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
          </label>
          <label className="flex flex-col gap-1 w-32">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nominal (¥)</span>
            <input name="amountCny" type="number" min={0} required placeholder="15" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
          </label>
          <button
            type="submit"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
          >
            Tambah
          </button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        title="Struktur Kepanitiaan"
        description={`${divisions.length} divisi · ${committee.length} panitia`}
      >
        <EventCommitteeStructure
          eventId={id}
          divisions={divisions}
          members={committee}
          candidates={candidates}
          certifiedUserIds={committeeCertUserIds}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Sertifikat Peserta"
        description={`${eligible} berhak · ${participantCertCount} terbit`}
      >
        {event.certificateForParticipants ? (
          <>
            <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
              Semua pendaftar yang diterima (konfirmasi &amp; hadir) berhak atas e-sertifikat kehadiran.
              Tombol ini menerbitkan untuk <strong className="text-on-background">yang belum punya saja</strong>,
              jadi aman ditekan ulang setelah ada pendaftar baru. Berkas PDF-nya ditautkan manual belakangan lewat Work Ledger.
            </p>
            <form action={issueParticipantCertificates}>
              <input type="hidden" name="eventId" value={id} />
              <button
                type="submit"
                className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
              >
                Terbitkan Sertifikat Peserta
              </button>
            </form>
          </>
        ) : (
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Acara ini tidak memberi e-sertifikat kehadiran. Centang &quot;Peserta mendapat e-sertifikat
            kehadiran&quot; di form Edit di atas bila berubah pikiran.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Daftar Pendaftar" description={`${registrations.length} terdaftar · ${attended} hadir`}>
        {registrations.length > 0 && (
          <a
            href={`/api/console/events/${id}/registrations/export`}
            className="self-start inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors mb-3"
            download
          >
            <Download size={13} aria-hidden /> Export ke CSV
          </a>
        )}
        <RegistrationList
          eventId={id}
          questions={questions.map((q) => ({ id: q.id, label: q.label }))}
          registrations={registrations.map((r) => ({
            id: r.reg.id,
            userName: r.userName,
            userEmail: r.userEmail,
            status: r.reg.status,
            registeredAt: r.reg.registeredAt.toISOString(),
            answers: r.reg.answersJson ?? {},
            feeLabel: r.reg.feeOptionId ? feeOptionLabel.get(r.reg.feeOptionId) ?? null : null,
            biodata: r.reg.biodataJson ?? null,
            checkInBlocked: checkInBlockReason(
              { status: r.reg.status, paymentStatus: r.reg.paymentStatus },
              event.isPaid,
            ),
            membership: MEMBERSHIP_LABEL[
              membershipStatus(
                r.sensusCompletion ? { branch: r.sensusBranch, completionStatus: r.sensusCompletion } : null
              )
            ],
            // Sensus lengkap lebih berwenang daripada jawaban sekali-pakai di
            // form pendaftaran; null = pendaftaran lama, sebelum pertanyaannya ada.
            branch: effectiveBranch(r.sensusCompletion === "complete" ? r.sensusBranch : null, r.reg.branch),
          }))}
        />
      </CollapsibleSection>
        </div>

        {/* Kolom samping: ringkasan + antrean tindakan */}
        <aside className="flex flex-col gap-6 min-w-0 xl:sticky xl:top-6">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3">
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Ringkasan</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-surface-container-low rounded-lg py-3">
                <p className="text-headline-sm text-on-background font-semibold">{registrations.length}</p>
                <p className="text-label-caps text-on-surface-variant">Terdaftar</p>
              </div>
              <div className="bg-surface-container-low rounded-lg py-3">
                <p className="text-headline-sm text-on-background font-semibold">{attended}</p>
                <p className="text-label-caps text-on-surface-variant">Hadir</p>
              </div>
              <div className="bg-surface-container-low rounded-lg py-3">
                <p className="text-headline-sm text-on-background font-semibold">{event.capacity ?? "—"}</p>
                <p className="text-label-caps text-on-surface-variant">Kuota</p>
              </div>
            </div>
            <a
              href={`/console/events/${id}/scan`}
              className="inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-surface-container-low transition-colors"
            >
              Buka Scanner Check-in
            </a>
            <DeleteEventButton eventId={id} label="Hapus Kegiatan" />
          </section>

          {canVerifyPayments && event.isPaid && (
            <CollapsibleSection
              title="Verifikasi Pembayaran"
              description={`${pendingPayments.filter((p) => p.status === "submitted").length} menunggu verifikasi`}
              defaultOpen={pendingPayments.some((p) => p.status === "submitted")}
            >
              <p className="text-body-md text-on-surface-variant mb-1">
                Bukti diunggah sendiri oleh peserta — cocokkan ketiganya dengan mutasi Alipay/rekening:
              </p>
              <ul className="text-body-sm text-on-surface-variant mb-4 list-disc pl-5">
                <li>
                  <strong className="text-on-background">Nominal</strong>{" "}
                  {feeOptions.length > 0
                    ? "sesuai kategori tarif tiap peserta (tertera di bawah)"
                    : event.feeCny != null
                      ? `persis ¥${event.feeCny}`
                      : "sesuai kesepakatan (belum diisi)"}
                </li>
                <li><strong className="text-on-background">Nama pengirim</strong> cocok dengan peserta</li>
                <li><strong className="text-on-background">Waktu transfer</strong> setelah tanggal daftar</li>
              </ul>
              <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4">
                {pendingPayments.length === 0 ? (
                  <li className="py-4 text-body-md text-on-surface-variant">Belum ada laporan pembayaran.</li>
                ) : (
                  pendingPayments.map((p) => (
                    <li key={p.id} className="border-b border-outline-variant/60 py-4 last:border-0">
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <p className="text-body-md text-on-background">{p.name ?? "(tanpa nama)"}</p>
                          <p className="text-label-caps text-on-surface-variant">
                            {p.email} · {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                          </p>
                          {(p.expected != null || p.feeLabel) && (
                            <p className="text-label-caps text-on-background">
                              Wajib bayar: {p.expected != null ? `¥${p.expected}` : "—"}
                              {p.feeLabel ? ` · ${p.feeLabel}` : ""}
                            </p>
                          )}
                          {p.note && <p className="text-body-sm text-on-surface-variant mt-1">{p.note}</p>}
                          {p.proofUrl && (
                            <div className="mt-1.5 text-label-caps">
                              <ProofView url={p.proofUrl} label="Bukti transfer" />
                            </div>
                          )}
                        </div>
                        <form action={updatePaymentStatus} className="flex flex-col gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <input
                            name="note"
                            defaultValue={p.note ?? ""}
                            placeholder="Catatan (opsional)"
                            className="bg-soft-gray rounded-md p-2 text-body-md w-full"
                          />
                          <div className="flex items-center gap-2">
                            <Select
                              name="paymentStatus"
                              defaultValue={p.status}
                              className="flex-1"
                              aria-label="Status pembayaran"
                              options={[
                                { value: "unpaid", label: "Belum Bayar" },
                                { value: "submitted", label: "Menunggu Verifikasi" },
                                { value: "verified", label: "Terverifikasi" },
                                { value: "rejected", label: "Ditolak" },
                              ]}
                            />
                            <button
                              type="submit"
                              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
                            >
                              Simpan
                            </button>
                          </div>
                        </form>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </CollapsibleSection>
          )}

          <CollapsibleSection
            title="Pendaftar Volunteer"
            description={
              event.volunteerSignupOpen
                ? `${pendingVolunteers.length} menunggu keputusan`
                : volunteerApps.length > 0
                  ? `${volunteerApps.length} lamaran (ditutup)`
                  : "pendaftaran tutup"
            }
            defaultOpen={pendingVolunteers.length > 0}
          >
            {!event.volunteerSignupOpen && (
              <p className="text-body-md text-on-surface-variant mb-4">
                Pendaftaran publik sedang <strong className="text-on-background">tutup</strong>. Centang
                &quot;Buka pendaftaran volunteer&quot; di form Edit.
              </p>
            )}
            {volunteerApps.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Belum ada yang melamar.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {volunteerApps.map((v) => {
                  const STATUS: Record<string, string> = {
                    pending: "Menunggu",
                    approved: "Diterima",
                    rejected: "Ditolak",
                  };
                  const CHIP: Record<string, string> = {
                    pending: "bg-surface-container-low text-on-surface-variant",
                    approved: "bg-primary-container/10 text-primary-container",
                    rejected: "bg-error-container text-on-error-container",
                  };
                  return (
                    <li key={v.app.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-body-md font-medium text-on-background">{v.app.fullName}</p>
                          <p className="text-label-caps text-on-surface-variant break-all">
                            {v.app.email}
                            {v.app.whatsapp ? ` · ${v.app.whatsapp}` : ""}
                          </p>
                          <p className="text-label-caps text-on-surface-variant">
                            minat: {v.divisionName ?? "bebas"}
                            {v.app.status === "approved" && v.accountName ? ` · akun: ${v.accountName}` : ""}
                          </p>
                          {v.app.note && <p className="text-body-sm text-on-surface-variant mt-1">{v.app.note}</p>}
                        </div>
                        <span className={`text-label-caps uppercase tracking-wide px-2.5 py-1 rounded shrink-0 ${CHIP[v.app.status]}`}>
                          {STATUS[v.app.status]}
                        </span>
                      </div>
                      {v.app.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <form action={setVolunteerStatus} className="flex-1">
                            <input type="hidden" name="id" value={v.app.id} />
                            <input type="hidden" name="decision" value="approved" />
                            <button
                              type="submit"
                              className="w-full bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md hover:bg-primary transition-colors"
                            >
                              Terima
                            </button>
                          </form>
                          <ConfirmButton
                            title="Tolak lamaran?"
                            message={`Lamaran volunteer ${v.app.fullName} akan ditandai ditolak.`}
                            confirmLabel="Ya, tolak"
                            action={setVolunteerStatus}
                            payload={{ id: v.app.id, decision: "rejected" }}
                            className="w-full flex-1 text-label-caps uppercase tracking-wide text-error border border-error/40 px-3 py-1.5 rounded-md hover:bg-error-container/30 transition-colors"
                          >
                            Tolak
                          </ConfirmButton>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>
        </aside>
      </div>
    </div>
  );
}
