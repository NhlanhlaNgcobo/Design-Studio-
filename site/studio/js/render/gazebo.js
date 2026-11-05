/* The gazebo, in real 3D on a canvas.
 *
 * DesignCo's version built the gazebo from CSS-3D panels. It looked right but
 * could not be exported — a CSS 3D scene does not survive being turned into an
 * image — so the approval proof had no gazebo in it. This draws the same model
 * with its own projection onto a canvas, which IS an image.
 *
 * Texture mapping: every face is subdivided in 3D and each small triangle is
 * mapped affinely. Subdividing BEFORE projecting is what makes it close to
 * perspective-correct; mapping a whole canopy panel affinely visibly shears
 * the artwork toward the peak.
 *
 * Lighting is per face from one sun, applied over the artwork — the same
 * "artwork under the lighting" rule as the garments.
 *
 * The frame is a pop-up gazebo's: square legs on foot plates, and the scissor
 * truss between the legs under the valance — the detail that makes it read as
 * a gazebo and not a tent. It can stand in a studio, on grass or on paving;
 * the ground is drawn in the same 3D, so it turns with the gazebo.
 */

import { ROOF_RISE, VALANCE_MM } from "../products.js";
import { shade } from "./garment.js";

const SUN = norm([-0.45, 0.85, 0.55]);
function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const SCENES = [
  { id: "studio", label: "Studio" },
  { id: "grass", label: "Grass" },
  { id: "paving", label: "Paving" },
];

