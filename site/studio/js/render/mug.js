/* A sublimation mug, drawn on a canvas as a real cylinder.
 *
 * A flat rectangle labelled "mug" lies about the one thing a customer needs to
 * know: how much of a 200 mm wrap you can actually see at once. Here every
 * screen column samples the wrap at the angle it really faces, so the print
 * compresses toward the edges and drag-to-rotate walks it round the mug. The
 * gap at the handle is real too: 200 mm of print on a 258 mm circumference.
 */

import { shade } from "./garment.js";

const D_MM = 82, H_MM = 95, PRINT_H = 82;
const CIRC = Math.PI * D_MM;

export function drawMug(canvas, { colour, texCanvas, yaw = 28, active, printW = 200 }, opts = {}) {
  // An explicit w/h is an offscreen export (the proof); otherwise fill the element.
  const dpr = opts.w ? 1 : Math.min(2, devicePixelRatio || 1);
  const cw = opts.w || canvas.clientWidth || 600, ch = opts.h || canvas.clientHeight || 600;
  if (canvas.width !== Math.round(cw * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);

  const s = Math.min(cw / (D_MM * 1.9), ch / (H_MM * 1.45));
  const R = (D_MM / 2) * s, H = H_MM * s;
  const cx = cw / 2 - R * 0.08, top = ch / 2 - H / 2 - R * 0.06;
  const ry = R * 0.2;                                   // rim ellipse: we look slightly down
  const glaze = colour === "#FFFFFF" ? "#F4F4F2" : colour;
  const ya = (yaw * Math.PI) / 180;

  // Handle angle on screen; the handle sits opposite the print centre.
  let th = Math.PI - ya;
  th = Math.atan2(Math.sin(th), Math.cos(th));
  const handleFront = Math.cos(th) > 0;
  const hx = cx + R * 0.94 * Math.sin(th);

  // shadow
  g.save();
  g.filter = `blur(${Math.round(R * 0.12)}px)`;
  g.fillStyle = "rgba(20,22,26,.28)";
  g.beginPath(); g.ellipse(cx + R * 0.1, top + H + ry * 0.4, R * 1.15, ry * 1.1, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  if (!handleFront) handle(g, hx, top, H, R, th, colour, glaze, true);

  // body
  g.save();
  g.beginPath();
  g.moveTo(cx - R, top); g.lineTo(cx - R, top + H);
  g.ellipse(cx, top + H, R, ry, 0, Math.PI, 0, true);
  g.lineTo(cx + R, top);
  g.ellipse(cx, top, R, ry, 0, 0, Math.PI, false);
  g.closePath();
  g.fillStyle = "#FBFBFA"; g.fill();
  g.clip();

  // the wrap, column by column
  const tex = texCanvas.wrap;
  if (tex) {
    const tw = tex.width, thh = tex.height;
    const bandTop = (H_MM - PRINT_H) / 2 * s;
    for (let x = -R; x < R; x += 1) {
      const a0 = Math.asin(Math.max(-1, Math.min(1, x / R))), a1 = Math.asin(Math.max(-1, Math.min(1, (x + 1) / R)));
      const phi0 = a0 + ya, phi1 = a1 + ya;
      const wrap = (p) => Math.atan2(Math.sin(p), Math.cos(p));
      const u0 = (wrap(phi0) / (2 * Math.PI)) * CIRC + printW / 2;
      const u1 = u0 + ((phi1 - phi0) / (2 * Math.PI)) * CIRC;
      if (u1 < 0 || u0 > printW) continue;
      const sx = Math.max(0, (u0 / printW) * tw), sw = Math.max(0.5, ((u1 - u0) / printW) * tw);
      const dy = ry * Math.cos(a0);                     // the band follows the rim's curve
      g.drawImage(tex, sx, 0, Math.min(sw, tw - sx), thh, cx + x, top + bandTop + dy, 1.3, PRINT_H * s);
    }
  }

  // cylinder shading over the print
  const sh = g.createLinearGradient(cx - R, 0, cx + R, 0);
  sh.addColorStop(0, "rgba(0,0,0,.30)"); sh.addColorStop(0.18, "rgba(0,0,0,.06)");
  sh.addColorStop(0.32, "rgba(255,255,255,.0)"); sh.addColorStop(0.62, "rgba(0,0,0,.04)");
  sh.addColorStop(0.9, "rgba(0,0,0,.2)"); sh.addColorStop(1, "rgba(0,0,0,.36)");
  g.fillStyle = sh; g.fillRect(cx - R, top - ry, R * 2, H + ry * 2);
  const hl = g.createLinearGradient(cx - R, 0, cx + R, 0);
  hl.addColorStop(0.2, "rgba(255,255,255,0)"); hl.addColorStop(0.27, "rgba(255,255,255,.55)");
  hl.addColorStop(0.31, "rgba(255,255,255,.12)"); hl.addColorStop(0.36, "rgba(255,255,255,0)");
  g.fillStyle = hl; g.fillRect(cx - R, top - ry, R * 2, H + ry * 2);
  g.restore();

  // rim and inside
  g.beginPath(); g.ellipse(cx, top, R, ry, 0, 0, Math.PI * 2);
  g.fillStyle = shade(glaze, 0.92); g.fill();
  g.beginPath(); g.ellipse(cx, top + ry * 0.1, R * 0.93, ry * 0.86, 0, 0, Math.PI * 2);
  const inside = g.createLinearGradient(0, top - ry, 0, top + ry);
  inside.addColorStop(0, shade(glaze, 0.62)); inside.addColorStop(1, shade(glaze, 0.9));
  g.fillStyle = inside; g.fill();
  g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(cx, top, R, ry, 0, 0, Math.PI * 2); g.stroke();

  if (handleFront) handle(g, hx, top, H, R, th, colour, glaze, false);

  // print-band guide while editing
  if (active) {
    g.save(); g.setLineDash([6, 5]); g.strokeStyle = "rgba(229,0,126,.7)"; g.lineWidth = 1.5;
    const b = (H_MM - PRINT_H) / 2 * s;
    g.beginPath(); g.ellipse(cx, top + b, R, ry, 0, 0, Math.PI); g.stroke();
    g.beginPath(); g.ellipse(cx, top + b + PRINT_H * s, R, ry, 0, 0, Math.PI); g.stroke();
    g.restore();
  }
}

function handle(g, hx, top, H, R, th, colour, glaze, behind) {
  const out = Math.abs(Math.sin(th));
  const reach = R * 0.95 * out, side = Math.sign(Math.sin(th)) || 1;
  const x0 = hx, y0 = top + H * 0.2, y1 = top + H * 0.78;
  const body = colour === "#FFFFFF" ? "#F4F4F2" : glaze;
  g.save();
  g.lineCap = "round";
  g.strokeStyle = behind ? shade(body, 0.78) : body;
  g.lineWidth = R * 0.2;
  g.beginPath();
  g.moveTo(x0, y0);
  g.bezierCurveTo(x0 + side * reach * 1.5, y0 - H * 0.04, x0 + side * reach * 1.6, y1 + H * 0.04, x0, y1);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1.2; g.stroke();
  if (!behind) {
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = R * 0.04;
    g.beginPath();
    g.moveTo(x0 + side * reach * 0.4, y0 + H * 0.02);
    g.bezierCurveTo(x0 + side * reach * 1.25, y0, x0 + side * reach * 1.3, y1, x0 + side * reach * 0.5, y1 - H * 0.02);
    g.stroke();
  }
  g.restore();
}
