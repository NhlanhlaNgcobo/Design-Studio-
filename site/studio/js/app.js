/* Eminence Design Studio — the page.
 *
 * Flow: pick a product → design each print position on a true-size editor →
 * watch the mockup, the checks and the price update → send it on WhatsApp with
 * the proof and the original files.
 *
 * State is plain data (below). The editor mutates layer objects in place while
 * dragging, and calls commit() when a gesture ends — that is where undo
 * history, the draft save and the quote catch up.
 */

import { PRODUCTS, GROUPS, PROCESSES, surfaceSize, effectiveDpi, dpiVerdict, isDark, contrastRatio, luminance } from "./products.js";
import { quote as priceQuote, rand, rand2, PRICES_CONFIRMED } from "./pricing.js";
import { loadAsset, applyBackgroundRemoval, restoreBackground } from "./artwork.js";
import { History, uid, FONTS, newTextLayer, carryOver, saveDraft, loadDraft, clearDraft, setDraftScope } from "./doc.js";
import { layerSize, layerCorners, designBounds, composeSurface, ensureFonts } from "./compose.js";
import { Editor } from "./editor.js";
import { renderMockup, snapshotMockup, viewFor } from "./render/index.js";
import { loadManifest } from "./render/photo.js";
import { buildSpec, renderProof, jobRef, toBlob, download } from "./proof.js";
import { uploadJob, orderMessage, whatsappUrl } from "./handoff.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mm = (n) => `${Math.round(n)} mm`;
const embedParams = new URLSearchParams(location.search);
let hostOrigin = null;
try {
  const origin = new URL(embedParams.get('parentOrigin'));
  if (embedParams.get('embed') === '1' && parent !== window && ['https:', 'http:'].includes(origin.protocol)) hostOrigin = origin.origin;
} catch { /* Standalone studio. */ }
if (hostOrigin) {
  setDraftScope(`${hostOrigin}:${embedParams.get('product') || 'tee'}`);
  document.body.classList.add('is-embedded');
  const accent = embedParams.get('accent');
  if (/^#[\da-f]{6}$/i.test(accent || '')) document.body.style.setProperty('--magenta-ink', accent);
  $('#sendTop .long').textContent = 'Use this design';
  $('#sendTop .short').textContent = 'Use design';
}

// Keep one editor and one preview; switching views never duplicates design state.
$('#artworkTools').append($('.toolbar'), $('#emptyCta'));
function setMode(mode) {
  $('#studio').dataset.mode = mode;
  $('#editMode').setAttribute('aria-pressed', String(mode === 'edit'));
  $('#previewMode').setAttribute('aria-pressed', String(mode === 'preview'));
  requestAnimationFrame(() => { editor.resize(); updateMockup(); });
}
$('#editMode').onclick = () => setMode('edit');
$('#previewMode').onclick = () => setMode('preview');
$('#showGuides').onchange = () => updateMockup();
$('#chooseProduct').onclick = () => { $('#catalogDialog').showModal(); $('#productSearch').focus(); };
$('#closeCatalog').onclick = () => $('#catalogDialog').close();
$('#productSearch').oninput = filterProducts;
function filterProducts() {
  const query = $('#productSearch').value.trim().toLowerCase();
  $$('#products .pbtn').forEach(b => { b.hidden = !b.textContent.toLowerCase().includes(query); });
  $$('#products .pgroup').forEach(g => { g.hidden = !g.querySelector('.pbtn:not([hidden])'); });
  $('#noProducts').hidden = !!$('#products .pbtn:not([hidden])');
}

/* ─────────────────────────── state ─────────────────────────── */
const state = {
  productId: "tee", sizeId: null, colour: null, process: null, stock: null, options: {},
  qty: 1, breakdown: {}, surfaceId: null, selected: null, designs: {},
  yaw: null, pitch: 18,
};
const assets = new Map();
const history = new History();
const tex = {}, texCanvas = {};
const texVersion = {};
let transferSource = null;

const P = () => PRODUCTS[state.productId];
const S = () => P().sizes.find((s) => s.id === state.sizeId) ?? P().sizes[0];
const surf = (id = state.surfaceId) => P().surfaces.find((s) => s.id === id) ?? P().surfaces[0];
const layers = (id = state.surfaceId) => (state.designs[id] ||= []);
const selLayer = () => layers().find((l) => l.id === state.selected) ?? null;
const designedIds = () => Object.keys(state.designs).filter((k) => state.designs[k]?.length && P().surfaces.some((s) => s.id === k));

function areaOf(s = surf()) {
  const a = surfaceSize(P(), S(), s);
  return { w: a.w, h: a.h, bleed: s.bleedMm || 0, safe: s.safeMm || 0, shape: s.shape || "rect", hiddenBottom: s.hiddenBottomMm || 0 };
}
/** The colour of the thing being printed on, for the editor and contrast checks. */
function material() {
  const r = P().render;
  if (["paper", "banner", "flag", "mug"].includes(r)) return "#FFFFFF";
  return state.colour;
}
const colourName = () => P().colours.find((c) => c.hex === state.colour)?.name ?? state.colour;

/* ─────────────────────────── product setup ─────────────────────────── */
function selectProduct(id, { keepDesign = true } = {}) {
  const from = P();
  const to = PRODUCTS[id];
  if (!to) return;
  const source = transferSource ?? { designs: state.designs, productId: state.productId };
  const carried = keepDesign && from !== to ? carryOver(source.designs, PRODUCTS[source.productId], to, (p, s) => surfaceSize(p, p.sizes[0], s)) : keepDesign ? state.designs : {};
  state.productId = id;
  state.sizeId = to.sizes.find((s) => s.id === "M")?.id ?? to.sizes[0].id;
  state.colour = to.colours[0].hex;
  state.process = to.processes[0];
  state.stock = to.stocks?.[0] ?? null;
  state.options = Object.fromEntries((to.options || []).map((o) => [o.id, o.default]));
  state.designs = carried;
  state.surfaceId = to.surfaces.find((s) => carried[s.id]?.length)?.id ?? to.surfaces[0].id;
  state.selected = null;
  // Mug: turned so the handle shows on the right and most of the print faces you.
  state.yaw = to.render === "gazebo" ? -32 : to.render === "mug" ? 52 : 0;
  state.pitch = 18;
  if (to.sizeBreakdown) { if (!Object.keys(state.breakdown).length) state.breakdown = { M: 1 }; }
  else state.qty = to.defaultQty ?? (to.qtyTiers?.[to.group === "Print" ? 1 : 0] ?? 1);
  clearTextures();
  renderProductPanel();
  refreshAll();
  commit(false, false);
  const u = new URL(location.href); u.searchParams.set("product", id); window.history.replaceState(null, "", u);
}

/* ─────────────────────────── panel: product ─────────────────────────── */
function renderProductPanel() {
  const p = P();
  $('#productName').textContent = p.name;
  $('#productBlurb').textContent = p.blurb;
  $("#products").innerHTML = GROUPS.map((g) => {
    const items = Object.entries(PRODUCTS).filter(([, x]) => x.group === g);
    if (!items.length) return "";
    return `<div class="pgroup"><h3>${g}</h3><div class="pgrid">${items.map(([k, x]) =>
      `<button class="pbtn" data-p="${k}" aria-pressed="${k === state.productId}"><b>${esc(x.name)}</b><span>${esc(x.blurb)}</span></button>`).join("")}</div></div>`;
  }).join("");
  filterProducts();

  $("#sizes").innerHTML = p.sizes.map((s) => `<button class="chip" role="radio" data-s="${s.id}" aria-checked="${s.id === state.sizeId}">${esc(s.label)}</button>`).join("");
  $("#colours").innerHTML = p.colours.map((c) => `<button class="sw" role="radio" data-c="${c.hex}" aria-checked="${c.hex === state.colour}" aria-label="${esc(c.name)}" title="${esc(c.name)}" style="background:${c.hex}"></button>`).join("");
  $("#colours").closest(".field").hidden = p.colours.length < 2;
  $("#colourName").textContent = colourName();

  $("#stockField").hidden = !p.stocks;
  if (p.stocks) $("#stock").innerHTML = p.stocks.map((s) => `<option${s === state.stock ? " selected" : ""}>${esc(s)}</option>`).join("");

  $("#optionsField").hidden = !p.options;
  $("#optionsField").innerHTML = (p.options || []).map((o) => `<label class="opt-row"><input type="checkbox" data-o="${o.id}"${state.options[o.id] ? " checked" : ""}> ${esc(o.label)}</label>`).join("");

  renderProcesses();
}

function renderProcesses() {
  const p = P();
  $("#processes").innerHTML = p.processes.map((id) => {
    const pr = PROCESSES[id];
    const bad = pr.lightOnly && isDark(state.colour) && !["#FFFFFF"].includes(state.colour) ? "Not on dark colours." : "";
    return `<button class="proc" role="radio" data-pr="${id}" aria-checked="${id === state.process}"${bad ? ` data-bad="${bad}"` : ""}><b>${pr.label}</b><span>${pr.note}</span></button>`;
  }).join("");
}

$("#products").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; if (b.dataset.p !== state.productId) selectProduct(b.dataset.p); $('#catalogDialog').close(); goTab('design'); });
$("#sizes").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (!b) return; state.sizeId = b.dataset.s; renderProductPanel(); refreshAll(); commit(); });
$("#colours").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; state.colour = b.dataset.c; renderProductPanel(); refreshAll(); commit(); });
$("#processes").addEventListener("click", (e) => { const b = e.target.closest("[data-pr]"); if (!b) return; state.process = b.dataset.pr; renderProcesses(); refreshAll(); commit(); });
$("#stock").addEventListener("change", (e) => { state.stock = e.target.value; refreshQuote(); commit(); });
$("#optionsField").addEventListener("change", (e) => { const i = e.target.closest("[data-o]"); if (!i) return; state.options[i.dataset.o] = i.checked; refreshAll(); commit(); });

