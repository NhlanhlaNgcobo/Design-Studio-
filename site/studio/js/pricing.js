/* Quote engine.
 *
 * Every price lives in ONE settings object, PRICES, which the store owner edits
 * at /studio/admin/ (saved through /api/pricing). The Studio loads the saved
 * prices when it starts; DEFAULT_PRICES are the starter set it falls back to,
 * 2026 KZN market levels, to be reviewed and saved by the owner before launch.
 *
 * The structure is how print shops really charge, which a flat "R199 each"
 * does not capture:
 *   - garments = blank + a decoration charge PER PRINTED POSITION
 *   - DTF and sublimation are priced by print size band (A6 … A3)
 *   - screen printing has a one-off screen per ink colour per position, then a
 *     small run charge per colour — so it gets cheaper per shirt the more you make
 *   - embroidery has a one-off digitising fee, then a per-position charge
 *   - paper is priced in quantity tiers; large format by the square metre
 * All amounts are rands, VAT exclusive.
 */

export const DEFAULT_PRICES = {
  vat: 0.15,
  blank: { tee: 75, oversized: 140, polo: 130, hoodie: 260, cap: 65, tote: 45 },
  bigSizeUplift: 0.15,                        // 2XL and up
  bigSizes: ["2XL", "3XL", "4XL"],
  /* Print size bands by placed area. A position is charged by the band its
   * artwork actually covers, not by the maximum area of that position. */
  bands: [
    { id: "A6", maxMm2: 105 * 148, dtf: 35, sub: 30 },
    { id: "A5", maxMm2: 148 * 210, dtf: 55, sub: 45 },
    { id: "A4", maxMm2: 210 * 297, dtf: 85, sub: 70 },
    { id: "A3", maxMm2: 297 * 420, dtf: 140, sub: 110 },
    { id: "A3+", maxMm2: null, dtf: 180, sub: 140 },          // null = anything bigger
  ],
  screen: { setupPerColour: 250, runPerColour: 8, maxColours: 6, minQty: 20 },
  embroidery: { digitising: 350, small: 45, large: 85, smallMaxMm: 100 },
  vinyl: { small: 40, large: 70, smallMaxMm2: 150 * 150, perExtraColour: 20 },
  /** Volume discount on garments and decoration: [from quantity, price factor]. */
  volume: [[100, 0.74], [50, 0.8], [25, 0.86], [10, 0.92], [1, 1]],
  /* Paper: price for the whole run at each tier. */
  paper: {
    cards: { 100: 350, 250: 550, 500: 750, 1000: 1100, 2000: 1900 },
    flyer: { 100: 450, 250: 650, 500: 900, 1000: 1300, 2500: 2600, 5000: 4200 },
    welcome: { 25: 220, 50: 320, 100: 480, 250: 850, 500: 1250, 1000: 1950 },     // A6
  },
  welcomeSize: { A6: 1, DL: 1.1, A5: 1.6, SQ: 1.45, mini: 0.6 },
  doubleSided: { cards: 1.25, flyer: 1.2, welcome: 1.2 },
  roundedCorners: 0.15,                       // extra on the run, cards and welcome cards
  flyerSize: { A6: 0.7, A5: 1, A4: 1.7 },
  stockUplift: { "350 g matt + soft-touch": 0.3, "170 g gloss": 0.12, "250 g matt": 0.25, "Self-adhesive vinyl": 0.6 },
  perM2: { poster: 260, pvc: 180, correx: 350 },
  minEach: { poster: 80, pvc: 250, correx: 60 },
  fixed: {
    rollup: { "850x2000": 950, "1000x2000": 1150, "1200x2000": 1450 },
    flag: { S: 1350, M: 1650, L: 1950 },
    mug: { "330": 95 },
  },
  /* Bottled water, own label (per bottle): filled = water + label, sealed and
   * packed; labels = the printed label only. Clear vinyl costs more. */
  water: {
    filled: { "330": 7.5, "500": 8.5, "750": 11, "1000": 13, "1500": 16, "5000": 38 },
    labels: { "330": 2.2, "500": 2.6, "750": 3, "1000": 3.4, "1500": 4, "5000": 8.5 },
    clearVinyl: 0.2,
    minQty: { filled: 24, labels: 50 },
  },
  /* Reusable bottles: the bottle, then the branding — a logo (up to A6 of
   * artwork) or a bigger print / wrap. */
  bottle: {
    blank: { "500": 85, "750": 165, "1000": 210, "2200": 120 },
    brand: { uv: { logo: 35, wrap: 65 }, engrave: { logo: 30, wrap: 60 }, sublimation: { logo: 30, wrap: 45 } },
  },
  /* Welcome boards: the board by its area and material (with a minimum), the
   * display on top. */
  welcomeBoard: {
    perM2: { "5 mm foam board": 650, "5 mm PVC board": 850, "3 mm acrylic, clear": 2200, "5 mm acrylic, frosted": 2600, "3 mm ACM (aluminium)": 1300, "3 mm correx": 450 },
    minEach: 180,
    stand: { easel: 380, metal: 520, feet: 120, heavy: 950, none: 0 },
  },
  /* Gazebos, by part (SA market, Nov 2026: complete R2 300–R8 900, canopy print
   * R1 350–R3 700, frames from R4 000, walls R250–R1 800 each). Walls are priced
   * by their own length — a 6 × 3 m gazebo's back wall is 6 m, its sides 3 m. */
  gazebo: {
    // By frame grade: standard steel 32 mm, heavy-duty steel 45 mm hex,
    // aluminium 40 mm hex, heavy-duty aluminium 50 mm hex.
    complete: {
      steel: { "2x2": 2900, "3x3": 3600 },
      steelhex: { "2x2": 3900, "3x3": 4900, "4.5x3": 6900 },
      alu40: { "2x2": 3600, "3x3": 4500, "4.5x3": 6400, "6x3": 8200 },
      aluminium: { "2x2": 4300, "3x3": 5600, "4.5x3": 7600, "6x3": 9800 },
    },
    canopy: { "2x2": 1450, "3x3": 1950, "4.5x3": 2900, "6x3": 3600 },
    frame: {
      steel: { "2x2": 1900, "3x3": 2400 },
      steelhex: { "2x2": 2800, "3x3": 3600, "4.5x3": 5100 },
      alu40: { "2x2": 2500, "3x3": 3200, "4.5x3": 4700, "6x3": 6100 },
      aluminium: { "2x2": 3100, "3x3": 4100, "4.5x3": 5700, "6x3": 7400 },
    },
    wall: { full: { "2": 650, "3": 900, "4.5": 1300, "6": 1700 }, half: { "2": 380, "3": 520 } },
    wallDoubleSided: 0.6,                     // extra on each wall printed both sides
    accessories: { weights: 450, bag: 350, toolkit: 95 },
  },
  /* Installed work is quoted after seeing the vehicle or the building, so these
   * produce a RANGE, never a cart price. Per m² of artwork actually covered. */
  installed: {
    wrap: { perM2: [480, 650] },        // printed, laminated, fitted
    cutvinyl: { perM2: [220, 320] },
    largeformat: { perM2: [1200, 1700], litExtraPerM2: [1400, 2000] },  // ACM fascia, fitted
  },
};

