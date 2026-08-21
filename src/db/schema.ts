import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  doublePrecision,
  primaryKey,
  uniqueIndex,
  AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const userStatusEnum = pgEnum("user_status", ["invited", "active", "inactive", "suspended"]);
export const sensusCompletionEnum = pgEnum("sensus_completion_status", ["incomplete", "complete"]);
export const orgDocTypeEnum = pgEnum("org_document_type", ["ad_art", "guideline", "other"]);
export const branchRegionEnum = pgEnum("branch_region", ["north", "east", "south", "central", "west"]);
export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "scheduled",
  "published",
  "registration_closed",
  "completed",
  "cancelled",
]);
export const eventRegistrationStatusEnum = pgEnum("event_registration_status", [
  "pending",
  "confirmed",
  "attended",
  "cancelled",
]);
// Pembayaran acara diverifikasi bendahara, bukan lewat payment gateway: Alipay/
// WeChat Pay butuh merchant account berbadan hukum Tiongkok dan QR pribadi tidak
// punya webhook (lihat catatan di src/lib/email.ts & halaman donasi).
export const paymentStatusEnum = pgEnum("payment_status", ["not_required", "unpaid", "submitted", "verified", "rejected"]);
export const publishStatusEnum = pgEnum("publish_status", ["draft", "published"]);
export const jobTypeEnum = pgEnum("job_type", ["internship", "full_time", "part_time", "volunteer"]);
export const jobPostingStatusEnum = pgEnum("job_posting_status", ["open", "closed"]);
export const jobApplicationStatusEnum = pgEnum("job_application_status", [
  "submitted",
  "under_review",
  "interview",
  "offered",
  "rejected",
]);
export const mentorshipStatusEnum = pgEnum("mentorship_status", ["pending", "matched", "rejected"]);
export const membershipApplicationStatusEnum = pgEnum("membership_application_status", [
  "pending",
  "reviewed",
  "accepted",
  "rejected",
]);
// One source of truth for an item's physical state across inventoryItems,
// itemContributions and externalLoans. Expanded 2026-08-15 from the original
// 3 values (good/damaged/retired) - backwards compatible, the 3 old values
// remain valid.
export const inventoryConditionEnum = pgEnum("inventory_condition", [
  "new", // baru / belum pernah dipakai
  "good", // baik / masih bagus
  "fair", // cukup baik - ada tanda pakai, tapi masih layak fungsi
  "damaged", // rusak
  "retired", // dipensiunkan / tidak dipakai lagi
]);
export const borrowRequestStatusEnum = pgEnum("borrow_request_status", [
  "pending",
  "approved",
  "rejected",
  "borrowed",
  "returned",
  "overdue",
]);
export const inventoryAuditActionEnum = pgEnum("inventory_audit_action", [
  "added",
  "adjusted",
  "damaged",
  "retired",
  "lent_external",
  "returned_external",
]);

