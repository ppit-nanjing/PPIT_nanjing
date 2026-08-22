import { eq } from "drizzle-orm";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { getSiteOrigin } from "@/lib/site";
import { db } from "@/db";
import { managementPeriods, shortLinks } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { ShortLinkForm } from "@/components/console/short-link-form";
import { CopyLinkButton } from "@/components/console/copy-link-button";
import { ShortLinkDeleteButton } from "@/components/console/short-link-delete-button";
import { deleteShortLink, toggleShortLink, updateShortLink } from "@/app/actions/short-links";

function toLocalInput(date: Date): string {
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

export default async function EditShortLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleAccess("links");
  const { id } = await params;

  const [link] = await db.select().from(shortLinks).where(eq(shortLinks.id, id)).limit(1);
  if (!link) notFound();

  const periods = await db
    .select({ id: managementPeriods.id, label: managementPeriods.label })
    .from(managementPeriods)
    .orderBy(managementPeriods.label);

  const updateAction = updateShortLink.bind(null, id);

  const origin = await getSiteOrigin();
  const publicUrl = `${origin}/l/${link.slug}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { width: 240, margin: 1 });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link href="/console/links" className="text-label-caps uppercase tracking-wide text-secondary hover:text-on-background">
        ← Kembali ke Tautan
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Edit Tautan</h1>
        <CopyLinkButton slug={link.slug} label="Salin tautan publik" />
      </div>
      <p className="text-label-caps text-on-surface-variant mb-6">
        <code className="text-on-background">{origin}/l/{link.slug}</code>
      </p>

      <div className="flex flex-col items-start gap-2 mb-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 w-fit">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">QR code tautan</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code untuk ${publicUrl}`} width={240} height={240} className="rounded-lg" />
        <a
          href={qrDataUrl}
          download={`${link.slug}.png`}
          className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
        >
          Unduh PNG
        </a>
      </div>

      <ShortLinkForm
        action={updateAction}
        periods={periods}
        submitLabel="Simpan Perubahan"
        showActive
        initial={{
          slug: link.slug,
          title: link.title,
          targetUrl: link.targetUrl,
          description: link.description,
          category: link.category,
          managementPeriodId: link.managementPeriodId,
          expiresAt: link.expiresAt ? toLocalInput(link.expiresAt) : null,
          isActive: link.isActive,
        }}
      />

      <div className="flex flex-wrap gap-3 mt-8 max-w-2xl">
        <form action={toggleShortLink.bind(null, id)}>
          <button
            type="submit"
            className="bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-surface-container-lowest transition-colors"
          >
            {link.isActive ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </form>
        <ShortLinkDeleteButton action={deleteShortLink.bind(null, id)} />
      </div>
    </div>
  );
}
