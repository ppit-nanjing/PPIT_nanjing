import assert from "node:assert/strict";
import { canReceivePasswordReset } from "../src/lib/password-reset-rules";

const verifiedAt = new Date("2026-10-19T00:00:00Z");

// Akun email + password: tetap seperti sebelumnya.
assert.equal(canReceivePasswordReset({ passwordHash: "hash", emailVerified: null }), true);

// Akun Google-only: inilah yang dulu buntu. Google sudah menyatakan emailnya
// terverifikasi, jadi tautan reset ke alamat itu sah.
assert.equal(canReceivePasswordReset({ passwordHash: null, emailVerified: verifiedAt }), true);

// Sudah punya password DAN terverifikasi - kasus umum setelah sekali reset.
assert.equal(canReceivePasswordReset({ passwordHash: "hash", emailVerified: verifiedAt }), true);

// Akun undangan yang belum diklaim: tanpa password, email belum pernah
// terbukti. Tidak ada dasar untuk mengirim tautan ke alamat itu.
assert.equal(canReceivePasswordReset({ passwordHash: null, emailVerified: null }), false);

console.log("Password reset eligibility checks passed.");
