"use client";

import { Printer } from "lucide-react";

// window.print() lewat "Save as PDF" di dialog cetak browser - nol dependency
// baru buat PDF, dibanding Puppeteer/headless Chromium yang berat di Vercel.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-primary-container hover:text-primary inline-flex items-center gap-1"
    >
      <Printer size={13} aria-hidden /> Cetak / Simpan sebagai PDF
    </button>
  );
}
