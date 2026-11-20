/* Water bottles, drawn on a canvas as real turned shapes — like the mug.
 *
 * Two families:
 *   pet     bottled water (330 ml – 1.5 L) and the 5 L with a carry handle:
 *           clear plastic with water in it, and a printed label wrapped round
 *   sport   reusable bottles: aluminium sports bottle, stainless flask, gym
 *   flask   jug — coloured or bare metal, printed, sublimated or engraved
 *   jug
 *
 * Each size carries its real dimensions (diameter d, height bh, mm). The
 * silhouette is a profile of radius against height; the print band sits on the
 * straight part, and every screen column samples the wrap at the angle it
 * really faces, so a label compresses toward the edges and drag-to-turn walks
 * it round the bottle.
 */

import { shade } from "./garment.js";

/* Profiles: [y from the top of the body, radius as a share of R], top → base.
 * The cap sits above y = 0. */
const PROFILES = {
  pet: (bh) => [[0, 0.36], [bh * 0.05, 0.38], [bh * 0.1, 0.5], [bh * 0.2, 0.9], [bh * 0.26, 1], [bh * 0.9, 1], [bh * 0.93, 0.95], [bh * 0.96, 1], [bh, 0.93]],
  pet5: (bh) => [[0, 0.24], [bh * 0.04, 0.26], [bh * 0.1, 0.62], [bh * 0.18, 0.93], [bh * 0.22, 1], [bh * 0.96, 1], [bh, 0.95]],
  sport: (bh) => [[0, 0.5], [bh * 0.03, 0.52], [bh * 0.08, 0.82], [bh * 0.14, 1], [bh * 0.985, 1], [bh, 0.96]],
  flask: (bh) => [[0, 0.78], [bh * 0.03, 0.84], [bh * 0.07, 1], [bh * 0.985, 1], [bh, 0.96]],
  jug: (bh) => [[0, 0.9], [bh * 0.03, 1], [bh * 0.985, 1], [bh, 0.97]],
};
/* Caps: height (mm) and radius as a share of the body's. */
const CAPS = {
  pet: { h: 0.085, r: 0.42 }, pet5: { h: 0.07, r: 0.3 },
  sport: { h: 0.14, r: 0.55 }, flask: { h: 0.12, r: 0.84 }, jug: { h: 0.09, r: 0.94 },
};

const tone = (c) => (c.toUpperCase() === "#FFFFFF" ? "#F4F4F2" : c);
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const isSilver = (hex) => hex.toUpperCase() === "#C9CDD2";

