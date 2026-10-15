"""Build every app icon from assets/brand/mascot.svg (original artwork, ours to use).

Run: node scripts/render_mascot.js assets/brand/mascot.png 1024 && python3 scripts/make_icons.py
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets')
SIZE = 1024
mascot = Image.open(os.path.join(ROOT, 'brand', 'mascot.png')).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)


def glow_background(size=SIZE):
    """Brand purple with a soft lighter glow behind the mascot."""
    y, x = np.mgrid[0:size, 0:size] / size
    d = np.sqrt((x - 0.5) ** 2 + (y - 0.45) ** 2)
    t = np.clip(d / 0.75, 0, 1)[..., None]
    inner, outer = np.array([74, 34, 130]), np.array([22, 10, 43])
    rgb = (inner * (1 - t) + outer * t).astype(np.uint8)
    return Image.fromarray(rgb, 'RGB').convert('RGBA')


def save(img, name, size=None, mode=None):
    if size:
        img = img.resize((size, size), Image.LANCZOS)
    if mode:
        img = img.convert(mode)
    img.save(os.path.join(ROOT, name))
    print('wrote', name, img.size, img.mode)


bg = glow_background()

# iOS / store icon: must be opaque.
icon = bg.copy()
icon.alpha_composite(mascot)
save(icon, 'icon.png', mode='RGB')

# Android adaptive icon: background + foreground inside the safe zone (~64%).
save(bg, 'android-icon-background.png', mode='RGB')
fg = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
small = mascot.resize((int(SIZE * 0.64), int(SIZE * 0.64)), Image.LANCZOS)
offset = (SIZE - small.width) // 2
fg.alpha_composite(small, (offset, offset))
save(fg, 'android-icon-foreground.png')
# Monochrome (themed icons): white silhouette of the foreground.
alpha = fg.getchannel('A')
mono = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 0))
mono.putalpha(alpha)
save(mono, 'android-icon-monochrome.png')

# Splash screen (shown on the brand purple background set in app.json).
save(mascot, 'splash-icon.png')
# Browser tab icon and the in-app logo.
save(icon, 'favicon.png', size=48)
save(mascot, os.path.join('brand', 'mascot-512.png'), size=512)
# iPhone "Add to Home Screen" icon for the website (Safari looks for this path).
icon.convert('RGB').resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, '..', 'public', 'apple-touch-icon.png'))
print('wrote public/apple-touch-icon.png')
