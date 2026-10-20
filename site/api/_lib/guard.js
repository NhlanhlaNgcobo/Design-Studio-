/* What every public endpoint needs, because the people calling them are not
 * logged in: body parsing with a size cap, a per-IP rate limit, signed tokens,
 * and file-type checks that read the file's own bytes — the extension and the
 * browser's Content-Type are both under the uploader's control.
 */
import crypto from "node:crypto";

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/** JSON body, whether or not the platform has already parsed it. */
export async function readJson(req, maxBytes = 256 * 1024) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > maxBytes) throw Object.assign(new Error("too large"), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

/* Best effort: per warm instance. Enough to stop a script hammering the form;
 * for a hard limit use a shared store (Upstash/Vercel KV) — see ops/DEPLOY.md. */
const hits = new Map();
export function limited(req, bucket, max, windowMs = 3600_000) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const k = `${bucket}:${ip}`, now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(k, list);
  if (hits.size > 5000) for (const [key, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(key);
  return list.length > max;
}

const b64u = (b) => Buffer.from(b).toString("base64url");
export function signToken(payload, secret, ttlSeconds = 3600) {
  const body = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return body + "." + crypto.createHmac("sha256", secret).update(body).digest("base64url");
}
export function readToken(token, secret) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const want = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}

/** File type from the first bytes. Returns an extension, or null if unknown. */
export function sniff(buf) {
  const b = Buffer.from(buf);
  const starts = (sig) => sig.every((v, i) => b[i] === v);
  if (starts([0x89, 0x50, 0x4e, 0x47])) return "png";
  if (starts([0xff, 0xd8, 0xff])) return "jpg";
  if (starts([0x47, 0x49, 0x46, 0x38])) return "gif";
  if (starts([0x52, 0x49, 0x46, 0x46]) && b.slice(8, 12).toString() === "WEBP") return "webp";
  if (b.slice(0, 5).toString() === "%PDF-") return "pdf";                 // also modern .ai files
  if (b.slice(0, 4).toString() === "%!PS" || starts([0xc5, 0xd0, 0xd3, 0xc6])) return "eps";
  const head = b.toString("utf8").replace(/^﻿/, "").trimStart();
  if (/^(<\?xml|<svg|<!DOCTYPE svg)/i.test(head)) return "svg";
  if (head.startsWith("{")) return "json";
  return null;
}

/* What each extension may really be. An .ai is a PDF or PostScript inside. */
export const ACCEPTS = {
  png: ["png"], jpg: ["jpg"], jpeg: ["jpg"], gif: ["gif"], webp: ["webp"], svg: ["svg"],
  pdf: ["pdf"], ai: ["pdf", "eps"], eps: ["eps"], json: ["json"],
};

export const safeName = (n) => String(n || "file").normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").slice(-80) || "file";
export const ext = (n) => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";
export const clean = (s, max = 2000) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
export const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
