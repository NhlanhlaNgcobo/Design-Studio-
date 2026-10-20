/* Quote engine.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ EVERY NUMBER IN THIS FILE IS A PLACEHOLDER.                          │
 * │ Eminence publishes no prices. These are 2026 KZN market estimates so │
 * │ the Studio behaves realistically; they must be replaced with         │
 * │ Eminence's own before launch. PRICES_CONFIRMED flips the UI from     │
 * │ "Estimate" to "Price".                                                │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * The structure is the part that matters, and it is how print shops really
 * charge, which a flat "R199 each" does not capture:
 *   - garments = blank + a decoration charge PER PRINTED POSITION
 *   - DTF and sublimation are priced by print size band (A6 … A3)
 *   - screen printing has a one-off screen per ink colour per position, then a
 *     small run charge per colour — so it gets cheaper per shirt the more you make
 *   - embroidery has a one-off digitising fee, then a per-position charge
 *   - paper is priced in quantity tiers; large format by the square metre
 * All amounts are rands, VAT exclusive.
 */

export const PRICES_CONFIRMED = false;
export const VAT = 0.15;

const BLANK = { tee: 75, oversized: 140, polo: 130, hoodie: 260, cap: 65, tote: 45 };
const BIG_SIZE_UPLIFT = 0.15;                    // 2XL and up
const BIG_SIZES = new Set(["2XL", "3XL", "4XL"]);

/* Print size bands by placed area. A position is charged by the band its
 * artwork actually covers, not by the maximum area of that position. */
const BANDS = [
  { id: "A6", maxMm2: 105 * 148, dtf: 35, sub: 30 },
  { id: "A5", maxMm2: 148 * 210, dtf: 55, sub: 45 },
  { id: "A4", maxMm2: 210 * 297, dtf: 85, sub: 70 },
  { id: "A3", maxMm2: 297 * 420, dtf: 140, sub: 110 },
  { id: "A3+", maxMm2: Infinity, dtf: 180, sub: 140 },
];

const SCREEN = { setupPerColour: 250, runPerColour: 8, maxColours: 6 };
const EMBROIDERY = { digitising: 350, small: 45, large: 85, smallMaxMm: 100 };
const VINYL = { small: 40, large: 70, smallMaxMm2: 150 * 150, perExtraColour: 20 };

/** Volume discount on garments and decoration. */
const VOLUME = [[100, 0.74], [50, 0.8], [25, 0.86], [10, 0.92], [1, 1]];
const volume = (q) => VOLUME.find(([min]) => q >= min)[1];

/* Paper: price for the whole run at each tier. */
const PAPER = {
  cards: { 100: 350, 250: 550, 500: 750, 1000: 1100, 2000: 1900 },
  flyer: { 100: 450, 250: 650, 500: 900, 1000: 1300, 2500: 2600, 5000: 4200 },
};
const FLYER_SIZE = { A6: 0.7, A5: 1, A4: 1.7 };
const STOCK_UPLIFT = { "350 g matt + soft-touch": 0.3, "170 g gloss": 0.12, "250 g matt": 0.25, "Self-adhesive vinyl": 0.6 };

const PER_M2 = { poster: 260, pvc: 180, correx: 350 };
const MIN_EACH = { poster: 80, pvc: 250, correx: 60 };
const FIXED = {
  rollup: { "850x2000": 950, "1000x2000": 1150, "1200x2000": 1450 },
  flag: { S: 1350, M: 1650, L: 1950 },
  gazebo: { "3x3": 4800, "4.5x3": 6900, "6x3": 8900 },
  mug: { "330": 95 },
};
const GAZEBO_WALL = { "3x3": 1600, "4.5x3": 2200, "6x3": 2800 };

/* Installed work is quoted after seeing the vehicle or the building, so these
 * produce a RANGE, never a cart price. Per m² of artwork actually covered. */
