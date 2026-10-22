/* Garments, caps and bags, drawn as SVG.
 *
 * Ported from the DesignCo studio, where three lessons were learned the hard way:
 *
 * 1. LAYER ORDER. Artwork goes UNDER the lighting:
 *       base colour → artwork → shading (multiply) → highlight (screen)
 *    so the shadow under a collar falls across the print the way it falls across
 *    the cloth. Artwork on top reads as a sticker.
 * 2. PROCEDURAL CLOTH. feTurbulence + feDisplacementMap bend the print over slack
 *    fabric; a coarser noise field supplies the soft folds. The same trick every
 *    mockup generator uses, with the map generated instead of photographed.
 * 3. FIT. An oversized tee is not a big regular tee — boxier, lower armpit,
 *    dropped shoulder. Every silhouette comes from one path generator fed
 *    different measurements.
 *
 * New for Eminence: the golf shirt (their corporate-wear staple — collar,
 * three-button placket, no full-front print because the placket is in the way),
 * sleeve and back-neck placements, the tote bag, and placements fed by a
 * composed texture rather than one image with sliders.
 *
 * When a photographed blank exists for a product (see ASSETS.md), photo.js is
 * used instead and this file is the fallback.
 */

const esc = (s) => String(s).replace(/"/g, "&quot;").replace(/&(?!quot;|amp;)/g, "&amp;");

const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };

/* Shading strength. The fold and weave layers are multiplied, and at full
 * strength they turn a white shirt grey — it read as grey melange, not white.
 * Light cloth shows its folds more softly anyway. */
const shadeStrength = (colour) => (lum(colour) > 0.75 ? 0.55 : lum(colour) > 0.45 ? 0.8 : 1);

