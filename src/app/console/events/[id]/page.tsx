import { eq, and, asc, desc, like, or, sql, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import QRCode from "qrcode";
import { db } from "@/db";
import { auditLogs, certificates, coverageCities, departments, events, eventCredits, eventDivisions, eventEvaluations, eventFeeOptions, eventQuestions, eventRegistrations, eventResponsibleDepartments, eventVolunteers, galleryAlbums, galleryPhotos, inventoryItems, itemReservations, newsArticles, sensusProfiles, shortLinks, users } from "@/db/schema";
import { MEMBERSHIP_LABEL, effectiveBranch, membershipStatus } from "@/lib/membership-status";
import { updateEventInfo, updateEventCertificateSettings, updateEventContent, updateEventPostReport, setEventStatus, saveEventQuestion, deleteEventQuestion, saveFeeOption, deleteFeeOption } from "@/app/actions/admin-events";
import { createEventGalleryAlbum } from "@/app/actions/admin-content";
import { VolunteerApplicationList } from "@/components/console/volunteer-application-list";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { RegistrationList } from "@/components/console/registration-list";
import { EventCommitteeStructure } from "@/components/console/event-committee-structure";
import { EventResponsibleDepartments } from "@/components/console/event-responsible-departments";
import { listEventDivisions, takeOverEvent, addEventCredit, removeEventCredit } from "@/app/actions/committee";
import { CertificateRoster } from "@/components/console/certificate-roster";
import { CertificateBulkForm } from "@/components/console/certificate-bulk-form";
import { CertificateFolder } from "@/components/console/certificate-folder";
import { EventQuestionFields } from "@/components/events/event-question-fields";
import { EventShareLinks } from "@/components/console/event-share-links";
import { isSheetsConfigured } from "@/lib/google-sheets";
import { getSiteOrigin } from "@/lib/site";
import { EVENT_COMMITTEE_ROLE_LABEL, eventApprovalState } from "@/lib/event-capabilities";
import { canEditCommitteeEvaluation, canReadCommitteeEvaluation, requireEventConsoleAccess } from "@/lib/event-access";
import { EVENT_STATUS_LABEL as STATUS_LABEL } from "@/lib/event-status-labels";
import { EVENT_AUDIT_ACTION_LABEL, type EventAuditAction } from "@/lib/event-audit";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { EventThemeFields } from "@/components/console/event-theme-fields";
import { EventDescriptionEditor } from "@/components/console/event-description-editor";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CollapsibleSection as CollapsibleSectionBase } from "@/components/console/collapsible-section";
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
import { toChinaLocalInput, toDateLocalInput } from "@/lib/datetime";
import { ConfirmButton } from "@/components/console/confirm-button";
import { FlashToast } from "@/components/console/flash-toast";
import { SubmitButton } from "@/components/console/submit-button";
import { CommitteeEvalWindowEditor } from "@/components/console/committee-eval-window-editor";
import { EvalAudienceTabs } from "@/components/console/eval-audience-tabs";
import { CopyButton } from "@/components/copy-button";
import { committeeEvalWindowState } from "@/lib/committee-evaluation";
import { qualifiesForParticipantCertificate } from "@/lib/certificate-eligibility";
import { EventAdminPanel, type EventPanelTab } from "@/components/console/event-admin-panel";
import { EventConsoleHeader } from "@/components/console/event-console-header";
import { EventApprovalPanel } from "@/components/console/event-approval-panel";
import { eventDayLabel, eventLifecycle, eventStage, eventStatusChip, eventTimeLabel } from "@/lib/event-stage";
import { Download, Eye, Images } from "lucide-react";
import { ATTENDANCE_MODE_LABEL, parseAttendanceMode } from "@/lib/event-attendance-mode";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "Teks Pendek",
  textarea: "Teks Panjang",
  select: "Dropdown",
  radio: "Pilihan (radio)",
  multiselect: "Pilih Banyak (centang)",
  file: "Unggah Berkas (PDF/dokumen/gambar)",
};

// Semua bagian halaman kegiatan tertutup saat halaman dibuka (halamannya panjang);
// bagian yang memang butuh tindakan (mis. verifikasi bayar, volunteer menunggu)
// membuka dirinya lewat defaultOpen eksplisit di pemakaiannya. Tiap bagian menjadi
// satu baris dalam SECTION_GROUP, dengan keadaan terkininya di sisi kanan.
function CollapsibleSection(props: ComponentProps<typeof CollapsibleSectionBase>) {
  return <CollapsibleSectionBase defaultOpen={false} flush {...props} />;
}

const SECTION_GROUP =
  "flex flex-col divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest";

// Tombol "Ke Google Sheets" (aksi server di halaman ini) membuat sheet lewat belasan panggilan ke Google;
// beri ruang lebih dari batas bawaan supaya pembuatan pertama sebuah acara tidak terpotong.
export const maxDuration = 60;

