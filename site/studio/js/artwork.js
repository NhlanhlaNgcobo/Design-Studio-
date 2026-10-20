/* Artwork: loading, inspecting and cleaning up what the customer uploads.
 *
 * Three things here that a print shop checks by hand today, done at upload:
 *
 *  1. RESOLUTION — natural pixel size, so the DPI check knows what it has.
 *  2. INK COLOURS — screen printing is priced per colour, so a logo's colour
 *     count IS its price. Counting them here means the quote is right before
 *     anyone at Eminence opens the file.
 *  3. THE WHITE BOX — most logos arrive as a JPG on a white rectangle. On a
 *     white shirt nobody notices; on a black shirt it prints a white box.
 *     One click removes it, and the order notes that it was removed so
 *     production does it properly from the original.
 *
 * The original file is always kept untouched. Everything shown on screen is a
 * derivative; production receives the bytes the customer uploaded.
 */

import { isVector } from "./products.js";

let nextId = 1;
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MAX_BYTES = 40 * 1024 * 1024;
const ACCEPT = /\.(png|jpe?g|webp|gif|svg|pdf|ai|eps)$/i;

/**
 * Load a file into an asset.
 * @returns {Promise<Asset>}
 *   { id, name, type, size, file, vector, natW, natH, source (drawable),
 *     colours: [{hex, share}], photo: bool, hasAlpha: bool, preview: bool }
 */
export async function loadAsset(file) {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is ${(file.size / 1048576).toFixed(0)} MB — the limit is 40 MB. Send big files on WhatsApp or WeTransfer instead.`);
  if (!ACCEPT.test(file.name) && !/^image\//.test(file.type)) throw new Error(`${file.name} isn't a file we can print from. Send PNG, JPG, SVG or PDF.`);

  const asset = {
    id: "a" + nextId++, name: file.name, type: file.type, size: file.size, file,
    vector: isVector(file.type, file.name), natW: 0, natH: 0, source: null,
    colours: [], photo: false, hasAlpha: false, preview: true, bgRemoved: false,
  };

  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    asset.source = await renderPdf(file).catch(() => null);
    // A PDF has no pixel size of its own; we know the page size in points.
    asset.vector = true;
  } else if (/\.(ai|eps)$/i.test(file.name)) {
    // Browsers cannot draw these. Keep the file for production and stand in a
    // labelled placeholder so the customer can still place it.
    asset.source = placeholder(file.name);
    asset.preview = false;
  } else {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    if (asset.vector) {
      // An SVG with no width/height reports 0×0 or 150×150 depending on browser;
      // draw it big enough to stay crisp at any preview size.
      const s = 2000 / Math.max(img.naturalWidth || 300, img.naturalHeight || 150);
      asset.source = rasterise(img, (img.naturalWidth || 300) * s, (img.naturalHeight || 150) * s);
    } else {
      asset.source = img;
      asset.natW = img.naturalWidth;
      asset.natH = img.naturalHeight;
    }
  }

  if (asset.source) analyse(asset);
  return asset;
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("That file wouldn't open. Is it a real image?"));
    i.src = src;
  });
}

function rasterise(img, w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function placeholder(name) {
  const c = document.createElement("canvas");
  c.width = 800; c.height = 500;
  const g = c.getContext("2d");
  g.fillStyle = "#F1EFEA"; g.fillRect(0, 0, 800, 500);
  g.strokeStyle = "#14161A"; g.setLineDash([18, 12]); g.lineWidth = 6; g.strokeRect(10, 10, 780, 480);
  g.fillStyle = "#14161A"; g.textAlign = "center";
  g.font = "700 46px Archivo, system-ui, sans-serif"; g.fillText(name.length > 26 ? name.slice(0, 24) + "…" : name, 400, 230);
  g.font = "400 30px Archivo, system-ui, sans-serif"; g.fillText("Vector file — placed as shown, previewed by us", 400, 290);
  return c;
}

/** Page 1 of a PDF, rendered with pdf.js — loaded only when a PDF arrives. */
async function renderPdf(file) {
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = PDFJS; s.onload = res; s.onerror = () => rej(new Error("pdf.js unavailable"));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  }
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: 2000 / Math.max(base.width, base.height) });
  const c = document.createElement("canvas");
  c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  // Transparent background: a logo PDF should not arrive as a white box.
  await page.render({ canvasContext: c.getContext("2d"), viewport: vp, background: "rgba(0,0,0,0)" }).promise;
  return c;
}

/* ─────────────────────────── colour analysis ─────────────────────────── */

const hex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