export function drawGazebo(canvas, { size, colour, texCanvas, yaw = -32, pitch = 18, zoom = 1, frame = "#C9CDD2", scene = "studio", options = {}, active, editing = active }, opts = {}) {
  // An explicit w/h is an offscreen export (the proof); otherwise fill the element.
  const dpr = opts.w ? 1 : Math.min(2, devicePixelRatio || 1);
  const cw = opts.w || canvas.clientWidth || 600, ch = opts.h || canvas.clientHeight || 600;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);

  const W = size.w, D = size.d, LEG = size.legH, VAL = VALANCE_MM;
  const RISE = Math.min(W, D) * ROOF_RISE, PEAK = LEG + RISE;
  const repeat = options.repeat !== false;

  /* camera */
  const cy0 = (LEG + RISE) * 0.48;
  const ya = (yaw * Math.PI) / 180, pa = (pitch * Math.PI) / 180;
  const cosY = Math.cos(ya), sinY = Math.sin(ya), cosP = Math.cos(pa), sinP = Math.sin(pa);
  const span = Math.max(W, D, PEAK) * 1.32;
  const dist = span * 3.2;
  let F = (Math.min(cw, ch) * dist) / span * 0.82;
  let offsetX = 0, offsetY = 0;
  // Where the camera sits in world space — used to tell outside from inside.
  const eye = [-dist * cosP * sinY, dist * sinP + cy0, dist * cosP * cosY];
  const P = ([x, y, z]) => {
    y -= cy0;
    const x1 = x * cosY + z * sinY, z1 = -x * sinY + z * cosY;
    const y2 = y * cosP - z1 * sinP, z2 = y * sinP + z1 * cosP;
    const k = F / (dist - z2);
    return [cw / 2 + x1 * k + offsetX, ch * 0.54 - y2 * k + offsetY, z2];
  };

  // Fit the complete projected structure, including all feet, at every orbit.
  const bounds = [[0, PEAK, 0], ...[-1, 1].flatMap(x => [-1, 1].flatMap(z =>
    [0, LEG].map(y => [x * W / 2, y, z * D / 2])))];
  const measure = () => {
    const points = bounds.map(P);
    return [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0])),
      Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1]))];
  };
  const b = measure();
  F *= Math.min(cw * .78 / (b[1] - b[0]), ch * .78 / (b[3] - b[2])) * Math.max(0.5, Math.min(2.4, zoom));
  const fitted = measure();
  offsetX = cw / 2 - (fitted[0] + fitted[1]) / 2;
  offsetY = ch / 2 - (fitted[2] + fitted[3]) / 2;

  // Where the ground meets the sky on screen: a point infinitely far ahead
  // projects to tan(pitch) above the centre line.
  drawGround(g, { cw, ch, P, scene, W, D, dist, horizon: ch * 0.54 + offsetY - F * Math.tan(pa) });

  /* faces: [corners, uv per corner (0..1), texture, base colour, label] */
  const fr = [-W / 2, LEG, D / 2], fl = [W / 2, LEG, D / 2], bl = [W / 2, LEG, -D / 2], br = [-W / 2, LEG, -D / 2];
  const peak = [0, PEAK, 0];
  const T = texCanvas;
  const faces = [
    { pts: [fr, fl, peak], uv: [[0, 1], [1, 1], [0.5, 0]], tex: T["canopy-front"], id: "canopy-front" },
    { pts: [bl, br, peak], uv: [[0, 1], [1, 1], [0.5, 0]], tex: repeat ? T["canopy-front"] : null },
    { pts: [fl, bl, peak], uv: [[0, 1], [1, 1], [0.5, 0]], tex: T["canopy-side"], id: "canopy-side" },
    { pts: [br, fr, peak], uv: [[0, 1], [1, 1], [0.5, 0]], tex: repeat ? T["canopy-side"] : null },
  ];
  const drop = (a) => [a[0], a[1] - VAL, a[2]];
  const quad = (a, b, tex, id) => ({ pts: [a, b, drop(b), drop(a)], tex, id });
  faces.push(
    quad(fr, fl, T["valance-front"], "valance-front"),
    quad(bl, br, repeat ? T["valance-front"] : null),
    quad(fl, bl, T["valance-side"], "valance-side"),
    quad(br, fr, repeat ? T["valance-side"] : null),
  );
  // Walls hang inside the legs from under the valance to the ground. Each is
  // shown when it carries a design or is selected (with or without the print
  // area outline). Wound TL→TR→BR→BL as seen from outside.
  const top = LEG - VAL;
  const walls = {
    "wall-back": [[W / 2, top, -D / 2], [-W / 2, top, -D / 2], [-W / 2, 0, -D / 2], [W / 2, 0, -D / 2]],
    "wall-left": [[-W / 2, top, -D / 2], [-W / 2, top, D / 2], [-W / 2, 0, D / 2], [-W / 2, 0, -D / 2]],
    "wall-right": [[W / 2, top, D / 2], [W / 2, top, -D / 2], [W / 2, 0, -D / 2], [W / 2, 0, D / 2]],
  };
  for (const [id, pts] of Object.entries(walls))
    if (T[id] || editing === id) faces.push({ pts, tex: T[id], id });

  /* ground shadow */
  const sh = [[-W * 0.62, 0, D * 0.62], [W * 0.62, 0, D * 0.62], [W * 0.62, 0, -D * 0.62], [-W * 0.62, 0, -D * 0.62]].map(P);
  g.save();
  g.filter = `blur(${Math.round(Math.min(cw, ch) * 0.025)}px)`;
  g.fillStyle = scene === "studio" ? "rgba(20,22,26,.26)" : "rgba(10,14,8,.34)";
  poly(g, sh); g.fill();
  g.restore();

  /* frame: legs, foot plates and the scissor truss — depth-sorted with the faces */
  const items = faces.map((f) => {
    const s = f.pts.map(P);
    return { kind: "face", f, s, z: s.reduce((a, p) => a + p[2], 0) / s.length };
  });
  const corners = [[-W / 2, D / 2], [W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]];
  for (const [x, z] of corners) {
    const a = P([x, 0, z]), bb = P([x, top, z]);
    items.push({ kind: "leg", a, b: bb, z: (a[2] + bb[2]) / 2 });
    const pl = 110;
    items.push({ kind: "plate", s: [[x - pl, 2, z - pl], [x + pl, 2, z - pl], [x + pl, 2, z + pl], [x - pl, 2, z + pl]].map(P), z: P([x, 0, z])[2] - 1 });
  }
  const TRUSS = 420;                                // depth of the scissor band
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4];
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 750));
    const lines = [];
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const p = (t, y) => P([x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t]);
      lines.push([p(t0, top), p(t1, top - TRUSS)], [p(t0, top - TRUSS), p(t1, top)]);
    }
    const mid = P([(x0 + x1) / 2, top - TRUSS / 2, (z0 + z1) / 2]);
    items.push({ kind: "truss", lines, z: mid[2] - 0.5 });
  }
  items.sort((p, q) => p.z - q.z);

  const metalLight = shade(frame, 1.25), metalDark = shade(frame, 0.62);
  for (const it of items) {
    if (it.kind === "leg") {
      const k = F / (dist - it.z);
      g.lineCap = "butt";
      g.strokeStyle = metalDark; g.lineWidth = Math.max(2.5, 44 * k);
      g.beginPath(); g.moveTo(it.a[0], it.a[1]); g.lineTo(it.b[0], it.b[1]); g.stroke();
      g.strokeStyle = frame; g.lineWidth = Math.max(1.5, 26 * k);
      g.beginPath(); g.moveTo(it.a[0] - 6 * k, it.a[1]); g.lineTo(it.b[0] - 6 * k, it.b[1]); g.stroke();
      g.strokeStyle = metalLight; g.globalAlpha = 0.6; g.lineWidth = Math.max(1, 7 * k);
      g.beginPath(); g.moveTo(it.a[0] - 12 * k, it.a[1]); g.lineTo(it.b[0] - 12 * k, it.b[1]); g.stroke();
      g.globalAlpha = 1;
      continue;
    }
    if (it.kind === "plate") { g.fillStyle = metalDark; poly(g, it.s); g.fill(); continue; }
    if (it.kind === "truss") {
      const k = F / (dist - it.z);
      g.strokeStyle = shade(frame, 0.85); g.lineWidth = Math.max(1, 16 * k); g.lineCap = "round";
      g.beginPath();
      for (const [a, c] of it.lines) { g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); }
      g.stroke();
      continue;
    }
    const { f, s } = it;
    // Outward normal in world space; faces wound so that cross(b-a, c-a) points out.
    // Triangles are wound so cross(B-A, C-A) points outward; quads run
    // TL→TR→BR→BL for texturing, which makes their cross product point in.
    let n = norm(cross(sub(f.pts[1], f.pts[0]), sub(f.pts[2], f.pts[0])));
    if (f.pts.length === 4) n = n.map((x) => -x);
    const c = f.pts.reduce((a, p) => [a[0] + p[0] / f.pts.length, a[1] + p[1] / f.pts.length, a[2] + p[2] / f.pts.length], [0, 0, 0]);
    const facing = dot(n, sub(eye, c)) > 0;
    const lit = facing ? 0.58 + 0.42 * Math.max(0, dot(n, SUN)) : 0.42;

    g.fillStyle = facing ? colour : shade(colour, 0.8);
    poly(g, s); g.fill();

    // Sublimated fabric shows through: from inside you see the print, mirrored and dimmer.
    if (f.tex) {
      g.save();
      g.globalAlpha = facing ? 1 : 0.45;
      texturedFace(g, f, P);
      g.restore();
    }
    g.fillStyle = `rgba(10,12,16,${(1 - lit).toFixed(3)})`;
    poly(g, s); g.fill();
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1;
    poly(g, s); g.stroke();
    if (active && f.id === active) {
      g.save(); g.setLineDash([7, 5]); g.strokeStyle = "#E5007E"; g.lineWidth = 2;
      poly(g, s); g.stroke(); g.restore();
    }
  }
}

