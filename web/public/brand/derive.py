import os
from PIL import Image, ImageFilter, ImageEnhance, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_SRC = os.path.join(HERE, "cristal-logo-v1.png")
ICON_SRC = os.path.join(HERE, "cristal-icon-v1.png")
BG = (5, 7, 10)


def black_corner(img, fx=0.84, fy=0.80):
    img = img.convert("RGB").copy()
    w, h = img.size
    patch = Image.new("RGB", (w - int(w * fx), h - int(h * fy)), (0, 0, 0))
    img.paste(patch, (int(w * fx), int(h * fy)))
    return img


def cover_fit(src, W, H):
    sw, sh = src.size
    scale = max(W / sw, H / sh)
    rs = src.resize((int(sw * scale), int(sh * scale)), Image.Resampling.LANCZOS)
    x = (rs.width - W) // 2
    y = (rs.height - H) // 2
    return rs.crop((x, y, x + W, y + H))


def hramp(w, h, left=0.0, right=1.0):
    g = Image.new("L", (w, 1))
    for x in range(w):
        t = x / max(1, w - 1)
        v = left + (right - left) * t
        g.putpixel((x, 0), int(max(0, min(1, v)) * 255))
    return g.resize((w, h))


def vramp(w, h, stops):
    g = Image.new("L", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            a, va = stops[i]
            b, vb = stops[i + 1]
            if a <= t <= b:
                f = (t - a) / max(1e-6, b - a)
                v = va + (vb - va) * f
                break
        else:
            v = stops[-1][1]
        g.putpixel((0, y), int(max(0, min(1, v)) * 255))
    return g.resize((w, h))


def emblem_trim(icon):
    gray = icon.convert("L")
    mask = gray.point(lambda p: 255 if p > 18 else 0)
    bbox = mask.getbbox()
    crop = icon.convert("RGB").crop(bbox)
    side = max(crop.size) + 48
    sq = Image.new("RGB", (side, side), (0, 0, 0))
    sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
    return sq


def save(img, name):
    p = os.path.join(HERE, name)
    img.save(p)
    return p


logo = black_corner(Image.open(LOGO_SRC))
icon = black_corner(Image.open(ICON_SRC))
emblem = emblem_trim(icon)

# --- favicons / app icons (from icon) ---
ico48 = icon.resize((48, 48), Image.Resampling.LANCZOS)
ico48.save(os.path.join(HERE, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
save(icon.resize((180, 180), Image.Resampling.LANCZOS), "apple-touch-icon.png")
save(icon.resize((192, 192), Image.Resampling.LANCZOS), "icon-192.png")
save(icon.resize((512, 512), Image.Resampling.LANCZOS), "icon-512.png")

# --- logo full + emblem ---
save(logo, "logo-full.png")
save(emblem.resize((512, 512), Image.Resampling.LANCZOS), "emblem.png")

# --- mono white (alpha = luminance, RGB white) ---
lum = logo.convert("L")
white = Image.new("RGB", logo.size, (255, 255, 255))
mono = Image.merge("RGBA", (*white.split(), lum))
save(mono, "logo-white.png")


def screen_place(base_rgb, art_rgb, pos, mask=None):
    layer = Image.new("RGB", base_rgb.size, (0, 0, 0))
    if mask is not None:
        art_rgb = ImageChops.multiply(art_rgb, mask.convert("RGB"))
    layer.paste(art_rgb, pos)
    return ImageChops.screen(base_rgb, layer)


def social_card(W, H, out):
    base = Image.new("RGB", (W, H), BG)
    # emblem bleeding off the right edge
    s = int(H * 1.5)
    em = emblem.resize((s, s), Image.Resampling.LANCZOS)
    em = ImageEnhance.Brightness(em).enhance(0.85)
    fade = hramp(s, s, left=0.0, right=1.25)
    ex, ey = W - int(s * 0.62), (H - s) // 2
    base = screen_place(base, em, (ex, ey), mask=fade)
    # logo lockup on the left
    lw = int(W * 0.56)
    lh = int(lw * logo.height / logo.width)
    lg = logo.resize((lw, lh), Image.Resampling.LANCZOS)
    base = screen_place(base, lg, (int(W * 0.04), (H - lh) // 2))
    # gentle edge vignette
    vig = vramp(W, H, [(0.0, 0.78), (0.5, 1.0), (1.0, 0.74)])
    base = ImageChops.multiply(base, Image.merge("RGB", (vig, vig, vig)))
    save(base, out)


social_card(1200, 630, "og-image.png")
social_card(1200, 600, "twitter-card.png")
social_card(1584, 396, "linkedin-banner.png")


def hero_bg(W, H, out):
    bg = cover_fit(icon.convert("RGB"), W, H)
    bg = bg.filter(ImageFilter.GaussianBlur(3))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    v = vramp(W, H, [(0.0, 0.2), (0.5, 0.6), (1.0, 0.1)])
    bg = ImageChops.multiply(bg, Image.merge("RGB", (v, v, v)))
    hg = Image.new("L", (W, 1))
    for x in range(W):
        t = abs(x / (W - 1) - 0.5) * 2
        hg.putpixel((x, 0), int((1 - 0.85 * t) * 255))
    hg = hg.resize((W, H))
    bg = ImageChops.multiply(bg, Image.merge("RGB", (hg, hg, hg)))
    save(bg, out)


hero_bg(1920, 1080, "bg-hero-1920.png")
hero_bg(3440, 1440, "bg-hero-3440.png")

print("DONE")
