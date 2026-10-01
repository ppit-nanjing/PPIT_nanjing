/**
 * Logo mark + wordmark at the top of the login, signup and reset-password cards.
 * The logo is a CSS mask (.brand-logo), so it takes the heading colour in every palette.
 */
export function AuthBrand() {
  return (
    <span className="flex items-center justify-center gap-2 text-headline-sm text-heading uppercase tracking-[0.2em] mb-2">
      <span aria-hidden="true" className="brand-logo h-9" />
      PPIT Nanjing
    </span>
  );
}
