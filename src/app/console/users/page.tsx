import { db } from "@/db";
import { users, roles, departments, departmentMembers } from "@/db/schema";
import { UsersConsole } from "@/components/console/users-console";
import { requireModuleAccess } from "@/lib/admin-scope";
import { inviteUsers } from "@/app/actions/admin-users";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { UserPlus } from "lucide-react";

export default async function ConsoleUsersPage() {
  await requireModuleAccess("users");
  const allUsers = await db.select().from(users);
  const allRoles = await db.select().from(roles);
  const allDepartments = await db.select().from(departments);
  const memberships = await db.select().from(departmentMembers);

  const rows = allUsers.map((u) => {
    const membership = memberships.find((m) => m.userId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      status: u.status,
      roleId: u.roleId,
      departmentId: membership?.departmentId ?? null,
      position: membership?.position ?? "",
    };
  });

  const guide = await getGuide("pengguna");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Manajemen Pengguna</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="pengguna" />}
      </div>
      <p className="text-body-md text-on-surface-variant mb-8">
        {rows.length} pengguna terdaftar. Akun muncul otomatis saat masuk dengan Google atau mendaftar kata sandi.
      </p>
      <div className="mb-8">
        <CollapsibleSection
          title="Undang Anggota"
          description="Buat akun untuk orang yang belum pernah masuk — supaya bisa langsung ditugaskan ke kepanitiaan"
        >
          <form action={inviteUsers} className="flex flex-col gap-3 max-w-2xl">
            <label className="flex flex-col gap-1">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                Daftar undangan — satu orang per baris
              </span>
              <textarea
                name="bulk"
                rows={8}
                required
                placeholder={`Nama Lengkap, email@contoh.com
Nama Lain, lain@contoh.com
atau email saja: seseorang@contoh.com`}
                className="bg-soft-gray rounded-md p-3 text-body-md font-mono"
              />
            </label>
            <p className="text-xs text-on-surface-variant">
              Akunnya dibuat berstatus <strong>Diundang</strong> tanpa kata sandi. Orangnya jadi pemilik akun itu saat
              pertama masuk — lewat Google dengan alamat email yang sama, atau dengan membuat kata sandi di{" "}
              <code>/signup</code> memakai alamat itu. Email yang sudah punya akun <strong>dilewati</strong>, bukan
              ditimpa, jadi menempel daftar yang sama dua kali aman.
            </p>
            <p className="text-xs text-on-surface-variant">
              Belum ada email undangan yang terkirim otomatis — beri tahu mereka lewat WeChat/WhatsApp seperti biasa.
              Penyedia email belum disiapkan (lihat <code>GMAIL_USER</code> di <code>.env.example</code>).
            </p>
            <button
              type="submit"
              className="self-start flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors"
            >
              <UserPlus size={16} /> Buat Akun Undangan
            </button>
          </form>
        </CollapsibleSection>
      </div>

      <UsersConsole
        users={rows}
        roles={allRoles}
        departments={allDepartments}
        memberships={memberships}
      />
    </div>
  );
}
