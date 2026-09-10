import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { db } from "@/db";
import { auditLogs, sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { MEMBERSHIP_LABEL, membershipStatus } from "@/lib/membership-status";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ProofView } from "@/components/console/proof-view";
import { SensusDeleteButton } from "@/components/console/sensus-delete-button";
import { summarizeAuditChange } from "@/lib/audit-diff";

// Sebagian besar baca-saja (sensus diisi sendiri anggota lewat /sensus), tapi
// pengurus pemegang modul "sensus" bisa Ubah / Hapus dari sini; tercatat di
// audit_logs. Terkunci ke modul "sensus" — lihat page.tsx sebelah.

function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3 sm:px-6">
      <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</p>
      <div className="text-body-md text-on-background whitespace-pre-wrap mt-1">{children ?? "—"}</div>
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
      {children}
    </div>
  );
}

const v = (s: string | number | null | undefined): ReactNode => (s === null || s === undefined || s === "" ? "—" : String(s));

export default async function ConsoleSensusDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("sensus");
  const { id } = await params;

  const [row] = await db
    .select({ s: sensusProfiles, userName: users.name, userEmail: users.email, userImage: users.image })
    .from(sensusProfiles)
    .leftJoin(users, eq(sensusProfiles.userId, users.id))
    .where(eq(sensusProfiles.id, id))
    .limit(1);

  if (!row) notFound();
  const { s } = row;

  const history = await db
    .select({ log: auditLogs, actorName: users.name, actorEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(and(eq(auditLogs.entityType, "sensus_profile"), eq(auditLogs.entityId, id)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);
  const ms = membershipStatus(s);
  const who = s.fullName || row.userName || row.userEmail || "Tanpa nama";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <Link href="/console/sensus" className="text-label-caps text-secondary uppercase hover:text-on-background">
        &larr; Kembali ke Daftar
      </Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-1">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">{who}</h1>
        <span className="text-label-caps px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
          {MEMBERSHIP_LABEL[ms]}
        </span>
        <span
          className={`text-label-caps px-2.5 py-1 rounded-full ${
            s.completionStatus === "complete"
              ? "bg-primary-container/30 text-on-primary-container"
              : "bg-error-container/30 text-on-error-container"
          }`}
        >
          {s.completionStatus === "complete" ? "Lengkap" : "Belum lengkap"}
        </span>
      </div>
      <p className="text-body-md text-on-surface-variant mb-4">
        Diisi sendiri oleh anggota lewat halaman Sensus &middot; terakhir diperbarui {fmtDate(s.updatedAt)}
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Link
          href={`/console/sensus/${id}/edit`}
          className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
        >
          <Pencil size={15} aria-hidden /> Ubah
        </Link>
        <SensusDeleteButton id={id} />
      </div>

      <div className="flex flex-col gap-6">
        <CollapsibleSection title="Akun">
          <Group>
            <div className="px-4 py-3 sm:px-6 flex items-center gap-3">
              {row.userImage ? (
                <Image
                  src={row.userImage}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="h-10 w-10 rounded-full bg-surface-container-high shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-body-md text-on-background truncate">{v(row.userName)}</p>
                <p className="text-label-caps text-on-surface-variant truncate">{v(row.userEmail)}</p>
              </div>
            </div>
          </Group>
        </CollapsibleSection>

        <CollapsibleSection title="Biodata">
          <Group>
            <Field label="Nama Lengkap">{v(s.fullName)}</Field>
            <Field label="Nama Mandarin">{v(s.mandarinName)}</Field>
            <Field label="Nomor Paspor">{v(s.passportNumber)}</Field>
            <Field label="Jenis Kelamin">{v(s.gender)}</Field>
            <Field label="Tanggal Maksimal Berlaku Paspor">{fmtDate(s.passportExpiry)}</Field>
            <Field label="Asal Provinsi">{v(s.province)}</Field>
            <Field label="Tanggal Lahir">{fmtDate(s.birthDate)}</Field>
          </Group>
        </CollapsibleSection>

        <CollapsibleSection title="Data Mahasiswa">
          <Group>
            <Field label="Asal Kota">{v(s.branch)}</Field>
            <Field label="Status Mahasiswa">{v(s.studentStatus)}</Field>
            <Field label="Nama Universitas">{v(s.university)}</Field>
            <Field label="Jenjang Pendidikan">{v(s.degreeLevel)}</Field>
            <Field label="Jurusan">{v(s.major)}</Field>
            <Field label="Bahasa Pengantar">{v(s.mediumOfInstruction)}</Field>
            <Field label="Kemampuan Mandarin">{v(s.mandarinAbility)}</Field>
            <Field label="Sumber Pembiayaan">{v(s.fundingSource)}</Field>
            <Field label="Tahun Masuk">{v(s.entryYear)}</Field>
            <Field label="Perkiraan Tahun Kelulusan">{v(s.graduationYear)}</Field>
          </Group>
        </CollapsibleSection>

        <CollapsibleSection title="Kontak">
          <Group>
            <Field label="Email Aktif">{v(s.activeEmail)}</Field>
            <Field label="WeChat ID">{v(s.wechatId)}</Field>
            <Field label="Nomor Telepon Aktif (+86)">{v(s.phoneActive)}</Field>
            <Field label="Nomor WhatsApp">{v(s.whatsappNumber)}</Field>
          </Group>
        </CollapsibleSection>

        <CollapsibleSection title="Penanganan Darurat">
          <Group>
            <Field label="Kontak Darurat">{v(s.emergencyContact)}</Field>
            <Field label="Alamat di Tiongkok">{v(s.chinaAddress)}</Field>
          </Group>
        </CollapsibleSection>

        <CollapsibleSection title="Dokumen & Bukti">
          <Group>
            <Field label="Kartu Tanda Mahasiswa / LOA">
              <ProofView url={s.studentCardUrl} label={`Bukti mahasiswa — ${who}`} />
            </Field>
            <Field label="Setuju Syarat & Ketentuan">{s.agreeTerms ? "Ya" : "Tidak"}</Field>
            <Field label="Berlangganan Newsletter">{s.subscribeNewsletter ? "Ya" : "Tidak"}</Field>
          </Group>
        </CollapsibleSection>

        <CollapsibleSection title={`Riwayat Perubahan (${history.length})`} defaultOpen={false}>
          {history.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">
              Belum ada perubahan oleh pengurus. Data ini masih persis seperti yang diisi anggota.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map(({ log, actorName, actorEmail }) => (
                <li
                  key={log.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-body-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-on-background">
                      {log.action === "deleted" ? "Dihapus" : "Diperbarui"} oleh{" "}
                      {actorName ?? actorEmail ?? "pengurus"}
                    </span>
                    <span className="text-label-caps text-on-surface-variant">
                      {new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">
                    {summarizeAuditChange(log.action, log.beforeJson, log.afterJson)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
