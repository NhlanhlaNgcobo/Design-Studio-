/* One entry point for every mockup.
 *
 *   renderMockup(stage, ctx)       draw live into the stage element
 *   snapshotMockup(ctx, w, h)      → canvas, for the proof sheet and downloads
 *
 * ctx = { productId, product, size, colour, tex, texCanvas, active, view,
 *         yaw, pitch, options }
 *   tex        surfaceId → URL (SVG renderers)
 *   texCanvas  surfaceId → canvas (canvas renderers, photo blanks)
 *
 * Exports never show the dashed "you are editing this" outline: a buyer
 * forwarding the proof to their boss should see the product, not our UI.
 */

import { surfaceSize } from "../products.js";
import { garmentSvg, capSvg, toteSvg } from "./garment.js";
import { paperSvg, bannerSvg, flagSvg, shopfrontSvg } from "./flat.js";
import { vehicleSvg } from "./vehicle.js";
import { drawGazebo } from "./gazebo.js";
import { drawMug } from "./mug.js";
import { blankFor, drawPhoto } from "./photo.js";

const CANVAS_KINDS = new Set(["gazebo", "mug"]);
const GARMENT_KINDS = new Set(["garment", "cap", "tote"]);

/** Which side of the product to show: the side of the surface being edited. */
export function viewFor(product, surfaceId) {
  return product.surfaces.find((s) => s.id === surfaceId)?.view ?? product.surfaces[0].view;
}

/** The views a proof should show — every side that carries a design. */
export function viewsWithDesign(product, designed) {
  const views = [];
  for (const s of product.surfaces) if (designed.has(s.id) && !views.includes(s.view)) views.push(s.view);
  return views.length ? views : [product.surfaces[0].view];
}

function placements(ctx, view, outline) {
  const { product, size } = ctx;
  return product.surfaces
    .filter((s) => s.view === view)
    .map((s) => {
      const a = surfaceSize(product, size, s);
      return { surfaceId: s.id, wMm: a.w, hMm: a.h, tex: ctx.tex[s.id], texCanvas: ctx.texCanvas[s.id], outline: outline && s.id === ctx.active };
    })
    .filter((p) => p.tex || p.outline);
}

function svgFor(ctx, view, outline) {
  const { product, size, colour } = ctx;
  const active = outline ? ctx.active : null;
  switch (product.render) {
    case "garment": return garmentSvg({ fit: product.fit, colour, view, widthMm: size.w, areas: placements(ctx, view, outline), seed: 3 + product.fit.length * 7 });
    case "cap": return capSvg({ colour, areas: placements(ctx, view, outline) });
    case "tote": return toteSvg({ colour, areas: placements(ctx, view, outline) });
    case "paper": return paperSvg({ product, size, tex: ctx.tex, active: outline ? (ctx.active ?? "front") : (view === "back" ? "back" : "front") });
    case "banner": return bannerSvg({ product, size, tex: ctx.tex, active: !!active });
    case "flag": return flagSvg({ size, tex: ctx.tex.face, active: !!active });
    case "shopfront": return shopfrontSvg({ size, tex: ctx.tex, colour, active: !!active, options: ctx.options });
    case "vehicle": {
      const surf = product.surfaces.find((s) => s.view === view) ?? product.surfaces[0];
      return vehicleSvg({ product, size, tex: ctx.tex, colour, active: outline ? ctx.active : surf.id });
    }
  }
  return "";
}

/* For the vehicle the "active" surface also chooses the side shown, so an
 * export of a given view passes that view's surface without its outline. */
function stripUi(svg) { return svg.replace(/<[^>]+class="ui-only"[^>]*\/>/g, ""); }

const lastSvgs = new WeakMap();
export async function renderMockup(stage, ctx) {
  const { product } = ctx;
  const view = ctx.view ?? viewFor(product, ctx.active);
  const guides = ctx.showGuides !== false;

  if (CANVAS_KINDS.has(product.render) || (GARMENT_KINDS.has(product.render) && blankFor(ctx.productId, view))) {
    let c = stage.querySelector("canvas.mock");
    if (!c) { stage.innerHTML = `<canvas class="mock" aria-label="Product preview"></canvas>`; c = stage.firstChild; lastSvgs.delete(stage); }
    if (product.render === "gazebo") drawGazebo(c, { ...ctx, active: guides ? ctx.active : null });
    else if (product.render === "mug") drawMug(c, { ...ctx, active: guides ? ctx.active : null });
    else await drawPhoto(c, blankFor(ctx.productId, view), { colour: ctx.colour, sizeChestMm: ctx.size.w, placements: placements(ctx, view, guides) });
    return;
  }
  const raw = svgFor(ctx, view, guides);
  const svg = guides ? raw : stripUi(raw);
  if (svg !== lastSvgs.get(stage)) { stage.innerHTML = svg; lastSvgs.set(stage, svg); }
}

/**
 * Render one view to a canvas of the given size. `ctx.tex` must hold DATA
 * URLs here: an SVG drawn into an <img> may not load blob: or remote URLs.
 */
export async function snapshotMockup(ctx, view, w, h) {
  const { product } = ctx;
  const c = document.createElement("canvas");
  if (product.render === "gazebo") { c.width = w; c.height = h; drawGazebo(c, { ...ctx, active: null }, { w, h }); return c; }
  if (product.render === "mug") { c.width = w; c.height = h; drawMug(c, { ...ctx, active: null }, { w, h }); return c; }
  const blank = GARMENT_KINDS.has(product.render) && blankFor(ctx.productId, view);
  if (blank) {
    const p = document.createElement("canvas");
    await drawPhoto(p, blank, { colour: ctx.colour, sizeChestMm: ctx.size.w, placements: placements(ctx, view, false) }, { w, h });
    return fit(p, w, h);
  }
  const svg = stripUi(svgFor(ctx, view, false))
    .replace('width="100%" height="100%"', `width="${w}" height="${h}"`);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return c;
}

function fit(src, w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const k = Math.min(w / src.width, h / src.height);
  c.getContext("2d").drawImage(src, (w - src.width * k) / 2, (h - src.height * k) / 2, src.width * k, src.height * k);
  return c;
}
