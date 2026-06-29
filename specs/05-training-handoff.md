# Stufe 5 — Training-Handoff (`training/`)

## Zweck

Ein Per-Square-Klassifikationsmodell (13 Klassen) auf dem Datensatz trainieren,
aussagekräftig evaluieren und exportieren — lauffähig auf der **AMD Radeon RX 7900 XTX
über ROCm**. Das Modell ist das eigentliche Liefer-Artefakt für die spätere Inferenz-App.

## GPU-Vorbedingung (ROCm)

- **Vor jedem Training** den GPU-Validierungspfad aus Stufe 0 aufrufen
  (`doctor --gpu`-Logik). Ist die GPU nicht nutzbar -> **abbrechen mit klarer Meldung**,
  **nicht** still auf CPU zurückfallen.
- Geräte-Handle über die normale `torch.cuda`-API beziehen (`device = "cuda"`). Unter dem
  ROCm-Build ist das korrekt und adressiert die Radeon-GPU.
- AMP/`torch.autocast` mit `device_type="cuda"` ist auf RDNA3 nutzbar; falls Instabilität
  auftritt, per Flag `--no-amp` abschaltbar machen. `channels_last` kann helfen, optional.
- 24 GB VRAM sind reichlich für ein kleines CNN bei 96x128-Crops -> großzügige Batchsize
  möglich (Default z. B. 256, per `--batch-size` anpassbar).

## Modell (`training/model.py`)

Zwei wählbare Backbones, gleicher 13-Klassen-Kopf:

1. **`smallcnn` (Default):** kompaktes Conv-Netz (z. B. 4–5 Conv-Blöcke mit BatchNorm +
   ReLU, GlobalAvgPool, Linear -> 13). Schnell, reicht für die Aufgabe meist völlig.
2. **`mobilenet_v3_small`:** torchvision-Backbone, Kopf auf 13 Klassen ersetzt.
   Optional ImageNet-Gewichte als Start (Fine-Tuning).

Input: `out_size` aus dem Datensatz (z. B. 96x128, H>W). Normalisierung dokumentieren und
**identisch** für Train/Eval/Export verwenden (die Inferenz-App muss sie spiegeln).

## Daten (`training/data.py`)

- Liest `data/manifests/squares.jsonl` + `data/manifests/split.json`, filtert Crops nach
  Session-Zugehörigkeit des jeweiligen Splits.
- Augmentation **nur auf train**, gemäß Policy aus Stufe 4 (Helligkeit/Kontrast/Gamma,
  leichter Blur, kleines Jitter; **kein** Flip/Rotation). Val/Test nur Resize+Normalize.
- Klassen-Gewichte aus `split.json` an den Loss weiterreichen; alternativ `WeightedRandomSampler`.
- `num_workers` sinnvoll setzen; `pin_memory=True`.

## Training (`training/train.py`)

### CLI
```
chesslab train [--backbone smallcnn] [--epochs 30] [--batch-size 256] [--lr 3e-4]
               [--no-amp] [--seed 42] [--out data/models/run-<ts>]
```

### Loop
- Optimizer AdamW, Cross-Entropy mit Klassen-Gewichten, Cosine- oder Step-LR-Schedule.
- Pro Epoche: Train-Loss, Val-Loss, Val-Accuracy, **Val-Board-Accuracy** (s. u.) loggen.
- Checkpoint nach bester **Board-Accuracy** speichern (nicht nach Square-Accuracy — die
  ist durch `empty` aufgebläht und irreführend).
- Early Stopping (Geduld konfigurierbar). Run-Verzeichnis enthält: `best.pt`, `last.pt`,
  `metrics.jsonl`, `config.json` (alle Hyperparameter + Klassenliste + Normalisierung).

## Evaluation (`training/evaluate.py`)

### CLI
```
chesslab eval --run data/models/run-<ts> [--split test]
```

Metriken — in dieser Reihenfolge, weil sie unterschiedlich aussagekräftig sind:

1. **Board-Accuracy (Hauptmetrik):** Anteil der Frames, deren **alle 64 Felder** korrekt
   klassifiziert wurden. Das ist die Zahl, die im Echtbetrieb zählt — ein einzelner
   Fehler macht die FEN falsch. Dazu Crops je Frame (über `session_id`+`frame`+`square`
   aus dem Manifest) rekonstruieren.
2. **Per-Klassen-Accuracy / Recall** für alle 13 Klassen.
3. **Confusion-Matrix**, mit besonderem Blick auf **König↔Dame** und Figur↔`empty`
   (häufigste Verwechslungen). Als Text und als PNG speichern.
4. Square-Accuracy gesamt (nur als Kontext, nicht als Zielmetrik).

## Export (`training/` / `chesslab export`)

```
chesslab export --run data/models/run-<ts> [--format torchscript|onnx]
```
- Exportiert `best.pt` nach **TorchScript** und/oder **ONNX**.
- Legt eine `model_card.json` daneben: Klassenliste (geordnet), Input-`out_size`,
  Normalisierungs-Parameter, Trainings-Metriken, ROCm/Torch-Version, Datum.
- Diese Artefakte sind der saubere Übergabepunkt an die Inferenz-App.

## Akzeptanzkriterien (Definition of Done)

- `train` bricht ohne nutzbare ROCm-GPU klar ab (kein stiller CPU-Fallback) und trainiert
  sonst auf der 7900 XTX (VRAM-Nutzung sichtbar, z. B. via `rocm-smi`).
- `metrics.jsonl` enthält je Epoche Board-Accuracy; bestes Checkpoint danach ausgewählt.
- `eval` gibt Board-Accuracy, Per-Klassen-Recall und eine Confusion-Matrix (Text+PNG) aus.
- `export` erzeugt ladbares TorchScript/ONNX + `model_card.json` mit korrekter
  Klassenliste und Normalisierung.
- Ein Smoke-Run (1–2 Epochen auf wenigen Sessions) läuft end-to-end ohne Fehler durch.

---

## Hinweis: Folgeprojekt Inferenz-App (NICHT in diesem Repo)

Das hier exportierte Modell + `model_card.json` werden von einer separaten Live-App
konsumiert. Deren Kernbausteine (zur Orientierung, hier bewusst ausgelassen):

- Echtzeit-Webcam -> dieselbe Homographie/Crops -> Modell -> 64 Labels -> FEN.
- **Temporale Stabilität:** Stellung erst übernehmen, wenn N aufeinanderfolgende Frames
  übereinstimmen (filtert Hände überm Brett / Jitter).
- **Legalitäts-Fusion:** neue Stellung gegen die legalen Folgezüge der vorherigen prüfen;
  inkonsistente Erkennungen verwerfen/korrigieren. Macht aus „gutem Klassifikator"
  verlässliches Partie-Logging.
- **PGN-/Verlauf-Export** + optionale Stockfish-Analyse für die gemeinsame Nachbesprechung.

Beim Bau dieses Repos darauf achten, dass Homographie-Anwendung, Crop-Logik und
Normalisierung als wiederverwendbare Funktionen vorliegen, damit die App sie 1:1
übernehmen kann.