export default async function ConsoleEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireEventConsoleAccess(id);
  const can = access.can;
  await publishDueEvents();
  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event) notFound();

  // Tautan pendek pendaftaran & evaluasi: URL absolut + baris short_links yang
  // sudah ada (dibuat dari section "Tautan Pendaftaran & Evaluasi" atau manual
  // di modul Tautan). Pencocokan memakai AKHIRAN path supaya tautan lama
  // (target absolute/domain lama) tetap dikenali. Query-nya ikut gelombang
  // pertama di bawah.
  const shareOrigin = await getSiteOrigin();
  // Tombol "Ke Google Sheets": true = sheet dibuat server, false = salin-tempel.
  const sheetsEnabled = isSheetsConfigured();
  const sharePaths = {
    daftar: `/events/${event.slug}/register`,
    evaluasi: `/events/${event.slug}/evaluasi`,
  };
  const shareDirect = {
    daftar: `${shareOrigin}${sharePaths.daftar}`,
    evaluasi: `${shareOrigin}${sharePaths.evaluasi}`,
  };

  // ===== Evaluasi panitia (kolektif, audiens "panitia" di event_evaluations) =====
  // GERBANG B2 — dihitung SEBELUM Promise.all supaya jawaban beserta nama
  // pengisinya TIDAK PERNAH diambil dari database untuk yang tidak berhak.
  // Editor jendela waktu, rekap lengkap, dan ekspor hanya untuk BPH Kabinet/
  // Teknologi atau BPH Panitia acara ini; panitia lain cukup melihat jumlah
  // pengisi dan statusnya sendiri.
  const canManageCommitteeEval = canReadCommitteeEvaluation(access);
  // Mengubah (jendela, pertanyaan panitia, hapus respons) ikut kunci kepanitiaan:
  // BPH Panitia hanya bisa membaca rekap setelah acara terkunci.
  const canEditCommitteeEval = canEditCommitteeEvaluation(access);

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
    evaluations, // respons evaluasi audiens PESERTA (tab Peserta di section Evaluasi Acara)
    volunteerApps,
    candidates, // kandidat penugasan: SEMUA akun, kepanitiaan tidak terikat jabatan struktural
    albums, // album galeri untuk section "Setelah Acara"
    issuedCerts,
    auditRows,
    credits,
    eventArticles,
    evalQuestions, // pertanyaan evaluasi buatan panitia, audiens peserta (kosong = template tetap)
    evalAnswers, // jawaban pertanyaan itu, dari respons audiens peserta
    evalQuestionsPanitia, // pertanyaan audiens panitia (kosong = template kolektif)
    cityRows, // untuk pratinjau form evaluasi, hanya bila viewer boleh menyusunnya
    committeeEvalRows, // respons audiens panitia + nama/divisi — HANYA untuk pengelola (B2)
    committeeEvalAnswers, // jawaban audiens panitia — HANYA untuk pengelola (B2)
    committeeEvalStats, // (non-pengelola) jumlah respons panitia + apakah dirinya sudah mengisi
    [assetItems, assetReservations], // reservasi aset Inventaris, hanya untuk yang punya grant
    shareLinkRows, // tautan pendek pendaftaran & evaluasi yang sudah dibuat
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
    // Respons evaluasi audiens PESERTA saja — jawaban panitia (audience 'panitia')
    // tampil di tab tersendiri dan tidak boleh ikut menghitung rata-rata peserta.
    db
      .select()
      .from(eventEvaluations)
      .where(and(eq(eventEvaluations.eventId, id), eq(eventEvaluations.audience, "peserta")))
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
    // Pertanyaan + jawaban audiens PESERTA (tab Peserta & builder-nya).
    loadEvaluationQuestions(id),
    loadEvaluationAnswers(id),
    // Pertanyaan audiens panitia (builder + rekap panitia di tab masing-masing).
    loadEvaluationQuestions(id, "panitia"),
    canEditEvaluationQuestions
      ? db.select({ label: coverageCities.label }).from(coverageCities)
      : Promise.resolve([]),
    // B2: baris evaluasi panitia beserta nama & divisinya hanya diambil untuk
    // pengelola (BPH Kabinet/Teknologi atau BPH Panitia acara ini). Panitia lain
    // tidak perlu isinya — cukup angka di committeeEvalStats di bawah.
    canManageCommitteeEval
      ? db
          .select({
            row: eventEvaluations,
            userName: users.name,
            divisionName: eventDivisions.name,
          })
          .from(eventEvaluations)
          .leftJoin(users, eq(eventEvaluations.userId, users.id))
          .leftJoin(eventDivisions, eq(eventEvaluations.divisionId, eventDivisions.id))
          .where(and(eq(eventEvaluations.eventId, id), eq(eventEvaluations.audience, "panitia")))
          .orderBy(desc(eventEvaluations.createdAt))
      : Promise.resolve([]),
    // B2: isi jawaban evaluasi panitia hanya dibaca untuk pengelola; rekapnya
    // dirender dari sini, bukan dari daftar jawaban yang bocor ke semua orang.
    canManageCommitteeEval ? loadEvaluationAnswers(id, "panitia") : Promise.resolve([]),
    // Non-pengelola: jumlah pengisi + apakah penampil sendiri sudah mengisi
    // (status dirinya saja, bukan status orang lain).
    canManageCommitteeEval
      ? Promise.resolve({ total: 0, mine: 0 })
      : db
          .select({
            total: sql<number>`count(*)::int`,
            mine: sql<number>`count(*) filter (where ${eventEvaluations.userId} = ${access.session?.user?.id ?? "00000000-0000-0000-0000-000000000000"})::int`,
          })
          .from(eventEvaluations)
          .where(and(eq(eventEvaluations.eventId, id), eq(eventEvaluations.audience, "panitia")))
          .then((r) => r[0] ?? { total: 0, mine: 0 }),
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
    db
      .select({ slug: shortLinks.slug, targetUrl: shortLinks.targetUrl })
      .from(shortLinks)
      .where(
        or(
          like(shortLinks.targetUrl, `%${sharePaths.daftar}`),
          like(shortLinks.targetUrl, `%${sharePaths.evaluasi}`),
        ),
      ),
  ]);

  // Divisi kabinet penanggung jawab acara (proker) — tabel kecil, dimuat untuk
  // semua yang bisa membuka konsol acara (read-only bila tak boleh mengubah).
  const approvalState = eventApprovalState(event);
  const [allDepartments, responsibleRows, approvalRequester, lastRejection] = await Promise.all([
    db
      .select({ id: departments.id, name: departments.name, parentId: departments.parentDepartmentId })
      .from(departments)
      .orderBy(asc(departments.orderIndex)),
    db
      .select({ departmentId: eventResponsibleDepartments.departmentId })
      .from(eventResponsibleDepartments)
      .where(eq(eventResponsibleDepartments.eventId, id)),
    event.approvalRequestedBy
      ? db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, event.approvalRequestedBy))
          .then((r) => r[0]?.name ?? null)
      : Promise.resolve(null),
    // Menolak mengosongkan kolom pengajuan, jadi alasannya dibaca dari riwayat.
    approvalState === "belum" && event.status === "draft"
      ? db
          .select({ after: auditLogs.afterJson })
          .from(auditLogs)
          .where(and(eq(auditLogs.entityType, "event"), eq(auditLogs.entityId, id), eq(auditLogs.action, "event.approval_rejected")))
          .orderBy(desc(auditLogs.createdAt))
          .limit(1)
          .then((r) => (r[0]?.after as { reason?: string } | null)?.reason ?? null)
      : Promise.resolve(null),
  ]);

  // QR tautan pendek digenerate server-side (sama seperti /console/links);
  // hanya untuk tautan yang memang sudah ada.
  const shareQrBySlug = new Map(
    await Promise.all(
      shareLinkRows.map(
        async (l) => [l.slug, await QRCode.toDataURL(`${shareOrigin}/l/${l.slug}`, { width: 160, margin: 1 })] as const,
      ),
    ),
  );
  const daftarShareLink = shareLinkRows.find((l) => l.targetUrl.endsWith(sharePaths.daftar)) ?? null;
  const evaluasiShareLink = shareLinkRows.find((l) => l.targetUrl.endsWith(sharePaths.evaluasi)) ?? null;

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
  // (adminScope "full") DAN BPH Panitia acara ini (ketua/wakil/sekretaris/bendahara/SC) -
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
  // Berhak sertifikat peserta = tercatat hadir (QR di-scan) DAN sudah mengisi
  // evaluasi dengan akunnya — aturan yang sama dengan certificateCandidates
  // (src/lib/certificate-issuing.ts). Evaluasi tanpa akun tidak dihitung.
  const evaluatedUserIds = new Set(evaluations.map((e) => e.userId).filter((u): u is string => !!u));
  // Acara tanpa absen QR (certificateRequiresAttendance = false): cukup terdaftar
  // (terkonfirmasi atau hadir). Aturan statusnya satu sumber di certificate-eligibility.ts.
  const certRegs = registrations.filter((r) =>
    qualifiesForParticipantCertificate(r.reg.status, event.certificateRequiresAttendance),
  );
  const certBasisLabel = event.certificateRequiresAttendance ? "hadir" : "terdaftar";
  const attendedNotEvaluated = certRegs.filter((r) => !evaluatedUserIds.has(r.reg.userId)).length;
  const certAttendees = certRegs
    .filter((r) => evaluatedUserIds.has(r.reg.userId))
    .map((r) => ({
      userId: r.reg.userId,
      // Email hanya untuk yang boleh melihat detail pendaftar (BPH Kabinet/Teknologi dan BPH
      // Panitia). Panitia dengan hak "Sertifikat" saja melihat nama, seperti di daftar pendaftar
      // ringkas; server tetap mencocokkan tempel massal berdasarkan email maupun nama.
      name: r.sensusFullName?.trim() || r.userName || (canSeeRegistrantDetail ? r.userEmail : null) || "(tanpa nama)",
      detail: canSeeRegistrantDetail ? r.userEmail : null,
      cert: certByPerson.get(`peserta:${r.reg.userId}`) ?? null,
    }));
  const confirmedNotAttended = event.certificateRequiresAttendance
    ? registrations.filter((r) => r.reg.status === "confirmed").length
    : 0;
  const certCommittee = committee
    .filter((m) => !!m.userId)
    .map((m) => ({
      userId: m.userId as string,
      name: m.name ?? (canSeeRegistrantDetail ? m.email : null) ?? "(tanpa nama)",
      detail: EVENT_COMMITTEE_ROLE_LABEL[m.role as keyof typeof EVENT_COMMITTEE_ROLE_LABEL] ?? m.role,
      cert: certByPerson.get(`panitia:${m.userId}`) ?? null,
    }));
  const committeeCertCount = certCommittee.filter((p) => p.cert?.fileUrl).length;

  // ===== Evaluasi panitia (kolektif) — tab "Panitia" di section "Evaluasi Acara" =====
  const committeeEvalWindow = committeeEvalWindowState(event.committeeEvalOpensAt, event.committeeEvalClosesAt);
  // Pertanyaan rekap panitia = baris DB saja. Template kolektif disalin ke DB saat
  // jendela dipasang (saveCommitteeEvaluationWindow), jadi setiap jawaban punya
  // questionId asli; memakai template statis di sini justru membuat kolom rekap
  // tidak cocok dengan jawabannya.
  const committeeQuestions = evalQuestionsPanitia;
  // Respons panitia dipetakan ke bentuk yang dibaca EvaluationResults/CustomResults:
  // nama pengisi dari akun, divisi evaluator di posisi "kota". Data ini hanya
  // ada di memori viewer pengelola (query-nya sendiri sudah digerbang B2).
  const committeeEvaluations = committeeEvalRows.map((r) => ({
    ...r.row,
    respondentName: r.userName,
    respondentCity: r.divisionName,
  }));
  // Hitungan jawaban per pertanyaan panitia (builder memakainya untuk mengunci
  // tipe), diturunkan dari jawaban yang sudah dimuat — sama seperti evalAnswerCounts.
  const committeeAnswerCountMap: Record<string, number> = {};
  for (const a of committeeEvalAnswers) {
    if (a.questionId) committeeAnswerCountMap[a.questionId] = (committeeAnswerCountMap[a.questionId] ?? 0) + 1;
  }

  // ===== Kepala halaman & panel admin =====
  const stage = eventStage(event);
  const chip = eventStatusChip(event, stage);
  const canRequestApproval = can("event.publish") && !access.isFullAdmin;
  const approvalNeedsAction =
    approvalState === "diajukan" ? can("event.approve") : approvalState === "belum" && event.status === "draft" && canRequestApproval;
  const isPubliclyVisible = event.status === "published" || event.status === "registration_closed" || event.status === "completed";
  const canSeePayments = canVerifyPayments && event.isPaid;
  const canManageVolunteers = can("event.manageVolunteers");
  const showQueue = canSeePayments || canManageVolunteers;
  const pendingPaymentCount = canSeePayments ? pendingPayments.filter((p) => p.status === "submitted").length : 0;
  const pendingVolunteerCount = canManageVolunteers ? pendingVolunteers.length : 0;
  // Bagian yang terbuka mengikuti tahap acara; antrean keputusan selalu didahulukan.
  const defaultTab: EventPanelTab =
    stage === "persiapan"
      ? "publik"
      : pendingPaymentCount + pendingVolunteerCount > 0 || stage === "tayang" || stage === "berlangsung"
        ? "internal"
        : "pasca";
  const hasPublicSettings =
    can("event.editContent") ||
    can("event.editInfo") ||
    can("event.publish") ||
    can("event.registrationToggle") ||
    can("event.registrationForm") ||
    can("event.feeTiers");
  const headerStart = event.startAt ? new Date(event.startAt) : null;
  const headerEnd = event.endAt ? new Date(event.endAt) : null;
  const headerDateLabel = headerStart
    ? [
        eventDayLabel(headerStart, "long"),
        [eventTimeLabel(headerStart), headerEnd ? eventTimeLabel(headerEnd) : null].filter(Boolean).join(" – "),
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  const agendaItemCount = (event.agenda ?? "").split("\n").filter((line) => line.trim()).length;
  const hasDescription = !!(event.descriptionHtml?.trim() || event.description?.trim());

  return (
    <div className="mx-auto w-full max-w-[var(--container-max)]">
      <FlashToast />
      <EventConsoleHeader
        title={event.title}
        coverImageUrl={event.coverImageUrl}
        category={event.category}
        sensusOnly={event.requiresSensus}
        chipLabel={chip.label}
        chipTone={chip.tone}
        dateLabel={headerDateLabel}
        location={event.location}
        registered={activeRegistrationCount}
        attended={attended}
        capacity={event.capacity}
        finalAttendeeCount={event.finalAttendeeCount}
        committee={canManageCommittee ? { members: committee.length, divisions: divisions.length } : null}
        queue={showQueue ? { payments: pendingPaymentCount, volunteers: pendingVolunteerCount } : null}
        steps={eventLifecycle(event)}
        publicHref={isPubliclyVisible ? `/events/${event.slug}` : null}
        scanHref={can("event.scanAttendance") ? `/events/${event.slug}/scan` : null}
        scanIsPrimary={stage === "tayang" || stage === "berlangsung"}
      />
      {access.locked && !access.isFullAdmin && (
        <p className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-surface-variant">
          Acara ini <strong className="text-on-background">terkunci</strong> — sudah lewat 2 minggu setelah
          selesai. Panitia hanya bisa melihat; perubahan lewat BPH Kabinet.
        </p>
      )}
      {can("event.takeOver") && access.role == null && (
        <form action={takeOverEvent} className="mt-4">
          <input type="hidden" name="eventId" value={id} />
          <SubmitButton
            successMessage="Acara diambil alih."
            className="inline-flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-label-caps uppercase tracking-wide text-on-background hover:bg-surface-container-low transition-colors"
          >
            Ambil Alih Acara (BPH)
          </SubmitButton>
        </form>
      )}

      <EventAdminPanel
        defaultTab={defaultTab}
        pendingInternal={pendingPaymentCount + pendingVolunteerCount}
        publik={
          hasPublicSettings ? (
        <div className={SECTION_GROUP}>
      {/* Status & publikasi. Buka/tutup pendaftaran = fitur DASAR; ganti status
          lain = wewenang BPH Panitia (event.publish), setelah disetujui BPH Kabinet. */}
      {(can("event.publish") || can("event.registrationToggle")) && (
      <CollapsibleSection
        title="Status & Publikasi"
        description={event.status === "draft" ? chip.label : STATUS_LABEL[event.status] ?? event.status}
        defaultOpen={approvalNeedsAction}
      >
        <div className="flex flex-col gap-4">
        <EventApprovalPanel
          eventId={id}
          state={approvalState}
          isDraft={event.status === "draft"}
          canRequest={canRequestApproval}
          canReview={can("event.approve")}
          requestedBy={approvalRequester}
          requestedAt={event.approvalRequestedAt ? eventDayLabel(event.approvalRequestedAt, "long") : null}
          rejectionReason={lastRejection}
        />
        {access.canRelease ? (
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
        ) : !can("event.publish") ? (
          <p className="text-body-md text-on-surface-variant">
            Pendaftaran hanya bisa dibuka/tutup saat acara sudah dipublikasikan.
          </p>
        ) : event.status !== "draft" ? (
          <p className="text-body-md text-on-surface-variant">Hanya BPH Kabinet yang bisa mengaktifkan lagi acara ini.</p>
        ) : null}
        </div>
      </CollapsibleSection>
      )}
      {/* Info & pengaturan acara — wewenang BPH Panitia (event.editInfo). */}
      {can("event.editInfo") && (
      <CollapsibleSection
        title="Info & Pengaturan Acara"
        description={[headerStart ? eventDayLabel(headerStart) : "Tanggal belum diisi", event.capacity ? `Kapasitas ${event.capacity}` : null, event.isPaid ? "Berbayar" : "Gratis"].filter(Boolean).join(" · ")}
      >
        <form action={updateEventInfo.bind(null, id)} className="flex flex-col gap-4">
          {/* Bagian 1 - identitas acara */}
          <details open className="border border-outline-variant rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container">
              Info Acara
            </summary>
            <div className="px-4 pb-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Judul acara *</span>
                <input id="event-title" name="title" defaultValue={event.title} required placeholder="mis. Nanjing Diaries" className="bg-soft-gray rounded-md p-3 text-body-md" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kategori</span>
                  <input id="event-category" name="category" defaultValue={event.category ?? ""} placeholder="mis. Webinar / Lomba / Sosialisasi" className="bg-soft-gray rounded-md p-3 text-body-md" />
                  <span className="text-xs text-on-surface-variant">Jadi tab filter di /events.</span>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Lokasi (teks)</span>
                  <input id="event-location" name="location" defaultValue={event.location ?? ""} placeholder="mis. Zoom Meeting (Online)" className="bg-soft-gray rounded-md p-3 text-body-md" />
                  <span className="text-xs text-on-surface-variant">Tautan Zoom dll. taruh di &ldquo;Info Setelah Daftar&rdquo;, bukan di sini.</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Link peta 1 (opsional)</span>
                  <input
                    name="locationUrl"
                    type="url"
                    defaultValue={event.locationUrl ?? ""}
                    placeholder="https://… (Amap)"
                    className="bg-soft-gray rounded-md p-3 text-body-md"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Link peta 2 (opsional)</span>
                  <input
                    name="locationUrl2"
                    type="url"
                    defaultValue={event.locationUrl2 ?? ""}
                    placeholder="https://… (Baidu Maps)"
                    className="bg-soft-gray rounded-md p-3 text-body-md"
                  />
                </label>
              </div>
              <p className="text-xs text-on-surface-variant -mt-2">Kalau diisi, Lokasi di halaman publik jadi tombol petunjuk arah.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Mulai</span>
                  <input
                    name="startAt"
                    type="datetime-local"
                    defaultValue={event.startAt ? toDateLocalInput(new Date(event.startAt)) : ""}
                    className="bg-soft-gray rounded-md p-3 text-body-md"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Selesai</span>
                  <input
                    name="endAt"
                    type="datetime-local"
                    defaultValue={event.endAt ? toDateLocalInput(new Date(event.endAt)) : ""}
                    className="bg-soft-gray rounded-md p-3 text-body-md"
                  />
                  <span className="text-xs text-on-surface-variant">Kepanitiaan terkunci 14 hari setelah waktu ini.</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kapasitas</span>
                  <input name="capacity" type="number" min={1} defaultValue={event.capacity ?? ""} placeholder="mis. 60" className="bg-soft-gray rounded-md p-3 text-body-md" />
                  <span className="text-xs text-on-surface-variant">Kosong = tanpa batas.</span>
                </label>
              </div>
              <ImageUploadCropper
                name="coverImageUrl"
                folder="events"
                label="Gambar Sampul"
                placeholder="Tempel URL atau unggah gambar"
                defaultValue={event.coverImageUrl ?? ""}
                aspect={16 / 9}
                allowPaste
                hint="Ideal 1920 × 1080 px (16:9)."
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
          <details className="border border-outline-variant rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container">
              Pendaftaran, Biaya &amp; Jadwal Rilis
            </summary>
            <div className="px-4 pb-4 flex flex-col gap-4">
              <CheckField
                name="requiresSensus"
                defaultChecked={event.requiresSensus}
                label="Hanya untuk peserta dengan sensus lengkap"
                hint="Kota, kampus, dan WeChat diambil dari sensus."
              />
              <CheckField
                name="requiresBiodata"
                defaultChecked={event.requiresBiodata}
                label="Kumpulkan biodata lengkap peserta saat mendaftar (WIF dsb.)"
                hint="Termasuk paspor dan bukti mahasiswa aktif. Yang sensusnya lengkap tidak perlu mengetik ulang."
              />
              <CheckField
                name="offersAttendanceMode"
                defaultChecked={event.offersAttendanceMode}
                label="Tanyakan hadir online atau offline saat mendaftar (NYALA dsb.)"
                hint="Peserta wajib memilih. Tiketnya lalu menampilkan QR grup sesuai pilihan; unggah kedua QR di bagian Deskripsi & Agenda."
              />
              <CheckField
                name="volunteerSignupOpen"
                defaultChecked={event.volunteerSignupOpen}
                label="Buka pendaftaran volunteer publik"
                hint="Orang luar bisa melamar dari halaman acara."
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
                  Tarif bertingkat diatur di &ldquo;Kategori Tarif&rdquo; dan menggantikan angka di atas.
                </p>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Batas pendaftaran</span>
                <input
                  name="registrationDeadline"
                  type="datetime-local"
                  defaultValue={event.registrationDeadline ? toDateLocalInput(new Date(event.registrationDeadline)) : ""}
                  className="bg-soft-gray rounded-md p-3 text-body-md"
                />
                <p className="text-xs text-on-surface-variant">Lewat dari ini pendaftaran tertutup otomatis. Kosong = tanpa batas.</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jadwal rilis publikasi (opsional)</span>
                {access.canRelease ? (
                  <>
                    <input
                      name="scheduledPublishAt"
                      type="datetime-local"
                      defaultValue={event.scheduledPublishAt ? toDateLocalInput(new Date(event.scheduledPublishAt)) : ""}
                      className="bg-soft-gray rounded-md p-3 text-body-md"
                    />
                    <p className="text-xs text-on-surface-variant">Acara terbit sendiri pada waktu ini. Kosong = tetap Draf sampai dipublikasikan manual.</p>
                  </>
                ) : (
                  <p className="text-body-sm text-on-surface-variant">Bisa diatur setelah acara disetujui BPH Kabinet.</p>
                )}
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
      </CollapsibleSection>
      )}
      {/* Deskripsi & agenda — fitur DASAR: semua panitia acara bisa. */}
      {can("event.editContent") && (
      <CollapsibleSection
        title="Deskripsi & Agenda"
        description={`${hasDescription ? "Deskripsi terisi" : "Deskripsi kosong"} · ${agendaItemCount} butir agenda`}
      >
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
              placeholder="mis. grup WeChat, tautan Zoom"
              rows={3}
              className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
            />
            <p className="text-xs text-on-surface-variant">Muncul di tiket, hanya terlihat oleh pendaftar.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadCropper
              name="confirmationContactQr1Url"
              folder="events"
              label="QR Kontak 1 (opsional)"
              defaultValue={event.confirmationContactQr1Url ?? ""}
              hint="Screenshot QR tambah kontak (WeChat dsb)."
            />
            <ImageUploadCropper
              name="confirmationContactQr2Url"
              folder="events"
              label="QR Kontak 2 (opsional)"
              defaultValue={event.confirmationContactQr2Url ?? ""}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadCropper
              name="groupQrOnlineUrl"
              folder="events"
              label="QR Grup Online (opsional)"
              defaultValue={event.groupQrOnlineUrl ?? ""}
              hint="Tampil di tiket peserta yang memilih online. Hanya terpakai bila “Tanyakan hadir online atau offline” menyala."
            />
            <ImageUploadCropper
              name="groupQrOfflineUrl"
              folder="events"
              label="QR Grup Offline (opsional)"
              defaultValue={event.groupQrOfflineUrl ?? ""}
              hint="Tampil di tiket peserta yang memilih offline."
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
      {can("event.registrationForm") && (
      <CollapsibleSection
        title="Pertanyaan Pendaftaran"
        description={questions.length > 0 ? `${questions.length} pertanyaan` : "Form standar"}
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">Jawabannya tampil di Daftar Pendaftar.</p>
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

        {/* Pratinjau memakai komponen field yang SAMA dengan form pendaftaran
            publik (event-question-fields) - tampilan persis, semua kontrol mati. */}
        <details className="group mt-4 rounded-lg border border-outline-variant">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-label-caps uppercase tracking-wide text-on-background">
            <Eye size={16} aria-hidden="true" /> Pratinjau form pendaftaran
          </summary>
          <div className="flex flex-col gap-4 border-t border-outline-variant p-4">
            <p role="note" className="rounded-lg border border-primary-container/40 bg-primary-container/10 px-4 py-3 text-body-md text-on-background">
              Pratinjau saja, tidak ada yang tersimpan.
            </p>
            {questions.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">
                Belum ada pertanyaan tambahan — pendaftar hanya mengisi form standar.
              </p>
            ) : (
              <div className="flex max-w-xl flex-col gap-4">
                <EventQuestionFields questions={questions} preview fileHint="Unggah berkas (pratinjau)" />
              </div>
            )}
          </div>
        </details>
      </CollapsibleSection>
      )}
      {can("event.feeTiers") && (
      <CollapsibleSection
        title="Kategori Tarif"
        description={feeOptions.length > 0 ? `${feeOptions.length} kategori` : "Tarif tunggal"}
      >
        <ul className="mb-4 flex max-w-2xl list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface-variant">
          <li>Kalau ada kategori, peserta wajib memilih satu dan membayar nominalnya.</li>
          <li>
            <strong className="text-on-background">Kuota</strong>: kosong = hanya Kapasitas acara yang berlaku. Kategori
            yang penuh tertutup sendiri. Panitia tidak memakai kuota ini.
          </li>
          <li>
            <strong className="text-on-background">Early bird</strong>: untuk yang mendaftar sebelum{" "}
            {event.earlyBirdUntil
              ? new Date(event.earlyBirdUntil).toLocaleString("id-ID", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" })
              : "batas yang diatur di Info & Pengaturan Acara"}
            . Dihitung dari waktu daftar, bukan waktu bayar.
          </li>
        </ul>
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
      {/* Tautan pendek pendaftaran & evaluasi — fitur DASAR: bisa dibuat
          sekali klik di sini, tanpa membuka modul Tautan. Judulnya tampil di
          direktori publik /l, jadi baru muncul setelah acara disetujui. */}
      {can("event.editContent") && (access.approved || access.isFullAdmin) && (
      <CollapsibleSection
        title="Tautan Pendaftaran & Evaluasi"
        description={daftarShareLink && evaluasiShareLink ? "Tautan pendek & QR sudah dibuat" : "Belum ada tautan pendek"}
      >
        <EventShareLinks
          eventId={id}
          status={event.status}
          scheduledPublishLabel={
            event.scheduledPublishAt
              ? new Date(event.scheduledPublishAt).toLocaleString("id-ID", {
                  dateStyle: "long",
                  timeStyle: "short",
                  timeZone: "Asia/Shanghai",
                })
              : null
          }
          daftar={{
            directUrl: shareDirect.daftar,
            slug: daftarShareLink?.slug ?? null,
            qrDataUrl: daftarShareLink ? shareQrBySlug.get(daftarShareLink.slug) ?? null : null,
          }}
          evaluasi={{
            directUrl: shareDirect.evaluasi,
            slug: evaluasiShareLink?.slug ?? null,
            qrDataUrl: evaluasiShareLink ? shareQrBySlug.get(evaluasiShareLink.slug) ?? null : null,
          }}
        />
      </CollapsibleSection>
      )}
        </div>
          ) : (
            <p className="rounded-lg border border-dashed border-outline-variant p-4 text-body-md text-on-surface-variant">
              Akun ini tidak memegang pengaturan publik untuk acara ini.
            </p>
          )
        }
        internal={
          <div className="flex flex-col gap-4">
          {!canVerifyPayments && event.isPaid && (
            <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-body-sm text-on-surface-variant">
              <span className="font-medium text-on-background">Verifikasi pembayaran</span> dikerjakan bendahara atau BPH
              panitia acara ini. Peserta yang belum lunas belum bisa check-in; arahkan mereka ke bendahara.
            </p>
          )}
        <div className={SECTION_GROUP}>
          {canVerifyPayments && event.isPaid && (
            <CollapsibleSection
              title="Verifikasi Pembayaran"
              description={`${pendingPayments.filter((p) => p.status === "submitted").length} menunggu verifikasi`}
              defaultOpen={pendingPayments.some((p) => p.status === "submitted")}
            >
              <p className="text-body-md text-on-surface-variant mb-1">Cocokkan dengan mutasi Alipay/rekening:</p>
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
                  : "Pendaftaran tutup"
            }
            defaultOpen={pendingVolunteers.length > 0}
          >
            {!event.volunteerSignupOpen && (
              <p className="text-body-md text-on-surface-variant mb-4">
                Pendaftaran publik sedang <strong className="text-on-background">tutup</strong>. Centang
                &quot;Buka pendaftaran volunteer publik&quot; di Info &amp; Pengaturan Acara (tab Publik).
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
            Versi ringkas. Biodata lengkap dan ekspor CSV hanya untuk BPH Kabinet, Divisi Teknologi, dan BPH Panitia acara ini.
          </p>
        )}
        <RegistrationList
          eventId={id}
          detail={canSeeRegistrantDetail}
          canCancel={canManageRegistrants}
          exportHref={canExportRegistrants ? `/api/console/events/${id}/registrations/export` : undefined}
          sheetsEnabled={sheetsEnabled}
          questions={questions.map((q) => ({ id: q.id, label: q.label }))}
          registrations={registrations.map((r) => ({
            id: r.reg.id,
            userName: r.userName,
            // Email dan jawaban formulir hanya untuk versi LENGKAP. Dipotong di
            // server, bukan disembunyikan di UI: yang dikirim ke browser sudah
            // terbaca oleh siapa pun yang membuka payload halaman.
            userEmail: canSeeRegistrantDetail ? r.userEmail : null,
            status: r.reg.status,
            registeredAt: r.reg.registeredAt.toISOString(),
            answers: canSeeRegistrantDetail ? r.reg.answersJson ?? {} : {},
            feeLabel: feeLabelFor(r.reg.feeOptionId, r.reg.registeredAt),
            feeCategory: r.reg.feeOptionId ? feeOptionById.get(r.reg.feeOptionId)?.label ?? null : null,
            attendanceMode: (() => {
              const m = parseAttendanceMode(r.reg.attendanceMode);
              return m ? ATTENDANCE_MODE_LABEL[m] : null;
            })(),
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
      {canBorrowAssets && (
      <CollapsibleSection
        title="Reservasi Aset (Inventaris)"
        description={`${assetReservations.length} aset diblokir`}
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
      <CollapsibleSection
        title="Divisi Penanggung Jawab"
        description={responsibleRows.length > 0 ? `${responsibleRows.length} divisi` : "Belum ada"}
      >
        <p className="text-body-md text-on-surface-variant mb-4 max-w-2xl">
          Anggotanya bisa mengelola acara ini, selama divisinya memegang centang &quot;Kegiatan&quot; di Organisasi. Hanya
          admin penuh yang bisa mengubah.
        </p>
        <EventResponsibleDepartments
          eventId={id}
          departments={allDepartments}
          selected={responsibleRows.map((r) => r.departmentId)}
          canEdit={access.isFullAdmin}
        />
      </CollapsibleSection>
      {canViewAuditLog && (
      <CollapsibleSection title="Riwayat Audit" description={`${auditRows.length} catatan terakhir`}>
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
                  {a.actorName ?? "(sistem)"} · {new Date(a.log.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Shanghai", dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
      )}
        </div>
          </div>
        }
        pasca={
        <div className={SECTION_GROUP}>
      {/* Laporan pasca-acara — fitur DASAR: semua panitia (Humas/Dokumentasi
          biasanya yang mengisi). */}
      {can("event.postEventReport") && (
      <CollapsibleSection
        title="Setelah Acara"
        description={
          event.finalAttendeeCount != null || event.recapVideoUrl
            ? [event.finalAttendeeCount != null ? `${event.finalAttendeeCount} hadir` : null, event.recapVideoUrl ? "Ada video recap" : null].filter(Boolean).join(" · ")
            : "Belum diisi"
        }
      >
        <form action={updateEventPostReport.bind(null, id)} className="flex flex-col gap-4">
          <p className="text-xs text-on-surface-variant">
            Begitu acara lewat, halaman publik menampilkan angka kehadiran dan dokumentasi ini.
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
                Check-in portal saat ini: {attended}. Kosong = pakai angka terdaftar.
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
            <p className="text-xs text-on-surface-variant">Tampil sebagai tombol &quot;Tonton Recap&quot;.</p>
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
              Fotonya diunggah di{" "}
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
      {canManageGallery && (
      <CollapsibleSection
        title="Galeri Foto Acara"
        description={linkedAlbum ? `Album: ${linkedAlbum.title} · ${albumPhotoCount} foto` : "Belum ada album"}
      >
        {linkedAlbum ? (
          <div className="flex flex-col gap-3">
            <p className="text-body-md text-on-surface-variant max-w-2xl">Foto highlight tampil di halaman acara publik.</p>
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
      {can("event.editInfo") && (
      <CollapsibleSection
        title="Aturan Sertifikat & Evaluasi"
        description={[
          event.certificateForParticipants
            ? `Sertifikat untuk yang ${event.certificateRequiresAttendance ? "hadir" : "terdaftar"}`
            : "Tanpa sertifikat peserta",
          event.evaluationAllowsAnonymous ? "Evaluasi boleh anonim" : "Evaluasi atas nama",
        ].join(" · ")}
      >
        <form action={updateEventCertificateSettings.bind(null, id)} className="flex flex-col gap-3">
          <CheckField
            name="certificateForParticipants"
            defaultChecked={event.certificateForParticipants}
            label="Peserta mendapat e-sertifikat kehadiran"
          />
          <CheckField
            name="certificateRequiresAttendance"
            defaultChecked={event.certificateRequiresAttendance}
            label="Sertifikat hanya untuk yang tercatat hadir (QR di-scan)"
            hint="Matikan untuk acara tanpa absen QR. Cukup terdaftar dan mengisi evaluasi dengan akun."
          />
          <CheckField
            name="evaluationAllowsAnonymous"
            defaultChecked={event.evaluationAllowsAnonymous}
            label="Evaluasi peserta boleh dikirim anonim"
            hint="Matikan kalau evaluasi harus atas nama. Respons yang sudah masuk tidak berubah."
          />
          <SubmitButton
            successMessage="Aturan tersimpan."
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Aturan
          </SubmitButton>
        </form>
      </CollapsibleSection>
      )}
      {can("event.issueCertificates") && (
      <>
      <CollapsibleSection
        title="Sertifikat Peserta"
        description={`${certRegs.length} ${certBasisLabel} · ${certAttendees.length} berhak · ${participantCertCount} terbit`}
      >
        {event.certificateForParticipants ? (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-on-surface-variant max-w-2xl">
              Yang berhak: peserta yang{" "}
              <strong className="text-on-background">
                {event.certificateRequiresAttendance ? "tercatat hadir (QR di-scan)" : "terdaftar"}
              </strong>{" "}
              dan <strong className="text-on-background">mengisi evaluasi dengan akunnya</strong>. Menyimpan tautan folder
              langsung menerbitkan untuk semua yang berhak; yang berhak belakangan otomatis menyusul.
            </p>
            {attendedNotEvaluated > 0 && (
              <p className="text-body-sm text-on-surface-variant">
                {attendedNotEvaluated} peserta {certBasisLabel} belum mengisi evaluasi dengan akunnya. Bagikan{" "}
                <code className="text-on-background">/events/{event.slug}/evaluasi</code>.
              </p>
            )}
            {confirmedNotAttended > 0 && (
              <p className="text-body-sm text-on-surface-variant">
                {confirmedNotAttended} pendaftar belum tercatat hadir. Kalau hadir tapi belum di-scan, catat di Daftar
                Pendaftar.
              </p>
            )}
            {certRegs.length > 0 && (
              <CertificateFolder
                eventId={id}
                kind="peserta"
                folderUrl={event.certificateFolderPesertaUrl ?? ""}
                eligibleCount={certAttendees.length}
              />
            )}
            <CertificateRoster
              eventId={id}
              kind="peserta"
              rows={certAttendees}
              emptyText={
                certRegs.length === 0
                  ? event.certificateRequiresAttendance
                    ? "Belum ada peserta yang tercatat hadir. Daftar ini terisi saat panitia men-scan QR peserta di acara."
                    : "Belum ada peserta yang terdaftar."
                  : `Belum ada peserta ${certBasisLabel} yang mengisi evaluasi dengan akunnya.`
              }
            />
            {certAttendees.length > 0 && <CertificateBulkForm eventId={id} kind="peserta" />}
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Acara ini tidak memberi e-sertifikat kehadiran. Centang &quot;Peserta mendapat e-sertifikat
            kehadiran&quot; di Aturan Sertifikat &amp; Evaluasi di atas bila berubah pikiran.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Sertifikat Panitia"
        description={`${certCommittee.length} panitia · ${committeeCertCount} terbit`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Sertifikat terbit saat tautan berkasnya disimpan. Judulnya dirakit otomatis dari peran, divisi, dan nama acara.
          </p>
          {certCommittee.length > 0 && (
            <CertificateFolder
              eventId={id}
              kind="panitia"
              folderUrl={event.certificateFolderPanitiaUrl ?? ""}
              eligibleCount={certCommittee.length}
            />
          )}
          <CertificateRoster
            eventId={id}
            kind="panitia"
            rows={certCommittee}
            emptyText="Belum ada panitia. Susun kepanitiaan dulu di Struktur Kepanitiaan (tab Internal)."
          />
          {certCommittee.length > 0 && <CertificateBulkForm eventId={id} kind="panitia" />}
        </div>
      </CollapsibleSection>
      </>
      )}
      {/* Evaluasi peserta & panitia dalam SATU section (K7: tanpa section tambahan
          di halaman konsol acara yang sudah panjang). Aturan B2 berlaku: isi
          jawaban dan nama pengisi panitia hanya untuk pengelola (BPH Kabinet/
          Teknologi atau BPH Panitia acara ini); panitia lain hanya melihat jumlah
          pengisi dan statusnya sendiri. */}
      <CollapsibleSection
        title="Evaluasi Acara"
        description={
          [
            `${evaluations.length} respons peserta`,
            canManageCommitteeEval ? `${committeeEvaluations.length} respons panitia` : `${committeeEvalStats.total} panitia sudah mengisi`,
          ].join(" · ")
        }
      >
        <EvalAudienceTabs
          peserta={
            <EvaluationResults
              eventId={id}
              sheetsEnabled={sheetsEnabled}
              evaluations={evaluations}
              sections={evaluationTemplateForSlug(event.slug).sections}
              questions={evalQuestions}
              answers={evalAnswers}
            />
          }
          panitia={
            canManageCommitteeEval ? (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tautan pengisian untuk grup panitia</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <code className="text-body-sm bg-surface-container-low px-2 py-1 rounded break-all">
                      {`${shareOrigin}/events/${event.slug}/evaluasi-panitia`}
                    </code>
                    <CopyButton value={`${shareOrigin}/events/${event.slug}/evaluasi-panitia`} label="Salin tautan" />
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    Hanya panitia acara ini yang login yang bisa mengisi, dan hanya selama jendela di bawah terbuka.
                  </p>
                </div>
                {canEditCommitteeEval ? (
                <CommitteeEvalWindowEditor
                  eventId={id}
                  // Jam Tiongkok, bukan jam server: aksi simpannya membaca nilai
                  // ini sebagai jam Tiongkok juga (parseChinaLocalInput).
                  opensAt={event.committeeEvalOpensAt ? toChinaLocalInput(new Date(event.committeeEvalOpensAt)) : ""}
                  closesAt={event.committeeEvalClosesAt ? toChinaLocalInput(new Date(event.committeeEvalClosesAt)) : ""}
                  presetOpens={event.endAt ? toChinaLocalInput(new Date(event.endAt)) : toChinaLocalInput(new Date())}
                  windowLabel={
                    committeeEvalWindow === "open"
                      ? "Jendela pengisian sedang TERBUKA"
                      : committeeEvalWindow === "before"
                        ? "Jendela pengisian belum dibuka"
                        : committeeEvalWindow === "closed"
                          ? "Jendela pengisian sudah ditutup"
                          : "Jendela pengisian belum dipasang"
                  }
                  windowNote="Kosongkan keduanya lalu simpan untuk melepas jadwal. Saat pertama disimpan, pertanyaan template disiapkan otomatis bila tab Panitia di Pertanyaan Evaluasi masih kosong."
                  scheduleLabel="Durasi pintasan"
                  opensLabel="Buka"
                  closesLabel="Tutup"
                  presetLabel="Buka setelah acara"
                  clearLabel="Kosongkan jadwal"
                  saveLabel="Simpan jendela"
                  clearConfirmNote="Status jendela dihitung otomatis dari waktu saat ini — panitia hanya bisa mengisi selama terbuka."
                />
                ) : (
                  <p className="text-body-md text-on-surface-variant max-w-2xl">
                    Acara ini sudah terkunci (14 hari setelah selesai): jendela pengisian hanya bisa diubah BPH Kabinet.
                  </p>
                )}
                <EvaluationResults
                  eventId={id}
                  sheetsEnabled={sheetsEnabled}
                  exportAudience="panitia"
                  evaluations={committeeEvaluations}
                  sections={[]}
                  questions={committeeQuestions}
                  answers={committeeEvalAnswers}
                />
              </div>
            ) : (
              <div className="text-body-md text-on-surface-variant max-w-2xl flex flex-col gap-2">
                <p>
                  {committeeEvalStats.total > 0
                    ? `${committeeEvalStats.total} dari ${committee.length} panitia sudah mengisi${
                        committeeEvalStats.mine > 0 ? " — termasuk kamu. Terima kasih!" : "."
                      }`
                    : "Belum ada yang mengisi."}
                </p>
                <p>
                  Rekap lengkap (nama &amp; jawaban) hanya tampil untuk BPH. Pengisian lewat{" "}
                  <code className="text-body-sm bg-surface-container-low px-1.5 py-0.5 rounded">
                    /events/{event.slug}/evaluasi-panitia
                  </code>{" "}
                  selama jendela terbuka.
                </p>
              </div>
            )
          }
        />
      </CollapsibleSection>
      {canEditEvaluationQuestions && (
      <CollapsibleSection
        title="Pertanyaan Evaluasi"
        description={
          evalQuestions.length > 0 || evalQuestionsPanitia.length > 0
            ? `${evalQuestions.length} peserta · ${evalQuestionsPanitia.length} panitia`
            : "Template standar"
        }
      >
        <EvalAudienceTabs
          peserta={
            <EvaluationQuestionsBuilder
              eventId={id}
              slug={event.slug}
              eventTitle={event.title}
              audience="peserta"
              questions={evalQuestions}
              answerCounts={evalAnswerCounts}
              legacyResponseCount={evaluations.filter((e) => e.ratingRegistration != null).length}
              cityOptions={sortByCoverageOrder(cityRows, (row) => row.label).map((c) => c.label)}
              sections={evaluationTemplateForSlug(event.slug).sections}
            />
          }
          panitia={
            // Pertanyaan yang menilai kepanitiaan disusun BPH, bukan anggota
            // panitia yang ikut dinilai. Server action-nya memakai gerbang yang
            // sama (requireQuestionAccess di actions/event-evaluation-questions.ts).
            canEditCommitteeEval ? (
              <EvaluationQuestionsBuilder
                eventId={id}
                slug={event.slug}
                eventTitle={event.title}
                audience="panitia"
                questions={evalQuestionsPanitia}
                answerCounts={committeeAnswerCountMap}
                legacyResponseCount={0}
                cityOptions={[]}
                sections={[]}
              />
            ) : (
              <p className="text-body-md text-on-surface-variant max-w-2xl">
                {canManageCommitteeEval
                  ? "Acara ini sudah terkunci (14 hari setelah selesai): pertanyaan evaluasi panitia hanya bisa diubah BPH Kabinet."
                  : "Pertanyaan evaluasi panitia disusun oleh BPH Panitia atau BPH Kabinet."}
                {evalQuestionsPanitia.length > 0
                  ? ` Saat ini ada ${evalQuestionsPanitia.length} pertanyaan.`
                  : " Pertanyaannya disiapkan otomatis saat BPH memasang jendela pengisian."}
              </p>
            )
          }
        />
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
          Nama panitia di halaman acara publik. Tidak memberi akses konsol apa pun.
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
        </div>
        }
      />

      <div className="mt-8">
      {can("event.delete") && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-surface-container-lowest p-5">
          <div className="min-w-0">
            <p className="text-body-md font-medium text-on-background">Pindahkan kegiatan ke Sampah</p>
            <p className="text-body-sm text-on-surface-variant">
              Hilang dari situs publik dan akses panitia. Datanya tetap tersimpan dan bisa dipulihkan dari Sampah.
            </p>
          </div>
          <DeleteEventButton eventId={id} label="Pindahkan ke Sampah" />
        </section>
      )}
      {access.canDeleteOwnDraft && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-surface-container-lowest p-5">
          <p className="min-w-0 text-body-md font-medium text-on-background">Hapus draf ini</p>
          <DeleteEventButton eventId={id} label="Hapus Draf" ownDraft />
        </section>
      )}
      </div>
    </div>
  );
}
