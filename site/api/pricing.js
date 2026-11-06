/* /api/pricing?tenant=<shop> — a shop's prices.
 *
 *   GET   → { prices, updated }   the saved prices (prices: null if none yet,
 *                                 and the Studio uses its starter set)
 *   PUT   { prices }              save; needs "Authorization: Bearer <password>"
 *         → { ok, updated }
 *
 * Each shop has its own prices and its own admin password (api/_lib/tenant.js).
 * Prices are one JSON object in the order bucket — tenants/<shop>/pricing.json —
 * so there is no database to run. Every value is checked against the shape of
 * the starter prices: a typo in the settings page can't put "abc" into a quote.
 *
 *   401 wrong password · 429 too many attempts · 400 invalid · 503 not set up
 */
import crypto from "node:crypto";
import { send, readJson, limited } from "./_lib/guard.js";
import { storageFromEnv, objectUrl } from "./_lib/s3.js";
import { DEFAULT_PRICES } from "../studio/js/pricing.js";
import { tenantFor, adminPassword, storagePrefix } from "./_lib/tenant.js";

export default async function handler(req, res) {
  const store = storageFromEnv();
  const tenant = await tenantFor(new URL(req.url, "http://x").searchParams.get("tenant"));
  if (!tenant) return send(res, 404, { error: "Unknown shop." });
  const KEY = `${storagePrefix(tenant)}/pricing.json`;
  if (req.method === "GET") {
    if (!store) return send(res, 200, { prices: null });
    const r = await fetch(objectUrl(store, KEY, "GET", 60));
    if (r.status === 404 || r.status === 403) return send(res, 200, { prices: null });
    if (!r.ok) return send(res, 502, { error: "Could not read prices." });
    return send(res, 200, await r.json());
  }
  if (req.method !== "PUT") return send(res, 405, { error: "GET or PUT" });

  const password = adminPassword(tenant);
  if (!store || !password) return send(res, 503, { error: `Price settings are not configured for ${tenant.name} yet (storage and an admin password).` });
  if (limited(req, "pricing", 30)) return send(res, 429, { error: "Too many attempts — try again in an hour." });
  const given = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = crypto.createHash("sha256").update(given).digest(), b = crypto.createHash("sha256").update(password).digest();
  if (!crypto.timingSafeEqual(a, b)) return send(res, 401, { error: "Wrong password." });

  let d;
  try { d = await readJson(req, 64 * 1024); } catch (e) { return send(res, e.status || 400, { error: "Bad request" }); }
  const problem = check(d.prices, DEFAULT_PRICES, "prices");
  if (problem) return send(res, 400, { error: problem });

  const body = JSON.stringify({ prices: d.prices, updated: new Date().toISOString() });
  const w = await fetch(objectUrl(store, KEY, "PUT", 60), { method: "PUT", body, headers: { "Content-Type": "application/json" } });
  if (!w.ok) return send(res, 502, { error: "Could not save prices." });
  return send(res, 200, { ok: true, updated: JSON.parse(body).updated });
}

/** Same shape as the starter prices: known keys, numbers where numbers go. */
export function check(v, ref, path) {
  if (ref === null) return v === null || isNum(v) ? null : `${path} must be a number or empty`;
  if (typeof ref === "number") return isNum(v) ? null : `${path} must be a number from 0 to 10 000 000`;
  if (typeof ref === "string") return typeof v === "string" && v.length <= 40 ? null : `${path} must be short text`;
  if (Array.isArray(ref)) {
    if (!Array.isArray(v) || v.length > 40) return `${path} must be a list`;
    for (let i = 0; i < v.length; i++) { const p = check(v[i], ref[Math.min(i, ref.length - 1)], `${path}[${i}]`); if (p) return p; }
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return `${path} must be a group of prices`;
  for (const k of Object.keys(v)) {
    // Tables keyed by size or quantity (fixed.rollup, paper.cards…) may gain rows.
    const template = k in ref ? ref[k] : Object.values(ref).every((x) => typeof x === "number") ? 0 : undefined;
    if (template === undefined) return `${path}.${k} is not a price setting`;
    if (k.length > 40) return `${path}: name too long`;
    const p = check(v[k], template, `${path}.${k}`); if (p) return p;
  }
  return null;
}
const isNum = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1e7;
