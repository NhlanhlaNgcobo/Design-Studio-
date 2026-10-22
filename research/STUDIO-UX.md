# Studio storefront redesign — 22 October 2026

## Research

Primary sources reviewed before implementation:

- [Printify: How do I use the Product Creator?](https://help.printify.com/hc/en-us/articles/4483617169809-How-do-I-use-the-Product-Creator): choose a product, upload artwork, adjust placement, select variants, preview, then save. Separates editing from mockup preview; allows mockup downloads.
- [Printful: How does the Design Maker work?](https://help.printful.com/hc/en-us/articles/50264179910673-How-does-the-Design-Maker-work): product-specific techniques, individual print positions, layers, resolution warnings, preview and export.
- [Printify: Safe areas and bleeds](https://help.printify.com/hc/en-us/articles/4483626015889-What-are-safe-areas-and-bleeds): production guides belong in the artwork workspace.

Our interpretation for a customer-facing plugin: keep the chosen product visible, make product changes a deliberate chooser action, dedicate most space to the product or artwork, and keep order configuration in a separate rail. Do not present an entire catalogue as a permanent narrow sidebar. Keep estimates clearly identified and retain the actual production geometry.

## Changes

- Searchable product dialog; compact product, colour and preview-size controls.
- Central Edit artwork / Product preview switch, with shared underlying artwork state.
- Separate position selector and product-side views; print guides off in preview by default.
- Selectable layer list and inspector; persistent upload and text actions.
- Large, responsive mockups and clean PNG download separate from the production proof.
- Garment neckline is an actual silhouette cutout, not a grey ellipse. Reduced artificial noise, deformation and shadows; corrected regular-shirt print-area position.
- Stage-specific render caching, correct resizing when canvas height changes, initialization guard, and orbit cancellation handling.
- Gazebo camera fits the complete projected structure at every orbit. Product transfers use the last edited design as their source, avoiding cumulative shrinkage when browsing different product proportions.
- Framework-independent iframe embed with origin/source checked host messages, store-scoped drafts, customizable accent and completion payload.

## Verification and limits

`node build/studio-test.mjs` tests all 17 products, sample artwork, text layers, undo/redo, guides, mockup download, search, 390px mobile interactions and iframe completion with proof/original file data. Browser screenshots are saved under `audit/`.

The blank-photo manifest is still empty. These are illustrative placement previews, not photographs of exact supplier SKUs. The existing photo compositor remains available for calibrated supplier blanks. Prices remain unconfirmed estimates. The embed returns a design to its host; each platform must supply its own cart persistence, validated pricing and checkout adapter. No production deployment was performed.
