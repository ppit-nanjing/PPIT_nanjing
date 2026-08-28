"use client";

import { useState } from "react";
import { EVENT_STRUCTURE_TEMPLATES, STRUCTURE_TEMPLATE_GROUPS } from "@/lib/event-structure-templates";
import { Select } from "@/components/console/form";

// Dipisah dari EventCommitteeStructure (server component) karena dua baris
// konteksnya harus mengikuti template yang sedang dipilih di <select> - itu
// butuh state klien. Registry-nya murni data tanpa import apa pun, jadi aman
// dibaca langsung dari sini tanpa lewat props.
export function TemplatePicker() {
  const [selectedId, setSelectedId] = useState(EVENT_STRUCTURE_TEMPLATES[0]?.id ?? "");
  const selected = EVENT_STRUCTURE_TEMPLATES.find((t) => t.id === selectedId);

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <Select
        name="templateId"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        aria-label="Pilih template struktur kepanitiaan"
        className="w-auto min-w-[16rem]"
      >
        {STRUCTURE_TEMPLATE_GROUPS.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {EVENT_STRUCTURE_TEMPLATES.filter((t) => t.group === group.id).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      {selected && (
        <>
          <p className="text-sm text-on-background">{selected.description}</p>
          <p className="text-xs text-on-surface-variant">{selected.coreHint}</p>
        </>
      )}
    </div>
  );
}
