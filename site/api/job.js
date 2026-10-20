/* POST /api/job — a Design Studio order, in two steps.
 *
 *  start     { step:"start", ref, spec, files:[{id,name,type,size,role}] }
 *            → { uploads: { id: { url, headers } }, token }
 *            Presigned PUT URLs, 15 minutes, one per file. The browser uploads
 *            straight to storage (functions cap bodies at 4.5 MB; artwork
 *            doesn't). The spec is written by the server, not uploaded.
 *
 *  complete  { step:"complete", ref, token, customer }
 *            → { proofUrl }
 *            Checks every object actually arrived, is within its size limit
 *            and IS what its name says (first bytes, not the extension), then
 *            emails Eminence the job with 7-day download links.
 *
 * Nothing about the job is trusted from the second call except the token,
 * which is an HMAC over the keys issued in the first.
 *
 *   503 storage/email not set up — the Studio then falls back to WhatsApp +
 *       downloaded proof, so a missing config never loses an order.
 */
import crypto from "node:crypto";
import { send, readJson, limited, signToken, readToken, sniff, ACCEPTS, safeName, ext, clean, escHtml } from "./_lib/guard.js";
import { storageFromEnv, objectUrl } from "./_lib/s3.js";
import { sendMail, mailConfigured } from "./_lib/mail.js";

const LIMITS = { artwork: 40 * 1024 * 1024, proof: 12 * 1024 * 1024, spec: 1024 * 1024 };
const MAX_FILES = 12;
const REF = /^EP-\d{6}-[A-Z2-9]{3}$/;
const WEEK = 7 * 24 * 3600;

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  const store = storageFromEnv();
  const secret = process.env.JOB_SECRET;
  if (!store || !secret || !mailConfigured()) return send(res, 503, { error: "Uploads are not configured yet." });

  let d;
  try { d = await readJson(req, 512 * 1024); } catch (e) { return send(res, e.status || 400, { error: "Bad request" }); }
  if (!REF.test(d.ref || "")) return send(res, 400, { error: "Bad job reference." });

  try {
    if (d.step === "start") return await start(d, req, res, store, secret);
    if (d.step === "complete") return await complete(d, req, res, store, secret);
    return send(res, 400, { error: "Unknown step." });
  } catch (e) {
    console.error(e);
    return send(res, e.status || 500, { error: "Something went wrong with the upload." });
  }
}

async function start(d, req, res, store, secret) {
  if (limited(req, "job-start", 10)) return send(res, 429, { error: "Too many uploads from here — please WhatsApp us." });
  const files = Array.isArray(d.files) ? d.files : [];
  if (!files.length || files.length > MAX_FILES) return send(res, 400, { error: "Wrong number of files." });

  // A folder per job with an unguessable suffix: customer artwork is somebody's
  // brand asset, and must not be findable by guessing a job number.
  const folder = `jobs/${d.ref}-${crypto.randomBytes(9).toString("base64url")}`;
  const uploads = {}, keys = [];
  for (const f of files) {
    const role = ["artwork", "proof", "spec"].includes(f.role) ? f.role : null;
    const e = ext(f.name);
    if (!role || !ACCEPTS[e] || !(f.size > 0) || f.size > LIMITS[role])
      return send(res, 400, { error: `${clean(f.name, 80)} can't be uploaded (type or size).` });
    if (role === "spec") continue;                       // the server writes the spec itself
    const key = `${folder}/${role}/${String(keys.length).padStart(2, "0")}-${safeName(f.name)}`;
    keys.push({ key, role, name: safeName(f.name), size: f.size, ext: e });
    uploads[String(f.id).slice(0, 12)] = { url: objectUrl(store, key, "PUT", 900), headers: {} };
  }

  // The spec, from the request body — capped, and stored as data, never rendered.
  const specText = JSON.stringify(d.spec ?? {}, null, 2);
  if (specText.length > LIMITS.spec) return send(res, 400, { error: "Spec too large." });
  const specKey = `${folder}/spec.json`;
  const put = await fetch(objectUrl(store, specKey, "PUT", 300), { method: "PUT", body: specText, headers: { "Content-Type": "application/json" } });
  if (!put.ok) throw Object.assign(new Error(`spec put ${put.status}`), { status: 502 });

  const token = signToken({ ref: d.ref, folder, keys, specKey }, secret, 3600);
  return send(res, 200, { uploads, token });
}

