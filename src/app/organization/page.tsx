import { isNull, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, departmentMembers, users } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Building2, UserRound } from "lucide-react";

export default async function OrganizationPage() {
  const topLevel = await db.select().from(departments).where(isNull(departments.parentDepartmentId));
  const all = await db.select().from(departments);
  const childrenOf = (parentId: string) =>
    all.filter((d) => d.parentDepartmentId === parentId).sort((a, b) => a.orderIndex - b.orderIndex);

  const memberRows = await db
    .select({
      departmentId: departmentMembers.departmentId,
      position: departmentMembers.position,
      name: users.name,
      image: users.image,
      avatarUrl: users.avatarUrl,
    })
    .from(departmentMembers)
    .leftJoin(users, eq(departmentMembers.userId, users.id));

  const membersByDept = new Map<string, typeof memberRows>();
  for (const m of memberRows) {
    const list = membersByDept.get(m.departmentId) ?? [];
    list.push(m);
    membersByDept.set(m.departmentId, list);
  }

  function MemberList({ deptId }: { deptId: string }) {
    const members = membersByDept.get(deptId);
    if (!members || members.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-outline-variant">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            {m.image || m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.image ?? m.avatarUrl ?? undefined}
                alt={m.name ?? ""}
                className="w-8 h-8 rounded-full object-cover border border-outline-variant"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                <UserRound size={14} />
              </div>
            )}
            <div>
              <p className="text-label-caps font-semibold text-on-background leading-tight">{m.name ?? "Anggota"}</p>
              {m.position && <p className="text-label-caps text-on-surface-variant leading-tight">{m.position}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
          Kepengurusan 2026/2027
        </span>
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">
          Struktur PPIT Nanjing
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Kabinet Maju PPIT Nanjing terdiri dari Badan Pengurus Harian (BPH) dan tiga departemen,
          masing-masing menaungi tiga divisi.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 flex flex-col gap-10">
        {topLevel
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((dept) => {
            const children = childrenOf(dept.id);
            return (
              <section
                key={dept.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center shrink-0">
                    <Building2 className="text-primary-container" size={20} />
                  </div>
                  <div>
                    <h2 className="text-headline-md text-on-background">{dept.name}</h2>
                    {dept.description && (
                      <p className="text-body-md text-on-surface-variant mt-1">{dept.description}</p>
                    )}
                  </div>
                </div>
                <MemberList deptId={dept.id} />

                {children.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {children.map((c) => (
                      <div
                        key={c.id}
                        className="bg-surface-container-low border border-outline-variant rounded-lg p-5"
                      >
                        <h3 className="text-body-md font-semibold text-on-background mb-1">{c.name}</h3>
                        {c.description && (
                          <p className="text-label-caps text-on-surface-variant">{c.description}</p>
                        )}
                        <MemberList deptId={c.id} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

        {topLevel.length === 0 && (
          <p className="text-body-md text-on-surface-variant text-center py-12">
            Struktur organisasi belum tersedia.
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
