# Eminence Printing — website rebuild and Design Studio

A rebuild of [eminenceprinting.co.za](https://www.eminenceprinting.co.za/) for
**Eminence Printing**, a printing and branding business in Empangeni, KwaZulu-Natal,
plus a **Design Studio**: customers put their logo on the real product at real size,
see the mockup, get the price, and send the job on WhatsApp with their original
files.

It follows the method used for the DesignCo project: measure the live site, separate
what is true from what isn't, fix what's broken, then add the tool that earns money.
The difference is that DesignCo's brief was *improve without changing much*.
Eminence's site was rejected outright as "AI slop", so this is a rebuild.

## What was wrong — `audit/AUDIT.md`

- **The contact form sends nothing.** Its handler waits one second, shows "Message
  Sent!" and clears the fields. Every written enquiry is lost.
- **The advertised email can't receive mail**: `eminenceprinting.co.za` has no MX
  record.
- **The "portfolio of completed projects" is AI-generated**, with gibberish text on
  the products (*"LATG WAiR"*, *"I EUP NEW BABALS PRITTING"*). The six testimonials
  can't be traced.
- The footer's WhatsApp button goes to a **placeholder number**. The structured data
  says **"123 Print Avenue, Johannesburg"**.
- The main button is **2.53:1** contrast; "Call Us Today" is **1.09:1**.
- The link-preview image is a **404**, so every WhatsApp share is a bare link.

## What's true — `research/RESEARCH.md`

Everything the new site says comes from Eminence's own Facebook page: phone/WhatsApp
078 935 6433, `eminenceprinting@gmail.com`, their list of processes, *"15 years and
counting"*, and photos of real jobs (Khula Med ambulances, Stop & Buy Supermarket,
Ant Ranch, Pbtoz). Their **real logo** is CMYK ink droplets and an EP monogram,
which is where the new brand system comes from (`brand/BRAND.md`).

## Folders

| | |
|---|---|
| `audit/` | Findings with measurements and screenshots of the current site |
| `research/` | Verified facts, the real logo, real job photos |
| `brand/` | The brand system — tokens, type, contrast, motifs, voice |
| `site/` | **The deployable website** (Vercel root): pages, Studio, `/api` |
| `build/` | Page generator, asset renderer, local dev server |
| `ops/DEPLOY.md` | Hosting, email, storage, environment variables, launch checklist |
| `ASSETS.md` | **Brief for the Codex agent**: logo redraw, photo blanks, image rules |

## Running it

No framework and no runtime dependencies. Node 20+.

```bash
node build/build.mjs                 # regenerate the HTML pages from build/content.mjs
MOCK=1 node build/dev-server.mjs     # http://127.0.0.1:8125 — site + Studio + API,
                                     # with in-memory storage; emails go to build/.outbox/
cd build && npm install && npm test  # API tests (SigV4 signer, tokens, file sniffing, shops)
node build/studio-test.mjs           # the Studio in a browser (needs the mock server running)
node build/order-test.mjs            # an order end to end for every shop (mock server)
```

A plain static server works for everything except `/api`:
`cd site && python -m http.server 8123`.

## The Design Studio — `site/studio/`

The storefront workspace now has a searchable product chooser, a large central
artwork/mockup switch, selectable layers, a separate order panel and clean mockup
downloads. Mobile uses Product / Design / Preview & price tabs.

For embedding in another website, see [`site/studio/EMBED.md`](site/studio/EMBED.md)
and the working `/studio/embed-demo.html`. The host receives the design, proof and
original files through a completion callback; commerce cart/checkout adapters are
still supplied by the host. Research and verification notes are in
[`research/STUDIO-UX.md`](research/STUDIO-UX.md). Run the browser regression suite
with `node build/studio-test.mjs` while the local server is running on port 8125
(requires the build dependencies and Microsoft Edge).

Built on the DesignCo studio's lessons — real millimetres, per-product DPI
thresholds, artwork under the lighting — and extended:

