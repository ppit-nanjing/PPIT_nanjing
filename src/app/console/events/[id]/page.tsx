import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { auditLogs, certificates, coverageCities, events, eventCredits, eventDivisions, eventEvaluations, eventFeeOptions, eventQuestions, eventRegistrations, eventVolunteers, galleryAlbums, galleryPhotos, inventoryItems, itemReservations, newsArticles, sensusProfiles, users } from "@/db/schema";
import { MEMBERSHIP_LABEL, effectiveBranch, membershipStatus } from "@/lib/membership-status";
import { updateEventInfo, updateEventContent, updateEventPostReport, setEventStatus, saveEventQuestion, deleteEventQuestion, saveFeeOption, deleteFeeOption } from "@/app/actions/admin-events";
import { createEventGalleryAlbum } from "@/app/actions/admin-content";
import { VolunteerApplicationList } from "@/components/console/volunteer-application-list";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { RegistrationList } from "@/components/console/registration-list";
import { EventCommitteeStructure } from "@/components/console/event-committee-structure";
import { listEventDivisions, takeOverEvent, addEventCredit, removeEventCredit } from "@/app/actions/committee";
import { CertificateRoster } from "@/components/console/certificate-roster";
import { CertificateBulkForm } from "@/components/console/certificate-bulk-form";
import { EVENT_COMMITTEE_ROLE_LABEL } from "@/lib/event-capabilities";
import { requireEventConsoleAccess } from "@/lib/event-access";
import { EVENT_STATUS_LABEL as STATUS_LABEL } from "@/lib/event-status-labels";
import { EVENT_AUDIT_ACTION_LABEL, type EventAuditAction } from "@/lib/event-audit";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { EventThemeFields } from "@/components/console/event-theme-fields";
import { EventDescriptionEditor } from "@/components/console/event-description-editor";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { HtmFields } from "@/components/console/htm-fields";
import { Select, CheckboxField, CheckField } from "@/components/console/form";
import { PaymentVerificationList } from "@/components/console/payment-verification-list";
import { EvaluationResults } from "@/components/console/evaluation-results";
import { evaluationTemplateForSlug } from "@/lib/event-evaluation-template";
import { EvaluationQuestionsBuilder } from "@/components/console/evaluation-questions-builder";
import { sortByCoverageOrder } from "@/lib/coverage-cities";
import { loadEvaluationAnswers, loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import { ReservationManager } from "@/components/console/reservation-manager";
import { checkInBlockReason } from "@/lib/event-checkin";
import { feeTierAt, amountForTier } from "@/lib/event-fee";
import { toDateLocalInput } from "@/lib/datetime";
import { ConfirmButton } from "@/components/console/confirm-button";
import { FlashToast } from "@/components/console/flash-toast";
import { SubmitButton } from "@/components/console/submit-button";
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

  // Semua query di bawah hanya bergantung pada `id` dan hak akses, bukan satu
  // sama lain, jadi dijalankan serentak: satu putaran ke database alih-alih
  // belasan putaran berurutan (tiap putaran ~240 ms bila fungsi dan database
  // berjauhan). Dua yang bergantung pada hasil lain (nama petugas scan, jumlah
  // foto album) berjalan di gelombang kedua, di bawah.
  const canViewAuditLog = can("event.viewAuditLog"); // BPH Panitia + BPH Kabinet
  const canEditCredits = can("event.editCredits"); // kredit/arsip kepanitiaan
  const canPostArticle = can("event.postArticle"); // grant "Post artikel" atau BPH Panitia
  const canManageGallery = can("event.manageGallery"); // grant "Galeri" atau BPH Panitia
  const canBorrowAssets = can("event.borrowAssets"); // grant "Pinjam aset" atau BPH Panitia
  const canManageCommittee = can("event.manageCommittee"); // panel Struktur Kepanitiaan
  const canEditEvaluationQuestions = can("event.registrationForm"); // builder pertanyaan evaluasi
  const [
    registrations,
    { divisions, members: committee }, // struktur kepanitiaan acara ini (Departemen -> sub-tim)
    questions,
    feeOptions,
    evaluations,
    volunteerApps,
    candidates, // kandidat penugasan: SEMUA akun, kepanitiaan tidak terikat jabatan struktural
    albums, // album galeri untuk section "Setelah Acara"
    issuedCerts,
    auditRows,
    credits,
    eventArticles,
    evalQuestions, // pertanyaan evaluasi buatan panitia (kosong = template tetap)
    evalAnswers, // jawaban untuk pertanyaan itu, semua respons acara ini
    cityRows, // untuk pratinjau form evaluasi, hanya bila viewer boleh menyusunnya
    [assetItems, assetReservations], // reservasi aset Inventaris, hanya untuk yang punya grant
  ] = await Promise.all([
    db
      .select({
        reg: eventRegistrations,
        userName: users.name,
        userEmail: users.email,
        // Sensus di-join supaya roster bisa menjawab "siapa saja yang hadir":
        // anggota Nanjing, mahasiswa dari cabang lain, atau tamu luar. Kota,
        // kampus, dan WeChat ID juga diambil dari sini untuk acara tanpa biodata
        // (mis. Fun Hike requiresSensus — pertanyaan itu sengaja tidak ditanya
        // ulang di form pendaftaran).
        sensusBranch: sensusProfiles.branch,
        sensusCompletion: sensusProfiles.completionStatus,
        sensusUniversity: sensusProfiles.university,
        sensusWechat: sensusProfiles.wechatId,
        sensusFullName: sensusProfiles.fullName, // nama pada sertifikat (hanya untuk daftar penerbitan)
      })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .leftJoin(sensusProfiles, eq(sensusProfiles.userId, eventRegistrations.userId))
      .where(eq(eventRegistrations.eventId, id))
      .orderBy(desc(eventRegistrations.registeredAt)),
    listEventDivisions(id),
    db
      .select()
      .from(eventQuestions)
      .where(eq(eventQuestions.eventId, id))
      .orderBy(eventQuestions.orderIndex, eventQuestions.id),
    db
      .select()
      .from(eventFeeOptions)
      .where(eq(eventFeeOptions.eventId, id))
      .orderBy(eventFeeOptions.orderIndex, eventFeeOptions.id),
    db
      .select()
      .from(eventEvaluations)
      .where(eq(eventEvaluations.eventId, id))
      .orderBy(desc(eventEvaluations.createdAt)),
    db
      .select({
        app: eventVolunteers,
        divisionName: eventDivisions.name,
        accountName: users.name,
      })
      .from(eventVolunteers)
      .leftJoin(eventDivisions, eq(eventVolunteers.divisionId, eventDivisions.id))
      .leftJoin(users, eq(eventVolunteers.assignedUserId, users.id))
      .where(eq(eventVolunteers.eventId, id))
      .orderBy(desc(eventVolunteers.createdAt)),
    // Daftar semua akun hanya dirender di panel Struktur Kepanitiaan dan form
    // Kredit; viewer lain tidak perlu nama + email semua orang diambil.
    canManageCommittee || canEditCredits
      ? db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .orderBy(users.name)
      : Promise.resolve([]),
    // Semua album, plus tandai mana yang sudah tertaut ke acara ini
    // (galleryAlbums.eventId). Album yang tertaut ke acara LAIN tetap
    // ditampilkan tapi diberi keterangan supaya tidak sengaja dicuri.
    db
      .select({ id: galleryAlbums.id, title: galleryAlbums.title, eventId: galleryAlbums.eventId })
      .from(galleryAlbums)
      .orderBy(desc(galleryAlbums.createdAt)),
    db
      .select({ userId: certificates.userId, kind: certificates.kind, fileUrl: certificates.fileUrl })
      .from(certificates)
      .where(eq(certificates.eventId, id)),
    canViewAuditLog
      ? db
          .select({ log: auditLogs, actorName: users.name })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.actorUserId, users.id))
          .where(and(eq(auditLogs.entityType, "event"), eq(auditLogs.entityId, id)))
          .orderBy(desc(auditLogs.createdAt))
          .limit(80)
      : Promise.resolve([]),
    canEditCredits
      ? db
          .select({ id: eventCredits.id, displayName: eventCredits.displayName, roleLabel: eventCredits.roleLabel })
          .from(eventCredits)
          .where(eq(eventCredits.eventId, id))
          .orderBy(eventCredits.orderIndex, eventCredits.createdAt)
      : Promise.resolve([]),
    canPostArticle
      ? db
          .select({ id: newsArticles.id, title: newsArticles.title, status: newsArticles.status })
          .from(newsArticles)
          .where(eq(newsArticles.eventId, id))
          .orderBy(desc(newsArticles.publishedAt))
      : Promise.resolve([]),
    loadEvaluationQuestions(id),
    loadEvaluationAnswers(id),
    canEditEvaluationQuestions
      ? db.select({ label: coverageCities.label }).from(coverageCities)
      : Promise.resolve([]),
    canBorrowAssets
      ? Promise.all([
          db.select({ id: inventoryItems.id, name: inventoryItems.name }).from(inventoryItems).orderBy(inventoryItems.name),
          db
            .select({ r: itemReservations, itemName: inventoryItems.name })
            .from(itemReservations)
            .leftJoin(inventoryItems, eq(itemReservations.itemId, inventoryItems.id))
            .where(and(eq(itemReservations.eventId, id), eq(itemReservations.status, "active")))
            .orderBy(desc(itemReservations.reservedFrom)),
        ])
      : Promise.resolve([[], []]),
  ]);

  const linkedAlbum = albums.find((a) => a.eventId === id) ?? null;
  // Jawaban yang sudah masuk per pertanyaan evaluasi: tipe pertanyaan dikunci bila > 0.
  const evalAnswerCounts: Record<string, number> = {};
  for (const a of evalAnswers) {
    if (a.questionId) evalAnswerCounts[a.questionId] = (evalAnswerCounts[a.questionId] ?? 0) + 1;
  }
  // Gelombang kedua: bergantung pada `registrations` dan `linkedAlbum`.
  // Nama petugas yang men-scan tiap kehadiran (event_registrations.checked_in_by)
  // — satu lookup untuk semua id, dihindari self-join beralias.
  const scannerIds = [
    ...new Set(registrations.map((r) => r.reg.checkedInBy).filter((v): v is string => !!v)),
  ];
  const [scannerNames, albumPhotoCount] = await Promise.all([
    scannerIds.length
      ? db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, scannerIds))
          .then((rows) => new Map(rows.map((u) => [u.id, u.name] as const)))
      : Promise.resolve(new Map<string, string | null>()),
    // Galeri foto acara: hanya dihitung bila viewer boleh mengelolanya dan album tertaut.
    canManageGallery && linkedAlbum
      ? db
          .select({ n: sql<number>`count(*)::int` })
          .from(galleryPhotos)
          .where(eq(galleryPhotos.albumId, linkedAlbum.id))
          .then((r) => r[0]?.n ?? 0)
      : Promise.resolve(0),
  ]);

  const feeOptionById = new Map(feeOptions.map((o) => [o.id, o]));
  // Label kategori tarif untuk satu pendaftaran: pakai NOMINAL EFEKTIF-nya —
  // tergantung tahap (early bird / normal) yang berlaku saat dia mendaftar.
  function feeLabelFor(feeOptionId: string | null, registeredAt: Date | string): string | null {
    if (!feeOptionId) return null;
    const opt = feeOptionById.get(feeOptionId);
    if (!opt) return null;
    const tier = feeTierAt(event.earlyBirdUntil, new Date(registeredAt));
    const eff = amountForTier(tier, opt.amountCny, opt.earlyBirdAmountCny);
    const earlyBird = tier === "early_bird" && opt.earlyBirdAmountCny != null;
    return `${opt.label} (¥${eff}${earlyBird ? " · early bird" : ""})`;
  }
  // Pendaftar (di luar yang dibatalkan) per kategori tarif — untuk "X / kuota"
  // dan penanda kategori yang sudah penuh di panel Kategori Tarif.
  const feeOptionRegCount = new Map<string, number>();
  for (const r of registrations) {
    if (r.reg.status === "cancelled" || !r.reg.feeOptionId) continue;
    feeOptionRegCount.set(r.reg.feeOptionId, (feeOptionRegCount.get(r.reg.feeOptionId) ?? 0) + 1);
  }
  const feeOptionRows = feeOptions.map((o) => {
    const registered = feeOptionRegCount.get(o.id) ?? 0;
    return { ...o, registered, isFull: o.quota != null && registered >= o.quota };
  });
  const pendingVolunteers = volunteerApps.filter((v) => v.app.status === "pending");

  // Sertifikat dianggap terbit hanya bila tautan berkasnya ada (baris lama tanpa berkas tidak dihitung).
  const committeeCertUserIds = issuedCerts.filter((c) => c.kind === "panitia" && c.fileUrl).map((c) => c.userId);
  const participantCertCount = issuedCerts.filter((c) => c.kind === "peserta" && c.fileUrl).length;
  const certByPerson = new Map(issuedCerts.map((c) => [`${c.kind}:${c.userId}`, { fileUrl: c.fileUrl }] as const));

  // Biodata lengkap pendaftar (paspor, KTM, universitas, telpon, jurusan, email,
  // kota, jawaban kustom) tampil untuk BPH Kabinet + Divisi Teknologi
  // (adminScope "full") DAN BPH Panitia acara ini (ketua/wakil/sekretaris/SC) -
  // pengurus inti pelaksana butuh datanya untuk operasional acara. Panitia lain
  // (event.viewRegistrants, DASAR) lihat versi RINGKAS: nama + WeChat ID +
  // kategori/nominal tarif + status keanggotaan + status check-in.
  const canSeeRegistrantDetail = access.isFullAdmin || access.isBphPanitia;
  // Ekspor CSV = unduhan massal (paspor, bukti KTM, kontak) - BPH Kabinet +
  // Divisi Teknologi DAN BPH Panitia acara ini (pengurus inti pelaksana).
  const canExportRegistrants = access.isFullAdmin || access.isBphPanitia;

  // Batalkan/pulihkan pendaftaran — DIPISAH dari canSeeRegistrantDetail di
  // atas: BPH Panitia acara ini (ketua/wakil/sekretaris/supervisor) boleh
  // membatalkan pendaftaran tanpa ikut melihat biodata lengkap/ekspor CSV.
  const canManageRegistrants = can("event.manageRegistrants");

  // Verifikasi pembayaran = data keuangan - digerbang event.manageFinance
  // (grant "Keuangan" per divisi + BPH Panitia + BPH Kabinet). Diturunkan dari
  // `registrations` yang sudah diambil; hanya render-nya yang digerbang.
  const canVerifyPayments = can("event.manageFinance");
  const pendingPayments = canVerifyPayments
    ? registrations
        .filter((r) => r.reg.paymentStatus !== "not_required")
        .map((r) => {
          const opt = r.reg.feeOptionId ? feeOptionById.get(r.reg.feeOptionId) ?? null : null;
          // Tahap (early bird / normal) dari KAPAN peserta ini mendaftar.
          const tier = feeTierAt(event.earlyBirdUntil, new Date(r.reg.registeredAt));
          return {
            id: r.reg.id,
            status: r.reg.paymentStatus,
            proofUrl: r.reg.paymentProofUrl,
            note: r.reg.paymentNote,
            registeredAt: r.reg.registeredAt,
            name: r.userName,
            email: r.userEmail,
            // Nominal yang wajib dibayar peserta ini: kategori tarifnya (dengan
            // tahap yang berlaku saat dia daftar) bila ada, kalau tidak tarif
            // tunggal acara.
            expected: opt ? amountForTier(tier, opt.amountCny, opt.earlyBirdAmountCny) : event.feeCny,
            feeLabel: feeLabelFor(r.reg.feeOptionId, r.reg.registeredAt),
          };
        })
    : [];

  const attended = registrations.filter((r) => r.reg.status === "attended").length;
  // "Terdaftar" di ringkasan section HARUS senada dengan getEventSeats() yang
  // dipakai halaman publik (notCancelled() di event-capacity.ts) - batalkan
  // satu pendaftaran seharusnya langsung mengurangi angka ini juga, bukan
  // cuma yang di halaman publik. registrations.length mentah dulu dipakai
  // langsung di sini dan diam-diam tidak ikut turun.
  const activeRegistrationCount = registrations.filter((r) => r.reg.status !== "cancelled").length;
  // Berhak sertifikat peserta = HANYA yang kehadirannya tercatat (status "attended",
  // QR-nya di-scan). Terkonfirmasi saja tidak cukup. Aturan yang sama dijaga server
  // di certificateCandidates() (actions/committee.ts).
  const certAttendees = registrations
    .filter((r) => r.reg.status === "attended")
    .map((r) => ({
      userId: r.reg.userId,
      name: r.sensusFullName?.trim() || r.userName || r.userEmail || "(tanpa nama)",
      detail: r.userEmail,
      cert: certByPerson.get(`peserta:${r.reg.userId}`) ?? null,
    }));
  const confirmedNotAttended = registrations.filter((r) => r.reg.status === "confirmed").length;
  const certCommittee = committee
    .filter((m) => !!m.userId)
    .map((m) => ({
      userId: m.userId as string,
      name: m.name ?? m.email ?? "(tanpa nama)",
      detail: EVENT_COMMITTEE_ROLE_LABEL[m.role as keyof typeof EVENT_COMMITTEE_ROLE_LABEL] ?? m.role,
      cert: certByPerson.get(`panitia:${m.userId}`) ?? null,
    }));
  const committeeCertCount = certCommittee.filter((p) => p.cert?.fileUrl).length;

  return (
    <div className="py-2">
      <FlashToast />
      <header className="mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">{event.title}</h1>
        <p className="text-body-md text-on-surface-variant">
          {activeRegistrationCount} terdaftar &middot; {attended} hadir
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
            <SubmitButton
              successMessage="Acara diambil alih."
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-label-caps uppercase tracking-wide text-on-background hover:bg-surface-container-low transition-colors"
            >
              Ambil Alih Acara (BPH)
            </SubmitButton>
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
          <EventDescriptionEditor
            defaults={{
              description: event.description ?? "",
              descriptionHtml: event.descriptionHtml,
            }}
          />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadCropper
              name="confirmationContactQr1Url"
              folder="events"
              label="QR Kontak 1 (opsional)"
              defaultValue={event.confirmationContactQr1Url ?? ""}
              hint="Screenshot QR 'tambah kontak' (WeChat dsb). Tampil berdampingan dengan Info Setelah Daftar di atas."
            />
            <ImageUploadCropper
              name="confirmationContactQr2Url"
              folder="events"
              label="QR Kontak 2 (opsional)"
              defaultValue={event.confirmationContactQr2Url ?? ""}
              hint="Kontak kedua, kalau ada. Kosongkan kalau cukup satu."
            />
          </div>
          <AIReviewButton
            context="event"
            fields={[
              { id: "event-description", label: "Deskripsi" },
              { id: "event-agenda", label: "Agenda" },
            ]}
          />
          <SubmitButton
            successMessage="Deskripsi & agenda tersimpan."
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Deskripsi &amp; Agenda
          </SubmitButton>
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
                <input
                  name="locationUrl"
                  type="url"
                  defaultValue={event.locationUrl ?? ""}
                  placeholder="Link peta 1 (mis. Amap) — opsional"
                  className="bg-soft-gray rounded-md p-3 text-body-md"
                />
                <input
                  name="locationUrl2"
                  type="url"
                  defaultValue={event.locationUrl2 ?? ""}
                  placeholder="Link peta 2 (mis. Baidu Maps) — opsional"
                  className="bg-soft-gray rounded-md p-3 text-body-md"
                />
              </div>
              <p className="text-xs text-on-surface-variant -mt-2">Kalau diisi, teks Lokasi di halaman publik jadi tombol langsung ke petunjuk arah (dua tombol kalau dua-duanya diisi).</p>
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
                defaultEarlyBirdUntil={
                  event.earlyBirdUntil ? toDateLocalInput(new Date(event.earlyBirdUntil)) : ""
                }
              />
              {event.isPaid && (
                <p className="text-xs text-on-surface-variant">
                  Butuh tarif bertingkat (mis. Freshmen ¥5 / Non-freshmen ¥10)? Atur di bagian
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
          <SubmitButton
            successMessage="Info & pengaturan tersimpan."
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Info &amp; Pengaturan
          </SubmitButton>
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
            <SubmitButton
              successMessage="Status acara diperbarui."
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Ubah Status
            </SubmitButton>
          </form>
        ) : (event.status === "published" || event.status === "registration_closed") ? (
          <form action={setEventStatus}>
            <input type="hidden" name="eventId" value={id} />
            <input type="hidden" name="status" value={event.status === "published" ? "registration_closed" : "published"} />
            <SubmitButton
              successMessage={event.status === "published" ? "Pendaftaran ditutup." : "Pendaftaran dibuka."}
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              {event.status === "published" ? "Tutup Pendaftaran" : "Buka Pendaftaran"}
            </SubmitButton>
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
                  <SubmitButton
                    successMessage="Pertanyaan tersimpan."
                    className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors"
                  >
                    Simpan
                  </SubmitButton>
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
            <SubmitButton
              successMessage="Pertanyaan ditambahkan."
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
            >
              Tambah
            </SubmitButton>
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
          bertingkat — <strong className="text-on-background">Freshmen ¥5 / Non-freshmen ¥10</strong> untuk WIF,
          satu baris flat untuk booth, satu baris per nomor untuk olahraga. Peserta wajib memilih satu
          saat mendaftar, dan nominal kategori itulah yang harus dibayar.
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          <strong className="text-on-background">Kuota</strong> = batas pendaftar per kategori. Kosong = tanpa
          batas per-kategori (hanya Kapasitas acara yang berlaku). Begitu satu kategori penuh, pendaftaran
          kategori itu saja yang tertutup — kategori lain jalan terus. WIF 2026:
          {" "}<strong className="text-on-background">Freshmen 130 · Non-freshmen 20</strong> (jumlahnya = 150,
          sama dengan Kapasitas peserta; panitia ditugaskan lewat Struktur Kepanitiaan, tidak makan jatah ini).
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          <strong className="text-on-background">Early bird (¥)</strong> = tarif untuk yang mendaftar sebelum{" "}
          <strong className="text-on-background">
            {event.earlyBirdUntil
              ? new Date(event.earlyBirdUntil).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
              : "Batas harga early bird"}
          </strong>{" "}
          (atur di form Edit, bagian HTM). Kosong = kategori ini tidak diskon. Tahap ditentukan dari
          kapan peserta mendaftar, bukan kapan dia bayar.
        </p>
        <div className="flex flex-col gap-3">
          {feeOptionRows.map((o) => (
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
              <label className="flex flex-col gap-1 w-24">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Normal (¥)</span>
                <input name="amountCny" type="number" min={0} defaultValue={o.amountCny} required className="bg-soft-gray rounded-md p-2.5 text-body-md" />
              </label>
              <label className="flex flex-col gap-1 w-24">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Early bird (¥)</span>
                <input
                  name="earlyBirdAmountCny"
                  type="number"
                  min={0}
                  defaultValue={o.earlyBirdAmountCny ?? ""}
                  placeholder="—"
                  className="bg-soft-gray rounded-md p-2.5 text-body-md"
                />
              </label>
              <label className="flex flex-col gap-1 w-20">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kuota</span>
                <input
                  name="quota"
                  type="number"
                  min={0}
                  defaultValue={o.quota ?? ""}
                  placeholder="∞"
                  className="bg-soft-gray rounded-md p-2.5 text-body-md"
                />
              </label>
              <SubmitButton
                successMessage="Kategori tarif tersimpan."
                className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-2 rounded-md hover:bg-surface-container-low transition-colors"
              >
                Simpan
              </SubmitButton>
              <ConfirmButton
                title="Hapus kategori tarif?"
                message={`"${o.label}" dihapus. Pendaftar yang sudah memilihnya kehilangan label kategori (riwayatnya tetap ada).`}
                action={deleteFeeOption}
                payload={{ id: o.id }}
                className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-2 rounded-md"
              >
                Hapus
              </ConfirmButton>
              <p
                className={`w-full text-label-caps uppercase tracking-wide ${
                  o.isFull ? "text-error" : "text-on-surface-variant"
                }`}
              >
                {o.registered}
                {o.quota != null ? ` / ${o.quota}` : ""} terdaftar
                {o.isFull ? " · penuh" : ""}
                {o.earlyBirdAmountCny != null ? ` · early bird ¥${o.earlyBirdAmountCny} → normal ¥${o.amountCny}` : ""}
              </p>
            </form>
          ))}
        </div>
        <form action={saveFeeOption} className="mt-4 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="eventId" value={id} />
          <label className="flex flex-col gap-1 flex-1 min-w-[10rem]">
            <span className="text-label-caps uppercase tracking-wide text-primary-container">+ Label kategori</span>
            <input name="label" required placeholder="mis. Freshmen" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
          </label>
          <label className="flex flex-col gap-1 w-24">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Normal (¥)</span>
            <input name="amountCny" type="number" min={0} required placeholder="15" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
          </label>
          <label className="flex flex-col gap-1 w-24">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Early bird (¥)</span>
            <input name="earlyBirdAmountCny" type="number" min={0} placeholder="—" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
          </label>
          <label className="flex flex-col gap-1 w-20">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kuota</span>
            <input name="quota" type="number" min={0} placeholder="∞" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
          </label>
          <SubmitButton
            successMessage="Kategori tarif ditambahkan."
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
          >
            Tambah
          </SubmitButton>
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
      <>
      <CollapsibleSection
        title="Sertifikat Peserta"
        description={`${certAttendees.length} hadir · ${participantCertCount} terbit`}
      >
        {event.certificateForParticipants ? (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-on-surface-variant max-w-2xl">
              Hanya peserta yang <strong className="text-on-background">kehadirannya tercatat</strong> (QR-nya di-scan
              di acara) yang berhak. Sertifikat <strong className="text-on-background">tidak terbit tanpa tautan
              berkas</strong>: tempel tautan https:// berkas PDF-nya di samping nama, lalu simpan. Saat itu juga
              sertifikatnya muncul di profil peserta dan mereka diberi notifikasi. Untuk banyak orang sekaligus,
              pakai &quot;Tempel banyak sekaligus&quot;.
            </p>
            {confirmedNotAttended > 0 && (
              <p className="text-body-sm text-on-surface-variant">
                {confirmedNotAttended} pendaftar terkonfirmasi belum tercatat hadir, jadi belum berhak. Kalau ada yang
                hadir tapi belum di-scan, catat kehadirannya dulu di daftar pendaftar.
              </p>
            )}
            <CertificateRoster
              eventId={id}
              kind="peserta"
              rows={certAttendees}
              emptyText="Belum ada peserta yang tercatat hadir. Daftar ini terisi saat panitia men-scan QR peserta di acara."
            />
            {certAttendees.length > 0 && <CertificateBulkForm eventId={id} kind="peserta" />}
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Acara ini tidak memberi e-sertifikat kehadiran. Centang &quot;Peserta mendapat e-sertifikat
            kehadiran&quot; di form Edit di atas bila berubah pikiran.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Sertifikat Panitia"
        description={`${certCommittee.length} panitia · ${committeeCertCount} terbit`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Untuk semua anggota kepanitiaan acara ini (susunannya di &quot;Struktur Kepanitiaan&quot;). Sama seperti
            peserta: <strong className="text-on-background">sertifikat baru terbit saat tautan berkasnya
            disimpan</strong>. Judulnya dirakit otomatis dari peran, divisi, dan nama acara.
          </p>
          <CertificateRoster
            eventId={id}
            kind="panitia"
            rows={certCommittee}
            emptyText="Belum ada panitia. Susun kepanitiaan dulu di section Struktur Kepanitiaan."
          />
          {certCommittee.length > 0 && <CertificateBulkForm eventId={id} kind="panitia" />}
        </div>
      </CollapsibleSection>
      </>
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
            <SubmitButton
              successMessage="Album foto dibuat."
              className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
            >
              <Images size={15} className="inline -mt-0.5 mr-1.5" aria-hidden /> Buat Album Foto
            </SubmitButton>
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
      <CollapsibleSection title="Daftar Pendaftar" description={`${activeRegistrationCount} terdaftar · ${attended} hadir`}>
        {registrations.length > 0 && canExportRegistrants && (
          <a
            href={`/api/console/events/${id}/registrations/export`}
            className="self-start inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors mb-3"
            download
          >
            <Download size={13} aria-hidden /> Export ke CSV
          </a>
        )}
        {!canSeeRegistrantDetail && (
          <p className="text-xs text-on-surface-variant mb-3">
            Kamu melihat versi ringkas (nama, kota, kampus, WeChat, tarif, status). Biodata lengkap (paspor,
            KTM, kontak, jurusan, email, jawaban) &amp; ekspor CSV tampil untuk BPH Kabinet, Divisi Teknologi,
            dan BPH Panitia acara ini.
          </p>
        )}
        <RegistrationList
          eventId={id}
          detail={canSeeRegistrantDetail}
          canCancel={canManageRegistrants}
          questions={questions.map((q) => ({ id: q.id, label: q.label }))}
          registrations={registrations.map((r) => ({
            id: r.reg.id,
            userName: r.userName,
            userEmail: r.userEmail,
            status: r.reg.status,
            registeredAt: r.reg.registeredAt.toISOString(),
            answers: r.reg.answersJson ?? {},
            feeLabel: feeLabelFor(r.reg.feeOptionId, r.reg.registeredAt),
            feeCategory: r.reg.feeOptionId ? feeOptionById.get(r.reg.feeOptionId)?.label ?? null : null,
            // WeChat ID = bagian dari versi ringkas (Humas menghubungi peserta).
            // Snapshot biodata (acara requiresBiodata) menang; acara lain
            // (requiresSensus) mengambil dari sensus.
            wechatId: (r.reg.biodataJson as { wechatId?: string } | null)?.wechatId || r.sensusWechat || null,
            // Asal kampus — snapshot biodata dulu, fallback sensus. Ditampilkan
            // di versi LENGKAP.
            university: (r.reg.biodataJson as { university?: string } | null)?.university || r.sensusUniversity || null,
            // Blok biodata (paspor, KTM, universitas, dst.) HANYA BPH Kabinet +
            // Divisi Teknologi — lihat canSeeRegistrantDetail = access.isFullAdmin.
            biodata: canSeeRegistrantDetail ? r.reg.biodataJson ?? null : null,
            checkInBlocked: checkInBlockReason(
              { status: r.reg.status, paymentStatus: r.reg.paymentStatus },
              event.isPaid,
            ),
            checkedInAt: r.reg.checkedInAt ? r.reg.checkedInAt.toISOString() : null,
            checkedInByName: r.reg.checkedInBy ? scannerNames.get(r.reg.checkedInBy) ?? null : null,
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
          <SubmitButton
            successMessage="Laporan pasca-acara tersimpan."
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Laporan Pasca-Acara
          </SubmitButton>
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
          <SubmitButton
            successMessage="Ditambahkan ke kredit."
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Tambah
          </SubmitButton>
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

      {canEditEvaluationQuestions && (
      <CollapsibleSection
        title="Pertanyaan Evaluasi"
        description={evalQuestions.length > 0 ? `${evalQuestions.length} pertanyaan sendiri` : "template standar"}
      >
        <EvaluationQuestionsBuilder
          eventId={id}
          slug={event.slug}
          eventTitle={event.title}
          questions={evalQuestions}
          answerCounts={evalAnswerCounts}
          legacyResponseCount={evaluations.filter((e) => e.ratingRegistration != null).length}
          cityOptions={sortByCoverageOrder(cityRows, (row) => row.label).map((c) => c.label)}
          sections={evaluationTemplateForSlug(event.slug).sections}
        />
      </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Evaluasi Acara"
        description={evaluations.length > 0 ? `${evaluations.length} respons` : "belum ada respons"}
      >
        <EvaluationResults
          eventId={id}
          evaluations={evaluations}
          sections={evaluationTemplateForSlug(event.slug).sections}
          questions={evalQuestions}
          answers={evalAnswers}
        />
      </CollapsibleSection>
        </div>

        {/* Kolom samping: ringkasan + antrean tindakan */}
        <aside className="flex flex-col gap-6 min-w-0 xl:sticky xl:top-6">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3">
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Ringkasan</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-surface-container-low rounded-lg py-3">
                <p className="text-headline-sm text-on-background font-semibold">{activeRegistrationCount}</p>
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
