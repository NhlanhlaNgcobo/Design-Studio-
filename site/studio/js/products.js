/* The Eminence catalogue, as the Studio needs it.
 *
 * Everything is in REAL MILLIMETRES. The editor, the mockup, the DPI check and
 * the production spec all derive from these numbers, so a 90 × 50 mm business
 * card and a 3 m gazebo canopy are edited at their true proportions and the
 * resolution warning is calculated against the size the thing is printed at.
 *
 * Prices are NOT here — see pricing.js. This file is geometry and production
 * rules only, so Eminence can change a price without touching a print area.
 *
 * Surface fields
 *   id, label      what the customer picks
 *   view           which side of the product the mockup shows for it
 *   w, h           print area in mm (or a function of the chosen size)
 *   shape          rect | triangle | teardrop — the printable outline
 *   bleedMm        paper and full-bleed goods: artwork must run past the trim
 *   safeMm         keep text inside this margin
 *   fullBleed      start new artwork covering the whole area
 */

/** Blank colours stocked by most SA garment wholesalers (Barron, Gildan, Fruit of the Loom). */
const GARMENT_COLOURS = [
  { hex: "#FFFFFF", name: "White" },        { hex: "#111111", name: "Black" },
  { hex: "#1C2541", name: "Navy" },         { hex: "#1F4FA0", name: "Royal" },
  { hex: "#B3202A", name: "Red" },          { hex: "#1E5631", name: "Bottle green" },
  { hex: "#9EA2A5", name: "Grey melange" }, { hex: "#3B3F45", name: "Charcoal" },
  { hex: "#6A1F2B", name: "Maroon" },       { hex: "#F2B705", name: "Gold" },
  { hex: "#E8650F", name: "Orange" },       { hex: "#8EC5E8", name: "Sky blue" },
  { hex: "#F2B8C6", name: "Pink" },         { hex: "#CDBE9F", name: "Stone" },
];
const LIGHT_POLY = [
  { hex: "#FFFFFF", name: "White" }, { hex: "#F3F1EC", name: "Off-white" },
];
const STOCK_WHITE = [{ hex: "#FFFFFF", name: "White stock" }];

/* Sizes for a garment carry the chest width, which is what a print area is
 * measured against. They are flat measurements of a laid-out garment. */
const sizes = (fit) => ({
  regular:   [["S", 480], ["M", 510], ["L", 540], ["XL", 570], ["2XL", 600], ["3XL", 630]],
  oversized: [["S", 560], ["M", 600], ["L", 640], ["XL", 680], ["2XL", 720]],
  hoodie:    [["S", 540], ["M", 580], ["L", 620], ["XL", 660], ["2XL", 700], ["3XL", 740]],
  polo:      [["S", 490], ["M", 520], ["L", 550], ["XL", 580], ["2XL", 610], ["3XL", 640]],
}[fit].map(([id, w]) => ({ id, label: id, w })));

/* Process rules. Real constraints of the methods, not preferences:
 *   sublimation  dye goes INTO polyester — white/light poly only, no white ink
 *   screen       priced per colour, minimum run, needs spot colours
 *   dtf          full colour on any fabric, any quantity
 *   embroidery   thread; placement preview only, small areas
 *   vinyl        cut single colours, simple shapes, no gradients
 */
