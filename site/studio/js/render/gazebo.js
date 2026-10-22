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
 */

import { ROOF_RISE, VALANCE_MM } from "../products.js";
import { shade } from "./garment.js";

const SUN = norm([-0.45, 0.85, 0.55]);
function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function drawGazebo(canvas, { size, colour, texCanvas, yaw = -32, pitch = 18, options = {}, active }, opts = {}) {
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
  F *= Math.min(cw * .82 / (b[1] - b[0]), ch * .82 / (b[3] - b[2]));
  const fitted = measure();
  offsetX = cw / 2 - (fitted[0] + fitted[1]) / 2;
  offsetY = ch / 2 - (fitted[2] + fitted[3]) / 2;

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
  if (T["wall-back"] || active === "wall-back") {
    const top = LEG - VAL;
    faces.push({ pts: [[W / 2, top, -D / 2], [-W / 2, top, -D / 2], [-W / 2, 0, -D / 2], [W / 2, 0, -D / 2]],
      tex: T["wall-back"], id: "wall-back" });
  }

  /* ground shadow */
  const sh = [[-W * 0.62, 0, D * 0.62], [W * 0.62, 0, D * 0.62], [W * 0.62, 0, -D * 0.62], [-W * 0.62, 0, -D * 0.62]].map(P);
  g.save();
  g.filter = `blur(${Math.round(Math.min(cw, ch) * 0.025)}px)`;
  g.fillStyle = "rgba(20,22,26,.26)";
  poly(g, sh); g.fill();
  g.restore();

  /* legs as depth-sorted items too, so the front legs pass in front of the back wall */
  const items = faces.map((f) => {
    const s = f.pts.map(P);
    return { kind: "face", f, s, z: s.reduce((a, p) => a + p[2], 0) / s.length };
  });
  for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]]) {
    const a = P([x, 0, z]), b = P([x, LEG - VAL, z]);
    items.push({ kind: "leg", a, b, z: (a[2] + b[2]) / 2 });
  }
  items.sort((p, q) => p.z - q.z);

  for (const it of items) {
    if (it.kind === "leg") {
      const k = F / (dist - it.z);
      g.strokeStyle = "#9AA0A7"; g.lineWidth = Math.max(2, 40 * k); g.lineCap = "butt";
      g.beginPath(); g.moveTo(it.a[0], it.a[1]); g.lineTo(it.b[0], it.b[1]); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = Math.max(1, 12 * k);
      g.beginPath(); g.moveTo(it.a[0] - 8 * k, it.a[1]); g.lineTo(it.b[0] - 8 * k, it.b[1]); g.stroke();
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
