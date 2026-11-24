"""Erzeugt die Pixel-Hintergründe für Kapitel 2.

Gezeichnet wird auf 320x180 Pixeln und dann mit Faktor 4 ohne Glättung
auf 1280x720 hochskaliert, damit die Pixel so klobig bleiben wie im
Nachtpark-Backdrop. Alle Motive kacheln horizontal nahtlos.

    python tools/make_backdrops.py
"""
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

W, H, SCALE = 320, 180, 4
OUT = Path(__file__).resolve().parent.parent / "img"

SKY = (0, 20, 135)
SKY_LOW = (2, 14, 104)
CITY = (0, 6, 54)
CITY_FAR = (3, 14, 92)
WIN = [(246, 196, 83), (214, 160, 52), (120, 150, 220)]
CLOUD = (122, 98, 184)
CLOUD_HI = (155, 134, 214)
STAR = (255, 242, 196)


def base_sky(d, seed):
    rnd = random.Random(seed)
    d.rectangle([0, 0, W, H], fill=SKY)
    for y in range(96, 140):  # sanfter, gerasterter Übergang zum Horizont
        for x in range(W):
            if (x + y) % 2 == 0 and y > 96 + (x * 7 % 13):
                d.point((x, y), fill=SKY_LOW)
    for _ in range(22):
        x, y = rnd.randrange(W), rnd.randrange(6, 80)
        d.point((x, y), fill=STAR)
        if rnd.random() < .3:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                d.point(((x + dx) % W, y + dy), fill=STAR)
    for cx, cy, s in ((40, 26, 1), (150, 40, .7), (250, 22, 1.1)):
        cloud(d, cx, cy, s)


def wrap_rect(d, x0, y0, x1, y1, fill):
    """Rechteck, das am rechten Rand nach links umbricht."""
    for off in (-W, 0, W):
        d.rectangle([x0 + off, y0, x1 + off, y1], fill=fill)


def cloud(d, x, y, s):
    wrap_rect(d, x, y + 4 * s, x + 30 * s, y + 7 * s, CLOUD)
    wrap_rect(d, x + 6 * s, y, x + 14 * s, y + 5 * s, CLOUD)
    wrap_rect(d, x + 14 * s, y + 2 * s, x + 24 * s, y + 5 * s, CLOUD)
    wrap_rect(d, x + 7 * s, y, x + 12 * s, y + 1, CLOUD_HI)