/* The setting. Studio leaves the stage's own backdrop; grass and paving draw
 * sky and a ground plane in the gazebo's own perspective. */
function drawGround(g, { cw, ch, P, scene, W, D, dist, horizon }) {
  if (scene === "studio") return;
  const hy = Math.max(-ch, Math.min(ch * 2, horizon));
  const sky = g.createLinearGradient(0, Math.min(0, hy - ch), 0, Math.max(1, hy));
  sky.addColorStop(0, "#8FBFE6"); sky.addColorStop(1, "#E6F0F5");
  g.fillStyle = sky; g.fillRect(0, 0, cw, ch);
  // Ground colour all the way from the horizon down, so the plane never ends.
  g.fillStyle = scene === "grass" ? "#7FA05A" : "#B9B4AA";
  g.fillRect(0, hy, cw, ch - hy + 1);
  // Never past the camera: the corners must stay in front of it at any orbit.
  const R = Math.min(dist * 0.6, Math.max(W, D) * 3);
  const ground = [[-R, 0, -R], [R, 0, -R], [R, 0, R], [-R, 0, R]].map(P);
  if (scene === "grass") {
    // Mowing stripes, 1 m wide, in perspective.
    g.fillStyle = "rgba(255,255,255,.07)";
    for (let x = -R; x < R; x += 2000) { poly(g, [[x, 0, -R], [x + 1000, 0, -R], [x + 1000, 0, R], [x, 0, R]].map(P)); g.fill(); }
  } else {
    // 600 mm pavers: joint lines both ways.
    g.strokeStyle = "rgba(60,56,50,.22)"; g.lineWidth = 1;
    g.beginPath();
    for (let v = -R; v <= R; v += 600) {
      const a = P([v, 0, -R]), b = P([v, 0, R]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      const c = P([-R, 0, v]), d = P([R, 0, v]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]);
    }
    g.stroke();
  }
  // Haze toward the horizon: distant ground fades into the sky.
  const band = Math.max(20, ch * 0.22);
  const far = g.createLinearGradient(0, hy, 0, hy + band);
  far.addColorStop(0, "rgba(230,240,245,.95)"); far.addColorStop(1, "rgba(230,240,245,0)");
  g.fillStyle = far; g.fillRect(0, hy, cw, band);
}

