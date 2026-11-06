# Embed the Studio

Serve `site/` on your own HTTPS domain. The Studio is framework independent and isolated in an iframe, so its CSS does not alter the store theme.

```html
<div id="product-designer"></div>
<script type="module">
  import { mountStudio } from 'https://YOUR-STUDIO-DOMAIN/studio/embed.js';
  const studio = mountStudio('#product-designer', {
    tenant: 'eminence',          // which shop — see WHITE-LABEL.md
    product: 'tee',
    accent: '#C4006B',
    onComplete(design) {
      // Your store adapter persists the files/spec and attaches its design ID
      // to a cart line. Validate product, quantities and prices on your server.
      console.log(design.spec.ref);
    }
  });
  // On route unmount: studio.destroy();
</script>
```

For cross-origin module loading, serve `embed.js` with a JavaScript MIME type and an appropriate `Access-Control-Allow-Origin` header, or copy this small module onto the host and replace `new URL('./', import.meta.url)` with your absolute Studio URL. Your hosting CSP must permit the intended store origins in `frame-ancestors`; the store must permit the Studio in `frame-src`.

`mountStudio` returns `{ iframe, destroy }`. Options: `tenant` (the shop id, see WHITE-LABEL.md), `product`, `handoff` (`"studio"`, the default: the Studio sends the order; `"host"`: hand the design to your cart), `height` (default: the full screen height, `100dvh`; a number is pixels), `accent` (six-digit hex), `title`, `onReady()`, `onSent(ref)` and `onComplete(design)`. Give it the full width of the page: the Studio needs about 1,200 px for its three columns and switches to its phone layout below that.

Completion data:

- `spec`: production placement summary, reference, sizes and file names.
- `document`: editable state including layers and text properties.
- `proof`: PNG Blob.
- `files`: `{ id, name, file: File }[]` containing used original artwork.
- `quote`: indicative pricing, not an authorized checkout price.

The callback receives structured-clone data, including File and Blob objects. Upload these using FormData; JSON.stringify does not serialize file bytes. The module validates both the iframe source window and its origin. The child sends only to the configured parent origin. Drafts are scoped by parent origin and starting product; browser storage restrictions may disable persistence.

Try `/studio/embed-demo.html` for a working local host. The demo acknowledges the completed design; it does not add an item to a commerce cart. Shopify/WooCommerce/Wix adapters and server storage are separate integrations. Standalone `/studio/?tenant=<id>` keeps the shop's own quote/WhatsApp flow.
