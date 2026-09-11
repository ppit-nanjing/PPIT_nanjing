"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "motion/react";
import type { Session } from "next-auth";

// Without a server-fetched `session` seeding this, useSession() (e.g. in
// AccountMenu) starts every page load in "loading" state and only resolves
// after a client-side fetch to /api/auth/session completes - visible as the
// navbar's login button/profile menu popping in a beat after the rest of the
// page. Passing the session down from the server (see layout.tsx) means
// useSession() has the real value on first render, no flash.
//
// refetchInterval: sesi "jangan ingat saya" hidup 12 jam. Tiap kali klien
// memanggil /api/auth/session, Auth.js menandatangani ulang JWT-nya dengan
// kedaluwarsa 12 jam yang baru (jam sliding). Navigasi RSC TIDAK melakukan ini
// (RSC tak bisa set cookie), jadi tanpa poll ini seorang anggota yang aktif
// membuka portal berjam-jam tetap ke-logout tepat di jam ke-12. Poll tiap 10
// menit -> siapa pun yang tab-nya terbuka tetap masuk; yang benar-benar menutup
// portal > 12 jam baru diminta login lagi. refetchWhenOffline=false supaya tak
// menghajar koneksi yang lagi putus (audiens di Tiongkok).
export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session} refetchInterval={10 * 60} refetchWhenOffline={false}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  );
}
