# Adventures of the Dino Girl

Vollständige lokale Projektkopie des Jump-and-Runs.

## Lokal starten

Im Ordner `Dino Girl`:

```powershell
python server.py
```

Danach `http://localhost:8000` im Browser öffnen.

## Steuerung

- `A` / `D` oder Pfeiltasten: Laufen
- `W`, Pfeil hoch oder Leertaste: Springen, nochmal in der Luft: Double Jump
- `S` oder Pfeil runter in der Luft: **Stampf-Attacke** (befreundet Gegner im Umkreis, auf Trampolinen: Super-Boing)
- `S` vor einem Rausch-Fernseher: hineinsteigen
- `F` oder `X`: Stofftier-Eisbär werfen
- `P`: Fotomodus (←/→ Kamera, `F` Filter, `R` Rahmen, `Enter` speichert ein PNG)
- `M`: Musik an/aus · `C`: C64-Modus · `G`: Geisterläufer an/aus · `Esc`: Pause
- **Gamepad**: Stick/Steuerkreuz laufen, A springen, X/B werfen, runter stampfen, Start pausiert

Auf Touch-Geräten gibt es Bildschirmtasten inklusive `↓` zum Stampfen.

## Kapitel

1. **Nachtpark**: Nachtpark, Dächerweg, Altstadt. Irgendwo steht ein rauschender Fernseher …
2. **Das verschwundene Ei**: Rheinufer, Kirmes, Baustelle, Bosskampf gegen den großen Bären, danach schlüpft der Baby-Dino.
3. **Die Lahn hinauf**: Weinberge mit Seilbahn, Kneipenviertel, Burg Lahneck. Der Baby-Dino läuft mit und sammelt Münzen.
4. **Serverraum**: Rechenzentrum, Kühlgang mit Lüfter-Aufwind, Kabelsalat voller Bugs, die sich vermehren, Finale gegen den DAU-Drachen.
5. **Der Kuchen-Klau**: Verfolgungsjagd mit Autoscroll über die B42, durch den Tunnel und über die Brücke, immer dem Kuchen-Lieferwagen nach.
6. **Disko-Nacht**: Plattformen und Laser schalten im Takt der Musik, am Ende legt der Kolkrabe am DJ-Pult auf.
- **Bonus · Rauschen**: Geheimlevel hinter dem Fernseher, Berlin-School-Ambient, Münzen gehen direkt ins Laden-Konto.

Kapitel werden nacheinander freigeschaltet. Zum Testen: `index.html#kapitel-6` (schaltet alles frei), `#spaet` erzwingt die Nachtschicht.

## Was sonst noch drin ist

- **Freunde statt Feinde**: Getroffene Gegner setzen sich hin, entschuldigen sich und schicken Herzchen. Beim Schlüpfen sitzen sie alle ums Nest.
- **Gegner mit Charakter**: Der Fuchs hüpft, die Giraffe bemerkt dich und sprintet los, das Nilpferd rollt sich ein und ist danach schwindelig, der Bär hält zwei Eisbär-Treffer aus.
- **Eichhörnchen-Laden**: Gesammelte Münzen landen im Laden-Konto. Es gibt Doppelwurf, Bumerang-Bär, Extra-Herz und vier Hüte.
- **Zeitrennen**: Zeit im HUD, Bestzeit und Highscore pro Kapitel. Die beste Runde läuft als Geist mit.
- **Nachtschicht**: Zwischen 22 und 5 Uhr wird das Spiel dunkler, Laternen und Fackeln leuchten stärker, und der Kolkrabe ist müde.
- **C64-Modus**: Echte 16-Farben-Palette, dicke Pixel, Scanlines, SID-artiger Klang und LOAD-Bildschirm.
- **Soundtrack**: 14 Chiptune-Stücke (`js/music.js`) auf einem eigenen WebAudio-Sequencer, ohne Audiodateien.
- **Kolkrabe of Doom** landet an jedem Checkpoint und kommentiert, was du in der Zone davor angestellt hast („ZWEIMAL INS WASSER. RESPEKT.“).
- **Freunde helfen mit**: Wer eine Tierart schon einmal befreundet hat, bekommt später Hilfe. Der Fuchs zeigt versteckte Münzen, Nilpferde bilden eine Brücke, die Giraffe reicht ein Herz herunter, der Bär macht Räuberleiter. Im Drachenkampf kommt der große Bär zu Hilfe.
- **Wetter**: Regen mit Pfützenglanz, Herbstlaub, Schnee, Funkenflug, Konfetti, Glühwürmchen.
- **Sticker-Album** mit 26 Stickern, **Fotomodus** mit Sepia/Noir/Nacht/C64-Filter und CRT- oder Polaroid-Rahmen.
- **Kinder-Modus**: zwei Herzen mehr, langsamere Gegner, schwächere Bosse, Abstürze kosten nichts, Disko-Plattformen bleiben stehen.

## Level-Editor

`editor.html` öffnen. Ein Kapitel als Vorlage laden oder leer anfangen, Objekte mit den Werkzeugen links setzen,
mit dem Zeiger verschieben (Plattformen am rechten Rand breiter ziehen), Zonen rechts einstellen (Hintergrund, Musik,
Material, Lücken). **TESTSPIELEN** startet das Level direkt im Spiel, im Menü erscheint es danach als „Eigenes Level“.
**EXPORT** liefert JSON, das sich auch als neues Kapitel in `js/levels.js` eintragen lässt.

## Grafiken neu erzeugen

    python tools/make_backdrops.py   # Hintergründe
    python tools/make_kolkrabe.py    # Kolkrabe
    python tools/make_sprites.py     # Baby-Dino, Eichhörnchen, Bug, DAU-Drache
    python tools/make_assets.py      # bettet alle Spielgrafiken in js/assets.js ein (danach immer ausführen)

Durch das Einbetten funktionieren C64-Modus und Fotomodus auch, wenn `index.html` direkt aus dem Ordner geöffnet wird.

## Ordner

- `index.html`, `style.css`, `js/levels.js`, `js/music.js`, `js/jump.js`: direkt spielbare Fassung
- `editor.html`, `js/editor.js`: Level-Editor
- `js/music.js`: Chiptune-Sequencer und Stücke
- `tools/`: Generatoren für Pixel-Hintergründe und den Kolkraben
- `public/`: veröffentlichte Web-Assets
- `app/`, `worker/`, `build/`: Hosting-Anwendung
- `img/`: aufbereitete Spielgrafiken
- `source-assets/`: alle ursprünglich bereitgestellten Referenz- und Spritegrafiken
- `tmp/sprite-work/`: erhaltene Zwischenfassung des Dino-Girl-Sprites

Veröffentlichte Version:
https://dino-girl-crystal-dash.frankgkroener.chatgpt.site