export const PROCESSES = {
  dtf:         { label: "DTF transfer", short: "DTF", note: "Full colour on any fabric colour, any quantity. Soft hand-feel, very durable." },
  screen:      { label: "Screen print", short: "Screen", note: "Best price on bigger runs. Priced per ink colour, minimum 20 garments.", minQty: 20, perColour: true },
  sublimation: { label: "Sublimation", short: "Sublimation", note: "Dye goes into the fibre — it never cracks or peels. White or light polyester only.", lightOnly: true },
  embroidery:  { label: "Embroidery", short: "Embroidery", note: "Stitched thread. Preview shows placement only — we send a digitised proof.", maxAreaMm: [120, 120], placementOnly: true },
  vinyl:       { label: "Cut vinyl", short: "Vinyl", note: "Single solid colours, cut to shape. Not for photos or gradients.", spotOnly: true },
  digital:     { label: "Digital print", short: "Digital", note: "Full colour, fine detail." },
  largeformat: { label: "Large-format print", short: "Large format", note: "Solvent/UV inks on outdoor media. Weatherproof." },
  sublimfabric:{ label: "Dye-sublimation fabric", short: "Sublimated fabric", note: "Printed into the fabric — washable, no glare, colour-fast outdoors." },
  wrap:        { label: "Printed wrap vinyl", short: "Wrap", note: "Cast vinyl, printed and laminated, fitted by our team. Quoted per vehicle after we see it." },
  cutvinyl:    { label: "Cut vinyl lettering", short: "Cut vinyl", note: "Solid-colour lettering and logos, cut and applied. The budget option for fleets." },
};

/* DTF and cut vinyl on garments are assumed, not confirmed — Eminence's own
 * list is screen, embroidery, digital, litho, sublimation, laser, signage.
 * See research/RESEARCH.md. */

