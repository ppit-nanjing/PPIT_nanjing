"use client";

import { useState } from "react";

// "HTM" (Harga Tiket Masuk) toggle: fee amount is often unknown at creation
// time (depends on whether a sponsor comes through), so it's fine to check
// this box and leave the amount blank now, filling it in later via Edit.
export function HtmFields({
  defaultIsPaid,
  defaultFeeCny,
  defaultInstructions,
  defaultAlipayUid,
}: {
  defaultIsPaid?: boolean;
  defaultFeeCny?: number | null;
  defaultInstructions?: string | null;
  defaultAlipayUid?: string | null;
}) {
  const [paid, setPaid] = useState(defaultIsPaid ?? false);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md cursor-pointer">
        <input
          type="checkbox"
          name="isPaid"
          checked={paid}
          onChange={(e) => setPaid(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary-container)]"
        />
        Kegiatan berbayar (HTM)
      </label>

      {paid ? (
        <div className="flex flex-col gap-3 pl-4 border-l-2 border-outline-variant ml-1">
          <div className="flex flex-col gap-1">
            <input
              name="feeCny"
              type="number"
              min={0}
              step={1}
              defaultValue={defaultFeeCny ?? ""}
              placeholder="Biaya (CNY) — misal 20"
              className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md"
            />
            <p className="text-xs text-on-surface-variant">
              Belum tahu pasti karena masih menunggu sponsor? Kosongkan dulu, isi belakangan lewat Edit.
            </p>
          </div>
          <textarea
            name="paymentInstructions"
            defaultValue={defaultInstructions ?? ""}
            rows={3}
            placeholder={"Cara bayar (contoh: transfer ke Alipay xxx a.n. Bendahara, lalu unggah bukti di halaman tiket)"}
            className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md resize-none"
          />
          <div className="flex flex-col gap-1">
            <input
              name="alipayUid"
              defaultValue={defaultAlipayUid ?? ""}
              placeholder="Alipay UID Bendahara (opsional, contoh: 2088xxxxxxxxxxxx)"
              className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md"
            />
            <p className="text-xs text-on-surface-variant">
              Kalau diisi, halaman tiket peserta menampilkan QR yang otomatis mengisi nominal &amp; catatan saat
              dibuka di app Alipay — cara cek UID: buka Alipay → Saya → ketuk foto profil → &quot;支付宝会员号&quot;.
              Ini bukan API pembayaran resmi, cuma bikin peserta gak perlu ketik nominal sendiri; verifikasi bukti
              tetap manual seperti biasa.
            </p>
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="feeCny" value="" />
          <input type="hidden" name="paymentInstructions" value="" />
          <input type="hidden" name="alipayUid" value="" />
        </>
      )}
    </div>
  );
}
