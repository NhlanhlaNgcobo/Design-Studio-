/* Print-ready PNGs: one per printed side, at its true size.
 *
 * The proof sheet shows WHERE and HOW BIG; these are WHAT to print. Each is
 * the side's whole design drawn at production resolution with the same
 * compose() the editor uses, so it cannot differ from what the customer saw:
 *
 *   size        the print area in mm, plus the bleed on paper and banners
 *   resolution  300 dpi, or the product's own minimum for large format,
 *               capped at ~50 megapixels so a phone can still make it
 *   background  transparent: garments print only the artwork; paper is the
 *               stock colour, so anything unprinted stays paper
 *   DPI tag     written into the PNG (pHYs chunk), so Photoshop, RIP software
 *               and the DTF printer open it at the right physical size
 */

import { composeSurface } from "./compose.js";

const MAX_PX = 50e6;

export function printDpi(product, wMm, hMm) {
  const want = wMm > 600 || hMm > 600 ? product.minDpi || 150 : Math.max(300, product.minDpi || 300);
  const cap = Math.sqrt(MAX_PX / ((wMm / 25.4) * (hMm / 25.4)));
  return Math.max(72, Math.floor(Math.min(want, cap)));
}

/**
 * @param surfaces [{ id, label, layers, area:{w,h,bleed} }]
 * @returns [{ id, name, blob, wMm, hMm, dpi, px:[w,h] }]
 */
export async function makePrintFiles({ ref, product, surfaces, assets, base = null }) {
  const out = [];
  for (const s of surfaces) {
    const W = s.area.w + 2 * (s.area.bleed || 0), H = s.area.h + 2 * (s.area.bleed || 0);
    const dpi = printDpi(product, W, H);
    // Printed-colour products (gazebo canopy, banners, flags): the chosen
    // background colour is part of what is printed, so it is in the file.
    const c = composeSurface(s.layers, assets, { w: W, h: H }, Math.max(W, H) * (dpi / 25.4), base);
    const blob = await withDpi(await new Promise((r) => c.toBlob(r, "image/png")), dpi);
    out.push({ id: s.id, name: `${ref}-${s.id}-${Math.round(W)}x${Math.round(H)}mm-${dpi}dpi.png`, blob, wMm: W, hMm: H, dpi, px: [c.width, c.height] });
    c.width = c.height = 0;                       // free the big canvas before the next one
  }
  return out;
}

/* ── PNG pHYs: physical pixel size, in pixels per metre ── */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export async function withDpi(blob, dpi) {
  const png = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const v = new DataView(chunk.buffer);
  v.setUint32(0, 9);                                        // data length
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);                   // "pHYs"
  v.setUint32(8, ppm); v.setUint32(12, ppm); chunk[16] = 1;  // x, y, unit = metre
  v.setUint32(17, crc32(chunk.subarray(4, 17)));
  // Insert straight after IHDR (8-byte signature + 25-byte IHDR chunk).
  const at = 8 + 25;
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, at)); out.set(chunk, at); out.set(png.subarray(at), at + chunk.length);
  return new Blob([out], { type: "image/png" });
}