export const PRODUCTS = {
  /* ───────────────────────────── apparel ───────────────────────────── */
  tee: {
    name: "T-shirt", group: "Clothing", render: "garment", fit: "regular",
    blurb: "160 g cotton crew neck",
    minDpi: 300, lead: "3–5 working days",
    processes: ["dtf", "screen", "sublimation", "embroidery", "vinyl"],
    sizes: sizes("regular"), colours: GARMENT_COLOURS, sizeBreakdown: true,
    surfaces: [
      { id: "front", label: "Front", view: "front", w: 280, h: 360 },
      { id: "chest-left", label: "Left chest", view: "front", w: 95, h: 95 },
      { id: "back", label: "Back", view: "back", w: 300, h: 400 },
      { id: "neck", label: "Back neck", view: "back", w: 80, h: 40 },
      { id: "sleeve-right", label: "Right sleeve", view: "front", w: 80, h: 80 },
    ],
  },
  oversized: {
    name: "Oversized tee", group: "Clothing", render: "garment", fit: "oversized",
    blurb: "220 g heavyweight, dropped shoulder",
    minDpi: 300, lead: "3–5 working days",
    processes: ["dtf", "screen", "embroidery"],
    sizes: sizes("oversized"), colours: GARMENT_COLOURS, sizeBreakdown: true,
    surfaces: [
      { id: "front", label: "Front", view: "front", w: 330, h: 400 },
      { id: "chest-left", label: "Left chest", view: "front", w: 95, h: 95 },
      { id: "back", label: "Back", view: "back", w: 360, h: 450 },
      { id: "neck", label: "Back neck", view: "back", w: 80, h: 40 },
    ],
  },
  polo: {
    name: "Golf shirt", group: "Clothing", render: "garment", fit: "polo",
    blurb: "Pique knit, three-button placket",
    minDpi: 300, lead: "4–6 working days",
    processes: ["embroidery", "dtf", "vinyl"],
    sizes: sizes("polo"), colours: GARMENT_COLOURS, sizeBreakdown: true,
    // The placket cuts down the middle of the chest, so a golf shirt has no
    // "full front" — branding goes on the chest, the sleeve or the back.
    surfaces: [
      { id: "chest-left", label: "Left chest", view: "front", w: 95, h: 80 },
      { id: "chest-right", label: "Right chest", view: "front", w: 95, h: 80 },
      { id: "back", label: "Back", view: "back", w: 300, h: 300 },
      { id: "sleeve-right", label: "Right sleeve", view: "front", w: 80, h: 70 },
    ],
  },
  hoodie: {
    name: "Hoodie", group: "Clothing", render: "garment", fit: "hoodie",
    blurb: "280 g fleece, kangaroo pocket",
    minDpi: 300, lead: "4–6 working days",
    processes: ["dtf", "screen", "embroidery"],
    sizes: sizes("hoodie"), colours: GARMENT_COLOURS, sizeBreakdown: true,
    // The front has to clear the pocket, so it is shorter than the back.
    surfaces: [
      { id: "front", label: "Front (above pocket)", view: "front", w: 280, h: 250 },
      { id: "chest-left", label: "Left chest", view: "front", w: 95, h: 95 },
      { id: "back", label: "Back", view: "back", w: 340, h: 420 },
    ],
  },
  cap: {
    name: "Cap", group: "Clothing", render: "cap",
    blurb: "Six-panel, structured, adjustable",
    minDpi: 300, lead: "4–6 working days",
    processes: ["embroidery", "dtf"],
    // Black first: a white cap front-on is hard to read as a cap at all.
    sizes: [{ id: "OS", label: "One size", w: 200 }], colours: [GARMENT_COLOURS[1], GARMENT_COLOURS[2], GARMENT_COLOURS[0], ...GARMENT_COLOURS.slice(3)],
    surfaces: [{ id: "front", label: "Front panel", view: "front", w: 110, h: 55 }],
  },
  tote: {
    name: "Tote bag", group: "Clothing", render: "tote",
    blurb: "Natural or black canvas, 380 × 420 mm",
    minDpi: 300, lead: "3–5 working days",
    processes: ["dtf", "screen", "vinyl"],
    sizes: [{ id: "STD", label: "380 × 420 mm", w: 380 }],
    colours: [{ hex: "#EDE4D3", name: "Natural" }, { hex: "#111111", name: "Black" }, { hex: "#1C2541", name: "Navy" }, { hex: "#B3202A", name: "Red" }],
    surfaces: [{ id: "front", label: "Front", view: "front", w: 300, h: 320 }],
  },

  /* ───────────────────────────── drinkware ───────────────────────────── */
  mug: {
    name: "Mug", group: "Drinkware", render: "mug",
    blurb: "330 ml ceramic, dishwasher-safe",
    minDpi: 200, lead: "2–3 working days",
    processes: ["sublimation"],
    sizes: [{ id: "330", label: "330 ml (11 oz)", w: 82 }],
    // White body only for sublimation; the colour is the inner glaze and handle.
    colours: [{ hex: "#FFFFFF", name: "All white" }, { hex: "#111111", name: "Black inside" }, { hex: "#B3202A", name: "Red inside" }, { hex: "#1F4FA0", name: "Blue inside" }, { hex: "#F2B705", name: "Yellow inside" }],
    surfaces: [{ id: "wrap", label: "Wrap-around", view: "front", w: 200, h: 82, wrap: true }],
  },

  /* ───────────────────────────── print ───────────────────────────── */
  cards: {
    name: "Business cards", group: "Print", render: "paper", kind: "card",
    blurb: "90 × 50 mm, 350 g matt or gloss",
    minDpi: 300, lead: "2–3 working days",
    processes: ["digital"],
    stocks: ["350 g matt", "350 g gloss", "350 g matt + soft-touch"],
    sizes: [{ id: "90x50", label: "90 × 50 mm (SA standard)", w: 90, h: 50 }],
    colours: STOCK_WHITE, qtyTiers: [100, 250, 500, 1000, 2000],
    surfaces: [
      { id: "front", label: "Front", view: "front", bleedMm: 3, safeMm: 4, fullBleed: true },
      { id: "back", label: "Back", view: "back", bleedMm: 3, safeMm: 4, fullBleed: true },
    ],
  },
  flyer: {
    name: "Flyers", group: "Print", render: "paper", kind: "sheet",
    blurb: "A6 to A4, 130 g gloss",
    minDpi: 300, lead: "2–3 working days",
    processes: ["digital"],
    stocks: ["130 g gloss", "170 g gloss", "250 g matt"],
    sizes: [{ id: "A6", label: "A6 · 105 × 148", w: 105, h: 148 }, { id: "A5", label: "A5 · 148 × 210", w: 148, h: 210 }, { id: "A4", label: "A4 · 210 × 297", w: 210, h: 297 }],
    colours: STOCK_WHITE, qtyTiers: [100, 250, 500, 1000, 2500, 5000],
    surfaces: [
      { id: "front", label: "Front", view: "front", bleedMm: 3, safeMm: 5, fullBleed: true },
      { id: "back", label: "Back (optional)", view: "back", bleedMm: 3, safeMm: 5, fullBleed: true },
    ],
  },
  poster: {
    name: "Posters", group: "Print", render: "paper", kind: "poster",
    blurb: "A3 to A0 on 200 g satin",
    minDpi: 150, lead: "1–2 working days",
    processes: ["digital"],
    stocks: ["200 g satin", "200 g matt", "Self-adhesive vinyl"],
    sizes: [{ id: "A3", label: "A3 · 297 × 420", w: 297, h: 420 }, { id: "A2", label: "A2 · 420 × 594", w: 420, h: 594 }, { id: "A1", label: "A1 · 594 × 841", w: 594, h: 841 }, { id: "A0", label: "A0 · 841 × 1189", w: 841, h: 1189 }],
    colours: STOCK_WHITE, qtyTiers: [1, 5, 10, 25, 50, 100],
    surfaces: [{ id: "front", label: "Poster", view: "front", bleedMm: 3, safeMm: 10, fullBleed: true }],
  },

  /* ───────────────────────────── display ───────────────────────────── */
  rollup: {
    name: "Pull-up banner", group: "Banners & display", render: "banner", kind: "rollup",
    blurb: "Aluminium stand, carry bag included",
    minDpi: 120, lead: "2–4 working days",
    processes: ["largeformat"],
    sizes: [{ id: "850x2000", label: "850 × 2000 mm", w: 850, h: 2000 }, { id: "1000x2000", label: "1000 × 2000 mm", w: 1000, h: 2000 }, { id: "1200x2000", label: "1200 × 2000 mm", w: 1200, h: 2000 }],
    colours: STOCK_WHITE, qtyTiers: [1, 2, 5, 10],
    // The bottom 100 mm rolls into the base cassette and is never seen.
    surfaces: [{ id: "face", label: "Banner face", view: "front", bleedMm: 0, safeMm: 40, fullBleed: true, hiddenBottomMm: 100 }],
  },
  pvc: {
    name: "PVC banner", group: "Banners & display", render: "banner", kind: "pvc",
    blurb: "440 g PVC, hemmed with eyelets",
    minDpi: 72, lead: "1–3 working days",
    processes: ["largeformat"],
    sizes: [{ id: "2000x1000", label: "2 × 1 m", w: 2000, h: 1000 }, { id: "3000x1000", label: "3 × 1 m", w: 3000, h: 1000 }, { id: "3000x1500", label: "3 × 1.5 m", w: 3000, h: 1500 }, { id: "6000x1000", label: "6 × 1 m", w: 6000, h: 1000 }],
    colours: STOCK_WHITE, qtyTiers: [1, 2, 5, 10],
    surfaces: [{ id: "face", label: "Banner face", view: "front", bleedMm: 0, safeMm: 50, fullBleed: true }],
  },
  correx: {
    name: "Correx sign", group: "Signage", render: "banner", kind: "board",
    blurb: "4 mm fluted board — estate, election, site signs",
    minDpi: 100, lead: "1–3 working days",
    processes: ["largeformat"],
    sizes: [{ id: "600x450", label: "600 × 450 mm", w: 600, h: 450 }, { id: "900x600", label: "900 × 600 mm", w: 900, h: 600 }, { id: "1200x900", label: "1200 × 900 mm", w: 1200, h: 900 }, { id: "2400x1200", label: "2400 × 1200 mm", w: 2400, h: 1200 }],
    colours: STOCK_WHITE, qtyTiers: [1, 5, 10, 25, 50, 100],
    surfaces: [{ id: "face", label: "Sign face", view: "front", bleedMm: 0, safeMm: 20, fullBleed: true }],
  },
  flag: {
    name: "Teardrop flag", group: "Banners & display", render: "flag",
    blurb: "Sublimated, with pole and ground spike",
    minDpi: 100, lead: "3–5 working days",
    processes: ["sublimfabric"],
    sizes: [{ id: "S", label: "Small · 2.2 m", w: 700, h: 1700 }, { id: "M", label: "Medium · 2.8 m", w: 850, h: 2300 }, { id: "L", label: "Large · 3.4 m", w: 1000, h: 2900 }],
    colours: STOCK_WHITE, qtyTiers: [1, 2, 4, 10],
    surfaces: [{ id: "face", label: "Flag", view: "front", shape: "teardrop", bleedMm: 0, safeMm: 60, fullBleed: true }],
  },
  /* ───────────────────────── vehicles & signage ─────────────────────────
   * Eminence's own portfolio is mostly these two: the Khula Med ambulance fleet
   * and installed shopfront signs. Both are quote-and-install jobs, so the
   * Studio's job here is a convincing visual brief, not a checkout. */
  van: {
    name: "Vehicle livery", group: "Signage", render: "vehicle",
    blurb: "Panel van / minibus — Quantum-class",
    minDpi: 72, lead: "Quoted — includes fitting",
    processes: ["wrap", "cutvinyl"],
    quoteOnly: true,
    // Sizes are the printable side panel of the body, between the arches and
    // below the window line — what a part-wrap actually covers.
    sizes: [{ id: "lwb", label: "Long wheelbase (5.4 m)", w: 5380, h: 2280 }, { id: "swb", label: "Short wheelbase (4.8 m)", w: 4840, h: 1980 }],
    colours: [{ hex: "#F4F5F6", name: "White" }, { hex: "#C9CDD2", name: "Silver" }, { hex: "#111111", name: "Black" }, { hex: "#1F4FA0", name: "Blue" }, { hex: "#B3202A", name: "Red" }],
    surfaces: [
      { id: "side-left", label: "Left side (kerb)", view: "left", part: "side" },
      { id: "side-right", label: "Right side (driver)", view: "right", part: "side" },
      { id: "rear", label: "Rear doors", view: "rear", part: "rear" },
    ],
  },
  fascia: {
    name: "Shopfront sign", group: "Signage", render: "shopfront",
    blurb: "ACM or lightbox fascia, installed",
    minDpi: 72, lead: "Quoted — includes installation",
    processes: ["largeformat"],
    quoteOnly: true,
    sizes: [{ id: "2400x600", label: "2.4 × 0.6 m", w: 2400, h: 600 }, { id: "3600x900", label: "3.6 × 0.9 m", w: 3600, h: 900 }, { id: "4800x1200", label: "4.8 × 1.2 m", w: 4800, h: 1200 }, { id: "6000x1200", label: "6 × 1.2 m", w: 6000, h: 1200 }],
    colours: [{ hex: "#FFFFFF", name: "White ACM" }, { hex: "#111111", name: "Black ACM" }, { hex: "#C9CDD2", name: "Brushed silver" }],
    options: [{ id: "lit", label: "Illuminated lightbox", default: false }],
    surfaces: [{ id: "face", label: "Sign face", view: "front", bleedMm: 0, safeMm: 50, fullBleed: true }],
  },

  gazebo: {
    name: "Gazebo", group: "Banners & display", render: "gazebo",
    blurb: "Steel frame, sublimated canopy",
    minDpi: 100, lead: "5–7 working days",
    processes: ["sublimfabric"],
    sizes: [{ id: "3x3", label: "3 × 3 m", w: 3000, d: 3000, legH: 2100 }, { id: "4.5x3", label: "4.5 × 3 m", w: 4500, d: 3000, legH: 2100 }, { id: "6x3", label: "6 × 3 m", w: 6000, d: 3000, legH: 2100 }],
    colours: [{ hex: "#FFFFFF", name: "White" }, { hex: "#111111", name: "Black" }, { hex: "#1F4FA0", name: "Royal" }, { hex: "#B3202A", name: "Red" }, { hex: "#1E5631", name: "Green" }, { hex: "#F2B705", name: "Gold" }, { hex: "#1C2541", name: "Navy" }],
    qtyTiers: [1, 2, 3, 5],
    // Most gazebos are printed the same on opposite sides. On by default; off
    // means the back and far side stay plain.
    options: [{ id: "repeat", label: "Repeat front & side designs on the back and far side", default: true }],
    // Canopy and valance resolve against the chosen size — see surfaceSize().
    surfaces: [
      { id: "canopy-front", label: "Roof — front", view: "3d", shape: "triangle", part: "canopy", side: "front" },
      { id: "canopy-side", label: "Roof — side", view: "3d", shape: "triangle", part: "canopy", side: "side" },
      { id: "valance-front", label: "Valance — front", view: "3d", part: "valance", side: "front" },
      { id: "valance-side", label: "Valance — side", view: "3d", part: "valance", side: "side" },
      { id: "wall-back", label: "Back wall", view: "3d", part: "wall", side: "back", optional: true },
    ],
  },
};