/* ─────────────────────────── panel: surfaces & views ─────────────────────────── */
function renderSurfaces() {
  const p = P();
  $('#previewLabel').textContent = `${p.name} · ${colourName()} · ${S().label}`;
  $('#workspaceSubtitle').textContent = `${p.name} / ${p.blurb}`;
  const area = areaOf();
  $('#areaInfo').textContent = `${surf().label} · ${mm(area.w)} × ${mm(area.h)} print area`;
  $("#surfaces").innerHTML = p.surfaces.map((s) =>
    `<button class="surf" role="tab" data-sf="${s.id}" aria-selected="${s.id === state.surfaceId}">${esc(s.label)}${state.designs[s.id]?.length ? '<span class="pip" aria-label="has design"></span>' : ""}</button>`).join("");

  // Preview views — one per distinct side.
  const views = [...new Set(p.surfaces.map((s) => s.view))];
  const current = viewFor(p, state.surfaceId);
  const names = { front: "Front", back: "Back", left: "Left", right: "Right", rear: "Rear" };
  $("#views").innerHTML = views.length > 1 && !views.includes("3d")
    ? views.map((v) => `<button class="view" role="tab" data-v="${v}" aria-selected="${v === current}">${names[v] ?? v}</button>`).join("") : "";
  const hint = { gazebo: "Drag to walk round it", mug: "Drag to turn the mug" }[p.render];
  $("#stageHint").textContent = hint ?? (p.quoteOnly ? "Visual brief — we measure and confirm on site." : "");
  $("#stage").classList.toggle("grab", !!hint);
  $("#dropSurface").textContent = surf().label.toLowerCase();
}

$("#surfaces").addEventListener("click", (e) => { const b = e.target.closest("[data-sf]"); if (!b) return; setSurface(b.dataset.sf); });
$("#views").addEventListener("click", (e) => {
  const b = e.target.closest("[data-v]"); if (!b) return;
  const on = P().surfaces.filter((s) => s.view === b.dataset.v);
  setSurface((on.find((s) => state.designs[s.id]?.length) ?? on[0]).id);
});
function setSurface(id) {
  state.surfaceId = id; state.selected = null;
  renderSurfaces(); renderInspector(); editor.request(); updateMockup(); renderToolbar();
}

/* ─────────────────────────── editor ─────────────────────────── */
const editor = new Editor($("#editor"), {
  getModel: () => ({ area: areaOf(), layers: layers(), assets, colour: material(), selected: state.selected }),
  onSelect: (id) => { state.selected = id; renderInspector(); renderToolbar(); },
  onChange: (final) => { syncInspector(); if (final) commit(); else liveUpdate(); },
  onEditText: () => { $("#inspector textarea")?.focus(); $("#inspector textarea")?.select(); },
});

let liveT = 0;
function liveUpdate() {
  // Throttle the mockup while dragging; the editor itself redraws every frame.
  const now = performance.now();
  if (now - liveT < 90) return;
  liveT = now;
  updateTextures([state.surfaceId]).then(updateMockup);
}

/* ─────────────────────────── textures & mockup ─────────────────────────── */
function clearTextures() {
  for (const k of Object.keys(texVersion)) texVersion[k]++;
  for (const k of Object.keys(texCanvas)) delete texCanvas[k];
  for (const k of Object.keys(tex)) { URL.revokeObjectURL(tex[k]); delete tex[k]; }
}

