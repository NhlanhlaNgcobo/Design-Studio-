/* White-label: which print shop this Studio is.
 *
 * One Studio, many shops. Everything a customer sees that belongs to the shop —
 * its name, logo, colours, WhatsApp number, email, town, products, prices — comes
 * from that shop's file in studio/tenants/<id>.json, never from the code. Add a
 * shop by adding a file (see WHITE-LABEL.md); no code changes.
 *
 * Which shop, in order:
 *   1. ?tenant=<id> on the Studio URL (the embed passes this)
 *   2. <meta name="studio-tenant" content="<id>"> on the page
 *   3. the website's hostname, mapped in tenants/index.json → "hosts"
 *   4. tenants/index.json → "default"
 *
 * Loaded once, with top-level await, before anything renders: every module
 * that imports TENANT sees the finished config.
 */

import { PRODUCTS } from "./products.js";

const BASE = new URL("../tenants/", import.meta.url);
const ID = /^[a-z0-9][a-z0-9-]{1,39}$/;

async function json(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

async function pick() {
  const index = await json(new URL("index.json", BASE)).catch(() => ({ default: "eminence", hosts: {} }));
  const asked = new URLSearchParams(location.search).get("tenant")
    || document.querySelector('meta[name="studio-tenant"]')?.content
    || index.hosts?.[location.hostname];
  return ID.test(asked || "") ? asked : index.default;
}

const DEFAULTS = {
  name: "Print Studio", shortName: "Studio", tagline: "Design Studio",
  logo: null, home: "/", studioUrl: "", whatsapp: "", phoneDisplay: "", email: "",
  location: "", collectLabel: "Collect from us",
  theme: { primary: "#C4006B", accent: "#00A0E3", ink: "#14161A" },
  products: null, poweredBy: { name: "MiraiStack", url: "" },
};

async function load() {
  const id = await pick();
  let t;
  try { t = await json(new URL(`${id}.json`, BASE)); }
  catch { t = await json(new URL("eminence.json", BASE)); }
  return { ...DEFAULTS, ...t, theme: { ...DEFAULTS.theme, ...t.theme } };
}

export const TENANT = await load();

/* Only the shop's products, in the shop's order. PRODUCTS is the one shared
 * catalogue object, so pruning it here prunes it for every module. */
if (Array.isArray(TENANT.products) && TENANT.products.length) {
  const keep = TENANT.products.filter((id) => PRODUCTS[id]);
  const entries = keep.map((id) => [id, PRODUCTS[id]]);
  for (const k of Object.keys(PRODUCTS)) delete PRODUCTS[k];
  Object.assign(PRODUCTS, Object.fromEntries(entries));
}

/** "Hi Eminence", "Send to Eminence" — the name used in sentences. */
export const shop = () => TENANT.shortName || TENANT.name;
export const waLink = (text = "") => `https://wa.me/${TENANT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/* The shop's colours, as the Studio's own design tokens. */
const lighten = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(c + (255 - c) * k);
  return "#" + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("");
};
export function applyTheme(root = document.documentElement) {
  const { primary, accent, ink } = TENANT.theme;
  const set = (k, v) => v && root.style.setProperty(k, v);
  set("--magenta-ink", primary); set("--magenta", primary); set("--magenta-tint", lighten(primary, 0.9));
  set("--cyan", accent); set("--cyan-ink", accent); set("--cyan-tint", lighten(accent, 0.88));
  set("--ink", ink);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ink);
}
