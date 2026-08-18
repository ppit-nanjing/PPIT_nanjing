import { Resend } from "resend";
import nodemailer from "nodemailer";

// Email sending is opt-in and has two interchangeable backends, because the
// right one depends on whether PPIT owns a domain:
//
//   Gmail SMTP  - sends from the real PPIT Gmail account. Needs no domain, so
//                 this is the workable option today. Requires 2-Step
//                 Verification on that account plus an App Password
//                 (myaccount.google.com/apppasswords). ~500 recipients/day on
//                 a free account, ~2000 on Workspace.
//   Resend      - nicer deliverability and no daily cap, but only sends to
//                 arbitrary recipients once a domain you control is verified.
//                 Its shared onboarding@resend.dev sender can only reach the
//                 address that owns the Resend account, which is useless for
//                 announcing results to applicants.
//
// Gmail wins when both are set, since it is the one that actually reaches
// applicants. With neither set every send degrades to a logged no-op instead of
// throwing, so the feature is dark rather than broken.
//
// Env (Vercel -> Project -> Settings -> Environment Variables):
//   GMAIL_USER + GMAIL_APP_PASSWORD   -> Gmail SMTP
//   RESEND_API_KEY + EMAIL_FROM       -> Resend (EMAIL_FROM must be a verified domain)

const RESEND_TEST_SENDER = "PPIT Nanjing <onboarding@resend.dev>";

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

/** Which backend a send would use right now. */
export type EmailTransport = "gmail" | "resend" | "none";

export function emailTransport(): EmailTransport {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  if (process.env.RESEND_API_KEY) return "resend";
  return "none";
}

export function isEmailConfigured(): boolean {
  return emailTransport() !== "none";
}

// "testing" means configured but unable to reach an arbitrary applicant - the
// admin UI must say so rather than implying announcements are going out.
export type EmailSenderStatus = "off" | "testing" | "ready";

export function emailSenderStatus(): EmailSenderStatus {
  const transport = emailTransport();
  if (transport === "none") return "off";
  if (transport === "gmail") return "ready";
  const from = process.env.EMAIL_FROM?.trim();
  if (!from || /@resend\.dev>?\s*$/i.test(from)) return "testing";
  return "ready";
}

/** The address applicants will see in the From header. */
export function emailSenderAddress(): string | null {
  if (emailTransport() === "gmail") {
    const user = process.env.GMAIL_USER!.trim();
    const name = process.env.EMAIL_FROM_NAME?.trim() || "PPIT Nanjing";
    return `${name} <${user}>`;
  }
  if (emailTransport() === "resend") return process.env.EMAIL_FROM?.trim() || RESEND_TEST_SENDER;
  return null;
}

async function sendViaGmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  // Port 465 / secure:true avoids the STARTTLS upgrade, which is the more
  // reliable of the two from a serverless function.
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!.trim(),
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, ""), // Google prints app passwords in groups of 4
    },
  });
  const info = await transporter.sendMail({
    from: emailSenderAddress()!,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { ok: true, id: info.messageId ?? null };
}

async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const { data, error } = await new Resend(process.env.RESEND_API_KEY!).emails.send({
    from: process.env.EMAIL_FROM?.trim() || RESEND_TEST_SENDER,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) {
    console.error("[email] resend rejected the send:", error);
    return { ok: false, skipped: false, reason: error.message };
  }
  return { ok: true, id: data?.id ?? null };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const transport = emailTransport();
  if (transport === "none") {
    console.warn(`[email] no transport configured - skipped "${input.subject}" to ${input.to}`);
    return { ok: false, skipped: true, reason: "Pengiriman email belum diatur" };
  }
  if (!input.to.trim()) {
    return { ok: false, skipped: true, reason: "Alamat email kosong" };
  }

  try {
    return transport === "gmail" ? await sendViaGmail(input) : await sendViaResend(input);
  } catch (err) {
    // A provider outage must never take down the status update that triggered it.
    console.error(`[email] ${transport} send threw:`, err);
    return { ok: false, skipped: false, reason: err instanceof Error ? err.message : "Gagal mengirim email" };
  }
}