async function updateTextures(ids = P().surfaces.map((s) => s.id)) {
  const productId = state.productId;
  await ensureFonts(ids.flatMap((id) => state.designs[id] || []));
  if (state.productId !== productId) return;
  const big = ["gazebo", "banner", "flag", "vehicle", "shopfront"].includes(P().render);
  await Promise.all(ids.map(async (id) => {
    const s = P().surfaces.find((x) => x.id === id);
    if (!s) return;
    const L = state.designs[id];
    if (!L?.length) { delete texCanvas[id]; if (tex[id]) URL.revokeObjectURL(tex[id]); delete tex[id]; return; }
    const v = (texVersion[id] = (texVersion[id] || 0) + 1);
    const c = composeSurface(L, assets, areaOf(s), big ? 1400 : 1024);
    texCanvas[id] = c;
    const blob = await toBlob(c);
    if (texVersion[id] !== v) return;                    // a newer frame won
    if (tex[id]) URL.revokeObjectURL(tex[id]);
    tex[id] = URL.createObjectURL(blob);
  }));
}

function renderCtx(extra = {}) {
  return { productId: state.productId, product: P(), size: S(), colour: state.colour, tex, texCanvas,
    active: state.surfaceId, yaw: state.yaw, pitch: state.pitch, options: state.options, ...extra };
}
function updateMockup() { if (state.colour) return renderMockup($("#stage"), renderCtx({ showGuides: $('#showGuides').checked })); }
new ResizeObserver(() => updateMockup()).observe($('#stage'));
$('#downloadMockup').onclick = async () => {
  const button = $('#downloadMockup'); button.disabled = true;
  try {
    await updateTextures();
    const dataTex = Object.fromEntries(Object.entries(texCanvas).map(([k, c]) => [k, c.toDataURL('image/png')]));
    const canvas = await snapshotMockup(renderCtx({tex:dataTex}), viewFor(P(), state.surfaceId), 1600, 1600);
    download(await toBlob(canvas), `${state.productId}-${viewFor(P(), state.surfaceId)}-mockup.png`);
  } catch (error) { console.error(error); toast('Could not download this mockup. Please try again.'); }
  finally { button.disabled = false; }
};

// Orbit for 3D products.
{
  let drag = null;
  const st = $("#stage");
  st.addEventListener("pointerdown", (e) => {
    if (!["gazebo", "mug"].includes(P().render)) return;
    drag = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch };
    st.setPointerCapture(e.pointerId);
  });
  st.addEventListener("pointermove", (e) => {
    if (!drag) return;
    state.yaw = drag.yaw + (e.clientX - drag.x) * 0.45;
    if (P().render === "gazebo") state.pitch = Math.max(2, Math.min(42, drag.pitch + (e.clientY - drag.y) * 0.25));
    updateMockup();
  });
  st.addEventListener("pointerup", () => { drag = null; });
  st.addEventListener('pointercancel', () => { drag = null; });
}

/* ─────────────────────────── adding artwork ─────────────────────────── */
async function addFiles(files) {
  for (const f of files) {
    try {
      toast(`Opening ${f.name}…`);
      const a = await loadAsset(f);
      assets.set(a.id, a);
      placeAsset(a);
      if (a.whiteBox && !isLight(material())) toast("Your logo has a white background. Remove it in the panel below, or it will print as a white box.", 6000);
      else hideToast();
    } catch (err) { toast(err.message, 6000); }
  }
}
const isLight = (hex) => luminance(hex) > 0.8;

function placeAsset(a) {
  const s = surf(), area = areaOf(s);
  const src = a.source, iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
  const aspect = iw / ih;
  let w;
  if (s.fullBleed && Math.abs(aspect / (area.w / area.h) - 1) < 0.18) {
    w = Math.max(area.w + area.bleed * 2, (area.h + area.bleed * 2) * aspect);         // edge to edge
  } else {
    const k = s.fullBleed ? 0.62 : area.w < 120 ? 0.9 : 0.72;
    w = Math.min(area.w * k, area.h * k * aspect);
  }
  const l = { id: uid(), kind: "image", assetId: a.id, x: 0, y: 0, w, rot: 0 };
  layers().push(l);
  state.selected = l.id;
  afterStructuralChange();
}

function addText() {
  const s = surf(), l = newTextLayer(areaOf(s), isDark(material()) ? "#FFFFFF" : "#14161A");
  const n = layers().length;
  l.y = n ? Math.min(areaOf(s).h * 0.3, n * l.size * 1.4) : 0;
  layers().push(l);
  state.selected = l.id;
  afterStructuralChange();
  setTimeout(() => { const t = $("#inspector textarea"); t?.focus(); t?.select(); }, 30);
}