let PR = DEFAULT_PRICES;
let saved = null;                          // { updated, by } once the owner has saved prices

/** Overlay the owner's saved prices on the defaults (new defaults fill any gaps). */
export function setPrices(custom, meta = null) {
  const merge = (d, c) => {
    if (c === undefined || c === null) return d;
    if (Array.isArray(d) || typeof d !== "object" || d === null) return c;
    const out = { ...d };
    for (const k of Object.keys(c)) out[k] = k in d ? merge(d[k], c[k]) : c[k];
    return out;
  };
  PR = merge(DEFAULT_PRICES, custom || {});
  saved = meta;
}
export const prices = () => PR;
export const pricesSaved = () => saved;

/** Load the owner's prices. Never throws: the starter prices are always there. */
export async function loadPrices(url = "/api/pricing") {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (r.ok) { const d = await r.json(); if (d.prices) setPrices(d.prices, { updated: d.updated }); }
  } catch { /* offline or no API: starter prices */ }
  return PR;
}

/**
 * The priced lines of a gazebo order. Frame + canopy is the complete gazebo
 * (bundle price, carry bag included); otherwise each part on its own. Walls are
 * priced by their own length. Exported so the Studio can show each part's
 * price beside its tick-box.
 */
export function gazeboLines(q, blockers = [], notes = []) {
  const G = PR.gazebo, o = q.options || {}, fr = G.complete[o.frameType] ? o.frameType : "alu40";
  const frName = { steel: "standard steel 32 mm", steelhex: "heavy-duty steel 45 mm hex", alu40: "aluminium 40 mm hex", aluminium: "heavy-duty aluminium 50 mm hex" }[fr];
  const designed = (q.positions || []).filter((x) => x.surfaceId.startsWith("wall-")).map((x) => x.surfaceId);
  const parts = [...new Set([...(o.parts || []), ...designed])], has = (x) => parts.includes(x);
  const lines = [];
  const price = (v, what) => { if (v == null) blockers.push(`${what} isn't made in ${q.sizeLabel}.`); return v ?? 0; };
  if (has("frame") && has("canopy")) lines.push({ part: "complete", label: `Gazebo ${q.sizeLabel} complete: ${frName} frame, printed canopy & valance, carry bag`, unit: price(G.complete[fr]?.[q.sizeId], `A ${frName} gazebo`) });
  else if (has("frame")) lines.push({ part: "frame", label: `Gazebo frame ${q.sizeLabel}, ${frName} (no print)`, unit: price(G.frame[fr]?.[q.sizeId], `A ${frName} frame`) });
  else if (has("canopy")) lines.push({ part: "canopy", label: `Printed canopy & valance, ${q.sizeLabel} (print only)`, unit: price(G.canopy[q.sizeId], "A canopy print") });
  const height = o.wallHeight === "half" ? "half" : "full", both = o.wallSides === "double";
  for (const w of ["wall-back", "wall-left", "wall-right"].filter(has)) {
    const lenMm = w === "wall-back" ? q.sizeW : q.sizeD;
    const base = price(G.wall[height]?.[String(lenMm / 1000)], `A ${height}-height wall`);
    lines.push({ part: w, label: `${{ "wall-back": "Back", "wall-left": "Left", "wall-right": "Right" }[w]} wall, ${height} height, ${lenMm / 1000} m, printed ${both ? "both sides" : "one side"}${designed.includes(w) ? "" : " (plain colour)"}`, unit: base * (both ? 1 + G.wallDoubleSided : 1) });
  }
  for (const k of ["weights", "bag", "toolkit"]) if (has(k)) lines.push({ part: k, label: { weights: "Leg weights, set of 4", bag: "Wheeled carry bag", toolkit: "Tool kit: pegs, ropes, mallet" }[k], unit: G.accessories[k] });
  if (!parts.length) blockers.push("Tick what you'd like to order — frame, canopy, walls or accessories.");
  if (!has("frame") && (has("canopy") || parts.some((x) => x.startsWith("wall-"))) && !String(o.yourFrame || "").trim())
    blockers.push("Tell us your frame's make and size, so the print is made to fit it.");
  if (has("frame") && !has("canopy") && !parts.some((x) => x.startsWith("wall-"))) notes.push("Frame only — nothing is printed.");
  return lines;
}

