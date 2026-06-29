# CRISTAL.CLI — Branding kit (reproducibility)

Generated with Gemini (Nano Banana 2, image mode) via Chrome DevTools MCP, then
derived with `derive.py` (Python/Pillow). A logo you can't regenerate is a logo
you don't own.

- **Gemini chat:** https://gemini.google.com/app/861050a130c7472c
- **Date:** 2026-06-28
- **Masters (never overwrite — regen writes `-v2`):**
  - `cristal-logo-v1.png` — 1024×572 wide lockup
  - `cristal-icon-v1.png` — 1024×1024 emblem-only

## Palette

| Role | Hex |
|---|---|
| Background | `#000000` (pure black) |
| Primary (phosphor green) | `#39FF14` |
| Secondary (cyan) | `#00FFFF` |
| Glitch accent (magenta) | `#FF2EC4` |

Style: occult-terminal, crystalline sacred-geometry shard + all-seeing eye +
terminal cursor block, thin vector strokes, scanline texture, chromatic-aberration
glitch. No clichés (no clip-art gems, no AI-brain, no glossy 3D).

## Prompt 1 — Master logo (wide)

> Design a flat vector brand logo for an occult-terminal narrative game called CRISTAL.CLI. Wide landscape composition: on the left, a crystalline geometric emblem — a faceted vertical crystal shard built from sacred-geometry line work, with a single all-seeing eye and a blinking terminal cursor (block) integrated inside the facets. To the right, the wordmark "CRISTAL.CLI" set in a clean monospaced terminal typeface, and beneath it a small lowercase tagline: "write what you feel". Aesthetic: pure black background (#000000), phosphor terminal green (#39FF14) and cyan (#00FFFF) thin vector strokes, with a subtle magenta (#FF2EC4) glitch / chromatic-aberration accent and a faint scanline texture. Sharp crisp edges, high contrast, minimal, premium, legible. STRICT no-cliche clause: no clip-art crystals, no rainbow gems, no fists, no megaphones, no lightbulbs, no generic "AI brain", no glossy 3D, no muddy gradients.

## Prompt 2 — App icon (square 1:1, emblem only)

> Now create a SQUARE 1:1 app icon, emblem only, absolutely NO text and no wordmark. Use the same crystalline faceted vertical crystal shard built from sacred-geometry line work, with a single all-seeing eye and a blinking terminal cursor block integrated inside the facets. Phosphor terminal green (#39FF14) and cyan (#00FFFF) thin vector strokes on a pure black (#000000) background, with a subtle magenta (#FF2EC4) glitch / chromatic-aberration accent. Flat vector, sharp crisp edges, centered, bold and legible at very small sizes (favicon). Same STRICT no-cliche clause: no clip-art crystals, no rainbow gems, no clichés, no glossy 3D, no muddy gradients.

## Derivation

`python3 derive.py` regenerates every asset below from the two masters. It also
blacks out the bottom-right Gemini watermark sparkle before deriving.

| Asset | File | Size |
|---|---|---|
| Favicon (multi-res 16/32/48) | `favicon.ico` | — |
| Apple touch icon | `apple-touch-icon.png` | 180×180 |
| PWA icons | `icon-192.png`, `icon-512.png` | 192 / 512 |
| Logo full | `logo-full.png` | 1024×572 |
| Emblem | `emblem.png` | 512×512 |
| Mono white (alpha=luminance) | `logo-white.png` | 1024×572 |
| OG card | `og-image.png` | 1200×630 |
| Twitter card | `twitter-card.png` | 1200×600 |
| LinkedIn banner | `linkedin-banner.png` | 1584×396 |
| Hero bg | `bg-hero-1920.png` | 1920×1080 |
| Ultrawide hero bg | `bg-hero-3440.png` | 3440×1440 |

## CSS-only "render entre sombras" hero (client-side alternative)

```html
<img src="/brand/emblem.png" class="scale-125 object-cover opacity-40 blur-[3px]" />
<div class="absolute inset-0 bg-gradient-to-r from-black via-black/10 to-black"></div>
<div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90"></div>
```