async function addSample() {
  // A neutral two-colour mark so a visitor without a file can see the Studio work.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360">
    <g transform="translate(300 128)"><circle r="96" fill="#0072A8"/><path d="M-50 30 L0 -58 L50 30 Z" fill="#FFE500"/><circle cy="10" r="20" fill="#0072A8"/></g>
    <text x="300" y="302" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="74" fill="#C4006B" letter-spacing="2">YOUR LOGO</text></svg>`;
  await addFiles([new File([svg], "sample-logo.svg", { type: "image/svg+xml" })]);
}

$("#addImage").onclick = $("#emptyUpload").onclick = () => $("#file").click();
$("#addText").onclick = $("#emptyText").onclick = addText;
$("#sample").onclick = addSample;
$("#file").onchange = (e) => { addFiles([...e.target.files]); e.target.value = ""; };
{
  const wrap = $("#canvasWrap");
  let depth = 0;
  const has = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  wrap.addEventListener("dragenter", (e) => { if (!has(e)) return; e.preventDefault(); depth++; wrap.classList.add("over"); $("#dropHint").hidden = false; });
  wrap.addEventListener("dragover", (e) => { if (has(e)) e.preventDefault(); });
  wrap.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; wrap.classList.remove("over"); $("#dropHint").hidden = true; } });
  wrap.addEventListener("drop", (e) => { e.preventDefault(); depth = 0; wrap.classList.remove("over"); $("#dropHint").hidden = true; addFiles([...e.dataTransfer.files]); });
  addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length && !/input|textarea/i.test(document.activeElement?.tagName)) addFiles(files);
  });
}

/* ─────────────────────────── layer actions ─────────────────────────── */
function act(kind) {
  const l = selLayer(); if (!l) return;
  const area = areaOf(), L = layers();
  const i = L.indexOf(l);
  const { w, h } = layerSize({ ...l, rot: 0 }, assets);
  const aspect = w / h;
  switch (kind) {
    case "centre": l.x = 0; l.y = 0; break;
    case "fit": {
      const W = area.w - area.safe * 2, H = area.h - area.safe * 2 - area.hiddenBottom;
      const target = Math.min(W, H * aspect);
      if (l.kind === "image") l.w = target; else l.size *= target / w;
      l.x = 0; l.y = -area.hiddenBottom / 2; l.rot = 0; break;
    }
    case "fill": {
      const W = area.w + area.bleed * 2, H = area.h + area.bleed * 2;
      const target = Math.max(W, H * aspect);
      if (l.kind === "image") l.w = target; else l.size *= target / w;
      l.x = 0; l.y = 0; l.rot = 0; break;
    }
    case "dup": { const c = { ...l, id: uid(), x: l.x + 6, y: l.y + 6 }; L.splice(i + 1, 0, c); state.selected = c.id; break; }
    case "fwd": if (i < L.length - 1) [L[i], L[i + 1]] = [L[i + 1], L[i]]; break;
    case "back": if (i > 0) [L[i], L[i - 1]] = [L[i - 1], L[i]]; break;
    case "del": L.splice(i, 1); state.selected = null; break;
  }
  afterStructuralChange();
}
for (const id of ["centre", "fit", "fill", "dup", "fwd", "back", "del"]) $("#" + id).onclick = () => act(id);

function renderToolbar() {
  $("#selTools").hidden = !selLayer();
  $("#emptyCta").hidden = layers().length > 0;
  $('#layerCount').textContent = layers().length;
  $('#layerList').innerHTML = layers().length ? [...layers()].reverse().map(l => `<button class="layer-item" data-layer="${l.id}" aria-pressed="${l.id === state.selected}"><span>${l.kind === 'text' ? 'T' : '▧'}</span><b>${esc(l.kind === 'text' ? l.text || 'Text' : assets.get(l.assetId)?.name || 'Artwork')}</b></button>`).join('') : '<p class="fine">Upload artwork or add text to get started. Each print position has its own layers.</p>';
}
$('#layerList').onclick = e => {
  const button = e.target.closest('[data-layer]'); if (!button) return;
  state.selected = button.dataset.layer; renderInspector(); renderToolbar(); editor.request(); setMode('edit'); goTab('design');
};

function afterStructuralChange() {
  setMode('edit'); goTab('design');
  renderSurfaces(); renderInspector(); renderToolbar(); editor.request();
  commit();
}

/* ─────────────────────────── inspector ─────────────────────────── */
const TEXT_COLOURS = ["#14161A", "#FFFFFF", "#C4006B", "#E5007E", "#0072A8", "#00A0E3", "#FFE500", "#B3202A", "#1E5631", "#F2B705", "#9EA2A5"];

function renderInspector() {
  const l = selLayer(), box = $("#inspector");
  if (!l) { box.innerHTML = ""; return; }
  if (l.kind === "image") {
    const a = assets.get(l.assetId);
    const sz = layerSize(l, assets);
    const v = imageVerdict(l);
    box.innerHTML = `
      <div class="insp-head"><h3>${esc(a?.name ?? "Artwork")}</h3><span class="mono" style="font-size:.74rem;color:var(--muted)">${a?.vector ? "vector" : `${a?.natW} × ${a?.natH} px`}</span></div>
      <div class="verdict ${v.level}"><div><b>${v.label}</b>${v.note}</div>${v.fix ? `<button class="btn btn-sm btn-ink" data-act="sharp">${v.fix}</button>` : ""}</div>
      ${a?.whiteBox && !a.bgRemoved ? `<div class="verdict warn"><div><b>White background</b>${isLight(material()) ? "Invisible on this colour, but it will print as a box on anything darker." : "This will print as a white box on a coloured product."}</div><button class="btn btn-sm btn-ink" data-act="rmbg">Remove it</button></div>` : ""}
      ${a?.bgRemoved ? `<div class="verdict ok"><div><b>Background removed</b>We'll do this properly from your original file.</div><button class="btn btn-sm btn-ghost" data-act="rsbg">Undo</button></div>` : ""}
      <div class="insp-grid">
        <label>Width (mm)<input type="number" min="3" step="1" data-f="w" value="${Math.round(sz.w)}"></label>
        <label>Height (mm)<input type="number" min="3" step="1" data-f="h" value="${Math.round(sz.h)}"></label>
        <label>Rotation (°)<input type="number" step="1" data-f="rot" value="${Math.round(l.rot)}"></label>
        <div class="insp-wide inks">${a?.photo ? "Full colour (photo or gradient)" : `${a?.colours.length ?? 0} ink colour${a?.colours.length === 1 ? "" : "s"}`}
          ${a?.photo ? "" : (a?.colours || []).map((c) => `<i style="background:${c.hex}" title="${c.hex}"></i>`).join("")}</div>
      </div>`;
  } else {
    const f = FONTS.find((x) => x.family === l.font) ?? FONTS[0];
    box.innerHTML = `
      <div class="insp-head"><h3>Text</h3>
        <div class="seg-row" role="group" aria-label="Alignment">${["left", "center", "right"].map((al) => `<button data-align="${al}" aria-pressed="${l.align === al}">${al === "center" ? "Centre" : al[0].toUpperCase() + al.slice(1)}</button>`).join("")}</div></div>
      <div class="insp-grid">
        <label class="insp-wide">Your text<textarea data-f="text" rows="2">${esc(l.text)}</textarea></label>
        <label>Font<select data-f="font">${FONTS.map((x) => `<option value="${x.family}"${x.family === l.font ? " selected" : ""} style="font-family:'${x.family}'">${x.label}</option>`).join("")}</select></label>
        <label>Weight<select data-f="weight">${f.weights.map((w) => `<option${w === l.weight ? " selected" : ""}>${w}</option>`).join("")}</select></label>
        <label>Size (mm)<input type="number" min="2" step="1" data-f="size" value="${Math.round(l.size)}"></label>
        <label>Rotation (°)<input type="number" step="1" data-f="rot" value="${Math.round(l.rot)}"></label>
        <div class="insp-wide"><span>Colour</span><div class="colours-row">${TEXT_COLOURS.map((c) => `<button class="sw" data-colour="${c}" aria-checked="${c === l.colour}" style="background:${c}" aria-label="${c}"></button>`).join("")}<input type="color" data-f="colour" value="${l.colour}" aria-label="Custom colour"></div></div>
        <label>Letter spacing<span class="rng"><input type="range" min="-0.05" max="0.6" step="0.01" data-f="spacing" value="${l.spacing}"><output>${l.spacing.toFixed(2)}</output></span></label>
        <label>Curve<span class="rng"><input type="range" min="-180" max="180" step="5" data-f="arc" value="${l.arc}"><output>${l.arc}°</output></span></label>
        <label>Outline (mm)<span class="rng"><input type="range" min="0" max="4" step="0.25" data-f="outline" value="${l.outline}"><output>${l.outline}</output></span></label>
        <label>Outline colour<input type="color" data-f="outlineColour" value="${l.outlineColour}"></label>
        <label class="opt-row" style="flex-direction:row;align-items:center"><input type="checkbox" data-f="italic"${l.italic ? " checked" : ""}> Italic</label>
      </div>`;
  }
}

/** Keep the numbers in the inspector live while dragging, without rebuilding it. */
function syncInspector() {
  const l = selLayer(); if (!l) return;
  const sz = layerSize(l, assets);
  const set = (f, v) => { const i = $(`#inspector [data-f="${f}"]`); if (i && document.activeElement !== i) i.value = v; };
  set("w", Math.round(sz.w)); set("h", Math.round(sz.h)); set("rot", Math.round(l.rot)); set("size", Math.round(l.size ?? 0));
}

