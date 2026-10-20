/* Builds the static website into ../site.
 *
 *   node build/build.mjs
 *
 * No framework and no dependencies. The old site shipped 454 KB of React to
 * render one page whose only interaction was a form that didn't send; these
 * pages are plain HTML that a WhatsApp link preview, a search engine and a
 * slow phone can all read without running anything.
 *
 * Writes: index.html, services/<slug>/index.html, 404.html, sitemap.xml,
 * robots.txt, and copies the real job photos into assets/work/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUSINESS as B, SERVICES, JOBS } from "./content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const out = (rel, html) => { const p = path.join(SITE, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const wa = (text) => `https://wa.me/${B.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;

const ICON = {
  wa: `<svg class="i" viewBox="0 0 24 24"><path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5 5 16.1a8.4 8.4 0 1 1 15.5-4.5Z"/><path d="M9 8.7c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1 1.5 1.8 2.5 2.3.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.4 0 .6-.2 1.2-.7 1.6-.6.4-1.4.6-2.2.3a9.4 9.4 0 0 1-5.5-5.1c-.4-.9-.3-1.9.2-2.5Z"/></svg>`,
  arrow: `<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  menu: `<svg class="i" viewBox="0 0 24 24" width="26" height="26"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
};

const colourBar = `<div class="colour-bar" aria-hidden="true">${"<i></i>".repeat(16)}</div>`;
const logo = (tag = "a") => `<${tag} class="logo"${tag === "a" ? ' href="/" aria-label="Eminence Printing — home"' : ""}>
  <span class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  <span><b>Eminence</b><small>Printing &amp; branding</small></span></${tag}>`;

function head({ title, description, url, og = "og-home.png", jsonld }) {
  return `<!doctype html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${B.site}${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Eminence Printing">
<meta property="og:locale" content="en_ZA">
<meta property="og:url" content="${B.site}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${B.site}/assets/og/${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14161A">
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400..900;1,62..125,400..900&family=JetBrains+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/site.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

function header(current) {
  const link = (href, label) => `<a href="${href}"${current === href ? ' aria-current="page"' : ""}>${label}</a>`;
  return `
<header class="site-head">
  <div class="wrap">
    ${logo()}
    <nav class="nav" id="nav" aria-label="Main">
      ${link("/#services", "Services")}${link("/#work", "Our work")}${link("/studio/", "Design Studio")}${link("/#artwork", "Artwork guide")}${link("/#contact", "Contact")}
    </nav>
    <a class="btn btn-ink btn-sm" href="${wa()}" target="_blank" rel="noopener">${ICON.wa} WhatsApp us</a>
    <button class="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="nav">${ICON.menu}</button>
  </div>
</header>`;
}

function footer() {
  return `
<footer class="site-foot">
  <div class="wrap">
    <div>
      ${logo()}
      <p style="margin:18px 0 0;max-width:34ch">${esc(B.motto.join(" "))}</p>
    </div>
    <div>
      <h4>Services</h4>
      <ul>${SERVICES.map((s) => `<li><a href="/services/${s.slug}/">${esc(s.short)}</a></li>`).join("")}</ul>
    </div>
    <div>
      <h4>Design</h4>
      <ul><li><a href="/studio/">Design Studio</a></li><li><a href="/#artwork">Artwork guide</a></li><li><a href="/#how">How ordering works</a></li></ul>
    </div>
    <div>
      <h4>Contact</h4>
      <ul>
        <li><a href="${wa()}" target="_blank" rel="noopener">WhatsApp ${B.phone}</a></li>
        <li><a href="tel:${B.phoneIntl}">Call ${B.phone}</a></li>
        <li><a href="mailto:${B.email}">${B.email}</a></li>
        <li>${B.town}, ${B.region}</li>
        <li><a href="${B.facebook}" target="_blank" rel="noopener">Facebook</a></li>
      </ul>
    </div>
    <div class="legal">
      <span>© ${new Date().getFullYear()} Eminence Printing</span>
      <span>Design Studio prices are estimates until we confirm them in writing.</span>
    </div>
  </div>
</footer>
<script type="module" src="/assets/js/site.js"></script>
</body>
</html>`;
}

const LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${B.site}/#business`,
  name: B.name,
  description: "Screen printing, embroidery, signage, vehicle branding, large-format and digital printing.",
  url: `${B.site}/`,
  telephone: B.phoneIntl,
  email: B.email,
  image: `${B.site}/assets/og/og-home.png`,
  logo: `${B.site}/assets/brand/logo-mark-512.png`,
  address: { "@type": "PostalAddress", addressLocality: B.town, addressRegion: B.region, addressCountry: "ZA" },
  sameAs: [B.facebook],
};

/* ─────────────────────────── home ─────────────────────────── */
function home() {
  const services = SERVICES.map((s, i) => `
      <div class="spec-row">
        <span class="no">${String(i + 1).padStart(2, "0")}</span>
        <div><h3><a href="/services/${s.slug}/" style="color:inherit;text-decoration:none">${esc(s.short)}</a></h3></div>
        <div><p>${esc(s.lede)}</p><div class="tags">${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>
        <a class="link-arrow go" href="/studio/?product=${s.studio.product}">${esc(s.studio.label)} ${ICON.arrow}</a>
      </div>`).join("");

  const jobs = JOBS.map((j) => `
      <article class="ticket">
        <div class="ph">${j.photos.map(([f, alt]) => `<img src="/assets/work/${f}" alt="${esc(alt)}" loading="lazy" width="160" height="160">`).join("")}</div>
        <div class="body">
          <div class="jobno">JOB · ${esc(j.no.toUpperCase())}</div>
          <h3 class="h3" style="margin-top:8px">${esc(j.client)}</h3>
          <p style="margin:8px 0 0;color:var(--muted)">${esc(j.text)}</p>
          <dl><dt>Process</dt><dd>${esc(j.process)}</dd><dt>Done</dt><dd>${esc(j.by)}</dd></dl>
        </div>
      </article>`).join("");

  return head({
    title: "Eminence Printing — printing, embroidery, signage & vehicle branding in Empangeni",
    description: "Screen printing, embroidery, signage, vehicle livery and banners from Empangeni, KZN. Design your own in the Studio and see it before we print it. WhatsApp 078 935 6433.",
    url: "/", jsonld: LOCAL_BUSINESS,
  }) + header("/") + `
<main id="main">
  <section class="hero" style="padding-top:clamp(40px,7vw,96px)">
    <div class="wrap">
      <div>
        <p class="kicker"><span>${B.town} · ${B.region}</span><span>Over 15 years in print</span></p>
        <h1 class="display">You name it,<br>we print it<span class="dot-m">.</span><em>You like it, we print it again.</em></h1>
        <p class="lede">Screen printing, embroidery, signage, vehicle livery and display — made in our shop in ${B.town}. Design it yourself and see exactly what you're getting, or send us your logo on WhatsApp and we'll take it from there.</p>
        <div class="ctas">
          <a class="btn btn-primary" href="/studio/">Open the Design Studio ${ICON.arrow}</a>
          <a class="btn btn-ghost" href="${wa("Hi Eminence, I'd like a quote for ")}" target="_blank" rel="noopener">${ICON.wa} WhatsApp ${B.phone}</a>
        </div>
      </div>
      <figure class="proof" style="margin:0">
        <span class="cm" aria-hidden="true"></span>
        <div class="proof-stage" id="heroProof" role="img" aria-label="Preview of a golf shirt with a logo on the left chest"></div>
        <figcaption class="proof-bar">
          <span class="kicker">Live preview · golf shirt · left chest 95 × 80 mm</span>
          <span class="swatches" id="heroSwatches" aria-label="Shirt colour"></span>
        </figcaption>
      </figure>
    </div>
  </section>
  ${colourBar}

  <section id="services">
    <div class="wrap">
      <div class="sec-head">
        <h2 class="h2">What we print</h2>
        <p>Our own list: screen printing, embroidery, digital and litho printing, signage, dye sublimation, laser cutting and installation. Every line below can be designed and priced in the Studio.</p>
      </div>
      <div class="spec">${services}</div>
    </div>
  </section>

  <section id="work" style="background:var(--sunk)">
    <div class="wrap">
      <div class="sec-head">
        <h2 class="h2">Recent jobs</h2>
        <p>Real work, from our Facebook page — not stock photos. More on <a href="${B.facebook}" target="_blank" rel="noopener">facebook.com/eminenceprinting</a>.</p>
      </div>
      <div class="jobs">${jobs}</div>
    </div>
  </section>

  <section class="band" id="studio">
    <div class="wrap">
      <div>
        <h2 class="h2">See it before we print it.</h2>
        <p class="lede" style="margin-top:18px">The Design Studio puts your logo on the actual product at its real size — so the shirt, the banner or the van you approve is the one we print.</p>
        <ul>
          <li><div><b>True-size print areas</b><span>Designed in millimetres, with the bleed and safe lines our printers work to.</span></div></li>
          <li><div><b>Artwork checked as you go</b><span>A blurry logo, a white box behind it, a colour that vanishes on the fabric — flagged before you order, not after.</span></div></li>
          <li><div><b>An estimate straight away</b><span>Worked out the way print is priced: per print position, per ink colour, with volume breaks.</span></div></li>
          <li><div><b>Sent on WhatsApp</b><span>Your proof, your original files and the full spec reach us in one message.</span></div></li>
        </ul>
        <a class="btn btn-primary" href="/studio/">Open the Design Studio ${ICON.arrow}</a>
      </div>
      <a class="shot" href="/studio/" aria-label="Open the Design Studio">
        <img src="/assets/img/studio-screenshot.png" alt="The Eminence Design Studio: a logo being placed on a T-shirt, with the live mockup, artwork checks and price" width="1440" height="900" loading="lazy">
      </a>
    </div>
  </section>

  <section id="how">
    <div class="wrap">
      <div class="sec-head"><h2 class="h2">How ordering works</h2><p>The same whether you start in the Studio or on WhatsApp.</p></div>
      <div class="steps">
        <div class="step"><h3>Send us the idea</h3><p>Design it in the Studio, or WhatsApp your logo and tell us what you need.</p></div>
        <div class="step"><h3>We confirm price &amp; proof</h3><p>We check your artwork and reply with a confirmed price and a production proof.</p></div>
        <div class="step"><h3>We print</h3><p>Screen, embroidery, sublimation, digital or large format — whatever suits the job.</p></div>
        <div class="step"><h3>Collect, or we install</h3><p>Collect from us in ${B.town}. Signs and vehicles are fitted by our team.</p></div>
      </div>
    </div>
  </section>

  <section id="artwork" style="padding-top:0">
    <div class="wrap">
      <div class="sec-head"><h2 class="h2">What artwork to send</h2><p>The single biggest cause of a disappointing print is a small file stretched big. This is what each kind of job needs.</p></div>
      <table class="guide">
        <thead><tr><th>Printing on</th><th>Best</th><th>If it's a photo or PNG</th></tr></thead>
        <tbody>
          <tr><td>Clothing, caps, mugs</td><td>Vector — AI, PDF, SVG or EPS</td><td><span class="mono">300 dpi</span> at print size — about 3,300 px wide for a 280 mm chest print</td></tr>
          <tr><td>Business cards, flyers</td><td>PDF with 3 mm bleed, text 4 mm inside the edge</td><td><span class="mono">300 dpi</span></td></tr>
          <tr><td>Posters</td><td>PDF</td><td><span class="mono">150 dpi</span> at full size</td></tr>
          <tr><td>Pull-up banners</td><td>PDF at full size</td><td><span class="mono">120 dpi</span> at full size</td></tr>
          <tr><td>Banners, gazebos, signs, vehicles</td><td>Vector</td><td><span class="mono">72–100 dpi</span> at full size</td></tr>
        </tbody>
      </table>
      <p class="callout">Only have a screenshot or a picture of your logo on WhatsApp? Send it anyway. We'll tell you honestly whether it will print well — and what we need if it won't.</p>
    </div>
  </section>

  <section class="contact" id="contact">
    <div class="wrap">
      <div>
        <h2 class="h2">Talk to us</h2>
        <p class="lede" style="margin-top:14px">WhatsApp is the quickest way to reach us. Send a photo, a logo, or just what you need.</p>
        <a class="wa-big" href="${wa("Hi Eminence, I'd like a quote for ")}" target="_blank" rel="noopener">${ICON.wa}<div><b>${B.phone}</b><span>WhatsApp or call</span></div></a>
        <dl class="facts">
          <dt>Email</dt><dd><a href="mailto:${B.email}">${B.email}</a></dd>
          <dt>Where</dt><dd>${B.town}, ${B.region}</dd>
          <dt>Facebook</dt><dd><a href="${B.facebook}" target="_blank" rel="noopener">facebook.com/eminenceprinting</a></dd>
        </dl>
      </div>
      <form class="enquiry" id="enquiry" novalidate>
        <div class="row2">
          <label>Your name <input name="name" autocomplete="name" required></label>
          <label>WhatsApp or phone <input name="phone" type="tel" autocomplete="tel" inputmode="tel" required></label>
        </div>
        <div class="row2">
          <label>Email <span class="opt">optional</span><input name="email" type="email" autocomplete="email"></label>
          <label>What for?
            <select name="topic">${SERVICES.map((s) => `<option>${esc(s.short)}</option>`).join("")}<option>Something else</option></select>
          </label>
        </div>
        <label>What do you need? <textarea name="message" rows="5" required placeholder="e.g. 40 navy golf shirts with our logo on the left chest, needed by the 15th"></textarea></label>
        <input class="hp" name="company_site" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="form-status" id="formStatus" role="status" hidden></p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary" type="submit">Send enquiry</button>
          <p class="form-note">Goes straight to our inbox. If that fails, WhatsApp opens with your message ready to send — nothing gets lost.</p>
        </div>
      </form>
    </div>
  </section>
</main>` + footer();
}