def skyline(d, seed, base, color, lit=.55, hmin=20, hmax=60):
    rnd = random.Random(seed)
    x = 0
    while x < W:
        w = rnd.randrange(12, 26)
        h = rnd.randrange(hmin, hmax)
        wrap_rect(d, x, base - h, x + w, base, color)
        if rnd.random() < .3:
            wrap_rect(d, x + w // 2 - 1, base - h - 6, x + w // 2, base - h, color)
        for wy in range(base - h + 3, base - 3, 4):
            for wx in range(x + 2, x + w - 2, 4):
                if rnd.random() < lit:
                    c = rnd.choice(WIN) if rnd.random() < .8 else WIN[2]
                    wrap_rect(d, wx, wy, wx + 1, wy + 1, c)
        x += w + rnd.randrange(0, 4)


def bushes(d, seed, y, color=(48, 84, 4), hi=(104, 128, 4)):
    rnd = random.Random(seed)
    for x in range(0, W, 9):
        r = rnd.randrange(5, 10)
        for off in (-W, 0, W):
            d.ellipse([x + off - r, y - r, x + off + r, y + r], fill=color)
            d.point((x + off - 2, y - r + 2), fill=hi)


def finish(img, name):
    big = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
    big.save(OUT / name, optimize=True)
    print("geschrieben:", OUT / name)


# ---------------------------------------------------------------- Rheinufer
def rheinufer():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    base_sky(d, 4)
    # Mond
    d.ellipse([262, 14, 280, 32], fill=(255, 236, 170))
    d.ellipse([268, 12, 286, 30], fill=SKY)
    # Hügel auf der anderen Flussseite, sinusförmig und damit nahtlos
    for x in range(W):
        h1 = 88 + int(10 * math.sin(x / W * 2 * math.pi * 2) + 6 * math.sin(x / W * 2 * math.pi * 5))
        d.line([(x, h1), (x, 120)], fill=CITY_FAR)
        h2 = 100 + int(6 * math.sin(x / W * 2 * math.pi * 3 + 1))
        d.line([(x, h2), (x, 120)], fill=CITY)
    # Burg auf dem Hügel
    bx = 70
    d.rectangle([bx, 66, bx + 30, 90], fill=CITY)
    d.rectangle([bx + 4, 54, bx + 12, 66], fill=CITY)
    d.rectangle([bx + 20, 58, bx + 28, 66], fill=CITY)
    for tx in (bx + 4, bx + 8, bx + 12, bx + 20, bx + 24, bx + 28):
        d.rectangle([tx, 51 if tx < bx + 16 else 55, tx + 1, 53 if tx < bx + 16 else 57], fill=CITY)
    for wx, wy in ((bx + 7, 58), (bx + 23, 61), (bx + 15, 74), (bx + 9, 80)):
        d.rectangle([wx, wy, wx + 1, wy + 2], fill=WIN[0])
    # Kleine Uferstadt
    skyline(d, 11, 118, CITY, lit=.35, hmin=6, hmax=18)
    # Brücke mit Bögen und Laternen
    d.rectangle([0, 98, W, 101], fill=(10, 18, 70))
    for px in range(0, W, 64):
        d.rectangle([px + 28, 101, px + 36, 124], fill=(10, 18, 70))
        for i in range(28):  # flacher Bogen zwischen den Pfeilern
            y = 101 + int(5 * math.sin(i / 28 * math.pi))
            d.point(((px + 36 + i) % W, y), fill=(10, 18, 70))
            d.point(((px + 36 + i) % W, y + 1), fill=(10, 18, 70))
    for lx in range(6, W, 16):
        d.rectangle([lx, 94, lx, 97], fill=(10, 18, 70))
        d.point((lx, 93), fill=WIN[0])
    # Fluss mit Spiegelungen
    d.rectangle([0, 124, W, 156], fill=(1, 18, 92))
    rnd = random.Random(7)
    for y in range(126, 156, 3):
        for _ in range(9):
            x = rnd.randrange(W)
            c = WIN[0] if rnd.random() < .45 else (60, 90, 190)
            wrap_rect(d, x, y, x + rnd.randrange(2, 7), y, c)
    for lx in range(6, W, 16):  # Laternen-Spiegelung
        for y in range(127, 146, 4):
            d.point((lx + (y % 3) - 1, y), fill=(200, 160, 60))
    # Kaimauer mit Geländer
    d.rectangle([0, 148, W, H], fill=(28, 34, 58))
    for x in range(0, W, 8):
        d.line([(x, 148), (x, 154)], fill=(14, 18, 34))
    d.line([(0, 140), (W, 140)], fill=(60, 70, 96))
    for x in range(0, W, 6):
        d.line([(x, 140), (x, 148)], fill=(44, 52, 78))
    finish(img, "backdrop-rheinufer.png")


# ------------------------------------------------------------------- Kirmes
def kirmes():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    base_sky(d, 9)
    skyline(d, 21, 122, CITY_FAR, lit=.25, hmin=20, hmax=50)
    # Riesenrad
    cx, cy, r = 92, 72, 46
    frame = (40, 26, 90)
    d.line([(cx, cy), (cx - 26, 132)], fill=frame, width=2)
    d.line([(cx, cy), (cx + 26, 132)], fill=frame, width=2)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=frame, width=2)
    lights = [(255, 92, 92), (255, 214, 92), (110, 220, 255), (160, 255, 120), (240, 120, 255)]
    for i in range(16):
        a = i / 16 * 2 * math.pi
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        d.line([(cx, cy), (x, y)], fill=frame)
        d.rectangle([x - 2, y + 1, x + 2, y + 4], fill=(70, 40, 120))
    for i in range(48):
        a = i / 48 * 2 * math.pi
        d.point((round(cx + r * math.cos(a)), round(cy + r * math.sin(a))), fill=lights[i % 5])
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 214, 92))
    # Zelte mit Streifen
    for tx, tw, th, col in ((170, 54, 30, (200, 40, 50)), (236, 40, 24, (40, 80, 200)), (282, 50, 34, (200, 40, 50)), (12, 40, 22, (40, 80, 200))):
        top = 132 - th
        for y in range(top, 132):
            half = int((y - top) / th * tw / 2) + 2
            for x in range(tx + tw // 2 - half, tx + tw // 2 + half):
                c = col if ((x - tx) // 5) % 2 == 0 else (238, 226, 200)
                if y > top + th * .55:
                    c = tuple(int(v * .62) for v in c)
                d.point((x % W, y), fill=c)
        d.line([(tx + tw // 2, top - 6), (tx + tw // 2, top)], fill=(238, 226, 200))
        d.point((tx + tw // 2 + 1, top - 6), fill=(255, 214, 92))
    # Lichterketten, nahtlos
    for seg in range(0, W, 80):
        for i in range(81):
            x = seg + i
            y = 104 + int(10 * math.sin(i / 80 * math.pi))
            if i % 5 == 0:
                d.point((x % W, y), fill=lights[(i // 5) % 5])
            elif i % 5 == 2:
                d.point((x % W, y - 1), fill=(30, 22, 60))
    # Buden-Reihe unten
    d.rectangle([0, 132, W, H], fill=(18, 10, 40))
    for bx in range(0, W, 40):
        d.rectangle([bx + 2, 136, bx + 36, 150], fill=(48, 24, 80))
        for sx in range(bx + 2, bx + 37, 6):
            d.rectangle([sx, 132, sx + 2, 136], fill=(230, 210, 120) if (sx // 6) % 2 else (200, 50, 70))
        d.rectangle([bx + 8, 140, bx + 30, 146], fill=(246, 196, 83))
    finish(img, "backdrop-kirmes.png")


# ---------------------------------------------------------------- Baustelle
def baustelle():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    base_sky(d, 13)
    d.ellipse([170, 12, 188, 30], fill=(255, 236, 170))
    skyline(d, 31, 128, CITY_FAR, lit=.3, hmin=24, hmax=58)
    steel = (60, 26, 30)
    # Rohbau-Skelett
    for bx, bw, bh in ((120, 70, 70), (238, 46, 50)):
        top = 128 - bh
        for x in range(bx, bx + bw + 1, 10):
            d.line([(x, top), (x, 128)], fill=steel)
        for y in range(top, 129, 10):
            d.line([(bx, y), (bx + bw, y)], fill=steel)
        for x in range(bx, bx + bw, 20):
            for y in range(top, 128, 20):
                if (x + y) % 40 == 0:
                    d.rectangle([x + 2, y + 2, x + 8, y + 8], fill=(246, 196, 83))
    # Zwei Turmdrehkräne
    crane = (150, 110, 30)
    crane_dark = (80, 56, 20)
    for kx, top, jib in ((70, 26, 90), (220, 40, 70)):
        d.line([(kx, top), (kx, 132)], fill=crane, width=3)
        for y in range(top, 132, 6):
            d.line([(kx - 1, y), (kx + 1, y + 6)], fill=crane_dark)
        d.line([(kx - 26, top), (kx + jib, top)], fill=crane, width=2)
        for x in range(kx - 26, kx + jib, 6):
            d.line([(x, top), (x + 3, top + 3)], fill=crane_dark)
        d.rectangle([kx - 30, top - 2, kx - 22, top + 6], fill=crane_dark)
        d.line([(kx, top - 10), (kx + jib, top)], fill=crane_dark)
        d.line([(kx, top - 10), (kx - 26, top)], fill=crane_dark)
        hx = kx + jib * 2 // 3
        d.line([(hx, top), (hx, top + 40)], fill=(30, 30, 40))
        d.rectangle([hx - 6, top + 40, hx + 6, top + 44], fill=(110, 40, 30))
        d.point((kx, top - 11), fill=(255, 60, 60))
        d.point((kx + jib, top - 1), fill=(255, 60, 60))
    # Bauzaun mit Warnstreifen
    d.rectangle([0, 132, W, H], fill=(14, 12, 26))
    for x in range(0, W, 4):
        d.line([(x, 132), (x + 4, 140)], fill=(240, 200, 40) if (x // 4) % 2 else (20, 18, 24))
    d.rectangle([0, 140, W, 150], fill=(30, 34, 46))
    for x in range(0, W, 3):
        d.point((x, 142 + (x % 2) * 4), fill=(56, 62, 80))
    for x in range(10, W, 60):
        d.point((x, 131), fill=(255, 140, 40))
    finish(img, "backdrop-baustelle.png")


# --------------------------------------------------------------- Weinberge
def weinberge():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    base_sky(d, 17)
    d.ellipse([228, 16, 244, 32], fill=(255, 236, 170))
    # ferner Hang mit Burg
    for x in range(W):
        h = 70 + int(12 * math.sin(x / W * 2 * math.pi) + 5 * math.sin(x / W * 2 * math.pi * 4))
        d.line([(x, h), (x, H)], fill=CITY_FAR)
    bx = 196
    d.rectangle([bx, 46, bx + 22, 66], fill=CITY)
    d.rectangle([bx + 14, 34, bx + 22, 46], fill=CITY)
    for tx in range(bx + 14, bx + 23, 3):
        d.rectangle([tx, 31, tx + 1, 33], fill=CITY)
    d.rectangle([bx + 17, 38, bx + 18, 40], fill=WIN[0]); d.rectangle([bx + 5, 54, bx + 6, 56], fill=WIN[0])
    # naher Weinberg mit Rebzeilen
    for x in range(W):
        h = 92 + int(14 * math.sin(x / W * 2 * math.pi * 2 + 2))
        d.line([(x, h), (x, H)], fill=(4, 22, 40))
    for row in range(0, 60, 6):
        for x in range(0, W, 2):
            h = 92 + int(14 * math.sin(x / W * 2 * math.pi * 2 + 2)) + 4 + row
            if h < 150 and (x // 2 + row) % 3:
                d.point((x, h), fill=(34, 74, 18) if (x + row) % 5 else (70, 40, 110))
    # Fluss
    d.rectangle([0, 146, W, H], fill=(1, 18, 92))
    rnd = random.Random(3)
    for y in range(148, 170, 3):
        for _ in range(7):
            x = rnd.randrange(W)
            wrap_rect(d, x, y, x + rnd.randrange(2, 6), y, WIN[0] if rnd.random() < .4 else (60, 90, 190))
    finish(img, "backdrop-weinberge.png")


# ----------------------------------------------------------- Kneipenviertel
def kneipen():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    base_sky(d, 23)
    skyline(d, 41, 90, CITY_FAR, lit=.2, hmin=10, hmax=30)
    rnd = random.Random(5)
    x = 0
    timber = (26, 14, 12)
    while x < W:
        w = rnd.randrange(34, 50)
        top = rnd.randrange(66, 88)
        wall = rnd.choice([(58, 46, 46), (50, 42, 58), (62, 52, 40)])
        wrap_rect(d, x, top, x + w, 150, wall)
        for i in range(w // 2 + 3):  # Dach
            wrap_rect(d, x - 2 + i, top - i // 1, x + w + 2 - i, top - i // 1, (36, 20, 30))
            if x + w + 2 - i <= x - 2 + i:
                break
        for fy in range(top, 150, 14):  # Fachwerk
            wrap_rect(d, x, fy, x + w, fy + 1, timber)
            for fx in range(x, x + w, 10):
                wrap_rect(d, fx, fy, fx + 1, fy + 14, timber)
                for k in range(10):
                    if fy + k < 150:
                        d.point(((fx + k) % W, fy + k), fill=timber)
        for fy in range(top + 4, 140, 14):
            for fx in range(x + 4, x + w - 5, 10):
                if rnd.random() < .42:
                    wrap_rect(d, fx, fy, fx + 4, fy + 5, WIN[0] if rnd.random() < .8 else WIN[1])
                    wrap_rect(d, fx + 2, fy, fx + 2, fy + 5, timber)
        if rnd.random() < .6:  # Wirtshausschild
            sx = x + w - 2
            wrap_rect(d, sx, top + 20, sx + 8, top + 20, timber)
            wrap_rect(d, sx + 3, top + 21, sx + 9, top + 27, (200, 150, 60))
        x += w + 1
    d.rectangle([0, 150, W, H], fill=(30, 28, 40))
    for y in range(152, H, 4):
        for x in range((y // 4 % 2) * 3, W, 6):
            d.rectangle([x, y, x + 4, y + 2], fill=(46, 42, 58))
    finish(img, "backdrop-kneipen.png")


# ---------------------------------------------------------------- Burg
def burg():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    base_sky(d, 29)
    d.ellipse([96, 16, 118, 38], fill=(255, 236, 170))
    stone, stone2, dark = (44, 46, 72), (58, 60, 92), (20, 22, 40)
    d.rectangle([0, 78, W, H], fill=stone)
    for y in range(78, H, 8):  # Mauerwerk
        for x in range((y // 8 % 2) * 8, W, 16):
            d.rectangle([x, y, x + 14, y + 6], fill=stone2)
    for x in range(0, W, 12):  # Zinnen
        d.rectangle([x, 70, x + 7, 78], fill=stone)
    for tx in (30, 150, 262):  # Türme
        d.rectangle([tx, 36, tx + 34, 150], fill=stone)
        for x in range(tx, tx + 34, 9):
            d.rectangle([x, 28, x + 5, 36], fill=stone)
        for y in range(40, 150, 8):
            d.line([(tx, y), (tx + 34, y)], fill=dark)
        d.rectangle([tx + 14, 52, tx + 19, 62], fill=WIN[0])
        d.rectangle([tx + 14, 90, tx + 19, 100], fill=dark)
        d.line([(tx + 17, 10), (tx + 17, 28)], fill=dark)
        d.polygon([(tx + 18, 10), (tx + 30, 14), (tx + 18, 18)], fill=(180, 40, 50))
    for fx in (90, 210):  # Fackeln
        d.rectangle([fx, 104, fx + 2, 114], fill=(60, 30, 20))
        d.rectangle([fx - 1, 100, fx + 3, 104], fill=(255, 170, 60))
        d.point((fx + 1, 99), fill=(255, 240, 160))
        for r in range(6, 14, 3):
            for a in range(0, 360, 30):
                px = fx + 1 + int(r * math.cos(math.radians(a)))
                py = 102 + int(r * math.sin(math.radians(a)))
                if (px + py) % 2 == 0:
                    d.point((px, py), fill=(120, 80, 70))
    d.rectangle([0, 150, W, H], fill=dark)
    finish(img, "backdrop-burg.png")


# ---------------------------------------------------------------- Serverraum
def serverraum():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, H], fill=(4, 10, 40))
    for y in range(0, 30, 6):  # Kabeltrassen an der Decke
        d.rectangle([0, y + 4, W, y + 6], fill=(14, 22, 62))
    for x in range(0, W, 7):
        d.line([(x, 10), (x + 3, 26)], fill=(30, 40, 90))
    rnd = random.Random(8)
    leds = [(90, 255, 140), (90, 200, 255), (255, 190, 70), (255, 70, 70)]
    for depth, (top, col, step) in enumerate(((40, (10, 18, 58), 26), (52, (16, 26, 74), 34))):
        for x in range(depth * 10, W, step):
            w = step - 6
            d.rectangle([x, top, x + w, 150], fill=col)
            d.rectangle([x, top, x + w, top + 2], fill=(34, 46, 110))
            for y in range(top + 6, 146, 4):
                d.line([(x + 2, y), (x + w - 2, y)], fill=(6, 12, 40))
                if rnd.random() < .5:
                    d.point((x + 3 + rnd.randrange(max(1, w - 6)), y + 1), fill=rnd.choice(leds))
    for x in range(0, W, 16):  # Bodenlicht
        d.rectangle([x, 150, x + 8, 151], fill=(60, 120, 220))
    d.rectangle([0, 152, W, H], fill=(8, 14, 44))
    for x in range(0, W, 20):
        d.line([(x, 152), (x, H)], fill=(18, 26, 70))
    finish(img, "backdrop-serverraum.png")


# ---------------------------------------------------------------- Rauschen
def rauschen():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    bands = [(6, 4, 30), (14, 8, 52), (24, 12, 70), (18, 30, 80), (10, 40, 70)]
    for y in range(H):
        i = min(len(bands) - 1, y * len(bands) // H)
        d.line([(0, y), (W, y)], fill=bands[i])
        if i + 1 < len(bands) and (y * len(bands)) % H > H * .6:
            for x in range(y % 2, W, 2):
                d.point((x, y), fill=bands[i + 1])
    rnd = random.Random(42)
    for _ in range(140):
        x, y = rnd.randrange(W), rnd.randrange(120)
        d.point((x, y), fill=rnd.choice([STAR, (180, 200, 255), (200, 160, 255)]))
    for x in range(W):  # Polarlicht
        y0 = 40 + int(14 * math.sin(x / W * 2 * math.pi * 2) + 6 * math.sin(x / W * 2 * math.pi * 5))
        for k in range(0, 24, 2):
            if (x + k) % 3:
                d.point((x, y0 + k), fill=(40, 180 - k * 4, 150 - k * 2))
    d.ellipse([140, 70, 180, 110], fill=(230, 220, 255))
    d.ellipse([146, 76, 156, 84], fill=(200, 190, 240))
    for x in range(W):
        h = 130 + int(8 * math.sin(x / W * 2 * math.pi * 3))
        d.line([(x, h), (x, H)], fill=(8, 6, 26))
    finish(img, "backdrop-rauschen.png")


# ---------------------------------------------------------------- Tunnel
def tunnel():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, H], fill=(14, 12, 22))
    for y in range(0, 150, 2):  # gewölbte Tunnelwand mit Fliesen
        shade = 24 + int(18 * math.sin(y / 150 * math.pi))
        d.line([(0, y), (W, y)], fill=(shade, shade - 4, shade + 10))
    for y in range(8, 140, 10):
        for x in range((y // 10 % 2) * 8, W, 16):
            d.rectangle([x, y, x + 14, y + 8], outline=(46, 42, 60))
    for x in range(0, W, 40):  # Deckenlampen
        d.rectangle([x + 10, 6, x + 30, 9], fill=(255, 196, 90))
        for k in range(1, 26):
            if (x + k) % 2 == 0:
                d.point((x + 20 + (k % 5) - 2, 9 + k), fill=(90, 70, 40))
    for x in range(0, W, 80):  # Notausgang-Schilder
        d.rectangle([x + 50, 70, x + 64, 77], fill=(30, 160, 90))
        d.rectangle([x + 52, 72, x + 55, 75], fill=(230, 255, 230))
    for x in range(0, W, 26):  # Leitplanke
        d.rectangle([x, 128, x + 22, 132], fill=(150, 150, 166))
        d.rectangle([x + 10, 132, x + 12, 150], fill=(90, 90, 104))
    d.rectangle([0, 150, W, H], fill=(20, 18, 28))
    finish(img, "backdrop-tunnel.png")


# ---------------------------------------------------------------- Disko
def disko():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        c = (22 + y // 12, 6, 40 + y // 6)
        d.line([(0, y), (W, y)], fill=c)
    beams = [(255, 60, 160), (60, 220, 255), (255, 220, 60), (150, 255, 90)]
    for i, bx in enumerate((40, 120, 200, 280)):  # Lichtkegel
        col = beams[i]
        for y in range(10, 150):
            spread = (y - 10) // 4
            for x in range(bx - spread, bx + spread + 1, 3):
                if (x + y) % 3 == 0:
                    d.point((x % W, y), fill=tuple(int(v * .45) for v in col))
    cx, cy = 160, 28  # Spiegelkugel
    d.line([(cx, 0), (cx, cy - 12)], fill=(120, 120, 140))
    d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=(170, 170, 190))
    for y in range(cy - 12, cy + 12, 3):
        for x in range(cx - 12, cx + 12, 3):
            if (x - cx) ** 2 + (y - cy) ** 2 < 140:
                d.point((x, y), fill=(240, 240, 255) if (x + y) % 2 else (90, 90, 120))
    rnd = random.Random(77)
    for _ in range(60):  # Lichtpunkte der Kugel
        x, y = rnd.randrange(W), rnd.randrange(130)
        d.point((x, y), fill=rnd.choice(beams))
    for sx in (6, 290):  # Boxentürme
        d.rectangle([sx, 70, sx + 24, 150], fill=(16, 10, 22))
        for k, yy in enumerate((80, 104, 128)):
            d.ellipse([sx + 4, yy, sx + 20, yy + 16], fill=(40, 30, 52))
            d.ellipse([sx + 9, yy + 5, sx + 15, yy + 11], fill=(10, 6, 14))
    for x in range(0, W, 7):  # tanzende Menge
        h = 10 + (x * 13 % 9)
        d.rectangle([x, 150 - h, x + 4, 150], fill=(10, 4, 18))
        d.ellipse([x, 146 - h - 4, x + 4, 150 - h], fill=(10, 4, 18))
    d.rectangle([0, 150, W, H], fill=(12, 4, 20))
    finish(img, "backdrop-disko.png")


if __name__ == "__main__":
    rheinufer()
    kirmes()
    baustelle()
    weinberge()
    kneipen()
    burg()
    serverraum()
    rauschen()
    tunnel()
    disko()
