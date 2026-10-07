import { Lock } from "lucide-react";
import { db } from "@/db";
import { formTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { FormTemplateForm } from "@/components/forms/form-template-form";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Dipakai ketiga halaman formulir publik (/recruitment, /evaluation/*).
// force-dynamic dipilih di page-nya supaya status/draft template tidak membeku
// di build; template baru yang dibuat lewat console tetap langsung tampil.
export async function PublicFormPage({ slug, kicker }: { slug: string; kicker: TKey }) {
  const { t } = await getT();

  const [template] = await db.select().from(formTemplates).where(eq(formTemplates.slug, slug));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{t(kicker)}</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background text-balance mb-4">
          {template?.title ?? t("forms.titleFallback")}
        </h1>
        {template?.description && (
          <p className="text-body-lg text-on-surface-variant max-w-2xl text-pretty whitespace-pre-line">
            {template.description}
          </p>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] pb-20">
        {!template ? (
          <p className="text-body-md text-on-surface-variant">{t("forms.notFound")}</p>
        ) : template.status !== "published" ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 text-center">
            <Lock className="text-on-surface-variant" size={32} aria-hidden="true" />
            <h2 className="text-headline-md text-on-background">{t("forms.closedTitle")}</h2>
            <p className="text-body-md text-on-surface-variant max-w-md">{t("forms.closedBody")}</p>
          </div>
        ) : (
          <FormTemplateForm
            slug={template.slug}
            title={template.title}
            sections={template.sections}
            successMessage={template.successMessage}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
