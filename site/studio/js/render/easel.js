/* A welcome board where it is used: on an easel at a venue, on a table, or
 * leaning on a wall. Drawn to scale against the easel (about 1.6 m), so an A2
 * and an A0 look as different as they are. The board material shows: foam
 * and PVC have a white edge, acrylic is glassy (clear lets the room through
 * where nothing is printed), ACM has a brushed sheen. All SVG, so the proof
 * export draws it exactly as shown.
 */

const esc = (s) => String(s).replace(/"/g, "&quot;").replace(/&(?!quot;|amp;)/g, "&amp;");

export function easelSvg({ area, tex, colour = "#FFFFFF", options = {}, stock = "", active }) {
  const W = 1000, H = 1000, FLOOR = 900;
  const stand = options.stand || "easel";
  // The board's ledge: about 700 mm up on an easel, 750 on a table, 300 on the
  // heavy floor easel, the floor when leaning. Scale so board + ledge fit
  // (about 2.1 m of room at most, smaller for the big boards).
  const ledgeMm = { feet: 750, none: 0, heavy: 300 }[stand] ?? 700;
  const k = Math.min(0.42, 780 / (area.h + ledgeMm + 120));
  const bw = area.w * k, bh = area.h * k;
  const acrylic = /acrylic/i.test(stock), clear = /clear/i.test(stock), frosted = /frosted/i.test(stock), acm = /ACM/i.test(stock);
  const thick = (/5 mm/.test(stock) ? 5 : 3) * k + 2;
  // Where the board sits: on the easel's ledge at about 700 mm, on a table,
  // or standing on the floor against the wall.
  const ledgeY = FLOOR - ledgeMm * k;
  const x = 500 - bw / 2, y = ledgeY - bh;
  const base = clear && colour.toUpperCase() === "#FFFFFF" ? "rgba(255,255,255,.14)" : colour;
  const metal = stand === "metal" || stand === "heavy";
  const easelTop = Math.min(y - 40, FLOOR - 1650 * k), wood = metal ? "#1D1F23" : "#9A6B3F", woodDark = metal ? "#0E0F12" : "#7A522E";
  const spread = stand === "heavy" ? Math.max(bw * 0.55, 230) : 230;

  const easel = stand === "easel" || stand === "metal" || stand === "heavy" ? `
    <path d="M ${500 - 6} ${easelTop} L ${500 - spread} ${FLOOR + 6} M ${500 + 6} ${easelTop} L ${500 + spread} ${FLOOR + 6}" stroke="${wood}" stroke-width="${stand === "heavy" ? 10 : metal ? 7 : 12}" stroke-linecap="round"/>
    <path d="M 500 ${easelTop + 20} L 500 ${FLOOR - 4}" stroke="${woodDark}" stroke-width="${metal ? 6 : 10}" stroke-linecap="round" opacity=".85"/>
    <rect x="${500 - Math.max(bw / 2 + 30, 170)}" y="${ledgeY}" width="${Math.max(bw + 60, 340)}" height="${metal ? 9 : 14}" rx="3" fill="${wood}"/>` : "";
  const table = stand === "feet" ? `
    <rect x="${500 - 380}" y="${FLOOR - 750 * k}" width="760" height="16" rx="4" fill="#C9B79C"/>
    <rect x="${500 - 360}" y="${FLOOR - 750 * k + 16}" width="14" height="${750 * k - 16}" fill="#A8977E"/><rect x="${500 + 346}" y="${FLOOR - 750 * k + 16}" width="14" height="${750 * k - 16}" fill="#A8977E"/>
    <path d="M ${x + bw * 0.2 - 18} ${ledgeY} l 36 0 l -8 -16 l -20 0 z M ${x + bw * 0.8 - 18} ${ledgeY} l 36 0 l -8 -16 l -20 0 z" fill="rgba(255,255,255,.55)" stroke="rgba(0,0,0,.25)"/>` : "";

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3EEE6"/><stop offset="1" stop-color="#E6DED2"/></linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CDB89B"/><stop offset="1" stop-color="#B49C7C"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="brushed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".5" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
      <radialGradient id="light" cx=".5" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <clipPath id="boardclip"><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${acrylic ? 4 : 1}"/></clipPath>
    </defs>
    <rect width="${W}" height="${FLOOR}" fill="url(#wall)"/>
    <rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="url(#floor)"/>
    <rect width="${W}" height="${FLOOR}" fill="url(#light)"/>
    <path d="M 120 ${FLOOR - 340} q 30 -120 0 -240 q 70 70 40 240 z M 860 ${FLOOR - 300} q -30 -100 0 -200 q -60 60 -30 200 z" fill="#8FA77F" opacity=".55"/>
    ${table}
    <ellipse cx="500" cy="${(stand === "feet" ? FLOOR - 750 * k : FLOOR) + 8}" rx="${Math.max(bw * 0.6, 160)}" ry="14" fill="#000" opacity=".22" filter="url(#soft)"/>
    ${easel ? easel.split("\n").slice(0, 3).join("\n") : ""}
    <rect x="${x + 10}" y="${y + 14}" width="${bw}" height="${bh}" fill="#000" opacity="${clear ? 0.08 : 0.22}" filter="url(#soft)"/>
    <rect x="${x + thick * 0.6}" y="${y + thick * 0.6}" width="${bw}" height="${bh}" fill="${acrylic ? "rgba(200,225,230,.55)" : "#E9E6E0"}"/>
    <g clip-path="url(#boardclip)">
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${base}"/>
      ${tex ? `<image href="${esc(tex)}" x="${x}" y="${y}" width="${bw}" height="${bh}" preserveAspectRatio="none"${frosted ? ' opacity=".92"' : ""}/>` : ""}
      ${acrylic ? `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="url(#glass)"/>` : ""}
      ${acm ? `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="url(#brushed)"/>` : ""}
    </g>
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${acrylic ? 4 : 1}" fill="none" stroke="${acrylic ? "rgba(255,255,255,.8)" : "rgba(0,0,0,.18)"}" stroke-width="${acrylic ? 2 : 1}"/>
    ${easel ? easel.split("\n").slice(3).join("\n") : ""}
    ${active ? `<rect class="ui-only" x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="#E5007E" stroke-width="3" stroke-dasharray="12 9"/>` : ""}
  </svg>`;
}
