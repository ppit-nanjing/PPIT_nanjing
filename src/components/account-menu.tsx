"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { ChevronDown, ShieldCheck, User, LogOut, Inbox } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import Image from "next/image";
import Link from "next/link";

/**
 * Profile hover menu. The "Masuk ke Console" (admin) link only renders when
 * session.user.isAdmin is true - resolved server-side in src/auth.ts from the
 * user's role accessTier + department grantsFullAdminAccess (see docs/Data
 * Dictionary.md "Admin Access Rule"). Hiding the link is a UX nicety, not the
 * security boundary - /console itself is gated separately by session checks.
 *
 * `compact` is used when the navbar shrinks on scroll (desktop only): the name
 * + chevron are hidden and only the avatar remains. Hovering the avatar then
 * reveals a small tooltip with the user's identity, while a click still opens
 * the full dropdown.
 */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const t = useT();

  if (status === "loading") return null;

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
      >
        {t("accountMenu.login")}
      </button>
    );
  }

  const { name, email, image, isAdmin } = session.user;

  const avatar = image ? (
    <Image
      src={image}
      alt={name ?? "Profile"}
      width={32}
      height={32}
      className="w-8 h-8 rounded-full object-cover border border-outline-variant shrink-0"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center shrink-0">
      <User size={16} />
    </div>
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => (compact ? setShowTooltip(true) : setOpen(true))}
      onMouseLeave={() => {
        setShowTooltip(false);
        setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={compact ? (name ?? "Profil") : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-surface-container-low px-3 py-2 rounded-lg transition-colors"
      >
        {avatar}
        {!compact && (
          <>
            <span className="text-body-md text-sm font-medium hidden md:block">{name}</span>
            <ChevronDown size={16} className="text-secondary" />
          </>
        )}
      </button>

      {/* Compact hover tooltip: a quick identity glance without opening the menu. */}
      {compact && showTooltip && !open && (
        <div className="absolute right-0 top-full mt-2 z-[55] w-60 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-3">
          <div className="flex items-center gap-3">
            {avatar}
            <div className="min-w-0">
              <p className="text-body-md font-semibold text-on-background truncate">{name}</p>
              {email && (
                <p className="text-label-caps text-on-surface-variant truncate">{email}</p>
              )}
            </div>
          </div>
          {isAdmin && (
            <span className="mt-2 inline-flex items-center gap-1 text-label-caps text-primary-container border border-outline-variant rounded px-2 py-0.5">
              <ShieldCheck size={14} /> Admin
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-full w-52 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-2 z-50">
          <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-container-high transition-colors">
            <User size={16} /> {t("accountMenu.myProfile")}
          </Link>
          <Link href="/profile/submissions" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-container-high transition-colors">
            <Inbox size={16} /> {t("accountMenu.submissions")}
          </Link>
          {session.user.isAdmin && (
            <Link
              href="/console"
              className="flex items-center gap-2 px-4 py-2 text-sm text-primary-container font-medium hover:bg-surface-container-high transition-colors"
            >
              <ShieldCheck size={16} /> {t("accountMenu.console")}
            </Link>
          )}
          <div className="border-t border-outline-variant my-1" />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors"
          >
            <LogOut size={16} /> {t("accountMenu.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
