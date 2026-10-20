# ASSETS.md — asset brief for the Codex agent

You are producing the image assets for the rebuilt **Eminence Printing** website and its
**Design Studio**. The code is finished and already has a place for every asset
listed here. Your job is to make the files, put them at the exact paths given, and
run the checks at the end of each section.

Read this whole file before generating anything. Section 0 is not optional.

---

## 0. Rules — read first

The old site was rejected as "AI slop". The main reason was not its colours or fonts.
It was that its "portfolio of completed projects" was **AI-generated images with
garbled fake text on them**: a van reading *"LATG WAiR"*, shirts reading
*"I EUP NEW BABALS PRITTING"*. Its testimonials were invented too. None of that may
happen again.

1. **Never generate anything that claims to be Eminence's work, premises, staff or
   customers.** No "our workshop", no "our team", no finished jobs for named or
   invented clients. Real work comes only from real photos (section 5).
2. **No readable text in any generated image.** Not words, not lorem ipsum, not
   fake logos, not labels or swing tags. If the model adds text, regenerate.
3. **No real brands.** No Gildan, Nike, Toyota or any other badge or logo.
4. **No people in generated images.** People imply staff or customers.
5. **Generated blanks are product templates, not photographs of jobs.** That is the
   only reason they are allowed: the Studio prints the customer's own design onto
   them, live.
6. The **only facts** about Eminence are in `research/RESEARCH.md`. Do not add any
   claim — address, hours, years, prices, client names — that is not there.
7. Commit a short `PROVENANCE.md` line for every file you add: what produced it
   (model and prompt, a tool, or "supplied by Eminence").

---

## 1. Where everything goes

```
site/
  assets/
    brand/        logo files, favicons                   ← section 2
    work/         real job photos (from Eminence)        ← section 5
    og/           link-preview cards (rendered by script)← section 6
    img/          studio screenshot (rendered by script)
  studio/
    blanks/       photo blanks + manifest.json           ← section 3
    blanks/PROVENANCE.md
```

Tooling already in the repo:

- `node build/build.mjs` rebuilds the HTML pages.
- `cd build && npm install && node render-assets.mjs` re-renders favicons, OG
  cards and the Studio screenshot (needs the site served on :8123).
- `MOCK=1 node build/dev-server.mjs` serves the site at <http://127.0.0.1:8125>,
  including the Studio and the API in mock mode.

---

## 2. The logo — a faithful vector redraw (priority 1)

**Source:** `research/facebook/logo-original-fb-720.jpg`, Eminence's real logo and
their Facebook profile picture. It is 720 px, raster only, and contains:

- four glossy 3D ink droplets — cyan, magenta, yellow, black — on curved CMYK ribbon
  stripes;
- a large script **EP** monogram, E in cyan and P in magenta;
- *"Eminence Printing"* in an outlined bold italic script, *Eminence* in cyan and
  *Printing* in magenta, both with a dark navy outline;
- the phone number in yellow.

**This is a redraw, not a redesign.** It is the client's identity. Keep the EP
monogram's script character, the cyan/magenta split, the four inks and the italic
energy of the wordmark. Clean it up for screens and print:

- flat colour, **no** 3D gloss, bevels or drop shadows;
- **remove the phone number** from the logo itself — contact details change, a
  logo shouldn't;
- simplify the ribbons to four clean curved CMYK strokes, or drop them in the
  compact versions;
- colours, exactly (these are the site tokens in `site/assets/css/tokens.css`):

  | Ink | Hex |
  |---|---|
  | Cyan | `#00A0E3` |
  | Magenta | `#E5007E` |
  | Yellow | `#FFE500` |
  | Key / outline | `#14161A` |

### Deliver

| File | Content | Notes |
|---|---|---|
| `site/assets/brand/logo-full.svg` | droplets + ribbons + EP + wordmark, stacked | the master |
| `site/assets/brand/logo-horizontal.svg` | small EP monogram left, *Eminence Printing* wordmark right, one line | used in the site header at **40 px tall** — must read at that size |
| `site/assets/brand/logo-horizontal-white.svg` | same, for dark backgrounds | wordmark white; cyan and magenta stay |
| `site/assets/brand/logo-ep.svg` | EP monogram only, square artboard | social avatars, favicon source |
| `site/assets/brand/logo-mono-black.svg` / `logo-mono-white.svg` | one-colour horizontal | for embroidery, vinyl and fax-quality uses |
| `site/assets/brand/favicon.svg` | EP monogram on a `#14161A` rounded square, 32×32 viewBox | **replaces** the interim four-dot mark |

