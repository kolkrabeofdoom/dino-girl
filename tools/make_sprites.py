"""Pixel-Sprites für Kapitel 3/4 und den Laden.

    python tools/make_sprites.py

Erzeugt in img/:
  baby-dino.png     3 Frames à 22x20 (Laufen A, Laufen B, Sitzen)
  eichhoernchen.png 2 Frames à 30x32 (Ladenbesitzer, Kroketten-Biss)
  bug.png           2 Frames à 18x14
  dau-drache.png    2 Frames à 56x44 (Flügel oben/unten)
Alle Frames liegen nebeneinander und werden im Spiel ohne Glättung skaliert.
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "img"


def sheet(name, frames, pal, w, h):
    img = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, rows in enumerate(frames):
        for y, row in enumerate(rows):
            for x, c in enumerate(row):
                if c in pal and x < w and y < h:
                    img.putpixel((i * w + x, y), pal[c] + (255,))
    img.save(OUT / name)
    img.resize((img.width * 6, img.height * 6), Image.NEAREST).save(f"/tmp/prev-{name}")
    print("geschrieben:", OUT / name)


# ---------------------------------------------------------------- Baby-Dino
BABY_PAL = {
    "K": (10, 14, 10), "G": (104, 178, 58), "g": (60, 120, 36), "l": (168, 226, 104),
    "W": (255, 255, 255), "E": (16, 16, 24), "Y": (236, 226, 164), "S": (255, 240, 189),
    "r": (255, 101, 79), "P": (255, 150, 150),
}
BABY_TOP = [
    "......KKKKK...........",
    ".....KSSrSSK..........",
    "....KSrSSSSrK.........",
    "....KKKKKKKKKK........",
    "...KGGGGGGGGGGK.......",
    "..KGGlGGGGGWWGGK......",
    "..KGlGGGGGGWEEGGKK....",
    "..KGGGGGGGGWEEGGGGK...",
    "..KGGGGGGGGGGGGGGGGK..",
    "..KgGGGGGPGGGGGGKKKK..",
    "...KgGGGGGGGGGGK......",
    "....KKgGGGGGGKK.......",
    "..KK.KGYYYYGGK........",
    ".KgGKKGYYYYGGGK.......",
    "KgGGGKGYYYYGGK........",
    ".KKKKKGGYYGGGK........",
]
BABY_A = BABY_TOP + [
    "......KGGKKGGK........",
    ".....KgGK.KgGK........",
    ".....KKKK.KKKK........",
    "......................",
]
BABY_B = BABY_TOP + [
    ".......KGGGGK.........",
    "......KgGKgGK.........",
    "......KKKKKKK.........",
    "......................",
]
BABY_SIT = ["......................"] + BABY_TOP[:-1] + [
    ".KKKKKGGYYGGGK........",
    "....KgGGGGGGGGK.......",
    "....KKKKKKKKKKK.......",
    "......................",
]

# ---------------------------------------------------------------- Eichhörnchen
SQ_PAL = {
    "K": (20, 10, 6), "O": (198, 98, 34), "o": (140, 62, 20), "L": (240, 150, 70),
    "C": (250, 226, 190), "W": (255, 255, 255), "E": (18, 12, 10), "N": (60, 30, 24),
    "B": (214, 160, 64), "b": (150, 96, 30), "A": (46, 80, 140), "a": (80, 120, 190),
}
SQ_BASE = [
    "..................KKKK........",
    "........KK.KK....KOOOOK.......",
    ".......KOK.KOK..KOLLOOOK......",
    ".......KOOKKOOK.KOOLOOOOK.....",
    "......KOOOOOOOOKKOOOLOOOK.....",
    ".....KOWWWOOWWWOKOOOOLOOK.....",
    ".....KWWEEWWWEEWOKOOOOLOOK....",
    ".....KWWEEWWWEEWOKOOOOOLOK....",
    ".....KOWWWOOWWWOOKOOOOOLOK....",
    ".....KOOOOONOOOOOKOOOOOOOK....",
    "......KOCCCCCCCOKKOOOOOLOK....",
    ".......KOCCCCCOKKOOOOOOLOK....",
    "........KKAAAKKOOOOOOOLOK.....",
    ".......KAaAAAAAKOOOOOOLOK.....",
]
SQ_IDLE = SQ_BASE + [
    "......KAaAAAAAAAKOOOOLOOK.....",
    ".....KOKAaAAAAAKOKOOOLOK......",
    ".....KOKAAAAAAAKOKOOLOOK......",
    "....KBBBKAAAAAKKKOOOLOK.......",
    "....KBbBKAAAAAKOOOLOOK........",
    "....KBBBKAAAAAKOOOOOK.........",
    ".....KKKKOOOOOOKOOOK..........",
    "........KOOKKOOKKKK...........",
    ".......KooK.KooK..............",
    ".......KKKK.KKKK..............",
]
SQ_BITE = SQ_BASE[:10] + [
    "......KOCCCKBBBKKOOOOOLOK.....",
    ".......KOCCKBbBKKOOOOOLOK.....",
    "........KKAKBBBKOOOOOOLOK.....",
    ".......KAaAKKKKKKOOOOOLOK.....",
    "......KAaAAAAAAAKOOOOLOOK.....",
    ".....KOKAaAAAAAKOKOOOLOK......",
    ".....KOKAAAAAAAKOKOOLOOK......",
    ".....KKKKAAAAAKKKOOOLOK.......",
    "........KAAAAAKOOOLOOK........",
    "........KAAAAAKOOOOOK.........",
    ".....KKKKOOOOOOKOOOK..........",
    "........KOOKKOOKKKK...........",
    ".......KooK.KooK..............",
    ".......KKKK.KKKK..............",
]

# ---------------------------------------------------------------- Bug
BUG_PAL = {"K": (8, 6, 14), "V": (84, 40, 120), "v": (130, 70, 180), "G": (90, 255, 140), "R": (255, 60, 60), "L": (60, 50, 80)}
BUG_BODY = [
    "......KKKKK.......",
    "....KKVvVVVKK.....",
    "...KVvGVVVGVVK....",
    "..KVvVGGGGGVVVKKK.",
    "..KVVVVVGVVVVKRRK.",
    "..KVGGGGGVVVVKRRK.",
    "..KVVVVGVVVVVKKKK.",
    "...KVVVGGGGVVK....",
    "....KKVVVVVKK.....",
    "......KKKKK.......",
]
BUG_A = BUG_BODY + ["....L..L..L.......", "...L..L..L........", "..................", ".................."]
BUG_B = BUG_BODY + [".....L..L..L......", "......L..L..L.....", "..................", ".................."]

# ---------------------------------------------------------------- DAU-Drache
DR_PAL = {
    "K": (12, 6, 20), "P": (128, 62, 178), "p": (88, 36, 130), "L": (176, 110, 226),
    "Y": (240, 206, 120), "W": (255, 255, 255), "E": (20, 10, 20), "R": (255, 70, 60),
    "H": (40, 40, 48), "h": (110, 110, 130), "M": (240, 240, 230), "m": (120, 70, 40),
    "w": (70, 30, 100), "F": (255, 170, 60),
}
DR_BODY = [
    "...........................KK...KK......................",
    "..........................KPK..KPK......................",
    ".........................KPPKKKPPK......................",
    "........................KHHHHHHHHHK.....................",
    ".......................KHPPPPPPPPPHK....................",
    "......................KhKPPPPPPPPPKhK...................",
    "......................KhKPPWWPPWWPKhK...................",
    "......................KhKPPWEPPWEPPKKK..................",
    "......................KHKPPPPPPPPPPPPPK.................",
    ".......................KKPPPPPPPPPPPPPPKK...............",
    ".......................KhKPPPPPPPKKRRKPPPK..............",
    "......................KhKKPPPPPPPPKKKKPPPK..............",
    "......................KKKKKKPPPPPPPPPPPPK...............",
    ".........................KYKKPPPPPPPPPKK................",
    "........................KYYYKKPPPPPKK...................",
    ".......................KPYYYYPPPPPPPK...................",
    "......................KPPYYYYYPPPPPPPK..KMMMK...........",
    ".....................KPPPYYYYYPPPPPKPPKKMMMMKK..........",
    ".....................KPPPYYYYYPPPPPKPPPKMmmMKMK.........",
    "....................KPPPPYYYYYPPPPPPKKKKMMMMKMK.........",
    "....................KPPPPYYYYYYPPPPPK...KMMMKK..........",
    "....................KPPPPYYYYYYPPPPPK....KKK............",
    ".....KK.............KPPPPPYYYYYPPPPK....................",
    "....KPPK............KPPPPPYYYYYPPPPK....................",
    "...KPPPPKK.........KPPPPPPYYYYPPPPPK....................",
    "....KKPPPPKK......KPPPPPPPPPPPPPPPPK....................",
    "......KKPPPPKKKKKKPPPPPPPPPPPPPPPPK.....................",
    "........KKPPPPPPPPPPPPPKPPPPKPPPPK......................",
    "..........KKKKPPPPPPPPKKPPPKKPPPK.......................",
    "..............KKKKKKKKKKYKKKKYKKK.......................",
    ".........................................................",
]
WING_UP = [
    "...KK.......",
    "..KwLK......",
    ".KwLLLK.....",
    "KwLLLLLK....",
    "KwwLLLLLK...",
    ".KwwLLLLLK..",
    "..KwwwLLLLK.",
    "...KKwwwLLK.",
    ".....KKKwwK.",
    "........KK..",
]


def dragon(wings_up):
    rows = [list(r.ljust(56, ".")) for r in DR_BODY] + [list("." * 56) for _ in range(44 - len(DR_BODY))]
    wing = WING_UP if wings_up else WING_UP[::-1]
    oy = 6 if wings_up else 15
    for y, r in enumerate(wing):
        for x, c in enumerate(r):
            tx, ty = 8 + x, oy + y
            if c != "." and rows[ty][tx] == ".":
                rows[ty][tx] = c
    if not wings_up:  # kleiner Flammenhauch beim Flügelschlag
        for x in range(42, 48):
            rows[11][x] = "F" if x % 2 else rows[11][x]
    return ["".join(r) for r in rows]


if __name__ == "__main__":
    sheet("baby-dino.png", [BABY_A, BABY_B, BABY_SIT], BABY_PAL, 22, 20)
    sheet("eichhoernchen.png", [SQ_IDLE, SQ_BITE], SQ_PAL, 30, 32)
    sheet("bug.png", [BUG_A, BUG_B], BUG_PAL, 18, 14)
    sheet("dau-drache.png", [dragon(True), dragon(False)], DR_PAL, 56, 44)
