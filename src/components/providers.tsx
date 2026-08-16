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
export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  );
}
