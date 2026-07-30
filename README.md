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
- `Esc`: Pause

Auf Touch-Geräten stehen Bildschirmtasten einschließlich einer `BÄR`-Taste bereit.

## Ordner

- `index.html`, `style.css`, `js/jump.js`: direkt spielbare Fassung
- `public/`: veröffentlichte Web-Assets
- `app/`, `worker/`, `build/`: Hosting-Anwendung
- `img/`: aufbereitete Spielgrafiken
- `source-assets/`: alle ursprünglich bereitgestellten Referenz- und Spritegrafiken
- `tmp/sprite-work/`: erhaltene Zwischenfassung des Dino-Girl-Sprites

Veröffentlichte Version:
https://dino-girl-crystal-dash.frankgkroener.chatgpt.site
