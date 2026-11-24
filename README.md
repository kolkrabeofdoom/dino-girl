# Adventures of the Dino Girl – Nachtpark

Vollständige lokale Projektkopie des Jump-and-Runs.

## Lokal starten

Im Ordner `Dino Girl`:

```powershell
python server.py
```

Danach `http://localhost:8000` im Browser öffnen.

## Steuerung

- `A` / `D` oder Pfeiltasten: Laufen
- `W`, Pfeil hoch oder Leertaste: Springen
- Leertaste zweimal drücken: höherer Double Jump
- `F` oder `X`: Stofftier-Eisbär werfen
- Trampoline: draufspringen, in der Luft lenken
- `Esc`: Pause

Auf Touch-Geräten stehen Bildschirmtasten einschließlich einer `BÄR`-Taste bereit.

## Kapitel

**Kapitel 1 · Nachtpark** – Nachtpark, Dächerweg, Altstadt. Am Ende wartet das Dino-Nest.

**Kapitel 2 · Das verschwundene Ei** – wird nach Kapitel 1 freigeschaltet (oder direkt über `?kapitel=2`):

- **Level 04 · Rheinufer** – Kaimauern, Wasser statt Abgrund, Boote als bewegte Plattformen
- **Level 05 · Kirmes** – Trampoline, Riesenrad-Gondel, Lichterketten
- **Level 06 · Baustelle** – Stahlträger und Kranlasten (waagerecht und als Aufzug)
- **Finale · Kranplatz** – Bosskampf gegen den großen Bären, der das dritte Ei geklaut hat

Neu in Kapitel 2: Herzen (+1 Leben), schwebende Plattformen sind von unten durchspringbar,
Soundeffekte (Taste ♪ oben rechts), der Fortschritt wird im Browser gespeichert.

## Neue Level bauen

Alle Level-Daten stehen in `js/levels.js` (Bodenstücke, Plattformen, Münzen, Gegner, Trampoline …).
Die Engine in `js/jump.js` muss dafür nicht angefasst werden.
Neue Pixel-Hintergründe erzeugt `python tools/make_backdrops.py` (benötigt Pillow).

## Ordner

- `index.html`, `style.css`, `js/levels.js`, `js/jump.js`: direkt spielbare Fassung
- `tools/`: Generator für die Pixel-Hintergründe
- `public/`: veröffentlichte Web-Assets
- `app/`, `worker/`, `build/`: Hosting-Anwendung
- `img/`: aufbereitete Spielgrafiken
- `source-assets/`: alle ursprünglich bereitgestellten Referenz- und Spritegrafiken
- `tmp/sprite-work/`: erhaltene Zwischenfassung des Dino-Girl-Sprites

Veröffentlichte Version:
https://dino-girl-crystal-dash.frankgkroener.chatgpt.site
