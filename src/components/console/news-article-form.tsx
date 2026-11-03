"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import type { ContentFormState } from "@/app/actions/admin-content";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CheckboxField } from "@/components/console/form";
import { ConfirmButton } from "@/components/console/confirm-button";
import { useActionToast } from "@/components/console/submit-button";
import { NewsArticleEditor } from "@/components/console/news-article-editor";

// Shared create/edit form for console news. Client component so validation
// errors from upsertNewsArticle render inline (useActionState) instead of
// crashing into the route error boundary with the draft lost.
export function NewsArticleForm({
  action,
  initial,
  subscriberCount,
  emailReady,
  submitLabel,
  eventId,
}: {
  action: (prev: ContentFormState, formData: FormData) => Promise<ContentFormState>;
  initial?: {
    title?: string;
    coverImageUrl?: string;
    category?: string;
    content?: string;
    contentHtml?: string | null;
    published?: boolean;
    archived?: boolean;
  };
  subscriberCount: number;
  emailReady: boolean;
  submitLabel: string;
  // Kalau diset: artikel baru ditaut ke acara ini (jalur grant "Post artikel").
  eventId?: string;
}) {
  const [state, formAction, isPending] = useActionState<ContentFormState, FormData>(action, {});
  const [, startTransition] = useTransition();
  const alreadyPublished = !!initial?.published;
  const isArchived = !!initial?.archived;
  // Publikasi pertama = email massal ke semua pelanggan, tak bisa ditarik. Karena itu
  // tombol simpan berubah menjadi tombol konfirmasi saat kotak "Publikasikan" dicentang.
  const [willPublish, setWillPublish] = useState(alreadyPublished);
  const formRef = useRef<HTMLFormElement>(null);
  const willEmail = willPublish && !alreadyPublished && emailReady && subscriberCount > 0;
  useActionToast(isPending, state.error, willPublish ? "Artikel dipublikasikan." : "Artikel tersimpan.");

  return (
    // Sengaja bukan <form action>: React 19 mereset kolom setelah aksi selesai, termasuk saat server hanya
    // mengembalikan error validasi. Judul yang baru diketik ikut terhapus dan kotak "Publikasikan" kembali
    // kosong walau tombolnya masih bertuliskan "kirim email". Kirim manual supaya isian tetap utuh.
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-6"
    >
      {eventId && <input type="hidden" name="eventId" value={eventId} />}
      {state.error && (
        <p role="alert" className="bg-error-container/40 text-on-error-container text-body-md px-4 py-3 rounded-lg">
          {state.error}
        </p>
      )}

      <input
        id="news-title"
        name="title"
        placeholder="Judul *"
        required
        defaultValue={initial?.title ?? ""}
        className="bg-soft-gray rounded-md p-3 text-body-md"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ImageUploadCropper
          name="coverImageUrl"
          folder="news"
          label="Foto Sampul (opsional)"
          placeholder="URL atau unggah gambar"
          defaultValue={initial?.coverImageUrl ?? ""}
          aspect={16 / 9}
          hint="Ideal 1920 × 1080 px (16:9) — gambar di-crop & dikompres otomatis."
        />
        <input
          name="category"
          placeholder="Kategori (opsional)"
          defaultValue={initial?.category ?? ""}
          className="bg-soft-gray rounded-md p-3 text-body-md"
        />
      </div>
      <div>
        <label className="mb-2 block text-label-caps uppercase tracking-wide text-on-surface-variant">Isi berita</label>
        <NewsArticleEditor initialText={initial?.content ?? ""} initialHtml={initial?.contentHtml ?? null} />
        <div className="flex items-center gap-4 mt-1">
          <AIReviewButton context="news" fields={[{ id: "news-title", label: "Judul" }, { id: "news-content", label: "Isi" }]} />
        </div>
      </div>
      <CheckboxField
        name="publish"
        checked={willPublish}
        onChange={(e) => setWillPublish(e.target.checked)}
        label={
          alreadyPublished
            ? "Dipublikasikan"
            : isArchived
              ? "Publikasikan sekarang (jika tidak dicentang, tetap di arsip)"
              : "Publikasikan sekarang (jika tidak dicentang, tersimpan sebagai draf)"
        }
        className="text-on-background"
      />
      {isArchived && !alreadyPublished ? (
        <p className="text-body-sm text-on-surface-variant -mt-3 max-w-[62ch]">
          Berita ini diarsipkan. Menyimpan tanpa mencentang “Publikasikan” tidak mengubah statusnya — pakai tombol
          Pulihkan di atas untuk mengembalikannya ke draf.
        </p>
      ) : alreadyPublished ? (
        <p className="text-body-sm text-on-surface-variant -mt-3 max-w-[62ch]">
          Sudah dipublikasikan — email pengumuman sudah terkirim ke pelanggan saat pertama kali dipublikasikan, dan
          tidak dikirim ulang lewat perubahan ini.
        </p>
      ) : emailReady ? (
        <p className="text-body-sm text-on-surface-variant -mt-3 max-w-[62ch]">
          Mempublikasikan otomatis mengirim email ke <span className="text-on-background">{subscriberCount}</span>{" "}
          Nanjinger yang berlangganan pengumuman. Email yang sudah terkirim tidak bisa ditarik kembali, jadi cek
          judul dan isinya dulu.
        </p>
      ) : (
        <p className="text-body-sm text-on-surface-variant -mt-3 bg-error-container/30 border border-error/40 rounded-md p-3">
          <span className="text-on-background font-medium">Email pengumuman belum aktif</span> &mdash; {subscriberCount}{" "}
          Nanjinger berlangganan tapi tidak akan menerima email sampai Divisi Teknologi mengaktifkan pengiriman email.
          Berita tetap tampil di situs.
        </p>
      )}
      {willEmail ? (
        <ConfirmButton
          onConfirm={() => formRef.current?.requestSubmit()}
          title="Publikasikan dan kirim email?"
          message={`Berita ini langsung tampil di situs dan emailnya dikirim ke ${subscriberCount} pelanggan pengumuman. Email yang sudah terkirim tidak bisa ditarik kembali.`}
          confirmLabel="Ya, publikasikan"
          danger={false}
          successMessage=""
          className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          Publikasikan &amp; kirim email
        </ConfirmButton>
      ) : (
        <button
          type="submit"
          className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}
