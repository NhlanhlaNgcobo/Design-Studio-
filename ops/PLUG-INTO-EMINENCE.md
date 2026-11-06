# Putting the Studio on Eminence's website

Eminence's current site (eminenceprinting.co.za) is a single-page React app
built from a Lovable template, hosted on Vercel, with the domain's DNS at
GoDaddy (`audit/AUDIT.md`). There are three ways to give it the Studio. All
three use the same deployment of this repository; they differ only in what
changes on Eminence's side.

| | What changes on Eminence's side | Who can do it | Best when |
|---|---|---|---|
| **A. Replace the site** | The domain points at this repo's rebuilt site; the Studio is at `/studio/` | Whoever controls GoDaddy DNS | Recommended: the current site loses every written enquiry |
| **B. Link to a Studio subdomain** | One DNS record, plus a "Design online" button on the current site | GoDaddy DNS + anyone who can edit the site | Keeping the current site for now |
| **C. Embed in a page** | A new page on the current site with five lines of code | Someone with access to the site's code (the Lovable project) | Keeping the current site, Studio inside it |

In every option the Studio takes orders itself: WhatsApp to 078 935 6433,
email with print-ready files to eminenceprinting@gmail.com.

## First, for any option: deploy this repository

Follow `ops/DEPLOY.md` (Vercel project with root `site`, Cloudflare R2, Resend,
environment variables). You end up with a working URL such as
`https://eminence-studio.vercel.app`, where `/studio/` is the Studio.

## A. Replace the site (recommended)

The rebuild in `site/` is the whole website (home page, six service pages,
contact form that sends) with the Studio built in.

1. Vercel → the new project → **Settings → Domains** → add
   `www.eminenceprinting.co.za` and `eminenceprinting.co.za`.
2. GoDaddy → DNS: change the records Vercel shows (usually `A @ 76.76.21.21`
   and `CNAME www cname.vercel-dns.com`).
3. Remove the domain from the old Vercel project.

The Studio is then at `https://www.eminenceprinting.co.za/studio/`, already
linked from every page of the rebuilt site.

## B. Keep the current site, link to `studio.eminenceprinting.co.za`

1. Vercel → the new project → **Settings → Domains** → add
   `studio.eminenceprinting.co.za`.
2. GoDaddy → DNS → add `CNAME studio cname.vercel-dns.com`.
3. On the current site, add a button or menu item linking to
   `https://studio.eminenceprinting.co.za/studio/`
   (or straight to a product: `…/studio/?product=tee`, `?product=cards`,
   `?product=gazebo`).

The subdomain is already mapped to Eminence in `site/studio/tenants/index.json`,
so it opens as Eminence's Studio.

## C. Keep the current site, embed the Studio in a page

Do step B.1–2 first (the Studio needs its own address to load from). Then, on
the current site, add a page — say `/design` — containing:

**Plain HTML** (any site builder that allows a code block):

```html
<div id="eminence-studio"></div>
<script type="module">
  import { mountStudio } from "https://studio.eminenceprinting.co.za/studio/embed.js";
  mountStudio("#eminence-studio", { tenant: "eminence", product: "tee" });
</script>
```

**React** (the current Lovable/Vite site — a new route component):

```jsx
import { useEffect, useRef } from "react";

export default function Design() {
  const box = useRef(null);
  useEffect(() => {
    let studio;
    import(/* @vite-ignore */ "https://studio.eminenceprinting.co.za/studio/embed.js")
      .then(({ mountStudio }) => { studio = mountStudio(box.current, { tenant: "eminence", product: "tee" }); });
    return () => studio?.destroy();
  }, []);
  return <div ref={box} />;
}
```

Options: `product` (start on a product), `height` (pixels, default 900),
`onSent(ref)` (runs when an order is sent — e.g. to show a thank-you message).
The Studio hides its own logo bar inside the page, because the site's header is
already there, and keeps its WhatsApp button and order flow.

**Already set up in this repo for C:** the Studio may be framed by
`eminenceprinting.co.za` and its subdomains (`frame-ancestors` in
`site/vercel.json`), and `embed.js` can be loaded from another site (CORS).
To embed on another domain, add it to that `frame-ancestors` list.

Try it locally: `MOCK=1 node build/dev-server.mjs`, then open
<http://127.0.0.1:8125/studio/embed-order-demo.html> — a stand-in for a shop's
own website with the Studio on one of its pages.

## Which one?

Option A, because the current site still discards every contact-form message and
shows AI-generated "portfolio" work (`audit/AUDIT.md`). If Eminence wants to
keep its current site for now, B is a one-hour job and C a half-day one, and
either can be switched to A later without changing the Studio.