SVG rules: real vector paths (convert text to outlines — no `<text>`, no embedded
fonts, no embedded raster `<image>`), `viewBox` set, no fixed `width`/`height`,
under 30 KB each, valid when opened in a browser.

### Wire it in

1. In `build/build.mjs`, function `logo()`, replace the `.dots` span and the
   `<b>Eminence</b>` text with `<img src="/assets/brand/logo-horizontal.svg" alt="Eminence Printing" height="40">`.
   Use `logo-horizontal-white.svg` in the footer (it has a dark background).
2. In `site/studio/index.html`, replace the `.brand` `.dots` and `.word` content
   with `logo-horizontal-white.svg` (the Studio bar is dark), keeping the
   *Design Studio* label.
3. In `build/render-assets.mjs`, swap the four-dot `mark()` for the EP monogram
   (load `logo-ep.svg` as an `<img>`), then re-run it to regenerate
   `favicon-32.png`, `apple-touch-icon.png`, `logo-mark-512.png` and both OG cards.
4. `node build/build.mjs`.

### Check

- [ ] Opened side by side with the original JPG, a person would say "same logo, cleaned up".
- [ ] Header logo legible at 40 px; favicon legible at 16 px.
- [ ] No `<text>` or `<image>` elements in any SVG (`grep -L "<text\|<image" site/assets/brand/*.svg` lists every file).
- [ ] Every colour in the SVGs is one of the four hex values above, or white.

---

## 3. Photo blanks for the Design Studio (priority 2)

### Why

The Studio draws its garments as SVG. DesignCo's version of this tool stated its own
limit plainly: *"blanks are drawn, not photographed"*. Professional mockup tools use
a photo of a real garment plus a displacement map.

`site/studio/js/render/photo.js` already implements that pipeline. It needs only
**one image per view: a white garment on a transparent background.** From that
single file it derives the colour (any garment colour = colour × the photo's own
shading), the fold shading, the highlights for dark fabrics, and a displacement map
that bends the customer's print along the folds. When a blank is listed in
`manifest.json` the Studio uses it automatically. Otherwise it falls back to the SVG
drawing, so you can add blanks one at a time.

### The files

| Studio product id | Views | Garment |
|---|---|---|
| `tee` | `front`, `back` | regular-fit crew-neck T-shirt, 160 g cotton, set-in sleeves |
| `oversized` | `front`, `back` | heavyweight boxy tee, dropped shoulder, wide short body |
| `polo` | `front`, `back` | pique golf shirt, knit collar, three-button placket, ribbed sleeve band |
| `hoodie` | `front`, `back` | pullover hoodie, kangaroo pocket, ribbed cuffs and hem, hood up behind the neck |
| `cap` | `front` | six-panel structured baseball cap, front-on, peak pointing at camera, slightly from above |
| `tote` | `front` | flat canvas tote, two long handles |

File names: `site/studio/blanks/<product>-<view>.png`, e.g. `polo-front.png`.

### Image specification

- **2000 × 2000 px PNG, transparent background (alpha).** No shadow on the
  background — the Studio draws its own.
