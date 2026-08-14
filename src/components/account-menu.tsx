"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { ChevronDown, ShieldCheck, User, LogOut } from "lucide-react";

/**
 * Profile hover menu. The "Masuk ke Console" (admin) link only renders when
 * session.user.isAdmin is true - resolved server-side in src/auth.ts from the
 * user's role accessTier + department grantsFullAdminAccess (see docs/Data
 * Dictionary.md "Admin Access Rule"). Hiding the link is a UX nicety, not the
 * security boundary - /console itself is gated separately by session checks.
 */
export function AccountMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") return null;

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
      >
        Login
      </button>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="flex items-center gap-2 hover:bg-surface-container-low px-3 py-2 rounded-lg transition-colors">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name ?? "Profile"}
            className="w-8 h-8 rounded-full object-cover border border-outline-variant"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center">
            <User size={16} />
          </div>
        )}
        <span className="text-body-md text-sm font-medium hidden md:block">{session.user.name}</span>
        <ChevronDown size={16} className="text-secondary" />
      </button>

      {open && (
        <div className="absolute right-0 top-full w-52 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-2 z-50">
          <a href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-container-high transition-colors">
            <User size={16} /> Profil Saya
          </a>
          {session.user.isAdmin && (
            <a
              href="/console"
              className="flex items-center gap-2 px-4 py-2 text-sm text-primary-container font-medium hover:bg-surface-container-high transition-colors"
            >
              <ShieldCheck size={16} /> Masuk ke Console
            </a>
          )}
          <div className="border-t border-outline-variant my-1" />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