export const externalLoanStatusEnum = pgEnum("external_loan_status", ["active", "returned", "overdue"]);
export const reportTypeEnum = pgEnum("report_type", [
  "event_attendance",
  "inventory_audit",
  "sensus_summary",
  "student_export",
  "custom",
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["email", "in_app", "push"]);
export const feedbackCategoryEnum = pgEnum("feedback_category", ["bug", "design", "feature", "general"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["new", "in_review", "resolved"]);
// See docs/Data Dictionary.md "Admin Access Rule" - sourced from the 2026/2027 recruitment guidebook.
export const accessTierEnum = pgEnum("access_tier", ["full", "scoped", "advisory"]);

// ---------- 1. Identity & Access ----------

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(), // e.g. "Ketua Umum", "Koordinator Divisi", "Anggota Divisi"
  // Drives admin-console authorization (checked in app middleware, not Postgres RLS):
  // 'full' = sees every admin module regardless of department.
  // 'scoped' = sees only the modules listed in their department's adminModuleScope.
  // 'advisory' = Dewan Pembina - no operational admin access.
  accessTier: accessTierEnum("access_tier").notNull().default("scoped"),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(), // e.g. "event.publish", "user.manage"
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);

// Doubles as the Auth.js "users" table (adapter expects id/name/email/emailVerified/image).
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  avatarUrl: text("avatar_url"),
  roleId: uuid("role_id").references(() => roles.id),
  phone: text("phone"),
  wechatId: text("wechat_id"),
  // All optional social links - "kalau ada yang punya" (confirmed 2026-08-15).
  // No separate public contact-email column: users.email (login identity) IS
  // the public contact address, on purpose.
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  githubUrl: text("github_url"),
  spotifyUrl: text("spotify_url"),
  tiktokUrl: text("tiktok_url"),
  status: userStatusEnum("status").notNull().default("active"),
  // Null = never asked yet (triggers the first-login onboarding prompt). True/false
  // once the user has answered. Opt-in by design - never defaults to true.
  emailSubscribed: boolean("email_subscribed"),
  // "id" | "en" (see src/lib/i18n/config.ts LOCALES). Null = never chosen
  // explicitly - render falls back to the NEXT_LOCALE cookie, then
  // Accept-Language, then "id". Nullable on purpose, same pattern as
  // emailSubscribed above: "never chosen" must stay distinguishable from
  // "deliberately chose id".
  locale: text("locale"),
  // bcrypt hash of the user's password for the email/password (Credentials) sign-in
  // path. Null for Google-OAuth-only accounts (they have no password). Never returned
  // to the client and never logged - see src/lib/password.ts.
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Property names for the 6 token fields must be exact snake_case - the
// @auth/drizzle-adapter's PostgresDrizzleAdapter accesses accountsTable.refresh_token
// etc. directly as JS properties (matching OAuth2 response field names), not just
// the underlying DB column name. camelCase properties here type-check fine on
// their own but fail DrizzleAdapter's DefaultPostgresAccountsTable shape and,
// worse, would silently write undefined for these columns at runtime.
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const sensusProfiles = pgTable("sensus_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

  // BIODATA
  fullName: text("full_name"),
  // UNIQUE: satu orang = satu baris sensus, ditegakkan lewat nomor paspor.
  // `user_id` yang unik saja tidak cukup — satu orang bisa punya dua akun
  // Google (pribadi + kampus), mengisi sensus dua kali, lalu terhitung dua
  // anggota di sini DAN terkirim dobel ke pusat. Nomor paspor adalah satu-
  // satunya identitas yang benar-benar unik per orang di form ini (email tidak
  // ada di form pusat sama sekali). NULL boleh berulang — profil yang belum
  // diisi memang belum punya nomor paspor, dan Postgres mengizinkan banyak NULL
  // pada kolom unique, jadi itu persis perilaku yang diinginkan.
  passportNumber: text("passport_number").unique(),
  gender: text("gender"),
  passportExpiry: date("passport_expiry"),
  province: text("province"),
  birthDate: date("birth_date"),

  // DATA MAHASISWA
  branch: text("branch"),
  studentStatus: text("student_status"),
  university: text("university"),
  degreeLevel: text("degree_level"),
  major: text("major"),
  fundingSource: text("funding_source"),
  entryYear: integer("entry_year"),
  graduationYear: integer("graduation_year"),

  // KONTAK
  wechatId: text("wechat_id"),
  phoneActive: text("phone_active"),
  whatsappNumber: text("whatsapp_number"),

  // Dokumen bukti & persetujuan
  // Kartu Tanda Mahasiswa - bukti mahasiswa aktif di Tiongkok (pengganti foto
  // profil sebagai verifikasi identitas, sesuai form PPIT Tiongkok).
  studentCardUrl: text("student_card_url"),
  agreeTerms: boolean("agree_terms").notNull().default(false),
  // Opt-in newsletter — field terakhir di form PPI Tiongkok pusat, satu-satunya
  // yang TIDAK wajib di sana. Disimpan supaya rekap yang dikirim ke pusat bisa
  // ikut membawa preferensi ini, bukan menebaknya.
  subscribeNewsletter: boolean("subscribe_newsletter").notNull().default(false),

  completionStatus: sensusCompletionEnum("completion_status").notNull().default("incomplete"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- 2. Organization ----------

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  parentDepartmentId: uuid("parent_department_id").references((): AnyPgColumn => departments.id),
  headUserId: uuid("head_user_id").references(() => users.id),
  orderIndex: integer("order_index").notNull().default(0),
  description: text("description"),
  // True only for Divisi Teknologi: every member of this department gets full admin
  // access regardless of their own role's accessTier ("anggota di divisi teknologi
  // bisa pegang full akses juga" - they build/maintain the system).
  grantsFullAdminAccess: boolean("grants_full_admin_access").notNull().default(false),
  // Admin module keys this department's 'scoped' members can access, e.g. ["events"],
  // ["sensus", "content"], ["inventory"]. Inferred from each division's stated duties in
  // the recruitment guidebook - confirm/adjust with PPIT Nanjing before enforcing in prod.
  adminModuleScope: text("admin_module_scope").array().notNull().default([]),
});

export const departmentMembers = pgTable(
  "department_members",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
    position: text("position"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.departmentId] })]
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const organizationDocuments = pgTable("organization_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: orgDocTypeEnum("type").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  version: text("version"),
  departmentId: uuid("department_id").references(() => departments.id),
  publishedBy: uuid("published_by").references(() => users.id),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

// National PPI Tiongkok branch directory (Nanjing is one of 32) - not FK-linked to `departments`,
// which models this portal's own internal structure. See docs/Data Dictionary.md.
export const regionalBranches = pgTable("regional_branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  cityName: text("city_name").notNull(),
  region: branchRegionEnum("region").notNull(),
  memberCount: integer("member_count"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  contactInfo: text("contact_info"),
});

// Daftar kampus per cabang PPI Tiongkok, sumber untuk dropdown bertingkat
// "Asal Cabang" → "Nama Universitas" di form Sensus (form pusat mengunci field
// universitas sampai cabangnya dipilih: "Pilih Cabang terlebih dahulu").
//
// SENGAJA TERPISAH dari tabel `universities`. Yang itu direktori kampus di
// 9 kota naungan PPIT Nanjing untuk halaman publik /universities (punya logo,
// koordinator, deskripsi, flag `published`); yang ini cuma daftar pilihan
// se-Tiongkok untuk satu dropdown. Menggabungkannya akan menyeret ±300 kampus
// nasional ke halaman direktori Nanjing.
//
// `name` selalu nama Inggris — label field-nya sendiri berbunyi "Nama
// Universitas (Dalam Bahasa Inggris)", dan itulah bentuk yang direkap pusat.
export const branchUniversities = pgTable(
  "branch_universities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => regionalBranches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameZh: text("name_zh"),
    abbreviation: text("abbreviation"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  // Satu kampus hanya boleh muncul sekali per cabang — bikin seed idempoten dan
  // mencegah dua baris "Nanjing University" yang tak bisa dibedakan di dropdown.
  (t) => [uniqueIndex("branch_universities_branch_name_idx").on(t.branchId, t.name)]
);

// ---------- 3. Events ----------

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  location: text("location"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  registrationDeadline: timestamp("registration_deadline"),
  capacity: integer("capacity"),
  // When true, only users who have completed the sensus (verified as Indonesian
  // students in China) may register. Regular events only require login.
  requiresSensus: boolean("requires_sensus").notNull().default(false),
  // Freeform schedule, one item per line (e.g. "18:00 - Registrasi") - rendered as
  // a timeline on the event detail page when set. Not structured jsonb since the
  // admin form is a single textarea, matching description's freeform pattern.
  agenda: text("agenda"),
  status: eventStatusEnum("status").notNull().default("draft"),
  // When set and status is 'scheduled', the event is auto-published (status ->
  // 'published') once this time passes. Lets admins prepare an event fully and
  // have it go live automatically at a chosen moment.
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  departmentId: uuid("department_id").references(() => departments.id),
  createdBy: uuid("created_by").references(() => users.id),
  // null / 0 = acara gratis. Kalau diisi, formulir pendaftaran meminta bukti bayar.
  feeCny: integer("fee_cny"),
  paymentInstructions: text("payment_instructions"),
});

// `feeCny` null = acara gratis; > 0 = peserta perlu membayar dan mengunggah bukti.
export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: eventRegistrationStatusEnum("status").notNull().default("pending"),
    qrCodeToken: text("qr_code_token").unique(),
    registeredAt: timestamp("registered_at").notNull().defaultNow(),
    // Cabang PPI yang dijawab peserta saat mendaftar, ATAU
    // NON_STUDENT_BRANCH kalau dia bukan mahasiswa Indonesia di Tiongkok.
    // Hanya ditanyakan ke orang yang sensusnya belum lengkap — tanpa ini,
    // "Nanjinger yang belum isi sensus" dan "tamu dari luar" sama-sama muncul
    // sebagai baris kosong dan tidak bisa dibedakan. Jawaban sekali-pakai untuk
    // acara ini saja: TIDAK disalin ke profil user dan tidak dipakai untuk
    // rekap ke pusat (sensus yang berwenang, lihat effectiveBranch()).
    // NULL = pendaftaran lama, sebelum pertanyaan ini ada.
    branch: text("branch"),
    checkedInAt: timestamp("checked_in_at"),
    // Pembayaran: peserta mengunggah bukti, bendahara acara memverifikasi.
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("not_required"),
    paymentProofUrl: text("payment_proof_url"),
    paymentNote: text("payment_note"),
    paymentVerifiedAt: timestamp("payment_verified_at"),
    paymentVerifiedBy: uuid("payment_verified_by").references((): AnyPgColumn => users.id),
  },
  (t) => [uniqueIndex("event_user_unique").on(t.eventId, t.userId)]
);

