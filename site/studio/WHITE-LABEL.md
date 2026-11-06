# MiraiStack Studio — white-label

One Studio, any number of print shops. Each shop gets the Studio under its own
name, logo, colours, WhatsApp number, products and prices, on its own website,
with its own orders and its own price settings. Adding a shop is a settings
file, not a code change.

## Add a shop in five steps

1. **Settings file.** Copy `tenants/demo.json` to `tenants/<shop-id>.json`
   (lowercase letters, digits and dashes) and fill it in — fields below.
2. **Logo** (optional). Put it in `tenants/<shop-id>/logo.png` (or `.svg`) and set
   `"logo": "/studio/tenants/<shop-id>/logo.png"`. Without one, the Studio shows
   the four ink dots and the shop name.
3. **Admin password.** Add the shop to the `STUDIO_ADMIN_PASSWORDS` environment
   variable, a JSON map: `{"eminence":"…","northside":"…"}`. Give the password
   only to the shop's owner; it opens `/studio/admin/?tenant=<shop-id>`.
4. **Choose how customers reach it** — any of:
   - **Embed on the shop's own website** (Shopify, WooCommerce, Wix, plain HTML):
     ```html
     <div id="designer"></div>
     <script type="module">
       import { mountStudio } from "https://studio.miraistack.example/studio/embed.js";
       mountStudio("#designer", { tenant: "northside", product: "tee" });
     </script>
     ```
   - **A link**: `https://studio.miraistack.example/studio/?tenant=northside`
   - **Its own domain** pointed at the Studio: add the hostname to
     `tenants/index.json → "hosts"`.
5. **Prices.** The owner opens `/studio/admin/?tenant=<shop-id>`, enters their
   prices and saves. Until then the Studio uses the starter prices.

Check it: open `/studio/?tenant=<shop-id>` — the name, colours, WhatsApp number
and product list should all be the shop's, with nothing of any other shop.

## The settings file

```json
{
  "id": "northside",
  "name": "Northside Print Co.",          // full name: proof sheet, page title, emails
  "shortName": "Northside",               // in sentences: "Send to Northside"
  "tagline": "Online designer",           // under the name in the header
  "logo": null,                           // URL of the logo, or null
  "home": "https://northside.example/",   // where the header logo links
  "studioUrl": "northside.example/designer",  // printed on the proof sheet
  "whatsapp": "27820000000",              // international format, digits only
  "phoneDisplay": "082 000 0000",         // how the number is shown
  "email": "orders@northside.example",    // shown on the proof; orders go here
  "orderEmail": null,                     // optional: a different inbox for orders
  "location": "Durban",                   // used in example details
  "collectLabel": "Collect in Durban",    // the "Collect" delivery option
  "theme": { "primary": "#0F766E", "accent": "#F59E0B", "ink": "#10201E" },
  "products": ["tee", "hoodie", "cap", "mug", "cards", "rollup", "gazebo"],  // null = all
  "blanks": null,                         // optional: "/studio/tenants/northside/blanks/"
  "poweredBy": { "name": "MiraiStack", "url": "" }   // the small credit; null to hide
}
```

Product ids: `tee oversized polo hoodie cap tote mug cards welcome flyer poster
rollup pvc correx flag van fascia gazebo` (see `js/products.js`).

`theme.primary` is buttons and highlights, `accent` the secondary colour,
`ink` the text and dark surfaces. Keep `primary` dark enough for white text
(contrast 4.5 : 1 or more).

## What is kept apart per shop

| | Where |
|---|---|
| Prices | `tenants/<id>/pricing.json` in the storage bucket, edited at `/studio/admin/?tenant=<id>` |
| Admin password | `STUDIO_ADMIN_PASSWORDS["<id>"]`; the default shop may use `STUDIO_ADMIN_PASSWORD` |
| Orders and files | `tenants/<id>/customers/<whatsapp>-<name>/…` in the storage bucket |
| Order emails | to the shop's `orderEmail` or `email`, sent as "<name> Studio" |
| Designs saved in the browser | per shop, so two shops' Studios never mix |
| WhatsApp | every message and button goes to the shop's own number |

The browser only tells the server *which* shop it is. The inbox, the storage
folder and the password come from the settings file on the server, and the
order's shop is carried in a signed token between upload steps, so a customer
can't redirect an order to another shop's inbox.

## Garment photos — read before selling to other shops

The photo mockups in `blanks/` are made from S.i. Graphics templates bought for
Eminence under a **personal-use licence** that forbids sharing or distributing
the files. Giving them to other businesses is distribution. Before another shop
goes live, do one of:

- **Best:** the shop photographs its own plain white blanks to the guide in
  `ASSETS.md` §3; build them into `tenants/<id>/blanks/` with a `manifest.json`
  and set `"blanks"` in the settings file.
- Buy a commercial or extended licence from S.i. Graphics that covers use in a
  product offered to other businesses.
- Until then, set `"blanks"` to a folder with no manifest: the Studio falls back
  to its drawn garments, which are MiraiStack's own.

## Embedding

`embed.js` mounts the Studio in an iframe, so the shop's website styles never
clash with it. Options: `tenant`, `product`, `accent`, `title`, `onReady()`,
`onComplete(design)`. In an embed the Studio's button becomes "Use this design"
and hands the design (spec, proof PNG, original files, editable document) to the
host page, so a shop with an online store can add it to a cart line. See
`EMBED.md`. Messages from the iframe are `studio:ready` and `studio:complete`.