export function drawBottle(canvas, { size, colour = "#FFFFFF", cap: capColour = "#1F4FA0", texCanvas = {}, yaw = 0, zoom = 1, active, process, stock }, opts = {}) {
  const dpr = opts.w ? 1 : Math.min(2, devicePixelRatio || 1);
  const cw = opts.w || canvas.clientWidth || 600, ch = opts.h || canvas.clientHeight || 600;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);

  const style = size.style || "pet", D = size.d, BH = size.bh;
  const capSpec = CAPS[style], capH = BH * capSpec.h;
  const handleH = style === "pet5" ? BH * 0.1 : style === "sport" ? BH * 0.07 : style === "flask" ? BH * 0.05 : 0;
  const totalMm = BH + capH + handleH;
  // Scale so the whole bottle fits; zoom on top.
  const s = Math.min(cw / (D * 2.1), ch / (totalMm * 1.22)) * Math.max(0.6, Math.min(2.4, zoom));
  const R = (D / 2) * s, ry = R * 0.16;
  const cx = cw / 2, bodyTop = ch / 2 - (totalMm * s) / 2 + (capH + handleH) * s, base = bodyTop + BH * s;
  const prof = PROFILES[style](BH).map(([y, k]) => [bodyTop + y * s, R * k]);
  const pet = style === "pet" || style === "pet5";

  // shadow
  g.save();
  g.filter = `blur(${Math.round(R * 0.14)}px)`;
  g.fillStyle = pet ? "rgba(20,40,60,.18)" : "rgba(20,22,26,.28)";
  g.beginPath(); g.ellipse(cx + R * 0.12, base + ry * 0.3, R * 1.2, ry * 1.2, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // silhouette path (with the base's curve)
  const outline = () => {
    g.beginPath();
    g.moveTo(cx - prof[0][1], prof[0][0]);
    for (const [y, r] of prof) g.lineTo(cx - r, y);
    const [yb, rb] = prof[prof.length - 1];
    g.ellipse(cx, yb, rb, ry * (rb / R), 0, Math.PI, 0, true);
    for (let i = prof.length - 1; i >= 0; i--) g.lineTo(cx + prof[i][1], prof[i][0]);
    g.closePath();
  };

  // body
  g.save();
  outline();
  if (pet) {
    // Clear plastic with water: the backdrop shows through, tinted.
    const water = g.createLinearGradient(cx - R, 0, cx + R, 0);
    water.addColorStop(0, "rgba(120,170,205,.55)"); water.addColorStop(0.3, "rgba(200,228,245,.35)");
    water.addColorStop(0.7, "rgba(170,210,235,.4)"); water.addColorStop(1, "rgba(110,160,200,.6)");
    g.fillStyle = water; g.fill();
  } else {
    g.fillStyle = tone(colour); g.fill();
  }
  g.clip();
  if (pet) {
    // Air above the water line, and the ribs on the shoulder.
    const airTo = bodyTop + BH * (style === "pet5" ? 0.12 : 0.15) * s;
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(cx - R, bodyTop - ry, R * 2, airTo - bodyTop + ry);
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1;
    g.beginPath(); g.ellipse(cx, airTo, R, ry * 0.8, 0, 0, Math.PI); g.stroke();
    g.strokeStyle = "rgba(40,80,110,.18)";
    const ribs = style === "pet5" ? [0.85] : [0.35, 0.38, 0.41, 0.84, 0.87];
    for (const k of ribs) { g.beginPath(); g.ellipse(cx, bodyTop + BH * k * s, R, ry, 0, 0, Math.PI); g.stroke(); }
  } else if (isSilver(colour)) {
    // Brushed steel: fine vertical grain.
    g.globalAlpha = 0.07;
    for (let x = -R; x < R; x += 1) { const n = Math.sin(x * 12.9898) * 43758.5453; g.fillStyle = n - Math.floor(n) > 0.5 ? "#FFFFFF" : "#6E737A"; g.fillRect(cx + x, bodyTop, 1, BH * s); }
    g.globalAlpha = 1;
  }

  // the print band, column by column
  const band = { top: bodyTop + (size.printTop ?? BH * 0.3) * s, h: size.h * s, w: size.w };
  const circ = Math.PI * D;
  const clear = pet && /clear/i.test(stock || "");
  if (pet && !clear) {
    // The label stock itself, all the way round.
    g.fillStyle = tone(colour);
    g.beginPath(); g.moveTo(cx - R, band.top); g.ellipse(cx, band.top, R, ry, 0, Math.PI, 0, true);
    g.lineTo(cx + R, band.top + band.h); g.ellipse(cx, band.top + band.h, R, ry, 0, 0, Math.PI, false); g.closePath(); g.fill();
  }
  let tex = texCanvas.wrap;
  if (tex && process === "engrave") tex = engraved(tex, lum(colour) > 0.6 ? "#6F757C" : isSilver(colour) ? "#5B6067" : "#D9DCE0");
  if (tex) {
    const tw = tex.width, th = tex.height, ya = (yaw * Math.PI) / 180;
    for (let x = -R; x < R; x += 1) {
      const a0 = Math.asin(Math.max(-1, Math.min(1, x / R))), a1 = Math.asin(Math.max(-1, Math.min(1, (x + 1) / R)));
      const wrapA = (p) => Math.atan2(Math.sin(p), Math.cos(p));
      const u0 = (wrapA(a0 + ya) / (2 * Math.PI)) * circ + band.w / 2;
      const u1 = u0 + ((a1 - a0) / (2 * Math.PI)) * circ;
      if (u1 < 0 || u0 > band.w) continue;
      const sx = Math.max(0, (u0 / band.w) * tw), sw = Math.max(0.5, ((u1 - u0) / band.w) * tw);
      g.drawImage(tex, sx, 0, Math.min(sw, tw - sx), th, cx + x, band.top + ry * Math.cos(a0), 1.3, band.h);
    }
  }

  // cylinder shading and a highlight
  const sh = g.createLinearGradient(cx - R, 0, cx + R, 0);
  const dark = pet ? 0.6 : 1;
  sh.addColorStop(0, `rgba(0,0,0,${0.32 * dark})`); sh.addColorStop(0.18, `rgba(0,0,0,${0.06 * dark})`);
  sh.addColorStop(0.32, "rgba(255,255,255,0)"); sh.addColorStop(0.62, `rgba(0,0,0,${0.04 * dark})`);
  sh.addColorStop(0.9, `rgba(0,0,0,${0.2 * dark})`); sh.addColorStop(1, `rgba(0,0,0,${0.36 * dark})`);
  g.fillStyle = sh; g.fillRect(cx - R, bodyTop - ry, R * 2, BH * s + ry * 2);
  const hl = g.createLinearGradient(cx - R, 0, cx + R, 0);
  hl.addColorStop(0.2, "rgba(255,255,255,0)"); hl.addColorStop(0.26, `rgba(255,255,255,${pet ? 0.7 : 0.5})`);
  hl.addColorStop(0.3, "rgba(255,255,255,.12)"); hl.addColorStop(0.35, "rgba(255,255,255,0)");
  g.fillStyle = hl; g.fillRect(cx - R, bodyTop - ry, R * 2, BH * s + ry * 2);
  g.restore();
  g.strokeStyle = pet ? "rgba(60,100,130,.35)" : "rgba(0,0,0,.18)"; g.lineWidth = 1.1;
  outline(); g.stroke();

  drawCap(g, style, cx, bodyTop, prof[0][1], capH * s, R, ry, tone(capColour));

  // print-band guide while editing
  if (active) {
    g.save(); g.setLineDash([6, 5]); g.strokeStyle = "rgba(229,0,126,.7)"; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(cx, band.top, R, ry, 0, 0, Math.PI); g.stroke();
    g.beginPath(); g.ellipse(cx, band.top + band.h, R, ry, 0, 0, Math.PI); g.stroke();
    g.restore();
  }
}