const INSTALLED = {
  wrap: { perM2: [480, 650] },        // printed, laminated, fitted
  cutvinyl: { perM2: [220, 320] },
  largeformat: { perM2: [1200, 1700], litExtraPerM2: [1400, 2000] },  // ACM fascia, fitted
};

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
    const rule = INSTALLED[q.process] ?? INSTALLED.largeformat;
    const m2 = q.productId === "fascia"
      ? (q.sizeW * q.sizeH) / 1e6
      : q.positions.reduce((a, x) => a + x.areaMm2, 0) / 1e6;
    let lo = rule.perM2[0] * m2, hi = rule.perM2[1] * m2;
    if (q.options?.lit && rule.litExtraPerM2) { lo += rule.litExtraPerM2[0] * m2; hi += rule.litExtraPerM2[1] * m2; }
    const n = Math.max(1, units || 1);
    notes.push(q.productId === "van"
      ? `About ${m2.toFixed(1)} m² of graphics per vehicle. Final price after we see the vehicle — panel condition and curves change the fitting time.`
      : "Final price after a site visit — mounting, height and electrics change the installation.");
    return { range: [lo * n * (1 + VAT), hi * n * (1 + VAT)], lines: [], subtotal: 0, vat: 0, total: 0, units: n, each: 0, notes, blockers: [], confirmed: PRICES_CONFIRMED, quoteOnly: true };
  }

  /* ── garments ── */
  if (BLANK[q.productId] != null) {
    const v = volume(units);
    const big = p.sizeBreakdown
      ? Object.entries(q.breakdown || {}).filter(([s]) => BIG_SIZES.has(s)).reduce((a, [, n]) => a + (+n || 0), 0)
      : 0;
    const blank = BLANK[q.productId] * v;
    if (units - big > 0) add(`${p.name} blank`, units - big, blank);
    if (big > 0) add(`${p.name} blank, 2XL+`, big, blank * (1 + BIG_SIZE_UPLIFT));

    if (!q.positions.length) notes.push("No print added yet — that is the price of plain garments.");

    let digitised = false;
    for (const pos of q.positions) {
      const band = BANDS.find((b) => pos.areaMm2 <= b.maxMm2);
      switch (q.process) {
        case "dtf":
          add(`${pos.label} — DTF ${band.id}`, units, band.dtf * v); break;
        case "sublimation":
          add(`${pos.label} — sublimation ${band.id}`, units, band.sub * v); break;
        case "screen": {
          const c = Math.max(1, Math.min(pos.colours || 1, SCREEN.maxColours));
          if ((pos.colours || 1) > SCREEN.maxColours)
            blockers.push(`${pos.label}: ${pos.colours} colours is too many to screen print. Choose DTF, or simplify the artwork to ${SCREEN.maxColours} colours.`);
          add(`${pos.label} — screens, ${c} colour${c > 1 ? "s" : ""} (once-off)`, c, SCREEN.setupPerColour, { setup: true });
          add(`${pos.label} — screen print, ${c} colour${c > 1 ? "s" : ""}`, units, SCREEN.runPerColour * c);
          break;
        }
        case "embroidery":
          if (!digitised) { add("Embroidery digitising (once-off)", 1, EMBROIDERY.digitising, { setup: true }); digitised = true; }
          add(`${pos.label} — embroidery`, units, (pos.maxSideMm <= EMBROIDERY.smallMaxMm ? EMBROIDERY.small : EMBROIDERY.large) * v);
          break;
        case "vinyl": {
          const extra = Math.max(0, (pos.colours || 1) - 1);
          add(`${pos.label} — cut vinyl${extra ? `, ${extra + 1} colours` : ""}`, units,
            ((pos.areaMm2 <= VINYL.smallMaxMm2 ? VINYL.small : VINYL.large) + extra * VINYL.perExtraColour) * v);
          break;
        }
      }
    }
    if (q.process === "screen" && units && units < 20)
      blockers.push("Screen printing starts at 20 garments. For fewer, DTF gives the same look without screen costs.");
  }

  /* ── fixed-price goods ── */
  else if (FIXED[q.productId]) {
    const each = FIXED[q.productId][q.sizeId] ?? Object.values(FIXED[q.productId])[0];
    const v = q.productId === "mug" ? volume(units) : 1;
    add(`${p.name}, ${q.sizeLabel}`, units, each * v);
    if (q.productId === "gazebo" && q.positions.some((x) => x.surfaceId === "wall-back"))
      add("Printed back wall", units, GAZEBO_WALL[q.sizeId]);
  }

  /* ── paper ── */
  else if (PAPER[q.productId]) {
    const table = PAPER[q.productId];
    const tier = Object.keys(table).map(Number).filter((t) => t <= units).pop() ?? Number(Object.keys(table)[0]);
    let run = table[tier] * (units / tier);
    if (q.productId === "flyer") run *= FLYER_SIZE[q.sizeId] ?? 1;
    const doubleSided = q.positions.some((x) => x.surfaceId === "back");
    if (doubleSided) run *= q.productId === "cards" ? 1.25 : 1.2;
    run *= 1 + (STOCK_UPLIFT[q.stock] ?? 0);
    add(`${p.name}, ${q.sizeLabel}, ${doubleSided ? "double" : "single"}-sided, ${q.stock}`, 1, run, { run: units });
  }

  /* ── by the square metre ── */
  else if (PER_M2[q.productId]) {
    const m2 = (q.sizeW * q.sizeH) / 1e6;
    const each = Math.max(MIN_EACH[q.productId], PER_M2[q.productId] * m2);
    add(`${p.name}, ${q.sizeLabel} (${m2.toFixed(2)} m²)`, units, each);
  }

  const subtotal = r(lines.reduce((a, l) => a + l.total, 0));
  const vat = r(subtotal * VAT);
  const total = r(subtotal + vat);
  return { lines, subtotal, vat, total, units, each: units ? r(total / units) : 0, notes, blockers, confirmed: PRICES_CONFIRMED };
}

/* Formatted by hand: Chrome's en-ZA locale uses a decimal COMMA ("R95,00"),
 * which is not how SA retail writes prices. Thin-space thousands, point decimals. */
const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const rand = (n) => "R" + group(String(Math.round(n)));
export const rand2 = (n) => { const [a, b] = n.toFixed(2).split("."); return "R" + group(a) + "." + b; };
