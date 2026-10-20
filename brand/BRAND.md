# Eminence Printing — brand system

## Where it comes from

There are two Eminence identities, and only one of them is real.

| | The current website | Their actual logo |
|---|---|---|
| Source | AI site template (Lovable/shadcn) | Facebook profile picture — `research/facebook/logo-original-fb-720.jpg` |
| Colour | Teal `#00B5B8` + amber stars | **Process colour**: cyan, magenta, yellow, black ink droplets |
| Type | Playfair Display + Inter | Bold italic outlined script |
| Mark | "Eminence." with a teal full stop | **EP** monogram, E cyan, P magenta |

The website's teal, Playfair-and-Inter pairing and "Eminence." wordmark appear
nowhere else in Eminence's own material. They arrived with the site build. The logo
Eminence chose for itself is about **ink**, which for a print shop is the right idea.

So the system below takes the logo's idea and makes it work on screens: the four
process inks, used the way a printer uses them.

## Colour

Measured on the website's uncoated-paper background `#FAF8F4`.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--ink` | `#14161A` | Text, dark bands, the key colour | 17.1 on paper |
| `--paper` | `#FAF8F4` | Page — warm, like uncoated stock | — |
| `--muted` | `#5B5F66` | Secondary text | 6.05 on paper ✅ |
| `--cyan` | `#00A0E3` | **Fills only** — dots, bars | ink on cyan 6.16 ✅ |
| `--cyan-ink` | `#0072A8` | Links, small cyan text | 4.98 on paper ✅ |
| `--magenta` | `#E5007E` | Fills, accents, the full stop | white on it 4.53 (large only) |
| `--magenta-ink` | `#C4006B` | **Primary buttons** | white on it **5.90** ✅ |
| `--yellow` | `#FFE500` | Fills, always under ink | ink on yellow 14.2 ✅ |

**Never:** cyan text on paper (3.25), white on yellow, yellow text on paper.

Compare the old site: white on its teal CTA was **2.53:1**, and its "Call Us Today"
button was **1.09:1**, effectively invisible. See `../audit/AUDIT.md`.

## Type

| Face | Use |
|---|---|
| **Archivo** (variable, width 62–125) | Everything. Headlines at width 112–120 and weight 850–900 read like signwriting; body at normal width. |
| **JetBrains Mono** | Specs, labels, sizes, job numbers — the language of a job ticket. |

One family with a width axis carries display and body without a second typeface.
The italic carries the motto, which echoes the logo's italic script.

## Logo — interim and final

**Interim (in use now):** four dots in a 2×2 grid — cyan, magenta, yellow, key —
next to *Eminence* in Archivo Black-weight. They are the logo's four droplets,
reduced to what still reads at 16 px. It is deliberately modest: it is a
placeholder for the real thing.

**Final:** a faithful vector redraw of the EP logo — specified in `../ASSETS.md`
§2. It is a redraw, not a redesign. The phone number comes out of the logo; the gloss
and bevels come off; the colours snap to the four tokens above.

## The print-shop motifs

These replace the template furniture the old site was built from — centred
eyebrow labels, icons in tinted squares, glows, fade-ins.

| Motif | Where | Why |
|---|---|---|
| **Colour-control strip** — C M Y K at 100/60/35/15% | Divider under the hero and page heads | It is on the edge of every press sheet |
| **Crop marks** | Around the live preview in the hero | Marks the thing as a proof |
| **Job ticket** — photo strip, perforation, docket fields | Real work | It is how a job is recorded in a shop |
| **Spec list** — numbered rows, rules, mono tags | Services | A price-list/spec-sheet register instead of a card grid |
| **Mono labels in millimetres** | Studio, guide table | Print is measured; say the number |

## Voice

Plain and specific, the way someone in the shop talks.

- **Say the real thing.** *"The bottom 100 mm rolls into the base, so keep text out
  of it"* — not *"premium quality that speaks for itself"*.
- **Keep their own words.** The motto, *"You name it, we print it. You like it, we
  print it again"*, is the only human line on the old site and leads the new one.
- **No claim without a source.** No star ratings, client counts or turnaround promises
  until Eminence supplies them. Write around a missing fact rather than inventing one.
- **Explain the why** when a rule could frustrate: *why* sublimation won't go on a
  black shirt, *why* a white box shows up.

## Don'ts

- AI-generated "portfolio" images, or any generated image of the shop, staff or
  customers.
- Testimonials without a source.
- Centred kicker + H2 + grey paragraph, repeated for every section.
- Teal. It was never theirs.
