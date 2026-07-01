# 05 — web/app.py-Teardown: Feature-Router, Pydantic-Schemas, Reader-Konsolidierung

**Größe:** L (größte Phase) · **Hängt ab von:** 01, 04 · **Blockiert:** —

## Ziel & Kontext

`web/app.py` ist mit ~1060 Zeilen das God-Module des Web-Layers: ~30 Endpoints, Globalzustand,
FEN-Helfer, Subprozess-Management und Stream-Generatoren in einer Datei. Nach der Härtung
(Spec 04) wird die Datei in Feature-Router zerlegt. **Oberstes Gebot: Das React-Frontend merkt
nichts** — URL-Pfade, Methoden und Response-Shapes bleiben exakt gleich. Nebenbei werden die
im Review gefundenen Duplikate konsolidiert (Label→FEN-Logik, drei JSONL-Reader,
CropDefaults/CropParams-Doppelung) und die wichtigsten Endpoints bekommen Pydantic-Schemas.

## Ziel-Layout

```
src/chesslab/web/
  app.py            # NUR create_app(): mounts (/static, /img), logging, include_router × 8,
                    # SPA-Catch-all ZULETZT, run(). Ziel: ≤ ~120 Zeilen.
  state.py          # aus Spec 04 (LockedState-Singletons)
  schemas.py        # NEU: Pydantic-Request-Modelle
  util.py           # NEU: _img_url, _run_dirs, _capture_frame_corners, Overlay-Helfer
                    # (_draw_move_arrow, _draw_target_pieces, _PIECE_NAMES_DE, …)
  camera.py         # unverändert (CAMERA, BoardTracker, mjpeg, open_source)
  inference.py      # Shim aus Spec 01 (bleibt)
  scan.py           # unverändert (SCANNER)
  routers/
    __init__.py     # ALL_ROUTERS in Registrierungs-Reihenfolge
    datasets.py     # /api/stats, /api/class/{cls}, /api/datasets*
    sessions.py     # /api/sessions*, /api/review, /api/corrections, /api/reslice, /api/slice
    training.py     # /api/split, /api/train, /api/train/status, /api/train/stop, /api/runs*
    calibrate.py    # /api/camera/calibrate.mjpg, /api/camera/status, /api/camera/release, /api/calibrate/*
    collect.py      # /api/collect/*, /api/camera/collect.mjpg
    inference.py    # /api/inference/*, /api/camera/inference.mjpg
    manual.py       # /api/manual/*, /api/camera/manual.mjpg
    scan.py         # /api/scan/*
```

Regeln: Router sind reine `APIRouter`-Module, importieren die Singletons (`state.TRAIN`,
`camera.CAMERA`, `scan.SCANNER`); **kein URL-Prefix** über `include_router` setzen (Pfade stehen
voll ausgeschrieben in den Decorators — heutige Pfade 1:1); Import der Router lazy **innerhalb**
von `create_app()` (cv2-lazy-Konvention bleibt); kein Modul öffnet beim Import eine Kamera;
nichts importiert `app.py` zurück. SPA-Catch-all (`@app.get("/{full_path:path}")`) wird als
LETZTE Route registriert.

## Änderungen im Detail

### 1. Mechanischer Umzug

Jeden Endpoint samt seiner Closures verschieben; danach greppen, welche Modul-Helfer er
referenzierte — die wandern nach `util.py` (oder in den einzigen konsumierenden Router).
`Body(..., embed=True)`-Endpoints (z. B. calibrate-margin, scan_start, manual_capture)
**unverändert** lassen — kein Zwangs-Umbau auf Modelle (embed-Shape würde sich ändern).

### 2. Pydantic-Schemas (`web/schemas.py`) — nur wire-kompatible Fälle

```python
class TrainRequest(BaseModel):      # Feldnamen/Defaults 1:1 aus dem heutigen /api/train (≈ Z.440–452)
class SplitRequest(BaseModel):      # dito /api/split (≈ Z.439–442), inkl. allow_degenerate aus Spec 02
class DatasetCreateRequest(BaseModel):  # dito /api/datasets (≈ Z.315–321), inkl. allow_degenerate
```

