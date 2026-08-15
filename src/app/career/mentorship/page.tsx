import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MentorshipForm } from "@/components/mentorship-form";
import { TrendingUp, Map, Users2 } from "lucide-react";

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Wawasan Industri",
    description: "Pelajari ekspektasi dan tren dunia kerja langsung dari alumni yang sudah berkarir.",
  },
  {
    icon: Map,
    title: "Peta Karir",
    description: "Dapatkan saran yang relevan untuk menghadapi tantangan dan peluang setelah lulus.",
  },
  {
    icon: Users2,
    title: "Perluasan Jaringan",
    description: "Bangun koneksi yang berarti dalam jaringan alumni PPIT yang lebih luas.",
  },
];

export default async function MentorshipPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div>
            <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">
              Alumni Network <span className="text-primary-container">Mentorship</span>
            </h1>
            <p className="text-body-lg text-on-surface-variant">
              Terhubung dengan alumni yang berpengalaman di bidangmu. Dapatkan wawasan industri,
              bimbingan karir, dan perluas jaringan profesionalmu di komunitas Indonesia di
              Tiongkok dan sekitarnya.
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h2 className="text-headline-md text-on-background mb-4">Kenapa Ikut?</h2>
            <ul className="flex flex-col gap-4">
              {BENEFITS.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="bg-surface-container-low text-primary-container p-2 rounded-full shrink-0">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="text-body-md font-bold text-on-surface">{title}</h3>
                    <p className="text-body-md text-on-surface-variant mt-1">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-10">
          <div className="mb-8 border-b border-outline-variant pb-6">
            <h2 className="text-headline-lg text-on-background">Formulir Pendaftaran</h2>
            <p className="text-body-md text-on-surface-variant mt-2">
              Ceritakan sedikit tentang dirimu supaya kami bisa mencarikan mentor alumni yang
              paling cocok untukmu.
            </p>
          </div>
          <MentorshipForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
