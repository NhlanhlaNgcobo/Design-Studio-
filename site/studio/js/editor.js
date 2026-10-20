/* The print-area editor.
 *
 * Direct manipulation on a flat, true-proportion view of the print area: drag
 * to move, corner to scale, the stalk to rotate, two fingers to pinch. It
 * replaces the "Size / Across / Up" sliders, which made people guess.
 *
 * Why flat rather than on the 3D mockup: dragging on a canopy viewed at an
 * angle, or round a mug, puts the cursor and the artwork in different places.
 * On a flat area with print guides the customer is working on exactly what we
 * print, and the mockup beside it shows what that becomes.
 *
 * Guides drawn, because they are what a print shop checks first:
 *   trim   solid — where the product is cut
 *   bleed  red dashes — background must run to here, or a white hairline shows
 *   safe   cyan dashes — keep text inside, or it can be trimmed off
 */

import { drawLayer, layerSize, layerCorners } from "./compose.js";

const HANDLE = 9, ROT_STALK = 30, SNAP_PX = 7;

export class Editor {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} hooks { getModel, onSelect(id), onChange(final), onEditText(id) }
   *   getModel() → { area:{w,h,bleed,safe,shape,hiddenBottom}, layers, assets, colour, selected, minDpi }
   */
  constructor(canvas, hooks) {
    this.c = canvas; this.g = canvas.getContext("2d"); this.h = hooks;
    this.pointers = new Map(); this.mode = null; this.guides = [];
    this.dirty = false;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    canvas.addEventListener("pointerdown", (e) => this.down(e));
    canvas.addEventListener("pointermove", (e) => this.move(e));
    canvas.addEventListener("pointerup", (e) => this.up(e));
    canvas.addEventListener("pointercancel", (e) => this.up(e));
    canvas.addEventListener("dblclick", (e) => {
      const hit = this.hit(this.toMm(e));
      if (hit?.kind === "text") hooks.onEditText(hit.id);
    });
    canvas.addEventListener("wheel", (e) => this.wheel(e), { passive: false });
    this.resize();
  }

  resize() {
    const r = this.c.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.cssW = r.width; this.cssH = r.height;
    this.c.width = Math.round(r.width * dpr); this.c.height = Math.round(r.height * dpr);
    this.c.style.width = r.width + "px"; this.c.style.height = r.height + "px";
    this.dpr = dpr;
    this.draw();
  }

  /** px per mm and the screen position of the area centre. */
  view(m) {
    const pad = 34, b = m.area.bleed || 0;
    const s = Math.min((this.cssW - pad * 2) / (m.area.w + b * 2), (this.cssH - pad * 2 - 18) / (m.area.h + b * 2));
    return { s, ox: this.cssW / 2, oy: (this.cssH - 18) / 2 };
  }

  toMm(e) {
    if (this.cssW !== this.c.parentElement.clientWidth) this.resize();
    const r = this.c.getBoundingClientRect();
    const { s, ox, oy } = this.view(this.h.getModel());
    return { x: (e.clientX - r.left - ox) / s, y: (e.clientY - r.top - oy) / s };
  }

  request() {
    if (this.dirty) return;
    this.dirty = true;
    requestAnimationFrame(() => { this.dirty = false; this.draw(); });
  }

  /* ───────────────────────────── drawing ───────────────────────────── */
  draw() {
    const m = this.h.getModel(); if (!m) return;
    // Hidden (a phone tab that isn't showing): nothing to draw, and a 0 × 0
    // box would make the scale negative.
    if (this.cssW < 40 || this.cssH < 40) return;
    const g = this.g, { s, ox, oy } = this.view(m);
    const { w, h } = m.area, b = m.area.bleed || 0;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.cssW, this.cssH);

    // Work in mm from here.
    g.save();
    g.translate(ox, oy); g.scale(s, s);

    // The material, out to the bleed line.
    g.fillStyle = m.colour;
    g.shadowColor = "rgba(20,22,26,.18)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
    this.shape(g, m.area, b); g.fill();
    g.shadowColor = "transparent";

    // The design, clipped to bleed. Beyond-trim is shown faded below.
    g.save();
    this.shape(g, m.area, b); g.clip();
    for (const l of m.layers) drawLayer(g, l, m.assets, s * this.dpr);
    g.restore();

    // Fade the bleed zone: it is printed, then cut off.
    if (b > 0) {
      g.save();
      g.beginPath(); g.rect(-w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b); g.rect(-w / 2, -h / 2, w, h);
      g.fillStyle = "rgba(250,248,244,.55)"; g.fill("evenodd");
      g.restore();
    }

    // Parts of the rectangle that are not printable (canopy triangle, flag).
    if (m.area.shape && m.area.shape !== "rect") {
      g.save();
      g.beginPath(); g.rect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
      this.shapePath(g, m.area, 0);
      g.fillStyle = hatch(g, s); g.fill("evenodd");
      g.restore();
    }

    // Area that rolls into a pull-up's base cassette.
    if (m.area.hiddenBottom) {
      g.fillStyle = hatch(g, s);
      g.fillRect(-w / 2, h / 2 - m.area.hiddenBottom, w, m.area.hiddenBottom);
    }

    // Guides
    g.lineWidth = 1.2 / s;
    g.strokeStyle = "rgba(20,22,26,.55)"; g.setLineDash([]);
    this.shapePath(g, m.area, 0, true); g.stroke();
    if (b > 0) { g.strokeStyle = "#E5007E"; g.setLineDash([5 / s, 4 / s]); g.strokeRect(-w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b); }
    if (m.area.safe) {
      const q = m.area.safe;
      g.strokeStyle = "#0093D0"; g.setLineDash([3 / s, 4 / s]);
      g.strokeRect(-w / 2 + q, -h / 2 + q, w - 2 * q, h - 2 * q);
    }
    g.setLineDash([]);

    // Snap guides
    g.strokeStyle = "#E5007E"; g.lineWidth = 1 / s;
    for (const gd of this.guides) {
      g.beginPath();
      if (gd.axis === "x") { g.moveTo(gd.at, -h / 2 - b - 8 / s); g.lineTo(gd.at, h / 2 + b + 8 / s); }
      else { g.moveTo(-w / 2 - b - 8 / s, gd.at); g.lineTo(w / 2 + b + 8 / s, gd.at); }
      g.stroke();
    }

    // Selection
    const sel = m.layers.find((l) => l.id === m.selected);
    if (sel) this.drawSelection(g, sel, m, s);
    g.restore();

    // Caption: the real size of what you are designing on.
    g.font = "500 11px 'JetBrains Mono', ui-monospace, monospace";
    g.fillStyle = "rgba(20,22,26,.6)"; g.textAlign = "center";
    const cap = `${Math.round(w)} × ${Math.round(h)} mm print area` + (b ? `  ·  +${b} mm bleed` : "") + (m.area.safe ? `  ·  ${m.area.safe} mm safe` : "");
    g.fillText(cap, ox, this.cssH - 10);

    if (!m.layers.length) {
      g.font = "600 14px Archivo, system-ui, sans-serif"; g.fillStyle = "rgba(20,22,26,.45)";
      g.fillText("Drop your logo here, or add text", ox, oy);
    }
  }

  drawSelection(g, l, m, s) {
    const { w, h } = layerSize(l, m.assets);
    g.save();
    g.translate(l.x, l.y); g.rotate((l.rot * Math.PI) / 180);
    g.strokeStyle = "#14161A"; g.lineWidth = 1.5 / s;
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "#fff"; g.lineWidth = 1 / s; g.setLineDash([4 / s, 4 / s]);
    g.strokeRect(-w / 2, -h / 2, w, h); g.setLineDash([]);
    // rotate stalk
    g.strokeStyle = "#14161A"; g.lineWidth = 1.5 / s;
    g.beginPath(); g.moveTo(0, -h / 2); g.lineTo(0, -h / 2 - ROT_STALK / s); g.stroke();
    const dot = (x, y, round) => {
      g.beginPath();
      if (round) g.arc(x, y, (HANDLE * 0.62) / s, 0, Math.PI * 2);
      else g.rect(x - HANDLE / 2 / s, y - HANDLE / 2 / s, HANDLE / s, HANDLE / s);
      g.fillStyle = "#fff"; g.fill(); g.lineWidth = 1.5 / s; g.strokeStyle = "#14161A"; g.stroke();
    };
    for (const [x, y] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) dot(x, y);
    dot(0, -h / 2 - ROT_STALK / s, true);
    g.restore();

    // Live size readout, in mm — the number the quote and the DPI check use.
    const label = `${Math.round(w)} × ${Math.round(h)} mm` + (l.rot ? ` · ${Math.round(l.rot)}°` : "");
    g.save();
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const { ox, oy } = this.view(m);
    const bottom = Math.max(...layerCorners(l, m.assets).map((p) => p[1]));
    const x = ox + l.x * s, y = oy + bottom * s + 18;
    g.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
    const tw = g.measureText(label).width + 14;
    g.fillStyle = "#14161A"; roundRect(g, x - tw / 2, y - 10, tw, 20, 10); g.fill();
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(label, x, y + 0.5);
    g.restore();
  }

  shape(g, area, grow) { g.beginPath(); this.shapePath(g, area, grow); }
  shapePath(g, area, grow, alone) {
    const w = area.w + grow * 2, h = area.h + grow * 2;
    if (alone) g.beginPath();
    if (area.shape === "triangle") {
      g.moveTo(-w / 2, h / 2); g.lineTo(w / 2, h / 2); g.lineTo(0, -h / 2); g.closePath();
    } else if (area.shape === "teardrop") {
      teardrop(g, w, h);
    } else g.rect(-w / 2, -h / 2, w, h);
  }

  /* ───────────────────────────── input ───────────────────────────── */
  hit(p) {
    const m = this.h.getModel();
    for (let i = m.layers.length - 1; i >= 0; i--) {
      const l = m.layers[i];
      if (inPoly(p, layerCorners(l, m.assets))) return l;
    }
    return null;
  }

  handleAt(p, l, m) {
    const { s } = this.view(m);
    const { w, h } = layerSize(l, m.assets);
    const r = (-l.rot * Math.PI) / 180;
    const dx = p.x - l.x, dy = p.y - l.y;
    const lx = dx * Math.cos(r) - dy * Math.sin(r), ly = dx * Math.sin(r) + dy * Math.cos(r);
    const near = (x, y) => Math.hypot(lx - x, ly - y) * s < HANDLE + 4;
    if (near(0, -h / 2 - ROT_STALK / s)) return "rotate";
    for (const [x, y] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) if (near(x, y)) return "scale";
    return null;
  }

  down(e) {
    const m = this.h.getModel(); if (!m) return;
    this.c.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, this.toMm(e));
    const p = this.toMm(e);

    if (this.pointers.size === 2) {               // pinch on the selected layer
      const sel = m.layers.find((l) => l.id === m.selected);
      if (!sel) return;
      const [a, b] = [...this.pointers.values()];
      this.mode = { kind: "pinch", layer: sel, d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), w0: sel.w, size0: sel.size, rot0: sel.rot };
      return;
    }

    const sel = m.layers.find((l) => l.id === m.selected);
    const handle = sel && this.handleAt(p, sel, m);
    if (handle === "rotate") {
      this.mode = { kind: "rotate", layer: sel, a0: Math.atan2(p.y - sel.y, p.x - sel.x), rot0: sel.rot };
    } else if (handle === "scale") {
      this.mode = { kind: "scale", layer: sel, d0: Math.hypot(p.x - sel.x, p.y - sel.y), w0: sel.w, size0: sel.size };
    } else {
      const hit = this.hit(p);
      this.h.onSelect(hit?.id ?? null);
      if (hit) this.mode = { kind: "move", layer: hit, dx: p.x - hit.x, dy: p.y - hit.y };
    }
    this.c.style.cursor = this.mode ? "grabbing" : "default";
    this.request();
  }

  move(e) {
    const m = this.h.getModel(); if (!m) return;
    const p = this.toMm(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);

    if (!this.mode) {
      const sel = m.layers.find((l) => l.id === m.selected);
      const handle = sel && this.handleAt(p, sel, m);
      this.c.style.cursor = handle === "rotate" ? "alias" : handle === "scale" ? "nwse-resize" : this.hit(p) ? "move" : "default";
      return;
    }

    const md = this.mode, l = md.layer, { s } = this.view(m);
    const free = e.altKey;
    if (md.kind === "move") {
      let x = p.x - md.dx, y = p.y - md.dy;
      this.guides = [];
      if (!free) {
        // Snap the centre to the area's centre lines, and edges to the safe line.
        const { w, h } = layerSize({ ...l, rot: 0 }, m.assets);
        const tol = SNAP_PX / s;
        if (Math.abs(x) < tol) { x = 0; this.guides.push({ axis: "x", at: 0 }); }
        if (Math.abs(y) < tol) { y = 0; this.guides.push({ axis: "y", at: 0 }); }
        if (m.area.safe && !l.rot) {
          const sx = m.area.w / 2 - m.area.safe, sy = m.area.h / 2 - m.area.safe;
          if (Math.abs(x - w / 2 + sx) < tol) { x = -sx + w / 2; this.guides.push({ axis: "x", at: -sx }); }
          if (Math.abs(x + w / 2 - sx) < tol) { x = sx - w / 2; this.guides.push({ axis: "x", at: sx }); }
          if (Math.abs(y - h / 2 + sy) < tol) { y = -sy + h / 2; this.guides.push({ axis: "y", at: -sy }); }
          if (Math.abs(y + h / 2 - sy) < tol) { y = sy - h / 2; this.guides.push({ axis: "y", at: sy }); }
        }
      }
      l.x = x; l.y = y;
    } else if (md.kind === "scale") {
      const k = Math.max(0.05, Math.hypot(p.x - l.x, p.y - l.y) / md.d0);
      if (l.kind === "image") l.w = Math.max(3, md.w0 * k); else l.size = Math.max(2, md.size0 * k);
    } else if (md.kind === "rotate") {
      let rot = md.rot0 + ((Math.atan2(p.y - l.y, p.x - l.x) - md.a0) * 180) / Math.PI;
      rot = ((rot + 540) % 360) - 180;
      if (!free) for (const t of [-180, -135, -90, -45, 0, 45, 90, 135, 180]) if (Math.abs(rot - t) < 4) rot = t;
      l.rot = rot;
    } else if (md.kind === "pinch") {
      const [a, b] = [...this.pointers.values()];
      const k = Math.hypot(a.x - b.x, a.y - b.y) / md.d0;
      if (l.kind === "image") l.w = Math.max(3, md.w0 * k); else l.size = Math.max(2, md.size0 * k);
      l.rot = md.rot0 + ((Math.atan2(b.y - a.y, b.x - a.x) - md.a0) * 180) / Math.PI;
    }
    this.h.onChange(false);
    this.request();
  }

  up(e) {
    this.pointers.delete(e.pointerId);
    if (this.mode && this.pointers.size === 0) {
      this.mode = null; this.guides = [];
      this.h.onChange(true);
      this.request();
    }
    this.c.style.cursor = "default";
  }

  /** Ctrl/⌘ + wheel or trackpad pinch scales the selection. */
  wheel(e) {
    const m = this.h.getModel();
    const l = m?.layers.find((x) => x.id === m.selected);
    if (!l || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const k = Math.exp(-e.deltaY * 0.0025);
    if (l.kind === "image") l.w = Math.max(3, l.w * k); else l.size = Math.max(2, l.size * k);
    this.h.onChange(false);
    clearTimeout(this.wheelT); this.wheelT = setTimeout(() => this.h.onChange(true), 300);
    this.request();
  }
}