$("#inspector").addEventListener("input", (e) => {
  const l = selLayer(); const f = e.target.dataset.f; if (!l || !f) return;
  let v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  if (["rot", "size", "spacing", "arc", "outline", "weight"].includes(f)) v = +v;
  if (f === "w" || f === "h") {
    const sz = layerSize({ ...l, rot: 0 }, assets), k = (+v || 1) / (f === "w" ? sz.w : sz.h);
    if (l.kind === "image") l.w *= k;
  } else l[f] = v;
  if (f === "font") { const ff = FONTS.find((x) => x.family === v); if (!ff.weights.includes(l.weight)) l.weight = ff.weights.at(-1); renderInspector(); }
  const out = e.target.parentElement.querySelector("output");
  if (out) out.textContent = f === "arc" ? `${v}°` : f === "spacing" ? (+v).toFixed(2) : v;
  ensureFonts([l]).then(() => { editor.request(); liveUpdate(); });
  syncInspector();
  clearTimeout(inspT); inspT = setTimeout(commit, 400);
});
let inspT;
$("#inspector").addEventListener("click", (e) => {
  const l = selLayer(); if (!l) return;
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.colour) { l.colour = b.dataset.colour; renderInspector(); editor.request(); commit(); }
  if (b.dataset.align) { l.align = b.dataset.align; renderInspector(); editor.request(); commit(); }
  if (b.dataset.act === "rmbg" || b.dataset.act === "rsbg") {
    const a = assets.get(l.assetId);
    b.disabled = true; b.textContent = "Working…";
    setTimeout(() => {
      if (b.dataset.act === "rmbg") applyBackgroundRemoval(a); else restoreBackground(a);
      renderInspector(); editor.request(); commit(true);
    }, 20);
  }
  if (b.dataset.act === "sharp") { sharpen(l); }
});

/* ─────────────────────────── checks ─────────────────────────── */
function imageVerdict(l) {
  const a = assets.get(l.assetId);
  if (!a) return { level: "warn", label: "Missing file", note: "" };
  if (a.vector) return { level: "ok", label: "Vector — perfect", note: " Scales to any size with no loss." };
  if (!a.preview) return { level: "warn", label: "Can't preview this file", note: " We'll place it as shown and check it by hand." };
  const w = layerSize(l, assets).w;
  const dpi = effectiveDpi(a.natW, w);
  const v = dpiVerdict(dpi, P().minDpi);
  const sharpW = (a.natW / P().minDpi) * 25.4;
  return { ...v, note: " " + v.note, fix: v.level !== "ok" && sharpW > 8 ? `Make it ${mm(sharpW)} wide` : null };
}
function sharpen(l) {
  const a = assets.get(l.assetId);
  l.w = (a.natW / P().minDpi) * 25.4;
  renderInspector(); editor.request(); commit();
}