export const GROUPS = ["Clothing", "Drinkware", "Print", "Banners & display", "Signage"];

/* A gazebo's roof rises by 26% of its shorter side — the same figure the 3D
 * model is built from, so the size quoted in the editor matches the mockup. */
export const ROOF_RISE = 0.26;
export const VALANCE_MM = 250;

/**
 * The real print size of a surface for a chosen product size.
 * Returns { w, h } in mm, excluding bleed.
 */
export function surfaceSize(product, sizeOpt, surf) {
  if (surf.w && surf.h) return { w: surf.w, h: surf.h };
  if (product.render === "vehicle") {
    // Side: wheelbase-length panel below the windows; rear: the two doors.
    if (surf.part === "side") return { w: Math.round(sizeOpt.w * 0.63), h: Math.round(sizeOpt.h * 0.42) };
    return { w: 1500, h: Math.round(sizeOpt.h * 0.42) };
  }
  if (product.render === "gazebo") {
    const span = surf.side === "front" ? sizeOpt.w : sizeOpt.d;
    const run = surf.side === "front" ? sizeOpt.d : sizeOpt.w;
    if (surf.part === "canopy")
      return { w: span, h: Math.round(Math.hypot(run / 2, Math.min(sizeOpt.w, sizeOpt.d) * ROOF_RISE)) };
    if (surf.part === "valance") return { w: span, h: VALANCE_MM };
    return { w: sizeOpt.w, h: sizeOpt.legH - VALANCE_MM };
  }
  return { w: sizeOpt.w, h: sizeOpt.h };
}

