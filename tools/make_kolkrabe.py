"""Pixel-Sprite für den Kolkraben of Doom (Checkpoint-Bote).

Erzeugt img/kolkrabe.png: drei Frames nebeneinander, je 44 x 30 Pixel.
  Frame 0: sitzend, Frame 1: Flügel oben, Frame 2: Flügel unten.
Das Spiel skaliert ohne Glättung (Faktor 3).

    python tools/make_kolkrabe.py
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "img" / "kolkrabe.png"
FW, FH, BODY_X = 46, 30, 12

PAL = {
    "K": (7, 7, 13),        # Kontur
    "B": (30, 34, 58),      # Gefieder
    "b": (58, 65, 112),     # Gefieder-Licht
    "h": (107, 120, 184),   # Glanz
    "P": (36, 32, 58),      # Baskenmütze
    "p": (84, 76, 128),     # Mützen-Licht
    "T": (64, 64, 86),      # Rollkragen
    "t": (98, 98, 128),      # Rippen
    "G": (2, 2, 4),         # Ray-Ban-Gläser
    "g": (159, 211, 255),   # Glanz auf dem Glas
    "Y": (79, 85, 102),     # Schnabel
    "y": (138, 146, 168),   # Schnabel-Licht
    "L": (106, 111, 128),   # Beine
}

BODY = [
    "..............KK",
    "......KKKKKKKKpK",
    "....KKPPPPPPPPPPKK",
    "..KKPPpppPPPPPPPPPK",
    ".KPPPPPPPPPPPPPPPPPK",
    "..KKKKPPPPPPPPPPPKK",
    ".....KKKKKKKKKKKKK",
    ".....KBhBBBBBBBBBBK",
    ".....KBbBKKKKKKKKKKK",
    ".....KBbBKGGgGKGGgGK",
    ".....KBBBKGGGGKGGGGKKKK",
    ".....KBBBBKKKKBKKKKYyyyK",
    ".....KBBBBBBBBBKYYYYYYK",
    "......KBBBBBBBBBKKKKKK",
    ".....KTtTtTtTtTtTK",
    ".....KTTTTTTTTTTTK",
    "....KBTTTTTTTTTTTBK",
    "...KBbTTTTTTTTTTTBbK",
    "...KBbTTtTTTTTtTTBbK",
    "...KBbTTTTTTTTTTTBbK",
    "...KBBTTTTTTTTTTTBBK",
    "....KBTTTTTTTTTTTBK",
    ".....KTTTTTTTTTTTK",
    "..KKKBBKTTTTTTTKK",
    ".KBBBK..KLK.KLK",
    "KBbK....KLK.KLK",
    "KK.....KLLLKLLLK",
]

WING = [  # linker Flügel nach oben, unten rechts sitzt er an der Schulter an
    "KK..........",
    "KbKK........",
    "KBbbKK......",
    "KBBBbbKKK...",
    ".KBBBBBBbKK.",
    "..KBBBBBBBBK",
    "...KKBBBBBBK",
    ".....KKKKKK.",
]


def paint(img, ox, oy, rows):
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c in PAL and 0 <= ox + x < img.width and 0 <= oy + y < img.height:
                img.putpixel((ox + x, oy + y), PAL[c] + (255,))


def frame(wings):
    f = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    if wings:
        rows = WING if wings == "up" else WING[::-1]
        oy = 8 if wings == "up" else 17
        dark = [r.replace("b", "B") for r in rows]
        paint(f, BODY_X - 11, oy - 2, dark)      # ferner Flügel
        paint(f, BODY_X - 6, oy + 2, rows)      # naher Flügel, beide vom Rücken aus
    paint(f, BODY_X, 1, BODY)
    return f


sheet = Image.new("RGBA", (FW * 3, FH), (0, 0, 0, 0))
for i, w in enumerate((None, "up", "down")):
    sheet.paste(frame(w), (i * FW, 0))
sheet.save(OUT)
sheet.resize((FW * 3 * 6, FH * 6), Image.NEAREST).save("/tmp/kolkrabe-preview.png")
print("geschrieben:", OUT)
