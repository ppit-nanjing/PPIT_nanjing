import Link from "next/link";

// Tab modul Formulir — route-based seperti MembershipTabs. Tab yang tidak
// boleh diakses user disembunyikan (gerbang sebenarnya tetap di tiap page).
export function FormsTabs({
  active,
  showPendaftaran = true,
  showPemilu = true,
  showBph = true,
  showKepanitiaan = true,
}: {
  active: "pendaftaran" | "pemilu" | "oprek-bph" | "oprek-kepanitiaan";
  showPendaftaran?: boolean;
  showPemilu?: boolean;
  showBph?: boolean;
  showKepanitiaan?: boolean;
}) {
  const base = "px-4 py-2 text-label-caps uppercase tracking-wide rounded-md transition-colors";
  const tabs = [
    showPendaftaran && { key: "pendaftaran", href: "/console/forms/pendaftaran", label: "Pendaftaran PPIT" },
    showPemilu && { key: "pemilu", href: "/console/forms/pemilu", label: "Pemilu" },
    showBph && { key: "oprek-bph", href: "/console/forms/oprek-bph", label: "Oprek BPH Acara" },
    showKepanitiaan && { key: "oprek-kepanitiaan", href: "/console/forms/oprek-kepanitiaan", label: "Oprek Kepanitiaan" },
  ].filter(Boolean) as { key: string; href: string; label: string }[];

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`${base} ${
            active === tab.key
              ? "bg-surface-container-low text-on-background"
              : "text-on-surface-variant hover:text-on-background"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