// ---------- 4. Content ----------

export const newsArticles = pgTable("news_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  coverImageUrl: text("cover_image_url"),
  // Freeform tag (e.g. "Pengumuman", "Komunitas") - backs the /news category filter
  // tabs (Goal.md Tier 1 #12), same pattern as events.category.
  category: text("category"),
  authorId: uuid("author_id").references(() => users.id),
  status: publishStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
});

export const galleryAlbums = pgTable("gallery_albums", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  eventId: uuid("event_id").references(() => events.id),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const galleryPhotos = pgTable("gallery_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  albumId: uuid("album_id").notNull().references(() => galleryAlbums.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// ---------- 5. Career ----------

export const jobPostings = pgTable("job_postings", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  type: jobTypeEnum("type").notNull(),
  description: text("description"),
  requirements: text("requirements"),
  applicationDeadline: date("application_deadline"),
  postedBy: uuid("posted_by").references(() => users.id),
  status: jobPostingStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobApplications = pgTable("job_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  status: jobApplicationStatusEnum("status").notNull().default("submitted"),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
});

export const careerGuideArticles = pgTable("career_guide_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  category: text("category"),
  authorId: uuid("author_id").references(() => users.id),
  publishedAt: timestamp("published_at"),
});

export const mentorshipApplications = pgTable("mentorship_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  motivation: text("motivation"),
  background: text("background"),
  preferredField: text("preferred_field"),
  status: mentorshipStatusEnum("status").notNull().default("pending"),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
});