/* Engraving is one tone: the design's shape, in the colour the laser leaves. */
function engraved(src, colour) {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = colour; x.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawCap(g, style, cx, top, neckR, h, R, ry, colour) {
  const r = R * CAPS[style].r, cry = ry * (r / R);
  const y0 = top - h;
  const body = (x0, w, y, hh, fill) => {
    const grad = g.createLinearGradient(x0, 0, x0 + w, 0);
    grad.addColorStop(0, shade(fill, 0.62)); grad.addColorStop(0.3, shade(fill, 1.08)); grad.addColorStop(0.7, fill); grad.addColorStop(1, shade(fill, 0.55));
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x0, y + hh); g.ellipse(x0 + w / 2, y + hh, w / 2, cry, 0, Math.PI, 0, true);
    g.lineTo(x0 + w, y); g.ellipse(x0 + w / 2, y, w / 2, cry, 0, 0, Math.PI, false); g.fill();
  };
  g.save();
  if (style === "sport") {
    // Sports cap: a wide collar, the spout, and a carry loop.
    body(cx - r, r * 2, y0 + h * 0.45, h * 0.55, colour);
    body(cx - r * 0.45, r * 0.9, y0 + h * 0.05, h * 0.42, colour);
    g.strokeStyle = shade(colour, 0.8); g.lineWidth = r * 0.16; g.lineCap = "round";
    g.beginPath(); g.ellipse(cx, y0 + h * 0.2, r * 0.75, h * 0.6, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  } else if (style === "flask") {
    body(cx - r, r * 2, y0, h, colour);
    g.strokeStyle = shade(colour, 0.85); g.lineWidth = r * 0.14; g.lineCap = "round";
    g.beginPath(); g.ellipse(cx, y0, r * 0.45, h * 0.55, 0, Math.PI, Math.PI * 2); g.stroke();
  } else if (style === "jug") {
    // Flip lid with a hinged carry handle.
    body(cx - r, r * 2, y0, h, colour);
    g.strokeStyle = shade(colour, 0.75); g.lineWidth = r * 0.1; g.lineCap = "round";
    g.beginPath(); g.ellipse(cx, y0, r * 0.8, h * 0.9, 0, Math.PI, Math.PI * 2); g.stroke();
  } else {
    body(cx - r, r * 2, y0, h, colour);
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 0.8;
    for (let k = 1; k < 6; k++) { const x = cx - r + (r * 2 * k) / 6; g.beginPath(); g.moveTo(x, y0 + h * 0.15); g.lineTo(x, y0 + h * 0.9); g.stroke(); }
    if (style === "pet5") {
      // The 5 L carry handle over the cap.
      g.strokeStyle = shade(colour, 0.9); g.lineWidth = r * 0.22; g.lineCap = "round";
      g.beginPath(); g.ellipse(cx, y0, r * 1.25, h * 1.3, 0, Math.PI, Math.PI * 2); g.stroke();
    }
    // the neck ring under the cap
    g.fillStyle = shade(colour, 0.85);
    g.beginPath(); g.ellipse(cx, top - h * 0.02, r * 1.08, cry * 1.05, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
