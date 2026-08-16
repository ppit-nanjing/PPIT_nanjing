import { isNull, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, departmentMembers, users } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  Building2,
  UserRound,
  Briefcase,
  Camera,
  FolderGit2,
  Music2,
  Video,
  Crown,
  Users,
} from "lucide-react";

type SocialLinks = {
  linkedinUrl: string | null;
  instagramUrl: string | null;
  githubUrl: string | null;
  spotifyUrl: string | null;
  tiktokUrl: string | null;
};

// lucide-react dropped brand icons in this version, so all 5 use generic
// stand-ins (per Advanced Features Build Spec §3c "keputusan visual kecil").
function SocialIcons({ member }: { member: SocialLinks }) {
  const links: { url: string | null; label: string; Icon: typeof Briefcase }[] = [
    { url: member.linkedinUrl, label: "LinkedIn", Icon: Briefcase },
    { url: member.instagramUrl, label: "Instagram", Icon: Camera },
    { url: member.githubUrl, label: "GitHub", Icon: FolderGit2 },
    { url: member.spotifyUrl, label: "Spotify", Icon: Music2 },
    { url: member.tiktokUrl, label: "TikTok", Icon: Video },
  ].filter((l) => l.url);

  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2 mt-1">
      {links.map(({ url, label, Icon }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="text-on-surface-variant hover:text-primary-container transition-colors"
        >
          <Icon size={13} />
        </a>
      ))}
    </div>
  );
}

// Warm-institutional branch accents (kept subtle to match the design system).
const BRANCH_ACCENT = [
  "var(--color-primary)",
  "var(--color-muted-gold)",
  "var(--color-secondary)",
  "var(--color-tertiary)",
];

function NodeMember({ member }: { member: SocialLinks & { name: string | null; image: string | null; avatarUrl: string | null; position: string | null } }) {
  return (
    <div className="flex items-center gap-2">
      {member.avatarUrl || member.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl || member.image || undefined}
          alt={member.name ?? ""}
          className="w-7 h-7 rounded-full object-cover border border-outline-variant shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
          <UserRound size={12} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-label-caps font-semibold text-on-background leading-tight truncate">
          {member.name ?? "Anggota"}
        </p>
        {member.position && (
          <p className="text-label-caps text-on-surface-variant leading-tight truncate">{member.position}</p>
        )}
      </div>
      <SocialIcons member={member} />
    </div>
  );
}

export default async function OrganizationPage() {
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

  // Map every department (and its divisions) to its top-level branch color.
  const colorByDept = new Map<string, string>();
  topLevel.forEach((t, i) => {
    const color = BRANCH_ACCENT[i % BRANCH_ACCENT.length];
    colorByDept.set(t.id, color);
    for (const c of childrenOf(t.id)) colorByDept.set(c.id, color);
  });

  function OrgNode({
    deptId,
    name,
    description,
    color,
  }: {
    deptId: string;
    name: string;
    description: string | null;
    color: string;
  }) {
    const members = membersByDept.get(deptId) ?? [];
    const Icon = name.startsWith("Badan Pengurus") ? Users : Building2;
    return (
      <div className="ppit-node" style={{ borderTopColor: color }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="ppit-node-ico shrink-0" style={{ color }}>
            <Icon style={{ color }} />
          </span>
          <h3 className="text-body-md font-semibold text-on-background leading-tight">{name}</h3>
        </div>
        {description && (
          <p className="text-label-caps text-on-surface-variant leading-snug mb-2">{description}</p>
        )}
        {members.length > 0 && (
          <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-outline-variant">
            {members.slice(0, 5).map((m, i) => (
              <NodeMember key={i} member={m} />
            ))}
            {members.length > 5 && (
              <p className="text-label-caps text-on-surface-variant">+{members.length - 5} lainnya</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <span className="text-label-caps tracking-widest uppercase mb-2 block text-primary-container">
          Kepengurusan 2026/2027
        </span>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          Struktur PPIT Nanjing
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Kabinet Maju PPIT Nanjing terdiri dari Badan Pengurus Harian (BPH) dan tiga departemen,
          masing-masing menaungi tiga divisi. Geser ke samping pada layar kecil untuk melihat seluruh
          struktur.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-12">
        {topLevel.length === 0 ? (
          <p className="text-body-md text-on-surface-variant text-center py-12">
            Struktur organisasi belum tersedia.
          </p>
        ) : (
          <div className="ppit-org-tree">
            <ul>
              <li>
                <div className="ppit-node ppit-node-apex" style={{ borderTopColor: "var(--color-primary)" }}>
                  <div className="flex items-center gap-2">
                    <span className="ppit-node-ico" style={{ color: "var(--color-primary)" }}>
                      <Crown size={16} style={{ color: "var(--color-primary)" }} />
                    </span>
                    <div>
                      <h2 className="text-headline-md text-on-background leading-tight">PPIT Nanjing</h2>
                      <p className="text-label-caps text-on-surface-variant">Kabinet Maju · 2026/2027</p>
                    </div>
                  </div>
                </div>
                <ul>
                  {topLevel.map((dept) => (
                    <li key={dept.id}>
                      <OrgNode
                        deptId={dept.id}
                        name={dept.name}
                        description={dept.description}
                        color={colorByDept.get(dept.id) ?? "var(--color-primary)"}
                      />
                      {childrenOf(dept.id).length > 0 && (
                        <ul>
                          {childrenOf(dept.id).map((c) => (
                            <li key={c.id}>
                              <OrgNode
                                deptId={c.id}
                                name={c.name}
                                description={c.description}
                                color={colorByDept.get(c.id) ?? "var(--color-primary)"}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>
        )}

        {topLevel.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-10">
            {topLevel.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2 text-label-caps text-on-surface-variant">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: BRANCH_ACCENT[i % BRANCH_ACCENT.length] }}
                />
                {t.name}
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
