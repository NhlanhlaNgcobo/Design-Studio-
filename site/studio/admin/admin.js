/* The store owner's price settings.
 *
 * Every number the Studio charges is here, in the words a print shop uses.
 * The page edits a copy of the prices, shows a live example with the Studio's
 * own quote engine, and saves through PUT /api/pricing (admin password).
 */
import { DEFAULT_PRICES, setPrices, prices, quote, rand2 } from "../js/pricing.js";
import { PRODUCTS, PROCESSES } from "../js/products.js";
import { TENANT, applyTheme } from "../js/tenant.js";

const API = `/api/pricing?tenant=${encodeURIComponent(TENANT.id)}`;
applyTheme();
document.title = `Studio prices — ${TENANT.name}`;
document.querySelector("#shopName").textContent = TENANT.name;

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let P = structuredClone(DEFAULT_PRICES);
let updated = null;

/* ── units: how a stored number is shown ── */
const UNITS = {
  rand:   { pre: "R", show: (v) => v, store: (v) => v },
  pct:    { post: "%", show: (v) => +(v * 100).toFixed(2), store: (v) => v / 100 },       // 0.15 → 15 %
  uplift: { post: "%", show: (v) => +((v - 1) * 100).toFixed(2), store: (v) => 1 + v / 100 }, // 1.25 → +25 %
  off:    { post: "% off", show: (v) => +((1 - v) * 100).toFixed(2), store: (v) => 1 - v / 100 },
  times:  { post: "×", show: (v) => v, store: (v) => v },
  mm:     { post: "mm", show: (v) => v, store: (v) => v },
  count:  { show: (v) => v, store: (v) => Math.round(v) },
};
const get = (path) => path.reduce((o, k) => o?.[k], P);
const put = (path, v) => { const last = path.at(-1); path.slice(0, -1).reduce((o, k) => o[k], P)[last] = v; };

function field(path, label, unit = "rand") {
  const u = UNITS[unit];
  return `<label class="f">${esc(label)}<span class="in">${u.pre ? `<span>${u.pre}</span>` : ""}<input type="number" step="any" min="0" inputmode="decimal" data-path='${JSON.stringify(path)}' data-unit="${unit}" value="${u.show(get(path))}">${u.post ? `<span>${u.post}</span>` : ""}</span></label>`;
}
const input = (path, unit = "rand") => field(path, "", unit).replace('<label class="f">', '<label class="f" style="font-weight:400">');
const section = (title, help, body) => `<section><h2>${esc(title)}</h2>${help ? `<p class="help">${esc(help)}</p>` : ""}${body}</section>`;
const rows = (html) => `<div class="rows">${html}</div>`;
const tierTable = (path, qtyLabel, priceLabel) => `<table><tr><th>${qtyLabel}</th><th>${priceLabel}</th></tr>${Object.keys(get(path)).map((k) =>
  `<tr><td class="mono">${esc(k)}</td><td>${input([...path, k])}</td></tr>`).join("")}</table>`;
const name = (id) => PRODUCTS[id]?.name ?? id;
const sizeName = (pid, key) => PRODUCTS[pid]?.sizes.find((s) => s.id === key)?.label ?? key;