async function complete(d, req, res, store, secret) {
  const t = readToken(d.token, secret);
  if (!t || t.ref !== d.ref) return send(res, 403, { error: "Upload session expired — please send again." });

  // Verify each object: present, within its limit, and really the type it claims.
  const checked = [];
  for (const k of t.keys) {
    const head = await fetch(objectUrl(store, k.key, "GET", 120), { headers: { Range: "bytes=0-63" } });
    if (!head.ok && head.status !== 206) return send(res, 400, { error: `${k.name} didn't arrive — please try again.` });
    const total = Number((head.headers.get("content-range") || "").split("/")[1] || head.headers.get("content-length") || 0);
    const bytes = Buffer.from(await head.arrayBuffer());
    const real = sniff(bytes);
    const ok = total <= LIMITS[k.role] && real && ACCEPTS[k.ext]?.includes(real);
    if (!ok) {
      await fetch(objectUrl(store, k.key, "DELETE", 120), { method: "DELETE" }).catch(() => {});
      return send(res, 400, { error: `${k.name} isn't a file type we accept.` });
    }
    checked.push({ ...k, total, url: objectUrl(store, k.key, "GET", WEEK) });
  }

  const specRes = await fetch(objectUrl(store, t.specKey, "GET", 120));
  const spec = specRes.ok ? await specRes.json().catch(() => ({})) : {};
  const c = d.customer || spec.customer || {};
  const proof = checked.find((k) => k.role === "proof");
  const art = checked.filter((k) => k.role === "artwork");
  const specUrl = objectUrl(store, t.specKey, "GET", WEEK);
  const digits = clean(c.phone, 40).replace(/\D/g, "").replace(/^0/, "27");
  const q = spec.quote || {};
  const rand = (n) => "R" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ").replace(/\.00$/, "");
  const price = q.range_incl_vat ? `${rand(q.range_incl_vat[0])} – ${rand(q.range_incl_vat[1])} indicative` : q.total ? `${rand(q.total)} incl. VAT (Studio estimate)` : "—";
  const size = (n) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

  const row = (k, v) => v ? `<tr><td style="padding:4px 14px 4px 0;color:#666;vertical-align:top">${k}</td><td>${v}</td></tr>` : "";
  const html = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#14161A">
    <h2 style="margin:0 0 4px">Studio job ${escHtml(t.ref)}</h2>
    <p style="margin:0 0 16px;color:#666">${escHtml(spec.quantity)} × ${escHtml(spec.product_name)} · ${escHtml(spec.colour)} · ${escHtml(spec.process)}</p>
    ${proof ? `<p><a href="${proof.url}"><img src="${proof.url}" alt="Proof" width="600" style="max-width:100%;border:1px solid #ddd"></a></p>` : ""}
    <table style="border-collapse:collapse">
      ${row("Customer", `<b>${escHtml(clean(c.name, 120))}</b>${c.company ? " — " + escHtml(clean(c.company, 120)) : ""}`)}
      ${row("WhatsApp", `${escHtml(clean(c.phone, 40))} — <a href="https://wa.me/${digits}">open chat</a>`)}
      ${row("Email", escHtml(clean(c.email, 160)))}
      ${row("Delivery", escHtml(clean(c.delivery, 300)))}
      ${row("Needed by", escHtml(clean(c.needBy, 20)))}
      ${row("Notes", escHtml(clean(c.notes, 2000)))}
      ${row("Sizes", spec.size_breakdown ? escHtml(Object.entries(spec.size_breakdown).filter(([, n]) => +n > 0).map(([s, n]) => `${s}×${n}`).join(", ")) : escHtml(spec.size))}
      ${row("Price", escHtml(price))}
    </table>
    <h3 style="margin:20px 0 6px">Files — links work for 7 days</h3>
    <ul>
      ${art.map((k) => `<li><a href="${k.url}">${escHtml(k.name)}</a> (${size(k.total)}) — customer's original</li>`).join("")}
      ${proof ? `<li><a href="${proof.url}">Proof sheet</a></li>` : ""}
      <li><a href="${specUrl}">Placement spec (JSON, millimetres)</a></li>
    </ul>
    <p style="color:#666;font-size:12px">Print from the originals, not the proof. The proof shows placement and size only.</p>
  </div>`;

  await sendMail({ subject: `Studio job ${t.ref} — ${clean(spec.product_name, 60)} × ${spec.quantity} — ${clean(c.name, 60)}`, html,
    text: `Studio job ${t.ref}\n${clean(c.name)} ${clean(c.phone)}\nProof: ${proof?.url || "-"}\nSpec: ${specUrl}`,
    replyTo: c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ? c.email : undefined });

  return send(res, 200, { ok: true, proofUrl: proof?.url ?? null });
}
