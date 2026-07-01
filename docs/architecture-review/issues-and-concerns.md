# Architektur-Issues & Bedenken

Konsolidiert aus vier Subsystem-Analysen (Kern-Pipeline, Training, Web, move_tracker/synth/tests),
dedupliziert und nach Schweregrad geordnet. Schweregrade sind auf den realen Einsatzkontext
kalibriert (lokales Single-User-Tool) — „Critical" heißt: gefährdet Datenintegrität oder das
Projektziel (verlässliches Move-Tracking), nicht „Server brennt".

---

## CRITICAL

### C1 — Crop-/Photometrie-Geometrie ist über Label- und Inference-Pfad dupliziert (Train/Serve-Skew)

- **Issue:** Dieselbe Crop-Berechnung existiert mehrfach: `calibration.square_to_crop_box`,
  `labeling.crop_square`/`crops_for_frame`, implizit in `training/torch_data.py`, und im
  Inference-Pfad. Konkret bereits schlagend: `web/inference.predict_arrays()` wendet **keine
  Photometrie** an — ein mit `clahe`/`gamma`-Photometrie trainiertes Modell liefert darüber
  nahezu zufällige Vorhersagen, obwohl seine val_acc 0.6–0.7 beträgt. Genau dieser Effekt wurde
  live beim move_tracker-CNN-Test beobachtet.
- **Impact:** Stiller Label↔Inference-Mismatch. Jeder neue Konsument (move_tracker-CNN-Resync!)
  muss die exakte Slice-Parität von Hand nachbauen; ein Parameter-Drift ist unsichtbar und äußert
  sich nur als „Modell ist schlecht".
- **Location:** `src/chesslab/calibration.py:170`, `src/chesslab/labeling.py:74–134`,
  `src/chesslab/training/torch_data.py`, `src/chesslab/web/inference.py:54–76`
- **Recommendation:** Eine gemeinsame Funktion „Frame + Profil + Run-Config → 64 modellfertige
  Crops", die Geometrie **und** Photometrie aus der Run-`config.json` anwendet; alle Konsumenten
  (slice, web-inference, move_tracker) rufen nur noch diese. Siehe recommendations.md R1.
- **Severity:** Critical

### C2 — Evaluations-Design erlaubt Positions-Overfitting (Datensatz-Architektur)