function render() {
  const bandLabel = (b) => b.maxMm2 == null ? `Bigger than ${P.bands.at(-2)?.id}` : `Up to ${b.id}`;
  $("#form").innerHTML = [
    section("Garments — the blank", "Price of the plain garment, before printing. Bigger sizes cost more to buy in.",
      rows(Object.keys(P.blank).map((k) => field(["blank", k], name(k))).join("") + field(["bigSizeUplift"], "2XL and bigger, extra", "pct"))),
    section("DTF and sublimation — per print", "Charged per garment for each printed position, by how big the artwork actually is.",
      `<table><tr><th>Print size</th><th>DTF transfer</th><th>Sublimation</th></tr>${P.bands.map((b, i) =>
        `<tr><td><b>${esc(bandLabel(b))}</b></td><td>${input(["bands", i, "dtf"])}</td><td>${input(["bands", i, "sub"])}</td></tr>`).join("")}</table>`),
    section("Screen printing", "A once-off screen per ink colour per position, then a run charge per colour on every garment.",
      rows(field(["screen", "setupPerColour"], "Screen, once-off, per colour") + field(["screen", "runPerColour"], "Per print, per colour") +
        field(["screen", "maxColours"], "Most colours you print", "count") + field(["screen", "minQty"], "Minimum order (garments)", "count"))),
    section("Embroidery", "A once-off digitising fee per order, then a price per logo stitched.",
      rows(field(["embroidery", "digitising"], "Digitising, once-off") + field(["embroidery", "small"], "Small logo, each") +
        field(["embroidery", "large"], "Large logo, each") + field(["embroidery", "smallMaxMm"], "A logo counts as small up to", "mm"))),
    section("Cut vinyl on garments", "",
      rows(field(["vinyl", "small"], "Small (up to 15 × 15 cm), each") + field(["vinyl", "large"], "Large, each") + field(["vinyl", "perExtraColour"], "Each extra colour"))),
    section("Bulk discount", "Taken off garments and printing at these quantities.",
      `<table><tr><th>From</th><th>Discount</th></tr>${P.volume.map(([q], i) =>
        `<tr><td>${input(["volume", i, 0], "count")}</td><td>${input(["volume", i, 1], "off")}</td></tr>`).join("")}</table>`),
    section("Business cards", "Price for the whole run at each quantity.", tierTable(["paper", "cards"], "Quantity", "Run price") +
      rows(field(["doubleSided", "cards"], "Double-sided, extra", "uplift"))),
    section("Welcome cards", "Price for the whole run of A6 at each quantity; other sizes are a multiple of it.", tierTable(["paper", "welcome"], "Quantity", "Run price (A6)") +
      rows(Object.keys(P.welcomeSize).map((k) => field(["welcomeSize", k], `${sizeName("welcome", k)} costs`, "times")).join("") + field(["doubleSided", "welcome"], "Double-sided, extra", "uplift"))),
    section("Flyers", "Price for the whole run of A5 at each quantity; other sizes are a multiple of it.", tierTable(["paper", "flyer"], "Quantity", "Run price (A5)") +
      rows(Object.keys(P.flyerSize).map((k) => field(["flyerSize", k], `${k} costs`, "times")).join("") + field(["doubleSided", "flyer"], "Double-sided, extra", "uplift"))),
    section("Paper and card upgrades", "On top of the standard stock.", rows(Object.keys(P.stockUplift).map((k) => field(["stockUplift", k], k, "pct")).join("") +
      field(["roundedCorners"], "Rounded corners, extra", "pct"))),
    section("Posters, PVC banners and correx — per m²", "",
      rows(Object.keys(P.perM2).map((k) => field(["perM2", k], `${name(k)} per m²`) + field(["minEach", k], `${name(k)} minimum each`)).join(""))),
    section("Fixed-price items", "",
      Object.keys(P.fixed).map((pid) => `<h3 style="font-size:.86rem;margin:12px 0 6px">${esc(name(pid))}</h3>` +
        rows(Object.keys(P.fixed[pid]).map((k) => field(["fixed", pid, k], sizeName(pid, k))).join(""))).join("") +
      `<h3 style="font-size:.86rem;margin:12px 0 6px">Gazebo printed walls</h3>` + rows(Object.keys(P.gazeboWall).map((k) => field(["gazeboWall", k], `Back wall, ${sizeName("gazebo", k)}`)).join("") + field(["gazeboSideWall"], "Side wall (3 m), each"))),
    section("Installed work — price range per m²", "Vehicles and shopfronts are never sold at a fixed price; the Studio shows this range and you quote after seeing it.",
      `<table><tr><th></th><th>From</th><th>To</th></tr>${Object.entries(P.installed).flatMap(([k, v]) => Object.keys(v).map((f) =>
        `<tr><td>${esc(PROCESSES[k]?.label ?? k)}${f === "litExtraPerM2" ? " — illuminated, extra" : ""}</td><td>${input(["installed", k, f, 0])}</td><td>${input(["installed", k, f, 1])}</td></tr>`)).join("")}</table>`),
    section("VAT", "", rows(field(["vat"], "VAT rate", "pct"))),
  ].join("");
}

$("#form").addEventListener("input", (e) => {
  const i = e.target.closest("input[data-path]"); if (!i || i.value === "") return;
  const v = Number(i.value); if (!Number.isFinite(v) || v < 0) return;
  put(JSON.parse(i.dataset.path), UNITS[i.dataset.unit].store(v));
  dirty(true); example();
});

