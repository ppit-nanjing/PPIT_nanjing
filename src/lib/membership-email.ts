// HTML for the membership decision emails. Gmail strips <style> blocks and
// ignores most modern CSS, so everything here is inline styles on tables - the
// layout that survives Gmail, Outlook and Apple Mail alike. Keep it simple:
// one card, one heading, the message body, one optional button.

const BRAND = "#1F5C4A"; // primary container green, hardcoded: emails cannot read CSS vars
const INK = "#1B1B1B";
const MUTED = "#5A5A5A";
const LINE = "#E2E2E2";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Body text is admin-authored plain text; keep paragraph breaks, escape the rest. */
function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

export function renderMembershipEmail(input: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<tr><td style="padding:8px 0 4px;">
           <a href="${escapeHtml(input.ctaUrl)}"
              style="display:inline-block;background:${BRAND};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">
             ${escapeHtml(input.ctaLabel)}
           </a>
         </td></tr>`
      : "";

  return `<!doctype html>
<html lang="id">
<body style="margin:0;padding:0;background:#F4F4F4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#FFFFFF;border:1px solid ${LINE};border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
          <tr>
            <td style="background:${BRAND};padding:20px 28px;">
              <span style="color:#FFFFFF;font-size:15px;font-weight:600;letter-spacing:0.3px;">PPIT Nanjing</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:${INK};font-weight:600;">
                      ${escapeHtml(input.heading)}
                    </h1>
                    ${paragraphs(input.body)}
                  </td>
                </tr>
                ${cta}
              </table>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid ${LINE};padding:16px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};">
                ${escapeHtml(input.footerNote ?? "Email ini dikirim otomatis oleh sistem pendaftaran PPIT Nanjing.")}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative, required so the mail does not look like spam. */
export function renderMembershipEmailText(input: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const parts = ["PPIT Nanjing", "", input.heading, "", input.body.trim()];
  if (input.ctaLabel && input.ctaUrl) parts.push("", `${input.ctaLabel}: ${input.ctaUrl}`);
  parts.push("", "Email ini dikirim otomatis oleh sistem pendaftaran PPIT Nanjing.");
  return parts.join("\n");
}
