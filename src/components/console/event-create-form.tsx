"use client";

import { useActionState } from "react";
import { createEvent, type EventFormState } from "@/app/actions/admin-events";
import { TextField, TextAreaField, CheckField } from "@/components/console/form";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { HtmFields } from "@/components/console/htm-fields";

// Client wrapper so validation errors from createEvent render inline
// (useActionState) instead of crashing into the route error boundary and
// wiping everything the admin typed. Markup mirrors the edit form in
// /console/events/[id].
export function EventCreateForm() {
  const [state, formAction] = useActionState<EventFormState, FormData>(createEvent, {});

  return (
    <form action={formAction} className="px-4 pb-5 sm:px-6 sm:pb-6 flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="bg-error-container/40 text-on-error-container text-body-md px-4 py-3 rounded-lg">
          {state.error}
        </p>
      )}

      {/* Bagian 1 - identitas acara */}
      <details open className="border border-outline-variant rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container">
          1 · Info Acara
        </summary>
        <div className="px-4 pb-4 flex flex-col gap-3">
          <TextField name="title" label="Judul Kegiatan" required id="event-title" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField name="category" label="Kategori" placeholder="mis. Cultural" id="event-category" />
            <TextField name="location" label="Lokasi" placeholder="mis. Novotel" id="event-location" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField name="startAt" label="Tanggal & jam mulai" type="datetime-local" hint="Kapan acara berlangsung." />
            <TextField name="capacity" label="Kapasitas" type="number" min={1} />
          </div>
          <ImageUploadCropper
            name="coverImageUrl"
            folder="events"
            label="Gambar Sampul"
            aspect={16 / 9}
            hint="Ideal 1920 × 1080 px (16:9) — gambar di-crop & dikompres otomatis."
          />
        </div>
      </details>

      {/* Bagian 2 - aturan pendaftaran & HTM */}
      <details open className="border border-outline-variant rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container">
          2 · Pendaftaran &amp; Biaya
        </summary>
        <div className="px-4 pb-4 flex flex-col gap-3">
          <TextField
            name="registrationDeadline"
            label="Batas Pendaftaran"
            type="datetime-local"
            hint="Lewat dari ini tombol daftar tertutup otomatis. Kosongkan bila tak ada batas."
          />
          <CheckField name="requiresSensus" label="Hanya untuk peserta yang sudah lengkap mengisi sensus (mahasiswa Indo di China)" />
          <CheckField name="certificateForParticipants" label="Peserta mendapat e-sertifikat kehadiran" defaultChecked />
          <CheckField
            name="volunteerSignupOpen"
            label="Buka pendaftaran volunteer publik"
            hint="Orang luar bisa melamar jadi volunteer di halaman acara."
          />
          <HtmFields />
        </div>
      </details>

      {/* Bagian 3 - konten & jadwal rilis; jarang diisi saat awal, makanya dilipat */}
      <details className="border border-outline-variant rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-on-surface-variant">
          3 · Deskripsi, Agenda &amp; Jadwal Rilis (opsional)
        </summary>
        <div className="px-4 pb-4 flex flex-col gap-3">
          <TextAreaField name="description" label="Deskripsi" rows={3} id="event-description" />
          <AIImproveButton context="event" targetId="event-description" className="mt-1" />
          <TextAreaField
            name="agenda"
            label="Agenda / Jadwal"
            rows={3}
            id="event-agenda"
            placeholder={"18:00 - Registrasi\n19:00 - Pembukaan"}
            hint="Satu baris per item."
          />
          <TextField
            name="scheduledPublishAt"
            label="Jadwal Rilis Publikasi (opsional)"
            type="datetime-local"
            hint='Isi bila acara tampil ke publik hanya SETELAH waktu ini (status "Terjadwal", rilis sendiri). Kosongkan = langsung Draf.'
          />
        </div>
      </details>

      <AIReviewButton
        context="event"
        fields={[
          { id: "event-title", label: "Judul" },
          { id: "event-category", label: "Kategori" },
          { id: "event-location", label: "Lokasi" },
          { id: "event-description", label: "Deskripsi" },
          { id: "event-agenda", label: "Agenda" },
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="schedule"
          className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 sm:px-6 sm:py-3 rounded-md hover:bg-primary transition-colors"
        >
          Buat &amp; Lanjut Edit
        </button>
        <button
          type="submit"
          name="intent"
          value="draft"
          className="self-start bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-4 py-2.5 sm:px-6 sm:py-3 rounded-md border border-outline-variant hover:bg-surface-container transition-colors"
        >
          Simpan sebagai Draft
        </button>
      </div>
    </form>
  );
}
