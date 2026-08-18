interface Dept {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
  orderIndex: number;
}
interface MemberUser {
  id: string;
  name: string | null;
  email: string;
}
interface Membership {
  userId: string;
  departmentId: string;
  position: string | null;
}

export function StructureTable({
  departments,
  users,
  memberships,
}: {
  departments: Dept[];
  users: MemberUser[];
  memberships: Membership[];
}) {
  const nameById = new Map(users.map((u) => [u.id, u.name ?? u.email]));
  const top = departments
    .filter((d) => d.parentDepartmentId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const childrenOf = (parentId: string) =>
    departments
      .filter((d) => d.parentDepartmentId === parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  const rows: { dept: Dept; child: boolean }[] = [];
  for (const d of top) {
    rows.push({ dept: d, child: false });
    for (const c of childrenOf(d.id)) rows.push({ dept: c, child: true });
  }

  return (
    <>
      <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-md min-w-[640px]">
          <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-5 py-3">Unit</th>
              <th className="text-left px-5 py-3">Kepala</th>
              <th className="text-left px-5 py-3">Anggota &amp; Posisi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ dept, child }) => {
              const head = dept.headUserId ? nameById.get(dept.headUserId) ?? "—" : "—";
              const members = memberships
                .filter((m) => m.departmentId === dept.id)
                .map((m) => ({
                  name: nameById.get(m.userId) ?? "(tidak dikenal)",
                  position: m.position,
                }));
              return (
                <tr key={dept.id} className="border-t border-outline-variant align-top">
                  <td className="px-5 py-3">
                    <span className={child ? "inline-block pl-6 text-on-surface-variant" : "font-medium text-on-background"}>
                      {child && <span className="text-outline-variant mr-1">↳</span>}
                      {dept.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-on-surface">{head}</td>
                  <td className="px-5 py-3">
                    {members.length === 0 ? (
                      <span className="text-on-surface-variant">—</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {members.map((m, i) => (
                          <li key={i} className="text-on-surface">
                            {m.name}
                            {m.position ? <span className="text-on-surface-variant"> — {m.position}</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-on-surface-variant">
                  Belum ada struktur organisasi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada struktur organisasi.</p>
        ) : (
          rows.map(({ dept, child }) => {
            const head = dept.headUserId ? nameById.get(dept.headUserId) ?? "—" : "—";
            const members = memberships
              .filter((m) => m.departmentId === dept.id)
              .map((m) => ({
                name: nameById.get(m.userId) ?? "(tidak dikenal)",
                position: m.position,
              }));
            return (
              <div key={dept.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
                <p className={child ? "text-on-surface-variant" : "font-medium text-on-background"}>
                  {child && <span className="text-outline-variant mr-1">↳</span>}
                  {dept.name}
                </p>
                <p className="text-body-md">
                  <span className="text-label-caps text-on-surface-variant">Kepala: </span>
                  <span className="text-on-surface">{head}</span>
                </p>
                <div className="text-body-md">
                  <span className="text-label-caps text-on-surface-variant">Anggota: </span>
                  {members.length === 0 ? (
                    <span className="text-on-surface-variant">—</span>
                  ) : (
                    <ul className="flex flex-col gap-1 mt-1">
                      {members.map((m, i) => (
                        <li key={i} className="text-on-surface">
                          {m.name}
                          {m.position ? <span className="text-on-surface-variant"> — {m.position}</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