export function shade(colour, amount) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
  if (!m) return colour;
  const v = m.slice(1).map((h) => Math.max(0, Math.min(255, Math.round(parseInt(h, 16) * amount))));
  return "#" + v.map((n) => n.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ fits ---
 * `torso` in viewBox units spans `chestMm`; sleeve-to-sleeve spans the full 1000.
 * Area positions are centres in viewBox units; sizes come from the product.
 * "Left chest" sits on the VIEWER'S RIGHT — it is the wearer's left.
 */
export const FITS = {
  regular: {
    view: { w: 1000, h: 1160 }, torso: [172, 828],
    shoulderY: 150, shoulderDip: 118,
    sleeve: { tipX: 38, topY: 300, cuffOutX: 72, cuffOutY: 452, cuffInX: 158, cuffInY: 470 },
    armpitY: 432, hem: { y: 1090, l: 182, r: 818 },
    neck: { front: { cy: 164, rx: 90, ry: 38 }, back: { cy: 150, rx: 88, ry: 20 } },
    areas: {
      "chest-left": { cx: 629, cy: 400 }, "chest-right": { cx: 371, cy: 400 },
      front: { cx: 500, cy: 560 }, back: { cx: 500, cy: 580 },
      neck: { cx: 500, cy: 262 }, "sleeve-right": { cx: 112, cy: 368, rot: 14 },
    },
  },
  oversized: {
    view: { w: 1000, h: 1100 }, torso: [140, 860],
    shoulderY: 164, shoulderDip: 136,
    sleeve: { tipX: 18, topY: 336, cuffOutX: 58, cuffOutY: 524, cuffInX: 146, cuffInY: 544 },
    armpitY: 502, hem: { y: 1034, l: 144, r: 856 },
    neck: { front: { cy: 212, rx: 116, ry: 54 }, back: { cy: 190, rx: 110, ry: 30 } },
    areas: {
      "chest-left": { cx: 648, cy: 430 }, front: { cx: 500, cy: 660 }, back: { cx: 500, cy: 650 },
      neck: { cx: 500, cy: 280 }, "sleeve-right": { cx: 92, cy: 430, rot: 12 },
    },
  },
  hoodie: {
    view: { w: 1000, h: 1200 }, torso: [152, 848],
    shoulderY: 258, shoulderDip: 232,
    sleeve: { tipX: 26, topY: 404, cuffOutX: 78, cuffOutY: 792, cuffInX: 166, cuffInY: 766 },
    armpitY: 530, hem: { y: 1118, l: 158, r: 842 },
    neck: { front: { cy: 300, rx: 118, ry: 46 }, back: { cy: 286, rx: 112, ry: 28 } },
    hood: true, pocket: true, ribbed: true,
    areas: {
      "chest-left": { cx: 646, cy: 500 }, front: { cx: 500, cy: 640 }, back: { cx: 500, cy: 680 },
      neck: { cx: 500, cy: 360 }, "sleeve-right": { cx: 98, cy: 560, rot: 8 },
    },
  },
  /* A golf shirt: regular block, slightly shorter sleeve with a ribbed band,
   * pointed knit collar and a placket down the centre front. */
  polo: {
    view: { w: 1000, h: 1160 }, torso: [176, 824],
    shoulderY: 150, shoulderDip: 120,
    sleeve: { tipX: 44, topY: 296, cuffOutX: 80, cuffOutY: 430, cuffInX: 164, cuffInY: 446 },
    armpitY: 424, hem: { y: 1080, l: 186, r: 814 },
    neck: { front: { cy: 168, rx: 92, ry: 34 }, back: { cy: 160, rx: 92, ry: 22 } },
    collar: true, cuffBand: true,
    areas: {
      "chest-left": { cx: 636, cy: 390 }, "chest-right": { cx: 364, cy: 390 },
      back: { cx: 500, cy: 520 }, neck: { cx: 500, cy: 250 }, "sleeve-right": { cx: 118, cy: 360, rot: 14 },
    },
  },
};

export const CAP_VIEW = { w: 1000, h: 700, crown: 640, widthMm: 200 };
const CAP_CROWN = "M 186 430 C 182 288, 232 160, 360 124 C 420 108, 580 108, 640 124 C 768 160, 818 288, 814 430 Z";
const CAP_PEAK = "M 228 424 C 242 468, 330 510, 436 522 C 470 526, 530 526, 564 522 C 670 510, 758 468, 772 424 C 730 402, 628 394, 500 394 C 372 394, 270 402, 228 424 Z";

function garmentPath(f, view = 'front') {
  const [L, R] = f.torso, s = f.sleeve;
  const n = f.neck[view] ?? f.neck.front;
  const { y: hemY, l: hemL, r: hemR } = f.hem;
  const tipR = 1000 - s.tipX, cuffOutR = 1000 - s.cuffOutX, cuffInR = 1000 - s.cuffInX;
  return [
    `M ${L} ${f.shoulderY}`,
    `C ${L - 46} ${f.shoulderY + 18}, ${s.tipX + 64} ${s.topY - 56}, ${s.tipX} ${s.topY}`,
    `C ${s.tipX - 10} ${s.topY + 44}, ${s.cuffOutX - 22} ${s.cuffOutY - 62}, ${s.cuffOutX} ${s.cuffOutY}`,
    `L ${s.cuffInX} ${s.cuffInY}`,
    `C ${s.cuffInX + 22} ${s.cuffInY - 16}, ${L - 10} ${f.armpitY + 22}, ${L} ${f.armpitY}`,
    `L ${hemL} ${hemY - 26}`,
    `C ${hemL} ${hemY - 8}, ${hemL + 12} ${hemY}, ${hemL + 28} ${hemY}`,
    `L ${hemR - 28} ${hemY}`,
    `C ${hemR - 12} ${hemY}, ${hemR} ${hemY - 8}, ${hemR} ${hemY - 26}`,
    `L ${R} ${f.armpitY}`,
    `C ${R + 10} ${f.armpitY + 22}, ${cuffInR - 22} ${s.cuffInY - 16}, ${cuffInR} ${s.cuffInY}`,
    `L ${cuffOutR} ${s.cuffOutY}`,
    `C ${cuffOutR + 22} ${s.cuffOutY - 62}, ${tipR + 10} ${s.topY + 44}, ${tipR} ${s.topY}`,
    `C ${tipR - 64} ${s.topY - 56}, ${R + 46} ${f.shoulderY + 18}, ${R} ${f.shoulderY}`,
    `L ${500 + n.rx + 15} ${f.shoulderDip}`,
    `C ${500 + n.rx} ${n.cy + n.ry + 35}, ${500 - n.rx} ${n.cy + n.ry + 35}, ${500 - n.rx - 15} ${f.shoulderDip}`,
    `L ${L} ${f.shoulderY}`,
    "Z",
  ].join(" ");
}

function hoodPath(f) {
  const [L, R] = f.torso, top = f.shoulderY - 196;
  return `M ${L + 76} ${f.shoulderY + 20} C ${L + 52} ${top + 96}, ${L + 150} ${top}, 500 ${top} ` +
    `C ${R - 150} ${top}, ${R - 52} ${top + 96}, ${R - 76} ${f.shoulderY + 20} ` +
    `C ${R - 220} ${f.shoulderY + 76}, ${L + 220} ${f.shoulderY + 76}, ${L + 76} ${f.shoulderY + 20} Z`;
}

export function defs(id, seed) {
  return `
    <linearGradient id="${id}-side" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset=".20" stop-color="#000" stop-opacity=".025"/>
      <stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity=".04"/>
      <stop offset="1" stop-color="#000" stop-opacity=".16"/>
    </linearGradient>
    <linearGradient id="${id}-drop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset=".24" stop-color="#000" stop-opacity="0"/>
      <stop offset=".80" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/>
    </linearGradient>
    <linearGradient id="${id}-lift" x1="0" y1="0" x2="1" y2="0">
      <stop offset=".18" stop-color="#fff" stop-opacity="0"/><stop offset=".40" stop-color="#fff" stop-opacity=".16"/>
      <stop offset=".58" stop-color="#fff" stop-opacity=".04"/><stop offset=".82" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="${id}-folds" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.0016" numOctaves="3" seed="${seed}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0"/>
    </filter>
    <filter id="${id}-glow" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.0016" numOctaves="3" seed="${seed}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.8 0 0 0 0"/>
    </filter>
    <filter id="${id}-weave" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seed + 11}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.35 0 0 0 0"/>
    </filter>
    <filter id="${id}-warp" x="-14%" y="-14%" width="128%" height="128%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.0042" numOctaves="2" seed="${seed + 3}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="34"/></filter>
    <filter id="${id}-cast" x="-25%" y="-15%" width="150%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000" flood-opacity=".13"/>
    </filter>`;
}

/**
 * One print placement in viewBox units: the composed texture for that surface,
 * at exactly its print-area size, so the mockup and the spec cannot drift.
 * `outline` marks the area being edited; snapshots strip `.ui-only`.
 */
function placement(p, upm, warpId) {
  const w = p.wMm * upm, h = p.hMm * upm;
  const { cx, cy, rot = 0 } = p.area;
  const t = `rotate(${rot} ${cx} ${cy})`;
  const img = p.tex
    ? `<g filter="url(#${warpId})"><image href="${esc(p.tex)}" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" preserveAspectRatio="none" transform="${t}"/></g>`
    : "";
  const box = p.outline
    ? `<rect class="ui-only" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="4" transform="${t}"
         fill="none" stroke="#E5007E" stroke-opacity=".8" stroke-width="3" stroke-dasharray="12 9"/>`
    : "";
  return { img, box };
}

/**
 * A garment, front or back.
 * @param {object} o { fit, colour, view: "front"|"back", widthMm, areas:[{surfaceId,wMm,hMm,tex,outline}], id, seed }
 */
export function garmentSvg({ fit, colour, view, widthMm, areas, id = "g", seed = 5 }) {
  const f = FITS[fit] ?? FITS.regular;
  const V = f.view;
  const upm = (f.torso[1] - f.torso[0]) / widthMm;
  const n = f.neck[view] ?? f.neck.front;
  const body = garmentPath(f, view);
  const placed = areas.filter((p) => f.areas[p.surfaceId]).map((p) => placement({ ...p, area: f.areas[p.surfaceId] }, upm, `${id}-warp`));
  const rib = shade(colour, 0.9), hole = shade(colour, 0.72);
  const [L, R] = f.torso, s = f.sleeve;

  const ribbing = f.ribbed ? `
    <g fill="none" stroke="#000" stroke-opacity=".17" stroke-width="2.5">
      <path d="M ${s.cuffOutX - 6} ${s.cuffOutY - 54} L ${s.cuffInX + 2} ${s.cuffInY - 50}"/>
      <path d="M ${1000 - s.cuffOutX + 6} ${s.cuffOutY - 54} L ${1000 - s.cuffInX - 2} ${s.cuffInY - 50}"/>
      <path d="M ${f.hem.l + 6} ${f.hem.y - 66} L ${f.hem.r - 6} ${f.hem.y - 66}"/>
    </g>` : "";

  // A golf shirt's sleeve ends in a knitted band.
  const band = f.cuffBand ? `
    <g fill="none" stroke="#000" stroke-opacity=".2" stroke-width="2.5">
      <path d="M ${s.cuffOutX - 4} ${s.cuffOutY - 30} L ${s.cuffInX + 2} ${s.cuffInY - 28}"/>
      <path d="M ${1000 - s.cuffOutX + 4} ${s.cuffOutY - 30} L ${1000 - s.cuffInX - 2} ${s.cuffInY - 28}"/>
    </g>` : "";

  const pocket = f.pocket && view === "front" ? `
    <path d="M ${L + 96} ${f.hem.y - 300} L ${R - 96} ${f.hem.y - 300} L ${R - 124} ${f.hem.y - 78} L ${L + 124} ${f.hem.y - 78} Z"
          fill="none" stroke="#000" stroke-opacity=".22" stroke-width="3"/>` : "";

  const hood = f.hood ? `<path d="${hoodPath(f)}" fill="${shade(colour, 0.88)}" stroke="#000" stroke-opacity=".16" stroke-width="3"/>` : "";
  const cords = f.hood && view === "front" ? `
    <g stroke="#000" stroke-opacity=".32" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="M ${500 - n.rx * 0.45} ${n.cy + n.ry - 4} C 460 ${n.cy + 92}, 452 ${n.cy + 128}, 456 ${n.cy + 152}"/>
      <path d="M ${500 + n.rx * 0.45} ${n.cy + n.ry - 4} C 540 ${n.cy + 92}, 548 ${n.cy + 128}, 544 ${n.cy + 152}"/>
    </g>` : "";

  // Golf-shirt neck: a placket with three buttons and two collar points over the
  // shoulders. From the back, just the collar band.
  // The stand is seen behind the neck; each flap runs from the back of the neck
  // down to a point beside the placket — tips close together, not out on the
  // shoulders, or it reads as a bow tie.
  const collar = !f.collar ? "" : view === "front" ? `
    <path d="M ${500 - n.rx - 14} ${n.cy - 6} C ${500 - n.rx} ${n.cy - 46}, ${500 + n.rx} ${n.cy - 46}, ${500 + n.rx + 14} ${n.cy - 6}
             C ${500 + n.rx - 30} ${n.cy - 22}, ${500 - n.rx + 30} ${n.cy - 22}, ${500 - n.rx - 14} ${n.cy - 6} Z"
          fill="${shade(colour, 0.8)}" stroke="#000" stroke-opacity=".2" stroke-width="2"/>
    <path d="M 476 ${n.cy + 6} L 524 ${n.cy + 6} L 524 ${n.cy + 220} L 476 ${n.cy + 220} Z" fill="${shade(colour, 0.97)}"
          stroke="#000" stroke-opacity=".2" stroke-width="2.5"/>
    ${[64, 120, 176].map((dy) => `<circle cx="500" cy="${n.cy + dy}" r="7.5" fill="${shade(colour, 0.8)}" stroke="#000" stroke-opacity=".3" stroke-width="2"/>`).join("")}
    <path d="M 498 ${n.cy + 10} L ${500 - n.rx - 14} ${n.cy - 8} C ${500 - n.rx - 22} ${n.cy + 40}, ${500 - n.rx + 10} ${n.cy + 92}, 446 ${n.cy + 124} Z"
          fill="${shade(colour, 0.95)}" stroke="#000" stroke-opacity=".24" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M 502 ${n.cy + 10} L ${500 + n.rx + 14} ${n.cy - 8} C ${500 + n.rx + 22} ${n.cy + 40}, ${500 + n.rx - 10} ${n.cy + 92}, 554 ${n.cy + 124} Z"
          fill="${shade(colour, 0.91)}" stroke="#000" stroke-opacity=".24" stroke-width="2.5" stroke-linejoin="round"/>` : `
    <path d="M ${500 - n.rx - 18} ${n.cy - 8} C ${500 - n.rx} ${n.cy - 44}, ${500 + n.rx} ${n.cy - 44}, ${500 + n.rx + 18} ${n.cy - 8}
             L ${500 + n.rx + 8} ${n.cy + 22} C ${500 + n.rx - 20} ${n.cy + 2}, ${500 - n.rx + 20} ${n.cy + 2}, ${500 - n.rx - 8} ${n.cy + 22} Z"
          fill="${shade(colour, 0.95)}" stroke="#000" stroke-opacity=".2" stroke-width="2.5"/>`;

  const neckHole = f.collar ? "" : `
      <path d="M ${500 + n.rx + 15} ${f.shoulderDip} C ${500 + n.rx} ${n.cy + n.ry + 35}, ${500 - n.rx} ${n.cy + n.ry + 35}, ${500 - n.rx - 15} ${f.shoulderDip}"
        fill="none" stroke="${rib}" stroke-width="22"/>
      <path d="M ${500 + n.rx + 21} ${f.shoulderDip} C ${500 + n.rx + 8} ${n.cy + n.ry + 52}, ${500 - n.rx - 8} ${n.cy + n.ry + 52}, ${500 - n.rx - 21} ${f.shoulderDip}"
        fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`;

  return `
  <svg viewBox="0 0 ${V.w} ${V.h}" width="100%" height="100%" style="isolation:isolate;overflow:visible" xmlns="http://www.w3.org/2000/svg">
    <defs>${defs(id, seed)}<clipPath id="${id}-clip"><path d="${body}"/></clipPath></defs>
    <g filter="url(#${id}-cast)">${hood}<path d="${body}" fill="${colour}"/></g>
    <g clip-path="url(#${id}-clip)">
      ${placed.map((p) => p.img).join("")}
      <g style="mix-blend-mode:multiply" opacity="${shadeStrength(colour)}">
        <rect width="${V.w}" height="${V.h}" fill="url(#${id}-side)"/>
        <rect width="${V.w}" height="${V.h}" fill="url(#${id}-drop)"/>
        <rect width="${V.w}" height="${V.h}" filter="url(#${id}-folds)" opacity=".16"/>
        <rect width="${V.w}" height="${V.h}" filter="url(#${id}-weave)" opacity=".08"/>
        <path d="M ${L + 25} ${f.armpitY} Q ${L + 72} ${f.armpitY + 170} ${L + 30} ${f.hem.y - 80} M ${R - 25} ${f.armpitY} Q ${R - 65} ${f.armpitY + 160} ${R - 30} ${f.hem.y - 80}" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="16" filter="url(#${id}-soft)"/>
        <g filter="url(#${id}-soft)" fill="#000">
          <ellipse cx="500" cy="${n.cy + 76}" rx="${n.rx + 46}" ry="48" opacity=".10"/>
          <ellipse cx="${L + 4}" cy="${f.armpitY + 18}" rx="70" ry="54" opacity=".07"/>
          <ellipse cx="${R - 4}" cy="${f.armpitY + 18}" rx="70" ry="54" opacity=".07"/>
        </g>
      </g>
      <g style="mix-blend-mode:screen">
        <rect width="${V.w}" height="${V.h}" fill="url(#${id}-lift)"/>
        <rect width="${V.w}" height="${V.h}" filter="url(#${id}-glow)" opacity=".10"/>
      </g>
      ${neckHole}${pocket}
    </g>
    <path d="${body}" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3"/>
    ${ribbing}${band}${cords}${collar}
    <path d="M ${f.hem.l + 16} ${f.hem.y - 36} L ${f.hem.r - 16} ${f.hem.y - 36}" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="3" stroke-linecap="round"/>
    ${placed.map((p) => p.box).join("")}
  </svg>`;
}

/** A six-panel cap, front on. */
export function capSvg({ colour, areas, id = "c" }) {
  const V = CAP_VIEW, upm = V.crown / V.widthMm;
  const placed = areas.map((p) => placement({ ...p, area: { cx: 500, cy: 300 } }, upm, `${id}-warp`));
  const peak = shade(colour, 0.55);
  return `
  <svg viewBox="0 0 ${V.w} ${V.h}" width="100%" height="100%" style="isolation:isolate;overflow:visible" xmlns="http://www.w3.org/2000/svg">
    <defs>${defs(id, 17)}
      <clipPath id="${id}-clip"><path d="${CAP_CROWN}"/></clipPath>
      <radialGradient id="${id}-dome" cx=".36" cy=".16" r=".95"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".52" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-round" cx=".5" cy=".3" r=".78"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".40"/></radialGradient>
    </defs>
    <g filter="url(#${id}-cast)"><path d="${CAP_PEAK}" fill="${peak}"/><path d="${CAP_CROWN}" fill="${colour}"/></g>
    <g clip-path="url(#${id}-clip)">
      ${placed.map((p) => p.img).join("")}
      <g style="mix-blend-mode:multiply" opacity="${shadeStrength(colour)}">
        <rect width="${V.w}" height="${V.h}" fill="url(#${id}-round)"/>
        <rect width="${V.w}" height="${V.h}" filter="url(#${id}-weave)" opacity=".4"/>
        <g filter="url(#${id}-soft)"><ellipse cx="500" cy="452" rx="400" ry="52" fill="#000" opacity=".30"/></g>
      </g>
      <g style="mix-blend-mode:screen"><rect width="${V.w}" height="${V.h}" fill="url(#${id}-dome)"/></g>
    </g>
    <path d="${CAP_CROWN}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="3"/>
    <path d="${CAP_PEAK}" fill="none" stroke="#000" stroke-opacity=".20" stroke-width="3"/>
    <g fill="none" stroke="#000" stroke-opacity=".20" stroke-linecap="round" stroke-width="3">
      <path d="M 500 104 C 452 200, 430 310, 428 432"/><path d="M 500 104 C 548 200, 570 310, 572 432"/>
      <path d="M 318 128 C 284 230, 272 330, 272 432" stroke-opacity=".13"/><path d="M 682 128 C 716 230, 728 330, 728 432" stroke-opacity=".13"/>
      <path d="M 188 430 L 812 430"/><path d="M 252 448 C 320 492, 680 492, 748 448" stroke="#fff" stroke-opacity=".30"/>
    </g>
    <circle cx="500" cy="108" r="16" fill="${colour}" stroke="#000" stroke-opacity=".26" stroke-width="3"/>
    <g fill="#000" opacity=".20"><circle cx="330" cy="340" r="7"/><circle cx="670" cy="340" r="7"/></g>
    ${placed.map((p) => p.box).join("")}
  </svg>`;
}

/** A canvas tote: 380 × 420 mm body, long handles. */
export function toteSvg({ colour, areas, id = "t" }) {
  const V = { w: 1000, h: 1300 };
  const bx = 160, by = 420, bw = 680, bh = 752;
  const upm = bw / 380;
  const placed = areas.map((p) => placement({ ...p, area: { cx: 500, cy: by + bh / 2 + 10 } }, upm, `${id}-warp`));
  const strap = shade(colour, 0.86);
  const body = `M ${bx} ${by} L ${bx + bw} ${by} L ${bx + bw + 6} ${by + bh} L ${bx - 6} ${by + bh} Z`;
  return `
  <svg viewBox="0 0 ${V.w} ${V.h}" width="100%" height="100%" style="isolation:isolate;overflow:visible" xmlns="http://www.w3.org/2000/svg">
    <defs>${defs(id, 23)}<clipPath id="${id}-clip"><path d="${body}"/></clipPath></defs>
    <path d="M 320 ${by + 6} C 300 160, 420 70, 500 70 C 580 70, 700 160, 680 ${by + 6}" fill="none" stroke="${strap}" stroke-width="44"/>
    <g fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2">
      <path d="M 298 ${by + 6} C 278 150, 410 48, 500 48 C 590 48, 722 150, 702 ${by + 6}"/>
      <path d="M 342 ${by + 6} C 322 172, 430 92, 500 92 C 570 92, 678 172, 658 ${by + 6}"/>
    </g>
    <g filter="url(#${id}-cast)"><path d="${body}" fill="${colour}"/></g>
    <g clip-path="url(#${id}-clip)">
      ${placed.map((p) => p.img).join("")}
      <g style="mix-blend-mode:multiply" opacity="${shadeStrength(colour)}">
        <rect width="${V.w}" height="${V.h}" fill="url(#${id}-side)"/>
        <rect width="${V.w}" height="${V.h}" filter="url(#${id}-folds)" opacity=".35"/>
        <rect width="${V.w}" height="${V.h}" filter="url(#${id}-weave)" opacity=".7"/>
        <rect x="${bx}" y="${by}" width="${bw}" height="40" fill="#000" opacity=".08"/>
      </g>
      <g style="mix-blend-mode:screen"><rect width="${V.w}" height="${V.h}" fill="url(#${id}-lift)"/></g>
    </g>
    <path d="${body}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="3"/>
    <path d="M ${bx + 6} ${by + 34} L ${bx + bw - 6} ${by + 34}" stroke="#000" stroke-opacity=".16" stroke-width="2.5" stroke-dasharray="10 7"/>
    <g fill="${strap}" stroke="#000" stroke-opacity=".2" stroke-width="2">
      <rect x="296" y="${by - 4}" width="48" height="74"/><rect x="656" y="${by - 4}" width="48" height="74"/>
    </g>
    ${placed.map((p) => p.box).join("")}
  </svg>`;
}