/* ─────────────────────────── service pages ─────────────────────────── */
function service(s) {
  const url = `/services/${s.slug}/`;
  const ld = [LOCAL_BUSINESS, {
    "@context": "https://schema.org", "@type": "Service", name: s.title, serviceType: s.short,
    provider: { "@id": `${B.site}/#business` }, areaServed: { "@type": "City", name: B.town }, url: `${B.site}${url}`,
  }, {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${B.site}/` },
      { "@type": "ListItem", position: 2, name: s.short, item: `${B.site}${url}` }],
  }];
  const job = JOBS.find((j) => s.lede.includes(j.client));
  return head({ title: `${s.title} — Eminence Printing`, description: s.lede, url, jsonld: ld }) + header(url) + `
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      <p class="crumbs"><a href="/">Home</a> / <a href="/#services">Services</a> / ${esc(s.short)}</p>
      <h1 class="h2" style="max-width:20ch">${esc(s.title)}</h1>
      <p class="lede" style="margin-top:18px">${esc(s.lede)}</p>
      <div class="tags" style="margin-top:18px">${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    </div>
  </section>
  ${colourBar}
  <section style="padding-top:clamp(32px,5vw,64px)">
    <div class="wrap cols">
      <div class="prose">
        ${s.body.map(([h, items]) => `<h2>${esc(h)}</h2>${items.length > 1 ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : `<p>${items[0]}</p>`}`).join("")}
        ${job ? `<h2>From our work</h2><article class="ticket" style="margin-top:16px">
          <div class="ph">${job.photos.map(([f, alt]) => `<img src="/assets/work/${f}" alt="${esc(alt)}" loading="lazy" width="160" height="160">`).join("")}</div>
          <div class="body"><div class="jobno">JOB · ${esc(job.no.toUpperCase())}</div><h3 class="h3" style="margin-top:8px">${esc(job.client)}</h3><p style="margin:8px 0 0;color:var(--muted)">${esc(job.text)}</p></div></article>` : ""}
      </div>
      <aside class="aside">
        <h3>Start here</h3>
        <p>Put your design on it and get an estimate in the Studio — or just message us.</p>
        <a class="btn btn-primary" href="/studio/?product=${s.studio.product}">${esc(s.studio.label)}</a>
        <a class="btn btn-ghost" href="${wa(`Hi Eminence, I'd like a quote for ${s.short.toLowerCase()}: `)}" target="_blank" rel="noopener">${ICON.wa} WhatsApp ${B.phone}</a>
      </aside>
    </div>
  </section>
</main>` + footer();
}

function notFound() {
  return head({ title: "Page not found — Eminence Printing", description: "That page doesn't exist.", url: "/404" }) + header("") + `
<main id="main"><section class="page-hero"><div class="wrap">
  <p class="kicker">404 · misprint</p>
  <h1 class="display" style="margin-top:18px">That page didn't print<span class="dot-m">.</span></h1>
  <p class="lede" style="margin:22px 0 28px">The link may be old. Everything we do is on the home page — or ask us on WhatsApp.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-primary" href="/">Home</a><a class="btn btn-ghost" href="/studio/">Design Studio</a></div>
</div></section></main>` + footer();
}

/* ─────────────────────────── write ─────────────────────────── */
out("index.html", home());
for (const s of SERVICES) out(`services/${s.slug}/index.html`, service(s));
out("404.html", notFound());

const urls = ["/", "/studio/", ...SERVICES.map((s) => `/services/${s.slug}/`)];
const today = new Date().toISOString().slice(0, 10);
out("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${B.site}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);
out("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${B.site}/sitemap.xml\n`);

// Real job photos → assets/work (the originals from Eminence replace these; see ASSETS.md).
const src = path.join(ROOT, "research", "facebook");
fs.mkdirSync(path.join(SITE, "assets", "work"), { recursive: true });
for (const j of JOBS) for (const [f] of j.photos) {
  const dest = path.join(SITE, "assets", "work", f);
  const from = path.join(src, f);
  if (fs.existsSync(from) && !fs.existsSync(dest)) fs.copyFileSync(from, dest);
}
console.log(`built ${urls.length} pages + 404, sitemap, robots`);
