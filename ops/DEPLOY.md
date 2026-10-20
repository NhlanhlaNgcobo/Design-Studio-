# Going live

The site is static HTML plus two Vercel functions. It runs on the Vercel account the
current site already uses, so nothing about hosting changes.

## 1. Vercel project

| Setting | Value |
|---|---|
| Root Directory | `site` |
| Framework preset | Other |
| Build command | *(none)* — pages are pre-built by `node build/build.mjs` and committed |
| Output directory | `.` |
| Node.js | 20 or later |

Domains: keep `www.eminenceprinting.co.za` as primary, with the apex redirecting to it
as it does today.

## 2. Email — fix this first

The domain **has no MX record**, so `hello@eminenceprinting.co.za` cannot receive
anything. Choose one:

- **Simplest:** stop using it. The new site uses `eminenceprinting@gmail.com`
  everywhere, the address on their Facebook page.
- **Better:** set up mailboxes on the domain (Google Workspace or Zoho Mail, at
  GoDaddy DNS, `ns67/68.domaincontrol.com`), and add their MX, SPF and DKIM records.
  Then set `MAIL_TO` below to the new address.

## 3. Sending email from the site — Resend

1. Create a Resend account and add the domain `eminenceprinting.co.za`. Add the DNS
   records it gives you at GoDaddy (SPF/DKIM, and MX on a `send.` subdomain — this
   does **not** affect receiving mail).
2. Create an API key.

Until the domain is verified, `MAIL_FROM=Eminence website <onboarding@resend.dev>`
works for testing (Resend only delivers it to the account owner's address).

## 4. File storage for Studio orders — Cloudflare R2 (or any S3)

R2 suits this: no egress fees, so downloading large artwork is free.

1. Create a bucket, e.g. `eminence-jobs`. Leave it **private**.
2. Create an R2 API token with *Object Read & Write* on that bucket only.
3. Add this CORS policy to the bucket, so browsers can upload directly:

```json
[
  {
    "AllowedOrigins": ["https://www.eminenceprinting.co.za"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Add a lifecycle rule that deletes objects under `jobs/` after **90 days**.
   Customer artwork is someone else's brand asset; don't keep it forever.

AWS S3 or Backblaze B2 work the same way; set `S3_ENDPOINT` and `S3_REGION` to
match.

## 5. Environment variables (Vercel → Settings → Environment Variables)

| Name | Example | Needed for |
|---|---|---|
| `RESEND_API_KEY` | `re_…` | contact form + Studio orders |
| `MAIL_FROM` | `Eminence website <web@eminenceprinting.co.za>` | both |
| `MAIL_TO` | `eminenceprinting@gmail.com` | both (comma-separate several) |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | Studio orders |
| `S3_REGION` | `auto` (R2) / `af-south-1` (AWS Cape Town) | Studio orders |
| `S3_BUCKET` | `eminence-jobs` | Studio orders |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from step 4 | Studio orders |
| `JOB_SECRET` | 32+ random characters (`openssl rand -base64 32`) | signs upload sessions |

**Nothing breaks if these are missing.** The endpoints return 503. The contact form
then offers WhatsApp with the message already typed, and the Studio saves the proof
and spec to the customer's device and opens WhatsApp. Configuring them makes the
handoff smoother; it doesn't gate launching.

## 6. Before switching DNS

- [ ] `cd build && npm install && npm test` — the SigV4 signer matches AWS's
      published test vector; tokens and file sniffing pass.
- [ ] `MOCK=1 node build/dev-server.mjs`, then place an order in the Studio and send
      the contact form. Both emails appear in `build/.outbox/`.
- [ ] On the Vercel preview URL, with real env vars: send one Studio order with a
      10 MB+ PDF. Confirm the email arrives and every link downloads.
- [ ] Share the preview URL on WhatsApp. The link preview shows the OG card.
- [ ] Submit `https://www.eminenceprinting.co.za/sitemap.xml` in Google Search Console.
- [ ] Replace the placeholder prices in `site/studio/js/pricing.js` with Eminence's,
      and set `PRICES_CONFIRMED = true`. Until then every price says **Estimate**.

## Known limits

- The rate limit is per serverless instance — enough to stop casual abuse, not a
  determined attacker. For a hard limit, back `limited()` in
  `site/api/_lib/guard.js` with Upstash Redis.
- Presigned uploads sign the host only, so storage can't cap the upload size. The
  `complete` step therefore checks each object's real size and type, deletes
  anything wrong, and the 15-minute URL expiry bounds the window. A presigned *POST*
  policy with `content-length-range` would enforce the size at storage; it was
  more complexity than this volume needs.
