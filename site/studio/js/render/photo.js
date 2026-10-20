/* Photographed blanks.
 *
 * DesignCo's honest gap was "blanks are drawn, not photographed": Printful's
 * realism comes from a real photo of a real garment plus a displacement map
 * built from that photo. This is that pipeline, and it needs exactly ONE file
 * per view — a photo of a WHITE garment on a transparent background. Everything
 * else is derived from it:
 *
 *   shading   the photo's own luminance, normalised so flat fabric = 1.0.
 *             Folds are < 1, highlights > 1.
 *   colour    any garment colour = colour × shading, plus a highlight term so a
 *             black shirt still shows its folds (multiply alone flattens black).
 *   warp      the gradient of the blurred shading pushes the artwork along the
 *             folds, so the print bends with the cloth.
 *   lighting  artwork is composited UNDER the same shading — a fold's shadow
 *             falls across the print, as on the drawn garments.
 *
 * Blanks are listed in studio/blanks/manifest.json (format in ASSETS.md). With
 * no manifest, or no entry for a view, the drawn SVG garment is used instead,
 * so the Studio works before a single photo exists.
 */

let manifest = null, loading = null;
const cache = new Map();

export async function loadManifest(base = "/studio/blanks/") {
  if (manifest) return manifest;
  if (!loading) loading = fetch(base + "manifest.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : { blanks: {} }))
    .catch(() => ({ blanks: {} }))
    .then((m) => { manifest = { ...m, base }; return manifest; });
  return loading;
}

/** The manifest entry for a product view, if a photo exists for it. */
export function blankFor(productId, view) {
  return manifest?.blanks?.[`${productId}/${view}`] ?? null;
}

async function prepare(entry) {
  const key = entry.src;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const img = new Image();
    img.src = manifest.base + entry.src;
    await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;

    // Luminance, and the reference "flat fabric" level: the 85th percentile of
    // garment pixels. Using the max would let one specular glint darken the
    // whole shirt.
    const L = new Float32Array(w * h), A = new Uint8ClampedArray(w * h);
    const hist = new Uint32Array(256);
    for (let i = 0, p = 0; p < w * h; i += 4, p++) {
      A[p] = d[i + 3];
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      L[p] = l;
      if (d[i + 3] > 200) hist[l | 0]++;
    }
    let total = hist.reduce((a, b) => a + b, 0), acc = 0, ref = 230;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.85) { ref = v; break; } }
    for (let p = 0; p < L.length; p++) L[p] /= ref;

    // Displacement field from the blurred shading's gradient.
    const B = boxBlur(L, w, h, Math.round(Math.max(w, h) / 160));
    const DX = new Float32Array(w * h), DY = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      DX[p] = B[p + 1] - B[p - 1];
      DY[p] = B[p + w] - B[p - w];
    }
    return { img, w, h, L, A, DX, DY };
  })();
  cache.set(key, p);
  return p;
}

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let s = 0; const row = y * w;
    for (let x = -r; x <= r; x++) s += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = s / (2 * r + 1);
      s += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / (2 * r + 1);
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/**
 * Composite a photo blank.
 * @param canvas   target
 * @param entry    manifest entry { src, pxPerMm, chestMm, areas: { surfaceId: {cx, cy, rot} } }
 * @param o        { colour, sizeChestMm, placements: [{ surfaceId, wMm, hMm, texCanvas, outline }] }
 */
export async function drawPhoto(canvas, entry, o, opts = {}) {
  const b = await prepare(entry);
  const { w, h } = b;
  canvas.width = w; canvas.height = h;
  if (!opts.w) { canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.objectFit = "contain"; }
  const g = canvas.getContext("2d", { willReadFrequently: true });

  // 1. Artwork, placed in photo pixels, on its own layer.
  const art = document.createElement("canvas"); art.width = w; art.height = h;
  const ag = art.getContext("2d");
  const k = entry.pxPerMm * ((entry.chestMm || o.sizeChestMm) / (o.sizeChestMm || entry.chestMm));
  for (const p of o.placements) {
    const a = entry.areas[p.surfaceId];
    if (!a || !p.texCanvas) continue;
    ag.save();
    ag.translate(a.cx, a.cy); ag.rotate(((a.rot || 0) * Math.PI) / 180);
    ag.drawImage(p.texCanvas, (-p.wMm * k) / 2, (-p.hMm * k) / 2, p.wMm * k, p.hMm * k);
    ag.restore();
  }
  const ad = ag.getImageData(0, 0, w, h).data;

  // 2. Per pixel: garment colour, displaced artwork over it, then the light.
  const C = rgb(o.colour);
  const out = g.createImageData(w, h), od = out.data;
  const WARP = Math.max(w, h) * 0.012;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const alpha = b.A[p];
    if (!alpha) continue;
    const s = b.L[p];
    let r = C[0], gg = C[1], bl = C[2];

    // displaced lookup into the artwork layer
    const x = (p % w) + b.DX[p] * WARP, y = ((p / w) | 0) + b.DY[p] * WARP;
    const xi = x | 0, yi = y | 0;
    if (xi >= 0 && yi >= 0 && xi < w && yi < h) {
      const j = (yi * w + xi) * 4, aa = ad[j + 3] / 255;
      if (aa) { r = r * (1 - aa) + (ad[j] / 255) * aa; gg = gg * (1 - aa) + (ad[j + 1] / 255) * aa; bl = bl * (1 - aa) + (ad[j + 2] / 255) * aa; }
    }
    const sh = Math.min(s, 1.04);
    const hl = Math.max(0, s - 0.9) * 0.65;              // keeps folds visible on dark cloth
    od[i] = 255 * Math.min(1, r * sh + (1 - r) * hl);
    od[i + 1] = 255 * Math.min(1, gg * sh + (1 - gg) * hl);
    od[i + 2] = 255 * Math.min(1, bl * sh + (1 - bl) * hl);
    od[i + 3] = alpha;
  }
  g.putImageData(out, 0, 0);

  // 3. Editing outline (never in an export).
  if (!opts.w) for (const p of o.placements) {
    const a = entry.areas[p.surfaceId];
    if (!a || !p.outline) continue;
    g.save(); g.translate(a.cx, a.cy); g.rotate(((a.rot || 0) * Math.PI) / 180);
    g.setLineDash([12, 9]); g.strokeStyle = "rgba(229,0,126,.85)"; g.lineWidth = Math.max(2, w / 400);
    g.strokeRect((-p.wMm * k) / 2, (-p.hMm * k) / 2, p.wMm * k, p.hMm * k);
    g.restore();
  }
}
