/* Card templates: a whole business card or welcome card from "your details".
 *
 * How Vistaprint, Moo and Canva do it, and what a customer without a designer
 * needs: pick a layout, type your name and number once, and get a front and a
 * back that are already print-ready — inside the safe line, background to the
 * bleed, a QR code that scans. Everything a template makes is ordinary layers
 * (text, shape, QR, the customer's logo), so it can then be edited freely.
 *
 * Text layers made from a detail carry `field`; editing that detail rewrites
 * them and keeps their left (or right) edge where the layout put it.
 *
 * Positions are mm from the centre of the trim, as everywhere in the Studio.
 */

import { TENANT } from "./tenant.js";

export const FIELDS = {
  card: [
    ["name", "Name", "Thandi Mkhize"],
    ["title", "Job title", "Managing Director"],
    ["company", "Business name", "Mkhize Plumbing"],
    ["phone", "Phone", "078 123 4567"],
    ["email", "Email", "thandi@mkhizeplumbing.co.za"],
    ["website", "Website", "www.mkhizeplumbing.co.za"],
    ["address", "Address", `12 Main Road${TENANT.location ? ", " + TENANT.location : ""}`],
  ],
  welcome: [
    ["heading", "Heading", "Welcome"],
    ["message", "Message", "We're so glad you're here.\nMake yourself at home."],
    ["host", "Your business", "Ngcobo Guesthouse"],
    ["wifi", "Wi-Fi network", "Ngcobo-Guest"],
    ["password", "Wi-Fi password", "welcome2026"],
    ["phone", "Phone / WhatsApp", "082 123 4567"],
    ["website", "Website or link", "www.ngcoboguesthouse.co.za"],
  ],
};

/* Small builders. `a` is the area: { w, h, bleed, safe }. */
const text = (field, o) => ({ kind: "text", field, text: "", font: "Montserrat", weight: 800, italic: false, colour: "#14161A",
  size: 3, align: "left", spacing: 0, arc: 0, outline: 0, outlineColour: "#FFFFFF", rot: 0, x: 0, y: 0, ...o });
const plain = (t, o) => ({ ...text(null, o), text: t });
const rect = (x, y, w, h, fill, o = {}) => ({ kind: "shape", shape: "rect", radius: 0, fill, x, y, w, ar: h / w, rot: 0, ...o });
const bg = (a, fill) => rect(0, 0, a.w + a.bleed * 2, a.h + a.bleed * 2, fill, { background: true });
const qr = (x, y, w, colour = "#14161A") => ({ kind: "qr", field: "website", data: "", x, y, w, colour, bg: null, rot: 0 });
/** The customer's logo if they've uploaded one, else their business name as a wordmark. */
const logo = (box, ctx, colour, font = "Montserrat") => ctx.logo
  ? { kind: "image", assetId: ctx.logo.id, x: box.x, y: box.y, w: Math.min(box.w, box.h * ctx.logo.aspect), rot: 0 }
  : text(ctx.fieldOf === "welcome" ? "host" : "company", { anchor: "center", ax: box.x, y: box.y, size: Math.min(box.h * 0.42, 5.2), font, weight: 900, colour, align: "center" });