/**
 * The price beside a part's tick-box. Unticked: what ticking it would add.
 * Ticked: its share of the total, so the ticked prices add up to the order —
 * with frame and canopy both ticked, the frame shows its own price and the
 * canopy the rest of the complete-gazebo bundle.
 */
export function gazeboPartPrice(q, part) {
  const o = q.options || {}, cur = new Set(o.parts || []);
  const sum = (parts) => gazeboLines({ ...q, positions: [], options: { ...o, parts: [...parts] } }).reduce((a, l) => a + l.unit, 0);
  if (cur.has(part) && part === "frame" && cur.has("canopy")) return sum(["frame"]);
  if (cur.has(part) && part === "canopy" && cur.has("frame")) return sum(["frame", "canopy"]) - sum(["frame"]);
  const without = new Set(cur); without.delete(part);
  const withIt = new Set(cur); withIt.add(part);
  return sum(withIt) - sum(without);
}

const volume = (q) => [...PR.volume].sort((a, b) => b[0] - a[0]).find(([min]) => q >= min)?.[1] ?? 1;

const r = (n) => Math.round(n * 100) / 100;

/**
 * @param {object} q
 *   productId, product, sizeId, process, stock, qty,
 *   breakdown   {S: 4, M: 10, …} for garments (overrides qty)
 *   positions   [{ surfaceId, label, areaMm2, maxSideMm, colours }] — printed surfaces only
 * @returns {{lines, subtotal, vat, total, units, each, notes, blockers}}
 */
