export function MembershipTabs({ active }: { active: "list" | "form" }) {
  const base = "px-4 py-2 text-label-caps uppercase tracking-wide rounded-md transition-colors";
  return (
    <div className="flex gap-2 mb-8">
      <a
        href="/console/membership"
        className={`${base} ${active === "list" ? "bg-surface-container-low text-on-background" : "text-on-surface-variant hover:text-on-background"}`}
      >
        Daftar
      </a>
      <a
        href="/console/membership/form"
        className={`${base} ${active === "form" ? "bg-surface-container-low text-on-background" : "text-on-surface-variant hover:text-on-background"}`}
      >
        Formulir
      </a>
    </div>
  );
}
