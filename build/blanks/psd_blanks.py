"""Studio photo blanks from the purchased S.i. Graphics PSD mockups.

The Studio's photo pipeline (site/studio/js/render/photo.js) wants one photo per
view of a WHITE garment on transparency; it derives colour, folds and the print
warp from that. The PSDs hold the same information in layers, so this rebuilds
the white garment from them:

  tee     the "T-shirt" group mask (silhouette), the "Darks" layer (black, 70%)
          and "Lights" (white, 20%) over a light grey base — exactly the
          template's own stack with the colour layers switched off.
          The pack is front only: the back is the front mirrored with the neck
          scoop filled with fabric from the chest and a back neck band drawn
          along the top edge.
  hoodie  the photographed hoodie is BLACK, so its luminance is normalised into
          shading and lightly smoothed (the washed fleece mottle would
          otherwise read as dirt once it is recoloured). Front only.
  oversized and polo (golf shirt) are DERIVED from the tee photo, so every
          garment shares one photograph's light and cloth: the oversized tee
          is the tee made boxy (wider, shorter); the golf shirt is the tee with
          a collar, stand, placket and buttons built from its own fabric and
          shading. Their print positions are measured here and written into
          manifest.json.

Usage:  python -I build/blanks/psd_blanks.py <tee.psd> <hoodie.psd>
Writes: site/studio/blanks/{tee,oversized,polo}-{front,back}.png, hoodie-front.png
Needs:  pip install psd-tools numpy pillow
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from psd_tools import PSDImage

OUT = Path(__file__).resolve().parents[2] / "site/studio/blanks"
SIZE = 1500          # output square; photo.js works per pixel, so keep it modest
BASE = 210 / 255     # the light grey the shading sits on


def place(canvas_size, layer):
    """A layer's pixels on a full-canvas array (0..1), RGBA."""
    out = np.zeros((canvas_size[1], canvas_size[0], 4), np.float32)
    im = np.asarray(layer.topil().convert("RGBA")).astype(np.float32) / 255
    x0, y0 = layer.bbox[0], layer.bbox[1]
    h, w = im.shape[:2]
    out[y0:y0 + h, x0:x0 + w] = im
    return out


def save(v, alpha, name, margin=40):
    """Crop to the garment plus a margin and fit the long side to SIZE, so the
    garment fills the stage the same way whatever its frame was."""
    g = (np.clip(v, 0, 1) * 255).astype(np.uint8)
    a = (np.clip(alpha, 0, 1) * 255).astype(np.uint8)
    im = Image.fromarray(np.dstack([g, g, g, a]), "RGBA")
    x0, y0, x1, y1 = im.getchannel("A").point(lambda t: 255 if t > 8 else 0).getbbox()
    im = im.crop((x0 - margin, y0 - margin, x1 + margin, y1 + margin))
    k = SIZE / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(OUT / name, optimize=True)
    print(name, im.size)


def tee(path):
    psd = PSDImage.open(path)
    L = {l.name: l for l in psd.descendants()}
    W, H = psd.size
    m = L["T-shirt"].mask
    mask = np.zeros((H, W), np.float32)
    mi = np.asarray(m.topil()).astype(np.float32) / 255
    mask[m.bbox[1]:m.bbox[1] + mi.shape[0], m.bbox[0]:m.bbox[0] + mi.shape[1]] = mi
    darks = place(psd.size, L["Darks"])[..., 3] * (179 / 255)
    lights = place(psd.size, L["Lights"])[..., 3] * (51 / 255)
    v = BASE * (1 - darks)
    v = v * (1 - lights) + lights
    save(v, mask, "tee-front.png")

    # Back: fill the front neck scoop with fabric from lower down, then a band.
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - 995) / 262) ** 2 + ((yy - 100) / 372) ** 2)
    w = np.clip((1 - r) / 0.1, 0, 1)
    b = v * (1 - w) + np.roll(v, -470, axis=0) * w
    inside = mask > 0.5
    band = np.zeros_like(v); seam = np.zeros_like(v)
    for x in range(720, 1270):
        ys = np.nonzero(inside[:, x])[0]
        if len(ys):
            band[ys[0]:ys[0] + 24, x] = 1
            seam[ys[0] + 24:ys[0] + 27, x] = 1
    blur = lambda a, rad: np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad))) / 255
    b = b * (1 - 0.05 * blur(band, 3)) * (1 - 0.16 * blur(seam, 1))
    save(b[:, ::-1], mask[:, ::-1], "tee-back.png")


