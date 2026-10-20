/* POST /api/contact — the website enquiry form.
 *
 * Replaces a form that waited a second, said "Message Sent!" and discarded the
 * message. This one either delivers it or says it didn't — the page then
 * offers WhatsApp with the message already typed.
 *
 *   200 sent · 400 missing fields · 429 too many · 503 email not set up · 502 email failed
 */
import { send, readJson, limited, clean, escHtml } from "./_lib/guard.js";
import { sendMail, mailConfigured } from "./_lib/mail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  if (!mailConfigured()) return send(res, 503, { error: "Email is not configured yet." });
  if (limited(req, "contact", 8)) return send(res, 429, { error: "Too many messages from here — please WhatsApp us." });

  let d;
  try { d = await readJson(req, 32 * 1024); } catch (e) { return send(res, e.status || 400, { error: "Bad request" }); }

  // Honeypot: a field people never see. Bots fill it; pretend success.
  if (d.company_site) return send(res, 200, { ok: true });

  const name = clean(d.name, 120), phone = clean(d.phone, 40), email = clean(d.email, 160);
  const topic = clean(d.topic, 60), message = clean(d.message, 4000);
  if (!name || !phone || !message) return send(res, 400, { error: "Name, phone and message are required." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "That email address doesn't look right." });

  const digits = phone.replace(/\D/g, "").replace(/^0/, "27");
  const html = `
    <h2 style="font-family:Arial,sans-serif">Website enquiry — ${escHtml(topic || "General")}</h2>
    <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Name</td><td><b>${escHtml(name)}</b></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Phone</td><td>${escHtml(phone)} — <a href="https://wa.me/${digits}">reply on WhatsApp</a></td></tr>
      ${email ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td>${escHtml(email)}</td></tr>` : ""}
    </table>
    <p style="font-family:Arial,sans-serif;font-size:15px;white-space:pre-wrap;border-left:3px solid #E5007E;padding-left:12px">${escHtml(message)}</p>`;
  try {
    await sendMail({
      subject: `Enquiry: ${topic || "General"} — ${name}`,
      html, text: `${name} (${phone}${email ? ", " + email : ""})\n${topic}\n\n${message}`,
      replyTo: email || undefined,
    });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    return send(res, 502, { error: "Email failed." });
  }
}