| | DesignCo studio | Eminence studio |
|---|---|---|
| Placing artwork | Three sliders: size, across, up | **Direct manipulation** on a true-size print area: drag, corner-scale, rotate, pinch, snap to centre and safe lines, arrow-key nudge |
| Content | One image per surface | **Layers**: any number of images and **text** (10 fonts, outline, letter-spacing, arc), reorder, duplicate |
| Print guides | — | **Trim, bleed and safe lines** drawn on cards, flyers and banners; the hidden 100 mm of a pull-up; non-printable parts of a canopy or a flag hatched out |
| Artwork checks | DPI | DPI with a one-click **"make it sharp"** fix; **white-box detection and background removal**; **ink-colour count**; colour-vanishes-on-fabric warning; sublimation-on-dark **blocked**, with one-click switch to DTF; photos refused for screen, vinyl and embroidery; text outside safe lines; bleed not reached |
| Pricing | Flat per item | How print is actually priced: blank + **per print position**, DTF/sublimation by **size band**, screen by **ink colour** with once-off screens and a 20 minimum, embroidery with digitising, paper in **tiers**, large format **per m²**, installed work as a **range**. Size breakdown S–3XL with 2XL+ uplift. VAT shown. |
| Products | 7 | **17**: T-shirt, oversized tee, **golf shirt**, hoodie, cap, **tote**, **mug** (true cylinder, rotatable), **business cards**, **flyers**, **posters**, pull-up, **PVC banner**, **correx board**, **teardrop flag**, gazebo, **vehicle livery** (Quantum-class van, both sides and rear), **shopfront sign** |
| 3D | CSS-3D gazebo (couldn't be exported) | Canvas **3D gazebo** with perspective-correct texturing and per-face lighting, which *can* be exported |
| Output | PNG of the mockup | **Proof sheet**: every designed side, flat print areas at true proportion, placement table with DPI, detected inks, the quote, job reference, approval line. Plus a **JSON spec in millimetres** |
| Handoff | Prototype `alert()` | **WhatsApp** with the job written out. With storage configured, **presigned direct uploads** of the originals, proof and spec, verified server-side by their bytes, then an email to Eminence with 7-day links |
| Realism ceiling | "Blanks are drawn, not photographed" | Same drawn fallback, plus a **photo-blank pipeline** that recolours, displaces and relights a single white-garment photo. Tested with a stand-in; the photos are specified in `ASSETS.md` §3 |
| Also | — | Undo/redo, draft saved on the device (IndexedDB, files included), design carried across when switching product, deep links (`/studio/?product=polo`), phone layout with tabs |

### How it hangs together

```
products.js   geometry and production rules, in mm        pricing.js  the quote engine; prices set at /studio/admin/
doc.js        layers, undo, carry-over, draft             artwork.js  load, PDF, inks, white box, bg removal
compose.js    draws a layer stack at any scale — the editor, the mockup textures and the proof all use it
editor.js     the print-area editor                       render/     one renderer per product family
proof.js      proof sheet + mm spec                       handoff.js  WhatsApp + upload
app.js        the page
```

**To add a product:** add it to `PRODUCTS` in `products.js` with its surfaces in mm,
give it a `render` family (or write one in `render/`), and add its pricing branch in
`pricing.js`.

## The website — `site/`

Plain HTML generated from `build/content.mjs`: a home page, six local service pages
(*"T-shirt printing in Empangeni"* etc.), a 404, sitemap and robots. The old site
shipped 454 KB of React to render one page. These pages work without JavaScript,
and link previews, search engines and slow phones can read them.

The design borrows from print-shop paperwork instead of template furniture:
colour-control strips, crop marks round a live Studio render, job tickets for real
work, a spec-sheet services list. See `brand/BRAND.md`.

## Status

- [x] Live site audited (performance, accessibility, SEO, form, DNS)
- [x] Real business facts and assets researched, photos verified by eye
- [x] Brand system from their real logo
- [x] Website rebuilt: home, 6 service pages, 404, sitemap, OG cards, favicon
- [x] Contact form that really sends, with WhatsApp fallback
- [x] Design Studio — 17 products, tested in Chromium at 1440 px and 390 px
- [x] Order handoff tested end to end against mock storage and mail
- [x] API tests pass, including AWS's published SigV4 signature
- [ ] **Logo vector redraw** — `ASSETS.md` §2 (Codex)
- [x] **Photo blanks** for the T-shirt (front, back) and hoodie (front), from the purchased S.i. Graphics PSDs — `build/blanks/psd_blanks.py`
- [ ] Photo blanks for the other garments, and a real photographed back — `ASSETS.md` §3
- [ ] **Original job photos + client permission** — `ASSETS.md` §5 (Eminence)
- [x] Owner price settings — `/studio/admin/`, saved through `/api/pricing`
- [ ] **Eminence's own prices** entered and saved there (Eminence)
- [ ] Email on the domain, Resend, R2 — `ops/DEPLOY.md`

## Questions for Eminence

From `build/content.mjs` → `CLIENT_TO_CONFIRM`:

1. Street address and trading hours (neither is published anywhere).
2. Year founded — their 2023 post says *"15 years and counting"*.
3. Do they offer **DTF** and **cut vinyl** on garments? The Studio assumes yes.
4. Their prices — entered by them at `/studio/admin/`.
5. Delivery area and minimum quantities.
6. Permission from Khula Med, Stop & Buy, Ant Ranch and Pbtoz to show their jobs.

## Mockups, print sizes, fonts and prices

**Mockups the Printful way.** Printful's mockups are photographs of real
garments with the design warped into the folds, not live 3D. The T-shirt and
hoodie now use the photographed S.i. Graphics templates the owner bought:
`build/blanks/psd_blanks.py` rebuilds a white garment from the PSD's own mask,
shadow and highlight layers, and `photo.js` recolours it to any colour and lays
the print under the folds. Provenance and licence: `site/studio/blanks/PROVENANCE.md`.
The other garments use the drawn SVGs until they have photos.

All four garments now share ONE photograph's light and cloth, the way a
Printful catalogue looks consistent: the **oversized tee** is the T-shirt photo
reshaped boxy, and the **golf shirt** is the T-shirt photo with a collar, stand,
placket and buttons built from its own fabric (`polo()` in `psd_blanks.py`).
The hoodie is its own photo. A real photographed golf shirt would still be better.

**Business and welcome cards, designed whole.** Pick a layout (5 business
card, 2 welcome card), type *Your details* once — name, title, phone, email,
website… or heading, message, Wi-Fi, password — and the front and back fill in,
inside the safe line with the background to the bleed. Then edit freely: new
**shape** layers (backgrounds, bands, circles, rounded boxes) and **QR codes**
(vector, from the website or a WhatsApp link, with a scan-size check), a brand
colour that recolours the whole card, rounded corners. The preview is a card
stack on a desk, front and back, with the finish (gloss / matt / soft-touch).
Checks warn while example details are still on the card. **Welcome cards** are a
new product: A6, DL, A5, square or mini, 25 – 1 000, priced at `/studio/admin/`.

**Print sizes.** Every design shows its real size in cm, the A-size it matches
(A7 – A0) and its DPI at that size, with one-click A6 · A5 · A4 · A3 · A2 buttons
that only offer sizes the print area can take. The print area says the biggest
A-size it holds; the proof sheet lists each print's A-size.

**Editing on the garment colour.** A colour strip on the edit canvas, and the
backdrop takes the garment colour, so a design for a black shirt is made on black.

**Fonts.** 27 Google Fonts in four groups — Clean, Streetwear (stencil,
blackletter, neon…), Graffiti (spray paint, drip, tag, marker…) and Script.

**Prices — `/studio/admin/`.** Every number the Studio charges, in print-shop
words: blanks, DTF/sublimation by A-size, screens per colour, embroidery,
bulk discounts, paper tiers, per m², fixed items, installed ranges, VAT — with
a live example quote. Saved with `STUDIO_ADMIN_PASSWORD` to the storage bucket;
the Studio loads it on start. Customers see a price, never an "estimate".

## White-label: one Studio, many shops — `site/studio/WHITE-LABEL.md`

The Studio is a MiraiStack product that any print shop can use under its own
brand. Everything that belongs to a shop — name, logo, colours, WhatsApp, email,
town, product list, prices, admin password, order inbox, storage folder — comes
from `site/studio/tenants/<id>.json`. Eminence is one shop (`eminence`, the
default); `demo` (Northside Print Co.) shows a second. Pick a shop with
`?tenant=<id>`, the embed's `tenant` option, or its own hostname.

## Display products: colours, settings and turning

- **Gazebo** — true 3D: drag round it a full 360°, drag up to look down on the
  roof (0–70°), scroll / pinch / ± to zoom, **↻ 360°** for a full turn. Canopy
  colour, a separate **frame colour** (silver, black, white), the pop-up frame's
  scissor truss and foot plates, **back and side walls** (each priced), and a
  setting to stand it in — **studio, grass or paving** — drawn in the same 3D.
- **Teardrop flag, pull-up, correx board** — drag to turn them on their stand;
  past 90° you see the back (a flag's print shows through mirrored; a pull-up
  shows its grey back and pole). The PVC banner is tied to a fence, so it stays.
- **Printed background colour** for gazebo, flag, pull-up, PVC and correx: the
  colour is printed edge to edge behind the design, shown in the editor, and
  written into the print-ready PNG.
- **Mug** — drag to turn, now with zoom.

## Background removal — free, on the customer's device

Two buttons on any uploaded picture:

- **Remove solid colour** — for logos and artwork on a white or coloured box.
  Flood-fills from the edges, so white *inside* a logo stays; a strength slider
  re-runs it from the original. Instant, no download.
- **Remove with AI** — for photos and busy backgrounds. U²-Net (`u2netp`,
  4.5 MB, Apache-2.0) run by onnxruntime-web (MIT) in the browser
  (`site/studio/js/aibg.js`). Free: no API, no per-image cost, the photo is
  never uploaded. About 15 MB downloads on first use; a few seconds per image.
  Good on a product, person or pet; fine hair and glass come out soft, so the
  proof notes the shop refines cut-outs from the original.

Licences were checked for resale: BRIA RMBG (non-commercial) and img.ly's
background-removal (AGPL) were ruled out.

## Orders: print files and customer folders

Every order now carries a **print-ready PNG per printed side**
(`site/studio/js/printfile.js`): the whole design at its true size (bleed
included on paper and banners), 300 dpi — or the product's own minimum for large
format, capped near 50 megapixels — with a transparent background and the DPI
written into the file, so it opens at the right physical size. Names say what
they are: `EP-261105-EAM-back-300x400mm-300dpi.png`.

Storage is filed **by shop, then by customer** (WhatsApp number + name):

```
tenants/eminence/customers/27825550101-sipho-dlamini/customer.json   ← who, and every order they've sent
tenants/eminence/customers/27825550101-sipho-dlamini/EP-261105-EAM-<random>/
    print/      the print-ready PNGs
    artwork/    the customer's original uploads
    proof/      the proof sheet
    spec.json   sizes, placements, inks, the quote, the print files
```

The email to the shop lists the print files first, with 7-day links.

## Known gaps

- **Drawn blanks until photos arrive.** The SVG garments are good; photographed
  blanks will be better. The pipeline for them is built and tested.
- **The cap is front-on only**, and a front-on cap is ambiguous (a known DesignCo gap
  too). A three-quarter photo blank fixes it.
- **AI and EPS files can't be previewed** in a browser. They're accepted, placed
  as a labelled box, and sent to production untouched. PDFs do preview, via pdf.js
  loaded only when a PDF is dropped.
- **Background removal is a flood fill from the edges.** It's right for the common
  case, a logo on a flat white box, and the proof notes that production should redo
  it properly from the original. It isn't for photos.
- **Rate limiting is per serverless instance** — see `ops/DEPLOY.md`.