def hoodie(path):
    psd = PSDImage.open(path)
    L = {l.name: l for l in psd.descendants()}
    px = place(psd.size, L["Streetwear Hoodie"])
    lum = 0.2126 * px[..., 0] + 0.7152 * px[..., 1] + 0.0722 * px[..., 2]
    alpha = px[..., 3]
    # Frequency split: keep the broad folds (big blur) and the fine detail —
    # seams, rib, knit (photo minus a small blur) — and drop the middle band,
    # which is the acid-wash mottle of this particular hoodie.
    inside = alpha > 0.8
    l8 = np.clip(lum * 255, 0, 255)
    fill = np.where(inside, l8, np.median(l8[inside])).astype(np.uint8)   # edge must not pull folds dark
    blur = lambda r: np.asarray(Image.fromarray(fill).filter(ImageFilter.GaussianBlur(r)), np.float32)
    broad = blur(28)
    detail = fill.astype(np.float32) - blur(2.5)
    ref = np.percentile(broad[inside], 85)
    s = np.clip((broad + 0.9 * detail) / ref, 0, 1.25) ** 0.6
    save(BASE * s, alpha, "hoodie-front.png")


# ───────────────────────── derived from the tee ─────────────────────────
# Measured on tee-front/back.png: centre lines, front neckline bottom, back
# neck seam, and 863 px across the chest of an M (510 mm) → 1.692 px/mm.
TEE = {"chest_px": 863, "px_mm": 1.692, "front_cx": 742, "front_neck": 206, "back_cx": 757, "back_neck": 90}


def grey(name):
    a = np.asarray(Image.open(OUT / name)).astype(np.float32) / 255
    return a[..., 0].copy(), a[..., 3].copy()


