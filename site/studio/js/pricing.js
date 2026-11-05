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
    gazebo: { "3x3": 4800, "4.5x3": 6900, "6x3": 8900 },
    mug: { "330": 95 },
  },
  gazeboWall: { "3x3": 1600, "4.5x3": 2200, "6x3": 2800 },
  gazeboSideWall: 1600,                       // a 3 m side wall, any gazebo width
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
  else if (PR.fixed[q.productId]) {
    const each = PR.fixed[q.productId][q.sizeId] ?? Object.values(PR.fixed[q.productId])[0];
    const v = q.productId === "mug" ? volume(units) : 1;
    add(`${p.name}, ${q.sizeLabel}`, units, each * v);
    if (q.productId === "gazebo" && q.positions.some((x) => x.surfaceId === "wall-back"))
      add("Printed back wall", units, PR.gazeboWall[q.sizeId]);
    const sideWalls = q.productId === "gazebo" ? q.positions.filter((x) => x.surfaceId === "wall-left" || x.surfaceId === "wall-right").length : 0;
    if (sideWalls) add(`Printed side wall${sideWalls > 1 ? "s" : ""}`, units * sideWalls, PR.gazeboSideWall);
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
