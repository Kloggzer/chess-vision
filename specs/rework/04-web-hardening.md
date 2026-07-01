# 04 — Web-Härtung: gelockter Zustand, sichtbare Fehler, Handles, Stream-Lifecycle

**Größe:** M · **Hängt ab von:** 00 · **Blockiert:** 05, 06

## Ziel & Kontext

`src/chesslab/web/app.py` hält seinen Zustand in vier modulglobalen Dicts (`_TRAIN` ≈ Z.36,
`_COLLECT`/`_INFER`/`_MANUAL` ≈ Z.49–57), die von Request-Handlern **und** MJPEG-Generatoren
ohne Lock gelesen/beschrieben werden (Races: Generator liest `_COLLECT`, während
`collect_finish` es leert → None-Zugriffe). Fehler werden an ~9 Stellen verschluckt (prominent:
Auto-Slice nach Collect/Manual-Finish meldet stumm `sliced=0`), der Web-Layer loggt praktisch
nichts, das Trainings-Log-Handle wird nie geschlossen (Windows-Dateisperre beim nächsten
Trainingsstart), und Stream-Generatoren haben kein Lifecycle-Handling. Diese Phase härtet
**in place** (Datei bleibt monolithisch — der Router-Split ist Spec 05); die Zustandsobjekte
werden aber schon so gebaut, wie die Router sie importieren werden.

## Änderungen

### 1. Neues `src/chesslab/web/state.py` — `LockedState`

```python
class LockedState:
    """Ein Lock + Snapshot-Semantik um ein Zustands-Dict.
    Generatoren lesen AUSSCHLIESSLICH über snapshot() (1× pro Frame-Iteration)."""
    def __init__(self, **initial): self._lock = threading.Lock(); self._d = dict(initial)
    def snapshot(self) -> dict: ...     # flache Kopie unter Lock
    def get(self, key, default=None): ...
    def update(self, **fields) -> None: ...

TRAIN   = LockedState(proc=None, log=None, cmd=None, state="idle", before=set())
COLLECT = LockedState(writer=None, positions=[], i=0, profile=None, camera=0,
                      board=None, show_target=False)
INFER   = LockedState(profile=None, board=None, run=None, camera=0, last=None)
MANUAL  = LockedState(profile=None, board=None, camera=0, writer=None)
CALIB   = LockedState(...)            # falls app.py Kalibrier-Zustand global hält (prüfen)
```

Wo Read-Modify-Write atomar sein muss, kleine Domain-Methoden ergänzen statt Lock nach außen zu
geben — mindestens: `COLLECT.advance()` (i-Inkrement) und `TRAIN.derive_state(...)`, die die
Zustandslogik aus `/api/train/status` (≈ Z.533–541: running/done/crashed/stopped/idle)
**wortgleich** portiert — die Response-Semantik darf sich nicht ändern.

Alle Zugriffe in app.py auf die vier Dicts durch die Container ersetzen. Feldnamen beibehalten.

### 2. `BoardTracker` thread-sicher — `web/camera.py` (≈ Z.227–245)

Eigenes `threading.Lock`; `process()` schreibt `last_corners` unter Lock; neuer Accessor
`corners()` (Kopie unter Lock); Aufrufer (`_capture_frame_corners`, Overlay-Zeichnung) nutzen
den Accessor statt Attribut-Zugriff.

### 3. Log-Handle schließen (H3) — app.py ≈ Z.476–478 und 523–524

```python
log_fh = open(log_path, "w", encoding="utf-8")
proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, ...)
log_fh.close()   # Kind hält sein eigenes dupliziertes Handle; Windows-Sperre weg
```

### 4. Fehler sichtbar machen (H2)

- Modul-Logger `log = logging.getLogger("chesslab.web")`; `logging.basicConfig(...)` in
  `web.app.run()` ergänzen (für Starts ohne CLI); das einzelne `print` (≈ Z.848) → `log.info`.
- Auto-Slice in `collect_finish` (≈ Z.794) und `manual_finish` (≈ Z.1008):
  `except Exception as e: log.exception("Auto-Slice fehlgeschlagen"); sliced_error = str(e)`
  → Response additiv `{"sliced": 0, "sliced_error": ...}`.
- Die übrigen stillen `except Exception`-Stellen in `web/` (≈ Z.407, 499, 565, 727, 882, 1021,
  1034 — greppen!) bekommen mindestens `log.warning(...)`; wo echtes Best-Effort (reine
  Overlay-Deko) → `log.debug` + Begründungskommentar.

### 5. MJPEG-/Generator-Lifecycle (H6)

Für jeden `while True`-Frames-Generator (camera_calibrate, camera_collect, camera_inference,
camera_manual, scan-preview; camera.py `mjpeg`-Helper ≈ Z.210–224):

- Body in `try/finally` (finally: `log.info("Stream beendet: %s", name)`).
- Zustand: genau **ein** `snapshot()` pro Iteration, danach nur mit der Kopie arbeiten.
- Nach ~50 aufeinanderfolgenden `None`-Frames: einmalig gerendertes Fehlerbild yielden
  („Kamera liefert keine Frames — Quelle prüfen", cv2.putText auf dunklem Canvas), Zähler
  zurücksetzen, weiter pollen (kein Busy-Loop: sleep bleibt).

## Tests — neu `tests/test_web_state.py` (+ Erweiterung test_web.py)

1. `LockedState.snapshot()` liefert Kopie (Mutation am Snapshot ändert Original nicht).
2. Thread-Stress: 8 Threads × 500 `update()` gegen parallele `snapshot()`-Reader → keine
   Exception, letzter Zustand konsistent.
3. `TRAIN.derive_state`-Tabelle: (proc läuft) → running; (rc 0) → done; (rc ≠ 0) → crashed;
   (kein proc, state="stopped") → stopped; (frisch) → idle. Muss der heutigen
   `/api/train/status`-Logik entsprechen (vor dem Umbau ablesen!).
4. TestClient: aktive Fake-Collect-Session, `run_slice` gemonkeypatcht auf Exception →
   `collect_finish`-Response enthält `sliced == 0` **und** `sliced_error` (Regressionstest H2).
5. TestClient: Train-Start mit gestubbtem `subprocess.Popen` → direkt danach lässt sich
   `web_train.log` erneut mit `open(log_path, "w")` öffnen (Windows-Sperren-Check, H3).
6. Bestehende `tests/test_web.py` unverändert grün (Contract-Freeze).

## Definition of Done

- [ ] Kein direkter Zugriff mehr auf `_TRAIN`/`_COLLECT`/`_INFER`/`_MANUAL`-Dicts; Container in state.py
- [ ] `/api/train/status`-Semantik nachweislich identisch (Test 3)
- [ ] `sliced_error` + Logger aktiv; keine stillen excepts ohne Log mehr in web/
- [ ] Log-Handle-Fix + Test 5; Generator-try/finally + Fehlerbild
- [ ] Gesamtsuite grün, Commit `rework 04: …`

## Guardrails

- **Lock-Disziplin (entry.md Regel 4):** nie einen State-Lock über `CAMERA.read()`, Inference,
  `run_slice`, `Popen` oder `join()` halten. Lock-Reihenfolge, falls je verschachtelt:
  State-Lock zuerst, Camera-Lock danach — niemals umgekehrt.
- Response-Shapes nur additiv erweitern (`sliced_error` ist das einzige neue Feld).
- Frontend wird nicht angefasst; die Anzeige von `sliced_error` ist optionaler Folge-Task.