/**
 * Count the ink colours a design really uses.
 *
 * Bucketed at 4 bits per channel, then near neighbours merged, because
 * anti-aliased edges create hundreds of in-between shades that are not
 * separate inks — a two-colour logo has a two-colour price. Anything under 1.5%
 * of the inked area is treated as edge noise. More than eight survivors means a
 * photo or a gradient, which cannot be screen printed in spot colours at all.
 */
export function analyse(asset) {
  const S = 160;
  const src = asset.source;
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
  const k = Math.min(1, S / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;

  const buckets = new Map();
  let inked = 0, transparent = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { transparent++; continue; }
    inked++;
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2];
    buckets.set(key, b);
  }
  asset.hasAlpha = transparent > (d.length / 4) * 0.02;

  const clusters = [];
  for (const b of [...buckets.values()].sort((x, y) => y.n - x.n)) {
    const col = [b.r / b.n, b.g / b.n, b.b / b.n];
    const near = clusters.find((cl) => Math.hypot(cl.c[0] - col[0], cl.c[1] - col[1], cl.c[2] - col[2]) < 56);
    if (near) {
      const t = near.n + b.n;
      near.c = near.c.map((v, j) => (v * near.n + col[j] * b.n) / t);
      near.n = t;
    } else clusters.push({ c: col, n: b.n });
  }
  const real = clusters.filter((cl) => cl.n / Math.max(1, inked) >= 0.015);
  asset.colours = real.map((cl) => ({ hex: hex(...cl.c.map(Math.round)), share: cl.n / inked }));
  asset.photo = real.length > 8;
  asset.whiteBox = !asset.hasAlpha && edgeIsFlat(d, c.width, c.height);
  return asset;
}

/** True when the whole border is one flat light colour — the "logo on a white box" case. */
function edgeIsFlat(d, w, h) {
  let n = 0, light = 0;
  const at = (x, y) => { const i = (y * w + x) * 4; n++; if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) light++; };
  for (let x = 0; x < w; x++) { at(x, 0); at(x, h - 1); }
  for (let y = 0; y < h; y++) { at(0, y); at(w - 1, y); }
  return light / n > 0.92;
}

/**
 * Swap in the background-free version and re-count its inks, so a black logo
 * that arrived on a white box is priced as one colour, not two.
 */
export function applyBackgroundRemoval(asset) {
  if (asset.bgRemoved) return asset;
  asset.original = asset.source;
  asset.source = removeBackground(asset);
  asset.bgRemoved = true;
  analyse(asset);
  asset.whiteBox = false;
  return asset;
}

export function restoreBackground(asset) {
  if (!asset.bgRemoved) return asset;
  asset.source = asset.original;
  asset.bgRemoved = false;
  analyse(asset);
  return asset;
}

/* ─────────────────────────── background removal ─────────────────────────── */

/**
 * Remove a flat background by flood-filling inward from the edges.
 *
 * Flood fill, not a global colour key: a logo with white lettering INSIDE it
 * keeps its white, because those pixels are not connected to the border. Edge
 * pixels get partial alpha by how far they are from the background colour,
 * which keeps anti-aliased curves smooth instead of jagged.
 *
 * @returns {HTMLCanvasElement} a new drawable; the asset's original is untouched.
 */
export function removeBackground(asset, tolerance = 34) {
  const src = asset.original ?? asset.source;
  const W0 = src.naturalWidth || src.width, H0 = src.naturalHeight || src.height;
  const k = Math.min(1, 3000 / Math.max(W0, H0));
  const w = Math.round(W0 * k), h = Math.round(H0 * k);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h), d = im.data;

  // Background = the most common border colour.
  const tally = new Map();
  const sample = (x, y) => { const i = (y * w + x) * 4; const key = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | d[i + 2] >> 3; tally.set(key, (tally.get(key) || 0) + 1); };
  for (let x = 0; x < w; x += 2) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y += 2) { sample(0, y); sample(w - 1, y); }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const bg = [((top >> 10) & 31) * 8 + 4, ((top >> 5) & 31) * 8 + 4, (top & 31) * 8 + 4];

  const dist = (i) => Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]);
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { const p = y * w + x; if (!seen[p]) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  const soft = tolerance * 1.8;
  while (stack.length) {
    const p = stack.pop(), i = p * 4, dd = dist(i);
    if (dd > soft) continue;                         // reached the artwork
    // inside tolerance: fully clear; in the soft band: fade, and stop spreading
    d[i + 3] = dd <= tolerance ? 0 : Math.round(d[i + 3] * ((dd - tolerance) / (soft - tolerance)));
    if (dd > tolerance) continue;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  g.putImageData(im, 0, 0);
  return c;
}