- **Issue:** In den Bake-off- und frühen Datensätzen steht jede Figurenart pro Session immer auf
  derselben Linie („a=König, b=Dame, …"), und mehrere Klassen kommen nur in **einer** Session vor
  (split.json warnt 12×, Test-Split leer). Das Modell kann „Linien-Index → Figurentyp" lernen
  statt visueller Merkmale; Train- und Val-Sessions teilen dieselbe Geometrie.
- **Impact:** val_acc überschätzt die echte Generalisierung massiv; board_acc kollabiert auf 0;
  Bake-off-Vergleiche (Geometrie×Photometrie×Kopf) messen teilweise Rauschen. Das ist die
  **Hauptursache der schwachen Move-Tracking-Genauigkeit** (Details:
  training-accuracy-improvements.md).
- **Location:** Datensatz-Design; sichtbar in `data/manifests/*/split.json`, `REPORT.md`
- **Recommendation:** Neue Sessions mit **zufälliger Figur-auf-Linie-Zuordnung** pro Session;
  Split-Validierung sollte hart fehlschlagen (nicht nur warnen), wenn eine Klasse nur in einer
  Session vorkommt.
- **Severity:** Critical (für das Projektziel)

### C3 — move_tracker und synthetic-Adapter komplett ungetestet (Datenintegrität)

- **Issue:** Kein einziger Test für `move_tracker/` (Diff-Normalisierung, Legal-Move-Scoring,
  Voting, Thread-Lifecycle) und keiner für den `synthetic`-Ingest-Adapter bzw. das
  JSON-Format von `render_chessboard.py` — insbesondere die Ecken-Reihenfolge `[a8,h8,h1,a1]`
  wird nirgends validiert.
- **Impact:** Eine vertauschte Ecken-Reihenfolge rotiert/spiegelt **alle** synthetischen Labels
  stillschweigend — das Modell trainiert dann auf systematisch falschen Daten. Beim move_tracker
  gibt es keinerlei Regressionsschutz für den gerade stark umgebauten Erkennungsalgorithmus.
- **Location:** `tests/` (fehlende Dateien), `tests/test_ingest.py` (Lücke),
  `synth/render_chessboard.py`
- **Recommendation:** `test_move_tracker.py` (reine Logik-Tests: `normalize_diffs`,
  `best_legal_move` mit synthetischen Diffs, Voting) und ein Schema-/Ecken-Reihenfolge-Test für
  den synthetic-Adapter (ohne Blender, gegen Beispiel-JSON).
- **Severity:** Critical (synthetic) / High (move_tracker)

---

## HIGH

### H1 — Web-Layer: unsynchronisierter Modul-Globalzustand

- **Issue:** `_TRAIN`, `_COLLECT`, `_INFER`, `_MANUAL` (`web/app.py:36–57`) und
  `_STATE["tracker"]` (`move_tracker/app.py:19,35–41`) werden aus Request-Handlern und
  MJPEG-Generatoren ohne Lock gelesen/beschrieben. `BoardTracker.last_corners`
  (`web/camera.py:227–245`) ebenso.
- **Impact:** Im Single-User-Betrieb selten, aber real: ein laufender MJPEG-Generator liest
  `_COLLECT`, während `collect_finish()` es zurücksetzt → `None`-Zugriffe; zwei schnelle
  `/api/start` im move_tracker können zwei Capture-Threads hinterlassen.
- **Recommendation:** Ein `threading.Lock` pro Zustands-Dict; Generatoren kopieren den Zustand
  einmal pro Frame unter Lock (move_tracker/tracker.py macht das intern bereits vor — dasselbe
  Muster auf app-Ebene übernehmen).
- **Severity:** High

### H2 — Stilles Fehlerverschlucken im Web-Layer

- **Issue:** ~9 Stellen mit `except Exception: pass`-Charakter; prominent: Auto-Slice nach
  Collect-Finish (`web/app.py:794,1008`) meldet bei Fehler `sliced=0`, ohne den Fehler zu nennen.
  Kein Logging im gesamten Web-Layer (ein einzelnes `print`).
- **Impact:** Nutzer glaubt, es gäbe keine Crops / alles sei ok; Debugging nur per Raten.
- **Recommendation:** Fehler mindestens als Feld zurückgeben (`{"sliced": 0, "sliced_error": …}`)
  und per `logging` auf stderr protokollieren.
- **Severity:** High

### H3 — Training-Logdatei-Handle-Leak (Windows)

- **Issue:** `web/app.py:476–478` öffnet `web_train.log` und übergibt es an `subprocess.Popen`,
  schließt das Handle aber nie explizit.
- **Impact:** Unter Windows kann die Datei beim nächsten Trainingsstart gesperrt sein;
  Schließen hängt am nichtdeterministischen GC.
- **Recommendation:** Handle nach Popen sofort schließen (das Kind hält sein eigenes Duplikat)
  oder in `train_status()` beim Prozessende schließen.
- **Severity:** High

### H4 — Web importiert privates `_load_run` aus dem Training

- **Issue:** `web/inference.py:20` nutzt `training.evaluate._load_run` — privates Symbol als
  Layer-Contract.
- **Impact:** Kein stabiler Vertrag zwischen Training und Konsumenten; Refactoring im Training
  bricht Web/move_tracker stillschweigend.
- **Recommendation:** Öffentliche Funktion `training.load_run(run_dir) -> (model, cfg)`
  exportieren; alle Konsumenten umstellen.
- **Severity:** High

### H5 — synth-Pipeline: hartkodierte Pfade, keine Orchestrierung, hartkodierte Auflösung

- **Issue:** `render_chessboard.py` erwartet cwd-relative Pfade (`data/synth_raw`,
  `synth_assets/Chess Scene.blend`, `synth_pieces/`), Auflösung 1024px fest; die vierstufige
  Pipeline (capture → isolate → fens → render → ingest) ist nur im Kopf des Operators dokumentiert.
- **Impact:** Nicht reproduzierbar außerhalb des Repo-Roots; Fehlbedienung produziert stumm
  falsche Daten (siehe C3).
- **Location:** `synth/render_chessboard.py:301,315`, fehlendes `synth/README.md` bzw.
  Orchestrierungs-Skript
- **Recommendation:** Pfade über `config.Paths`/CLI-Args; ein `chesslab synth`-Subcommand oder
  Pipeline-Skript, das die Stufen verkettet.
- **Severity:** High

### H6 — MJPEG-Generator-Lebenszyklus

- **Issue:** Alle Stream-Endpoints nutzen `while True`-Generatoren ohne `try/finally`; sie lesen
  globalen Zustand pro Iteration und behandeln Kamerafehler nicht. Starlette schließt Generatoren
  bei Client-Disconnect zwar, aber synchrone Generatoren im Threadpool können verzögert abgeräumt
  werden und halten derweil `CAMERA.read()`-Polling am Leben.
- **Location:** `web/app.py:599–905`, `web/camera.py:210–224`, `move_tracker/app.py:88–98`
- **Recommendation:** `try/finally` um die Loops (Aufräumen/Logging), Zustand einmal pro Frame
  defensiv kopieren, `None`-Frames mit Fehlerbild statt Endlos-Retry beantworten.
- **Severity:** High → Medium (durch Starlette-Cleanup abgemildert)

---

## MEDIUM

### M1 — Zirkuläre Kopplung `geometry3d ↔ labeling`

`labeling.py:21` importiert `geometry3d` direkt; `geometry3d.py:159` importiert lazy
`labeling._resize_keep_aspect` zurück. Der Lazy-Import kaschiert eine unvollständige
Refaktorierung. → `_resize_keep_aspect` in ein Utility-Modul (oder nach geometry3d) ziehen.

### M2 — Kein Request-Schema (Pydantic) im Web-Layer

POST-Endpoints nehmen rohe `Body(...)`-Parameter (z. B. `/api/train` mit 10+ Parametern,
`web/app.py:439–452`). Typfehler erst zur Laufzeit, OpenAPI-Schema unbrauchbar für Client-Generierung.
→ Pydantic-Request-Modelle, beginnend bei `/api/train` und `/api/datasets`.

### M3 — move_tracker: monolithischer Erkennungspfad, kein Observer-Seam

`_loop()`/`_try_detect()` (`tracker.py:200–289`) verdrahten Frame-Diff-Beobachtung, Scoring und
Voting fest. Der geplante CNN-Resync (zweiter Beobachter) muss sich heute „danebenquetschen".
→ Minimaler Seam: `_try_detect` konsultiert eine Liste von Beobachtern (frame-diff, optional CNN),
die je `(move, score)`-Kandidaten liefern.

### M4 — move_tracker: Paketierung & Lifecycle

Liegt außerhalb `src/`, nicht in `pyproject.toml`, kein CLI-Subcommand, `stop()` ohne
`join()` (`tracker.py:198`), Defaults nur im `__main__`-Pfad gesetzt (`app.py:121`).
Für einen Prototyp ok; vor Integration: nach `src/chesslab/move_tracker/` verschieben,
`chesslab track`-Subcommand, `join(timeout=2)` im stop().

### M5 — Schema-/Reader-Duplikation

Crop-Parameter als zwei Dataclasses (`config.CropDefaults` + `calibration.CropParams`),
JSONL-Manifest-Parsing 3× (dataset, labeling, training/data), Label→FEN-Logik lokal in
`web/app.py:60–84` statt aus `labeling`/`config` importiert. → je eine kanonische Stelle.

### M6 — board_acc als Steuermetrik zu hart / Checkpoint-Wahl instabil

board_acc (alle 64 Felder korrekt) ist bei 8–70 Val-Frames extrem varianzbehaftet und für
Early-Stopping/Vergleiche wenig informativ; Stopp-Epochen schwanken 31–163.
→ occupancy-gewichtete Metrik für Checkpoint-Wahl (siehe training-accuracy-improvements.md).

### M7 — Kein strukturiertes Logging projekt­weit

Pipeline nutzt konsistente `print`-Glyphen (`[OK]/[FAIL]`), Web-Layer fast gar nichts.
Für ein CLI-Tool akzeptabel; für die Web-/Tracker-Daemons lohnt `logging` mit Modul-Loggern.

---

## LOW

- **L1** Frontend pollt (1–2.5 s Intervalle) statt SSE/WebSocket — für lokalen Betrieb fein.
- **L2** Handgeschriebener `fetch`-Client, Typen im Frontend dupliziert — OpenAPI-Client-Generierung
  wäre möglich (FastAPI liefert das Schema schon), lohnt erst bei API-Wachstum.
- **L3** Gebaute Frontend-Assets werden committet — bewusste Entscheidung (kein Node nötig zum
  Ausführen), erfordert Disziplin (`npm run build` vor Commit).
- **L4** DHash-Größe (dataset_build.py:47) und Overlay-Zeichenkonstanten hartkodiert.
