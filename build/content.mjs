/* Every word on the website, in one place.
 *
 * Rule for this file: nothing goes in that is not in research/RESEARCH.md or
 * is not plainly a description of a process. No invented testimonials, stats,
 * turnaround promises or prices. Where Eminence needs to supply a fact, the
 * page says less rather than guessing — see CLIENT_TO_CONFIRM at the bottom.
 */

export const BUSINESS = {
  name: "Eminence Printing",
  phone: "078 935 6433",
  phoneIntl: "+27789356433",
  whatsapp: "27789356433",
  email: "eminenceprinting@gmail.com",
  town: "Empangeni",
  region: "KwaZulu-Natal",
  facebook: "https://www.facebook.com/eminenceprinting/",
  site: "https://www.eminenceprinting.co.za",
  motto: ["You name it, we print it.", "You like it, we print it again."],
};

export const SERVICES = [
  {
    slug: "clothing-printing-empangeni", short: "Clothing & uniforms",
    title: "Clothing printing and embroidery in Empangeni",
    lede: "Golf shirts, T-shirts, hoodies and caps for staff, schools, clubs and events — screen printed for big runs, embroidered for the corporate look.",
    tags: ["Screen print", "Embroidery", "Sublimation", "DTF"],
    studio: { product: "polo", label: "Design a shirt" },
    body: [
      ["What we print on", ["Golf shirts — the staple of corporate and school wear. Branded on the chest, sleeve or back; the placket rules out a full-front print.", "T-shirts, regular and oversized, for events, campaigns, clubs and merch.", "Hoodies — front print sits above the kangaroo pocket; the back takes the big one.", "Caps — embroidered on the front panel, like our Ant Ranch job.", "Tote bags for events and shops."]],
      ["Which method", ["<b>Screen printing</b> gives the best price on bigger runs of the same design. It is priced per ink colour, so a one- or two-colour logo is the sweet spot.", "<b>Embroidery</b> is stitched thread: hard-wearing and smart, best for chest logos and caps. We send a digitised proof before stitching.", "<b>Sublimation</b> dyes the print into white or light polyester — it never cracks or peels. It cannot go on dark or cotton garments.", "<b>DTF transfers</b> print full colour on any fabric colour, and suit small quantities and photos."]],
      ["What to send", ["Your logo as a vector (AI, PDF, SVG or EPS) if you have it. Otherwise a PNG at least 300 dpi at the printed size — around 3,300 pixels wide for a 280 mm chest print.", "Sizes and quantities per size, and the garment colour.", "Not sure? Put your logo on a shirt in the Design Studio — it checks the resolution and counts the ink colours for you."]],
    ],
  },
  {
    slug: "vehicle-branding-empangeni", short: "Vehicle branding",
    title: "Vehicle branding and fleet livery in Empangeni",
    lede: "Fleet livery, door branding and part or full wraps — printed, laminated and fitted by our team. We branded the Khula Med ambulance fleet.",
    tags: ["Printed vinyl", "Cut vinyl", "Lamination", "Fitting"],
    studio: { product: "van", label: "Plan a livery" },
    body: [
      ["What we do", ["Fleet livery for panel vans and minibuses, like the Khula Med ambulances on Toyota Quantums.", "Door and side branding for bakkies and cars.", "Cut-vinyl lettering — the budget option for names, numbers and contact details.", "Printed and laminated graphics for full-colour sides."]],
      ["How it is quoted", ["Every vehicle is quoted after we see it: panel condition, curves and how much of the body is covered all change the fitting time.", "Use the Design Studio to put your branding on a Quantum-class van and send us the picture — it gives an indicative range, and we confirm the price after seeing the vehicle."]],
      ["What to send", ["Your logo as a vector file (AI, PDF, SVG or EPS).", "The make, model and year of each vehicle, and a photo of each side.", "What has to appear: name, phone, website, any registration or regulatory markings."]],
    ],
  },
  {
    slug: "signage-empangeni", short: "Signage & installation",
    title: "Shop signs and signage in Empangeni",
    lede: "Shopfront fascias, lightboxes, rooftop and site signs — made, delivered and installed by the Eminence team, like Stop & Buy Supermarket and Pbtoz.",
    tags: ["ACM fascia", "Lightbox", "Correx", "Installation"],
    studio: { product: "fascia", label: "Mock up a sign" },
    body: [
      ["What we make", ["Shopfront fascia signs in aluminium composite (ACM) — the flat, durable sign over a door.", "Lightboxes for shops that trade after dark.", "Rooftop and building signs.", "Correx boards for estate agents, elections, sites and events."]],
      ["Installation", ["Our team installs what we make — the Stop & Buy and Pbtoz signs on our Facebook page were fitted by us.", "Installed signs are quoted after a site visit: height, mounting surface and any wiring all change the job."]],
      ["Get a quote", ["Mock up your sign on a shopfront in the Design Studio at its real size, then send it to us with a photo of the building.", "Or WhatsApp us the photo and the size of the space."]],
    ],
  },
  {
    slug: "banners-and-gazebos-empangeni", short: "Banners & display",
    title: "Banners, pull-ups, flags and gazebos in Empangeni",
    lede: "Pull-up banners, PVC banners with eyelets, teardrop flags and branded gazebos for events, expos and shopfronts.",
    tags: ["Large format", "Dye sublimation", "PVC", "Fabric"],
    studio: { product: "rollup", label: "Design a banner" },
    body: [
      ["What we print", ["Pull-up banners on an aluminium stand with a carry bag. The bottom 100 mm rolls into the base, so keep text out of it.", "PVC banners, hemmed with eyelets, for fences, walls and buildings.", "Teardrop flags, sublimated, with pole and ground spike.", "Gazebos with a sublimated canopy, valance and optional back wall."]],
      ["Artwork for large format", ["Large format is seen from a distance, so it needs less resolution than paper: about 100–120 dpi at full size is plenty for banners and gazebos.", "Vector artwork is best of all. The Design Studio checks the resolution against the real size of each banner as you design."]],
    ],
  },
  {
    slug: "business-cards-and-flyers-empangeni", short: "Business print",
    title: "Business cards, flyers and printing in Empangeni",
    lede: "Business cards, flyers, posters and stationery — digital printing for short runs, litho for volume.",
    tags: ["Digital", "Litho", "Finishing"],
    studio: { product: "cards", label: "Design business cards" },
    body: [
      ["What we print", ["Business cards — SA standard 90 × 50 mm.", "Flyers from A6 to A4, single or double-sided.", "Posters from A3 to A0.", "Letterheads, books and other stationery — ask us."]],
      ["Print-ready files", ["Send a PDF with 3 mm bleed on every edge: the background must run past where the card is cut, or a thin white edge can show.", "Keep text at least 4 mm inside the trim.", "The Design Studio shows the bleed and safe lines on the card and warns you if your design misses them."]],
    ],
  },
  {
    slug: "mugs-and-laser-cutting-empangeni", short: "Mugs & laser",
    title: "Printed mugs and laser cutting in Empangeni",
    lede: "Sublimated mugs and laser-cut or engraved signs and gifts.",
    tags: ["Sublimation", "Laser cutting", "Engraving"],
    studio: { product: "mug", label: "Design a mug" },
    body: [
      ["Mugs", ["Sublimated 330 ml ceramic mugs. The print wraps 200 mm around the mug, with a gap at the handle.", "In the Design Studio you can turn the mug to see how much of the wrap shows from each side."]],
      ["Laser cutting", ["Laser-cut and engraved signs, plaques and gifts. Tell us the material, size and quantity on WhatsApp and we'll quote."]],
    ],
  },
];

