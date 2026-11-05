/* Drawing a surface's layers.
 *
 * ONE function draws a design, at any scale, and everything uses it: the
 * editor at screen size, the mockup textures at preview size, the proof sheet
 * at print-check size. That is what guarantees the mockup, the editor and the
 * spec cannot disagree about where something is.
 *
 * Coordinates are millimetres with the origin at the centre of the print area,
 * y pointing down (canvas convention). Layers store their CENTRE.
 */

import qrcode from "../vendor/qrcode.js";

const measurer = document.createElement("canvas").getContext("2d");

export const fontCss = (l, px) => `${l.italic ? "italic " : ""}${l.weight} ${px}px "${l.font}"`;
const LINE = 1.12;

/** Unrotated size of a layer in mm. */
export function layerSize(l, assets) {
  if (l.kind === "shape") return { w: l.w, h: l.w * l.ar };
  if (l.kind === "qr") return { w: l.w, h: l.w };
  if (l.kind === "image") {
    const a = assets.get(l.assetId);
    const sw = a?.source ? (a.source.naturalWidth || a.source.width) : 1;
    const sh = a?.source ? (a.source.naturalHeight || a.source.height) : 1;
    return { w: l.w, h: l.w * (sh / sw) };
  }
  return textMetrics(l).box;
}

/** Text measured at 100 px per mm and scaled back — measureText is in pixels. */
function textMetrics(l) {
  const S = 10;                          // px per mm for measuring
  measurer.font = fontCss(l, l.size * S);
  if ("letterSpacing" in measurer) measurer.letterSpacing = `${l.spacing * l.size * S}px`;
  const lines = String(l.text || " ").split("\n");
  const widths = lines.map((t) => measurer.measureText(t).width / S);
  const w = Math.max(...widths, l.size * 0.3);
  const h = l.size * LINE * lines.length;
  if (!l.arc || lines.length > 1) return { lines, widths, box: { w, h } };
  const a = (Math.abs(l.arc) * Math.PI) / 180;
  const R = w / a;
  const box = { w: 2 * R * Math.sin(Math.min(a, Math.PI) / 2) + l.size * 0.6, h: R * (1 - Math.cos(Math.min(a, Math.PI * 1.8) / 2)) + l.size * LINE };
  return { lines, widths, box, R };
}

/** The four rotated corners of a layer, in mm. For hit tests and bounds. */
export function layerCorners(l, assets) {
  const { w, h } = layerSize(l, assets);
  const r = (l.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([x, y]) => [l.x + x * c - y * s, l.y + x * s + y * c]);
}