/* ───────────────────────────── business cards ───────────────────────────── */
const CARD = [
  {
    id: "classic", name: "Classic",
    make: (a, c, ctx) => {
      const L = -a.w / 2 + a.safe + 1, R = a.w / 2 - a.safe - 1, T = -a.h / 2 + a.safe + 1;
      return {
        front: [bg(a, "#FFFFFF"), logo({ x: 0, y: -2, w: a.w * 0.6, h: a.h * 0.42 }, ctx, c.brand),
          rect(0, a.h / 2 - 1.2, a.w + a.bleed * 2, 2.4 + a.bleed * 2, c.brand)],
        back: [bg(a, "#FFFFFF"),
          text("name", { anchor: "left", ax: L, y: T + 3, size: 4.2, colour: c.ink }),
          text("title", { anchor: "left", ax: L, y: T + 8, size: 2.5, weight: 500, colour: c.brand }),
          text("phone", { anchor: "left", ax: L, y: 6, size: 2.4, weight: 500, colour: c.ink }),
          text("email", { anchor: "left", ax: L, y: 10, size: 2.4, weight: 500, colour: c.ink }),
          text("website", { anchor: "left", ax: L, y: 14, size: 2.4, weight: 500, colour: c.ink }),
          rect(L + 12, T + 11.5, 24, 0.5, c.brand),
          qr(R - 9, 8, 18, c.ink)],
      };
    },
  },
  {
    id: "bold", name: "Bold colour",
    make: (a, c, ctx) => {
      const L = -a.w / 2 + a.safe + 1;
      return {
        front: [bg(a, c.brand), logo({ x: 0, y: 0, w: a.w * 0.62, h: a.h * 0.46 }, ctx, "#FFFFFF")],
        back: [bg(a, "#FFFFFF"), rect(a.w / 2 - 11 + a.bleed / 2, 0, 22 + a.bleed, a.h + a.bleed * 2, c.brand),
          qr(a.w / 2 - 11, 0, 18, "#FFFFFF"),
          text("name", { anchor: "left", ax: L, y: -13, size: 4.4, colour: c.ink }),
          text("title", { anchor: "left", ax: L, y: -8, size: 2.5, weight: 500, colour: c.brand }),
          text("phone", { anchor: "left", ax: L, y: 3, size: 2.4, weight: 500, colour: c.ink }),
          text("email", { anchor: "left", ax: L, y: 7.5, size: 2.4, weight: 500, colour: c.ink }),
          text("address", { anchor: "left", ax: L, y: 12, size: 2.4, weight: 500, colour: c.ink })],
      };
    },
  },
  {
    id: "split", name: "Split",
    make: (a, c, ctx) => {
      const half = a.w * 0.38, M = -a.w / 2 + half + 4;
      return {
        front: [bg(a, "#FFFFFF"), rect(-a.w / 2 + half / 2 - a.bleed / 2, 0, half + a.bleed, a.h + a.bleed * 2, c.brand),
          logo({ x: -a.w / 2 + half / 2, y: 0, w: half - 8, h: a.h * 0.5 }, ctx, "#FFFFFF"),
          text("name", { anchor: "left", ax: M, y: -12, size: 3.6, colour: c.ink }),
          text("title", { anchor: "left", ax: M, y: -7.5, size: 2.3, weight: 500, colour: c.brand }),
          text("phone", { anchor: "left", ax: M, y: 2, size: 2.2, weight: 500, colour: c.ink }),
          text("email", { anchor: "left", ax: M, y: 6, size: 2.2, weight: 500, colour: c.ink }),
          text("website", { anchor: "left", ax: M, y: 10, size: 2.2, weight: 500, colour: c.ink }),
          text("address", { anchor: "left", ax: M, y: 14, size: 2.2, weight: 500, colour: c.ink })],
        back: [bg(a, c.brand), logo({ x: 0, y: 0, w: a.w * 0.55, h: a.h * 0.42 }, ctx, "#FFFFFF")],
      };
    },
  },
  {
    id: "minimal", name: "Minimal",
    make: (a, c, ctx) => ({
      front: [bg(a, "#FFFFFF"),
        text("name", { anchor: "center", ax: 0, y: -4, size: 5, weight: 600, colour: c.ink, align: "center", font: "Playfair Display", spacing: 0.02 }),
        rect(0, 1.5, 14, 0.4, c.brand),
        text("title", { anchor: "center", ax: 0, y: 6, size: 2.4, weight: 500, colour: c.ink, align: "center", spacing: 0.18 })],
      back: [bg(a, "#F4F1EA"),
        logo({ x: -a.w / 4 + 2, y: -9, w: a.w * 0.38, h: 12 }, ctx, c.ink, "Playfair Display"),
        text("phone", { anchor: "left", ax: -a.w / 2 + a.safe + 2, y: 5, size: 2.3, weight: 500, colour: c.ink }),
        text("email", { anchor: "left", ax: -a.w / 2 + a.safe + 2, y: 9.5, size: 2.3, weight: 500, colour: c.ink }),
        text("website", { anchor: "left", ax: -a.w / 2 + a.safe + 2, y: 14, size: 2.3, weight: 500, colour: c.ink }),
        qr(a.w / 2 - a.safe - 9, 4, 18, c.ink)],
    }),
  },
  {
    id: "night", name: "Night",
    make: (a, c, ctx) => {
      const L = -a.w / 2 + a.safe + 1;
      return {
        front: [bg(a, "#14161A"), logo({ x: 0, y: -3, w: a.w * 0.58, h: a.h * 0.42 }, ctx, "#FFFFFF"),
          rect(0, 13, 18, 0.6, c.brand),
          text("website", { anchor: "center", ax: 0, y: 17, size: 2.2, weight: 500, colour: "#FFFFFF", align: "center", spacing: 0.08 })],
        back: [bg(a, "#14161A"), rect(-a.w / 2 + 0.6 - a.bleed / 2, 0, 1.2 + a.bleed, a.h + a.bleed * 2, c.brand),
          text("name", { anchor: "left", ax: L + 1, y: -13, size: 4.2, colour: "#FFFFFF" }),
          text("title", { anchor: "left", ax: L + 1, y: -8.5, size: 2.4, weight: 500, colour: c.brand }),
          text("phone", { anchor: "left", ax: L + 1, y: 3, size: 2.4, weight: 500, colour: "#FFFFFF" }),
          text("email", { anchor: "left", ax: L + 1, y: 7.5, size: 2.4, weight: 500, colour: "#FFFFFF" }),
          text("address", { anchor: "left", ax: L + 1, y: 12, size: 2.4, weight: 500, colour: "#FFFFFF" }),
          qr(a.w / 2 - a.safe - 9, 6, 18, "#FFFFFF")],
      };
    },
  },
];

/* ───────────────────────────── welcome cards ─────────────────────────────
 * Sized from the area, so the same layout fits A6, DL, A5 or a square. */
