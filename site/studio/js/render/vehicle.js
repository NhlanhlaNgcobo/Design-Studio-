/* Vehicle livery: a Quantum-class panel van, side and rear.
 *
 * Eminence's biggest visible job is the Khula Med ambulance fleet — Toyota
 * Quantums — so the van is modelled on that class: long wheelbase, raked
 * windscreen, sliding side door, twin rear doors. It is a generic outline, not
 * a Toyota drawing; the proportions are what matter for a livery brief.
 *
 * Drawn in millimetres (viewBox = the vehicle), so the print panel quoted in
 * the editor is the panel shown here. Artwork is clipped to the body and then
 * the glass, wheels, lights and shut-lines are drawn OVER it — exactly as vinyl
 * is cut around them on the real vehicle.
 *
 * The right-hand side is the same van mirrored, but the artwork is not: a
 * livery reads front-to-back on both sides, so the right side gets its own
 * design and its own surface.
 */

import { surfaceSize } from "../products.js";

const esc = (s) => String(s).replace(/"/g, "&quot;").replace(/&(?!quot;|amp;)/g, "&amp;");

function geometry(L, H) {
  // Wheels and arches, front at x=0, ground at y=H.
  const r = H * 0.145, arch = r * 1.16, wy = H - r;
  const fw = L * 0.18, rw = L * 0.78;
  const sill = H - r * 0.32;
  const roof = H * 0.03, belt = H * 0.44;
  const ws = { base: [L * 0.13, H * 0.5], top: [L * 0.235, roof] };       // windscreen
  const body = [
    `M ${L * 0.012} ${H * 0.74}`,
    `L ${L * 0.004} ${sill - H * 0.02} Q ${L * 0.004} ${sill} ${L * 0.03} ${sill}`,
    `L ${fw - arch} ${sill} A ${arch} ${arch} 0 0 1 ${fw + arch} ${sill}`,
    `L ${rw - arch} ${sill} A ${arch} ${arch} 0 0 1 ${rw + arch} ${sill}`,
    `L ${L - L * 0.012} ${sill} Q ${L} ${sill} ${L} ${sill - H * 0.03}`,
    `L ${L} ${roof + H * 0.04} Q ${L} ${roof} ${L - L * 0.02} ${roof}`,
    `L ${ws.top[0]} ${roof}`,
    `L ${ws.base[0]} ${ws.base[1]}`,
    `Q ${L * 0.03} ${H * 0.56} ${L * 0.015} ${H * 0.62}`,
    "Z",
  ].join(" ");
  // Front door glass, behind the windscreen pillar.
  const slope = (ws.base[0] - ws.top[0]) / (ws.base[1] - ws.top[1]);
  const xAt = (y) => ws.top[0] + (y - ws.top[1]) * slope + L * 0.018;
  const glass = `M ${xAt(H * 0.07)} ${H * 0.07} L ${L * 0.335} ${H * 0.07} L ${L * 0.335} ${belt} L ${xAt(belt)} ${belt} Z`;
  const screen = `M ${ws.top[0]} ${roof + 6} L ${ws.base[0]} ${ws.base[1] - 6} L ${xAt(ws.base[1] - 30)} ${ws.base[1] - 30} L ${xAt(roof + 40)} ${roof + 40} Z`;
  return { r, arch, wy, fw, rw, sill, roof, belt, body, glass, screen };
}

function wheel(x, y, r) {
  return `<g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#1B1D21"/>
    <circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="url(#rim)"/>
    ${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${x + Math.cos((a * Math.PI) / 180) * r * 0.38}" cy="${y + Math.sin((a * Math.PI) / 180) * r * 0.38}" r="${r * 0.07}" fill="#7D838B"/>`).join("")}
    <circle cx="${x}" cy="${y}" r="${r * 0.14}" fill="#5A6068"/>
  </g>`;
}

export function vehicleSvg({ product, size, tex, colour, active }) {
  const view = product.surfaces.find((s) => s.id === active)?.view ?? "left";
  if (view === "rear") return rear({ product, size, tex, colour, active });

  const L = size.w, H = size.h;
  const g = geometry(L, H);
  const pad = L * 0.04;
  const surf = product.surfaces.find((s) => s.id === (view === "right" ? "side-right" : "side-left"));
  const a = surfaceSize(product, size, surf);
  // The side panel runs from behind the front door to just short of the tail.
  const ax = L * 0.345, ay = g.belt + H * 0.03;
  const right = view === "right";
  const flip = right ? `translate(${L} 0) scale(-1 1)` : "";
  const t = tex[surf.id];
  const artX = right ? L - ax - a.w : ax;

  const shut = (x) => `<path d="M ${x} ${g.roof + H * 0.06} L ${x} ${g.sill - 6}" stroke="#000" stroke-opacity=".28" stroke-width="${L * 0.0012}"/>`;

  return `<svg viewBox="${-pad} ${-pad} ${L + pad * 2} ${H + pad * 2}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <defs>
      <clipPath id="vbody"><path d="${g.body}" transform="${flip}"/></clipPath>
      <radialGradient id="rim" cx=".4" cy=".35"><stop offset="0" stop-color="#E6E8EB"/><stop offset="1" stop-color="#8E959D"/></radialGradient>
      <linearGradient id="vlight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".18" stop-color="#fff" stop-opacity=".05"/>
        <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity=".22"/>
      </linearGradient>
      <linearGradient id="vglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B6C78"/><stop offset=".45" stop-color="#2E3A44"/><stop offset="1" stop-color="#1E262D"/></linearGradient>
      <filter id="vsoft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${L * 0.008}"/></filter>
    </defs>
    <ellipse cx="${L / 2}" cy="${H + H * 0.01}" rx="${L * 0.55}" ry="${H * 0.035}" fill="#000" opacity=".3" filter="url(#vsoft)"/>
    <g transform="${flip}"><path d="${g.body}" fill="${colour}"/></g>
    <g clip-path="url(#vbody)">
      ${t ? `<image href="${esc(t)}" x="${artX}" y="${ay}" width="${a.w}" height="${a.h}" preserveAspectRatio="none"/>` : ""}
      <g transform="${flip}"><rect x="0" y="0" width="${L}" height="${H}" fill="url(#vlight)"/></g>
    </g>
    <g transform="${flip}">
      <path d="${g.body}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="${L * 0.0016}"/>
      <path d="${g.screen}" fill="url(#vglass)"/>
      <path d="${g.glass}" fill="url(#vglass)" stroke="#111" stroke-width="${L * 0.002}"/>
      ${shut(L * 0.34)}${shut(L * 0.56)}${shut(L * 0.995)}
      <path d="M ${L * 0.34} ${g.belt - H * 0.02} L ${L * 0.56} ${g.belt - H * 0.02}" stroke="#000" stroke-opacity=".18" stroke-width="${L * 0.002}"/>
      <rect x="${L * 0.355}" y="${H * 0.5}" width="${L * 0.03}" height="${H * 0.018}" rx="${H * 0.006}" fill="#000" opacity=".45"/>
      <rect x="${L * 0.004}" y="${H * 0.6}" width="${L * 0.03}" height="${H * 0.06}" rx="${H * 0.01}" fill="#F3EFD8" stroke="#999" stroke-width="4"/>
      <rect x="${L * 0.988}" y="${H * 0.55}" width="${L * 0.012}" height="${H * 0.13}" fill="#B3202A"/>
      <path d="M ${L * 0.005} ${H * 0.8} L ${L * 0.06} ${H * 0.8}" stroke="#2A2D33" stroke-width="${H * 0.05}"/>
      <rect x="${L * 0.27}" y="${H * 0.2}" width="${L * 0.03}" height="${H * 0.04}" rx="${H * 0.01}" fill="#2A2D33"/>
      ${wheel(g.fw, g.wy, g.r)}${wheel(g.rw, g.wy, g.r)}
    </g>
    ${active && active.startsWith("side") ? `<rect class="ui-only" x="${artX}" y="${ay}" width="${a.w}" height="${a.h}" fill="none" stroke="#E5007E" stroke-width="${L * 0.003}" stroke-dasharray="${L * 0.012} ${L * 0.009}"/>` : ""}
  </svg>`;
}

/** Rear view: twin doors, glass up top, bumper. The panel is the lower doors. */
function rear({ product, size, tex, colour, active }) {
  const W = 1880, H = size.h, pad = 160;
  const surf = product.surfaces.find((s) => s.id === "rear");
  const a = surfaceSize(product, size, surf);
  const ax = (W - a.w) / 2, ay = H * 0.47;
  const shell = `M 60 ${H * 0.9} L 40 ${H * 0.12} Q 50 ${H * 0.02} 180 ${H * 0.015} L ${W - 180} ${H * 0.015} Q ${W - 50} ${H * 0.02} ${W - 40} ${H * 0.12} L ${W - 60} ${H * 0.9} Z`;
  return `<svg viewBox="${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <defs>
      <clipPath id="rclip"><path d="${shell}"/></clipPath>
      <linearGradient id="rlight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".25" stop-color="#fff" stop-opacity=".1"/><stop offset=".75" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
      <linearGradient id="rglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B6C78"/><stop offset="1" stop-color="#1E262D"/></linearGradient>
      <filter id="rsoft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
    </defs>
    <ellipse cx="${W / 2}" cy="${H}" rx="${W * 0.55}" ry="60" fill="#000" opacity=".3" filter="url(#rsoft)"/>
    <rect x="120" y="${H * 0.86}" width="260" height="${H * 0.14}" rx="40" fill="#1B1D21"/>
    <rect x="${W - 380}" y="${H * 0.86}" width="260" height="${H * 0.14}" rx="40" fill="#1B1D21"/>
    <path d="${shell}" fill="${colour}"/>
    <g clip-path="url(#rclip)">
      ${tex.rear ? `<image href="${esc(tex.rear)}" x="${ax}" y="${ay}" width="${a.w}" height="${a.h}" preserveAspectRatio="none"/>` : ""}
      <rect width="${W}" height="${H}" fill="url(#rlight)"/>
    </g>
    <path d="${shell}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="8"/>
    <rect x="200" y="${H * 0.1}" width="${W / 2 - 240}" height="${H * 0.3}" rx="30" fill="url(#rglass)"/>
    <rect x="${W / 2 + 40}" y="${H * 0.1}" width="${W / 2 - 240}" height="${H * 0.3}" rx="30" fill="url(#rglass)"/>
    <path d="M ${W / 2} ${H * 0.04} V ${H * 0.88}" stroke="#000" stroke-opacity=".4" stroke-width="8"/>
    <rect x="44" y="${H * 0.5}" width="70" height="${H * 0.22}" rx="14" fill="#B3202A"/><rect x="${W - 114}" y="${H * 0.5}" width="70" height="${H * 0.22}" rx="14" fill="#B3202A"/>
    <rect x="20" y="${H * 0.86}" width="${W - 40}" height="${H * 0.07}" rx="20" fill="#2A2D33"/>
    <rect x="${W / 2 - 260}" y="${H * 0.78}" width="520" height="${H * 0.06}" fill="#F4F2EA" stroke="#999" stroke-width="5"/>
    ${active === "rear" ? `<rect class="ui-only" x="${ax}" y="${ay}" width="${a.w}" height="${a.h}" fill="none" stroke="#E5007E" stroke-width="10" stroke-dasharray="40 28"/>` : ""}
  </svg>`;
}