export function quote(q) {
  const lines = [], notes = [], blockers = [];
  const add = (label, qty, unit, extra = {}) => lines.push({ label, qty, unit: r(unit), total: r(qty * unit), ...extra });
  const p = q.product;
  const units = p.sizeBreakdown
    ? Object.values(q.breakdown || {}).reduce((a, b) => a + (+b || 0), 0)
    : q.qty;

  if (!units) blockers.push("Choose how many you need.");

  /* ── installed work: an indicative range, then a site visit ── */
  if (p.quoteOnly) {
    const rule = PR.installed[q.process] ?? PR.installed.largeformat;
    const m2 = q.productId === "fascia"
      ? (q.sizeW * q.sizeH) / 1e6
      : q.positions.reduce((a, x) => a + x.areaMm2, 0) / 1e6;
    let lo = rule.perM2[0] * m2, hi = rule.perM2[1] * m2;
    if (q.options?.lit && rule.litExtraPerM2) { lo += rule.litExtraPerM2[0] * m2; hi += rule.litExtraPerM2[1] * m2; }
    const n = Math.max(1, units || 1);
    notes.push(q.productId === "van"
      ? `About ${m2.toFixed(1)} m² of graphics per vehicle. Final price after we see the vehicle — panel condition and curves change the fitting time.`
      : "Final price after a site visit — mounting, height and electrics change the installation.");
    return { range: [lo * n * (1 + PR.vat), hi * n * (1 + PR.vat)], lines: [], subtotal: 0, vat: 0, total: 0, units: n, each: 0, notes, blockers: [], quoteOnly: true };
  }

  /* ── garments ── */
  if (PR.blank[q.productId] != null) {
    const v = volume(units);
    const big = p.sizeBreakdown
      ? Object.entries(q.breakdown || {}).filter(([s]) => PR.bigSizes.includes(s)).reduce((a, [, n]) => a + (+n || 0), 0)
      : 0;
    const blank = PR.blank[q.productId] * v;
    if (units - big > 0) add(`${p.name} blank`, units - big, blank);
    if (big > 0) add(`${p.name} blank, 2XL+`, big, blank * (1 + PR.bigSizeUplift));

    if (!q.positions.length) notes.push("No print added yet — that is the price of plain garments.");

    let digitised = false;
    for (const pos of q.positions) {
      const band = PR.bands.find((b) => b.maxMm2 == null || pos.areaMm2 <= b.maxMm2);
      switch (q.process) {
        case "dtf":
          add(`${pos.label} — DTF ${band.id}`, units, band.dtf * v); break;
        case "sublimation":
          add(`${pos.label} — sublimation ${band.id}`, units, band.sub * v); break;
        case "screen": {
          const c = Math.max(1, Math.min(pos.colours || 1, PR.screen.maxColours));
          if ((pos.colours || 1) > PR.screen.maxColours)
            blockers.push(`${pos.label}: ${pos.colours} colours is too many to screen print. Choose DTF, or simplify the artwork to ${PR.screen.maxColours} colours.`);
          add(`${pos.label} — screens, ${c} colour${c > 1 ? "s" : ""} (once-off)`, c, PR.screen.setupPerColour, { setup: true });
          add(`${pos.label} — screen print, ${c} colour${c > 1 ? "s" : ""}`, units, PR.screen.runPerColour * c);
          break;
        }
        case "embroidery":
          if (!digitised) { add("Embroidery digitising (once-off)", 1, PR.embroidery.digitising, { setup: true }); digitised = true; }
          add(`${pos.label} — embroidery`, units, (pos.maxSideMm <= PR.embroidery.smallMaxMm ? PR.embroidery.small : PR.embroidery.large) * v);
          break;
        case "vinyl": {
          const extra = Math.max(0, (pos.colours || 1) - 1);
          add(`${pos.label} — cut vinyl${extra ? `, ${extra + 1} colours` : ""}`, units,
            ((pos.areaMm2 <= PR.vinyl.smallMaxMm2 ? PR.vinyl.small : PR.vinyl.large) + extra * PR.vinyl.perExtraColour) * v);
          break;
        }
      }
    }
    if (q.process === "screen" && units && units < PR.screen.minQty)
      blockers.push(`Screen printing starts at ${PR.screen.minQty} garments. For fewer, DTF gives the same look without screen costs.`);
  }

  /* ── fixed-price goods ── */
  else if (PR.fixed[q.productId] && q.productId !== "gazebo") {   // gazebos are priced by part, below — even if old saved prices still list one
    const each = PR.fixed[q.productId][q.sizeId] ?? Object.values(PR.fixed[q.productId])[0];
    const v = q.productId === "mug" ? volume(units) : 1;
    add(`${p.name}, ${q.sizeLabel}`, units, each * v);
  }

  /* ── welcome boards ── */
  else if (q.productId === "welcomeboard") {
    const W = PR.welcomeBoard, o = q.options || {};
    const m2 = (q.sizeW * q.sizeH) / 1e6, rate = W.perM2[q.stock] ?? Object.values(W.perM2)[0];
    add(`Welcome board ${q.sizeLabel}, ${o.orientation === "landscape" ? "landscape" : "portrait"}, ${q.stock}`, units, Math.max(W.minEach, rate * m2));
    const st = o.stand || "easel";
    if (W.stand[st]) add({ easel: "Wooden easel", metal: "Black metal easel", feet: "Table-top feet", heavy: "Heavy-duty display easel" }[st] ?? "Display", units, W.stand[st]);
  }

  /* ── bottled water, own label ── */
  else if (q.productId === "water") {
    const W = PR.water, supply = q.options?.supply === "labels" ? "labels" : "filled", v = volume(units);
    let each = (W[supply][q.sizeId] ?? Object.values(W[supply])[0]) * v;
    if (/clear/i.test(q.stock || "")) each += (W.labels[q.sizeId] ?? 0) * W.clearVinyl * v;
    add(supply === "filled" ? `Bottled water ${q.sizeLabel}, with your label (${q.stock})` : `Bottle labels for ${q.sizeLabel}, ${q.stock}`, units, each);
    if (units && units < W.minQty[supply])
      blockers.push(supply === "filled" ? `Bottled water starts at ${W.minQty.filled} bottles (a case).` : `Labels start at ${W.minQty.labels}.`);
  }

  /* ── reusable bottles: bottle + branding ── */
  else if (q.productId === "bottle") {
    const B = PR.bottle, v = volume(units);
    add(`${p.name}: ${q.sizeLabel}`, units, (B.blank[q.sizeId] ?? Object.values(B.blank)[0]) * v);
    const how = B.brand[q.process] ?? B.brand.uv;
    for (const pos of q.positions) {
      const big = pos.areaMm2 > 105 * 148;
      add(`${{ uv: "UV print", engrave: "Laser engraving", sublimation: "Sublimation" }[q.process] ?? "Branding"}, ${big ? "large print / wrap" : "logo"}`, units, (big ? how.wrap : how.logo) * v);
    }
    if (!q.positions.length) notes.push("No branding added yet: that is the price of plain bottles.");
  }

  /* ── gazebos, by part: whatever is ticked, added up ── */
  else if (q.productId === "gazebo") {
    for (const l of gazeboLines(q, blockers, notes)) add(l.label, units * (l.each ?? 1), l.unit);
  }

  /* ── paper ── */
  else if (PR.paper[q.productId]) {
    const table = PR.paper[q.productId];
    const tier = Object.keys(table).map(Number).filter((t) => t <= units).pop() ?? Number(Object.keys(table)[0]);
    let run = table[tier] * (units / tier);
    if (q.productId === "flyer") run *= PR.flyerSize[q.sizeId] ?? 1;
    if (q.productId === "welcome") run *= PR.welcomeSize[q.sizeId] ?? 1;
    if (q.options?.rounded) run *= 1 + PR.roundedCorners;
    const doubleSided = q.positions.some((x) => x.surfaceId === "back");
    if (doubleSided) run *= PR.doubleSided[q.productId] ?? 1.2;
    run *= 1 + (PR.stockUplift[q.stock] ?? 0);
    add(`${p.name}, ${q.sizeLabel}, ${doubleSided ? "double" : "single"}-sided, ${q.stock}`, 1, run, { run: units });
  }

  /* ── by the square metre ── */
  else if (PR.perM2[q.productId]) {
    const m2 = (q.sizeW * q.sizeH) / 1e6;
    const each = Math.max(PR.minEach[q.productId], PR.perM2[q.productId] * m2);
    add(`${p.name}, ${q.sizeLabel} (${m2.toFixed(2)} m²)`, units, each);
  }

  const subtotal = r(lines.reduce((a, l) => a + l.total, 0));
  const vat = r(subtotal * PR.vat);
  const total = r(subtotal + vat);
  return { lines, subtotal, vat, total, units, each: units ? r(total / units) : 0, notes, blockers };
}

/* Formatted by hand: Chrome's en-ZA locale uses a decimal COMMA ("R95,00"),
 * which is not how SA retail writes prices. Thin-space thousands, point decimals. */
const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const rand = (n) => "R" + group(String(Math.round(n)));
export const rand2 = (n) => { const [a, b] = n.toFixed(2).split("."); return "R" + group(a) + "." + b; };