Mehrere `Body(...)`-Parameter erwarten bereits ein eingebettetes JSON-Objekt — **ein**
Pydantic-Modell mit identischen Feldnamen/Defaults ist wire-identisch. Vorher die heutigen
Defaults aus den Signaturen ablesen und 1:1 kopieren. Nebeneffekt: ungültige Typen → 422 statt
500 (akzeptierte, dokumentierte Verhaltensänderung).

### 3. Konsolidierung (M5)

- **Label↔FEN:** `_label_to_fen_char`/`_labels_to_fen` (app.py ≈ Z.60–84) → `labeling.py` als
  öffentliche `label_to_fen_char`/`labels_to_fen` (Docstring: Gegenstück zu
  `config.label_from_piece`). Import in `tests/test_web.py:17` anpassen.
- **Ein JSONL-Reader:** neues `src/chesslab/ioutil.py` → `read_jsonl(path) -> list[dict]`.
  Konsumenten umstellen: `dataset.load_manifest` (behält seine FileNotFoundError-Meldung als
  Wrapper), `training/data.load_manifest`, `labeling.read_log`/`load_corrections`,
  `web`-interner `_read_jsonl`.
- **CropDefaults/CropParams:** prüfen, ob `calibration.CropParams.default()` Literale
  dupliziert; wenn ja, aus `config.CROP` speisen. Beide Klassen bleiben (Policy vs.
  persistierter Profilzustand); nur die Zahlen existieren noch einmal. Kein Dateiformat ändert
  sich.

### 4. Contract-Absicherung

Neuer Test `tests/test_web_contract.py`:

- **Routen-Inventar:** vor dem Umbau die vollständige Liste `{(method, path)}` aus
  `create_app().routes` extrahieren und als Literal in den Test einchecken; nach dem Umbau
  wird exakt gegen diese Liste verglichen (verlorene/umbenannte Route = roter Test). Neue
  Routen sind erlaubt (Obermenge), fehlende nicht.
- Read-only-Smoke via TestClient mit tmp-`config.Paths`: `/api/stats`, `/api/datasets`,
  `/api/runs`, `/api/train/status`, `/api/collect/state`, `/api/camera/status` → 200 und die
  Top-Level-Keys, die das Frontend liest, vorhanden.
- `/api/train` mit kaputtem Typ → 422; SPA-Catch-all liefert index.html; `/api/nope` → 404.

## Tests

- `tests/test_web_contract.py` (oben) — das Herzstück der Phase.
- Bestehende `tests/test_web.py` grün (nur der eine Import wird angepasst).
- `tests/test_ioutil.py`: read_jsonl (leere Datei, ungültige Zeile → Fehlerverhalten wie der
  bisherige tolerante Reader — vorher Verhalten ablesen und pinnen).
- Manueller Smoke nach Abschluss: `chesslab web` starten, alle 8 Tabs durchklicken
  (Kalibrieren/Sammeln/Scan/Manuell/Datensätze/Inference/Review/Training) — dokumentieren.

## Definition of Done

- [ ] app.py ≤ ~120 Zeilen, nur App-Aufbau; 8 Router-Module + schemas.py + util.py + ioutil.py
- [ ] Routen-Inventar-Test grün gegen die VOR dem Umbau erzeugte Literal-Liste
- [ ] 3 Pydantic-Modelle wire-kompatibel; embed-Endpoints unangetastet
- [ ] Label↔FEN in labeling; genau ein JSONL-Reader; CropParams speist sich aus config.CROP
- [ ] Kein Frontend-Rebuild nötig (static/ unverändert); Gesamtsuite grün; Commit `rework 05: …`

## Guardrails

- Reihenfolge: Router-Includes vor dem SPA-Catch-all — sonst frisst der Catch-all die API.
- Beim Verschieben auf Closure-Captures achten (alte Endpoints griffen auf Modul-Globals zu).
- Wenn ein Endpoint sich nicht wire-kompatibel auf Pydantic heben lässt: `Body(...)` lassen
  (Regel 2 schlägt Schönheit).
