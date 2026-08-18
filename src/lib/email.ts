import { Resend } from "resend";

// Email sending is opt-in: without RESEND_API_KEY the app must keep working
// exactly as before, so every send degrades to a logged no-op instead of
// throwing. This mirrors how the Vercel Blob upload route behaves before its
// token is provisioned - the feature is dark, not broken.
//
// Required env (set in Vercel -> Project -> Settings -> Environment Variables):
//   RESEND_API_KEY   - from resend.com/api-keys
//   EMAIL_FROM       - e.g. "PPIT Nanjing <no-reply@ppitnanjing.org>".
//                      Until a domain is verified in Resend, their shared
//                      sender "onboarding@resend.dev" works but can only
//                      deliver to the address that owns the Resend account.

const FROM_FALLBACK = "PPIT Nanjing <onboarding@resend.dev>";

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Resend only lets an account send from its shared "onboarding@resend.dev"
// sender to the address that owns the account. Until a real domain is verified
// and EMAIL_FROM points at it, mail to applicants is rejected - so the admin UI
// has to say "testing" rather than pretending the feature is live.
export type EmailSenderStatus = "off" | "testing" | "ready";

export function emailSenderStatus(): EmailSenderStatus {
  if (!process.env.RESEND_API_KEY) return "off";
  const from = process.env.EMAIL_FROM?.trim();
  if (!from || /@resend\.dev>?\s*$/i.test(from)) return "testing";
  return "ready";
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set - skipped "${input.subject}" to ${input.to}`);
    return { ok: false, skipped: true, reason: "RESEND_API_KEY belum diatur" };
  }
  if (!input.to.trim()) {
    return { ok: false, skipped: true, reason: "Alamat email kosong" };
  }

  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM?.trim() || FROM_FALLBACK,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, skipped: false, reason: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    // A provider outage must never take down the status update that triggered it.
    console.error("[email] send threw:", err);
    return { ok: false, skipped: false, reason: err instanceof Error ? err.message : "Gagal mengirim email" };
  }
}
