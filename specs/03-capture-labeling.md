# Stufe 3 — Aufnahme & Auto-Labeling (`collect.py`, `labeling.py`)

## Zweck

Das Herzstück. Verbindet Kalibrierung (Stufe 1) und Spielzustand (Stufe 2): Frames
aufnehmen, in 64 Square-Crops zerlegen und jeden Crop **automatisch aus der FEN labeln**.
Aufnahme und Slicing sind getrennt, damit Slicing reproduzierbar und re-parametrierbar
bleibt.

## Teil 1 — Aufnahme (`collect`, in `collect.py`)

Schreibt **Rohframe + FEN** je bestätigter Stellung in ein Session-Log. Kein Slicing hier.

### CLI
```
chesslab collect pgn  --pgn <file> [--profile default] [--camera 0] [--every 1] [--session <id>]
chesslab collect live [--start-fen <FEN>] [--profile default] [--camera 0] [--session <id>]
```

### Session-Layout
```
data/sessions/<session_id>/
  session.yaml          # Metadaten (s.u.)
  frames/0000.png       # Rohframe (unverzerrt, volles Kamerabild)
  frames/0001.png
  log.jsonl             # je Zeile ein Aufnahmeeintrag
```

`session_id` default = Timestamp `YYYYMMDD-HHMMSS`. `session.yaml`:
```yaml
session_id: "20260625-201500"
profile: default              # verwendetes Kalibrierungsprofil
mode: pgn                     # oder live
source_pgn: "games/kasparov.pgn"   # nur bei pgn
created_at: "2026-06-25T20:15:00Z"
camera_index: 0
frame_size: [1280, 720]
notes: "Tageslicht, Deckenlampe aus"
```

`log.jsonl` je Zeile:
```json
{"frame": "frames/0007.png", "ply": 7, "fen": "rnbqkbnr/pp....", "ts": "...", "move_san": "Nf3"}
```

### Aufnahme-Loop (gemeinsam für beide Modi)
1. Kamera öffnen, Profil laden. **Warnen**, wenn `frame_size` von der Profil-Auflösung
   abweicht (Homographie passt dann nicht).
2. Live-Vorschau mit eingeblendetem Raster-Overlay (warpe-zurück oder zeige Warp-Fenster),
   plus aktuelle FEN / erwarteten nächsten Zug (PGN-Modus).
3. Nutzer macht den physischen Zug; Auslösen der Aufnahme per Taste (`Space`):
   - aktuellen Rohframe speichern,
   - Eintrag in `log.jsonl` mit der **aktuellen** FEN (nach dem Zug) schreiben,
   - Zustand fortschreiben (PGN: nächster Zug; live: vorher eingetippter Zug).
4. Tasten: `Space` = capture, `u` = undo letzte Aufnahme + Halbzug, `s` = Skip ohne Foto,
   `q` = Session beenden (schreibt `session.yaml`).
5. Mehrere Aufnahmen derselben Stellung sind erlaubt und erwünscht (leichte Varianz).
   Sie erben dieselbe `ply`/`fen`.

> Empfehlung in der Hilfe: pro Stellung 1–2 Frames; Beleuchtung zwischen Sessions
> variieren (Tag/Nacht, Lampe an/aus) — das deckt die häufigste reale Fehlerquelle ab.

## Teil 2 — Slicing & Labeling (`slice`, in `labeling.py`)

Liest Session-Logs, erzeugt gelabelte Square-Crops + Manifest-Einträge. **Reiner,
wiederholbarer Schritt** — bei geänderten Crop-Parametern einfach neu ausführen.

### CLI
```
chesslab slice --session <id> [--profile default]
               [--pad-up 1.6] [--pad-side 0.15] [--out-size 96x128]
chesslab slice --all                         # alle Sessions slicen
```
Crop-Parameter überschreiben die Profil-Defaults aus Stufe 1, wenn gesetzt.

### Ablauf je Frame
1. Rohframe laden, mit Profil-Homographie zu `board_size`-Quadrat warpen
   (`cv2.warpPerspective`).
2. Für alle 64 Felder: `square_to_crop_box(square, profile)` (zentrale Funktion aus
   Stufe 1) -> Crop aus dem entzerrten Bild, auf `out_size` resizen.
3. Label via `GameState.label_for(square)` aus der im Log gespeicherten FEN
   (Orientierung gemäß `white_pov`).
4. Crop speichern und Manifest-Zeile anhängen.

### Ausgabe-Layout
```
data/squares/<class>/<session>_<frame>_<square>.png     # ImageFolder-kompatibel
data/manifests/squares.jsonl                            # eine Zeile je Crop (append)
```

`squares.jsonl` je Zeile (vollständiges Schema, von Stufe 4 genutzt):
```json
{
  "path": "data/squares/wK/20260625-201500_0007_e1.png",
  "label": "wK",
  "session_id": "20260625-201500",
  "frame": "0007",
  "ply": 7,
  "square": "e1",
  "square_color": "dark",          // Feldfarbe a1=dark ... berechnet, nicht geraten
  "fen": "rnbqkbnr/...",
  "out_size": [96, 128],
  "ts": "..."
}
```

`square_color` deterministisch berechnen (`(file_idx + rank_idx) % 2`), denn Stufe 4
braucht die Abdeckung „jede Figur auf hell UND dunkel".

## Akzeptanzkriterien (Definition of Done)

- `collect` schreibt valide Sessions (Frames + `log.jsonl` + `session.yaml`); `undo`
  entfernt Frame **und** Log-Zeile konsistent.
- `slice` einer Session mit N geloggten Stellungen erzeugt genau `64*N` Crops und ebenso
  viele Manifest-Zeilen; Labels stimmen für eine bekannte Test-FEN nachprüfbar.
- Re-`slice` mit anderem `--pad-up` erzeugt neue Crops, ohne dass neu aufgenommen werden
  muss (Reproduzierbarkeit nachgewiesen).
- Stichprobe: für die Startstellung liegen genau 16 `empty`-Reihen … d. h. 32 besetzte +
  32 leere Crops, und ein Königs-Crop (`e1->wK`) zeigt visuell die ganze Figur (Crop nach
  oben erweitert, nicht geköpft).
- Falsche Orientierung wird durch einen Vergleich `label_for` vs. sichtbarem Crop in einem
  Debug-Kommando (`slice --preview <session>`) sichtbar gemacht.