/* ── live example ── */
const BANDS = { A6: [100, 140], A5: [140, 200], A4: [200, 280], A3: [280, 400], "A3+": [320, 450] };
function setupExample() {
  const ids = Object.keys(PRODUCTS).filter((k) => !PRODUCTS[k].quoteOnly);
  $("#exProduct").innerHTML = ids.map((k) => `<option value="${k}">${esc(name(k))}</option>`).join("");
  $("#exBand").innerHTML = Object.keys(BANDS).map((k) => `<option${k === "A4" ? " selected" : ""}>${k}</option>`).join("");
  const proc = () => { const p = PRODUCTS[$("#exProduct").value]; $("#exProcess").innerHTML = p.processes.map((k) => `<option value="${k}">${esc(PROCESSES[k].label)}</option>`).join(""); };
  $("#exProduct").onchange = () => { proc(); example(); };
  for (const id of ["#exProcess", "#exQty", "#exBand"]) $(id).oninput = example;
  proc();
}
function example() {
  setPrices(P);
  const id = $("#exProduct").value, p = PRODUCTS[id], size = p.sizes.find((s) => s.id === "M") ?? p.sizes[0];
  const qty = Math.max(1, +$("#exQty").value || 1), [w, h] = BANDS[$("#exBand").value];
  const garment = !!p.sizeBreakdown || ["cap", "tote"].includes(id);
  const q = quote({ productId: id, product: p, sizeId: size.id, sizeLabel: size.label, sizeW: size.w, sizeH: size.h,
    process: $("#exProcess").value, stock: p.stocks?.[0] ?? null, qty, breakdown: { M: qty }, options: {},
    positions: garment ? [{ surfaceId: "front", label: "Front", areaMm2: w * h, maxSideMm: Math.max(w, h), colours: 2 }] : [] });
  $("#exOut").innerHTML = q.lines.map((l) => `<div class="line"><span>${esc(l.label)}${l.run ? "" : ` × ${l.qty}`}</span><span>${rand2(l.total)}</span></div>`).join("") +
    `<div class="line"><span>VAT</span><span>${rand2(q.vat)}</span></div><div class="tot"><span>Total</span><span>${rand2(q.total)}</span></div>` +
    `<div class="line"><span>Each</span><span>${rand2(q.each)}</span></div>` + q.blockers.map((b) => `<p class="help" style="color:var(--bad)">${esc(b)}</p>`).join("");
}

/* ── load / save ── */
function status(kind, text) { const s = $("#status"); s.className = `status ${kind}`; s.textContent = text; }
let isDirty = false;
function dirty(on) { isDirty = on; if (on) status("starter", "Unsaved changes — customers still see the last saved prices."); }
const when = (iso) => new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
function showSaved() {
  status(updated ? "saved" : "starter", updated
    ? `Saved ${when(updated)}. These are the prices customers see in the Studio.`
    : "These are the STARTER prices that came with the Studio — customers see them until you review and save your own.");
}

async function load() {
  try {
    const r = await fetch(API, { cache: "no-store" });
    const d = r.ok ? await r.json() : {};
    if (d.prices) { setPrices(d.prices); P = structuredClone(prices()); updated = d.updated; }
  } catch { /* offline: starter prices */ }
  render(); example(); showSaved();
}

$("#save").onclick = async () => {
  const pw = $("#password").value;
  if (!pw) { status("err", "Type the admin password first."); $("#password").focus(); return; }
  const b = $("#save"); b.disabled = true; b.textContent = "Saving…";
  try {
    const r = await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${pw}` }, body: JSON.stringify({ prices: P }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Could not save (${r.status}).`);
    try { sessionStorage.setItem(`studio-admin:${TENANT.id}`, pw); } catch {}
    updated = d.updated; isDirty = false; showSaved();
  } catch (e) { status("err", e.message); }
  finally { b.disabled = false; b.textContent = "Save prices"; }
};
$("#reset").onclick = () => {
  if (!confirm("Put every price back to the starter prices? Nothing changes for customers until you save.")) return;
  P = structuredClone(DEFAULT_PRICES); render(); example(); dirty(true);
};
addEventListener("beforeunload", (e) => { if (isDirty) e.preventDefault(); });
try { $("#password").value = sessionStorage.getItem(`studio-admin:${TENANT.id}`) || ""; } catch {}

setupExample();
load();
