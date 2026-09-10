"use client";

// Menangkap error yang terjadi di root layout / komponen langsung di bawahnya
// (mis. OnboardingModal, HelpCenter) — di situ src/app/error.tsx tidak
// menjangkau. Tanpa berkas ini, error di lapisan itu = layar putih kosong.
// global-error MENGGANTI seluruh <html>, jadi harus membawa <html>/<body>
// sendiri dan tidak bisa memakai provider/i18n/tema aplikasi.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff8f7",
          color: "#1c1b1b",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Terjadi kesalahan</h1>
          <p style={{ color: "#4a4646", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            Maaf, halaman gagal dimuat. Coba muat ulang, atau kembali ke beranda.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.7rem 1.4rem",
                borderRadius: 8,
                border: "none",
                background: "#7c3f7e",
                color: "#fff",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
            >
              Coba lagi
            </button>
            {/* Full document load on purpose - global-error renders outside the
                app shell / router, and we want a clean slate. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "0.7rem 1.4rem",
                borderRadius: 8,
                border: "1px solid #d8c9d4",
                color: "#1c1b1b",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                textDecoration: "none",
              }}
            >
              Ke Beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
