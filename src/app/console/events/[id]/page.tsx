import { eq, and, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { auditLogs, certificates, events, eventCredits, eventDivisions, eventFeeOptions, eventQuestions, eventRegistrations, eventVolunteers, galleryAlbums, galleryPhotos, inventoryItems, itemReservations, newsArticles, sensusProfiles, users } from "@/db/schema";
import { MEMBERSHIP_LABEL, effectiveBranch, membershipStatus } from "@/lib/membership-status";
import { updateEventInfo, updateEventContent, updateEventPostReport, setEventStatus, saveEventQuestion, deleteEventQuestion, saveFeeOption, deleteFeeOption } from "@/app/actions/admin-events";
import { createEventGalleryAlbum } from "@/app/actions/admin-content";
import { VolunteerApplicationList } from "@/components/console/volunteer-application-list";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { RegistrationList } from "@/components/console/registration-list";
import { EventCommitteeStructure } from "@/components/console/event-committee-structure";
import { listEventDivisions, issueParticipantCertificates, takeOverEvent, addEventCredit, removeEventCredit } from "@/app/actions/committee";
import { requireEventConsoleAccess } from "@/lib/event-access";
import { EVENT_STATUS_LABEL as STATUS_LABEL } from "@/lib/event-status-labels";
import { EVENT_AUDIT_ACTION_LABEL, type EventAuditAction } from "@/lib/event-audit";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { EventThemeFields } from "@/components/console/event-theme-fields";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { HtmFields } from "@/components/console/htm-fields";
import { Select, CheckboxField, CheckField } from "@/components/console/form";
import { PaymentVerificationList } from "@/components/console/payment-verification-list";
import { ReservationManager } from "@/components/console/reservation-manager";
import { checkInBlockReason } from "@/lib/event-checkin";
import { toDateLocalInput } from "@/lib/datetime";
import { ConfirmButton } from "@/components/console/confirm-button";
import { Download, Images } from "lucide-react";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "Teks Pendek",
  textarea: "Teks Panjang",
  select: "Dropdown",
  radio: "Pilihan (radio)",
  multiselect: "Pilih Banyak (centang)",
  file: "Unggah Berkas (PDF/dokumen/gambar)",
};