- **The garment must be white or very light grey (#F2F2F2–#FFFFFF).** The pipeline
  recolours by multiplying. A coloured or dark blank cannot be recoloured.
- **Ghost-mannequin / invisible-mannequin style**, front-on, orthographic (no
  perspective tilt), symmetric, centred horizontally. Back views show the back
  neck, not the inside of the front.
- **Soft even studio light**, slightly from above-left, so folds read as gentle
  shading. No hard specular hot-spots, no deep black creases.
- **Natural, modest folds** — a garment that has been worn and laid straight, not
  crumpled. Folds across the print area are what make the print look real; too many
  make it look like a fault.
- **Nothing printed, no labels, no swing tags, no brand marks, no stitched logos,
  no text of any kind.**
- **Scale, so prints are the right size.** For size **M**, the chest
  (armpit to armpit) must be **1000 px wide** for `tee`, `polo` and `hoodie`, and
  **1100 px** for `oversized`. Cap: crown **1300 px** wide. Tote: body **1300 px**
  wide.

### Image-model prompt (adapt per garment)

> Product photograph for an apparel mockup template. A plain **white** [regular-fit
> crew-neck cotton T-shirt], **front view**, ghost mannequin (invisible mannequin)
> style, perfectly front-on and symmetric, centred, orthographic, isolated on a
> transparent background. Soft diffuse studio lighting from upper left, gentle
> natural fabric folds, realistic cotton texture. Completely blank: no print, no
> logo, no text, no label, no tag, no brand. No person, no hanger, no shadow on the
> background. 2000 × 2000.

Negative: *text, letters, logo, label, tag, print, graphic, person, model, hanger,
background, floor shadow, wrinkles, crumpled, coloured fabric.*

If the model can't produce transparency, generate on pure `#00FF00` and key it out
(clean the green fringe), or on white and cut it out with a proper matte. Check the
edge at 400% — a white halo becomes a grey outline once the shirt is recoloured.

### `manifest.json`

`site/studio/blanks/manifest.json` tells the Studio what exists and where the print
areas sit on each photo. Measure the area centres **on your image, in pixels**:

```json
{
  "version": 1,
  "blanks": {
    "tee/front": {
      "src": "tee-front.png",
      "chestMm": 510,
      "pxPerMm": 1.9608,
      "areas": {
        "front":        { "cx": 1000, "cy": 1020 },
        "chest-left":   { "cx": 1180, "cy": 760 },
        "chest-right":  { "cx": 820,  "cy": 760 },
        "sleeve-right": { "cx": 330,  "cy": 640, "rot": 14 }
      }
    },
    "tee/back": {
      "src": "tee-back.png", "chestMm": 510, "pxPerMm": 1.9608,
      "areas": { "back": { "cx": 1000, "cy": 980 }, "neck": { "cx": 1000, "cy": 470 } }
    }
  }
}
```

- `pxPerMm` = chest width in px ÷ `chestMm`. For a 1000 px tee chest: 1000 / 510 = **1.9608**.
  `chestMm` per product: tee 510, oversized 600, polo 520, hoodie 580, cap 200, tote 380.
- `areas` keys must be the surface ids in `site/studio/js/products.js` for that
  product. Only list areas that are visible in that view.
- **Left chest is on the VIEWER'S RIGHT** (it is the wearer's left). Right sleeve
  is on the viewer's left in a front view.
- Where to put each centre (these are the garment-trade placements, measured from
  the **high point of the shoulder**, HPS, where the shoulder seam meets the collar):

  | Area | Centre |
  |---|---|
  | `front` | on the centre line, top edge of the print 75 mm below HPS → centre = HPS + 75 + ½ print height |
  | `chest-left` | 90 mm toward the wearer's left of the centre line, 180 mm below HPS |
  | `chest-right` | mirror of `chest-left` |
  | `back` | on the centre line, top edge 100 mm below the back neck seam |
  | `neck` | on the centre line, 45 mm below the back neck seam |
  | `sleeve-right` | middle of the sleeve, 60 mm above the sleeve hem; `rot` = the sleeve's angle from vertical, in degrees |
  | cap `front` | middle of the front two panels, 30 mm above the peak seam |
  | tote `front` | middle of the bag body |

  Print heights (mm) come from `products.js`, e.g. the tee front is 280 × 360.

### Check

- [ ] `MOCK=1 node build/dev-server.mjs`, open `/studio/?product=tee`, click *or try
      it with a sample logo*. The preview shows **your photo**, not the drawing.
- [ ] Switch through all 14 colours. White still looks white (not grey); black shows
      its folds (not a flat silhouette); no halo around the edge on any colour.
- [ ] The dashed pink print area sits where a printer would put that print. Compare
      against the SVG version by temporarily renaming `manifest.json`.