/** Union bounds of all layers on a surface, clipped to the print area. */
export function designBounds(layers, assets, area) {
  if (!layers?.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of layers) for (const [x, y] of layerCorners(l, assets)) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (area) {
    x0 = Math.max(x0, -area.w / 2); x1 = Math.min(x1, area.w / 2);
    y0 = Math.max(y0, -area.h / 2); y1 = Math.min(y1, area.h / 2);
  }
  return { x0, y0, x1, y1, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** Draw one layer. `g` is already transformed so 1 unit = 1 mm, origin at area centre. */
export function drawLayer(g, l, assets, pxPerMm) {
  g.save();
  g.translate(l.x, l.y);
  g.rotate((l.rot * Math.PI) / 180);
  if (l.kind === "image") {
    const a = assets.get(l.assetId);
    if (a?.source) {
      const { w, h } = layerSize(l, assets);
      g.imageSmoothingQuality = "high";
      g.drawImage(a.source, -w / 2, -h / 2, w, h);
    }
  } else if (l.kind === "shape") drawShape(g, l);
  else if (l.kind === "qr") drawQr(g, l);
  else drawText(g, l, pxPerMm);
  g.restore();
}

/** Scaling by width (images, shapes, QR codes) or by font size (text). */
export const scalesByWidth = (l) => l.kind !== "text";

/* Shapes: a background, a colour band, a line, a circle — the furniture of a
 * business card. Stored as width + aspect, so a corner drag keeps proportion
 * and the inspector sets width and height separately. */
function drawShape(g, l) {
  const w = l.w, h = l.w * l.ar;
  g.fillStyle = l.fill;
  g.beginPath();
  if (l.shape === "ellipse") g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (g.roundRect && l.radius) g.roundRect(-w / 2, -h / 2, w, h, Math.min(l.radius, w / 2, h / 2));
  else g.rect(-w / 2, -h / 2, w, h);
  g.fill();
}

/* QR codes are drawn module by module as filled squares, so they stay vector-
 * sharp at print size. A quiet zone is part of the layer's size. */
const qrCache = new Map();
export function qrModules(data) {
  const key = String(data || " ");
  if (!qrCache.has(key)) {
    const q = qrcode(0, "M"); q.addData(key); q.make();
    const n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) m.push([c, r]);
    if (qrCache.size > 50) qrCache.clear();
    qrCache.set(key, { n, m });
  }
  return qrCache.get(key);
}
function drawQr(g, l) {
  const { n, m } = qrModules(l.data);
  const quiet = 2, cell = l.w / (n + quiet * 2), o = -l.w / 2 + quiet * cell;
  if (l.bg) { g.fillStyle = l.bg; g.fillRect(-l.w / 2, -l.w / 2, l.w, l.w); }
  g.fillStyle = l.colour;
  g.beginPath();
  for (const [c, r] of m) g.rect(o + c * cell - 0.002, o + r * cell - 0.002, cell + 0.004, cell + 0.004);
  g.fill();
}

/*
 * Text is drawn at true pixel size rather than as 1-unit-per-mm glyphs scaled
 * up, because browsers rasterise fonts at the requested px size: a 12 px font
 * scaled 8× is a blurry 12 px font.
 */
function drawText(g, l, pxPerMm) {
  const m = textMetrics(l);
  g.scale(1 / pxPerMm, 1 / pxPerMm);
  const px = l.size * pxPerMm;
  g.font = fontCss(l, px);
  if ("letterSpacing" in g) g.letterSpacing = `${l.spacing * px}px`;
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.fillStyle = l.colour;
  g.strokeStyle = l.outlineColour;
  g.lineWidth = l.outline * 2 * pxPerMm;

  const paint = (t, x, y) => {
    if (l.outline > 0) g.strokeText(t, x, y);
    g.fillText(t, x, y);
  };

  if (m.R) {
    // Along an arc. Positive arc bends up like a smile turned over (a badge top).
    const R = m.R * pxPerMm, dir = Math.sign(l.arc);
    const total = (m.widths[0] * pxPerMm) / R;
    const cy = dir * (R - (m.box.h * pxPerMm) / 2 + px * LINE / 2);
    g.textAlign = "center";
    let ang = -total / 2;
    for (const ch of [...m.lines[0]]) {
      const cw = g.measureText(ch).width;
      ang += cw / 2 / R;
      g.save();
      g.translate(R * Math.sin(ang), cy - dir * R * Math.cos(ang));
      g.rotate(dir * ang);
      paint(ch, 0, 0);
      g.restore();
      ang += cw / 2 / R;
    }
    return;
  }

  g.textAlign = l.align;
  const boxW = m.box.w * pxPerMm;
  const x = l.align === "left" ? -boxW / 2 : l.align === "right" ? boxW / 2 : 0;
  const lh = px * LINE;
  m.lines.forEach((t, i) => paint(t, x, (i - (m.lines.length - 1) / 2) * lh));
}

/**
 * Render a surface's design to its own canvas, at trim size.
 * This is the texture the mockups wrap onto their products.
 */
export function composeSurface(layers, assets, area, maxPx = 1024, background = null) {
  const k = Math.min(maxPx / area.w, maxPx / area.h);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(area.w * k));
  c.height = Math.max(1, Math.round(area.h * k));
  const g = c.getContext("2d");
  if (background) { g.fillStyle = background; g.fillRect(0, 0, c.width, c.height); }
  g.setTransform(k, 0, 0, k, c.width / 2, c.height / 2);
  for (const l of layers || []) drawLayer(g, l, assets, k);
  return c;
}

/** Load every font a design uses before drawing it, or canvas falls back silently. */
export async function ensureFonts(layers) {
  const want = new Set();
  for (const l of layers) if (l.kind === "text") want.add(fontCss(l, 40));
  await Promise.all([...want].map((f) => document.fonts.load(f).catch(() => null)));
}