export const JOBS = [
  { no: "Vehicle livery", client: "Khula Med", text: "Ambulance livery across a Toyota Quantum fleet and a VW Polo response car — reflective chevrons, star of life, full side graphics.",
    process: "Printed & cut vinyl", by: "Fitted by Eminence",
    photos: [["khula-med-quantum-1.jpg", "Khula Med ambulance, side view"], ["khula-med-quantum-2.jpg", "Khula Med ambulance, front three-quarter"], ["khula-med-polo.jpg", "Khula Med VW Polo response car"]] },
  { no: "Shopfront sign", client: "Stop & Buy Supermarket", text: "Fascia sign made for the store front and installed above the entrance by our team.",
    process: "Large format", by: "Installed by Eminence",
    photos: [["stop-and-buy-install-1.jpg", "Eminence team installing the Stop & Buy sign"], ["stop-and-buy-finished.jpg", "Finished Stop & Buy Supermarket shopfront"]] },
  { no: "Embroidery", client: "Ant Ranch", text: "Embroidered caps and branded T-shirts.",
    process: "Embroidery", by: "Stitched in-house",
    photos: [["ant-ranch-cap-embroidery.jpg", "Ant Ranch cap on the embroidery machine"], ["ant-ranch-cap.jpg", "Embroidered Ant Ranch cap"], ["ant-ranch-tee.jpg", "Ant Ranch branded T-shirt"]] },
  { no: "Rooftop sign", client: "Pbtoz", text: "Rooftop sign, made and installed.",
    process: "Signage", by: "Installed by Eminence",
    photos: [["pbtoz-rooftop-sign.jpg", "Pbtoz rooftop sign being installed"]] },
];

/* Facts the site deliberately does NOT state until Eminence confirms them. */
export const CLIENT_TO_CONFIRM = [
  "Street address (only 'Empangeni' is published anywhere).",
  "Trading hours.",
  "Year founded — their own 2023 post says '15 years and counting', so the site says 'over 15 years'.",
  "Whether they offer DTF and cut vinyl on garments (the Studio assumes yes).",
  "Every price in site/studio/js/pricing.js.",
  "Delivery area and minimum order quantities.",
  "Permission from Khula Med, Stop & Buy, Ant Ranch and Pbtoz to show their jobs (the photos are already public on Eminence's Facebook page).",
];
