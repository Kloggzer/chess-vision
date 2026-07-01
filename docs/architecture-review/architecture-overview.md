# Architektur-Überblick — chess-vision / chesslab

Stand: 2026-07-02 · ~11.000 Zeilen Python (src + move_tracker + synth + tests) · Review-Basis: 4 parallele Subsystem-Analysen

## Mission & Systemkontext

`chesslab` ist ein **Datentool-Ökosystem** für Per-Square-Schachfigurenerkennung (14 Klassen inkl.
`occluded`) aus einer fest montierten Kamera. Labels entstehen automatisch aus dem bekannten
Spielzustand (FEN). Um den Kern haben sich drei Satelliten gebildet, die im ursprünglichen
Spec-Layout (CLAUDE.md) nicht vorgesehen waren:

```
┌────────────────────────────────────────────────────────────────────┐
│  Präsentation                                                      │
│  ├── CLI (typer, cli.py — ein Entrypoint `chesslab`)               │
│  ├── Web-UI (FastAPI + React/Vite SPA, src/chesslab/web/)          │
│  ├── OpenCV-Dashboard (collect_ui.py)                              │
│  └── move_tracker/ (eigenes FastAPI + HTML, PROTOTYP, außerhalb src)│
├────────────────────────────────────────────────────────────────────┤
│  Fachlogik (Kern-Pipeline, src/chesslab/)                          │
│  Stufe 0  doctor.py          Env-/ROCm-/Kamera-Validierung        │
│  Stufe 1  calibration.py     Homographie, ArUco, MarkerTracker    │
│  Stufe 2  state.py           Spielzustand (python-chess)          │
│  Stufe 3  collect.py, labeling.py, geometry3d.py, photometric.py  │
│  Stufe 4  dataset.py, dataset_build.py, sessions.py               │
│  Stufe 5  training/ (model, train, engine, evaluate, torch_data)  │
│  Stufe 7  experiment.py      Bake-off-Grids (Geometrie×Photometrie)│
│  NEU      ingest.py + ingest_adapters/ (chesscog, chessred, synth)│
├────────────────────────────────────────────────────────────────────┤
│  Daten / Infrastruktur                                             │
│  config.py (Klassenliste, Crop-/Augment-Policy, Paths)             │
│  data/ (sessions JSONL+YAML, squares, manifests JSONL, models)     │
│  synth/ (Blender-Renderpipeline) + synth_assets/ + synth_pieces/   │
│  wheels/ (gepinnte ROCm-Torch-Wheels für Windows)                  │
└────────────────────────────────────────────────────────────────────┘
```

## Datenfluss (Haupt-Contract-Kette)

```
Kamera ──► calibration (Profil-YAML: Homographie, Ecken, Crop-Params)
       ──► collect (Session: log.jsonl {frame, ply, fen, corners?, labels?} + session.yaml)
       ──► labeling.slice (Warp → 64 Crops → Label aus FEN) ──► manifest.jsonl
       ──► dataset (Stats, Balance, session-basierter Split → split.json)
       ──► training (SquareDataset → SmallCNN/MobileNetV3 → best.pt + config.json)
       ──► Konsumenten: web/inference.predict_arrays · move_tracker (geplant: CNN-Resync)

Parallel:  synth/ (RealityScan→Blender→PNG+JSON) ─┐
           chesscog / ChessReD (extern)          ─┼─► ingest_adapters → ingest.synthesize_sessions
                                                  ┘   → Pseudo-Sessions → gleicher slice-Pfad
```

Die Contracts sind **dateibasiert** (JSONL/YAML/JSON) — gut für Reproduzierbarkeit und Re-Slicing,
aber die Schemata sind nirgends formal dokumentiert (nur implizit in Writer-/Reader-Code).

## Subsysteme im Detail

**Kern-Pipeline** — sauber gestufte, weitgehend funktionale Module. `config.py` ist die einzige
Quelle für Klassenliste, Crop-Geometrie, Augment-Policy, Pfade (Prinzip „Konfig vor Code" wird
eingehalten). Headless-Kern (Geometrie, State, Stats) ist pur und testbar; Kamera/GUI-Kopplung
ist auf collect/calibration-Ränder beschränkt.

**Training** — SmallCNN (~100k Params) oder MobileNetV3-small (pretrained), drei Kopf-Varianten
(combined / factored / twostage mit explizitem Occupancy-Zweig), CrossEntropy mit Klassengewichten,
AdamW + Cosine, Early-Stopping auf `(macro_recall, board_acc)`. Split strikt pro Session.
Metriken: square_acc, macro_recall, board_acc (alle 64 Felder korrekt) plus Diagnose-Achsen
(occ_acc, piece_acc, type_err, color_err).

**Web-Layer** — FastAPI mit ~30 Endpoints (Kalibrieren, Sammeln, Scan, Manuell, Datensätze,
Training-Subprozess, Inference, MJPEG-Streams), React/Vite-SPA mit 8 Tabs, gebaute Assets werden
nach `web/static/` committet. Zustand liegt in vier modulglobalen Dicts (`_TRAIN`, `_COLLECT`,
`_INFER`, `_MANUAL`) ohne Locks — funktioniert für den Single-User-Lokalbetrieb, ist aber die
größte strukturelle Schwäche des Layers.

**move_tracker/** — Prototyp auf Repo-Root-Ebene (bewusst außerhalb des Pakets). Sauberer
Konsument der chesslab-Library (calibration, web.camera), keine Logik-Duplikation. Erkennung:
Warp (live ArUco-nachgeführt) → Motion-Gate → Rolling-Average → Per-Feld-Diff mit
Median-Normalisierung → Scoring über alle legalen Züge → Ambiguitäts-Check →
Multi-Frame-Voting. Threading: Daemon-Capture-Loop + ein Lock um den geteilten Zustand.
Kein Test, keine Paketierung, kein Abstraktions-Seam für einen zweiten (CNN-)Beobachter.

**synth/** — vierstufige, manuell orchestrierte Blender-Pipeline (Turntable-Fotos → RealityScan →
isolate_piece → render_chessboard) mit hartkodierten relativen Pfaden; Ausgabe fließt über den
`synthetic`-Ingest-Adapter in die normale Slice-Pipeline.

## Test-Landschaft

13 Testdateien, ~89 Tests. Gut abgedeckt: Kern-Pipeline (calibration-Geometrie, state, collect,
labeling, dataset, dataset_build, doctor, ingest chesscog/chessred), Web-Routen teilweise
(TestClient). **Dunkel:** move_tracker (0 Tests), synth/synthetic-Adapter (0 Tests,
Datenintegritätsrisiko Ecken-Reihenfolge), web.camera/Streaming, CLI-Dispatch, GPU-Trainingsloop
(bewusst torch-gated).

## Gesamturteil

Die Kern-Pipeline ist für ein Ein-Personen-Datentool **überdurchschnittlich sauber** strukturiert
(Config-zentrisch, session-basierter Split, getrenntes collect/slice, Adapter-Pattern für Ingest).
Die Risiken konzentrieren sich an den **Rändern**: (1) Crop-/Photometrie-Geometrie ist über
Labeling-, Training- und Inference-Pfad dupliziert → Train/Serve-Skew, (2) Web-Layer-Globalzustand
und Fehlerverschlucken, (3) ungetestete neue Subsysteme (move_tracker, synth). Details in
[issues-and-concerns.md](issues-and-concerns.md), Verbesserungen in [recommendations.md](recommendations.md),
Training/Genauigkeit in [training-accuracy-improvements.md](training-accuracy-improvements.md).
