# Eminence Printing — site audit

Measured 20 October 2026 against the live site, headless Chromium (Playwright),
desktop 1440px and mobile 390px. Performance runs at **4× CPU throttle**, the same
method used for DesignCo, so the two audits are comparable.

## What the site is

A single-page **React + Vite** app on **Vercel**, built with a Lovable/shadcn-style
template: Tailwind, Radix toasts, `framer-motion` fade-ins on 19 elements, lucide
icons. The served HTML is an empty `<div id="root">` — every word on the page is put
there by JavaScript.

The domain's DNS is at GoDaddy (`ns67/68.domaincontrol.com`); the apex
`eminenceprinting.co.za` 307-redirects to `www.`.

## The headline: the site cannot receive a written enquiry

Two separate faults, and together they mean **only the phone number works**.

### 1. The contact form throws every message away

From the production bundle (`assets/index-Dly71Zbc.js`), the form's submit handler
in full:

```js
u = async h => {
  h.preventDefault(), a(!0),
  await new Promise(m => setTimeout(m, 1e3)),          // wait one second
  e({ title: "Message Sent!",
      description: "We'll get back to you as soon as possible." }),
  i({ name: "", email: "", message: "" }),             // clear the form
  a(!1)
}
```

There is no `fetch`, no form service, no email. It waits a second, tells the customer
**"Message Sent!"**, and empties the fields. The customer believes they have asked
for a quote; Eminence never sees it. Nobody follows up, and the customer concludes
Eminence ignored them.

### 2. The advertised email address cannot receive mail

`hello@eminenceprinting.co.za` is printed three times on the page. The domain has
**no MX record**:

```
dns.google/resolve?name=eminenceprinting.co.za&type=MX
→ Authority: SOA ns67.domaincontrol.com … (no Answer section)
```

With no MX, mail falls back to the A record, which is Vercel — and Vercel does not
accept mail. Anything sent to that address bounces or vanishes.

**Fix order:** set up a mailbox on the domain (or remove the address), and wire the
form to something real. The rebuilt site in `../site/` sends the form through a
serverless function *and* offers WhatsApp as the primary path, because WhatsApp is
the one channel already proven to work.

## Credibility: the page is mostly invented

This is what reads as "AI slop" — not the colours or the fonts, but that the content
is generic and much of it is not true.

| Section | What it shows | Problem |
|---|---|---|
| **Visual Showcase** — *"our portfolio of completed projects"* | 6 images | All six are **AI-generated**. The text in them is gibberish: the van says *"LATG WAiR"*, the shirts say *"I EUP NEW BABALS PRITTING"* and *"Barbies"*, the cards say *"Hollie Sault … WILLERBALE YOURS"*. Presented as completed client work. See `portfolio-ai-images.png`. |
| **Hero image** | A print hall with teal walls | AI-generated; the walls are the template's own accent colour. |
| **Testimonials** | 6 five-star reviews | Initials-in-a-circle avatars, stock SA names, companies that can't be found (*"Afrique Brands"*, *"Ubuntu Tech"*). No source, no link to a review platform. If they are not real, they are a liability under the Consumer Protection Act, not a selling point. |
| **Stats** | *12+ years · 1200+ projects · 72hr turnaround* | Unsourced. *"Join over 1,200 businesses"* contradicts *"1200+ projects"*. |
| **JSON-LD** | `LocalBusiness` | Address **"123 Print Avenue, Johannesburg"**, phone **"+27123456789"**, `priceRange "$$"`. All template placeholders — and it tells Google the business is in the wrong province. |
| **Meta keywords** | *"banner printing Johannesburg"* | They are in **Empangeni, KZN**. |
| **Footer WhatsApp icon** | `wa.me/27821234567` | **A placeholder number.** The contact block uses the real one (`27789356433`). One of the two WhatsApp buttons goes to a stranger. |
| **Instagram / Facebook icons** | `href="#"` | Lead nowhere. |

A print shop sells "we will make your brand look right". A portfolio of machine
images with misspelled fake logos on them argues the opposite — any customer who
looks closely at the van sees it immediately.

## Accessibility — the main button fails

