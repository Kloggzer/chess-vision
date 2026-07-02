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

## 3. Isolierung in Blender

Papier-Ebene per PCA finden → Figur-Cluster behalten → aufrecht stellen (Basis auf z=0,
Figur-Achse = +Z), exportieren. Argumente sind POSITIONAL: `<scan.obj> <textur> <ziel.obj> [preview.png]`:

```bash
blender --background --python synth/isolate_piece.py -- \
    scan.obj scan.jpg "synth_pieces/P.obj" "synth_pieces/P_preview.png"
```

Das Preview-PNG IMMER erzeugen und ansehen (steht die Figur aufrecht? Basis sauber?).
Textur manuell in `synth_pieces/P.png` kopieren/konvertieren (RealityScan liefert meist JPG).
Bei asymmetrischen Figuren (v. a. Springer) kann die PCA-Aufrichtung danebenliegen —
dann in der Blender-GUI nachdrehen und neu exportieren. Die absolute Größe ist egal:
der Renderer normiert auf Zielhöhe (`_load_scanned_mesh(target_h)`).

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
