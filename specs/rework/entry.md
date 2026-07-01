# Rework-Specs — Einstieg für Agenten

> **Lies diese Datei zuerst vollständig.** Danach bearbeitest du GENAU EINE Phasen-Spec
> (`00`–`09`) — welche, steht in deinem Auftrag. Jede Spec ist self-contained: alles, was du
> brauchst, steht in ihr plus diesem Dokument. Du brauchst weder die Review-Berichte noch
> frühere Konversationen zu kennen (Hintergrund bei Bedarf: `docs/architecture-review/`).

## Mission

Ein Architektur-Review hat konzentrierte Risiken an den Rändern eines sauberen Kerns gefunden:
Crop/Photometrie-Logik ist über Labeling-, Trainings- und Inference-Pfad dupliziert (Modelle sehen
in der Live-Inference andere Bilder als im Training), die Split-Validierung warnt nur statt zu
scheitern, zwei neue Subsysteme (move_tracker, synthetische Datenpipeline) sind komplett
ungetestet, und der Web-Layer hat ungelockten Globalzustand plus verschluckte Fehler.

Dieser Rework behebt das in 10 Phasen und schließt mit einem neuen Feature ab: CNN-gestützte
Recovery im move_tracker (erkennen, welches Feld leer wurde / nicht mehr leer ist, wenn die
Frame-Diff-Erkennung nicht weiterkommt). Ziel-Endzustand: eine kanonische Serving-Facade, harte
Datensatz-Validierung, Sicherheitsnetz-Tests, ein gehärteter und in Router zerlegter Web-Layer,
ein paketierter move_tracker mit Observer-Seam, und CNN-Recovery obendrauf.

## Phasen & Abhängigkeiten

| Spec | Inhalt | Größe | Hängt ab von |
|---|---|---|---|
| `00-baseline-commit.md` | Ist-Stand committen | XS | — (bereits erledigt: Commit `bc623f3`) |
| `01-serving-facade.md` | serving.py, load_run, slice-De-Dup, imgops | M | 00 |
| `02-split-validation.md` | Harte Split-Fehler + `--allow-degenerate` | S | 00 |
| `03-safety-net-tests.md` | Tests: move_tracker-Logik, synthetic-Adapter | M | 00 |
| `04-web-hardening.md` | LockedState, Logging, Log-Handle, MJPEG | M | 00 |
| `05-web-routers.md` | app.py → Router, Pydantic, ioutil | L | 01, 04 |
| `06-move-tracker-productization.md` | Umzug, Lifecycle, Observer-Seam, CLI | M | 03, 04 |
| `07-training-occupancy.md` | Occupancy-Checkpoint-Metrik, Augmentierung | S–M | 00 |
| `08-synth-reproducibility.md` | Render-Flags, `chesslab synth render`, README | S | 00 |
| `09-cnn-recovery.md` | CNN-Recovery + Resync-Button | L | 01, 06 |

Parallelisierbar: 01/02/03/04/07/08 sind untereinander unabhängig. 05 braucht 01+04;
06 braucht 03 (Tests pinnen Verhalten) + 04 (LockedState); 09 braucht 01+06.

## Grundregeln (gelten für JEDE Phase — nicht verhandelbar)

1. **Grün + ein Commit pro Spec.** Vor Abschluss: `uv run pytest -q` komplett grün
   (Baseline: 102 passed, 3 skipped). Commit-Message referenziert die Spec, z. B.
   `rework 01: Serving-Facade (specs/rework/01-serving-facade.md)`.
2. **Contracts sind eingefroren.** URL-Pfade, Response-Shapes, Dateiformate (Session-log.jsonl,
   session.yaml, Manifest-JSONL, split.json, Run-config.json) dürfen nur **additiv** geändert
   werden (neue optionale Felder ok, nichts umbenennen/entfernen). Das React-Frontend wird in
   diesem Rework NICHT umgebaut; wenn du seine API brichst, ist die Phase fehlgeschlagen.
