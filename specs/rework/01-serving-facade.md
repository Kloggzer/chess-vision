# 01 — Serving-Facade: eine kanonische Strecke „Frame → modellfertige Crops → Vorhersage"

**Größe:** M · **Hängt ab von:** 00 · **Blockiert:** 05, 09

## Ziel & Kontext

Die Crop-/Photometrie-Logik existiert heute mehrfach: `labeling.crops_for_frame` (wendet
Geometrie **und** Photometrie an — der Web-Inference-MJPEG-Pfad nutzt sie bereits korrekt),
eine duplizierte Loop in `labeling.slice_session`, und `web/inference.predict_arrays` als
Roh-Crop-API, die **keine** Photometrie anwendet. Folge: Ein mit `clahe`/`gamma` trainiertes
Modell liefert über `predict_arrays` nahezu Zufall (Train/Serve-Skew) — jeder neue Konsument
kann in dieselbe Falle laufen. Zusätzlich importiert `web/inference.py` das private
`training.evaluate._load_run`, und die Run-Varianten-Discovery (`labeling.variant_of_run`)
muss Manifeste scannen, weil die Run-`config.json` Geometrie/Photometrie nicht speichert.

Diese Phase schafft **eine** öffentliche Facade, die alle Konsumenten (Web-Inference, künftige
CNN-Recovery im move_tracker) nutzen, macht Runs self-describing und beseitigt nebenbei den
Import-Zyklus `geometry3d ↔ labeling`.

## Änderungen

### 1. Neues Modul `src/chesslab/serving.py`

Regeln: torch/PIL nur lazy in Funktionskörpern; importiert NIE `chesslab.web`; Modul-Docstring
auf Deutsch erklärt, dass dies der einzige unterstützte Inference-Einstieg ist.

```python
@dataclass(frozen=True)
class RunSpec:
    run_dir: Path
    classes: list[str]
    out_size: tuple[int, int]      # (W, H)
    geometry: str                  # "warp" | "box3d"
    photometry: str                # "none" | "clahe" | "grayworld" | "gamma"
    piece_height_cells: float

def run_spec(run_dir: Path) -> RunSpec
    # Auflösung: config.json["variant"] (neu, siehe Punkt 2)
    # → Fallback labeling.variant_of_run(run_dir) (labeling.py:137, scannt Manifest)
    # → Fallback ("warp", "none", config.EXP_PIECE_HEIGHT_CELLS) mit log.warning
def load_run(run_dir: Path, device: str = "cpu")
    # -> (model, cfg); öffentlich; übernimmt den _CACHE aus web/inference.py (Key: resolve()-Pfad)
def clear_cache() -> None
def crops_for_model(frame, corners, profile, spec: RunSpec) -> list[np.ndarray]
    # 64 BGR-Crops in labeling.all_squares()-Reihenfolge; dünner Wrapper um
    # labeling.crops_for_frame(geometry=spec.geometry, photometry=spec.photometry,
    #   piece_height_cells=spec.piece_height_cells, out_size=spec.out_size)
    # — die Geometrie-Implementierung bleibt in labeling (KEINE Kopie hier).
def predict_arrays(run_dir, crops, device="cpu", return_probs=False) -> list[dict]
    # zieht aus web/inference.py um; return_probs=True ergänzt "probs": list[float]
    # (voller Softmax, Reihenfolge = cfg["classes"]) — wird von Spec 09 gebraucht.
def predict_rows(run_dir, rows, device="cpu", batch_size=64) -> list[dict]
    # zieht aus web/inference.py um (Review-Tab, manifest-zeilenbasiert)
def predict_frame(run_dir, frame, corners, profile, device="cpu", return_probs=False) -> list[dict]
    # = run_spec + crops_for_model + predict_arrays; Ergebnis je Feld:
    # {"square": "a8", "pred_label": ..., "confidence": ...[, "probs": ...]}
```

### 2. Runs werden self-describing — `training/train.py`

Beim Schreiben der Run-`config.json` (Symbol: die Stelle, die `cfg` dumpt, ≈ Z.144) zusätzlich:

```python
"variant": {"geometry": ..., "photometry": ..., "piece_height_cells": ...}
```

Werte aus der ersten Manifest-Zeile des Trainingsdatensatzes ableiten (dieselbe Logik wie
`labeling.variant_of_run` — Zeilen sind bereits mit `geometry`/`photometry` getaggt). Additives
Feld, Alt-Runs bleiben lesbar (Fallback in `run_spec`).

### 3. `training/evaluate.py`: `_load_run` → öffentlich

Umbenennen zu `load_run`, Alias `_load_run = load_run` eine Übergangszeit behalten,
Re-Export in `training/__init__.py`. `serving.load_run` ruft diese Funktion (mit Cache davor).

### 4. `web/inference.py` wird dünner Shim

