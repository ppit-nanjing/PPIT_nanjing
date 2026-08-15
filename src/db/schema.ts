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
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const userStatusEnum = pgEnum("user_status", ["invited", "active", "inactive", "suspended"]);
export const sensusCompletionEnum = pgEnum("sensus_completion_status", ["incomplete", "complete"]);
export const orgDocTypeEnum = pgEnum("org_document_type", ["ad_art", "guideline", "other"]);
export const branchRegionEnum = pgEnum("branch_region", ["north", "east", "south", "central", "west"]);
export const eventStatusEnum = pgEnum("event_status", [
  "draft",
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
  gender: text("gender"),
  birthDate: date("birth_date"),
  university: text("university"),
  program: text("program"),
  degreeLevel: text("degree_level"),
  cityInChina: text("city_in_china"),
  arrivalDate: date("arrival_date"),
  visaType: text("visa_type"),
  scholarshipType: text("scholarship_type"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  // Required for completionStatus "complete" - proof the person is actually
  // studying in China, not just profile decoration (confirmed 2026-08-15).
  photoUrl: text("photo_url"),
  completionStatus: sensusCompletionEnum("completion_status").notNull().default("incomplete"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- 2. Organization ----------

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  parentDepartmentId: uuid("parent_department_id").references((): any => departments.id),
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
  // Freeform schedule, one item per line (e.g. "18:00 - Registrasi") - rendered as
  // a timeline on the event detail page when set. Not structured jsonb since the
  // admin form is a single textarea, matching description's freeform pattern.
  agenda: text("agenda"),
  status: eventStatusEnum("status").notNull().default("draft"),
  departmentId: uuid("department_id").references(() => departments.id),
  createdBy: uuid("created_by").references(() => users.id),
});

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: eventRegistrationStatusEnum("status").notNull().default("pending"),
    qrCodeToken: text("qr_code_token").unique(),
    registeredAt: timestamp("registered_at").notNull().defaultNow(),
    checkedInAt: timestamp("checked_in_at"),
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
  university: text("university"),
  motivation: text("motivation"),
  status: membershipApplicationStatusEnum("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

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
