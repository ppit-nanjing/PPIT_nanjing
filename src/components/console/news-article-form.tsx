"use client";

import { useActionState } from "react";
import type { ContentFormState } from "@/app/actions/admin-content";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CheckboxField } from "@/components/console/form";

// Shared create/edit form for console news. Client component so validation
// errors from upsertNewsArticle render inline (useActionState) instead of
// crashing into the route error boundary with the draft lost.
export function NewsArticleForm({
  action,
  initial,
  subscriberCount,
  emailReady,
  submitLabel,
}: {
  action: (prev: ContentFormState, formData: FormData) => Promise<ContentFormState>;
  initial?: {
    title?: string;
    coverImageUrl?: string;
    category?: string;
    content?: string;
    published?: boolean;
  };
  subscriberCount: number;
  emailReady: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ContentFormState, FormData>(action, {});
  const alreadyPublished = !!initial?.published;

  return (
    <form action={formAction} className="flex flex-col gap-6">
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
        <textarea
          id="news-content"
          name="content"
          placeholder="Isi berita"
          rows={10}
          defaultValue={initial?.content ?? ""}
          className="bg-soft-gray rounded-md p-3 text-body-md resize-none w-full"
        />
        <div className="flex items-center gap-4 mt-1">
          <AIImproveButton context="news" targetId="news-content" />
          <AIReviewButton context="news" fields={[{ id: "news-title", label: "Judul" }, { id: "news-content", label: "Isi" }]} />
        </div>
      </div>
      <CheckboxField
        name="publish"
        defaultChecked={alreadyPublished}
        label={alreadyPublished ? "Dipublikasikan" : "Publikasikan sekarang (jika tidak dicentang, tersimpan sebagai draf)"}
        className="text-on-background"
      />
      {alreadyPublished ? (
        <p className="text-label-caps text-on-surface-variant -mt-3">
          Sudah dipublikasikan — email pengumuman sudah terkirim ke pelanggan saat pertama kali dipublikasikan, dan
          tidak dikirim ulang lewat perubahan ini.
        </p>
      ) : emailReady ? (
        <p className="text-label-caps text-on-surface-variant -mt-3">
          Mempublikasikan otomatis mengirim email ke <span className="text-on-background">{subscriberCount}</span>{" "}
          anggota yang berlangganan pengumuman.
        </p>
      ) : (
        <p className="text-label-caps text-on-surface-variant -mt-3 bg-error-container/30 border border-error/40 rounded-md p-3">
          <span className="text-on-background font-medium">Email pengumuman belum aktif</span> &mdash; {subscriberCount}{" "}
          anggota berlangganan tapi tidak akan menerima email sampai <code>GMAIL_USER</code> +{" "}
          <code>GMAIL_APP_PASSWORD</code> diisi di Vercel.
        </p>
      )}
      <button
        type="submit"
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}
