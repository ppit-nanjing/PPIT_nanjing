"use client";

import { useState } from "react";
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
  ChevronRight,
  X,
} from "lucide-react";

export type OrgMember = {
  name: string | null;
  image: string | null;
  avatarUrl: string | null;
  position: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  githubUrl: string | null;
  spotifyUrl: string | null;
  tiktokUrl: string | null;
};

export type OrgNodeData = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  members: OrgMember[];
  children: OrgNodeData[];
};

const VIEWS = [
  { key: "interactive", label: "Bagan" },
  { key: "cards", label: "Kartu" },
  { key: "tree", label: "Pohon" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

function SocialIcons({ member }: { member: OrgMember }) {
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
          onClick={(e) => e.stopPropagation()}
          className="text-on-surface-variant hover:text-primary-container transition-colors"
        >
          <Icon size={13} />
        </a>
      ))}
    </div>
  );
}

function MemberRow({ member, compact }: { member: OrgMember; compact?: boolean }) {
  const avatar = compact ? "w-6 h-6" : "w-7 h-7";
  return (
    <div className="flex items-center gap-2">
      {member.avatarUrl || member.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl || member.image || undefined}
          alt={member.name ?? ""}
          className={`${avatar} rounded-full object-cover border border-outline-variant shrink-0`}
        />
      ) : (
        <div className={`${avatar} rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0`}>
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

function unitIcon(name: string) {
  return name.startsWith("Badan Pengurus") ? Users : Building2;
}

function ApexNode() {
  return (
    <div className="ppit-node ppit-node-apex" style={{ borderTopColor: "var(--color-primary)" }}>
      <div className="flex items-center gap-2">
        <span className="ppit-node-ico" style={{ color: "var(--color-primary)" }}>
          <Crown size={16} style={{ color: "var(--color-primary)" }} />
        </span>
        <div>
          <h2 className="text-headline-md text-on-background leading-tight">PPIT Nanjing</h2>
          <p className="text-label-caps text-on-surface-variant">Kabinet Maju</p>
        </div>
      </div>
    </div>
  );
}

function NodeCard({
  node,
  compact,
  onClick,
}: {
  node: OrgNodeData;
  compact?: boolean;
  onClick?: (n: OrgNodeData) => void;
}) {
  const members = node.members;
  const cap = compact ? 3 : 5;
  const Icon = unitIcon(node.name);
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick ? () => onClick(node) : undefined}
      className={`ppit-node text-left ${onClick ? "cursor-pointer hover:border-primary-container transition-colors" : ""}`}
      style={{ borderTopColor: node.color }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="ppit-node-ico shrink-0" style={{ color: node.color }}>
          <Icon style={{ color: node.color }} />
        </span>
        <h3 className="text-body-md font-semibold text-on-background leading-tight">{node.name}</h3>
      </div>
      {node.description && (
        <p className="text-label-caps text-on-surface-variant leading-snug mb-2">{node.description}</p>
      )}
      {members.length > 0 && (
        <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-outline-variant">
          {members.slice(0, cap).map((m, i) => (
            <MemberRow key={i} member={m} compact={compact} />
          ))}
          {members.length > cap && (
            <p className="text-label-caps text-on-surface-variant">+{members.length - cap} lainnya</p>
          )}
        </div>
      )}
    </Wrapper>
  );
}

function ChartView({
  units,
  onSelect,
}: {
  units: OrgNodeData[];
  onSelect?: (n: OrgNodeData) => void;
}) {
  return (
    <div className="ppit-org-tree is-compact">
      <ul>
        <li>
          <ApexNode />
          <ul>
            {units.map((u) => (
              <li key={u.id}>
                <NodeCard node={u} compact onClick={onSelect} />
                {u.children.length > 0 && (
                  <ul>
                    {u.children.map((c) => (
                      <li key={c.id}>
                        <NodeCard node={c} compact onClick={onSelect} />
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
  );
}

function CardsView({ units }: { units: OrgNodeData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {units.map((u) => (
        <div
          key={u.id}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"
          style={{ borderTop: `3px solid ${u.color}` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: u.color }} />
            <h3 className="text-headline-sm text-on-background">{u.name}</h3>
          </div>
          {u.description && <p className="text-label-caps text-on-surface-variant mb-3">{u.description}</p>}
          {u.members.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {u.members.map((m, i) => (
                <MemberRow key={i} member={m} />
              ))}
            </div>
          )}
          {u.children.length > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant">
              <p className="text-label-caps text-on-surface-variant uppercase tracking-wide">Divisi</p>
              {u.children.map((c) => (
                <div key={c.id} className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-body-md font-semibold text-on-background">{c.name}</p>
                  {c.description && (
                    <p className="text-label-caps text-on-surface-variant mb-1.5">{c.description}</p>
                  )}
                  {c.members.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      {c.members.map((m, i) => (
                        <MemberRow key={i} member={m} compact />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  defaultOpen,
}: {
  node: OrgNodeData;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(depth === 0 ? true : defaultOpen ?? false);
  const hasChildren = node.children.length > 0;
  const isRoot = depth === 0;
  return (
    <div className="border border-outline-variant rounded-lg bg-surface-container-lowest overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-surface-container-low transition-colors"
      >
        <ChevronRight
          size={16}
          className={`text-on-surface-variant shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {isRoot ? (
          <Crown size={16} className="text-primary-container shrink-0" />
        ) : (
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: node.color }} />
        )}
        <span className={`${isRoot ? "text-headline-sm" : "text-body-md font-semibold"} text-on-background`}>
          {node.name}
        </span>
        {node.members.length > 0 && (
          <span className="text-label-caps text-on-surface-variant ml-auto">{node.members.length} orang</span>
        )}
      </button>
      {open && (hasChildren || node.members.length > 0) && (
        <div className="px-4 pb-4 pl-10 flex flex-col gap-3">
          {node.description && (
            <p className="text-label-caps text-on-surface-variant">{node.description}</p>
          )}
          {node.members.length > 0 && (
            <div className="flex flex-col gap-2">
              {node.members.map((m, i) => (
                <MemberRow key={i} member={m} />
              ))}
            </div>
          )}
          {hasChildren &&
            node.children.map((c) => (
              <TreeNode key={c.id} node={c} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

function TreeView({ units }: { units: OrgNodeData[] }) {
  const root: OrgNodeData = {
    id: "root",
    name: "PPIT Nanjing",
    description: null,
    color: "var(--color-primary)",
    members: [],
    children: units,
  };
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-3">
      <TreeNode node={root} depth={0} />
    </div>
  );
}

function ProfileModal({ node, onClose }: { node: OrgNodeData; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: node.color }} />
          <div>
            <h3 className="text-headline-sm text-on-background">{node.name}</h3>
            {node.description && (
              <p className="text-label-caps text-on-surface-variant mt-0.5">{node.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="ml-auto text-on-surface-variant hover:text-on-background"
          >
            <X size={20} />
          </button>
        </div>
        {node.members.length > 0 ? (
          <div className="flex flex-col gap-2 mt-3 max-h-[60vh] overflow-y-auto">
            {node.members.map((m, i) => (
              <MemberRow key={i} member={m} />
            ))}
          </div>
        ) : (
          <p className="text-label-caps text-on-surface-variant mt-3">Belum ada anggota terdaftar.</p>
        )}
      </div>
    </div>
  );
}

export function OrgExplorer({ units }: { units: OrgNodeData[] }) {
  const [view, setView] = useState<ViewKey>("interactive");
  const [active, setActive] = useState<OrgNodeData | null>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`text-label-caps uppercase tracking-wide px-4 py-2 rounded-full border transition-colors ${
              view === v.key
                ? "bg-primary-container text-on-primary border-primary-container"
                : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:text-on-background"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "cards" && <CardsView units={units} />}
      {view === "tree" && <TreeView units={units} />}
      {view === "interactive" && <ChartView units={units} onSelect={setActive} />}

      {active && <ProfileModal node={active} onClose={() => setActive(null)} />}
    </div>
  );
}