// ---------- 6. Membership ----------

export const recruitmentPeriods = pgTable("recruitment_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  isOpen: boolean("is_open").notNull().default(false),
  opensAt: timestamp("opens_at"),
  closesAt: timestamp("closes_at"),
  batchLabel: text("batch_label"),
});

export const membershipApplications = pgTable("membership_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recruitmentPeriodId: uuid("recruitment_period_id").references(() => recruitmentPeriods.id),
  userId: uuid("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"),
  university: text("university"),
  major: text("major"),
  expectedGraduation: text("expected_graduation"),
  divisionInterest: text("division_interest"),
  motivation: text("motivation"),
  commitment: text("commitment"),
  status: membershipApplicationStatusEnum("status").notNull().default("pending"),
  note: text("note"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  responses: jsonb("responses"),
});

export const membershipFieldTypeEnum = pgEnum("membership_field_type", [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "select",
  "radio",
  "multiselect",
  "date",
  "checkbox",
  "rating",
  "image",
  "url",
  "section",
  "time",
  "linear_scale",
  "grid_radio",
  "grid_checkbox",
  "file",
]);

// Configurable fields for the public membership application form (Join Us).
// Admin edits these from /console/membership/form. Core keys map onto the
// structured columns above; any extra custom fields live only in `responses`.
export const membershipFormFields = pgTable("membership_form_fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  type: membershipFieldTypeEnum("type").notNull().default("text"),
  placeholder: text("placeholder"),
  helpText: text("help_text"),
  required: boolean("required").notNull().default(false),
  options: text("options"),
  // Extra per-type settings, e.g. rating scale { min, max, lowLabel, highLabel }.
  config: jsonb("config"),
  orderIndex: integer("order_index").notNull().default(0),
  isCore: boolean("is_core").notNull().default(false),
});

