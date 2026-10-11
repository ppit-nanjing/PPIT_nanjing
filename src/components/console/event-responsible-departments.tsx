import { setEventResponsibleDepartments } from "@/app/actions/admin-events";
import { CheckboxField } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";

// Divisi kabinet penanggung jawab acara (proker). Read-only untuk yang tidak
// boleh mengubah Info & Pengaturan; form checkbox untuk yang boleh.
export function EventResponsibleDepartments({
  eventId,
  departments,
  selected,
  canEdit,
}: {
  eventId: string;
  departments: { id: string; name: string; parentId: string | null }[];
  selected: string[];
  canEdit: boolean;
}) {
  const nameById = new Map(departments.map((d) => [d.id, d.name]));
  const selectedNames = selected
    .map((id) => {
      const dept = departments.find((d) => d.id === id);
      if (!dept) return null;
      return dept.parentId && nameById.has(dept.parentId) ? `${nameById.get(dept.parentId)} · ${dept.name}` : dept.name;
    })
    .filter((name): name is string => Boolean(name));

  if (!canEdit) {
    return selectedNames.length > 0 ? (
      <p className="text-body-md text-on-background">{selectedNames.join(", ")}</p>
    ) : (
      <p className="text-body-md text-on-surface-variant">Belum ditentukan.</p>
    );
  }

  return (
    <form action={setEventResponsibleDepartments} className="flex flex-col gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {departments.map((d) => (
          <CheckboxField
            key={d.id}
            name="departmentId"
            value={d.id}
            defaultChecked={selected.includes(d.id)}
            label={d.parentId && nameById.has(d.parentId) ? `${nameById.get(d.parentId)} · ${d.name}` : d.name}
            className="text-body-md text-on-background"
          />
        ))}
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Biasanya satu divisi (acara proker divisi itu). Centang lebih dari satu untuk proker gabungan.
      </p>
      <SubmitButton
        successMessage="Divisi penanggung jawab tersimpan."
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        Simpan
      </SubmitButton>
    </form>
  );
}
