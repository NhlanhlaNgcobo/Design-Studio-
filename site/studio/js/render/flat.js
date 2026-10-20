/* Flat goods: paper, banners, boards, flags and shopfront signs.
 *
 * Each one is drawn in the setting it is actually used in — cards on a desk,
 * a poster on a wall, a pull-up on its base, a correx board on its stakes, a
 * fascia over a shop door — because a flat rectangle on grey tells the customer
 * nothing about scale. A 600 mm correx board and a 6 m fascia look identical as
 * rectangles; in place, one is knee-high and one spans a shopfront.
 *
 * All SVG, so the proof export can serialise them exactly as shown.
 */

import { shade } from "./garment.js";

const esc = (s) => String(s).replace(/"/g, "&quot;").replace(/&(?!quot;|amp;)/g, "&amp;");

const img = (tex, x, y, w, h, extra = "") =>
  tex ? `<image href="${esc(tex)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" ${extra}/>` : "";

const outline = (on, x, y, w, h, extra = "") =>
  on ? `<rect class="ui-only" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#E5007E" stroke-width="3" stroke-dasharray="12 9" vector-effect="non-scaling-stroke" ${extra}/>` : "";

const svg = (w, h, body, defs = "") =>
  `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
     <defs>${defs}
       <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
       <filter id="paper" x="0" y="0" width="100%" height="100%">
         <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>
         <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .12 0 0 0 0"/>
       </filter>
     </defs>${body}</svg>`;

/* ─────────────────────────── paper ─────────────────────────── */

export function paperSvg({ product, size, tex, active }) {
  if (product.kind === "card") return cards(size, tex, active);
  if (product.kind === "poster") return poster(size, tex, active);
  return sheet(size, tex, active);
}

/** Two cards on a desk, the side being edited on top. */
function cards(size, tex, active) {
  const W = 1000, H = 760, k = 5.6;
  const cw = size.w * k, ch = size.h * k;
  const card = (side, x, y, rot, top) => `
    <g transform="translate(${x} ${y}) rotate(${rot})">
      <rect x="${-cw / 2 + 6}" y="${-ch / 2 + 14}" width="${cw}" height="${ch}" fill="#000" opacity=".22" filter="url(#soft)"/>
      <rect x="${-cw / 2}" y="${-ch / 2 + 3}" width="${cw}" height="${ch}" fill="#D9D5CC"/>
      <rect x="${-cw / 2}" y="${-ch / 2}" width="${cw}" height="${ch}" fill="#FFFFFF"/>
      ${img(tex[side], -cw / 2, -ch / 2, cw, ch)}
      <rect x="${-cw / 2}" y="${-ch / 2}" width="${cw}" height="${ch}" filter="url(#paper)" opacity=".7"/>
      <rect x="${-cw / 2}" y="${-ch / 2}" width="${cw}" height="${ch}" fill="url(#cardlight)"/>
      ${outline(top && active === side, -cw / 2, -ch / 2, cw, ch)}
    </g>`;
  const frontOnTop = active !== "back";
  const under = frontOnTop ? "back" : "front", over = frontOnTop ? "front" : "back";
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#desk)"/>
    ${card(under, 430, 330, -9, false)}
    ${card(over, 560, 450, 4, true)}`,
    `<linearGradient id="desk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDEAE3"/><stop offset="1" stop-color="#DCD7CD"/></linearGradient>
     <linearGradient id="cardlight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".06"/></linearGradient>`);
}

/** A flyer lying on a desk, slightly turned. */
function sheet(size, tex, active) {
  const W = 1000, H = 1000;
  const k = Math.min(620 / size.w, 800 / size.h);
  const sw = size.w * k, sh = size.h * k;
  const side = active === "back" ? "back" : "front";
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#desk)"/>
    <g transform="translate(500 500) rotate(-3)">
      <rect x="${-sw / 2 + 10}" y="${-sh / 2 + 22}" width="${sw}" height="${sh}" fill="#000" opacity=".2" filter="url(#soft)"/>
      <rect x="${-sw / 2}" y="${-sh / 2}" width="${sw}" height="${sh}" fill="#fff"/>
      ${img(tex[side], -sw / 2, -sh / 2, sw, sh)}
      <rect x="${-sw / 2}" y="${-sh / 2}" width="${sw}" height="${sh}" filter="url(#paper)" opacity=".6"/>
      <path d="M ${sw / 2 - 90} ${sh / 2} Q ${sw / 2 - 20} ${sh / 2 - 10} ${sw / 2} ${sh / 2 - 70} L ${sw / 2} ${sh / 2} Z" fill="#000" opacity=".06"/>
      <rect x="${-sw / 2}" y="${-sh / 2}" width="${sw}" height="${sh}" fill="url(#gloss)"/>
      ${outline(true, -sw / 2, -sh / 2, sw, sh)}
    </g>
    <text x="40" y="${H - 34}" font-family="JetBrains Mono, monospace" font-size="22" fill="#14161A" opacity=".5">${side === "back" ? "Back" : "Front"}</text>`,
    `<linearGradient id="desk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDEAE3"/><stop offset="1" stop-color="#DCD7CD"/></linearGradient>
     <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
}

/** A poster on a wall, held by four clips, with a person-height reference. */
function poster(size, tex, active) {
  const W = 1000, H = 1000;
  // Scale so A0 nearly fills the wall; a figure shows real size.
  const k = 780 / 1189;
  const pw = size.w * k, ph = size.h * k;
  const x = 560 - pw / 2, y = 470 - ph / 2;
  const person = 1700 * k;          // 1.7 m
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="#E9E5DD"/>
    <rect y="${H - 70}" width="${W}" height="70" fill="#D4CEC2"/>
    <rect x="${x + 8}" y="${y + 14}" width="${pw}" height="${ph}" fill="#000" opacity=".18" filter="url(#soft)"/>
    <rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="#fff"/>
    ${img(tex.front, x, y, pw, ph)}
    <rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="url(#sat)"/>
    ${[[x, y], [x + pw, y], [x, y + ph], [x + pw, y + ph]].map(([cx, cy]) => `<rect x="${cx - 9}" y="${cy - 5}" width="18" height="10" rx="2" fill="#2A2D33"/>`).join("")}
    ${outline(active, x, y, pw, ph)}
    <g fill="#14161A" opacity=".16" transform="translate(120 ${H - 70 - person})">
      <circle cx="${person * 0.13}" cy="${person * 0.07}" r="${person * 0.07}"/>
      <rect x="${person * 0.04}" y="${person * 0.15}" width="${person * 0.18}" height="${person * 0.42}" rx="${person * 0.06}"/>
      <rect x="${person * 0.05}" y="${person * 0.52}" width="${person * 0.07}" height="${person * 0.48}"/>
      <rect x="${person * 0.14}" y="${person * 0.52}" width="${person * 0.07}" height="${person * 0.48}"/>
    </g>
    <text x="120" y="${H - 24}" font-family="JetBrains Mono, monospace" font-size="20" fill="#14161A" opacity=".5">1.7 m</text>`,
    `<linearGradient id="sat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>`);
}

/* ─────────────────────────── banners & boards ─────────────────────────── */

export function bannerSvg({ product, size, tex, active }) {
  if (product.kind === "rollup") return rollup(size, tex.face, active);
  if (product.kind === "board") return board(size, tex.face, active);
  return pvc(size, tex.face, active);
}

/** A pull-up on its cassette. The bottom 100 mm of artwork is inside the base. */
function rollup(size, tex, active) {
  const W = 1000, H = 1000;
  const k = 860 / 2150;
  const bw = size.w * k, bh = size.h * k;
  const x = 500 - bw / 2, y = 910 - bh;
  const hidden = 100 * k;
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#floor)"/>
    <ellipse cx="500" cy="944" rx="${bw * 0.7}" ry="16" fill="#000" opacity=".28" filter="url(#soft)"/>
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#fff"/>
    <svg x="${x}" y="${y}" width="${bw}" height="${bh - hidden}" viewBox="0 0 ${bw} ${bh - hidden}" preserveAspectRatio="xMidYMin slice">
      ${img(tex, 0, 0, bw, bh)}
    </svg>
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="url(#sheen)"/>
    <rect x="${x - 4}" y="${y - 8}" width="${bw + 8}" height="10" rx="3" fill="#B9BDC2"/>
    <rect x="${x - 24}" y="${910 - hidden}" width="${bw + 48}" height="${hidden + 22}" rx="10" fill="url(#cassette)"/>
    <rect x="${x - 30}" y="${928}" width="18" height="10" rx="3" fill="#7D838B"/><rect x="${x + bw + 12}" y="${928}" width="18" height="10" rx="3" fill="#7D838B"/>
    ${outline(active, x, y, bw, bh - hidden)}`,
    `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1EEE8"/><stop offset=".9" stop-color="#E3DED4"/><stop offset="1" stop-color="#D6D0C4"/></linearGradient>
     <linearGradient id="cassette" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4E6E9"/><stop offset=".5" stop-color="#A9AEB4"/><stop offset="1" stop-color="#7D838B"/></linearGradient>
     <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset=".35" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>`);
}

/** A PVC banner cable-tied to a palisade fence. Eyelets every ~500 mm, as hemmed. */
function pvc(size, tex, active) {
  const W = 1000, H = 760;
  const k = Math.min(880 / size.w, 440 / size.h);
  const bw = size.w * k, bh = size.h * k;
  const x = 500 - bw / 2, y = 330 - bh / 2;
  const n = Math.max(2, Math.round(size.w / 500));
  const eyelets = [];
  for (let i = 0; i <= n; i++) for (const yy of [y + 9, y + bh - 9]) eyelets.push([x + 9 + ((bw - 18) * i) / n, yy]);
  const pales = [];
  for (let px = 20; px < W; px += 34) pales.push(`<path d="M ${px} 70 L ${px + 8} 52 L ${px + 16} 70 L ${px + 16} 640 L ${px} 640 Z" fill="#3B4048"/>`);
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <rect y="600" width="${W}" height="${H - 600}" fill="#8EA36B"/>
    ${pales.join("")}
    <rect y="120" width="${W}" height="12" fill="#2F343B"/><rect y="560" width="${W}" height="12" fill="#2F343B"/>
    <g filter="url(#wave)">
      <rect x="${x + 6}" y="${y + 14}" width="${bw}" height="${bh}" fill="#000" opacity=".28" filter="url(#soft)"/>
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#fff"/>
      ${img(tex, x, y, bw, bh)}
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="url(#vinyl)"/>
    </g>
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/>
    ${eyelets.map(([ex, ey]) => `<circle cx="${ex}" cy="${ey}" r="4.5" fill="#D4D7DB" stroke="#7D838B" stroke-width="1.5"/>`).join("")}
    ${outline(active, x, y, bw, bh)}`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3F1"/><stop offset="1" stop-color="#EEF3F5"/></linearGradient>
     <linearGradient id="vinyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".06"/><stop offset=".3" stop-color="#fff" stop-opacity=".1"/><stop offset=".6" stop-color="#000" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>
     <filter id="wave"><feTurbulence type="fractalNoise" baseFrequency=".006 .02" numOctaves="1" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>`);
}

/** A correx board on two wire stakes, in grass. Flutes run horizontally. */
function board(size, tex, active) {
  const W = 1000, H = 900;
  const k = Math.min(760 / size.w, 560 / size.h);
  const bw = size.w * k, bh = size.h * k;
  const x = 500 - bw / 2, y = 500 - bh / 2 - 60;
  const flutes = [];
  for (let fy = y + 4; fy < y + bh; fy += 5) flutes.push(`<path d="M ${x} ${fy} H ${x + bw}" stroke="#000" stroke-opacity=".035" stroke-width="1"/>`);
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <path d="M 0 ${H - 200} Q 500 ${H - 240} ${W} ${H - 200} L ${W} ${H} L 0 ${H} Z" fill="#7F9A5A"/>
    <path d="M ${x + bw * 0.22} ${y + bh} L ${x + bw * 0.22} ${H - 150}" stroke="#7D838B" stroke-width="5"/>
    <path d="M ${x + bw * 0.78} ${y + bh} L ${x + bw * 0.78} ${H - 150}" stroke="#7D838B" stroke-width="5"/>
    <rect x="${x + 8}" y="${y + 14}" width="${bw}" height="${bh}" fill="#000" opacity=".25" filter="url(#soft)"/>
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#fff"/>
    ${img(tex, x, y, bw, bh)}
    ${flutes.join("")}
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="url(#plastic)"/>
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="#000" stroke-opacity=".15" stroke-width="2"/>
    ${outline(active, x, y, bw, bh)}`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3F1"/><stop offset="1" stop-color="#EEF3F5"/></linearGradient>
     <linearGradient id="plastic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>`);
}

/* ─────────────────────────── teardrop flag ─────────────────────────── */

/** The same outline the editor masks with (editor.js → teardrop), in SVG. */
export function teardropPath(x0, y0, w, h) {
  return `M ${x0} ${y0 + h} L ${x0} ${y0 + h * 0.08}
    C ${x0 + w * 0.15} ${y0 - h * 0.01}, ${x0 + w * 0.95} ${y0 + h * 0.02}, ${x0 + w} ${y0 + h * 0.3}
    C ${x0 + w * 1.02} ${y0 + h * 0.55}, ${x0 + w * 0.55} ${y0 + h * 0.82}, ${x0} ${y0 + h} Z`;
}

export function flagSvg({ size, tex, active }) {
  const W = 1000, H = 1000;
  const k = 760 / 2900;
  const fw = size.w * k, fh = size.h * k;
  const x0 = 470 - fw / 2, y0 = 830 - fh - 60;
  const d = teardropPath(x0, y0, fw, fh);
  const poleTop = y0 + fh * 0.04;
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <path d="M 0 860 Q 500 820 ${W} 860 L ${W} ${H} L 0 ${H} Z" fill="#7F9A5A"/>
    <ellipse cx="${x0 + fw * 0.4}" cy="905" rx="${fw * 0.6}" ry="12" fill="#000" opacity=".18" filter="url(#soft)"/>
    <path d="M ${x0 - 2} ${y0 + fh} L ${x0 - 2} 900" stroke="#5E646C" stroke-width="7"/>
    <g filter="url(#flutter)">
      <path d="${d}" fill="#fff"/>
      <g clip-path="url(#fclip)">
        ${img(tex, x0, y0, fw, fh)}
        <rect x="${x0}" y="${y0}" width="${fw}" height="${fh}" fill="url(#folds)" style="mix-blend-mode:multiply"/>
      </g>
    </g>
    <path d="M ${x0 - 2} ${y0 + fh} L ${x0 - 2} ${poleTop} C ${x0 + fw * 0.15} ${y0 - fh * 0.01}, ${x0 + fw * 0.95} ${y0 + fh * 0.02}, ${x0 + fw} ${y0 + fh * 0.3}"
          fill="none" stroke="#3B4048" stroke-width="6" stroke-linecap="round"/>
    <path d="M ${x0 - 14} 900 L ${x0 + 10} 900 L ${x0 - 2} 930 Z" fill="#3B4048"/>
    ${active ? `<path class="ui-only" d="${d}" fill="none" stroke="#E5007E" stroke-width="3" stroke-dasharray="12 9"/>` : ""}`,
    `<clipPath id="fclip"><path d="${d}"/></clipPath>
     <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3F1"/><stop offset="1" stop-color="#EEF3F5"/></linearGradient>
     <linearGradient id="folds" x1="0" y1="0" x2="1" y2=".25">
       <stop offset="0" stop-color="#fff"/><stop offset=".22" stop-color="#d8d8d8"/><stop offset=".38" stop-color="#fff"/>
       <stop offset=".58" stop-color="#cfcfcf"/><stop offset=".76" stop-color="#fff"/><stop offset="1" stop-color="#d6d6d6"/></linearGradient>
     <filter id="flutter"><feTurbulence type="fractalNoise" baseFrequency=".004 .012" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G"/></filter>`);
}

/* ─────────────────────────── shopfront fascia ─────────────────────────── */

/**
 * A single-storey shopfront with the sign over the door — the Stop & Buy job,
 * in other words. The building is sized from the sign, plus a reference door
 * (2.1 m) so a 2.4 m sign and a 6 m sign read at their real scale.
 */
export function shopfrontSvg({ size, tex, colour, active, options }) {
  const W = 1000, H = 760;
  const facadeMm = Math.max(size.w + 1400, 5200);
  const k = 900 / facadeMm;
  const fx = 50, groundY = 690;
  const storey = 3600 * k;
  const sw = size.w * k, sh = size.h * k;
  const sx = 500 - sw / 2, sy = groundY - storey + 120 * k;
  const doorW = 1000 * k, doorH = 2100 * k;
  const lit = options?.lit;
  return svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <rect x="${fx}" y="${groundY - storey - 40 * k}" width="${900}" height="${storey + 40 * k}" fill="#E7DCCB"/>
    <rect x="${fx}" y="${groundY - storey - 70 * k}" width="${900}" height="${50 * k + 6}" fill="#CDBFA8"/>
    <rect x="${fx + 40}" y="${sy + sh + 160 * k}" width="${820}" height="${groundY - sy - sh - 160 * k}" fill="#2B3138"/>
    <rect x="${500 - doorW / 2}" y="${groundY - doorH}" width="${doorW}" height="${doorH}" fill="#5A6B77"/>
    <rect x="${fx + 70}" y="${groundY - doorH}" width="${500 - doorW / 2 - fx - 90}" height="${doorH * 0.86}" fill="url(#glass)"/>
    <rect x="${500 + doorW / 2 + 20}" y="${groundY - doorH}" width="${fx + 830 - 500 - doorW / 2 - 20}" height="${doorH * 0.86}" fill="url(#glass)"/>
    <path d="M ${500} ${groundY - doorH} V ${groundY}" stroke="#3E4A53" stroke-width="3"/>
    <rect y="${groundY}" width="${W}" height="${H - groundY}" fill="#B8B2A7"/>
    <rect y="${groundY}" width="${W}" height="6" fill="#9C968B"/>
    ${lit ? `<rect x="${sx - 20}" y="${sy - 20}" width="${sw + 40}" height="${sh + 40}" fill="#FFF6D8" opacity=".55" filter="url(#soft)"/>` : ""}
    <rect x="${sx + 4}" y="${sy + 10}" width="${sw}" height="${sh}" fill="#000" opacity=".3" filter="url(#soft)"/>
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${colour}"/>
    ${img(tex.face, sx, sy, sw, sh)}
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#${lit ? "lightbox" : "acm"})"/>
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="${shade(colour === "#FFFFFF" ? "#C9CDD2" : colour, 0.7)}" stroke-width="4"/>
    ${outline(active, sx, sy, sw, sh)}
    <text x="${500}" y="${H - 22}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="18" fill="#14161A" opacity=".55">Door shown 2.1 m high for scale</text>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3F1"/><stop offset="1" stop-color="#EEF3F5"/></linearGradient>
     <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9DB4C3"/><stop offset=".5" stop-color="#6F8797"/><stop offset="1" stop-color="#4E6473"/></linearGradient>
     <linearGradient id="acm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
     <radialGradient id="lightbox" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);
}
