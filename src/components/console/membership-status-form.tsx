"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateMembershipStatus } from "@/app/actions/membership";
import { Select, CheckboxField } from "@/components/console/form";
import { ConfirmButton } from "@/components/console/confirm-button";

const BTN =
  "mt-4 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60";
const SAVED = "Status pendaftar tersimpan.";

// Formulir keputusan rekrutmen. Keputusan Diterima/Ditolak mengirim email ke pendaftar dan email tidak
// bisa ditarik, jadi saat email akan benar-benar keluar, tombol simpan berganti menjadi dialog konfirmasi
// (pola yang sama dengan publikasi berita).
//
// Sengaja bukan <form action>: React 19 mereset kolom setelah aksi selesai. Pilihan status kembali ke
// opsi pertama dan kotak email kembali tercentang, padahal state di sini tidak ikut berubah, jadi layar
// menampilkan hal yang tidak sama dengan yang tersimpan (dan tombol bisa salah menilai apakah email keluar).
export function MembershipStatusForm({
  id,
  status,
  applicantName,
  email,
  emailFrom,
  emailStatus,
  labels,
}: {
  id: string;
  status: string;
  applicantName: string;
  email: string;
  emailFrom: string | null;
  emailStatus: "ready" | "testing" | "off";
  labels: Record<"pending" | "reviewed" | "accepted" | "rejected", string>;
}) {
  const [value, setValue] = useState(status);
  const [notify, setNotify] = useState(true);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const finalDecision = value === "accepted" || value === "rejected";
  // Server hanya mengirim saat status berubah menjadi keputusan akhir (lihat updateMembershipStatus).
  const emailWillGoOut = emailStatus === "ready" && notify && finalDecision && value !== status;
  const save = () => updateMembershipStatus(new FormData(formRef.current ?? undefined));

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await save();
          toast.success(SAVED);
        });
      }}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6"
    >
      <h2 className="text-headline-md text-on-background mb-4">Status</h2>
      <input type="hidden" name="id" value={id} />
      <Select
        name="status"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full"
        aria-label="Status pendaftaran"
        options={(["pending", "reviewed", "accepted", "rejected"] as const).map((v) => ({ value: v, label: labels[v] }))}
      />
      {emailStatus === "ready" && (
        <p className="text-body-sm text-on-surface-variant mt-3">
          Memilih &ldquo;{labels.accepted}&rdquo; atau &ldquo;{labels.rejected}&rdquo; otomatis mengirim email pengumuman ke{" "}
          <span className="text-on-background">{email}</span>
          {emailFrom ? (
            <>
              {" "}
              dari <span className="text-on-background">{emailFrom}</span>
            </>
          ) : null}
          . Teksnya bisa diubah di Notifikasi.
        </p>
      )}
      {emailStatus === "testing" && (
        <p className="text-body-sm text-on-surface-variant mt-3 bg-error-container/30 border border-error/40 rounded-md p-3">
          <span className="text-on-background font-medium">Email belum bisa dikirim ke pendaftar.</span> Pengirim email
          masih berupa uji coba yang hanya bisa mengirim ke pemilik akunnya, jadi email ke {email} akan ditolak.
          Keputusanmu tetap tersimpan; minta Divisi Teknologi menyelesaikan pengaturan email.
        </p>
      )}
      {emailStatus === "off" && (
        <p className="text-body-sm text-on-surface-variant mt-3">
          Email pengumuman <span className="text-on-background">belum aktif</span>. Keputusanmu tetap tersimpan, tapi
          pendaftar tidak mendapat email sampai Divisi Teknologi mengaktifkannya.
        </p>
      )}
      {/* Decision emails are irreversible - keep them opt-out per save, not automatic. Tanpa pengirim email yang
          siap, kotaknya disembunyikan (tidak ada email yang bisa dikirim). */}
      {emailStatus === "ready" && (
        <CheckboxField
          name="notifyApplicant"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          label="Kirim email pengumuman ke pendaftar saat status berubah jadi Diterima/Ditolak"
          className="mt-3 text-on-background"
        />
      )}
      {emailWillGoOut ? (
        <ConfirmButton
          onConfirm={save}
          title={`${value === "accepted" ? "Terima" : "Tolak"} ${applicantName}?`}
          message={`${applicantName} langsung menerima email "${labels[value as "accepted" | "rejected"]}" di ${email}. Email yang sudah terkirim tidak bisa ditarik kembali.`}
          confirmLabel="Ya, simpan & kirim email"
          danger={value === "rejected"}
          successMessage={SAVED}
          className={BTN}
        >
          Simpan &amp; Kirim Email
        </ConfirmButton>
      ) : (
        <button type="submit" disabled={pending} className={BTN}>
          Simpan Status
        </button>
      )}
    </form>
  );
}
