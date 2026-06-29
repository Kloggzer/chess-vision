# chesslab

Build a high-quality, **auto-labeled** image dataset for recognizing chess pieces on a
physical board filmed by a fixed USB webcam, then train a per-square 13-class classifier.
Labels are not annotated by hand — they are derived from the known game state (FEN, via
`python-chess`). One photo of a position yields 64 labeled training examples.

See [`CLAUDE.md`](CLAUDE.md) for the full design and [`specs/`](specs/) for the staged
specifications. Build proceeds stage by stage.

## Install

PyTorch is **not** installed by this package — the ROCm build (AMD Radeon RX 7900 XTX) is
expected to be pre-installed from `https://download.pytorch.org/whl/rocm6.x`. `chesslab`
only validates it.

```bash
uv sync                 # creates .venv, installs runtime + dev deps from uv.lock
```

Run commands through the env with `uv run` (e.g. `uv run chesslab doctor`).

> **PyTorch (ROCm) ist in `uv.lock` gepinnt** — auf die lokalen Wheels in `wheels/` mit
> Windows+Python-3.12-Marker. Dadurch ist **`uv sync` sicher**: es installiert/behält
> torch + ROCm-SDK aus den Wheels, statt sie zu entfernen. `uv sync` ist der
> Setup-/Reparatur-Befehl (siehe `repair-env.ps1`).
>
> Voraussetzungen: die Wheels müssen in `wheels/` liegen (git-ignored, lokal — siehe
> „PyTorch (ROCm)"-Hinweis unten) und Python **3.12**. Kommt „Zugriff verweigert" auf eine
> ROCm-DLL, sperrt ein laufender Python-Prozess sie → Terminals schließen / neu starten,
> dann `uv sync`. Auf Linux/Rig schließt der Marker torch aus (eigene ROCm-Umgebung dort).

## Schnellstart — die 3 wichtigsten Befehle (Windows / ROCm)

```powershell
# 1) Daten sammeln mit Live-Dashboard (zeigt Klassen-Lücken), dann zu gelabelten Crops slicen
uv run chesslab collect play --strategy random --max-plies 60 --ui
uv run chesslab slice --all

# 2) Split MIT Klassen-Balancing: empty + Bauern runter, jede Figur <= 3x die seltenste (nur train)
uv run chesslab split --max-empty-ratio 1.5 --max-class-ratio 3

# 3) Training (stabile ROCm-Windows-Konfig: GroupNorm-Default, kleine Batch, ohne AMP)
uv run chesslab train --backbone smallcnn --epochs 30 --batch-size 32 --no-amp
```

Danach evaluieren: `uv run chesslab eval --run data/models/run-<ts> --split test`
(`<ts>` = das von `train` ausgegebene Run-Verzeichnis). Beim Training auf **`macro_recall`**
achten (nicht `val_acc` — die ist durch `empty` verzerrt).

## Web-UI (lokal)

Eine kleine Browser-Oberfläche für **Datensatz-Einsicht, Relabeln und Training** —
deutlich angenehmer als die OpenCV-Fenster. Nutzt die bestehende Pipeline; keine Kamera.

```powershell
uv run chesslab web                          # -> http://127.0.0.1:8000  (fastapi/uvicorn sind in den Deps)
```

- **Datensätze:** zwei Phasen. **Sessions (Rohmaterial):** je Session *Slicen/Neu slicen*,
  *Archivieren* (aus dem Datensatz nehmen, Frames bleiben, umkehrbar) / *Löschen*. Nach dem
  Sammeln wird automatisch gesliced. **Kuratierte Datensätze:** benannte Datensätze aus einer
  frei wählbaren **Session-Menge** (Teilmenge/alle/disjunkt/überlappend) bauen — mit **Dedup**
  (Cap je `(Session,Feld,Figur)` **+** Perceptual-Hash gegen nie bewegte Figuren) und optionaler
  **Rotation 90/180/270°** (4× Crops; Toggle, A/B-testbar — widerspricht der Fixkamera-Annahme).
  Logik in `dataset_build.py`, je Datensatz `data/datasets/<name>/{manifest.jsonl,split.json,stats.json}`;
  Crops für rot=0 referenzieren den globalen Pool (kein Kopieren). Training/Eval zeigen auf einen
  Datensatz (`train --dataset <name>`) → der `split.json`-Fehler beim Training ohne Split ist weg.
  CLI: `chesslab dataset build <name> --sessions s1,s2 [--cap 4] [--no-phash] [--no-rotate]`.
  (Die alte Session-Verwaltung lebt weiter in `sessions.py`, Archiv unter `data/sessions_archive/`.)
- **Inference (Active Learning):** Modell wählen → Live-Auswertung der Kamera: pro Feld
  Vorhersage-Glyph + Confidence-Farbe + geschätzte FEN. „Snapshot als Trainingsdaten" speichert
  die Stellung als `mode="inference"`-Session (mit den vorhergesagten Labels) und sliced sie —
  danach im Review korrigieren (v.a. **verdeckte Felder**) und neu bauen. So wächst der Datensatz.
- **Review/Relabel:** Session + Frame + Modell wählen → größeres 8×8-Brett, **Auto-Load**,
  **◀ ▶ / Pfeiltasten**. **Label-Palette + Pinsel** (Klasse wählen → Felder klicken setzt direkt;
  Tasten `e`=leer `x`=verdeckt `p/n/b/r/q/k`=Figur, `Esc`=Cyceln), **„Vorschläge übernehmen"**
  (alle Modell-Labels als Korrektur). Speichern → `corrections.jsonl` → neu slicen. Inferenz CPU.
- **Training:** **Datensatz** + Hyperparameter (Backbone / Epochs / Batch / LR) wählen;
  Fortschrittsbalken (Epoche i/N, board_acc); Metrik-Kurven, Eval + Confusion-Matrix.
  **Weiter-trainieren:** „Weiter ab" = Warm-Start aus einem früheren Run (`train --resume <run>`)
  — passende Gewichte werden übernommen, ein bei geänderter Klassenzahl (z.B. neue Klasse
  `occluded`) inkompatibler Kopf wird neu initialisiert (Rumpf transferiert). Ergebnis landet in
  einem **neuen** Run (`resumed_from` in dessen `config.json`), der alte bleibt erhalten.

**14. Klasse `occluded`** (Feld von Hand/Objekt verdeckt): kommt **nie aus der FEN**, nur über
Inference/Review-Labels; `empty`/`occluded` sind „dürfen fehlen"-Klassen (keine Warnung). Modell/
Training/Eval skalieren automatisch über `len(classes)`; alte 13-Klassen-Runs bleiben gültig.

Die Oberfläche ist eine **React + Tailwind + lucide-react + TanStack Query + react-router**-App
(Quelle in `src/chesslab/web/frontend/`, gebaut nach `src/chesslab/web/static/`). Jede Ansicht hat
eine **URL** (`/datensaetze/statistik` …) → **F5 bleibt**, Browser-Zurück funktioniert (FastAPI
liefert für Client-Routen `index.html`). Daten laden beim View-Wechsel automatisch — **kein
Hard-Reload** nötig. Das gebaute Frontend ist eingecheckt — zum Ändern:

```bash
cd src/chesslab/web/frontend && npm install && npm run build
```


## Stages

| Stage | Command(s) | Status |
|-------|------------|--------|
| 0 — Pre-flight | `chesslab doctor [--gpu] [--camera N] [--json]` | ✅ implemented |
| 1 — Calibration | `chesslab calibrate new\|check\|list` | ✅ implemented |
| 2 — Game state | (library) | ✅ implemented |
| 3 — Capture & label | `chesslab collect pgn\|live`, `chesslab slice` | ✅ implemented |
| 4 — Dataset | `chesslab stats\|split`, `chesslab dataset verify` | ✅ implemented |
| 5 — Training | `chesslab train\|eval\|export` | ✅ implemented |
| 6 — Collection UI | `chesslab collect ... --ui`, `chesslab ui` | ✅ implemented |

## Stage 0 — `doctor` (pre-flight)

Validates the environment; installs nothing. Exit code is `0` only if **all requested**
mandatory checks pass.

```bash
chesslab doctor                 # Python, app deps, data dirs
chesslab doctor --gpu           # + ROCm/PyTorch GPU validation incl. a real matmul test
chesslab doctor --camera 0      # + open camera index 0 and read a frame
chesslab doctor --gpu --json    # add a machine-readable JSON report
```

Each line is `[PASS] / [WARN] / [FAIL] <check> — <detail>`. A wrong (CUDA) PyTorch build
produces a clear FAIL naming the build as the cause; the GPU path (`validate_gpu()`) is
reused by `train` so it aborts loudly instead of silently falling back to CPU.

## Stage 1 — `calibrate` (ArUco-Marker, Pflicht)

**Marker sind Pflicht.** Kalibrierung, Aufnahme und Slicing kalibrieren sich **pro Frame
selbst** aus den ArUco-Markern am Brettrand — robust gegen Brett-/Kamerabewegung, kein
statisches Profil mehr, das danebenliegen kann. Die Marker müssen also **während der
ganzen Aufnahme am Brett bleiben**.

```bash
uv run chesslab calibrate markers --out data/calibration/markers.png  # Marker-Blatt drucken
#   -> entlang der Schnitt-Boxen ausschneiden, je einen Marker an eine AUSSEN-Ecke kleben
uv run chesslab calibrate auto --camera 0 --profile default --preview # Live: Marker-Box + Spielfeld-Box
#   w = Spielfeld-Box groesser, e/- = kleiner, s = speichern, q = abbrechen
uv run chesslab calibrate check --profile default                     # Raster-Overlay zur Kontrolle
```

**Resilient gegen Verdeckung & Jitter:** Der `MarkerTracker` verfolgt jede Markerposition
**geglättet** (EMA) mit **Dead-Zone**, damit die Box bei Jitter nicht zuckt. Die zuletzt
bekannte Position wird **gehalten**, wenn ein Marker (z. B. von deiner Hand) verdeckt ist —
die Kalibrierung bleibt **stabil und perspektivtreu** (Ecken aus dem Gedächtnis, echter
Winkel). Ein **einzelner** Ausreißer-Sprung wird verworfen; erst ein über mehrere Frames
**bestätigtes** Verschieben setzt die Ecke neu (**Selbstkorrektur** statt ewig falsch). Eine
nur lange gehaltene Ecke wird als *veraltet* markiert (Anzeige „N gehalten").

**Weniger als 4 sichtbar reicht** — sobald ein **Profil** existiert: Aufnahme/Slicing seeden
den Tracker aus den 4 kalibrierten Ecken (`make_tracker(profile)`), die Box steht damit
sofort und perspektivtreu, auch wenn gerade nur 2–3 Marker im Bild sind. Die alte verzerrende
2/3-Rekonstruktion (4 = Perspektive, 3 = Affin, 2 = Ähnlichkeit) wird nur noch als **Notnagel**
benutzt, wenn nie 4 Ecken bekannt waren (z. B. Kalibrier-Vorschau ohne Profil). Schwelle über
`calibrate auto --min-markers N` bzw. `config.TRACKER.default_min_markers`. Beim **Kalibrieren**
gibt es keinen Seed: dort werden weiter **alle 4** Marker live gebraucht, bevor du speicherst.
`--margin` (im Preview live mit `w`/`e`) rückt die Spielfeld-Box gegenüber der Marker-Box ein —
so klebst du die Marker bequem **neben** das Feld, nicht darauf.

Die reine Geometrie (`square_to_crop_box`, `resolve_board_corners`, `MarkerTracker` in
`calibration.py`) ist headless getestet. **Crops sind standardmäßig quadratisch** (ein Feld =
`board_size/8`, out_size `128×128`) und werden **verzerrungsfrei** geschnitten (`crop_square`
hält das Seitenverhältnis, füllt überstehende Bereiche mit Rand statt zu stauchen). Für sehr
**schräge** Kameras kann man die Box mit `pad_up` nach oben verlängern (für hohe 3D-Figuren) —
das out_size-Verhältnis wird dann per Letterbox beibehalten, ohne zu strecken.

> Hinweis: `calibrate new` (4 Ecken klicken) existiert noch, erzeugt aber ein statisches
> Profil **ohne** Marker-Selbstkalibrierung — beim marker-basierten Slicing werden Frames
> ohne erkennbare Marker übersprungen. Nutze daher `calibrate auto` + Marker am Brett.

## Stage 3 — `collect` + `slice` (capture, then auto-label)

Capture and slicing are **separate** so slicing is reproducible. `collect` writes raw
frames + FEN **+ the live-verified board corners** to a session log; `slice` turns those
into labeled crops and can be re-run with different crop params without re-capturing.

> **Aufnahme-Geometrie wird mitgespeichert.** `collect` schreibt zu jedem Frame die 4
> Brett-Ecken (`a8,h8,h1,a1`, Frame-Pixel), die in der Live-Vorschau gerade als korrekt zu
> sehen waren (Feld `"corners"` im Log). `slice` entzerrt **aus genau diesen Ecken**
> (`warp_from_corners`) — also exakt das, was bei der Aufnahme angezeigt wurde, statt die
> Marker neu zu detektieren (was bei schrägem Winkel driftet). Das macht die Crops
> deckungsgleich mit der Live-Vorschau und immun gegen einen im Standbild verdeckten Marker.
>
> Alt-Sessions ohne `"corners"` (vor diesem Feature aufgenommen) fallen auf die alte
> Pro-Frame-Marker-Detektion zurück (`warp_board_markers`); Frames ganz ohne erkennbare
> Marker werden dann übersprungen. Für deckungsgleiche Crops solche Sessions **neu aufnehmen**.

```bash
# Capture (on the rig — camera + display)
uv run chesslab collect pgn --pgn game.pgn --profile default   # Space=capture, n=next, s=skip, u=undo, q=quit
uv run chesslab collect play --strategy random --max-plies 60  # engine generates the game (no PGN needed)
uv run chesslab collect play --strategy stockfish --stockfish-path /usr/bin/stockfish
uv run chesslab collect play --strategy coverage --ui          # dichte Aufbauten gegen die seltensten Klassen
uv run chesslab collect play --strategy coverage --sets 2 --count 30  # mit 2 Figurensätzen -> Damen/Könige 2x/Aufbau
uv run chesslab collect live --start-fen "<FEN>"               # type SAN/UCI | cap | undo | fen <FEN> | done

# Slice (pure, reproducible — no hardware needed)
uv run chesslab slice --session 20260625-201500
uv run chesslab slice --all
uv run chesslab slice --session <id> --pad-up 1.0 --out-size 128x128  # re-slice with new crop params
uv run chesslab slice --preview <id>                                  # debug: label vs visible crop
```

Outputs: `data/squares/<class>/<session>_<frame>_<square>.png` (ImageFolder-style) and
one manifest line per crop in `data/manifests/squares.jsonl` (path, label, session_id,
frame, ply, square, square_color, fen, out_size, ts).

## Stage 4 — `stats` / `split` / `dataset verify`

```bash
uv run chesslab stats                              # 13-class distribution + light/dark coverage + warnings
uv run chesslab split --val-frac 0.15 --test-frac 0.15 --max-empty-ratio 1.5 --seed 42
uv run chesslab dataset verify                     # files exist/loadable, out_size, labels, split disjoint
```

`split` is **session-based** (whole sessions go to train/val/test — never split a
session's near-identical crops, which would leak). It caps `empty` at
`max_empty_ratio × largest piece class` (seeded) and writes inverse-frequency
`class_weights` into `data/manifests/split.json`. The augmentation policy
(`data/manifests/augment.yaml`) is written here and applied in Stage 5 — brightness /
contrast / gamma / light blur / small jitter allowed; **flips and 90/180° rotation
forbidden** (the camera is fixed).

## Stage 5 — `train` / `eval` / `export` (on the ROCm rig)

Needs the ROCm PyTorch build. `train` calls the Stage 0 GPU validation first and
**aborts** (no silent CPU fallback) if the GPU isn't usable.

```bash
uv run chesslab train --backbone smallcnn --epochs 30 --batch-size 256   # checkpoints by board-accuracy
uv run chesslab eval --run data/models/run-<ts> --split test            # board-acc, per-class recall, confusion
uv run chesslab export --run data/models/run-<ts> --format all          # TorchScript + ONNX + model_card.json
```

The **checkpoint metric is board-accuracy** (all 64 squares correct), not square-accuracy
(which `empty` inflates). Backbones: `smallcnn` (default) or `mobilenet_v3_small`
(ImageNet-pretrained). `model_card.json` carries the class list, `out_size`, normalization,
metrics and torch/ROCm version — the clean handoff to the inference app.

## Stage 6 — collection dashboard (`--ui` / `chesslab ui`)

A second OpenCV window assisting data collection: live class coverage (green/yellow/red
bars), a light/dark matrix (✓/✗), session progress, and a recommended FEN for the weakest
class — placed on the **specific missing square color**.

```bash
uv run chesslab collect live --ui                 # dashboard updates after each capture (g = copy FEN)
uv run chesslab ui                                # standalone dashboard on the current state
```

Coverage is derived from **session logs** (FEN → 64 labels), so it reflects what you just
captured — *before* any `slice`. The dashboard is render-only; the capture loop owns the
keyboard (single OpenCV key stream). `pyperclip` is optional (used only for `g` / `rec`).

## Develop

```bash
uv run pytest           # Stage 0 smoke tests (no GPU/camera needed)
```