/* ──────────────────────────── artwork checks ──────────────────────────── */

/**
 * Effective print resolution: how many of the artwork's own pixels land across
 * the width it is printed at. Scaling a 400 px logo across a 1.5 m panel does
 * not create detail — this is what tells the customer before they pay.
 */
export function effectiveDpi(naturalPx, placedWidthMm) {
  if (!naturalPx || !placedWidthMm) return 0;
  return Math.round(naturalPx / (placedWidthMm / 25.4));
}

export function dpiVerdict(dpi, minDpi) {
  if (!dpi) return { level: "warn", label: "Couldn't check", note: "We couldn't read this file's resolution — we'll check it by hand." };
  if (dpi >= minDpi) return { level: "ok", label: "Sharp", note: `${dpi} dpi at this size.` };
  if (dpi >= minDpi * 0.66) return { level: "warn", label: "Borderline", note: `${dpi} dpi — usable but soft. ${minDpi} dpi is ideal for this product.` };
  return { level: "bad", label: "Too low", note: `${dpi} dpi — this will print blurry. Make it smaller, or send a bigger file or a vector (SVG, PDF, AI).` };
}

export function isVector(type, name = "") {
  return type === "image/svg+xml" || /\.(svg|pdf|ai|eps)$/i.test(name);
}

/** Relative luminance, for the "will this show up on that colour" check. */
export function luminance(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 1;
  const c = m.slice(1).map((h) => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const isDark = (hex) => luminance(hex) < 0.18;
export function contrastRatio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