| Pair | Ratio | AA (4.5) | AA large (3.0) |
|---|---|---|---|
| **White on teal `#00B5B8`** — every *Get a Quote / Request a Quote / Send Message* | **2.53** | ❌ | ❌ |
| Teal eyebrow text on `#F6F5F4` | 2.32 | ❌ | ❌ |
| **"Call Us Today": white on `#F6F5F4`** | **1.09** | ❌ | ❌ — effectively invisible |
| Muted body `#676F7E` on `#F6F5F4` | 4.65 | ✅ (just) | ✅ |
| Ink `#1F242E` on teal | 6.15 | ✅ | ✅ |
| Ink `#1F242E` on `#F6F5F4` | 14.29 | ✅ | ✅ |

The "Call Us Today" button in the dark CTA band renders as a pale blank rectangle
(see `testimonials-and-cta.png`). The secondary path to the only working contact
channel is the least visible thing on the page.

## Performance

| | Desktop | Mobile |
|---|---|---|
| Requests | 14 | 14 |
| Transfer | **1,056 KB** | 1,056 KB |
| — images | 670 KB | 670 KB |
| — JS | 148 KB (454 KB uncompressed) | same |
| — fonts | 85 KB (Inter ×5 weights, Playfair ×4) | same |
| CLS | 0 ✅ | 0 ✅ |
| Long tasks | 128, 198, 182 ms | 206, **521**, 168 ms |

Lighter than DesignCo's 3 MB, and CLS is zero. The waste is specific:

- **`favicon.png` is 138 KB** — a 559×350 RGBA image used as a 16px tab icon.
- 454 KB of JavaScript to render a brochure page that has no interactivity beyond a
  menu and a form that doesn't send.
- Zero WebP/AVIF. The 1920×1080 hero is shown at 652×367.
- Two Google font families in nine weights.

## Search and sharing

| | |
|---|---|
| `og:image` → `/social-preview.png` | **404.** Every link shared on WhatsApp or Facebook previews with no image. |
| `sitemap.xml` | 404 |
| `canonical` | `https://eminenceprinting.co.za` — a URL that 307-redirects. Canonical should be the final URL. |
| Pages | **One.** Every service is a card on the homepage, so there is no page that can rank for *"t-shirt printing Empangeni"* or *"banners Richards Bay"*. |
| Server HTML | Empty `#root`. Google renders JS; WhatsApp, Facebook and most link-preview bots do not. |
| H1 | *"Eminence Printing"* — the business name, not what it does or where. |

## Mobile

Works, with two layout issues visible in `mobile-15-screens.png`: the hamburger sits
against the right edge, and the "12+ Years" badge hangs off the left edge of the
hero. The page is **15 phone-screens long** (12,485 px) — four of those are
testimonials.

## Copy

Every line could belong to any print shop on earth:

> *"Quality that speaks for itself. Your brand deserves more than average. We deliver
> extraordinary."*
> *"At Eminence Printing, we believe every print tells a story."*

What's missing is everything a buyer actually needs to decide: **prices or price
ranges, minimum quantities, lead times per product, what file to send, what area they
deliver to, whether they can collect.** The only specific, human line on the site is
the motto — *"You name it, we print it. You like it, we print it again."* — and that
one is worth keeping.

## Priority

| # | Fix | Effort | Why |
|---|---|---|---|
| 1 | **Make the form send, and fix the email (MX)** | Hours | Every written enquiry is currently lost |
| 2 | Remove the placeholder WhatsApp number and fake JSON-LD | Minutes | Customers and Google are being pointed at wrong details |
| 3 | Replace the AI portfolio with real photos of real jobs; remove or source the testimonials | Content | The credibility problem |
| 4 | Button contrast; "Call Us Today" visible | Minutes | Every CTA |
| 5 | OG image, sitemap, correct canonical, a page per service | Hours | Unshareable and unfindable locally |
| 6 | Real copy: prices-from, minimums, lead times, artwork guide | Content | What buyers need to decide |
| 7 | **Design Studio** — see the mockup before ordering | Project | The revenue play, same as DesignCo |

Items 1–6 are what `../site/` does. Item 7 is `../site/studio/`.