3. **torch nur lazy** in Funktionskörpern importieren, nie auf Modulebene (ROCm-Windows-Setup;
   CLI/Web müssen ohne GPU-Stack starten). Gleiches gilt für `cv2` in Web-Modulen, die vor
   `create_app()` importiert werden.
4. **Lock-Disziplin:** Locks schützen ausschließlich Zustandszugriff (Dict lesen/schreiben).
   Niemals einen Lock über `CAMERA.read()`, Modell-Inference, `run_slice`, `subprocess` oder
   `thread.join()` halten. MJPEG-/Loop-Generatoren nehmen genau **einen Snapshot pro Iteration**.
5. **Domäneninvarianten:** Feldnotation `a1`..`h8`; Klassenliste kommt ausschließlich aus
   `config.CLASSES` (14, inkl. `occluded`); keine Rotations-/Flip-Augmentierung (feste Kamera,
   Feldfarbe ist Signal); Ecken-Reihenfolge in Profilen/Adaptern ist `[a8, h8, h1, a1]`;
   Train/Val/Test-Split immer pro Session.
6. **Stil wie Bestand:** Kommentare/Doku/Fehlermeldungen auf Deutsch, kurze Modul-Docstrings,
   `print` mit `[OK]/[FAIL]/[WARN]`-Glyphen in CLI-Pfaden, Logger `chesslab.<modul>` in
   Daemon-/Web-Pfaden. Keine neuen Abhängigkeiten ohne Not (pydantic ist via FastAPI da).
7. **Bei Abweichung: anhalten.** Wenn die Spec nicht zur Realität passt (Symbol existiert nicht,
   Zeilenref driftet stark, Test schlägt aus unerwartetem Grund fehl), NICHT improvisieren —
   Befund dokumentieren und Rückfrage stellen. Zeilenangaben in den Specs sind Stand Commit
   `bc623f3` und als Orientierung gedacht; verbindlich sind die Symbolnamen.

## Projekt-Kurzorientierung

- Repo-Wurzel: `pyproject.toml` (Paket `chesslab` unter `src/chesslab/`), Tests in `tests/`
  (pytest, `uv run pytest -q`), Prototyp `move_tracker/` auf Root-Ebene (zieht in Phase 06 um).
- Kern-Pipeline: `calibration.py` (Homographie/Profile) → `collect.py` (Sessions:
  `data/sessions/<id>/log.jsonl` + `session.yaml`) → `labeling.py` (Slicing/Labels aus FEN →
  `data/squares*/`, Manifest `data/manifests/*.jsonl`) → `dataset.py`/`dataset_build.py`
  (Stats/Split/kuratierte Datensätze) → `training/` (SmallCNN/MobileNetV3, Run-Verzeichnisse
  `data/models/<run>/` mit `config.json` + `best.pt`).
- Web-UI: `src/chesslab/web/app.py` (FastAPI, alle Routen), `camera.py` (CAMERA-Singleton,
  BoardTracker, mjpeg-Helper), `inference.py`, `scan.py`; React-Frontend unter `web/frontend/`,
  gebaute Assets committed unter `web/static/`.
- Nützliche Test-Bausteine zum Wiederverwenden: `tests/test_calibration.py::_make_profile`
  (Identitätsprofil), `tests/test_web.py` (TestClient-Muster, `_identity_session`),
  `tests/test_ingest.py::_synthetic_board` (farbcodiertes Brett für Orientierungstests).

## Definition of Done (jede Phase)

- [ ] Alle Punkte der Phasen-Spec umgesetzt bzw. begründet zurückgemeldet
- [ ] `uv run pytest -q` grün, neue Tests laufen headless (kein GPU/Kamera/Blender nötig;
      torch-abhängige Tests via `pytest.importorskip("torch")`)
- [ ] Keine Contract-Änderung außer additiven Feldern (Regel 2)
- [ ] Ein Commit mit Spec-Referenz, Arbeitsbaum danach sauber
