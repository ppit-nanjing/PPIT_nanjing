import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EmailSubscriptionToggle } from "@/components/profile/email-subscription-toggle";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background px-[var(--spacing-container-padding)] py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-headline-lg text-on-background mb-8">Profil Saya</h1>

        <div className="flex items-center gap-4 mb-10">
          {session.user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? "Profile"}
              className="w-16 h-16 rounded-full object-cover border border-outline-variant"
            />
          )}
          <div>
            <p className="text-headline-md text-on-background">{session.user.name}</p>
            <p className="text-body-md text-on-surface-variant">{session.user.email}</p>
          </div>
        </div>

        <h2 className="text-label-caps uppercase tracking-widest text-secondary mb-4">
          Preferensi Notifikasi
        </h2>
        <EmailSubscriptionToggle initialSubscribed={session.user.emailSubscribed} />
      </div>
    </div>
  );
}
