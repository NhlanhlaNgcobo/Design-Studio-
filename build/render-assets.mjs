/* Renders the raster brand assets from HTML, so they stay in step with the
 * tokens instead of being hand-exported once and forgotten.
 *
 *   cd build && npm install && node render-assets.mjs
 *   (the local site must be served on :8123 for the Studio screenshot:
 *    cd site && python -m http.server 8123)
 *
 * Writes into site/assets: brand/favicon-32.png, brand/apple-touch-icon.png,
 * brand/logo-mark-512.png, og/og-home.png, og/og-studio.png,
 * img/studio-screenshot.png.
 *
 * Set CHROME to a Chromium executable if Playwright's own is not installed.
 */
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const A = (p) => path.join(ROOT, "site", "assets", p);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400..900;1,62..125,400..900&family=JetBrains+Mono:wght@500;700&display=swap">`;
const page = await browser.newPage();

async function render(html, w, h, file, scale = 1) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head>${FONTS}<style>*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}</style></head><body>${html}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: true, scale: scale === 1 ? "css" : "device" });
}

const mark = (size, radius, bg = "#14161A") => `
  <div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${bg};display:grid;grid-template-columns:1fr 1fr;gap:${size * 0.06}px;padding:${size * 0.17}px">
    ${["#00A0E3", "#E5007E", "#FFE500", "#FFFFFF"].map((c) => `<i style="display:block;border-radius:50%;background:${c}"></i>`).join("")}
  </div>`;

await render(mark(32, 7), 32, 32, A("brand/favicon-32.png"));
await render(mark(180, 0), 180, 180, A("brand/apple-touch-icon.png"));
await render(mark(512, 96), 512, 512, A("brand/logo-mark-512.png"));

const og = (title, sub, foot) => `
  <div style="width:1200px;height:630px;background:#14161A;color:#fff;font-family:Archivo,sans-serif;position:relative;padding:72px 80px;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:18px">
      <div style="display:grid;grid-template-columns:repeat(2,22px);gap:6px">${["#00A0E3", "#E5007E", "#FFE500", "#FFFFFF"].map((c) => `<i style="display:block;width:22px;height:22px;border-radius:50%;background:${c}"></i>`).join("")}</div>
      <div style="font-weight:900;font-stretch:115%;font-size:40px;letter-spacing:-.02em">Eminence <span style="font-weight:500;font-stretch:100%;opacity:.7">Printing</span></div>
    </div>
    <div style="margin-top:auto;font-weight:900;font-stretch:120%;font-size:96px;line-height:.95;letter-spacing:-.04em">${title}</div>
    <div style="margin-top:22px;font-size:30px;opacity:.75;font-style:italic">${sub}</div>
    <div style="margin-top:34px;font-family:'JetBrains Mono',monospace;font-size:22px;letter-spacing:.06em;opacity:.8">${foot}</div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:16px;display:grid;grid-template-columns:repeat(4,1fr)">
      <i style="background:#00A0E3"></i><i style="background:#E5007E"></i><i style="background:#FFE500"></i><i style="background:#FFFFFF"></i></div>
  </div>`;
await render(og(`You name it,<br>we print it<span style="color:#E5007E">.</span>`, "You like it, we print it again.", "EMPANGENI, KZN · WHATSAPP 078 935 6433"), 1200, 630, A("og/og-home.png"));
await render(og(`Design it.<br>See it. Price it<span style="color:#E5007E">.</span>`, "Your logo on shirts, signs, vans and banners — at real size.", "EMINENCEPRINTING.CO.ZA/STUDIO"), 1200, 630, A("og/og-studio.png"));

// A real screenshot of the Studio for the home page — not a mock-up of a mock-up.
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8123/studio/?product=tee", { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.evaluate(() => indexedDB.deleteDatabase("eminence-studio"));
  await page.click('[data-c="#1C2541"]');
  await page.click("#sample");
  await page.waitForTimeout(1200);
  await page.click("#addText");
  await page.fill('#inspector [data-f="text"]', "TEAM 2026");
  await page.locator('#inspector [data-f="size"]').fill("22");
  await page.locator('#inspector [data-f="size"]').dispatchEvent("input");
  await page.click('#inspector [data-colour="#FFE500"]');
  // Move the text below the logo with the keyboard nudge (Shift+↓ = 10 mm).
  await page.evaluate(() => document.activeElement.blur());
  for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+ArrowDown");
  await page.evaluate(() => document.querySelector(".panel-product").scrollTop = 0);
  await page.fill('[data-b="M"]', "12"); await page.fill('[data-b="L"]', "18");
  await page.waitForTimeout(900);
  await page.evaluate(() => { document.getElementById("restore").hidden = true; scrollTo(0, 0); });
  await page.screenshot({ path: A("img/studio-screenshot.png") });
} catch (e) { console.warn("studio screenshot skipped:", e.message); }

await browser.close();
console.log("assets rendered");
