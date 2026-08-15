import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)]">
      <div className="max-w-sm w-full text-center">
        <span className="text-headline-md font-bold text-primary uppercase tracking-tight block mb-2">
          PPIT Nanjing
        </span>
        <h1 className="text-headline-lg text-on-background mb-3">Masuk</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          Masuk dengan akun Google kamu untuk mendaftar kegiatan, mengisi sensus, dan mengakses
          layanan PPIT Nanjing lainnya.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-surface-container-lowest border border-outline-variant text-on-background text-body-md font-medium py-3.5 rounded-md hover:bg-surface-container-low transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
              />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z" />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
              />
            </svg>
            Lanjutkan dengan Google
          </button>
        </form>
      </div>
    </div>
  );
}