/* ───────────────────────────── helpers ───────────────────────────── */
function inPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

let hatchCache = null;
function hatch(g, s) {
  if (!hatchCache) {
    const c = document.createElement("canvas"); c.width = c.height = 10;
    const h = c.getContext("2d");
    h.fillStyle = "rgba(250,248,244,.86)"; h.fillRect(0, 0, 10, 10);
    h.strokeStyle = "rgba(20,22,26,.16)"; h.lineWidth = 1.2;
    h.beginPath(); h.moveTo(0, 10); h.lineTo(10, 0); h.stroke();
    hatchCache = c;
  }
  const p = g.createPattern(hatchCache, "repeat");
  p.setTransform(new DOMMatrix().scale(1 / s));
  return p;
}

/** The teardrop flag outline, inside a w × h box centred on the origin. Pole on the left. */
export function teardrop(g, w, h) {
  const x0 = -w / 2, y0 = -h / 2;
  g.moveTo(x0, y0 + h);                                       // pole foot
  g.lineTo(x0, y0 + h * 0.08);                                // up the pole
  g.bezierCurveTo(x0 + w * 0.15, y0 - h * 0.01, x0 + w * 0.95, y0 + h * 0.02, x0 + w, y0 + h * 0.3);
  g.bezierCurveTo(x0 + w * 1.02, y0 + h * 0.55, x0 + w * 0.55, y0 + h * 0.82, x0, y0 + h);
  g.closePath();
}
