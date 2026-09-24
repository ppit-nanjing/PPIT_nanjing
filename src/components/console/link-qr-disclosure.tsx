// QR code data URL is generated server-side (see console/links/page.tsx) and
// passed in as a plain prop - no client JS needed, <details> handles the
// show/hide so the table doesn't render 20+ inline QR images by default.
export function LinkQrDisclosure({ slug, qrDataUrl }: { slug: string; qrDataUrl: string }) {
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors">
        QR code
      </summary>
      <div className="mt-2 flex flex-col items-start gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR code untuk /l/${slug}`}
          width={140}
          height={140}
          className="rounded-md border border-outline-variant"
        />
        <a
          href={qrDataUrl}
          download={`${slug}.png`}
          className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
        >
          Unduh PNG
        </a>
      </div>
    </details>
  );
}
