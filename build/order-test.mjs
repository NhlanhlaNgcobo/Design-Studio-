// End-to-end orders, one per shop, against the mock server:
//   MOCK=1 node build/dev-server.mjs   then   node build/order-test.mjs
// Places a real order through the Studio's send form for each shop, then checks
// the email went to THAT shop's inbox under its name, the files are filed under
// tenants/<shop>/customers/<whatsapp>-<name>/, and the print PNGs are true size.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const SHOPS = [
  { id: 'eminence', name: 'Eminence Printing', inbox: 'eminenceprinting@gmail.com', url: '/studio/' },
  { id: 'demo', name: 'Northside Print Co.', inbox: 'orders@example.com', url: '/studio/?tenant=demo' },
];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const shop of SHOPS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  ctx.on('page', (p) => p !== page && p.route('**', (r) => r.abort()));   // the WhatsApp tab
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const before = new Set(fs.existsSync('build/.outbox') ? fs.readdirSync('build/.outbox') : []);
  await page.goto('http://127.0.0.1:8125' + shop.url + (shop.url.includes('?') ? '&' : '?') + 'product=tee', { waitUntil: 'networkidle' });
  await page.locator('#sample').click();
  await page.waitForSelector('.layer-item');
  await page.locator('#send').click();
  await page.locator('#sendForm [name=name]').fill('Sipho Dlamini');
  await page.locator('#sendForm [name=phone]').fill('082 555 0101');
  await page.locator('#sendGo').click();
  await page.waitForSelector('#sent:not([hidden])', { timeout: 120000 });
  assert.match(await page.locator('#sentText').textContent(), /files and proof are with/);
  await ctx.close();

  const mail = fs.readdirSync('build/.outbox').filter((f) => !before.has(f)).sort().at(-1);
  assert.ok(mail, `${shop.id}: an order email was written`);
  const html = fs.readFileSync('build/.outbox/' + mail, 'utf8');
  assert.match(html, new RegExp(`to: ${shop.inbox.replace('.', '\.')}`), `${shop.id}: emailed to its own inbox`);
  const links = [...html.matchAll(/href="(http:\/\/127\.0\.0\.1:8124[^"]+)"/g)].map((m) => decodeURIComponent(new URL(m[1]).pathname));
  assert.ok(links.every((l) => l.startsWith(`/eminence-jobs/tenants/${shop.id}/customers/27825550101-sipho-dlamini/`)), `${shop.id}: filed under its own folder`);
  const print = [...html.matchAll(/href="(http:\/\/127\.0\.0\.1:8124[^"]+dpi\.png[^"]*)"/g)][0];
  const png = Buffer.from(await (await fetch(print[1])).arrayBuffer());
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [3307, 4252], `${shop.id}: front print is 280 × 360 mm at 300 dpi`);
  assert.deepEqual(errors, []);
  console.log(`✔ ${shop.name}: order emailed to ${shop.inbox}, files in tenants/${shop.id}/customers/…, print file 3307×4252 px`);
}
await browser.close();
console.log('PASS: orders for every shop');