// Single-row settings for the membership form itself (the "Setelan" panel):
// title, description, confirmation message, banner toggle, quiz mode, etc.
export const membershipFormMeta = pgTable("membership_form_meta", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull().default("Formulir Pendaftaran Anggota PPIT Nanjing"),
  description: text("description").notNull().default(
    "Formulir ini digunakan untuk mendata mahasiswa Indonesia yang ingin bergabung sebagai anggota resmi PPIT Nanjing. Pastikan data yang diisi valid.",
  ),
  bannerEnabled: boolean("banner_enabled").notNull().default(false),
  confirmationMessage: text("confirmation_message").notNull().default(
    "Terima kasih! Pendaftaran kamu sudah kami terima.",
  ),
  isQuiz: boolean("is_quiz").notNull().default(false),
  collectEmail: boolean("collect_email").notNull().default(true),
  shuffle: boolean("shuffle").notNull().default(false),
  showProgress: boolean("show_progress").notNull().default(false),
  defaultRequired: boolean("default_required").notNull().default(false),
  spreadsheetUrl: text("spreadsheet_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MembershipFormMetaRow = typeof membershipFormMeta.$inferSelect;

// ---------- 7. Inventory & Borrowing ----------

export const contributionTypeEnum = pgEnum("contribution_type", ["donate", "lend_to_org"]);
export const contributionStatusEnum = pgEnum("contribution_status", ["pending", "approved", "rejected"]);

export const procurementUrgencyEnum = pgEnum("procurement_urgency", ["low", "medium", "high"]);
export const procurementStatusEnum = pgEnum("procurement_status", ["pending", "approved", "rejected", "fulfilled"]);

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  imageUrl: text("image_url"),
  totalQuantity: integer("total_quantity").notNull().default(0),
  availableQuantity: integer("available_quantity").notNull().default(0),
  condition: inventoryConditionEnum("condition").notNull().default("good"),
  location: text("location"),
  // Person currently responsible for the item day-to-day (e.g. "STEFAN") -
  // distinct from location (which koper/box it lives in). Sourced from the
  // "PEMEGANG" column when the physical inventory spreadsheet was imported.
  custodian: text("custodian"),
});

export const borrowRequests = pgTable("borrow_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  purpose: text("purpose"),
  requestedFrom: date("requested_from"),
  requestedTo: date("requested_to"),
  status: borrowRequestStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  returnedAt: timestamp("returned_at"),
});

export const inventoryAuditLogs = pgTable("inventory_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  performedBy: uuid("performed_by").references(() => users.id),
  action: inventoryAuditActionEnum("action").notNull(),
  quantityDelta: integer("quantity_delta").notNull().default(0),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Member-donated / member-loaned personal items (§4a). Stays a separate table
// from inventoryItems until an admin approves it into the org's own catalog -
// a contributed item is NOT org property until then.
export const itemContributions = pgTable("item_contributions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  imageUrl: text("image_url"),
  condition: inventoryConditionEnum("condition").notNull().default("good"),
  contributionType: contributionTypeEnum("contribution_type").notNull(),
  expectedReturnDate: date("expected_return_date"), // only when contributionType = lend_to_org
  status: contributionStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Member-requested procurement (§4b) - asking PPIT to buy a new item, distinct
// from donating/lending a personal one (§4a).
export const procurementRequests = pgTable("procurement_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  category: text("category"),
  justification: text("justification"),
  imageUrl: text("image_url"), // optional reference photo supplied by the requester
  estimatedCost: integer("estimated_cost"), // whole-number RMB (no decimals) per 2026-08-15 decision
  urgency: procurementUrgencyEnum("urgency").notNull().default("medium"),
  status: procurementStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// PPIT lending its OWN assets to an external (non-registered) party (§4c). This
// is an admin-only action; borrowerName is free text (not a users FK) because
// the borrower is by definition outside the org. recordedBy captures which PPIT
// member ran the transaction.
export const externalLoans = pgTable("external_loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  borrowerName: text("borrower_name").notNull(),
  borrowerContact: text("borrower_contact"),
  purpose: text("purpose"),
  quantity: integer("quantity").notNull().default(1),
  conditionOut: inventoryConditionEnum("condition_out"),
  conditionIn: inventoryConditionEnum("condition_in"), // filled on return
  loanedAt: timestamp("loaned_at").notNull().defaultNow(),
  expectedReturnAt: date("expected_return_at"),
  returnedAt: timestamp("returned_at"),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id),
  status: externalLoanStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
});

// ---------- 8. Admin & System ----------

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: reportTypeEnum("type").notNull(),
  generatedBy: uuid("generated_by").references(() => users.id),
  parametersJson: jsonb("parameters_json"),
  fileUrl: text("file_url"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  channel: notificationChannelEnum("channel").notNull(),
  subject: text("subject"),
  bodyTemplate: text("body_template").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => notificationTemplates.id),
  title: text("title").notNull(),
  body: text("body"),
  isRead: boolean("is_read").notNull().default(false),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const helpArticles = pgTable("help_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  authorId: uuid("author_id").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const releaseNotes = pgTable("release_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: text("version").notNull(),
  summary: text("summary").notNull(),
  details: text("details"),
  publishedBy: uuid("published_by").references(() => users.id),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

// In-app feedback widget submissions (floating widget + element picker on every
// page). userId is nullable - feedback can be submitted while logged out.
export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: feedbackCategoryEnum("category").notNull(),
  message: text("message").notNull(),
  status: feedbackStatusEnum("status").notNull().default("new"),
  userId: uuid("user_id").references(() => users.id),
  userEmail: text("user_email"), // snapshot at submit time, survives account deletion
  pagePath: text("page_path").notNull(),
  // Element-picker capture: which DOM node the reporter clicked, described in
  // multiple redundant ways since a CSS selector alone can drift as the UI changes.
  elementSelector: text("element_selector"),
  elementDescription: text("element_description"),
  elementRect: jsonb("element_rect"), // { x, y, width, height } at capture time
  viewport: jsonb("viewport"), // { width, height }
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Relations (for Drizzle's relational query API) ----------

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  sensusProfile: one(sensusProfiles, { fields: [users.id], references: [sensusProfiles.userId] }),
  departmentMemberships: many(departmentMembers),
  eventRegistrations: many(eventRegistrations),
  jobApplications: many(jobApplications),
  borrowRequests: many(borrowRequests),
}));

