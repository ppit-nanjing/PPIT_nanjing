"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, X } from "lucide-react";
import { START_HIDDEN_COOKIE, type StartModule, type StartStep } from "@/lib/console-start";

// Kartu sambutan untuk pengurus yang baru pertama kali membuka konsol: tiga langkah awal sesuai
// modul yang dipegang akunnya, daftar singkat "apa saja yang bisa dibuka", dan tempat mencari bantuan.
// Disembunyikan lewat cookie (dibaca server di dashboard), bukan localStorage, supaya orang yang
// sudah menyembunyikannya tidak melihat kartu berkedip sebelum hilang.
export function StartHere({
  name,
  steps,
  modules,
  initialHidden,
}: {
  name: string | null;
  steps: StartStep[];
  modules: StartModule[];
  initialHidden: boolean;
}) {
  const [hidden, setHidden] = useState(initialHidden);

  function setHiddenPersisted(next: boolean) {
    document.cookie = `${START_HIDDEN_COOKIE}=${next ? "1" : ""}; path=/console; max-age=${next ? 31536000 : 0}; samesite=lax`;
    setHidden(next);
  }

  if (hidden) {
    return (
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => setHiddenPersisted(false)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:text-primary"
        >
          <Compass size={14} aria-hidden="true" /> Tampilkan panduan mulai
        </button>
      </div>
    );
  }

  const firstName = name?.trim().split(/\s+/)[0];

  return (
    <section aria-labelledby="start-here-title" className="deco-frame mb-6 rounded-xl bg-surface-container-lowest p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="start-here-title" className="text-headline-sm text-on-background">
            Mulai dari sini
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {firstName ? `Halo, ${firstName}. ` : ""}
            Ini langkah awal yang cocok untuk akunmu. Membuka dan melihat halaman tidak mengubah data apa pun.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHiddenPersisted(true)}
          aria-label="Sembunyikan panduan mulai"
          title="Sembunyikan (bisa ditampilkan lagi)"
          className="-m-2 shrink-0 rounded-md p-2 text-on-surface-variant transition-colors hover:text-on-background"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((s, i) => (
          <li
            key={s.href + s.title}
            className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-low/60 p-4 sm:flex-row sm:items-center"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-container text-label-caps text-on-primary"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-background">{s.title}</span>
              <span className="mt-0.5 block text-body-sm text-on-surface-variant">{s.why}</span>
            </span>
            <Link
              href={s.href}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-outline-variant px-3 py-2 text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:bg-surface-container-low hover:text-primary sm:self-center"
            >
              {s.cta} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>

      {modules.length > 0 && (
        <details className="group mt-4">
          <summary className="cursor-pointer text-label-caps uppercase tracking-wide text-on-surface-variant transition-colors hover:text-on-background">
            Apa saja yang bisa kamu buka ({modules.length})
          </summary>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {modules.map((m) => (
              <div key={m.href} className="min-w-0">
                <dt>
                  <Link href={m.href} className="text-body-md font-medium text-primary-container hover:text-primary">
                    {m.label}
                  </Link>
                </dt>
                <dd className="text-body-sm text-on-surface-variant">{m.hint}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  );
}