const WELCOME = [
  {
    id: "guesthouse", name: "Guesthouse",
    make: (a, c, ctx) => {
      const u = Math.min(a.w, a.h) / 105;            // 1 at A6 width
      const top = -a.h / 2 + a.safe;
      return {
        front: [bg(a, "#FBF8F2"),
          logo({ x: 0, y: top + 12 * u, w: a.w * 0.5, h: 14 * u }, ctx, c.brand),
          text("heading", { anchor: "center", ax: 0, y: top + 36 * u, size: 15 * u, font: "Great Vibes", weight: 400, colour: c.brand, align: "center" }),
          text("message", { anchor: "center", ax: 0, y: top + 56 * u, size: 3.6 * u, weight: 500, colour: c.ink, align: "center" }),
          rect(0, top + 82 * u, a.w - a.safe * 2 - 8 * u, 22 * u, "#FFFFFF", { radius: 3 * u }),
          plain("WI-FI", { anchor: "center", ax: 0, y: top + 75 * u, size: 2.6 * u, weight: 800, colour: c.brand, align: "center", spacing: 0.25 }),
          text("wifi", { anchor: "center", ax: 0, y: top + 81 * u, size: 3.8 * u, weight: 700, colour: c.ink, align: "center" }),
          text("password", { anchor: "center", ax: 0, y: top + 87.5 * u, size: 3.4 * u, weight: 500, colour: c.ink, align: "center", font: "JetBrains Mono" }),
          text("phone", { anchor: "center", ax: 0, y: a.h / 2 - a.safe - 6 * u, size: 3 * u, weight: 600, colour: c.ink, align: "center" })],
        back: [bg(a, c.brand),
          qr(0, -6 * u, 34 * u, "#FFFFFF"),
          plain("Scan for our guest guide", { anchor: "center", ax: 0, y: 18 * u, size: 3.6 * u, weight: 700, colour: "#FFFFFF", align: "center" }),
          text("host", { anchor: "center", ax: 0, y: a.h / 2 - a.safe - 8 * u, size: 4 * u, weight: 800, colour: "#FFFFFF", align: "center" })],
      };
    },
  },
  {
    id: "thanks", name: "Thank you insert",
    make: (a, c, ctx) => {
      const u = Math.min(a.w, a.h) / 105, top = -a.h / 2 + a.safe;
      return {
        front: [bg(a, c.brand),
          logo({ x: 0, y: top + 14 * u, w: a.w * 0.5, h: 14 * u }, ctx, "#FFFFFF"),
          text("heading", { anchor: "center", ax: 0, y: -4 * u, size: 13 * u, font: "Shrikhand", weight: 400, colour: "#FFFFFF", align: "center" }),
          text("message", { anchor: "center", ax: 0, y: 16 * u, size: 3.6 * u, weight: 600, colour: "#FFFFFF", align: "center" }),
          text("website", { anchor: "center", ax: 0, y: a.h / 2 - a.safe - 6 * u, size: 3 * u, weight: 600, colour: "#FFFFFF", align: "center" })],
        back: [bg(a, "#FFFFFF"),
          text("host", { anchor: "center", ax: 0, y: top + 12 * u, size: 4.6 * u, weight: 900, colour: c.brand, align: "center" }),
          qr(0, 6 * u, 30 * u, c.ink),
          text("phone", { anchor: "center", ax: 0, y: a.h / 2 - a.safe - 6 * u, size: 3 * u, weight: 600, colour: c.ink, align: "center" })],
      };
    },
  },
];

export const TEMPLATES = { card: CARD, welcome: WELCOME };

/**
 * Lay out a template. `measure(layer)` → { w, h } (fonts must be loaded), so
 * left/right-anchored text sits exactly on its margin.
 * @returns {{front: object[], back: object[]}} layers without ids
 */
export function buildTemplate(tpl, area, colours, ctx, details, measure) {
  const out = tpl.make(area, colours, ctx);
  for (const side of Object.values(out)) {
    for (let i = side.length - 1; i >= 0; i--) {
      const l = side[i];
      if (l.field && l.kind === "text") l.text = details[l.field] ?? "";
      if (l.field && l.kind === "qr") l.data = qrData(details);
      if (l.kind === "text" && !String(l.text).trim()) { side.splice(i, 1); continue; }
      if (l.kind === "text") anchor(l, measure);
    }
  }
  return out;
}

/** Re-place anchored text after its words change, keeping its margin. */
export function anchor(l, measure) {
  if (!l.anchor) return;
  const { w } = measure(l);
  l.x = l.anchor === "left" ? l.ax + w / 2 : l.anchor === "right" ? l.ax - w / 2 : l.ax;
}

/** What a template's QR code points at: the website, else a WhatsApp chat. */
export function qrData(d) {
  if (d.website?.trim()) return /^https?:\/\//i.test(d.website) ? d.website.trim() : `https://${d.website.trim()}`;
  const n = String(d.phone || "").replace(/\D/g, "").replace(/^0/, "27");
  return n ? `https://wa.me/${n}` : TENANT.home;
}
