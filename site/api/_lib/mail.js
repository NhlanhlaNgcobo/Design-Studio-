/* Email through Resend's HTTP API — one fetch, no SDK.
 *
 * MAIL_TO defaults to eminenceprinting@gmail.com, the address on Eminence's
 * own Facebook page. The website's hello@eminenceprinting.co.za cannot receive
 * mail at all (the domain has no MX record — audit/AUDIT.md).
 *
 * MAIL_FROM must be on a domain verified in Resend. Until eminenceprinting.co.za
 * is verified, "Eminence Studio <onboarding@resend.dev>" works for testing.
 */
export function mailConfigured(env = process.env) {
  return !!env.RESEND_API_KEY;
}

export async function sendMail({ subject, html, text, replyTo, attachments }, env = process.env) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM || "Eminence website <onboarding@resend.dev>",
      to: (env.MAIL_TO || "eminenceprinting@gmail.com").split(",").map((s) => s.trim()),
      subject, html, text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments ? { attachments } : {}),
    }),
  });
  if (!r.ok) throw Object.assign(new Error(`mail ${r.status}: ${await r.text()}`), { status: 502 });
  return r.json();
}
