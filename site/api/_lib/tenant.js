/* The shop an API call is for, read from studio/tenants/<id>.json on the server.
 *
 * The browser says which shop it is ("tenant"); the server never trusts anything
 * else about the shop from the browser. Where orders are emailed, what the
 * admin password is, and where files are stored all come from here.
 *
 *   storage   tenants/<id>/pricing.json, tenants/<id>/customers/…
 *   password  STUDIO_ADMIN_PASSWORDS = {"<id>": "<password>", …}  (JSON env var)
 *             STUDIO_ADMIN_PASSWORD  — the default shop's, if not in the map
 *   inbox     the shop file's "orderEmail", else its "email"
 */
import fs from "node:fs/promises";

const ID = /^[a-z0-9][a-z0-9-]{1,39}$/;
const DIR = new URL("../../studio/tenants/", import.meta.url);
const cache = new Map();

async function read(name) {
  return JSON.parse(await fs.readFile(new URL(name, DIR), "utf8"));
}

/** The shop for this id, or the default shop when none is given. null if unknown. */
export async function tenantFor(id) {
  const index = await read("index.json").catch(() => ({ default: "eminence" }));
  const want = id ? String(id) : index.default;
  if (!ID.test(want)) return null;
  if (!cache.has(want)) cache.set(want, read(`${want}.json`).then((t) => ({ ...t, id: want, isDefault: want === index.default })).catch(() => null));
  return cache.get(want);
}

export function adminPassword(tenant, env = process.env) {
  try {
    const map = JSON.parse(env.STUDIO_ADMIN_PASSWORDS || "{}");
    if (typeof map[tenant.id] === "string" && map[tenant.id]) return map[tenant.id];
  } catch { /* malformed map: fall through */ }
  return tenant.isDefault ? env.STUDIO_ADMIN_PASSWORD || null : null;
}

export const storagePrefix = (tenant) => `tenants/${tenant.id}`;
export const inboxOf = (tenant, env = process.env) => tenant.orderEmail || tenant.email || env.MAIL_TO;