/** Everything a print shop would check, in the order it matters. */
function runChecks() {
  const p = P(), out = [];
  const ids = designedIds();
  const proc = PROCESSES[state.process];
  if (!ids.length) return [{ level: "info", text: "Add your logo or text to check it and price the printing." }];

  if (proc.lightOnly && isDark(state.colour) && p.render !== "mug")
    out.push({ level: "bad", text: `${proc.label} only works on white or light polyester.`, fix: p.processes.includes("dtf") ? ["Use DTF instead", () => { state.process = "dtf"; renderProcesses(); refreshAll(); commit(); }] : null });

  for (const id of ids) {
    const s = surf(id), area = areaOf(s), L = state.designs[id];
    for (const l of L) {
      const corners = layerCorners(l, assets);
      if (l.kind === "image") {
        const v = imageVerdict(l), a = assets.get(l.assetId);
        if (v.level === "bad") out.push({ level: "bad", text: `${s.label}: ${a.name} — ${v.note.trim()}`, fix: v.fix ? [v.fix, () => sharpen(l)] : null });
        else if (v.level === "warn") out.push({ level: "warn", text: `${s.label}: ${a.name} — ${v.note.trim()}`, fix: v.fix ? [v.fix, () => sharpen(l)] : null });
        if (a?.whiteBox && !a.bgRemoved && !isLight(material()))
          out.push({ level: "warn", text: `${s.label}: ${a.name} has a white background that will print as a box.`, fix: ["Remove it", () => { applyBackgroundRemoval(a); renderInspector(); editor.request(); commit(true); }] });
        if (a?.photo && (proc.spotOnly || state.process === "embroidery" || state.process === "screen"))
          out.push({ level: "bad", text: `${s.label}: ${a.name} is a photo or gradient — ${proc.label.toLowerCase()} can't reproduce that.`, fix: p.processes.includes("dtf") ? ["Use DTF", () => { state.process = "dtf"; renderProcesses(); refreshAll(); commit(); }] : null });
        if (a && !a.photo && a.colours.length && a.colours[0].share > 0.5 && contrastRatio(a.colours[0].hex, material()) < 1.35)
          out.push({ level: "warn", text: `${s.label}: most of ${a.name} is close to the ${colourName().toLowerCase()} — it may disappear.` });
      } else {
        if (contrastRatio(l.colour, material()) < 1.6) out.push({ level: "warn", text: `${s.label}: “${l.text.slice(0, 20)}” is hard to see on ${colourName().toLowerCase()}.` });
        const minText = { Print: 1.8, Clothing: 5, Drinkware: 4 }[p.group] ?? 20;
        if (l.size < minText) out.push({ level: "warn", text: `${s.label}: text under ${minText} mm may not print cleanly.` });
        if (area.safe && corners.some(([x, y]) => Math.abs(x) > area.w / 2 - area.safe || Math.abs(y) > area.h / 2 - area.safe))
          out.push({ level: "warn", text: `${s.label}: “${l.text.slice(0, 20)}” is outside the safe line and could be trimmed.` });
        if (area.hiddenBottom && corners.some(([, y]) => y > area.h / 2 - area.hiddenBottom))
          out.push({ level: "warn", text: `${s.label}: text in the bottom ${area.hiddenBottom} mm rolls into the stand and won't be seen.` });
      }
      if (corners.some(([x, y]) => Math.abs(x) > area.w / 2 + area.bleed + 1 || Math.abs(y) > area.h / 2 + area.bleed + 1) && !s.fullBleed)
        out.push({ level: "warn", text: `${s.label}: part of the design runs past the print area and will be cut off.` });
      if (state.process === "embroidery") {
        const sz = layerSize(l, assets);
        if (Math.max(sz.w, sz.h) > (proc.maxAreaMm?.[0] ?? 120))
          out.push({ level: "warn", text: `${s.label}: ${mm(Math.max(sz.w, sz.h))} is large for embroidery — it gets stiff and costly above ${proc.maxAreaMm[0]} mm.` });
      }
    }
    // Full-bleed: background should reach the red line, or a white hairline shows after trimming.
    if (area.bleed) {
      const b = designBounds(L, assets);
      const touches = b && (b.x0 <= -area.w / 2 + 0.5 || b.x1 >= area.w / 2 - 0.5 || b.y0 <= -area.h / 2 + 0.5 || b.y1 >= area.h / 2 - 0.5);
      const reaches = b && b.x0 <= -area.w / 2 - area.bleed + 0.5 && b.x1 >= area.w / 2 + area.bleed - 0.5 && b.y0 <= -area.h / 2 - area.bleed + 0.5 && b.y1 >= area.h / 2 + area.bleed - 0.5;
      if (touches && !reaches) out.push({ level: "warn", text: `${s.label}: artwork reaches the edge but not the red bleed line — extend it, or a white sliver can show after cutting.` });
    }
  }
  if (state.process === "embroidery") out.push({ level: "info", text: "Embroidery preview shows placement only. We send a digitised stitch proof before production." });
  if (!out.some((c) => c.level === "bad" || c.level === "warn")) out.unshift({ level: "ok", text: "Artwork checks passed." });
  // One line per problem, however many layers trip it.
  const seen = new Set();
  return out.filter((c) => !seen.has(c.text) && seen.add(c.text));
}

let checkFixes = [];
function renderChecks() {
  const list = runChecks();
  checkFixes = [];
  $("#checks").innerHTML = list.map((c) => {
    let fix = "";
    if (c.fix) { checkFixes.push(c.fix[1]); fix = `<button class="link-btn" data-fix="${checkFixes.length - 1}">${esc(c.fix[0])}</button>`; }
    return `<div class="check ${c.level === "info" ? "" : c.level}"${c.level === "info" ? ' style="color:var(--muted);background:var(--sunk)"' : ""}><span>${esc(c.text)}${fix}</span></div>`;
  }).join("");
}
$("#checks").addEventListener("click", (e) => { const b = e.target.closest("[data-fix]"); if (b) checkFixes[+b.dataset.fix]?.(); });

/* ─────────────────────────── quantity & quote ─────────────────────────── */
function renderQty() {
  const p = P();
  if (p.sizeBreakdown) {
    $("#l-qty").textContent = "How many of each size?";
    $("#qty").innerHTML = `<div class="sizes-grid">${p.sizes.map((s) => `<label>${s.id}<input type="number" min="0" inputmode="numeric" data-b="${s.id}" value="${state.breakdown[s.id] ?? ""}" placeholder="0"></label>`).join("")}</div>`;
  } else {
    $("#l-qty").textContent = p.quoteOnly ? "How many?" : "Quantity";
    const tiers = p.qtyTiers ?? [1, 2, 5, 10, 25, 50, 100];
    $("#qty").innerHTML = `<div class="qty-row">${tiers.map((q) => `<button class="chip" role="radio" data-q="${q}" aria-checked="${q === state.qty}">${q}</button>`).join("")}
      <input type="number" min="1" inputmode="numeric" data-qc value="${tiers.includes(state.qty) ? "" : state.qty}" placeholder="Other" aria-label="Other quantity"></div>`;
  }
}
$("#qty").addEventListener("input", (e) => {
  if (e.target.dataset.b) { state.breakdown[e.target.dataset.b] = Math.max(0, +e.target.value || 0); }
  if (e.target.dataset.qc != null && +e.target.value > 0) { state.qty = Math.round(+e.target.value); $$("#qty .chip").forEach((c) => c.setAttribute("aria-checked", "false")); }
  refreshQuote(); clearTimeout(qT); qT = setTimeout(commit, 600);
});
let qT;
$("#qty").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; state.qty = +b.dataset.q; renderQty(); refreshQuote(); commit(); });

function inkCount(id) {
  const cols = [];
  for (const l of state.designs[id] || []) {
    if (l.kind === "text") { cols.push(l.colour); if (l.outline > 0) cols.push(l.outlineColour); continue; }
    const a = assets.get(l.assetId);
    if (!a) continue;
    if (a.photo) return 99;
    cols.push(...a.colours.map((c) => c.hex));
  }
  // Merge near-identical inks, and drop any that match the garment — white
  // parts of a logo on a white shirt need no ink at all.
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const near = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 60; };
  const uniq = [];
  for (const c of cols) if (!near(c, material()) && !uniq.some((u) => near(u, c))) uniq.push(c);
  return Math.max(1, uniq.length);
}

function currentQuote() {
  const p = P(), sz = S();
  const positions = designedIds().map((id) => {
    const s = surf(id), area = areaOf(s), b = designBounds(state.designs[id], assets, area);
    return { surfaceId: id, label: s.label, areaMm2: b ? b.w * b.h : 0, maxSideMm: b ? Math.max(b.w, b.h) : 0, colours: inkCount(id) };
  });
  return priceQuote({ productId: state.productId, product: p, sizeId: sz.id, sizeLabel: sz.label, sizeW: sz.w, sizeH: sz.h,
    process: state.process, stock: state.stock, qty: state.qty, breakdown: state.breakdown, positions, options: state.options });
}

