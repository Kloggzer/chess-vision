# CLAUDE.md — chesslab

> Einstiegsdokument für Claude Code. **Lies diese Datei zuerst vollständig**, dann
> arbeite die Specs in `specs/` in nummerierter Reihenfolge ab. Jede Spec ist eine
> eigene Stufe mit klaren Akzeptanzkriterien ("Definition of Done"). Baue nicht alles
> auf einmal — implementiere Stufe für Stufe und halte am Ende jeder Stufe an.

## Mission

`chesslab` ist ein **Datentool** zum Erstellen eines hochwertigen, automatisch
gelabelten Bilddatensatzes für die Erkennung von Schachfiguren auf einem physischen
Brett, das von einer fest montierten USB-Webcam gefilmt wird. Ziel ist es, ein
Per-Square-Klassifikationsmodell (13 Klassen) zu trainieren, das später in einer
Live-Analyse-App verwendet werden kann.

**Kernidee:** Die Labels werden **nicht von Hand** vergeben, sondern aus dem bekannten
Spielzustand (FEN, via `python-chess`) abgeleitet. Ein Foto einer Stellung liefert
automatisch 64 gelabelte Trainingsbeispiele.

## Scope

Dieses Repo deckt ab:

1. **Kalibrierung** der Kamera/Brett-Geometrie (Homographie, einmalig).
2. **Aufnahme** von Stellungen mit synchron gehaltenem Spielzustand (zwei Modi:
   PGN-Replay und freies Spiel mit Zugeingabe).
3. **Auto-Labeling**: Frames in 64 Square-Crops zerlegen und aus der FEN labeln.
4. **Datensatz-Management**: Manifest, Statistik, Klassenbalance, sessionbasierter Split.
5. **Training-Handoff**: Per-Square-CNN trainieren, evaluieren, exportieren.

## Non-Goals (bewusst NICHT in diesem Repo)

- Die Live-Inferenz-App (Echtzeit-FEN aus Webcam, temporale Stabilität,
  Legalitäts-Fusion, Stockfish-Anbindung, PGN-Export der eigenen Partien). Das ist ein
  separates Folgeprojekt und konsumiert nur das hier trainierte Modell. Siehe Hinweis
  am Ende von `specs/05-training-handoff.md`.
- Reinforcement Learning. Figurenerkennung ist **supervised** Klassifikation.
- Brett-/Eckenerkennung per Deep Learning. Die Kamera steht fix → eine einmalige
  manuelle Kalibrierung genügt und ist robuster.

## Tech-Stack (verbindlich)

- Python **3.11+**
- Env/Build: **uv** (bevorzugt) oder pip + venv. `pyproject.toml` als Single Source.
- CLI: **Typer** (Subcommands, ein Entrypoint `chesslab`).
- Vision/IO: **opencv-python**, **numpy**, **Pillow**.
- Schach-Logik: **python-chess**.
- Training: **PyTorch (ROCm-Build)** + **torchvision**.
  - **GPU: AMD Radeon RX 7900 XTX** (RDNA3, gfx1100, 24 GB VRAM) über **ROCm**.
    **NICHT** der CUDA-Build von PyTorch — der ROCm-Build nutzt zwar dieselbe
    `torch.cuda.*`-API, kommt aber von einem anderen Index-URL
    (`https://download.pytorch.org/whl/rocm6.x`).
  - **Annahme:** Das Environment ist laut Nutzer bereits korrekt eingerichtet. Claude
    Code installiert ROCm/PyTorch **nicht neu**, sondern **validiert** zuerst (siehe
    Pre-flight unten / `specs/00-environment.md`). Erst bei nachweislich kaputtem Setup
    Rücksprache halten.
- Config/Profile: **YAML** (`pyyaml`). Manifeste als **JSONL** + optionaler CSV-Export.
- Logging: stdlib `logging`, menschenlesbar auf stderr.

## Repo-Layout (so soll es am Ende aussehen)

```
chesslab/
  CLAUDE.md
  README.md                 # Kurz-Quickstart, aus den Specs ableiten
  pyproject.toml
  specs/                    # diese Spezifikationen (read-only Referenz)
  src/chesslab/
    __init__.py
    cli.py                  # Typer-App, bindet alle Subcommands
    config.py               # Pfade, Defaults, Profil-/Config-Modelle (pydantic ok)
    doctor.py               # Stufe 0: Environment-/ROCm-/Kamera-Validierung
    calibration.py          # Stufe 1
    state.py                # Stufe 2: Spielzustand (PGN-Replay + Live)
    collect.py              # Stufe 2/3: Aufnahme-Loop, Session-Logs schreiben
    labeling.py             # Stufe 3: Slicing + Label aus FEN
    dataset.py              # Stufe 4: Manifest, Stats, Split, Augmentation-Policy
    collect_ui.py           # Stufe 6: OpenCV-Dashboard für Trainingsdaten-Assistent
    training/
      __init__.py
      model.py              # Stufe 5: CNN-Architektur
      data.py               # Stufe 5: Dataset/Dataloader (respektiert Split)
      train.py              # Stufe 5: Trainingsloop
      evaluate.py           # Stufe 5: Metriken inkl. Board-Accuracy
  tests/                    # pytest, mind. Smoke-Tests pro Stufe
  data/                     # NICHT committen (.gitignore), zur Laufzeit erzeugt
    calibration/
    sessions/
    squares/
    manifests/
    models/
```