export const regionalBranchesRelations = relations(regionalBranches, ({ many }) => ({
  universities: many(branchUniversities),
}));

export const branchUniversitiesRelations = relations(branchUniversities, ({ one }) => ({
  branch: one(regionalBranches, {
    fields: [branchUniversities.branchId],
    references: [regionalBranches.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  parent: one(departments, { fields: [departments.parentDepartmentId], references: [departments.id] }),
  members: many(departmentMembers),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  department: one(departments, { fields: [events.departmentId], references: [departments.id] }),
  registrations: many(eventRegistrations),
  galleryAlbums: many(galleryAlbums),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  borrowRequests: many(borrowRequests),
  auditLogs: many(inventoryAuditLogs),
}));

export const jobPostingsRelations = relations(jobPostings, ({ many }) => ({
  applications: many(jobApplications),
}));

// ---------- Konten kota Nanjing (Places, Universities) ----------
// Mirrors what the Chongqing chapter site offers under "Discover", adapted to
// Nanjing. See docs/Perbandingan dengan PPIT Chongqing.md.

export const placeCategoryEnum = pgEnum("place_category", ["tourism", "spiritual", "practical"]);

// Tempat wisata / ibadah / fasilitas penting, dikelompokkan per distrik Nanjing.
export const places = pgTable("places", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  nameZh: text("name_zh"),
  category: placeCategoryEnum("category").notNull().default("tourism"),
  district: text("district"),
  description: text("description"),
  address: text("address"),
  addressZh: text("address_zh"),
  imageUrl: text("image_url"),
  mapUrl: text("map_url"),
  orderIndex: integer("order_index").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Direktori kampus. `district` sengaja teks bebas, bukan enum: daftar distrik
// Nanjing bisa berubah dan admin harus bisa menambah tanpa migrasi.
export const universities = pgTable("universities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  nameZh: text("name_zh"),
  abbreviation: text("abbreviation"),
  // Sumbu pengelompokan yang benar adalah KOTA, bukan distrik: kampus-kampus ini
  // tersebar di 9 kota naungan (lihat coverageCities), bukan cuma di Nanjing.
  // `district` tetap ada untuk kampus Nanjing yang diketahui distriknya.
  city: text("city"),
  district: text("district"),
  // Nama penanggung jawab & kontaknya diisi pengurus - tidak boleh ditebak.
  coordinatorName: text("coordinator_name"),
  coordinatorEmail: text("coordinator_email"),
  description: text("description"),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  studentCount: integer("student_count"),
  isPartner: boolean("is_partner").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

// Teks pengantar per distrik pada halaman Universities (Chongqing memberi tiap
// distrik satu paragraf konteks). Dipisah dari `universities` supaya tidak
// diulang di setiap baris kampus.
export const districts = pgTable("districts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  nameZh: text("name_zh"),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
});

// ---------- Catalogue (merchandise, sponsorship, donasi) ----------

export const merchandiseStatusEnum = pgEnum("merchandise_status", ["available", "preorder", "unavailable"]);

// Etalase, bukan toko: tidak ada keranjang atau pembayaran. Chongqing pun
// menandai seluruh itemnya "Unavailable".
export const merchandise = pgTable("merchandise", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceCny: integer("price_cny"),
  imageUrl: text("image_url"),
  status: merchandiseStatusEnum("status").notNull().default("unavailable"),
  contactNote: text("contact_note"),
  orderIndex: integer("order_index").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

export const sponsorTierEnum = pgEnum("sponsor_tier", ["platinum", "gold", "silver", "partner"]);

export const sponsors = pgTable("sponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tier: sponsorTierEnum("tier").notNull().default("partner"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

export const donationStatusEnum = pgEnum("donation_status", ["pending", "verified", "rejected"]);

// Donasi dicatat, BUKAN diproses. Alipay/WeChat Pay tidak bisa diintegrasikan
// tanpa merchant account berbadan hukum Tiongkok, dan QR pribadi tidak punya
// webhook - jadi donatur mengirim lewat QR lalu melaporkannya di sini, dan
// admin memverifikasi manual. Aplikasi tidak pernah menyentuh uang.
export const donations = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  donorName: text("donor_name").notNull(),
  amountCny: integer("amount_cny"),
  method: text("method"),
  message: text("message"),
  proofUrl: text("proof_url"),
  anonymous: boolean("anonymous").notNull().default(false),
  status: donationStatusEnum("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

// Nomor/QR tujuan donasi, dikelola admin. Satu baris per kanal supaya bisa
// ditambah (Alipay, WeChat, transfer bank Indonesia) tanpa ubah kode.
export const donationChannels = pgTable("donation_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  accountName: text("account_name"),
  accountDetail: text("account_detail"),
  qrImageUrl: text("qr_image_url"),
  instructions: text("instructions"),
  orderIndex: integer("order_index").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

// ---------- Panitia acara, sertifikat, pembayaran ----------
// Menutup "Work Ledger", "Daftar jadi panitia + sertifikat", dan "Verifikasi
// Pembayaran" dari Website Ideas. Lihat Obsidian: Projects/PPIT Nanjing/Status Pekerjaan.

// Peran panitia bersifat PER-ACARA, bukan per-kabinet: bendahara sebuah acara
// belum tentu bendahara kabinet (ini keluhan eksplisit di dokumen ide). Karena
// itu tabelnya terpisah dari departmentMembers.
export const eventCommitteeRoleEnum = pgEnum("event_committee_role", [
  "ketua",
  "wakil",
  "sekretaris",
  "bendahara",
  "humas",
  "acara",
  "logistik",
  "dokumentasi",
  "anggota",
]);

// Struktur kepanitiaan SATU acara: Departemen → sub-tim, mis. "Perlengkapan"
// yang menaungi "Konsumsi", "Perlengkapan", dan "Sound System".
//
// Bertingkat lewat `parentDivisionId` ke dirinya sendiri, pola yang sama dengan
// `departments.parentDepartmentId` — sengaja, supaya kedalamannya tidak dikunci
// dua tingkat. Nama divisinya teks bebas, BUKAN enum: tiap acara boleh punya
// susunan sendiri (WIF cuma satu contoh; acara berikutnya belum tentu sama),
// dan menambah enum tiap kali ada acara baru akan berarti migrasi tiap kali.
//
// Sengaja TERPISAH dari `departments` (struktur kepengurusan kabinet). Itulah
// inti keluhan yang mendasari fitur ini: bendahara acara ≠ bendahara kabinet,
// dan seseorang bisa jadi Ketua Departemen Perlengkapan di satu acara tanpa
// memegang jabatan struktural apa pun.
//
// Belum ada lapisan template ("simpan struktur WIF, pakai ulang tahun depan").
// Baris ini sudah berdiri sendiri per acara, jadi template nanti cukup jadi
// tabel baru yang MENYALIN ke sini — tidak perlu memigrasikan data yang ada.
export const eventDivisions = pgTable("event_divisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  parentDivisionId: uuid("parent_division_id").references((): AnyPgColumn => eventDivisions.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  // Target jumlah orang, mis. "(2 orang)" di slide job description. Nullable —
  // tidak semua divisi punya target, dan menebak angkanya lebih buruk daripada
  // mengosongkan. Dipakai untuk menampilkan "masih kurang N".
  quota: integer("quota"),
  // Jobdesc bebas, satu poin per baris — pola yang sama dengan `events.agenda`,
  // karena formulir adminnya juga satu textarea. Sebelumnya isi slide seperti
  // "Menyiapkan konsumsi saat acara" hidup di PowerPoint saja dan panitianya
  // tidak bisa membukanya di portal.
  jobDescription: text("job_description"),
  orderIndex: integer("order_index").notNull().default(0),
});

export const eventCommittee = pgTable(
  "event_committee",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Divisi tempat orang ini ditempatkan di acara tsb. NULL = ditugaskan
    // sebelum struktur divisi ada, atau memang panitia inti tanpa divisi.
    // onDelete "set null": menghapus divisi tidak boleh ikut menghapus catatan
    // bahwa orangnya pernah jadi panitia acara itu.
    divisionId: uuid("division_id").references((): AnyPgColumn => eventDivisions.id, { onDelete: "set null" }),
    // Peran DI DALAM divisinya. Digabung dengan nama divisi, inilah yang
    // membentuk sebutan lengkapnya: "ketua" + divisi "Perlengkapan" =
    // Ketua Departemen Perlengkapan. Karena itu enumnya tidak perlu memuat
    // tiap kombinasi jabatan-kali-divisi.
    role: eventCommitteeRoleEnum("role").notNull().default("anggota"),
    // Catatan tugas spesifik, mis. "PJ konsumsi". Bebas supaya tidak perlu
    // menambah enum tiap kali ada peran baru.
    note: text("note"),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  },
  // Satu orang satu peran per acara; ganti peran = update, bukan baris baru.
  (t) => [uniqueIndex("event_committee_unique").on(t.eventId, t.userId)],
);

// Sertifikat tidak dibuat otomatis: file-nya diunggah/dibuat di luar aplikasi,
// di sini hanya dicatat + ditautkan. `fileUrl` boleh berupa tautan Google Drive
// (dokumen ide menyebut ini eksplisit kalau storage terbatas).
export const certificateKindEnum = pgEnum("certificate_kind", ["peserta", "panitia", "pemateri", "lainnya"]);

export const certificates = pgTable("certificates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  kind: certificateKindEnum("kind").notNull().default("peserta"),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  issuedBy: uuid("issued_by").references(() => users.id),
});

export const eventDivisionsRelations = relations(eventDivisions, ({ one, many }) => ({
  event: one(events, { fields: [eventDivisions.eventId], references: [events.id] }),
  parent: one(eventDivisions, {
    fields: [eventDivisions.parentDivisionId],
    references: [eventDivisions.id],
    relationName: "divisionParent",
  }),
  children: many(eventDivisions, { relationName: "divisionParent" }),
  members: many(eventCommittee),
}));

export const eventCommitteeRelations = relations(eventCommittee, ({ one }) => ({
  event: one(events, { fields: [eventCommittee.eventId], references: [events.id] }),
  division: one(eventDivisions, { fields: [eventCommittee.divisionId], references: [eventDivisions.id] }),
  user: one(users, { fields: [eventCommittee.userId], references: [users.id] }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  event: one(events, { fields: [certificates.eventId], references: [events.id] }),
  user: one(users, { fields: [certificates.userId], references: [users.id] }),
}));

// ---------- Wilayah naungan PPIT Nanjing ----------
// SENGAJA TERPISAH dari `regionalBranches`. Yang itu berisi 32 cabang PPI
// se-Tiongkok; yang ini 9 kota di bawah naungan PPIT Nanjing (Nanjing, Huai'an,
// Jurong, Lianyungang, Ma'anshan, Taizhou, Xuzhou, Yancheng, Zhenjiang) yang
// bahkan melintasi provinsi - Ma'anshan ada di Anhui, sisanya Jiangsu.
// Mencampur keduanya akan merusak peta cabang nasional yang sudah ada.
//
// Batas wilayahnya statis di src/data/nanjing-coverage.geo.json; tabel ini hanya
// menyimpan yang berubah: jumlah mahasiswa dan kontak. `slug` mencocokkan
// properties.id di berkas GeoJSON.
export const coverageCities = pgTable("coverage_cities", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  memberCount: integer("member_count"),
  contactInfo: text("contact_info"),
  note: text("note"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