function refreshQuote() {
  const q = currentQuote();
  const badge = PRICES_CONFIRMED ? "" : `<span class="badge" title="Eminence confirms every price before you pay">Estimate</span>`;
  let html;
  if (q.quoteOnly) {
    html = `<div class="q-total"><div><div class="label" style="margin:0">Indicative ${badge}</div><div class="n">${rand(q.range[0])}–${rand(q.range[1]).slice(1)}</div></div><div class="each">incl. VAT<br>${q.units} × ${esc(P().name.toLowerCase())}</div></div>`;
  } else {
    html = `<table class="q-lines">${q.lines.map((l) => `<tr${l.setup ? ' class="setup"' : ""}><td>${esc(l.label)} ${l.run ? "" : `<span class="qq">× ${l.qty}</span>`}</td><td>${rand2(l.total)}</td></tr>`).join("")}
      <tr><td class="qq">VAT 15%</td><td>${rand2(q.vat)}</td></tr></table>
      <div class="q-total"><div><div class="label" style="margin:0">Total ${badge}</div><div class="n">${rand2(q.total)}</div></div><div class="each">${q.units ? `${rand2(q.each)} each<br>${q.units} item${q.units === 1 ? "" : "s"}` : ""}</div></div>`;
  }
  html += q.notes.map((n) => `<p class="q-note">${esc(n)}</p>`).join("");
  html += q.blockers.map((b) => `<div class="q-block">${esc(b)}</div>`).join("");
  $("#quote").innerHTML = html;
  $("#send").textContent = P().quoteOnly ? "Request a site quote" : "Send to Eminence";
  if (hostOrigin) $('#send').textContent = 'Use this design';
  return q;
}

/* ─────────────────────────── commit / history / draft ─────────────────────────── */
function snapshot() { return { productId: state.productId, sizeId: state.sizeId, colour: state.colour, process: state.process, stock: state.stock, options: state.options, designs: state.designs }; }

let draftT, lastHist = "";
async function commit(force = false, rememberArtwork = true) {
  if (rememberArtwork) transferSource = {productId:state.productId, designs:JSON.parse(JSON.stringify(state.designs))};
  const snap = snapshot();
  const s = JSON.stringify(snap);
  if (s !== lastHist || force) { history.push(snap); lastHist = s; }
  $("#undo").disabled = !history.canUndo; $("#redo").disabled = !history.canRedo;
  await updateTextures();
  updateMockup(); renderChecks(); refreshQuote(); renderSurfaces(); renderToolbar();
  clearTimeout(draftT);
  draftT = setTimeout(async () => {
    if (!designedIds().length) return;
    if (await saveDraft({ ...state }, assets)) $("#saved").textContent = "Saved on this device";
  }, 900);
}

function restoreSnap(snap) {
  if (!snap) return;
  if (snap.productId !== state.productId) clearTextures();
  Object.assign(state, JSON.parse(JSON.stringify(snap)));
  transferSource = {productId:state.productId, designs:JSON.parse(JSON.stringify(state.designs))};
  if (!P().surfaces.some((s) => s.id === state.surfaceId)) state.surfaceId = P().surfaces[0].id;
  if (!layers().some((l) => l.id === state.selected)) state.selected = null;
  lastHist = JSON.stringify(snapshot());
  renderProductPanel(); refreshAll();
  $("#undo").disabled = !history.canUndo; $("#redo").disabled = !history.canRedo;
}
$("#undo").onclick = () => restoreSnap(history.undo());
$("#redo").onclick = () => restoreSnap(history.redo());

async function refreshAll() {
  renderSurfaces(); renderInspector(); renderToolbar(); renderQty();
  editor.request();
  await updateTextures();
  updateMockup(); renderChecks(); refreshQuote();
}

/* ─────────────────────────── keyboard ─────────────────────────── */
addEventListener("keydown", (e) => {
  const typing = /input|textarea|select/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); restoreSnap(e.shiftKey ? history.redo() : history.undo()); return; }
  if (mod && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); restoreSnap(history.redo()); return; }
  if (typing) return;
  const l = selLayer();
  if (!l) return;
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); act("del"); }
  else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); act("dup"); }
  else if (e.key === "Escape") { state.selected = null; renderInspector(); renderToolbar(); editor.request(); }
  else if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    const d = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") l.x -= d; if (e.key === "ArrowRight") l.x += d;
    if (e.key === "ArrowUp") l.y -= d; if (e.key === "ArrowDown") l.y += d;
    editor.request(); liveUpdate(); clearTimeout(nudgeT); nudgeT = setTimeout(commit, 350);
  }
});
let nudgeT;

/* ─────────────────────────── proof & sending ─────────────────────────── */
async function makeProof(customer = null, ref = jobRef()) {
  await updateTextures();
  const q = currentQuote();
  const spec = buildSpec({ productId: state.productId, product: P(), size: S(), state, assets, quote: q, ref, colourName: colourName() });
  if (customer) spec.customer = customer;
  const dataTex = Object.fromEntries(Object.entries(texCanvas).map(([k, c]) => [k, c.toDataURL("image/png")]));
  const canvas = await renderProof({ product: P(), size: S(), state, assets, quote: q, spec, colourName: colourName(), renderCtx: renderCtx({ texCanvas }) }, dataTex);
  return { spec, quote: q, proof: await toBlob(canvas), canvas };
}

$("#proofBtn").onclick = async () => {
  if (!designedIds().length) { toast("Add your design first — the proof shows it on the product."); return; }
  const b = $("#proofBtn"); b.disabled = true; b.textContent = "Making your proof…";
  try { const { spec, proof } = await makeProof(); download(proof, `${spec.ref}-proof.png`); }
  catch (err) { console.error(err); toast("Couldn't build the proof in this browser. Take a screenshot instead — we'll send a proper one."); }
  b.disabled = false; b.textContent = "Download proof sheet";
};

