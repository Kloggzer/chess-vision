# Abhängigkeits-Graph & Kopplungsanalyse

## Modul-Abhängigkeiten (Kern + Satelliten)

```mermaid
graph TD
    subgraph Präsentation
        CLI[cli.py]
        WEB[web/app.py]
        FE[frontend React SPA]
        MT[move_tracker/app.py]
        CUI[collect_ui.py]
    end

    subgraph Kern
        CFG[config.py]
        CAL[calibration.py]
        ST[state.py]
        COL[collect.py]
        LAB[labeling.py]
        G3D[geometry3d.py]
        PHO[photometric.py]
        DS[dataset.py]
        DSB[dataset_build.py]
        SES[sessions.py]
        ING[ingest.py]
        ADP[ingest_adapters/*]
        EXP[experiment.py]
    end

    subgraph Training
        TD[training/torch_data.py]
        TM[training/model.py]
        TT[training/train.py]
        TE[training/engine.py]
        TEV[training/evaluate.py]
    end

    subgraph Web-Infra
        CAM[web/camera.py]
        INF[web/inference.py]
        SCN[web/scan.py]
    end

    MTT[move_tracker/tracker.py]

    CLI --> CAL & COL & LAB & DS & TT & ING & EXP
    WEB --> CAM & INF & SCN & LAB & COL & DSB & DS
    FE -. fetch/MJPEG .-> WEB
    MT --> MTT
    MTT --> CAL
    MTT --> CAM
    CUI --> SES & ST

    COL --> CAL & ST & SES
    LAB --> CAL & G3D & PHO
    G3D -. lazy, ZYKLUS .-> LAB
    ING --> ADP & LAB & SES
    DS --> CFG
    EXP --> DSB & TT

    TT --> TD & TM & TE
    TEV --> TM & TD
    INF -. privat: _load_run .-> TEV
    TD --> CFG

    CAL --> CFG
    ST --> CFG
    LAB --> CFG
    COL --> CFG
    CAM --> CAL
```

Legende: durchgezogen = regulärer Import · gestrichelt = problematische Kante

## Bewertung der Kanten

**Saubere, gewollte Richtungen (bestätigt):**
- `config.py` ist reine Senke — wird von allem importiert, importiert nichts Fachliches. ✓
- `state.py` (Spiellogik) und `calibration.py` (Geometrie) sind headless und nur von config
  abhängig — die stabilsten Bausteine des Systems. ✓
- `cli.py` und `web/app.py` koppeln als Entrypoints breit an alle Stufen — angemessen. ✓
- `move_tracker` ist reiner Konsument der Library (calibration, web.camera, python-chess),
  dupliziert keine Logik. ✓

**Problematische Kanten:**

| Kante | Problem | Schwere |
|---|---|---|
| `geometry3d → labeling` (lazy) bei gleichzeitigem `labeling → geometry3d` | Import-Zyklus, per Lazy-Import kaschiert; `_resize_keep_aspect` liegt im falschen Modul | Medium |
| `web/inference → training.evaluate._load_run` | Privates Symbol als Layer-Contract; kein stabiler Vertrag Training→Konsumenten | High |
| `web/app` ↛ `labeling` (Label→FEN lokal reimplementiert, app.py:60–84) | Fehlende Kante, die es geben sollte — Duplikat statt Import | Medium |
| Inference-Pfade ↛ `photometric` | `predict_arrays` wendet keine Photometrie an, obwohl die Run-Config sie verlangt → Train/Serve-Skew | **Critical** (siehe C1) |
| `move_tracker → chesslab.calibration._square_to_col_row` | weiteres privates Symbol als externer Contract | Low |

## Kopplungs-Hotspots

1. **Der „Crop-Contract" ist kein Modul, sondern verteiltes Wissen.** Vier Stellen müssen dieselbe
   Geometrie+Photometrie reproduzieren (labeling/slice, torch_data, web/inference, move_tracker).
   Das ist die wichtigste fehlende Abstraktion im System — eine Facade
   `crops_for_model(frame, corners, run_cfg)` würde drei gestrichelte Kanten auflösen.

2. **`web/app.py` (~1060 Zeilen) ist der God-Module des Web-Layers.** Endpoints, Globalzustand,
   FEN-Helfer, Subprozess-Management und Stream-Generatoren in einer Datei. Aufteilung nach
   Feature (train/collect/inference/scan-Router) würde die Kopplung sichtbar und testbar machen.

3. **Dateiformate als Schnittstellen** (Session-Log, Manifest, Run-Config) sind die stabilsten
   Verträge des Systems — aber nirgends als Schema dokumentiert. Drei JSONL-Reader-Implementierungen
   existieren parallel. Ein `schemas.py` (oder Docstring-Schema je Writer) plus eine gemeinsame
   `read_jsonl`-Hilfe wäre ausreichend.

4. **Externe Systemgrenzen:** Blender/RealityScan (synth) und die Android-IP-Cam sind über
   Konvention (Pfade, URL-Format) gekoppelt, ohne Validierung an der Grenze — Fehler wandern
   unbemerkt tief in die Pipeline (siehe C3/H5).
