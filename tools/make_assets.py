"""Bettet die Spielgrafiken als Data-URIs in js/assets.js ein.

So liest das Spiel seine Bilder nicht als Dateien, und der Browser markiert
die Zeichenfläche nie als "fremd". Dadurch funktionieren C64-Modus und
Fotomodus auch dann, wenn man index.html direkt aus dem Ordner öffnet.

    python tools/make_assets.py
"""
import base64, io, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FILES = ["dino-girl-sprite", "kolkrabe", "baby-dino", "bug", "dau-drache", "eichhoernchen",
         "enemy-bear", "enemy-fox", "enemy-giraffe", "enemy-hippo",
         "night-park-backdrop", "backdrop-rheinufer", "backdrop-kirmes", "backdrop-baustelle", "backdrop-weinberge",
         "backdrop-kneipen", "backdrop-burg", "backdrop-serverraum", "backdrop-rauschen", "backdrop-tunnel", "backdrop-disko"]

out = {}
for name in FILES:
    path = ROOT / "img" / f"{name}.png"
    data = path.read_bytes()
    if name == "night-park-backdrop":  # großes Bild: auf 1280x720 und eine Pixel-Palette bringen
        im = Image.open(path).convert("RGB").resize((1280, 720), Image.LANCZOS).quantize(colors=96, method=Image.MEDIANCUT, dither=Image.NONE)
        buf = io.BytesIO(); im.save(buf, "PNG", optimize=True); data = buf.getvalue()
    out[f"img/{name}.png"] = "data:image/png;base64," + base64.b64encode(data).decode()

js = "/* Automatisch erzeugt von tools/make_assets.py – nicht von Hand bearbeiten. */\nwindow.DINO_ASSETS = " + json.dumps(out, separators=(",", ":")) + ";\n"
(ROOT / "js" / "assets.js").write_text(js)
print(f"js/assets.js: {len(js)//1024} KB, {len(out)} Bilder")
