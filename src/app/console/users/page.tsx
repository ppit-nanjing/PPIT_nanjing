import type { Metadata } from "next";
import { db } from "@/db";
import { users, roles, departments, departmentMembers, userRoles } from "@/db/schema";
import { UsersConsole } from "@/components/console/users-console";
import { requireModuleAccess } from "@/lib/admin-scope";
import { getRantings } from "@/lib/rantings";
import { inviteUsers } from "@/app/actions/admin-users";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { Field, fieldInput, FormActions, primaryBtn } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Pengguna" };

export default async function ConsoleUsersPage() {
  await requireModuleAccess("users");
  // Perf: these reads used to be awaited one-by-one (sequential round trips
  // to Neon); they are independent, so run them concurrently.
  const [allUsers, allRoles, allDepartments, memberships, assignments, rantingsList, guide] = await Promise.all([
    db.select().from(users),
    db.select().from(roles),
    db.select().from(departments),
    db.select().from(departmentMembers),
    // Opsi B: slot role per kategori, satu baris per kategori per orang.
    db.select().from(userRoles),
    getRantings(),
    getGuide("pengguna"),
  ]);

  // Legacy "[INA] BPH Ranting" dst. tidak lagi bisa ditugaskan (digantikan
  // role kanonik "BPH Ranting"/"Anggota Ranting" + unit ranting di tabel
  // rantings) - sembunyikan dari pemilih tanpa menghapus barisnya.
  const assignableRoles = allRoles.filter((r) => !r.name.trim().startsWith("["));

  const rows = allUsers.map((u) => {
    const membership = memberships.find((m) => m.userId === u.id);
    // Slot kategori kabinet/advisory bisa ada keduanya (satu unik per
    // kategori); tampilkan yang kabinet dulu, kalau kosong baru advisory.
    const kabinet = assignments.find((a) => a.userId === u.id && a.roleCategory === "kabinet");
    const advisory = assignments.find((a) => a.userId === u.id && a.roleCategory === "advisory");
    const cabinetAssignment = kabinet ?? advisory;
    const rantingAssignment = assignments.find((a) => a.userId === u.id && a.roleCategory === "ranting");
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      status: u.status,
      roleId: u.roleId,
      cabinetRoleId: cabinetAssignment?.roleId ?? null,
      rantingRoleId: rantingAssignment?.roleId ?? null,
      rantingId: rantingAssignment?.rantingId ?? null,
      departmentId: membership?.departmentId ?? null,
      position: membership?.position ?? "",
      // Bisa menerima tautan reset kalau punya password, atau kalau emailnya
      // sudah terbukti lewat Google (satu-satunya jalan akun Google-only
      // memasang kata sandi).
      canResetPassword: Boolean(u.passwordHash || u.emailVerified),
    };
  });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Manajemen Pengguna</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="pengguna" />}
      </div>
      <p className="text-body-md text-on-surface-variant mb-8 max-w-[62ch]">
        {rows.length} pengguna terdaftar. Akun muncul otomatis saat masuk dengan Google atau mendaftar kata sandi.{" "}
        <a href="/api/console/users/export" download className="text-primary-container hover:text-primary inline-flex items-center gap-1">
          <Download size={13} aria-hidden /> Export ke CSV
        </a>
      </p>
      <div className="mb-8">
        <CollapsibleSection
          title="Undang Pengguna Baru"
          description="Buat akun untuk orang yang belum pernah masuk — supaya bisa langsung ditugaskan ke kepanitiaan"
          defaultOpen={false}
        >
          <form action={inviteUsers} className="flex flex-col gap-3 max-w-2xl">
            <Field
              label="Daftar undangan — satu orang per baris"
              hint="Format: “Nama Lengkap, email@contoh.com” atau email saja."
              required
            >
              <textarea
                name="bulk"
                rows={8}
                required
                placeholder={`Nama Lengkap, email@contoh.com
Nama Lain, lain@contoh.com
atau email saja: seseorang@contoh.com`}
                className={`${fieldInput} font-mono`}
              />
            </Field>
            <p className="text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-md p-3">
              Akun dibuat berstatus <strong>Diundang</strong> tanpa sandi. Orangnya jadi pemilik akun saat pertama
              masuk — Google dengan email yang sama, atau buat sandi di <code>/signup</code>. Email yang sudah punya
              akun <strong>dilewati</strong>, bukan ditimpa, jadi menempel daftar yang sama dua kali aman.
            </p>
            <p className="text-xs text-on-surface-variant">
              Belum ada email undangan otomatis — beri tahu mereka lewat WeChat/WhatsApp.
            </p>
            <FormActions>
              <SubmitButton successMessage="Akun undangan dibuat." className={primaryBtn}>
                Buat Akun Undangan
              </SubmitButton>
            </FormActions>
          </form>
        </CollapsibleSection>
      </div>

      <UsersConsole
        users={rows}
        roles={assignableRoles}
        departments={allDepartments}
        memberships={memberships}
        rantings={rantingsList}
      />
    </div>
  );
}