export default async function ConsoleEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireEventConsoleAccess(id);
  const can = access.can;
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
  // Album galeri untuk section "Setelah Acara": semua album, plus tandai mana
  // yang sudah tertaut ke acara ini (galleryAlbums.eventId). Album yang tertaut
  // ke acara LAIN tetap ditampilkan tapi diberi keterangan supaya tidak
  // sengaja dicuri dari acara lain.
  const albums = await db
    .select({ id: galleryAlbums.id, title: galleryAlbums.title, eventId: galleryAlbums.eventId })
    .from(galleryAlbums)
    .orderBy(desc(galleryAlbums.createdAt));
  const linkedAlbum = albums.find((a) => a.eventId === id) ?? null;

  const issuedCerts = await db
    .select({ userId: certificates.userId, kind: certificates.kind })
    .from(certificates)
    .where(eq(certificates.eventId, id));
  const committeeCertUserIds = issuedCerts.filter((c) => c.kind === "panitia").map((c) => c.userId);
  const participantCertCount = issuedCerts.filter((c) => c.kind === "peserta").length;

  // Riwayat audit acara — BPH Panitia (ketua/wakil/sekretaris/SC) + BPH Kabinet.
  const canViewAuditLog = can("event.viewAuditLog");
  const auditRows = canViewAuditLog
    ? await db
        .select({ log: auditLogs, actorName: users.name })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(and(eq(auditLogs.entityType, "event"), eq(auditLogs.entityId, id)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(80)
    : [];

  // Kredit / arsip kepanitiaan (fitur tampilan, terpisah dari akses).
  const canEditCredits = can("event.editCredits");
  const credits = canEditCredits
    ? await db
        .select({ id: eventCredits.id, displayName: eventCredits.displayName, roleLabel: eventCredits.roleLabel })
        .from(eventCredits)
        .where(eq(eventCredits.eventId, id))
        .orderBy(eventCredits.orderIndex, eventCredits.createdAt)
    : [];

  // Artikel berita acara — grant "Post artikel" atau BPH Panitia.
  const canPostArticle = can("event.postArticle");
  const eventArticles = canPostArticle
    ? await db
        .select({ id: newsArticles.id, title: newsArticles.title, status: newsArticles.status })
        .from(newsArticles)
        .where(eq(newsArticles.eventId, id))
        .orderBy(desc(newsArticles.publishedAt))
    : [];

  // Galeri foto acara — grant "Galeri" (Divisi Dokumentasi) atau BPH Panitia.
  const canManageGallery = can("event.manageGallery");
  const albumPhotoCount =
    canManageGallery && linkedAlbum
      ? (await db.select({ n: sql<number>`count(*)::int` }).from(galleryPhotos).where(eq(galleryPhotos.albumId, linkedAlbum.id)))[0]?.n ?? 0
      : 0;

  // Reservasi aset Inventaris untuk acara ini — hanya diambil kalau viewer-nya
  // punya grant "Pinjam aset" (Divisi Logistik acara) atau BPH Panitia.
  const canBorrowAssets = can("event.borrowAssets");
  const [assetItems, assetReservations] = canBorrowAssets
    ? await Promise.all([
        db.select({ id: inventoryItems.id, name: inventoryItems.name }).from(inventoryItems).orderBy(inventoryItems.name),
        db
          .select({ r: itemReservations, itemName: inventoryItems.name })
          .from(itemReservations)
          .leftJoin(inventoryItems, eq(itemReservations.itemId, inventoryItems.id))
          .where(and(eq(itemReservations.eventId, id), eq(itemReservations.status, "active")))
          .orderBy(desc(itemReservations.reservedFrom)),
      ])
    : [[], []];

  // Verifikasi pembayaran = data keuangan - digerbang event.manageFinance
  // (grant "Keuangan" per divisi + BPH Panitia + BPH Kabinet). Diturunkan dari
  // `registrations` yang sudah diambil; hanya render-nya yang digerbang.
  const canVerifyPayments = can("event.manageFinance");
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
        {access.locked && !access.isFullAdmin && (
          <p className="mt-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-surface-variant">
            Acara ini <strong className="text-on-background">terkunci</strong> — sudah lewat 2 minggu setelah
            selesai. Panitia hanya bisa melihat; perubahan lewat BPH Kabinet.
          </p>
        )}
        {can("event.takeOver") && access.role == null && (
          <form action={takeOverEvent} className="mt-3">
            <input type="hidden" name="eventId" value={id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-label-caps uppercase tracking-wide text-on-background hover:bg-surface-container-low transition-colors"
            >
              Ambil Alih Acara (BPH)
            </button>
          </form>
        )}
      </header>

      {/* Layar lebar: kerja utama di kiri; ringkasan + antrean tindakan
          (volunteer, verifikasi bayar) menempel di kolom kanan. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
      {/* Deskripsi & agenda — fitur DASAR: semua panitia acara bisa. */}
      {can("event.editContent") && (
      <CollapsibleSection title="Deskripsi & Agenda" description="Teks yang tampil di halaman acara publik.">
        <form action={updateEventContent.bind(null, id)} className="flex flex-col gap-4">
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
          <AIReviewButton
            context="event"
            fields={[
              { id: "event-description", label: "Deskripsi" },
              { id: "event-agenda", label: "Agenda" },
            ]}
          />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Deskripsi &amp; Agenda
          </button>
        </form>
      </CollapsibleSection>
      )}

      {/* Info & pengaturan acara — wewenang BPH Panitia (event.editInfo). */}
      {can("event.editInfo") && (
      <details className="bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          Info &amp; Pengaturan Acara
        </summary>
        <form action={updateEventInfo.bind(null, id)} className="px-6 pb-6 flex flex-col gap-4">
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

          {/* Bagian 2 - aturan pendaftaran & HTM + jadwal rilis */}
          <details open className="border border-outline-variant rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container">
              2 · Pendaftaran, Biaya &amp; Jadwal Rilis
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
              <div className="flex flex-col gap-1">
                <input
                  name="scheduledPublishAt"
                  type="datetime-local"
                  defaultValue={event.scheduledPublishAt ? toDateLocalInput(new Date(event.scheduledPublishAt)) : ""}
                  placeholder="Jadwal Rilis Publikasi (opsional)"
                  className="bg-soft-gray rounded-md p-3 text-body-md"
                />
                <p className="text-xs text-on-surface-variant">Isi bila acara mau tampil ke publik hanya SETELAH tanggal/waktu ini (status &quot;Terjadwal&quot; dulu, rilis sendiri nanti). Kosongkan = tetap Draf, rilis saat kamu klik Publikasikan.</p>
              </div>
            </div>
          </details>

          <AIReviewButton
            context="event"
            fields={[
              { id: "event-title", label: "Judul" },
              { id: "event-category", label: "Kategori" },
              { id: "event-location", label: "Lokasi" },
            ]}
          />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Info &amp; Pengaturan
          </button>
        </form>
      </details>
      )}

      {/* Status & publikasi. Buka/tutup pendaftaran = fitur DASAR; ganti status
          lain = wewenang BPH Panitia (event.publish). */}
      {(can("event.publish") || can("event.registrationToggle")) && (
      <CollapsibleSection title="Status & Publikasi" description={STATUS_LABEL[event.status] ?? event.status}>
        {can("event.publish") ? (
          <form action={setEventStatus} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="eventId" value={id} />
            <label className="flex flex-col gap-1 min-w-[12rem]">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Status acara</span>
              <Select
                name="status"
                defaultValue={event.status}
                aria-label="Status acara"
                options={[
                  { value: "draft", label: "Draf" },
                  { value: "scheduled", label: "Terjadwal (belum rilis)" },
                  { value: "published", label: "Dipublikasikan" },
                  { value: "registration_closed", label: "Pendaftaran Ditutup" },
                  { value: "completed", label: "Selesai" },
                  { value: "cancelled", label: "Dibatalkan" },
                ]}
              />
            </label>
            <button
              type="submit"
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Ubah Status
            </button>
          </form>
        ) : (event.status === "published" || event.status === "registration_closed") ? (
          <form action={setEventStatus}>
            <input type="hidden" name="eventId" value={id} />
            <input type="hidden" name="status" value={event.status === "published" ? "registration_closed" : "published"} />
            <button
              type="submit"
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              {event.status === "published" ? "Tutup Pendaftaran" : "Buka Pendaftaran"}
            </button>
          </form>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            Pendaftaran hanya bisa dibuka/tutup saat acara sudah dipublikasikan.
          </p>
        )}
      </CollapsibleSection>
      )}

      {can("event.registrationForm") && (
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
      )}

      {can("event.feeTiers") && (
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
      )}

      {can("event.manageCommittee") && (
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
      )}

      {can("event.issueCertificates") && (
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
      )}

      {canPostArticle && (
      <CollapsibleSection title="Artikel Berita Acara" description={`${eventArticles.length} artikel`}>
        <div className="flex flex-col gap-3">
          <a
            href={`/console/content/news/new?eventId=${id}`}
            className="self-start inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
          >
            + Tulis Artikel
          </a>
          {eventArticles.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">Belum ada artikel untuk acara ini.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {eventArticles.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/console/content/news/${a.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 hover:bg-surface-container-low transition-colors"
                  >
                    <span className="text-body-md text-on-background truncate">{a.title}</span>
                    <span className="text-label-caps uppercase tracking-wide text-on-surface-variant shrink-0">
                      {{ draft: "Draf", published: "Tayang", archived: "Arsip" }[a.status] ?? a.status}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleSection>
      )}

      {canManageGallery && (
      <CollapsibleSection
        title="Galeri Foto Acara"
        description={linkedAlbum ? `Album: ${linkedAlbum.title} · ${albumPhotoCount} foto` : "belum ada album"}
      >
        {linkedAlbum ? (
          <div className="flex flex-col gap-3">
            <p className="text-body-md text-on-surface-variant max-w-2xl">
              Foto highlight album ini tampil di halaman acara publik. Unggah & atur foto di halaman album.
            </p>
            <a
              href={`/console/content/gallery/${linkedAlbum.id}`}
              className="self-start inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
            >
              <Images size={15} aria-hidden /> Kelola Album Foto
            </a>
          </div>
        ) : (
          <form action={createEventGalleryAlbum} className="flex flex-col gap-3 max-w-md">
            <input type="hidden" name="eventId" value={id} />
            <p className="text-body-md text-on-surface-variant">
              Buat album foto untuk acara ini. Kamu akan diarahkan ke halaman album untuk mengunggah foto.
            </p>
            <input
              name="title"
              required
              defaultValue={`Dokumentasi ${event.title}`}
              placeholder="Judul album *"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
            <button
              type="submit"
              className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
            >
              <Images size={15} className="inline -mt-0.5 mr-1.5" aria-hidden /> Buat Album Foto
            </button>
          </form>
        )}
      </CollapsibleSection>
      )}

      {canBorrowAssets && (
      <CollapsibleSection
        title="Reservasi Aset (Inventaris)"
        description={`${assetReservations.length} aset diblokir untuk acara ini`}
      >
        <ReservationManager
          items={assetItems}
          lockedEventId={id}
          reservations={assetReservations.map((x) => ({
            id: x.r.id,
            itemName: x.itemName ?? "(barang dihapus)",
            reason: x.r.reason,
            reservedFrom: x.r.reservedFrom,
            reservedTo: x.r.reservedTo,
            eventTitle: null,
          }))}
        />
      </CollapsibleSection>
      )}

      {can("event.viewRegistrants") && (
      <CollapsibleSection title="Daftar Pendaftar" description={`${registrations.length} terdaftar · ${attended} hadir`}>
        {registrations.length > 0 && can("event.exportRegistrants") && (
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
      )}

      {/* Laporan pasca-acara — fitur DASAR: semua panitia (Humas/Dokumentasi
          biasanya yang mengisi). */}
      {can("event.postEventReport") && (
      <CollapsibleSection
        title="Setelah Acara"
        description="Kehadiran nyata + dokumentasi. Diisi setelah acara selesai."
      >
        <form action={updateEventPostReport.bind(null, id)} className="flex flex-col gap-4">
          <p className="text-xs text-on-surface-variant">
            Begitu acara lewat (status &quot;Selesai&quot; atau tanggalnya sudah lewat), halaman publik
            berganti ke tampilan pasca-acara: angka kehadiran nyata menggantikan kapasitas, dan muncul
            bagian dokumentasi.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jumlah Hadir (Final)</span>
              <input
                name="finalAttendeeCount"
                type="number"
                min={0}
                defaultValue={event.finalAttendeeCount ?? ""}
                placeholder={`mis. ${attended || 80}`}
                className="bg-soft-gray rounded-md p-3 text-body-md"
              />
              <p className="text-xs text-on-surface-variant">
                Ketik manual — tidak diambil dari check-in QR. Check-in portal saat ini: {attended}.
                Kosongkan untuk tetap pakai angka terdaftar.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Rincian Kehadiran</span>
              <input
                name="attendanceNote"
                defaultValue={event.attendanceNote ?? ""}
                placeholder="mis. 80 online · 40 offline"
                className="bg-soft-gray rounded-md p-3 text-body-md"
              />
              <p className="text-xs text-on-surface-variant">Teks bebas di bawah angka. Kosongkan bila tak perlu.</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Link Video Recap / Rekaman</span>
            <input
              name="recapVideoUrl"
              type="url"
              defaultValue={event.recapVideoUrl ?? ""}
              placeholder="https://... (YouTube, Bilibili, Drive)"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
            <p className="text-xs text-on-surface-variant">Muncul sebagai tombol &quot;Tonton Recap&quot; di bagian dokumentasi. Tidak di-embed.</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Album Dokumentasi (Galeri Foto)</span>
            <Select name="documentationAlbumId" defaultValue={linkedAlbum?.id ?? ""} className="w-full" aria-label="Album dokumentasi">
              <option value="">— tidak ada —</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id} disabled={a.eventId != null && a.eventId !== id}>
                  {a.title}
                  {a.eventId != null && a.eventId !== id ? " (tertaut acara lain)" : ""}
                </option>
              ))}
            </Select>
            <p className="text-xs text-on-surface-variant">
              Foto highlight album ini tampil di halaman acara + tautan album lengkap.
              Fotonya diunggah tim konten di{" "}
              <a href={linkedAlbum ? `/console/content/gallery/${linkedAlbum.id}` : "/console/content/gallery/new"} className="text-primary-container underline">
                {linkedAlbum ? "album ini" : "Konten › Galeri › Album Baru"}
              </a>.
            </p>
          </div>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Laporan Pasca-Acara
          </button>
        </form>
      </CollapsibleSection>
      )}

      {/* Kredit / arsip kepanitiaan (Spesifikasi §10) — daftar TAMPILAN untuk
          halaman acara publik & LPJ. TIDAK memberi akses apa pun; diisi
          Sekretaris, tetap bisa walau acara sudah terkunci. */}
      {canEditCredits && (
      <CollapsibleSection
        title="Kredit / Arsip Kepanitiaan"
        description={`${credits.length} nama`}
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          Daftar nama panitia untuk ditampilkan di halaman acara publik (arsip / LPJ). Ini{" "}
          <strong className="text-on-background">hanya tampilan</strong> — menambah nama di sini tidak
          memberi akses konsol apa pun. Biasa diisi Sekretaris setelah acara.
        </p>
        {credits.length > 0 && (
          <ul className="flex flex-col gap-1.5 mb-4">
            {credits.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-outline-variant/50 pb-1.5"
              >
                <span className="text-body-md text-on-background">{c.displayName}</span>
                {c.roleLabel && <span className="text-label-caps text-on-surface-variant">{c.roleLabel}</span>}
                <ConfirmButton
                  title="Hapus dari kredit?"
                  message={`"${c.displayName}" dihapus dari daftar kredit acara. Tidak memengaruhi akses atau sertifikat.`}
                  action={removeEventCredit}
                  payload={{ id: c.id }}
                  className="ml-auto text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-2 py-1 rounded-md"
                >
                  Hapus
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        <form
          action={addEventCredit}
          className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="eventId" value={id} />
          <div className="flex flex-col gap-1 min-w-[12rem]">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Dari Akun (opsional)</span>
            <Select name="userId" defaultValue="" aria-label="Pilih akun">
              <option value="">— ketik nama manual —</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Tampil</span>
            <input
              name="displayName"
              placeholder="kosongkan bila pakai akun"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jabatan</span>
            <input
              name="roleLabel"
              placeholder="mis. Ketua Pelaksana"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </div>
          <button
            type="submit"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Tambah
          </button>
        </form>
      </CollapsibleSection>
      )}

      {canViewAuditLog && (
      <CollapsibleSection title="Riwayat Audit" description={`${auditRows.length} catatan terakhir`}>
        <p className="text-body-md text-on-surface-variant mb-3 max-w-2xl">
          Siapa mengubah apa &amp; kapan — aksi keuangan, publikasi, sertifikat, susunan panitia, dan izin divisi.
        </p>
        {auditRows.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada aktivitas tercatat.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {auditRows.map((a) => (
              <li key={a.log.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-outline-variant/50 pb-1.5">
                <span className="text-body-sm text-on-background">
                  {EVENT_AUDIT_ACTION_LABEL[a.log.action as EventAuditAction] ?? a.log.action}
                </span>
                <span className="text-label-caps text-on-surface-variant">
                  {a.actorName ?? "(sistem)"} · {new Date(a.log.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
      )}
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
            {can("event.scanAttendance") && (
              <a
                href={`/events/${event.slug}/scan`}
                className="inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-surface-container-low transition-colors"
              >
                Buka Scanner Check-in
              </a>
            )}
            {can("event.delete") && <DeleteEventButton eventId={id} label="Hapus Kegiatan" />}
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
              <PaymentVerificationList
                payments={pendingPayments.map((p) => ({ ...p, registeredAt: p.registeredAt.toISOString() }))}
              />
            </CollapsibleSection>
          )}

          {can("event.manageVolunteers") && (
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
            <VolunteerApplicationList
              applications={volunteerApps.map((v) => ({
                id: v.app.id,
                fullName: v.app.fullName,
                email: v.app.email,
                whatsapp: v.app.whatsapp,
                note: v.app.note,
                status: v.app.status,
                divisionName: v.divisionName,
                accountName: v.accountName,
              }))}
            />
          </CollapsibleSection>
          )}
        </aside>
      </div>
    </div>
  );
}
