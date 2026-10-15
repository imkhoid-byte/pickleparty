"""Build every app icon from the PickleParty logo (assets/brand/logo-source.png).

Run: python3 scripts/make_icons.py
Writes the iOS/store icon, Android adaptive + monochrome icons, splash, favicon,
the website's iPhone home-screen icon, and the round badge used inside the app.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets')
PUBLIC = os.path.join(os.path.dirname(__file__), '..', 'public')
SIZE = 1024
BG = (0, 3, 12)  # the logo's near-black background

logo = Image.open(os.path.join(ASSETS, 'brand', 'logo-source.png')).convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)


def save(img, path, size=None, mode=None):
    if size:
        img = img.resize((size, size), Image.LANCZOS)
    if mode:
        img = img.convert(mode)
    img.save(path)
    print('wrote', os.path.relpath(path, os.path.join(ASSETS, '..')), img.size, img.mode)


# Round badge: the logo with everything outside its neon ring made transparent.
mask = Image.new('L', (SIZE, SIZE), 0)
r = SIZE * 0.497
c = SIZE / 2
ImageDraw.Draw(mask).ellipse([c - r, c - r, c + r, c + r], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(1.5))
badge = logo.convert('RGBA')
badge.putalpha(mask)

# iOS / store icon: must be square and opaque. iOS rounds the corners itself.
save(logo, os.path.join(ASSETS, 'icon.png'), mode='RGB')

# Android adaptive icon: solid background + the badge inside the safe zone.
save(Image.new('RGB', (SIZE, SIZE), BG), os.path.join(ASSETS, 'android-icon-background.png'))
fg = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
small = badge.resize((int(SIZE * 0.64), int(SIZE * 0.64)), Image.LANCZOS)
fg.alpha_composite(small, ((SIZE - small.width) // 2, (SIZE - small.height) // 2))
save(fg, os.path.join(ASSETS, 'android-icon-foreground.png'))

# Monochrome (Android themed icons): the bright parts of the logo as a white silhouette.
lum = np.asarray(fg.convert('L'), dtype=np.float32)
alpha = np.asarray(fg.getchannel('A'), dtype=np.float32) / 255
mono_alpha = (np.clip((lum - 60) / 80, 0, 1) * alpha * 255).astype(np.uint8)
mono = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 0))
mono.putalpha(Image.fromarray(mono_alpha, 'L'))
save(mono, os.path.join(ASSETS, 'android-icon-monochrome.png'))

# Splash screen and the in-app logo.
save(badge, os.path.join(ASSETS, 'splash-icon.png'))
save(badge, os.path.join(ASSETS, 'brand', 'logo-badge-512.png'), size=512)

# Browser tab icon and the website's iPhone "Add to Home Screen" icon.
save(logo, os.path.join(ASSETS, 'favicon.png'), size=48)
save(logo, os.path.join(PUBLIC, 'apple-touch-icon.png'), size=180, mode='RGB')
