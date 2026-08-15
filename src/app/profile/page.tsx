import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, sensusProfiles } from "@/db/schema";
import { EmailSubscriptionToggle } from "@/components/profile/email-subscription-toggle";
import { updateProfile } from "@/app/actions/user";
import { ClipboardCheck, ClipboardList, UserRound } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  const [sensus] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, session.user.id));

  return (
    <div className="min-h-screen bg-background px-[var(--spacing-container-padding)] py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-headline-lg text-on-background mb-8">Profil Saya</h1>

        <div className="flex items-center gap-4 mb-10">
          {user?.avatarUrl || session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user?.avatarUrl || session.user.image || undefined}
              alt={user?.name ?? session.user.name ?? "Profile"}
              className="w-16 h-16 rounded-full object-cover border border-outline-variant"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
              <UserRound size={24} />
            </div>
          )}
          <div>
            <p className="text-headline-md text-on-background">{user?.name ?? session.user.name}</p>
            <p className="text-body-md text-on-surface-variant">{session.user.email}</p>
          </div>
        </div>

        <h2 className="text-label-caps uppercase tracking-widest text-secondary mb-4">Profil</h2>
        <form action={updateProfile} className="flex flex-col gap-4 mb-10">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Tampilan</span>
            <input
              name="name"
              defaultValue={user?.name ?? session.user.name ?? ""}
              placeholder="Nama yang ditampilkan di situs"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">URL Foto Profil</span>
            <input
              name="avatarUrl"
              type="url"
              defaultValue={user?.avatarUrl ?? ""}
              placeholder="Kosongkan untuk memakai foto akun Google"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">No. Telepon/WhatsApp</span>
            <input
              name="phone"
              defaultValue={user?.phone ?? ""}
              placeholder="+86 ..."
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">WeChat ID</span>
            <input
              name="wechatId"
              defaultValue={user?.wechatId ?? ""}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Profil
          </button>
        </form>

        <h2 className="text-label-caps uppercase tracking-widest text-secondary mb-4">Data Sensus</h2>
        <a
          href="/sensus"
          className="flex items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-5 mb-10 hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-3">
            {sensus?.completionStatus === "complete" ? (
              <ClipboardCheck className="text-primary-container" size={20} />
            ) : (
              <ClipboardList className="text-secondary" size={20} />
            )}
            <div>
              <p className="text-body-md font-medium text-on-background">
                {sensus?.completionStatus === "complete" ? "Data sensus lengkap" : "Data sensus belum diisi"}
              </p>
              <p className="text-label-caps text-on-surface-variant">
                Universitas, program studi, kontak darurat, dan data akademik lainnya
              </p>
            </div>
          </div>
          <span className="text-label-caps text-primary-container shrink-0">
            {sensus ? "Ubah" : "Isi Sekarang"}
          </span>
        </a>

        <h2 className="text-label-caps uppercase tracking-widest text-secondary mb-4">Preferensi Notifikasi</h2>
        <EmailSubscriptionToggle initialSubscribed={session.user.emailSubscribed} />
      </div>
    </div>
  );
}
