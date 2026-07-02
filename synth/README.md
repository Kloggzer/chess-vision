# Synthetische Daten-Pipeline

Vollständige Pipeline vom 3D-Scan zur gelabelten Trainingsdaten-Quelle:
Turntable-Fotos → RealityScan → Isolierung → Render → Ingest → Training.

## Asset-Erwartungen

- **Blender-Szene:** `synth_assets/Chess Scene.blend` (Brett, Kamera, Beleuchtung)
- **Figuren-Vorlagen:** `synth_pieces/<X>.obj` + `<X>.png` (Textur)
  - Namensschema: `wP.obj`/`wP.png` (weißer Bauer), `bN.obj`/`bN.png` (schwarzer Springer),
    oder `P.obj`/`P.png` (farblos, wird dann für beide Farben verwendet).
  - Figuren ohne Scan fallen auf prozedurale Staunton-Vorlagen aus der .blend zurück.

## Ecken-Reihenfolge (VERTRAG — NICHT ÄNDERN)

Das JSON je Rendering enthält `corners: [a8, h8, h1, a1]` in **dieser Reihenfolge**.
Eine abweichende Reihenfolge vertauscht alle Labels stillschweigend (Spiegelung/Rotation).
Wächter-Test: `tests/test_ingest_synthetic.py::test_synthetic_ingest_orientation`.

## 1. Turntable-Aufnahme

```bash
python synth/capture_turntable.py --piece P --out data/turntable/P/
```

**Anti-Flicker-Hinweis:** Raumlicht dimmen, Bildstabilisierung der Kamera deaktivieren,
Weißabgleich und Belichtung fixieren (kein Automatik-Modus). Kamera auf Stativ.

## 2. RealityScan (Cloud)

Fotos hochladen → Mesh + Textur herunterladen. Ausgabe ist eine `.obj` + `.png`/`.jpg`.

## 3. Vorbereiten (isolieren + dezimieren + Qualitäts-Report) — `chesslab synth prepare`

**Empfohlener Weg — Blender muss nie geöffnet werden.** Scans nach `<in>/<Figur>/` legen
(Figurenname = Ordnername: `P`, `wN`, …; darin die RealityScan-Ausgabe — bevorzugt das rohe
`.obj` + `*_diffuse.png`; `.glb` geht auch, referenziert seine Textur aber meist extern,
also die diffuse-PNG mit in den Ordner):

```bash
uv run chesslab synth prepare --in scans_export/ --out synth_pieces/
```

Je Figur passiert automatisch (alle Schritte als Toggles):
- **Isolieren:** Unterlage per PCA finden, Figur-Cluster behalten (`--keep-radius`, Default 1.9),
  aufrecht stellen (Basis z=0, Achse +Z).
- **Aufräumen:** nur größte zusammenhängende Komponente (`--no-keep-largest` schaltet ab),
  offene Ränder/Basis schließen + Normalen nach außen (`--no-fill-holes`).
- **Dezimieren:** auf `--target-tris` (Default 20000; `0` = aus). RealityScan liefert Millionen
  Dreiecke — 32 Figuren davon sind unrenderbar; 20k pro Figur reichen für 1024px-Renders locker.
- **Glätten:** Laplacian mit Volumenerhalt gegen Scan-Bumps (`--smooth-iters`, 10 mild,
  25–40 stark, `0` = aus).
- **Qualität:** `<Figur>_report.json` (Dreiecke, Löcher, Proportionen) + `<Figur>_preview.png`
  (orthografische Seitenansicht). Die Zusammenfassung markiert [WARN] mit konkretem Hinweis.

**Qualität beurteilen:** Preview ansehen (aufrecht? Basis unten? Lücken?) + [WARN]-Hinweise lesen.
`height_ratio` außerhalb ~0.9–4.0 heißt fast immer: Isolierung hat den Hintergrund erwischt
(gewölbte Unterlage!) oder die Figur liegt — Unterlage flacher machen bzw. `--keep-radius` anpassen.
Viele `boundary_edges` = echte Scan-Löcher: zusätzliche Foto-Durchgänge auf 2–3 Kamerahöhen machen
(besonders flach für Einschnürungen wie den Bauern-Hals). Die absolute Größe ist egal: der
Renderer normiert auf Zielhöhe.

Manuell (ein einzelner Scan, gleiche Flags):

```bash
blender --background --python synth/isolate_piece.py -- \
    scan.obj diffuse.png "synth_pieces/P.obj" "synth_pieces/P_preview.png" --target-tris 20000
```

## 4. FEN-Liste erzeugen

```bash
uv run python synth/fens.py data/synth_fens.txt --n 200 --seed 42
```

## 5. Rendern

### Via CLI (empfohlen)

```bash
uv run chesslab synth render --out data/synth_raw --n 200 --fens data/synth_fens.txt
```

Optionen:
- `--blend` — Blender-Szene (Default: `synth_assets/Chess Scene.blend`)
- `--pieces-dir` — Figuren-Vorlagen (Default: `synth_pieces/`)
- `--n` — Anzahl Renderings (Default: 200)
- `--seed` — Seed (Default: 42)
- `--fens` — FEN-Liste (sonst Fallback Grundstellung)
- `--res` — Auflösung in px (Default: 1024)
- `--blender` — Blender-Executable (Default: `blender`, via Env `CHESSLAB_BLENDER`)

### Roh mit Blender (Alternative)

```bash
blender --background "synth_assets/Chess Scene.blend" \
    --python synth/render_chessboard.py \
    -- --out data/synth_raw --n 200 --seed 42 --res 1024 \
       --fens data/synth_fens.txt --pieces synth_pieces
```

## 6. Ingestieren

```bash
uv run chesslab ingest synthetic data/synth_raw --tag synth
```

**Visuelle Kontrolle VOR dem Training:**
```bash
uv run chesslab ingest synthetic data/synth_raw --tag synth --debug-overlay 8
```
Die Overlay-PNGs zeigen den entzerrten Crop + FEN-Label — prüfen, ob die Figuren auf den
richtigen Feldern landen.

## 7. Training

```bash
uv run chesslab train --dataset synth --head twostage --backbone mobilenet_v3_small
```

Oder Pretrain → Finetune mit dem synth-Datensatz als erster Curriculum-Stufe.
