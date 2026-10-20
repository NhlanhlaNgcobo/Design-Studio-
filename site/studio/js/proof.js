/* The proof sheet and the production spec.
 *
 * DesignCo's export was a picture of the mockup. This is the document a print
 * shop actually works from, generated in the browser:
 *
 *   PROOF (PNG)  — mockup of every side that carries a design, each print area
 *                  flat with its real size, a placement table, the DPI verdicts,
 *                  the ink count, the quote and a job reference. It is what the
 *                  customer forwards for sign-off and what Eminence checks the
 *                  job against.
 *   SPEC (JSON)  — the same placements as numbers, in millimetres from the
 *                  top-left of each print area. A percentage is meaningless once
 *                  the file leaves the browser; a millimetre is an instruction.
 *
 * Neither is a print file. Production prints from the customer's ORIGINAL
 * uploads, which travel with the order untouched.
 */

import { PROCESSES, surfaceSize, effectiveDpi, dpiVerdict } from "./products.js";
import { layerSize, composeSurface, designBounds } from "./compose.js";
import { snapshotMockup, viewsWithDesign } from "./render/index.js";
import { rand, rand2 } from "./pricing.js";

export function jobRef() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
  return `EP-${ymd}-${rnd}`;
}

/** Placements as production numbers. */
export function buildSpec(m) {
  const { product, size, state, assets, quote, ref } = m;
  const surfaces = product.surfaces.filter((s) => state.designs[s.id]?.length).map((s) => {
    const area = surfaceSize(product, size, s);
    const b = designBounds(state.designs[s.id], assets, area);
    return {
      surface: s.id, label: s.label,
      print_area_mm: [Math.round(area.w), Math.round(area.h)],
      bleed_mm: s.bleedMm || 0,
      design_bounds_mm: b && { left: r1(b.x0 + area.w / 2), top: r1(b.y0 + area.h / 2), width: r1(b.w), height: r1(b.h) },
      layers: state.designs[s.id].map((l) => {
        const sz = layerSize(l, assets);
        const base = {
          kind: l.kind,
          centre_from_top_left_mm: [r1(l.x + area.w / 2), r1(l.y + area.h / 2)],
          size_mm: [r1(sz.w), r1(sz.h)], rotation_deg: Math.round(l.rot),
        };
        if (l.kind === "text") return { ...base, text: l.text, font: l.font, weight: l.weight, italic: l.italic, colour: l.colour, font_size_mm: r1(l.size), outline_mm: l.outline, outline_colour: l.outline ? l.outlineColour : null, arc_deg: l.arc };
        const a = assets.get(l.assetId);
        const dpi = a?.vector ? null : effectiveDpi(a?.natW, sz.w);
        return { ...base, file: a?.name, file_px: a?.vector ? null : [a?.natW, a?.natH], vector: !!a?.vector, effective_dpi: dpi,
          verdict: a?.vector ? "vector" : dpiVerdict(dpi, product.minDpi).label.toLowerCase(),
          background_removed: !!a?.bgRemoved, ink_colours: a?.colours.map((c) => c.hex) };
      }),
    };
  });
  return {
    ref, created: new Date().toISOString(),
    product: m.productId, product_name: product.name,
    size: size.label, colour: m.colourName, colour_hex: state.colour, process: PROCESSES[state.process].label,
    stock: state.stock ?? null, options: state.options,
    quantity: quote.units, size_breakdown: product.sizeBreakdown ? state.breakdown : null,
    min_dpi: product.minDpi, surfaces,
    quote: quote.quoteOnly ? { range_incl_vat: quote.range.map(Math.round), confirmed: quote.confirmed }
      : { lines: quote.lines, subtotal: quote.subtotal, vat: quote.vat, total: quote.total, confirmed: quote.confirmed },
    customer: m.customer ?? null,
  };
}
const r1 = (n) => Math.round(n * 10) / 10;

/* ─────────────────────────── the proof sheet ─────────────────────────── */

const INK = "#14161A", MUTED = "#5B5F66", LINE = "#D9D5CC", PAPER = "#FAF8F4", CYAN = "#0093D0", MAG = "#E5007E", YEL = "#FFE500";
const W = 2000, H = 1414;   // A-series proportion

