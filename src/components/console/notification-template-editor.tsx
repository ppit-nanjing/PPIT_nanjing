"use client";

import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import {
  resetNotificationTemplate,
  upsertNotificationTemplate,
} from "@/app/actions/admin-notifications";
import { renderTemplate, type NotificationTemplateDef } from "@/lib/notification-templates";

// Neutral stand-ins so the preview shows shape, not invented org facts (no fake
// event names or item brands - same rule the rest of this project follows).
const PREVIEW_VALUES: Record<string, string> = {
  eventTitle: "Nama Kegiatan",
  itemName: "Nama Barang",
};

function previewFor(variables: string[]): Record<string, string> {
  return Object.fromEntries(variables.map((v) => [v, PREVIEW_VALUES[v] ?? v]));
}

export function NotificationTemplateEditor({
  def,
  subject,
  bodyTemplate,
  customized,
  updatedAt,
  updatedByName,
}: {
  def: NotificationTemplateDef;
  subject: string;
  bodyTemplate: string;
  customized: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
}) {
  const [draftSubject, setDraftSubject] = useState(subject);
  const [draftBody, setDraftBody] = useState(bodyTemplate);

  const sample = previewFor(def.variables);
  const subjectId = `subject-${def.key}`;
  const bodyId = `body-${def.key}`;

  return (
    <CollapsibleSection
      defaultOpen={false}
      title={
        <span className="flex items-center gap-2">
          {def.label}
          {customized ? (
            <span className="text-label-caps uppercase tracking-wide bg-primary-container/10 text-primary-container px-2 py-0.5 rounded">
              Tersuai
            </span>
          ) : (
            <span className="text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded">
              Bawaan
            </span>
          )}
        </span>
      }
      description={def.trigger}
    >
      <form action={upsertNotificationTemplate.bind(null, def.key)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={subjectId} className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            Judul notifikasi
          </label>
          <input
            id={subjectId}
            name="subject"
            required
            value={draftSubject}
            onChange={(e) => setDraftSubject(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant rounded-md px-4 py-3 text-body-md text-on-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={bodyId} className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            Isi pesan
          </label>
          <textarea
            id={bodyId}
            name="bodyTemplate"
            required
            rows={3}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            aria-describedby={`${bodyId}-help`}
            className="bg-surface-container-lowest border border-outline-variant rounded-md px-4 py-3 text-body-md text-on-background leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
          <p id={`${bodyId}-help`} className="text-body-sm text-on-surface-variant">
            {def.variables.length > 0 ? (
              <>
                Variabel tersedia:{" "}
                {def.variables.map((v, i) => (
                  <span key={v}>
                    {i > 0 && ", "}
                    <code className="bg-surface-container-low text-primary-container px-1.5 py-0.5 rounded">
                      {`{{${v}}}`}
                    </code>
                  </span>
                ))}
                . Variabel yang tidak dikenal akan dikosongkan.
              </>
            ) : (
              "Template ini tidak punya variabel — tulis pesan apa adanya."
            )}
          </p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">
            Pratinjau
          </p>
          <p className="text-body-md font-bold text-on-background">
            {renderTemplate(draftSubject, sample) || "—"}
          </p>
          <p className="text-body-md text-on-surface-variant mt-1">
            {renderTemplate(draftBody, sample) || "—"}
          </p>
        </div>

        {customized && updatedAt ? (
          <p className="text-body-sm text-on-surface-variant">
            Terakhir diubah {updatedAt}
            {updatedByName ? ` oleh ${updatedByName}` : ""}.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            <Save size={16} aria-hidden /> Simpan
          </button>
          {customized ? (
            <button
              type="submit"
              formAction={resetNotificationTemplate.bind(null, def.key)}
              formNoValidate
              className="flex items-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <RotateCcw size={16} aria-hidden /> Kembalikan ke bawaan
            </button>
          ) : null}
        </div>
      </form>
    </CollapsibleSection>
  );
}
