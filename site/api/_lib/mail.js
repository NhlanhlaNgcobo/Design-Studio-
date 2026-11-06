/* Email through Resend's HTTP API — one fetch, no SDK.
 *
 * `to` and `fromName` come from the shop (api/_lib/tenant.js) for Studio orders.
 * MAIL_TO is the fallback inbox — eminenceprinting@gmail.com for Eminence's own
 * website form; its hello@ address cannot receive mail (no MX — audit/AUDIT.md).
 *
 * MAIL_FROM's address must be on a domain verified in Resend; the display name
 * is replaced by the shop's name, so every shop's orders arrive as its own.
 */
export function mailConfigured(env = process.env) {
  return !!env.RESEND_API_KEY;
}

export async function sendMail({ subject, html, text, replyTo, attachments, to, fromName }, env = process.env) {
  const fromRaw = env.MAIL_FROM || "Studio <onboarding@resend.dev>";
  const address = (fromRaw.match(/<([^>]+)>/) || [, fromRaw])[1];
  const from = fromName ? `${fromName.replace(/[<>"\r\n]/g, "")} <${address}>` : fromRaw;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: String(to || env.MAIL_TO || "eminenceprinting@gmail.com").split(",").map((s) => s.trim()),
      subject, html, text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments ? { attachments } : {}),
    }),
  });
  if (!r.ok) throw Object.assign(new Error(`mail ${r.status}: ${await r.text()}`), { status: 502 });
  return r.json();
}