export async function renderProof(m, dataTex) {
  const { product, size, state, assets, quote, spec } = m;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  await document.fonts.ready;

  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);

  // ── header ──
  g.fillStyle = INK; g.fillRect(0, 0, W, 120);
  [CYAN, MAG, YEL, "#FFFFFF"].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(70 + i * 30, 60, 11, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = "#fff"; g.font = "800 40px Archivo, sans-serif"; g.textBaseline = "middle";
  g.fillText("Eminence Printing", 200, 52);
  g.font = "500 22px 'JetBrains Mono', monospace"; g.fillStyle = "rgba(255,255,255,.7)";
  g.fillText("DESIGN PROOF  ·  078 935 6433  ·  eminenceprinting@gmail.com", 200, 88);
  g.textAlign = "right"; g.fillStyle = "#fff"; g.font = "700 34px 'JetBrains Mono', monospace";
  g.fillText(spec.ref, W - 60, 50);
  g.font = "500 20px 'JetBrains Mono', monospace"; g.fillStyle = "rgba(255,255,255,.7)";
  g.fillText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), W - 60, 88);
  g.textAlign = "left";

  // ── mockups ──
  const designed = new Set(Object.keys(state.designs).filter((k) => state.designs[k]?.length));
  const views = viewsWithDesign(product, designed).slice(0, 2);
  const mockW = views.length > 1 ? 540 : 1100, mockH = 760, mx = 60, my = 160;
  for (let i = 0; i < views.length; i++) {
    const v = views[i];
    const ctx = { ...m.renderCtx, tex: dataTex, active: null, view: v };
    const shot = await snapshotMockup(ctx, v, mockW * 2, mockH * 2).catch(() => null);
    const x = mx + i * (mockW + 20);
    g.fillStyle = "#FFFFFF"; g.fillRect(x, my, mockW, mockH);
    if (shot) g.drawImage(shot, x, my, mockW, mockH);
    g.strokeStyle = LINE; g.lineWidth = 2; g.strokeRect(x, my, mockW, mockH);
    tag(g, viewLabel(v), x + 16, my + 16);
  }

  // ── flat print areas ──
  let fx = mx, fy = my + mockH + 40;
  const flatH = 260;
  g.font = "700 20px Archivo, sans-serif"; g.fillStyle = INK;
  g.fillText("PRINT AREAS — TRUE PROPORTION", fx, fy - 4);
  fy += 20;
  for (const s of product.surfaces.filter((x) => designed.has(x.id)).slice(0, 4)) {
    const area = surfaceSize(product, size, s);
    const k = Math.min(flatH / area.h, 300 / area.w);
    const fw = area.w * k, fh = area.h * k;
    g.fillStyle = state.colour; g.fillRect(fx, fy + 24, fw, fh);
    g.drawImage(composeSurface(state.designs[s.id], assets, area, 900), fx, fy + 24, fw, fh);
    g.strokeStyle = MUTED; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.strokeRect(fx, fy + 24, fw, fh); g.setLineDash([]);
    g.font = "600 17px Archivo, sans-serif"; g.fillStyle = INK; g.fillText(s.label, fx, fy + 10);
    g.font = "500 15px 'JetBrains Mono', monospace"; g.fillStyle = MUTED;
    g.fillText(`${Math.round(area.w)} × ${Math.round(area.h)} mm`, fx, fy + 24 + fh + 20);
    fx += Math.max(fw, 170) + 36;
    if (fx > 1100) break;
  }

  // ── spec column ──
  const sx = 1220, sw = W - sx - 60;
  let y = 170;
  g.fillStyle = INK; g.font = "800 46px Archivo, sans-serif";
  y = wrap(g, product.name, sx, y + 24, sw, 52) - 44;
  g.font = "500 22px Archivo, sans-serif"; g.fillStyle = MUTED;
  const qty = product.sizeBreakdown
    ? Object.entries(state.breakdown).filter(([, n]) => +n > 0).map(([s, n]) => `${s}×${n}`).join("  ") || "—"
    : String(quote.units);
  const facts = [
    ["Size", size.label], ["Colour", m.colourName], ["Process", PROCESSES[state.process].label],
    ...(state.stock ? [["Stock", state.stock]] : []),
    ["Quantity", `${quote.units}${product.sizeBreakdown ? "  (" + qty + ")" : ""}`],
  ];
  for (const [k, v] of facts) { y = row(g, k, v, sx, y, sw); }

  y += 52;
  g.fillStyle = INK; g.font = "700 20px Archivo, sans-serif"; g.fillText("PLACEMENTS", sx, y); y += 14;
  for (const s of spec.surfaces) {
    for (const l of s.layers) {
      y += 30;
      if (y > H - 300) break;
      const what = l.kind === "text" ? `“${l.text.split("\n")[0].slice(0, 22)}” ${l.font}` : (l.file || "artwork").slice(0, 26);
      g.font = "600 18px Archivo, sans-serif"; g.fillStyle = INK; g.fillText(`${s.label}`, sx, y);
      g.font = "500 16px 'JetBrains Mono', monospace"; g.fillStyle = MUTED;
      g.fillText(`${what}`, sx + 190, y);
      g.textAlign = "right";
      g.fillText(`${l.size_mm[0]}×${l.size_mm[1]} mm`, sx + sw - 130, y);
      const ok = l.kind === "text" || l.verdict === "vector" || l.verdict === "sharp";
      const bad = l.verdict === "too low";
      g.fillStyle = bad ? "#B42318" : ok ? "#1D6B4F" : "#8A6100";
      g.fillText(l.kind === "text" ? "vector" : l.vector ? "vector" : `${l.effective_dpi} dpi`, sx + sw, y);
      g.textAlign = "left";
    }
  }

  // inks
  const inks = new Set();
  for (const s of spec.surfaces) for (const l of s.layers) { if (l.kind === "text") inks.add(l.colour.toUpperCase()); else (l.ink_colours || []).forEach((h) => inks.add(h.toUpperCase())); }
  y += 40;
  g.fillStyle = INK; g.font = "700 20px Archivo, sans-serif"; g.fillText("INKS DETECTED", sx, y);
  let ix = sx + 190;
  for (const h of [...inks].slice(0, 12)) {
    g.fillStyle = h; g.beginPath(); g.arc(ix, y - 7, 12, 0, Math.PI * 2); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 2; g.stroke(); ix += 32;
  }

  // quote
  y += 44;
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + sw, y); g.stroke();
  y += 44;
  g.font = "800 40px Archivo, sans-serif"; g.fillStyle = INK;
  if (quote.quoteOnly) g.fillText(`${rand(quote.range[0])} – ${rand(quote.range[1])}`, sx, y);
  else g.fillText(rand2(quote.total), sx, y);
  g.font = "500 18px Archivo, sans-serif"; g.fillStyle = MUTED;
  g.fillText(quote.quoteOnly ? "indicative, incl. VAT — confirmed after we see it" : `incl. VAT · ${rand2(quote.each)} each${quote.confirmed ? "" : " · estimate, confirmed on your quote"}`, sx, y + 30);

  // notes
  const notes = [];
  if (state.process === "embroidery") notes.push("Embroidery: placement only. Thread colours and stitch detail are confirmed on a digitised proof.");
  if (spec.surfaces.some((s) => s.layers.some((l) => l.background_removed))) notes.push("Background removed in the preview — we remove it properly from your original file.");
  if (spec.surfaces.some((s) => s.layers.some((l) => l.verdict === "too low"))) notes.push("Some artwork is below the resolution this product needs. We will contact you before printing.");
  notes.push("Screen colours vary. This proof shows placement and size; your order is printed from your original files.");
  y += 80;
  g.font = "500 17px Archivo, sans-serif"; g.fillStyle = MUTED;
  for (const n of notes) { y = wrap(g, "— " + n, sx, y, sw, 24) + 6; }

  // ── footer: approval line ──
  g.fillStyle = INK; g.fillRect(0, H - 70, W, 70);
  g.fillStyle = "#fff"; g.font = "600 20px Archivo, sans-serif"; g.textBaseline = "middle";
  g.fillText("Approved by  ________________________     Date  __________", 60, H - 35);
  g.textAlign = "right"; g.font = "500 18px 'JetBrains Mono', monospace"; g.fillStyle = "rgba(255,255,255,.7)";
  g.fillText("eminenceprinting.co.za/studio", W - 60, H - 35);
  return c;
}

