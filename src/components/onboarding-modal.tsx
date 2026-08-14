"use client";

import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { setEmailSubscription } from "@/app/actions/user";

/**
 * Shown once, right after a user's first Google sign-in - session.user.emailSubscribed
 * is null until they answer (see src/db/schema.ts users.emailSubscribed), so this only
 * ever renders for someone who hasn't been asked yet.
 */
export function OnboardingModal() {
  const { data: session, update } = useSession();
  const [checked, setChecked] = useState(true);
  const [pending, startTransition] = useTransition();

  if (!session || session.user.emailSubscribed !== null) return null;

  function handleContinue() {
    startTransition(async () => {
      await setEmailSubscription(checked);
      await update();
    });
  }

  return (
    <div className="fixed inset-0 z-[100] bg-on-background/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg max-w-md w-full p-8">
        <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mb-6">
          <Mail className="text-primary-container" size={22} />
        </div>
        <h2 className="text-headline-md text-on-background mb-2">
          Selamat datang, {session.user.name?.split(" ")[0]}!
        </h2>
        <p className="text-body-md text-on-surface-variant mb-6">
          Mau tetap dapat kabar dari PPIT Nanjing? Kami bisa kirim info berita dan kegiatan
          (event) langsung ke email kamu.
        </p>
        <label className="flex items-start gap-3 mb-8 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary-container"
          />
          <span className="text-body-md text-on-background">
            Ya, kirimkan saya berita &amp; info kegiatan PPIT Nanjing ke {session.user.email}
          </span>
        </label>
        <button
          onClick={handleContinue}
          disabled={pending}
          className="w-full bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Lanjutkan"}
        </button>
        <p className="text-label-caps text-secondary text-center mt-4">
          Bisa diubah kapan saja lewat halaman Profil
        </p>
      </div>
    </div>
  );
}
