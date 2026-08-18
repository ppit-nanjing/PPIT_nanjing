"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Search } from "lucide-react";
import { QUESTION_BANK, FIELD_TYPE_LABELS, type QuestionTemplate } from "@/lib/membership-form";
import { createFormFieldFromTemplate } from "@/app/actions/membership";

export function QuestionBank() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const categories = q
    ? QUESTION_BANK.map((c) => ({
        ...c,
        templates: c.templates.filter(
          (t) => t.label.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)
        ),
      })).filter((c) => c.templates.length > 0)
    : QUESTION_BANK;

  // Card chrome + heading come from the CollapsibleSection this sits inside.
  return (
    <div>
      <div className="flex items-center gap-2 bg-soft-gray rounded-md px-3 mb-5">
        <Search size={16} className="text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari pertanyaan (mis. divisi, motivasi, skill)…"
          className="bg-transparent flex-1 py-2.5 text-body-md focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {categories.map((cat) => (
          <div key={cat.title}>
            <h3 className="text-label-caps uppercase tracking-wide text-primary-container mb-2">{cat.title}</h3>
            <ul className="flex flex-col gap-2">
              {cat.templates.map((t) => (
                <li key={t.key}>
                  <AddTemplateButton template={t} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddTemplateButton({ template }: { template: QuestionTemplate }) {
  const { pending } = useFormStatus();
  return (
    <form action={createFormFieldFromTemplate} className="flex items-center justify-between gap-3 bg-soft-gray rounded-md px-4 py-3">
      <div className="min-w-0">
        <p className="text-body-md text-on-background truncate">{template.label}</p>
        <p className="text-label-caps text-on-surface-variant">{FIELD_TYPE_LABELS[template.type]}</p>
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-label={`Tambah ${template.label}`}
        className="shrink-0 inline-flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-3 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        <Plus size={14} /> Tambah
      </button>
      <input type="hidden" name="templateKey" value={template.key} />
    </form>
  );
}
