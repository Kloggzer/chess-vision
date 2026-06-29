# Stufe 1 — Kalibrierung (`calibration.py`)

## Zweck

Die geometrische Beziehung zwischen Kamerabild und Brett **einmalig** bestimmen und als
wiederverwendbares Profil speichern. Solange Kamera und Brett unbewegt bleiben, liefert
dieses Profil für jeden späteren Frame deterministisch die 64 Square-Crops.

## CLI

```
chesslab calibrate new      --camera 0 [--profile default] [--board-size 800]
chesslab calibrate check    [--profile default] [--camera 0]
chesslab calibrate list
```

- `new`: interaktive Erstellung eines neuen Profils.
- `check`: Live-Overlay des 8x8-Rasters auf das Kamerabild zur Sichtkontrolle.
- `list`: vorhandene Profile in `data/calibration/` anzeigen.

## Ablauf von `calibrate new`

1. Kamera mit `cv2.VideoCapture(camera_index)` öffnen. Falls kein Frame kommt: klare
   Fehlermeldung (siehe Edge Cases), Exit-Code != 0.
2. Live-Bild in einem OpenCV-Fenster zeigen. Nutzer drückt `c` (capture) für ein
   Standbild, auf dem geklickt wird (eingefrorenes Bild klickt sich präziser).
3. Nutzer klickt **vier Brett-Ecken in fester Reihenfolge**: `a8, h8, h1, a1`
   (im Bild: obere äußere Ecke des a8-Feldes zuerst usw.). Jede gesetzte Ecke wird als
   Punkt + Reihenfolge-Index eingeblendet. `u` = letzten Punkt rückgängig, `r` = reset.
4. Aus den vier Bildpunkten und den vier Zielpunkten eines Quadrats der Kantenlänge
   `board_size` die **Homographie** `H` per `cv2.getPerspectiveTransform` berechnen.
5. Orientierung abfragen/festlegen: Welche physische Seite spielt von „unten" (Weiß
   unten ist Default). Wird als `white_pov: true/false` gespeichert.
6. Vorschau: warpe das Bild mit `H` und zeichne das 8x8-Raster + Felderbeschriftung.
   Nutzer bestätigt mit `s` (save) oder verwirft mit `q`.
7. Profil als YAML nach `data/calibration/<profile>.yaml` schreiben.

## Datenmodell — Kalibrierungsprofil (YAML)

```yaml
profile: default
created_at: "2026-06-25T20:00:00Z"
camera_index: 0
frame_size: [1280, 720]        # gemessene Auflösung der Quelle
board_size: 800                # Kantenlänge des entzerrten Brettquadrats in px
image_corners:                  # angeklickte Bildpunkte, Reihenfolge a8,h8,h1,a1
  - [x_a8, y_a8]
  - [x_h8, y_h8]
  - [x_h1, y_h1]
  - [x_a1, y_a1]
homography: [[...],[...],[...]] # 3x3, row-major
white_pov: true                 # Weiß spielt von der unteren Bildkante
crop:
  cell: 100                     # board_size / 8
  pad_up: 1.6                   # Crop-Höhe = cell * (1 + pad_up) nach OBEN erweitert
  pad_side: 0.15                # seitliche Erweiterung je Seite, * cell
  out_size: [96, 128]           # [W, H] der gespeicherten Square-Crops (H > W!)
```

### Hinweise zum `crop`-Block (kritisch)

- 3D-Figuren ragen im Bild nach oben (Richtung hintere Reihe). Ein strenger
  100x100-Cell-Crop würde Damen/Könige köpfen. Deshalb wird der Crop **nach oben**
  verlängert: Höhe = `cell * (1 + pad_up)`, verankert an der **unteren** Feldkante.
- `out_size` ist absichtlich **höher als breit** (z. B. 96x128), damit die volle Figur
  reinpasst. Trainings- und Inferenzpipeline müssen exakt dieselbe `out_size` nutzen.
- `pad_up`/`pad_side` sind Defaults; sie können in Stufe 3 (`slice`) überschrieben und
  neu evaluiert werden, ohne neu aufzunehmen.

## Square-Mapping (verbindliche Referenz für alle Stufen)

Implementiere eine reine Funktion, die zentral lebt (z. B. in `labeling.py`, von Stufe 1
nur zur Vorschau genutzt):

```
def square_to_crop_box(square: str, profile) -> tuple[int,int,int,int]
    # square z.B. "e4" -> (x0, y0, x1, y1) im entzerrten board_size-Bild
```

Mapping-Regeln im entzerrten Bild (Ursprung oben links):
- Spalte (file) `a..h` -> x-Index `0..7`; Zeile (rank) `8..1` -> y-Index `0..7`.
- Bei `white_pov: true` liegt `a8` oben links, `h1` unten rechts (Standard-Brettbild).
- Bei `white_pov: false` Brett um 180° gedreht mappen.
- Basiszelle: `x0c = col*cell`, `y0c = row*cell`, dann den Crop nach oben/seitlich gemäß
  `crop` erweitern und auf Bildgrenzen clampen.

## Akzeptanzkriterien (Definition of Done)

- `chesslab calibrate new` erzeugt ein valides YAML-Profil; erneuter Aufruf mit gleichem
  `--profile` fragt vor Überschreiben nach.
- `chesslab calibrate check` zeigt das Raster sauber deckungsgleich auf den realen
  Feldern; Beschriftung `a1`/`h8` sitzt an der laut Orientierung erwarteten Stelle.
- `square_to_crop_box("a8", ...)` und `("h1", ...)` liefern Boxen in den korrekten
  gegenüberliegenden Ecken (durch Unit-Test abgesichert).
- Profil ist ohne Kamera ladbar (reine YAML-Deserialisierung, für Tests/Stufe 3).

## Edge Cases

- Kamera nicht verfügbar / falscher Index -> Fehlermeldung mit Hinweis, verfügbare
  Indizes durchzuprobieren; sauberer Exit.
- Unter Windows ggf. `cv2.CAP_DSHOW`-Backend für stabilere Webcam-Öffnung erlauben
  (Konfig-Flag).
- Weniger/mehr als 4 Klicks vor `save` -> `save` blockieren, Hinweis ausgeben.
- Sehr schräge Winkel: Warp-Vorschau kann verzerren; das ist okay, solange das Raster
  passt. Nutzer entscheidet visuell.
