# Eminence Printing — website rebuild and Design Studio

A rebuild of [eminenceprinting.co.za](https://www.eminenceprinting.co.za/) for
**Eminence Printing**, a printing and branding business in Empangeni, KwaZulu-Natal,
plus a **Design Studio**: customers put their logo on the real product at real size,
see the mockup, get an estimate, and send the job on WhatsApp with their original
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
cd build && npm install && npm test  # API tests (SigV4 signer, tokens, file sniffing)
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
products.js   geometry and production rules, in mm        pricing.js  the quote engine (placeholders)
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
- [ ] **Photo blanks** — `ASSETS.md` §3 (Codex)
- [ ] **Original job photos + client permission** — `ASSETS.md` §5 (Eminence)
- [ ] **Real prices** — `site/studio/js/pricing.js` (Eminence)
- [ ] Email on the domain, Resend, R2 — `ops/DEPLOY.md`

## Questions for Eminence

From `build/content.mjs` → `CLIENT_TO_CONFIRM`:

1. Street address and trading hours (neither is published anywhere).
2. Year founded — their 2023 post says *"15 years and counting"*.
3. Do they offer **DTF** and **cut vinyl** on garments? The Studio assumes yes.
4. Their prices, so the Studio can say *Price* instead of *Estimate*.
5. Delivery area and minimum quantities.
6. Permission from Khula Med, Stop & Buy, Ant Ranch and Pbtoz to show their jobs.

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