const dlg = $("#sendDialog");
async function openSend() {
  if (!designedIds().length && !P().quoteOnly) { toast("Add your design first."); goTab("design"); return; }
  if (hostOrigin) {
    const blockers = [...runChecks().filter(c => c.level === 'bad').map(c => c.text), ...currentQuote().blockers];
    if (blockers.length) { toast(blockers[0], 6000); goTab('preview'); return; }
    $('#send').disabled = $('#sendTop').disabled = true;
    try {
      const {spec, proof, quote} = await makeProof();
      const used = new Set(designedIds().flatMap(id => state.designs[id].filter(l => l.kind === 'image').map(l => l.assetId)));
      const files = [...assets.values()].filter(a => used.has(a.id)).map(a => ({ id:a.id, name:a.name, file:a.file }));
      parent.postMessage({type:'eminence:complete', design:{spec, proof, quote, files, document:JSON.parse(JSON.stringify(state))}}, hostOrigin);
      toast('Design ready. Continue in your store.');
    } catch (error) { console.error(error); toast('Could not prepare the design. Please try again.'); }
    finally { $('#send').disabled = $('#sendTop').disabled = false; }
    return;
  }
  const q = currentQuote();
  const qt = q.quoteOnly ? `${rand(q.range[0])}–${rand(q.range[1])} (indicative)` : `${rand2(q.total)} incl. VAT`;
  $("#sendSummary").textContent = `${q.units} × ${P().name} · ${colourName()} · ${PROCESSES[state.process].short}\n` +
    designedIds().map((id) => `• ${surf(id).label}`).join("\n") + `\nEstimate: ${qt}`;
  $("#sendForm").hidden = false; $("#sent").hidden = true; $("#sendError").hidden = true; $("#progress").hidden = true;
  $("#sendGo").textContent = P().quoteOnly ? "Request quote on WhatsApp" : "Send on WhatsApp";
  dlg.showModal();
}
$("#send").onclick = $("#sendTop").onclick = openSend;
$("#sendForm").addEventListener("change", (e) => {
  if (e.target.name === "delivery") $("#addrField").hidden = e.target.value === "Collect in Empangeni";
});

let lastSent = null;
$("#sendForm").addEventListener("submit", async (e) => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const f = e.target, data = Object.fromEntries(new FormData(f));
  const err = (m) => { $("#sendError").textContent = m; $("#sendError").hidden = false; };
  if (!data.name?.trim()) return err("Please add your name.");
  if (!/^[+\d][\d\s()-]{8,}$/.test(data.phone?.trim() || "")) return err("Please add a WhatsApp number we can reach you on.");
  $("#sendError").hidden = true;

  // Open the WhatsApp window NOW, inside the click, or the browser blocks it
  // as a pop-up once we have awaited the upload.
  const win = window.open("", "_blank");
  const go = $("#sendGo"); go.disabled = true; go.textContent = "Preparing your proof…";
  const customer = { name: data.name.trim(), phone: data.phone.trim(), email: data.email?.trim() || null, company: data.company?.trim() || null,
    delivery: data.delivery === "Collect in Empangeni" ? data.delivery : `${data.delivery}: ${data.address || "address to follow"}`,
    needBy: data.needBy || null, notes: data.notes?.trim() || null };
  try {
    const { spec, quote: q, proof } = await makeProof(customer);
    const specBlob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    const used = new Set(designedIds().flatMap((id) => state.designs[id].filter((l) => l.kind === "image").map((l) => l.assetId)));
    const originals = [...assets.values()].filter((a) => used.has(a.id) && a.name !== "sample-logo.svg");
    go.textContent = "Uploading…"; $("#progress").hidden = false;
    const up = await uploadJob({ spec, proof, specBlob, originals, onProgress: (k) => { $("#progress span").style.width = `${Math.round(k * 100)}%`; } });
    if (!up.ok) { download(proof, `${spec.ref}-proof.png`); download(specBlob, `${spec.ref}-spec.json`); }
    const qt = q.quoteOnly ? `${rand(q.range[0])}–${rand(q.range[1])} indicative` : `${rand2(q.total)} incl. VAT`;
    const msg = orderMessage({ spec, quoteText: qt, customer, proofUrl: up.ok ? up.proofUrl : null, attached: !up.ok });
    const url = whatsappUrl(msg);
    if (win) win.location.href = url;
    lastSent = { spec, proof, url };
    $("#sentRef").textContent = spec.ref;
    $("#sentText").textContent = up.ok
      ? "Your files and proof are with Eminence. Finish sending the WhatsApp message and they'll reply with your confirmed price."
      : "We've saved your proof to your downloads. Send the WhatsApp message, then attach the proof image to it — Eminence replies with your confirmed price.";
    $("#sentWa").href = url;
    $("#sendForm").hidden = true; $("#sent").hidden = false;
    clearDraft();
  } catch (ex) {
    console.error(ex);
    win?.close();
    err("Something went wrong preparing your proof. You can still WhatsApp us on 078 935 6433.");
  } finally { go.disabled = false; go.textContent = "Send on WhatsApp"; }
});
$("#sentProof").onclick = () => lastSent && download(lastSent.proof, `${lastSent.spec.ref}-proof.png`);
$("#sentClose").onclick = () => dlg.close();

/* ─────────────────────────── mobile tabs ─────────────────────────── */
function goTab(t) {
  $("#studio").dataset.tab = t;
  $$(".tabs button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.tab === t)));
  if (t === "design") requestAnimationFrame(() => editor.resize());
  if (t === "preview") { setMode('preview'); updateMockup(); }
  scrollTo({ top: 0 });
}
$$(".tabs button").forEach((b) => (b.onclick = () => goTab(b.dataset.tab)));

/* ─────────────────────────── toast ─────────────────────────── */
let toastT;
function toast(text, ms = 3200) { const t = $("#toast"); t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(hideToast, ms); }
function hideToast() { $("#toast").hidden = true; }

/* ─────────────────────────── boot ─────────────────────────── */
(async function boot() {
  await loadManifest();
  const params = new URLSearchParams(location.search);
  const start = PRODUCTS[params.get("product")] ? params.get("product") : "tee";
  state.productId = start;
  selectProduct(start, { keepDesign: false });
  if (hostOrigin) parent.postMessage({type:'eminence:ready'}, hostOrigin);
  if (params.get("process") && P().processes.includes(params.get("process"))) { state.process = params.get("process"); renderProcesses(); refreshAll(); }

  const draft = await loadDraft();
  if (draft?.files?.length || Object.values(draft?.state?.designs ?? {}).some((l) => l?.length)) {
    $("#restore").hidden = false;
    $("#restoreYes").onclick = async () => {
      $("#restore").hidden = true;
      for (const f of draft.files) {
        try {
          const a = await loadAsset(f.file instanceof File ? f.file : new File([f.file], f.name, { type: f.file.type }));
          assets.delete(a.id); a.id = f.id; assets.set(a.id, a);
          if (f.bgRemoved) applyBackgroundRemoval(a);
        } catch { /* a file that no longer opens is simply left out */ }
      }
      const s = draft.state;
      state.productId = PRODUCTS[s.productId] ? s.productId : "tee";
      Object.assign(state, s, { selected: null });
      renderProductPanel(); await refreshAll(); commit(true);
    };
    $("#restoreNo").onclick = () => { $("#restore").hidden = true; clearDraft(); };
  }
})();