## Globale Konventionen

- **Ein Entrypoint:** `chesslab <command>`. Alle Stufen sind Subcommands.
- **Reproduzierbarkeit:** Aufnahme (`collect`) und Labeling (`slice`) sind getrennt.
  `collect` speichert Rohframe **plus** FEN je Stellung in ein Session-Log. `slice`
  ist ein reiner, wiederholbarer Schritt, der aus Session-Logs den gelabelten
  Datensatz erzeugt — so kannst du mit anderen Crop-Parametern neu slicen, ohne neu
  aufzunehmen.
- **Determinismus:** Globaler `--seed` für alle zufälligen Schritte (Split, Sampling,
  Training). Default 42.
- **Konfig vor Code:** Pfade, Klassenliste, Crop-Parameter, Split-Verhältnisse stehen
  in `config.py`/YAML, nicht hartkodiert in der Logik.
- **Square-Notation:** Felder werden als `a1`..`h8` referenziert.
- **Klassen (13):** `empty`, `wP wN wB wR wQ wK`, `bP bN bB bR bQ bK`
  (Großbuchstabe = Weiß, Kleinbuchstabe = Schwarz, FEN-konform). Die kanonische,
  geordnete Klassenliste lebt an genau **einer** Stelle in `config.py`.

## Build-Reihenfolge & Definition of Done

Arbeite strikt nacheinander. Nach jeder Stufe: funktionierender CLI-Befund + kurzer
Smoke-Test + Eintrag im README.

0. `specs/00-environment.md` — **Pre-flight, zuerst ausführen.** `chesslab doctor`
   validiert Python, Abhängigkeiten, ROCm/PyTorch-GPU (7900 XTX) und Kamera. Ohne
   bestandenes `doctor --gpu` kein Training in Stufe 5 starten.
1. `specs/01-calibration.md` — Kamera erfassen, 4 Ecken klicken, Homographie speichern,
   Raster-Overlay zur Kontrolle.
2. `specs/02-game-state.md` — Spielzustand mit `python-chess`: PGN-Replay und Live-Modus,
   FEN je Halbzug, Orientierung.
3. `specs/03-capture-labeling.md` — Aufnahme-Loop + Slicing + Auto-Label aus FEN →
   Square-Crops + Manifest-Einträge.
4. `specs/04-dataset.md` — Manifest-Schema, Statistik, Klassenbalance, sessionbasierter
   Split, Augmentation-Policy.
5. `specs/05-training-handoff.md` — CNN-Training, Evaluation (inkl. Board-Accuracy),
   Export nach TorchScript/ONNX.
6. `specs/06-collection-ui.md` — OpenCV-Dashboard: Live-Klassenabdeckung, Hell/Dunkel-Matrix,
   FEN-Empfehlung für unterrepräsentierte Figuren. Abdeckung wird aus den Session-Logs
   (FEN→Label) abgeleitet, nicht aus dem Manifest. Flag `--ui` für `collect`, plus
   standalone `chesslab ui`. Hängt nur an Stufe 2/3 (+ optional 4), unabhängig von Stufe 5.

## Wichtige Fallstricke (gelten projektweit)

- **3D-Figuren ragen nach oben.** Bei nicht-senkrechter Kamera reicht das Figurenbild
  über die Basiszelle hinaus (Richtung hintere Reihe). Square-Crops müssen nach oben
  erweitert werden — siehe `crop`-Parameter in Stufe 1/3.
- **Klassen-Ungleichgewicht:** `empty` dominiert massiv. Wird in Stufe 4 behandelt
  (Subsampling/Gewichtung), nicht ignorieren.
- **Kein zufälliger Train/Val-Split:** Frames derselben Stellung/Session sind nahezu
  identisch -> Data Leakage. Split **immer pro Session** (Stufe 4).
- **Orientierung:** Bei Kalibrierung wird festgehalten, welche Bildecke `a8`/`h1` ist.
  Falsche Orientierung vertauscht alle Labels stillschweigend.
