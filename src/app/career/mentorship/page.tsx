import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { applyForMentorship } from "@/app/actions/mentorship";

export default async function MentorshipPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">Alumni Network Mentorship</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          Ceritakan sedikit tentang dirimu supaya kami bisa mencarikan mentor alumni yang paling
          cocok untukmu.
        </p>

        <form action={applyForMentorship} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Bidang yang Diminati
            </span>
            <input
              type="text"
              name="preferredField"
              placeholder="mis. Software Engineering, Bisnis, Riset"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Latar Belakang Singkat
            </span>
            <textarea
              name="background"
              rows={4}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Motivasi Mengikuti Mentorship *
            </span>
            <textarea
              name="motivation"
              rows={5}
              required
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <button
            type="submit"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors"
          >
            Kirim Pendaftaran
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
