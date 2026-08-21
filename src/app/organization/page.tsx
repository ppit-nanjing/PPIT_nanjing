import { isNull, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, departmentMembers, users } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { OrgExplorer, type OrgNodeData, type OrgMember } from "@/components/org-explorer";
import { Network } from "lucide-react";
import { getT } from "@/lib/i18n/server";

// Warm-institutional branch accents (kept subtle to match the design system).
const BRANCH_ACCENT = [
  "var(--color-primary)",
  "var(--color-muted-gold)",
  "var(--color-secondary)",
  "var(--color-tertiary)",
];

function toMember(row: {
  name: string | null;
  image: string | null;
  avatarUrl: string | null;
  position: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  githubUrl: string | null;
  spotifyUrl: string | null;
  tiktokUrl: string | null;
}): OrgMember {
  return {
    name: row.name,
    image: row.image,
    avatarUrl: row.avatarUrl,
    position: row.position,
    linkedinUrl: row.linkedinUrl,
    instagramUrl: row.instagramUrl,
    githubUrl: row.githubUrl,
    spotifyUrl: row.spotifyUrl,
    tiktokUrl: row.tiktokUrl,
  };
}

export default async function OrganizationPage() {
  const { t } = await getT();
  const topLevel = (await db.select().from(departments).where(isNull(departments.parentDepartmentId))).sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
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
      linkedinUrl: users.linkedinUrl,
      instagramUrl: users.instagramUrl,
      githubUrl: users.githubUrl,
      spotifyUrl: users.spotifyUrl,
      tiktokUrl: users.tiktokUrl,
    })
    .from(departmentMembers)
    .leftJoin(users, eq(departmentMembers.userId, users.id));

  const membersByDept = new Map<string, typeof memberRows>();
  for (const m of memberRows) {
    const list = membersByDept.get(m.departmentId) ?? [];
    list.push(m);
    membersByDept.set(m.departmentId, list);
  }

  const units: OrgNodeData[] = topLevel.map((t, i) => {
    const color = BRANCH_ACCENT[i % BRANCH_ACCENT.length];
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      color,
      members: (membersByDept.get(t.id) ?? []).map(toMember),
      children: childrenOf(t.id).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        color,
        members: (membersByDept.get(c.id) ?? []).map(toMember),
        children: [],
      })),
    };
  });

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
          <span className="text-label-caps tracking-widest uppercase mb-2 block text-primary-container">
            {t("org.structure.term")}
          </span>
          <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
            {t("org.structure.title")}
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl">
            {t("org.structure.intro")}
          </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {units.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-24">
            <Network className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">
              {t("org.structure.emptyTitle")}
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-md">
              {t("org.structure.emptyDesc")}
            </p>
          </div>
        ) : (
          <OrgExplorer units={units} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
