import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'msedge',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// External font availability must not gate functional browser checks.
await page.route('https://fonts.googleapis.com/**', r => r.abort());
await page.goto('http://127.0.0.1:8125/studio/', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');
await page.locator('#sample').click();
await page.waitForSelector('.layer-item');
assert.equal(await page.locator('#studio').getAttribute('data-mode'),'edit');
// Edit on the garment colour: the swatches on the canvas recolour the editor.
await page.locator('#editColours [data-c="#111111"]').click();
assert.ok(await page.locator('#canvasWrap.dark').count(), 'editor backdrop follows a dark garment');
assert.equal(await page.locator('#colours [data-c="#111111"]').getAttribute('aria-checked'), 'true');
// A-size presets: the sample logo made exactly A5, and the readout says so.
await page.locator('.layer-item').first().click();
await page.locator('#inspector [data-paper=A5]').click();
await page.waitForFunction(() => document.querySelector('#printSize .ps-read')?.textContent.includes('about A5'));
assert.match(await page.locator('#printSize .ps-read b').textContent(), /^21\.0 × |× 21\.0 cm$/);
assert.ok(await page.locator('#inspector [data-paper=A2]').isDisabled(), 'A2 is bigger than a T-shirt front');
// Photo mockup from the purchased template, and prices with no "estimate".
await page.locator('#previewMode').click();
await page.waitForSelector('#stage canvas.mock');
assert.equal(await page.locator('#stage svg').count(), 0, 'T-shirt uses the photo blank');
await page.locator('#showGuides').check();
await page.locator('#showGuides').uncheck();
assert.doesNotMatch(await page.locator('#quote').innerText(), /estimate/i);
await page.screenshot({path:'audit/studio-after.png'});
const download = page.waitForEvent('download');
await page.locator('#downloadMockup').click();
assert.match((await download).suggestedFilename(), /mockup.png$/);
await page.locator('#addText').click();
await page.locator('#inspector textarea').fill('YOUR BRAND');
await page.locator('#inspector select[data-f=font]').selectOption('Rubik Spray Paint');
assert.ok(await page.locator('#inspector optgroup[label=Graffiti] option').count() >= 6, 'graffiti fonts');
await page.waitForTimeout(650);
assert.equal(await page.locator('.layer-item').count(),2);
await page.locator('#undo').click();
await page.locator('#redo').click();
await page.locator('#chooseProduct').click();
await page.locator('#productSearch').fill('mug');
assert.equal(await page.locator('.pbtn:visible').count(),1);
await page.locator('[data-p=mug]').click();
await page.locator('#previewMode').click();
await page.waitForSelector('#stage canvas');
assert.equal(await page.locator('#productName').textContent(),'Mug');
const products = await page.evaluate(async () => Object.keys((await import('/studio/js/products.js')).PRODUCTS));
for (const id of products) {
  await page.locator('#chooseProduct').click();
  await page.locator('#productSearch').fill('');
  await page.locator(`[data-p="${id}"]`).click();
  await page.waitForTimeout(120);
  assert.ok(await page.locator('#stage svg, #stage canvas').count(), id);
  if (['hoodie','mug','gazebo','cap'].includes(id)) {
    await page.locator('#previewMode').click();
    await page.locator('#stage').screenshot({path:`audit/studio-${id}.png`});
  }
}
await page.locator('#chooseProduct').click();
await page.locator('[data-p=tee]').click();
await page.locator('.layer-item').last().click();
assert.ok(Number(await page.locator('#inspector [data-f=w]').inputValue()) > 150, 'product switching must not progressively shrink the source logo');
await page.setViewportSize({width:390,height:844});
await page.locator('#previewMode').click();
await page.screenshot({path:'audit/studio-mobile.png',fullPage:true});
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile overflow');
await page.locator('.tabs [data-tab=product]').click();
await page.locator('#chooseProduct').click();
await page.locator('#closeCatalog').click();
await page.locator('.tabs [data-tab=design]').click();
await page.locator('#addText').click();
assert.ok(await page.locator('#inspector textarea').isVisible());
await page.locator('.tabs [data-tab=preview]').click();
assert.ok(await page.locator('#stage').isVisible());
assert.ok(await page.locator('#quote').isVisible());
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://127.0.0.1:8125/studio/embed-demo.html', {waitUntil:'domcontentloaded'});
const frame = page.frameLocator('iframe');
await frame.locator('#stage svg, #stage canvas').first().waitFor();   // the Studio in the frame has booted
await frame.locator('#sample').click();
await frame.locator('.layer-item').waitFor();
await frame.locator('#sendTop').click();
await page.waitForFunction(() => window.receivedDesign?.spec);
assert.ok(await page.evaluate(() => window.receivedDesign.proof.size > 1000));
assert.ok(await page.evaluate(() => window.receivedDesign.files[0].file.size > 0));
// Moving the print area on the garment: within its limits, size and DPI untouched, recorded in the spec.
await page.goto('http://127.0.0.1:8125/studio/?product=tee', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');
const freshP = page.getByRole('button', { name: 'Start fresh' });
if (await freshP.isVisible().catch(() => false)) await freshP.click();
await page.locator('#sample').click();
await page.waitForSelector('.layer-item');
const sizeBefore = await page.locator('#printSize .ps-read b').innerText();
await page.locator('#previewMode').click();
await page.locator('#showGuides').check();
for (let i = 0; i < 4; i++) await page.locator('[data-nudge="0,10"]').click();
assert.equal(await page.locator('#placeInfo').textContent(), 'Front: 40 mm lower');
for (let i = 0; i < 20; i++) await page.locator('[data-nudge="0,10"]').click();
assert.equal(await page.locator('#placeInfo').textContent(), 'Front: 160 mm lower', 'stops at the garment limit');
await page.locator('.layer-item').first().click();
assert.equal(await page.locator('#printSize .ps-read b').innerText(), sizeBefore, 'moving the area does not resize the print');
await page.locator('#previewMode').click();
await page.locator('#placeReset').click();
assert.equal(await page.locator('#placeInfo').textContent(), 'Front: standard position');
// Layer stacking: to front / to back, the list's arrows and order, click-through to what's underneath.
await page.goto('http://127.0.0.1:8125/studio/?product=flyer', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');
const freshL = page.getByRole('button', { name: 'Start fresh' });
if (await freshL.isVisible().catch(() => false)) await freshL.click();
await page.locator('#addText').click();
await page.locator('#inspector textarea').fill('ON TOP');
await page.locator('#addShape').click();                         // a shape, added in front of the text
const order = () => page.locator('#layerList .layer-item b').allInnerTexts();
assert.deepEqual(await order(), ['Shape', 'ON TOP'], 'list shows front-most first');
await page.locator('#toBack').click();
assert.deepEqual(await order(), ['ON TOP', 'Shape'], 'sent to back');
await page.locator('#toFront').click();
assert.deepEqual(await order(), ['Shape', 'ON TOP'], 'brought to front');
await page.locator('#layerList [data-down]').first().click();
assert.deepEqual(await order(), ['ON TOP', 'Shape'], 'row arrow moves it back');
// Both sit at the centre: a click picks the front one, a second click the one beneath.
const ed = await page.locator('#editor').boundingBox();
const cx = ed.x + ed.width / 2, cy = ed.y + ed.height / 2;
await page.mouse.click(cx, cy);
assert.equal(await page.locator('#layerList .layer-item[aria-pressed=true] b').innerText(), 'ON TOP');
await page.mouse.click(cx, cy);
assert.equal(await page.locator('#layerList .layer-item[aria-pressed=true] b').innerText(), 'Shape', 'click again reaches the layer underneath');
await page.keyboard.press('Control+Shift+BracketRight');
assert.deepEqual(await order(), ['Shape', 'ON TOP'], 'Ctrl+Shift+] brings it to the front');
// Background removal: solid colour for a logo on a white box (with strength), AI for a photo.
await page.goto('http://127.0.0.1:8125/studio/?product=tee', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');
await page.setInputFiles('#file', 'build/fixtures/logo-on-white.png');
await page.waitForSelector('#inspector [data-act=rmbg]');
await page.locator('#inspector .bg-btns [data-act=rmbg]').click();
await page.waitForSelector('#inspector [data-f=bgtol]');
await page.locator('#inspector [data-f=bgtol]').fill('60');
await page.locator('#inspector [data-act=rsbg]').click();
await page.waitForSelector('#inspector .bg-btns');
await page.locator('#del').click();
await page.setInputFiles('#file', 'build/fixtures/photo-on-busy-background.jpg');
await page.waitForSelector('#inspector [data-act=aibg]');
await page.locator('#inspector [data-act=aibg]').click();
await page.waitForFunction(() => document.querySelector('.bg-head span')?.textContent === 'removed with AI', null, { timeout: 120000 });
// Gazebo: settings, frame colour, zoom, a full turn, side walls priced.
await page.goto('http://127.0.0.1:8125/studio/?product=gazebo', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');   // the Studio has booted (shop settings loaded)
const freshG = page.getByRole('button', { name: 'Start fresh' });
if (await freshG.isVisible().catch(() => false)) await freshG.click();
await page.locator('#sample').click();
await page.waitForSelector('.layer-item');
await page.locator('[data-sf="wall-left"]').click();
await page.locator('#addBackground').click();
await page.locator('#previewMode').click();
assert.ok(await page.locator('#scenes').isVisible(), 'gazebo settings shown');
await page.locator('[data-scene=paving]').click();
await page.locator('#partFields [data-part=frame][data-pc="#1A1C20"]').click();
// Picking the back wall turns the gazebo round to show it, guides on or off.
await page.locator('[data-sf="wall-back"]').click();
await page.waitForTimeout(800);
await page.locator('#zoomIn').click();
await page.locator('#spin').click();
await page.waitForTimeout(3400);
assert.match(await page.locator('#quote').innerText(), /side wall/i);
const dlG = page.waitForEvent('download');
await page.locator('#downloadMockup').click();
assert.match((await dlG).suggestedFilename(), /mockup.png$/);
// Mug: outside, inside and handle are three separate colours.
await page.goto('http://127.0.0.1:8125/studio/?product=mug', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');   // the Studio has booted (shop settings loaded)
await page.waitForSelector('#partFields [data-part=inside]');
await page.locator('#colours [data-c="#1F4FA0"]').click();
await page.locator('#partFields [data-part=inside][data-pc="#111111"]').click();
await page.locator('#partFields [data-part=handle][data-pc="#B3202A"]').click();
assert.equal(await page.locator('#partFields [data-part=handle][aria-checked=true]').getAttribute('data-pc'), '#B3202A');
assert.equal(await page.locator('#partFields [data-part=inside][aria-checked=true]').getAttribute('data-pc'), '#111111');
// Shape, Background and QR code all fit in the tools row.
for (const id of ['#addShape', '#addBackground', '#addQr']) {
  const bb = await page.locator(id).boundingBox(), panel = await page.locator('.toolbar').boundingBox();
  assert.ok(bb && bb.x + bb.width <= panel.x + panel.width + 1, `${id} fits`);
}
// Flags and banners turn by dragging and take a printed background colour.
await page.goto('http://127.0.0.1:8125/studio/?product=flag', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');   // the Studio has booted (shop settings loaded)
await page.locator('#colours [data-c="#1C2541"]').click();
await page.locator('#previewMode').click();
assert.ok(await page.locator('#turnTools').isVisible());
await page.waitForFunction(() => [...document.querySelectorAll('#stage path')].some((p) => p.getAttribute('fill') === '#1C2541'));
// Business cards designed whole: template + details + QR, front and back.
await page.goto('http://127.0.0.1:8125/studio/?product=cards', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');   // the Studio has booted (shop settings loaded)
const freshCards = page.getByRole('button', { name: 'Start fresh' });
if (await freshCards.isVisible().catch(() => false)) await freshCards.click();
await page.waitForSelector('#templates img');
assert.equal(await page.locator('#templates .tpl').count(), 5);
await page.locator('[data-tpl=classic]').click();
await page.locator('[data-d=name]').fill('Sipho Dlamini');
await page.waitForFunction(() => [...document.querySelectorAll('.layer-item')].length > 0);
await page.locator('[data-sf=back]').click();
await page.waitForFunction(() => [...document.querySelectorAll('.layer-item b')].some((b) => b.textContent === 'Sipho Dlamini'));
assert.ok(await page.locator('.layer-item b', { hasText: /^QR · https:\/\/www\./ }).count(), 'QR code from the website detail');
assert.match(await page.locator('#checks').innerText(), /example details/);
await page.locator('#addShape').click();
await page.locator('#inspector [data-shape=ellipse]').click();
assert.equal(await page.locator('.layer-item b', { hasText: 'Circle' }).count(), 1);
await page.locator('#previewMode').click();
await page.waitForSelector('#stage svg clipPath', { state: 'attached' });
await page.locator('#optionsField [data-o=rounded]').check();
await page.waitForFunction(() => document.querySelector('#quote').textContent.includes('Business cards'));
// Welcome cards: a new product with its own templates and sizes.
await page.goto('http://127.0.0.1:8125/studio/?product=welcome', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');   // the Studio has booted (shop settings loaded)
const freshW = page.getByRole('button', { name: 'Start fresh' });
if (await freshW.isVisible().catch(() => false)) await freshW.click();
await page.waitForSelector('#templates img');
await page.locator('[data-tpl=guesthouse]').click();
await page.waitForFunction(() => [...document.querySelectorAll('.layer-item b')].some((b) => b.textContent === 'Welcome'));
assert.equal(await page.locator('#productName').textContent(), 'Welcome cards');
// Embedded on a shop's own website (no cart): the Studio still takes the order.
await page.goto('http://127.0.0.1:8125/studio/embed-order-demo.html', {waitUntil:'domcontentloaded'});
const shopFrame = page.frameLocator('#designer iframe');
await shopFrame.locator('#brandName').waitFor({ state: 'attached' });
await page.waitForFunction(() => document.querySelector('#designer iframe')?.contentDocument?.querySelector('#sendTop .long')?.textContent === 'Send to Eminence');
assert.ok(await shopFrame.locator('#barWa').isVisible(), 'WhatsApp stays in order mode');
assert.ok(!(await shopFrame.locator('#brand').isVisible()), "the host page's own header replaces the Studio's");
// White-label: the same Studio as another shop — name, colours, products, WhatsApp, prices.
await page.goto('http://127.0.0.1:8125/studio/?tenant=demo', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');   // the Studio has booted (shop settings loaded)
await page.waitForFunction(() => document.querySelector('#brandName')?.textContent === 'Northside');
assert.equal(await page.locator('#sendTop .long').textContent(), 'Send to Northside');
assert.match(await page.locator('#barWa').getAttribute('href'), /wa\.me\/27820000000/);
assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--magenta-ink').trim()), '#0F766E');
assert.equal(await page.evaluate(async () => Object.keys((await import('/studio/js/products.js')).PRODUCTS).length), 18, 'demo has every product');
assert.equal(await page.evaluate(() => document.body.innerText.includes('Eminence')), false, 'no trace of the other shop');
const demoPut = await page.request.put('http://127.0.0.1:8125/api/pricing?tenant=demo', { headers: { Authorization: 'Bearer admin' }, data: { prices: {} } });
assert.equal(demoPut.status(), 401, "Eminence's password can't change another shop's prices");
// The owner's price settings: a saved price is what the Studio charges.
await page.goto('http://127.0.0.1:8125/studio/admin/', {waitUntil:'domcontentloaded'});
const teeBlank = `[data-path='["blank","tee"]']`;
await page.waitForSelector(teeBlank);
await page.locator('#password').fill('wrong');
await page.locator('#save').click();
await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Wrong password'));
await page.locator(teeBlank).fill('123');
await page.locator('#password').fill('admin');
await page.locator('#save').click();
await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Saved'));
await page.goto('http://127.0.0.1:8125/studio/?product=tee', {waitUntil:'domcontentloaded'});
await page.waitForSelector('#stage svg, #stage canvas');   // the Studio has booted (shop settings loaded)
await page.waitForFunction(() => document.querySelector('#quote')?.textContent.includes('R123.00'));
await page.request.put('http://127.0.0.1:8125/api/pricing', { headers: { Authorization: 'Bearer admin' }, data: { prices: {} } });
assert.deepEqual(errors, []);
console.log(`PASS: ${products.length} products, photo mockups, edit colour, A-sizes, fonts, layers, undo/redo, mockup download, business and welcome card templates, mobile layout, embed completion and owner price settings.`);
await browser.close();
