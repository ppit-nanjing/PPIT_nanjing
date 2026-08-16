import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, signIn } from "@/auth";
import { CredentialForm } from "@/components/auth/credential-form";
import { signUpWithPassword } from "@/app/actions/auth";
import { safeRedirect } from "@/lib/safe-redirect";
import Link from "next/link";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = safeRedirect(rawReturnTo);
  const session = await auth();
  if (session) redirect(returnTo);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-container rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-surface-container-highest rounded-full blur-[100px]" />
      </div>

      <div className="max-w-sm w-full relative z-10">
        <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-container" />
          <span className="text-headline-md font-bold text-primary uppercase tracking-tight block mb-2">PPIT Nanjing</span>
          <h1 className="text-headline-lg text-on-background mb-3">Daftar Akun</h1>
          <p className="text-body-md text-on-surface-variant mb-6">
            Buat akun dengan email dan kata sandi untuk mengakses layanan PPIT Nanjing.
          </p>

          {returnTo !== "/" && (
            <div className="flex items-start gap-3 bg-primary-container/10 border border-primary-container/20 rounded-lg p-4 mb-6 text-left">
              <span className="text-label-caps uppercase tracking-wide text-primary-container font-semibold shrink-0">
                Simpan akun
              </span>
              <p className="text-body-sm text-on-surface-variant">
                Setelah daftar, kamu akan diarahkan kembali ke halaman yang sedang kamu buka.
              </p>
            </div>
          )}

          <CredentialForm action={signUpWithPassword} mode="signup" returnTo={returnTo} />

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-outline-variant" />
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">atau</span>
            <span className="h-px flex-1 bg-outline-variant" />
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: returnTo });
            }}
          >
            <button
              type="submit"
              aria-label="Daftar dengan akun Google"
              className="w-full flex items-center justify-center gap-3 bg-surface-container-lowest border border-outline-variant text-on-background text-body-md font-medium py-3.5 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
              </svg>
              Daftar dengan Google
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <ArrowLeft size={14} /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