Inhalt: Re-Exports `predict_rows`/`predict_arrays`/`model_classes`/`clear_cache` aus `serving`
(Docstring: „verschoben nach chesslab.serving"). `model_classes(run_dir)` in serving als
`run_spec(run_dir).classes`-Wrapper bereitstellen. Kein Web-Code importiert mehr
`training.evaluate._load_run`.

### 5. `web/app.py` Call-Sites

- `camera_inference` (MJPEG-Loop, ≈ Z.877–887): den Block aus
  `variant_of_run` + `crops_for_frame` + `predict_arrays` durch **einen** Aufruf
  `serving.predict_frame(...)` ersetzen. Response-/Overlay-Verhalten unverändert.
- `inference_start` (≈ Z.844–848): Variant-Felder für die Response aus `serving.run_spec`
  beziehen (Response-JSON `{"ok", "run", "geometry", "photometry"}` unverändert).
- Run-Lösch-Endpoint (`/api/runs/{run}` DELETE, falls vorhanden): `serving.clear_cache()`
  aufrufen (Hygiene, Windows-Dateisperren).

### 6. Slice-De-Duplikation — `labeling.py`

`slice_session` (≈ Z.232–321) enthält eine Kopie der box3d/pose/warp-Fallback-Loop von
`crops_for_frame`. `crops_for_frame` um optionalen Parameter erweitern (additiv):

```python
def crops_for_frame(..., with_meta: bool = False):
    # with_meta=True → (crops, meta) mit meta = {"used_box3d": list[bool]} je Feld
```

`slice_session` konsumiert dann `crops_for_frame(..., with_meta=True)` und behält nur sein
Bookkeeping (`n_fallback`, Manifest-Zeilen, PNG-Schreiben). **Die erzeugten PNGs müssen
byte-identisch bleiben** — vor dem Löschen der alten Loop einen Alt-vs-Neu-Vergleichstest
schreiben (siehe Tests), danach die alte Loop entfernen.

### 7. Import-Zyklus auflösen — neues `src/chesslab/imgops.py`

`labeling._resize_keep_aspect` (≈ Z.57–71) verschieben als öffentliches
`imgops.resize_keep_aspect`. `labeling` und `geometry3d.py` (Lazy-Import ≈ Z.159) importieren
von dort; der Lazy-Import in geometry3d wird ein normaler Top-Import. Alias
`labeling._resize_keep_aspect = imgops.resize_keep_aspect` behalten (vorher greppen, wer es
referenziert — synth/, tests/).

## Tests — neu `tests/test_serving.py`

Headless (ohne torch), Bausteine aus `tests/test_web.py` (`_identity_session`, Identitätsecken)
wiederverwenden:

1. `crops_for_model` liefert 64 Crops in `labeling.all_squares()`-Reihenfolge, jede mit
   `spec.out_size`.
2. **Identitätsgarde:** `photometry="none"` → Crops **bit-identisch** (`np.array_equal`) zum
   direkten `crops_for_frame(photometry="none")`-Pfad und zum Vor-Rework-Verhalten.
3. **Skew-Fix wirksam:** `photometry="clahe"` → Crops unterscheiden sich vom Roh-Pfad.
4. **Slice-Parität:** identische Session einmal mit alter Logik gesliced (vor dem Umbau als
   Referenz-PNGs erzeugt bzw. im selben Test: `crops_for_frame(with_meta=True)` gegen die von
   `slice_session` geschriebenen PNGs) → Pixel-Gleichheit je Feld, `used_box3d`-Zählung
   konsistent mit `n_fallback`.
5. `run_spec`: (a) Run-Verzeichnis mit `config.json["variant"]` → direkt gelesen;
   (b) Legacy-config.json ohne variant + getaggtes Manifest → Fallback greift;
   (c) weder noch → Default (warp/none) ohne Exception.
6. `pytest.importorskip("torch")`: Mini-Run bauen (`build_model("smallcnn", ...)`,
   state_dict + config.json in tmp_path) → `load_run`-Roundtrip, `predict_arrays` auf 2 Crops
   liefert Labels aus `classes`, `return_probs=True` liefert 14 Floats ≈ Summe 1.
7. Bestand: `tests/test_ingest.py` (farbcodierter E2E) und `tests/test_web.py` unverändert grün —
   das sind die Stolperdrähte für Regression in slice/crops.

## Definition of Done

- [ ] `serving.py` mit allen Signaturen oben; keine Geometrie-Kopie (delegiert an labeling)
- [ ] Neue Runs schreiben `variant` in config.json; `run_spec`-Fallback-Kette getestet
- [ ] `web/inference.py` nur noch Shim; kein Import von `_load_run` mehr im Web-Layer
- [ ] `slice_session` nutzt `crops_for_frame(with_meta=True)`; alte Loop gelöscht; PNGs identisch
- [ ] `imgops.py` existiert; geometry3d hat keinen Lazy-Import auf labeling mehr
- [ ] `tests/test_serving.py` grün; Gesamtsuite grün; Commit `rework 01: …`

## Guardrails

- `photometry="none"` MUSS ein No-Op bleiben (bestehende none-Modelle dürfen sich um kein Bit
  ändern) — Test 2 ist nicht optional.
- Verhaltensänderung ist NUR beabsichtigt für direkte `predict_arrays`-Nutzung mit
  Photometrie-Modellen (der C1-Fix). In der Commit-Message benennen.
- Response-Shapes der Web-API unverändert (Regel 2 in entry.md).