- [ ] Download the proof sheet: the photo blank appears in it, with the print.
- [ ] Each PNG < 2.5 MB (`pngquant --quality 80-95` is fine; the shading is low-frequency).

---

## 4. Optional: service illustrations (priority 3)

Only if asked. These are **product-category illustrations** for the six service
pages (`/services/<slug>/`), not portfolio. Same rules as section 0: no text, no
people, no brands, nothing that claims to be Eminence's work or premises.

| File (`site/assets/img/`) | Subject |
|---|---|
| `svc-clothing.webp` | a neat stack of folded blank golf shirts in navy, white and black on a plain surface |
| `svc-vehicle.webp` | a plain white panel van, side view, empty car park, overcast — **no markings, no badge** |
| `svc-signage.webp` | a blank aluminium sign panel leaning against a wall, workshop light |
| `svc-banners.webp` | a blank white pull-up banner and a blank teardrop flag, plain studio floor |
| `svc-print.webp` | a fanned stack of blank white business cards and a blank A5 sheet, top-down |
| `svc-mugs.webp` | a plain white ceramic mug, three-quarter view, plain surface |

1600 × 1000, WebP quality 80, under 180 KB. To use them, add an `img` field to
each service in `build/content.mjs` and render it in `service()` in
`build/build.mjs` with `alt` describing it as an example product, e.g.
*"Example: blank golf shirts"*. Never put them in the **Recent jobs** section.

---

## 5. Real photographs — from Eminence, not generated (priority 1, parallel)

Codex cannot produce these. They are listed so the person running Codex knows what
to ask the client for and where it goes.

The current job photos in `site/assets/work/` are **160–590 px thumbnails** pulled
from Eminence's public Facebook page. They prove the work is real; they are too
small to be a portfolio.

### Ask Eminence for

1. **The original photos of the jobs already on the site** — Khula Med ambulances,
   Stop & Buy Supermarket, Ant Ranch caps and shirts, Pbtoz rooftop sign. Full
   resolution, straight off the phone.
2. **Written OK from each of those clients** to show their job (their brands are
   visible).
3. A shot list for one afternoon, phone camera is fine, landscape, daylight:
   - the shopfront from across the road;
   - each machine *in use*: embroidery machine, large-format printer, screen press,
     heat press, laser;
   - hands at work: loading a screen, weeding vinyl, fitting a sign;
   - five finished jobs laid flat on a plain table;
   - the team, only if they want to be on the website.

### Process what arrives (Codex can do this part)

- Strip EXIF location data (`exiftool -gps:all= -overwrite_original`).
- Export each at **1600 px** and **800 px** on the long side, WebP quality 80,
  e.g. `khula-med-quantum-1-1600.webp` and `-800.webp`, into `site/assets/work/`.
- Update the file names in `JOBS` in `build/content.mjs`, and in `build/build.mjs`
  render `<img srcset="…-800.webp 800w, …-1600.webp 1600w" sizes="(max-width:760px) 100vw, 600px">`.
  Raise `.ticket .ph` height in `site/assets/css/site.css` from 170 px to about
  260 px once the images are sharp enough.
- Keep the alt text factual: what the job is, for whom.
- `node build/build.mjs`.

---

## 6. Link-preview cards (already done — regenerate after section 2)

`site/assets/og/og-home.png` and `og-studio.png` (1200 × 630) are rendered from
HTML by `build/render-assets.mjs`. They fix the old site's broken
`social-preview.png` (a 404, so every WhatsApp share showed no image). After the
logo redraw, update the header row in `og()` to use `logo-horizontal-white.svg` and
re-run the script. Test a shared link with
<https://developers.facebook.com/tools/debug/> once deployed.

---

## 7. Done means

- [ ] Every file in sections 2 and 3 exists at its path, with a `PROVENANCE.md` line.
- [ ] `node build/build.mjs` and `node --test site/api/_lib/s3.test.mjs` both pass.
- [ ] The Studio, opened on a phone (390 px) and on desktop, shows photo blanks for
      the six garment products, and the SVG fallback still works if `manifest.json`
      is removed.
- [ ] No generated image contains text, people, brands, or anything presented as
      Eminence's own work.
