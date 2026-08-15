"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, UserRound, ScanLine } from "lucide-react";
import { checkInByToken } from "@/app/actions/admin-events";

type Status = "pending" | "done" | "invalid";

export function ScanCheckIn({
  token,
  eventId,
  name,
  email,
}: {
  token: string;
  eventId: string;
  name: string | null;
  email: string | null;
}) {
  const [status, setStatus] = useState<Status>("pending");
  const [already, setAlready] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkInByToken(token, eventId)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setStatus("invalid");
        } else {
          setAlready(res.already);
          setStatus("done");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token, eventId]);

  if (status === "invalid") {
    return (
      <div className="mb-8 rounded-xl border border-red-300 bg-surface-container-lowest p-6 flex flex-col items-center text-center">
        <XCircle className="text-red-500 mb-3" size={40} />
        <p className="text-body-lg text-on-background font-semibold">Token tidak valid</p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mb-8 flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
        <ScanLine className="text-outline-variant mb-3 animate-pulse" size={40} />
        <p className="text-body-md text-on-surface-variant">Memproses check-in…</p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col items-center text-center">
      <CheckCircle2 className="text-primary-container mb-3" size={40} />
      <p className="text-body-lg text-on-background font-semibold mb-1">
        {already ? "Sudah check-in sebelumnya" : "Check-in berhasil"}
      </p>
      <div className="flex items-center gap-2 text-on-surface-variant mt-2">
        <UserRound size={16} />
        <span className="text-body-md">{name ?? "(tanpa nama)"}</span>
      </div>
      {email && <p className="text-label-caps text-on-surface-variant">{email}</p>}
      <a
        href={`/console/events/${eventId}/scan`}
        className="mt-5 inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
      >
        <ScanLine size={16} /> Scan Berikutnya
      </a>
    </div>
  );
}