function viewLabel(v) { return { front: "Front", back: "Back", left: "Left side", right: "Right side", rear: "Rear", "3d": "3D view" }[v] ?? v; }

function tag(g, text, x, y) {
  g.font = "600 16px 'JetBrains Mono', monospace";
  const w = g.measureText(text.toUpperCase()).width + 20;
  g.fillStyle = INK; g.fillRect(x, y, w, 30);
  g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(text.toUpperCase(), x + 10, y + 16);
  g.textBaseline = "alphabetic";
}

function row(g, k, v, x, y, w) {
  y += 34;
  g.font = "500 16px 'JetBrains Mono', monospace"; g.fillStyle = MUTED; g.fillText(k.toUpperCase(), x, y);
  g.font = "600 21px Archivo, sans-serif"; g.fillStyle = INK; g.fillText(String(v).slice(0, 52), x + 160, y);
  g.strokeStyle = LINE; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 12); g.lineTo(x + w, y + 12); g.stroke();
  return y;
}

function wrap(g, text, x, y, maxW, lh) {
  const words = String(text).split(" ");
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  g.fillText(line, x, y);
  return y + lh;          // where the NEXT line starts
}

export const toBlob = (canvas, type = "image/png", q) => new Promise((res) => canvas.toBlob(res, type, q));

export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
