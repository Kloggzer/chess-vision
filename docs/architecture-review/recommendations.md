# Empfehlungen (priorisiert)

Reihenfolge nach Nutzen-pro-Aufwand für das Projektziel „verlässliches Move-Tracking".
Referenzen (C/H/M/L) → [issues-and-concerns.md](issues-and-concerns.md).
Training/Datenqualität hat eine eigene Roadmap: [training-accuracy-improvements.md](training-accuracy-improvements.md).

---

## R1 — Eine kanonische „Frame → modellfertige Crops"-Facade (löst C1, H4, Teile von M5)

**Was:** Eine öffentliche Funktion im Kern, z. B. in `labeling.py` oder neuem `serving.py`:

```python
def load_run(run_dir) -> (model, cfg)          # öffentlich, ersetzt _load_run-Imports
def crops_for_model(frame, corners, profile, run_cfg) -> list[np.ndarray]
    # wendet Geometrie (warp/box3d) UND Photometrie UND out_size aus der Run-config an
```

`slice`, `web/inference.predict_arrays` und der kommende move_tracker-CNN-Resync nutzen nur noch
diesen Pfad.

**Warum zuerst:** Das ist der einzige Punkt, an dem ein Architekturfehler direkt Modellgenauigkeit
kostet (Train/Serve-Skew: Photometrie-Modelle liefern über `predict_arrays` heute Zufallsausgaben).
Jede weitere Trainingsverbesserung ist wertlos, wenn die Inference andere Crops sieht als das
Training. Aufwand: ~1 Tag.

## R2 — Sicherheitsnetz-Tests für die dunklen Subsysteme (löst C3)

**Was:**
- `tests/test_move_tracker.py`: `normalize_diffs` (Median-Baseline), `best_legal_move`
  (synthetische Diff-Maps: einfacher Zug, Schlag, Rochade, Ambiguität, „beide Endpunkte müssen
  sich ändern"), Voting-Verhalten. Alles ohne Kamera — reine Funktionen.
- Synthetic-Adapter-Test: Beispiel-JSON (aus einem echten Render) einchecken, Ecken-Reihenfolge
  `[a8,h8,h1,a1]` und Label-Ableitung gegen bekannte FEN prüfen.

**Warum:** Der Erkennungsalgorithmus wurde zuletzt stark umgebaut (Rolling Average, max_changed,
live_align) und wird weiter umgebaut (CNN-Recovery) — ohne Tests ist jede Änderung Blindflug.
Der Ecken-Test schützt vor dem teuersten Fehler überhaupt (stilles Label-Drehen des gesamten
Synth-Datensatzes). Aufwand: ~1 Tag.

## R3 — Web-Layer härten: Locks, Fehler sichtbar machen, Log-Handle (löst H1, H2, H3)

**Was:** Je Zustands-Dict ein `threading.Lock`; `except Exception` durch Logging + Fehlerfeld in
der Response ersetzen (v. a. Auto-Slice `app.py:794,1008`); Train-Log-Handle nach `Popen` schließen;
`logging.basicConfig` im Web-Prozess. move_tracker: `_STATE`-Wechsel unter Lock,
`stop()` mit `join(timeout=2)`.

**Warum:** Geringer Aufwand (~½ Tag), beseitigt die „Warum ging das kaputt und niemand sagt was"-
Klasse von Problemen, die bei einem Kamera-/Subprozess-System die meiste Debugging-Zeit frisst.

## R4 — Observer-Seam im move_tracker vor dem CNN-Einbau (löst M3)

**Was:** `_try_detect` so schneiden, dass Kandidaten-Lieferanten austauschbar sind:
Frame-Diff-Beobachter liefert `(move, score, second_score)`, ein optionaler CNN-Beobachter liefert
Occupancy-Deltas; eine Kombinationsstufe entscheidet (Diff primär, CNN als Schiedsrichter bei
Ambiguität/Recovery). Kein großes Framework — zwei Funktionen mit gleicher Signatur reichen.

**Warum:** Der CNN-Recovery-Einbau steht unmittelbar an. Ohne Seam wächst `_try_detect` zum
zweiten God-Module; mit Seam ist der CNN ein 30-Zeilen-Zusatz und einzeln testbar (R2).

## R5 — Split-Validierung hart machen (löst C2, flankiert die Trainings-Roadmap)

**Was:** `dataset split` schlägt fehl (Exit ≠ 0, klare Meldung), wenn (a) eine Klasse nur in einer
Session vorkommt, (b) der Test-Split leer ist, (c) Train/Val dieselbe Figur-Linien-Zuordnung teilen
(heuristisch prüfbar über die Session-FENs). Optional `--allow-degenerate` für bewusste Experimente.

**Warum:** Die Warnungen existierten bereits und wurden (verständlicherweise) überlesen — das
Ergebnis waren Wochen an Bake-off-Läufen mit eingeschränkter Aussagekraft. Ein harter Fehler an
der richtigen Stelle ist billiger als jede nachträgliche Analyse.

## R6 — synth-Pipeline reproduzierbar machen (löst H5, M von Issue 8/10)

**Was:** Pfade (`--blend`, `--pieces-dir`, `--out`) und Auflösung als Argumente/Config statt
cwd-relativ; ein `synth/README.md` mit der vollständigen Befehlskette; optional
`chesslab synth render`-Subcommand als Orchestrierung.

**Warum:** Die Synth-Daten sind laut Trainings-Roadmap der Hebel gegen den Datenmangel — dann muss
die Erzeugung wiederholbar sein, nicht Operator-Gedächtnis.

## R7 — Aufräumarbeiten mittlerer Priorität

- `_resize_keep_aspect` aus `labeling` herauslösen → Import-Zyklus weg (M1).
- Pydantic-Modelle für `/api/train` und `/api/datasets` (M2); Rest nach Bedarf.
- `web/app.py` in Feature-Router aufteilen (train/collect/inference/scan) — erst sinnvoll,
  wenn R3 die Zustands-Locks eingeführt hat.
- Label→FEN-Helfer aus `web/app.py:60–84` nach `labeling`/`config` verschieben (M5).
- move_tracker nach `src/chesslab/move_tracker/` + CLI-Subcommand, sobald er den Prototyp-Status
  verlässt (M4). README-Parametertabelle um `live_align`/`avg_frames`/`max_changed` ergänzen.

## Bewusst NICHT empfohlen (jetzt)

- **SSE/WebSockets statt Polling** (L1): Mehraufwand ohne spürbaren Nutzen im Lokalbetrieb.
- **OpenAPI-Client-Generierung** (L2): lohnt erst, wenn die API stabilisiert ist.
- **Async-Umbau der FastAPI-Handler:** Die Blocking-Operationen laufen bereits in Subprozessen/
  Threads; ein Async-Umbau wäre Kosmetik mit Regressionrisiko.
- **Factored-Head weiter debuggen:** empirisch unterlegen; erst nach Datenausbau erneut bewerten
  (siehe Trainings-Roadmap P6).