function poly(g, s) {
  g.beginPath(); g.moveTo(s[0][0], s[0][1]);
  for (let i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]);
  g.closePath();
}

/* Subdivide in 3D, project, map each small triangle affinely. */
function texturedFace(g, f, P) {
  const img = f.tex, iw = img.width, ih = img.height;
  const N = 7;
  const tris = [];
  if (f.pts.length === 3) {
    // Barycentric grid over the triangle.
    const [A, B, C] = f.pts, [ua, ub, uc] = f.uv;
    const at = (i, j) => {                        // i along A→B, j toward C
      const a = 1 - (i + j) / N, b = i / N, c = j / N;
      return {
        p: [A[0] * a + B[0] * b + C[0] * c, A[1] * a + B[1] * b + C[1] * c, A[2] * a + B[2] * b + C[2] * c],
        t: [ua[0] * a + ub[0] * b + uc[0] * c, ua[1] * a + ub[1] * b + uc[1] * c],
      };
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N - j; i++) {
      tris.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
      if (i + j < N - 1) tris.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  } else {
    const [A, B, C, Dd] = f.pts;
    const at = (u, v) => ({ p: lerp3(lerp3(A, B, u), lerp3(Dd, C, u), v), t: [u, v] });
    const nu = N, nv = Math.max(2, Math.round(N / 2));
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const p00 = at(i / nu, j / nv), p10 = at((i + 1) / nu, j / nv), p01 = at(i / nu, (j + 1) / nv), p11 = at((i + 1) / nu, (j + 1) / nv);
      tris.push([p00, p10, p11], [p00, p11, p01]);
    }
  }
  for (const t of tris) {
    const s = t.map((v) => P(v.p));
    // Seen from inside, the same mapping lands mirrored on screen by itself —
    // which is exactly how a sublimated print looks through the fabric.
    const uv = t.map((v) => [v.t[0] * iw, v.t[1] * ih]);
    drawTri(g, img, s, uv);
  }
}

function drawTri(g, img, s, t) {
  const [[x0, y0], [x1, y1], [x2, y2]] = s;
  const [[u0, v0], [u1, v1], [u2, v2]] = t;
  const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
  if (!det) return;
  const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det;
  const c = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / det;
  const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det;
  const d = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / det;
  const e = x0 - a * u0 - c * v0, f = y0 - b * u0 - d * v0;
  // Grow the clip by half a pixel so neighbouring triangles overlap instead of
  // leaving hairline seams.
  const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
  const grow = (x, y) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * 0.7, y + (dy / l) * 0.7]; };
  g.save();
  g.beginPath();
  const p0 = grow(x0, y0), p1 = grow(x1, y1), p2 = grow(x2, y2);
  g.moveTo(...p0); g.lineTo(...p1); g.lineTo(...p2); g.closePath();
  g.clip();
  g.transform(a, b, c, d, e, f);
  g.drawImage(img, 0, 0);
  g.restore();
}