def put(v, alpha, name):
    g = (np.clip(v, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(np.dstack([g, g, g, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)]), "RGBA").save(OUT / name, optimize=True)
    print(name, v.shape[::-1])


def oversized():
    """Boxy: 20 % wider and 6 % shorter, about the centre line."""
    SX, SY = 1.2, 0.94
    at = {}
    for view in ("front", "back"):
        im = Image.open(OUT / f"tee-{view}.png")
        cx = TEE[f"{view}_cx"]
        W, H = round(im.width * SX) + 40, round(im.height * SY) + 20
        ox = W / 2 - cx * SX
        im.transform((W, H), Image.AFFINE, (1 / SX, 0, -ox / SX, 0, 1 / SY, 0), resample=Image.BICUBIC) \
          .save(OUT / f"oversized-{view}.png", optimize=True)
        at[view] = (W / 2, TEE[f"{view}_neck"] * SY)
        print(f"oversized-{view}.png", (W, H))
    k = round(TEE["chest_px"] * SX / 600, 3)          # an M oversized is 600 mm across
    (fx, fn), (bx, bn) = at["front"], at["back"]
    return {
        "oversized/front": {"src": "oversized-front.png", "chestMm": 600, "pxPerMm": k, "areas": {
            "front": {"cx": round(fx), "cy": round(fn + (75 + 200) * k)},
            "chest-left": {"cx": round(fx + 115 * k), "cy": round(fn + (50 + 47.5) * k)}}},
        "oversized/back": {"src": "oversized-back.png", "chestMm": 600, "pxPerMm": k, "areas": {
            "back": {"cx": round(bx), "cy": round(bn + (90 + 225) * k)},
            "neck": {"cx": round(bx), "cy": round(bn + 30 * k)}}},
    }


SS = 4  # supersampling for the drawn parts' edges

def _bez(p0, p1, p2, p3, n=48):
    t = np.linspace(0, 1, n)[:, None]
    p = [np.array(q, float) for q in (p0, p1, p2, p3)]
    return [tuple(x) for x in ((1 - t) ** 3 * p[0] + 3 * (1 - t) ** 2 * t * p[1] + 3 * (1 - t) * t ** 2 * p[2] + t ** 3 * p[3])]


def _mask(shape, polys):
    H, W = shape
    m = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(m)
    for poly in polys:
        d.polygon([(x * SS, y * SS) for x, y in poly], fill=255)
    return np.asarray(m.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255


def _blur(m, r):
    return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255


def polo():
    """A golf shirt from the tee photo: collar, stand, placket, buttons, at real
    sizes (1.692 px/mm): 30 mm placket 140 mm long, 11 mm buttons, ~70 mm points."""
    # The front starts from the tee BACK (neck scoop already filled), mirrored back.
    v, A = grey("tee-back.png")
    v, A = v[:, ::-1].copy(), A[:, ::-1].copy()
    H, W = v.shape
    cx, T = W - 1 - TEE["back_cx"], 62
    yy, xx = np.mgrid[0:H, 0:W]
    fab = np.roll(v, -380, axis=0)                 # plain chest fabric for the new parts
    X = lambda s, x: cx + s * x
    M = lambda polys: _mask(v.shape, polys)
    bar = lambda x0, y0, x1, y1: M([[(x0, y0), (x1, y0), (x1, y1), (x0, y1)]])
    fold = lambda s: _bez((X(s, 148), T + 8), (X(s, 120), T + 40), (X(s, 45), T + 80), (X(s, 14), T + 112))
    back_arc = _bez((X(1, 148), T + 8), (X(1, 90), T - 2), (X(-1, 90), T - 2), (X(-1, 148), T + 8))
    stand = M([_bez((X(-1, 150), T + 8), (X(-1, 90), T - 26), (X(1, 90), T - 26), (X(1, 150), T + 8)) +
               _bez((X(1, 150), T + 8), (X(1, 90), T - 2), (X(-1, 90), T - 2), (X(-1, 150), T + 8))])
    opening = M([fold(-1) + fold(1)[::-1] + back_arc])

    def leaf(s):
        return (fold(s) + _bez((X(s, 14), T + 112), (X(s, 40), T + 130), (X(s, 80), T + 150), (X(s, 104), T + 170)) +
                _bez((X(s, 104), T + 170), (X(s, 150), T + 120), (X(s, 190), T + 70), (X(s, 186), T + 36)) +
                _bez((X(s, 186), T + 36), (X(s, 178), T + 18), (X(s, 162), T + 8), (X(s, 148), T + 8)))
    LV = np.clip(M([leaf(-1)]) + M([leaf(1)]), 0, 1)
    pw, p0, p1 = 26, T + 108, T + 345

    depth = np.clip((yy - T) / 110, 0, 1)
    v = v * (1 - opening) + opening * fab * (0.70 - 0.12 * depth)        # inside of the collar
    v = v * (1 - stand) + stand * fab * 0.97
    stitch = np.clip(bar(cx - pw + 4.2, p0, cx - pw + 5.8, p1 - 5) + bar(cx + pw - 5.8, p0, cx + pw - 4.2, p1 - 5)
                     + bar(cx - pw + 5, p1 - 6, cx + pw - 5, p1 - 4.5), 0, 1)
    edge = np.clip(bar(cx + pw - 1.2, p0, cx + pw + 1.2, p1) + bar(cx - pw - 0.8, p0, cx - pw + 0.8, p1)
                   + bar(cx - pw, p1 - 1, cx + pw, p1 + 1.5), 0, 1)
    v = v * (1 - 0.13 * _blur(stitch, 0.5)) * (1 - 0.20 * _blur(edge, 1.0))
    v = v * (1 - 0.08 * _blur(bar(cx + pw + 0.5, p0, cx + pw + 5.5, p1), 3))   # placket overlap
    v = v * (1 - 0.32 * np.roll(_blur(LV, 7), 8, axis=0) * (1 - LV))         # collar shadow
    v = v * (1 - LV) + LV * fab * (1.03 - 0.09 * np.clip((yy - T) / 170, 0, 1))
    v = v * (1 - 0.28 * np.clip((_blur(LV, 1.3) - LV) * 2.2, 0, 1))          # hairline round the points
    v = v * (1 - 0.10 * np.clip((LV - _blur(LV, 2.2)) * 2.5, 0, 1))          # rolled edge
    v = np.where(LV > 0.5, v * (0.985 + 0.015 * np.sin(yy * 1.9)), v)        # knit rib
    for by in (T + 158, T + 228, T + 298):
        r = np.sqrt((xx - cx) ** 2 + (yy - by) ** 2)
        btn = np.clip(9.5 - r, 0, 1)
        v = v * (1 - 0.28 * np.clip(10.5 - np.sqrt((xx - cx - 1) ** 2 + (yy - by - 2) ** 2), 0, 1) * (1 - btn))
        v = v * (1 - btn) + btn * fab * (0.97 + 0.06 * np.clip((by - yy) / 9, -1, 1))
        v = v * (1 - 0.22 * np.clip(1 - np.abs(r - 8) / 1.3, 0, 1) * btn)
        for dx, dy in ((-2.6, -2.6), (2.6, -2.6), (-2.6, 2.6), (2.6, 2.6)):
            v = v * (1 - 0.5 * np.clip(1.3 - np.sqrt((xx - cx - dx) ** 2 + (yy - by - dy) ** 2), 0, 1))
    put(v, A, "polo-front.png")

    # Back: the collar folded down over the back neck — a band, shadow under it.
    v, A = grey("tee-back.png")
    H, W = v.shape
    bx = TEE["back_cx"]
    fab = np.roll(v, -380, axis=0)
    inside = A > 0.5
    xs = [x for x in range(bx - 200, bx + 201) if inside[:, x].any()]
    top = {x: int(np.nonzero(inside[:, x])[0][0]) for x in xs}
    upper = [(x, top[x] - 4) for x in xs]
    lower = [(x, top[x] + 62 + 10 * (1 - ((x - bx) / 200) ** 2)) for x in reversed(xs)]
    band = _mask(v.shape, [upper + lower])
    yy = np.mgrid[0:H, 0:W][0]
    v = v * (1 - 0.30 * np.roll(_blur(band, 7), 9, axis=0) * (1 - band))
    v = v * (1 - band) + band * fab * 1.02
    v = v * (1 - 0.26 * np.clip((_blur(band, 1.3) - band) * 2.2, 0, 1))
    v = v * (1 - 0.10 * np.clip((band - _blur(band, 2.2)) * 2.5, 0, 1))
    v = np.where(band > 0.5, v * (0.985 + 0.015 * np.sin(yy * 1.9)), v)
    put(v, np.maximum(A, band), "polo-back.png")

    k, chest = TEE["px_mm"], round(TEE["chest_px"] / 520, 3)       # an M golf shirt is 520 mm across
    below_points = T + 170
    return {
        "polo/front": {"src": "polo-front.png", "chestMm": 520, "pxPerMm": chest, "areas": {
            "chest-left": {"cx": round(cx + 105 * k), "cy": round(below_points + (25 + 40) * k)},
            "chest-right": {"cx": round(cx - 105 * k), "cy": round(below_points + (25 + 40) * k)},
            "sleeve-right": {"cx": 165, "cy": 300, "rot": 20}}},
        "polo/back": {"src": "polo-back.png", "chestMm": 520, "pxPerMm": chest, "areas": {
            "back": {"cx": bx, "cy": round(TEE["back_neck"] + 50 + (80 + 150) * k)}}},
    }


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    tee(sys.argv[1])
    hoodie(sys.argv[2])
    entries = {**oversized(), **polo()}
    man = json.loads((OUT / "manifest.json").read_text())
    man["blanks"].update(entries)
    (OUT / "manifest.json").write_text(json.dumps(man, indent=2) + "\n")
    print("manifest:", ", ".join(entries))
