"use client";

import { useState } from "react";
import { Field, fieldInput, ToggleSwitch } from "@/components/console/form";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";

// "HTM" (Harga Tiket Masuk) toggle: fee amount is often unknown at creation
// time (depends on whether a sponsor comes through), so it's fine to check
// this box and leave the amount blank now, filling it in later via Edit.
export function HtmFields({
  defaultIsPaid,
  defaultFeeCny,
  defaultInstructions,
  defaultQrUrl,
  defaultAlipayUid,
}: {
  defaultIsPaid?: boolean;
  defaultFeeCny?: number | null;
  defaultInstructions?: string | null;
  defaultQrUrl?: string | null;
  defaultAlipayUid?: string | null;
}) {
  const [paid, setPaid] = useState(defaultIsPaid ?? false);

  return (
    <div className="flex flex-col gap-3">
      <ToggleSwitch
        name="isPaid"
        checked={paid}
        onChange={(e) => setPaid(e.target.checked)}
        label="Kegiatan berbayar (HTM)"
      />

      {paid ? (
        <div className="flex flex-col gap-3 pl-4 border-l-2 border-outline-variant ml-1">
          <Field
            label="Biaya (CNY)"
            hint="Belum tahu pasti karena masih menunggu sponsor? Kosongkan dulu, isi belakangan lewat Edit."
          >
            <input
              name="feeCny"
              type="number"
              min={0}
              step={1}
              defaultValue={defaultFeeCny ?? ""}
              placeholder="misal 20"
              className={fieldInput}
            />
          </Field>

          <Field label="Instruksi pembayaran">
            <textarea
              name="paymentInstructions"
              defaultValue={defaultInstructions ?? ""}
              rows={3}
              placeholder={"Contoh: transfer ke Alipay xxx a.n. Bendahara, lalu unggah bukti di halaman tiket"}
              className={`${fieldInput} resize-none`}
            />
          </Field>

          {/* QR Alipay bendahara: cara bayar utama bagi peserta - scan, transfer,
              lalu unggah bukti. Diunggah sebagai gambar, bukan teks tautan. */}
          <ImageUploadCropper
            name="paymentQrUrl"
            folder="events"
            label="QR Alipay Bendahara"
            defaultValue={defaultQrUrl ?? ""}
            hint="Screenshot/unduhan QR pribadi bendahara dari app Alipay. Tampil di tiket peserta untuk discan."
          />

          <Field
            label="Alipay UID Bendahara (opsional)"
            hint='Alternatif QR deeplink yang mengisi nominal & catatan otomatis. Cek UID: Alipay → Saya → foto profil → "支付宝会员号". Bukan API resmi — verifikasi bukti tetap manual.'
          >
            <input
              name="alipayUid"
              defaultValue={defaultAlipayUid ?? ""}
              placeholder="contoh: 2088xxxxxxxxxxxx"
              className={fieldInput}
            />
          </Field>
        </div>
      ) : (
        <>
          {/* Saat HTM dimatikan, kirim kembali NILAI LAMA - bukan string kosong.
              Kosong berarti admin yang tak sengaja uncheck lalu menyimpan akan
              menghapus QR bendahara + nominal yang sudah diisi secara permanen.
              Nilai basi tidak bocor ke mana pun: tampilan tiket di-gate
              event.isPaid, dan mencentang kotak lagi memunculkan form dengan
              nilai tersimpan ini untuk diedit/dibersihkan sadar. */}
          <input type="hidden" name="feeCny" value={defaultFeeCny ?? ""} />
          <input type="hidden" name="paymentInstructions" value={defaultInstructions ?? ""} />
          <input type="hidden" name="paymentQrUrl" value={defaultQrUrl ?? ""} />
          <input type="hidden" name="alipayUid" value={defaultAlipayUid ?? ""} />
        </>
      )}
    </div>
  );
}
