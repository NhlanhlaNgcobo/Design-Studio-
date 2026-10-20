/* The design document.
 *
 * A design is a stack of LAYERS per SURFACE, positioned in millimetres from the
 * centre of that surface's print area. Millimetres, not pixels or percentages:
 * a percentage means nothing once the file leaves the browser, a millimetre is
 * an instruction the printer can follow.
 *
 *   image layer  { id, kind:"image", assetId, x, y, w, rot }
 *   text layer   { id, kind:"text",  text, font, weight, italic, colour, size,
 *                  align, spacing, outline, outlineColour, arc, x, y, rot }
 *
 * Assets (the uploaded files) live outside the undo history. History snapshots
 * only the small JSON of layers, so undo is instant however big the artwork is.
 */

let seq = 1;
export const uid = (p = "l") => p + Date.now().toString(36) + (seq++).toString(36);

export const FONTS = [
  { family: "Archivo", label: "Archivo", weights: [400, 700, 900] },
  { family: "Anton", label: "Anton", weights: [400] },
  { family: "Bebas Neue", label: "Bebas Neue", weights: [400] },
  { family: "Oswald", label: "Oswald", weights: [500, 700] },
  { family: "Montserrat", label: "Montserrat", weights: [500, 800] },
  { family: "Playfair Display", label: "Playfair", weights: [700, 900] },
  { family: "Permanent Marker", label: "Marker", weights: [400] },
  { family: "Pacifico", label: "Pacifico", weights: [400] },
  { family: "Kalam", label: "Kalam", weights: [700] },
  { family: "JetBrains Mono", label: "Mono", weights: [500, 800] },
];

export function newTextLayer(surf, colour = "#14161A") {
  return {
    id: uid(), kind: "text", text: "Your text", font: "Archivo", weight: 900, italic: false,
    colour, size: Math.max(6, Math.round(Math.min(surf.w, surf.h) * 0.12)),
    align: "center", spacing: 0, outline: 0, outlineColour: "#FFFFFF", arc: 0,
    x: 0, y: 0, rot: 0,
  };
}

export class History {
  constructor(limit = 80) { this.past = []; this.future = []; this.limit = limit; }
  push(snap) {
    const s = JSON.stringify(snap);
    if (this.past.at(-1) === s) return;
    this.past.push(s);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(current) {
    if (this.past.length < 2) return null;
    this.future.push(this.past.pop());
    return JSON.parse(this.past.at(-1));
  }
  redo() {
    if (!this.future.length) return null;
    const s = this.future.pop();
    this.past.push(s);
    return JSON.parse(s);
  }
  get canUndo() { return this.past.length > 1; }
  get canRedo() { return this.future.length > 0; }
}

/**
 * Carry a design across when the customer switches product.
 *
 * Someone who has placed their logo on a T-shirt and then wonders about a
 * hoodie should see the logo on the hoodie, not start again. Surfaces with the
 * same id (front → front, back → back) inherit. The design scales with the
 * print area, so it looks the same relative to the product — a chest logo
 * moved onto a 3 m banner should fill the banner the way it filled the chest,
 * not arrive as a dot. If that stretches a raster past its resolution, the DPI
 * check says so. A product with no matching surface takes the old first
 * surface's design on its own first surface.
 */
export function carryOver(designs, fromProduct, toProduct, sizeOf) {
  const out = {};
  const fromIds = fromProduct.surfaces.map((s) => s.id);
  for (const s of toProduct.surfaces) {
    let srcId = designs[s.id]?.length ? s.id : null;
    if (!srcId && s === toProduct.surfaces[0] && !toProduct.surfaces.some((t) => designs[t.id]?.length))
      srcId = fromIds.find((id) => designs[id]?.length);
    if (!srcId) continue;
    const a = sizeOf(fromProduct, fromProduct.surfaces.find((x) => x.id === srcId));
    const b = sizeOf(toProduct, s);
    const k = Math.min(b.w / a.w, b.h / a.h);
    out[s.id] = designs[srcId].map((l) => ({
      ...l, id: uid(), x: l.x * k, y: l.y * k,
      ...(l.kind === "image" ? { w: l.w * k } : { size: l.size * k }),
    }));
  }
  return out;
}

/* ─────────────────────────── draft persistence ───────────────────────────
 * IndexedDB, because the draft includes the customer's original files and
 * those can be tens of megabytes. localStorage would refuse them. Everything
 * is wrapped: a private window or blocked storage simply means no draft. */

const DB = "eminence-studio", STORE = "draft";
function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveDraft(state, assets) {
  try {
    const db = await open();
    const used = new Set(Object.values(state.designs).flat().filter((l) => l.kind === "image").map((l) => l.assetId));
    const files = [...assets.values()].filter((a) => used.has(a.id))
      .map((a) => ({ id: a.id, file: a.file, name: a.name, bgRemoved: a.bgRemoved }));
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ state: JSON.parse(JSON.stringify(state)), files, at: Date.now() }, "current");
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    db.close();
    return true;
  } catch { return false; }
}
export async function loadDraft() {
  try {
    const db = await open();
    const v = await new Promise((res, rej) => {
      const r = db.transaction(STORE).objectStore(STORE).get("current");
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    db.close();
    return v || null;
  } catch { return null; }
}
export async function clearDraft() {
  try {
    const db = await open();
    db.transaction(STORE, "readwrite").objectStore(STORE).delete("current");
    db.close();
  } catch { /* nothing to clear */ }
}
