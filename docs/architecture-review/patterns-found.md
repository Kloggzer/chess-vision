# Design-Patterns im Projekt

Bestandsaufnahme der bewusst oder implizit verwendeten Muster, mit Bewertung der Anwendung.

## Korrekt angewendet

### Pipeline / Staged Architecture (Kern)
Die gesamte Kern-Library ist eine dateibasierte Pipeline mit klaren Stufen-Contracts
(Profil-YAML → Session-JSONL → Manifest-JSONL → split.json → Run-Verzeichnis). Jede Stufe ist
einzeln wiederholbar (`collect` und `slice` getrennt → Re-Slicing ohne Neuaufnahme). Das ist die
tragende Architekturentscheidung des Projekts und funktioniert gut.
**Dateien:** collect.py, labeling.py, dataset.py, training/

### Adapter (ingest_adapters/)
Sauberes Plugin-Muster: einheitlicher Contract `iter_items(root) -> Iterator[ImportItem]`,
`ImportItem`-Dataclass als Schema, drei Implementierungen (chesscog, chessred, synthetic), die
unterschiedliche Ecken-Reihenfolgen/FEN-Formate auf das interne Format normalisieren. Zustandslos,
funktional, gut testbar (chesscog/chessred getestet; synthetic noch nicht — siehe Issues C3).
**Dateien:** ingest_adapters/__init__.py, chesscog.py, chessred.py, synthetic.py

### Single Source of Truth (config.py)
Klassenliste `CLASSES`, Crop-Defaults, Augment-Policy, Photometrie-Defaults, `Paths`-Abstraktion —
alles genau einmal definiert, überall importiert. `Paths` als Parameter macht Tests isolierbar.
Das CLAUDE.md-Prinzip „Konfig vor Code" wird weitgehend gelebt.
**Einschränkung:** Crop-Parameter existieren zusätzlich als `calibration.CropParams` (Duplikat, M5).

### Lazy Import (torch, UI)
torch wird konsequent erst in Funktionen importiert (web/inference.py, training/*), damit
CLI/Web ohne GPU-Stack starten; OpenCV-GUI ebenso. Bewusste, dokumentierte Entscheidung
(Memory: „lazy torch"). Korrekt angewendet.
**Gegenbeispiel:** der Lazy-Import in geometry3d.py:159 ist kein Feature, sondern kaschiert
einen Import-Zyklus (M1).

### Strategy (Trainings-Köpfe & Photometrie)
Modell-Köpfe (`combined` / `factored` / `twostage`) und Photometrie-Operatoren
(`none`/`clahe`/`gamma`/`grayworld`) sind als austauschbare Strategien über Config-Strings
gewählt und im Bake-off (`experiment.py`) systematisch gekreuzt. Saubere Anwendung; das
Bake-off-Grid ist praktisch ein kleines Experiment-Framework.
**Dateien:** training/model.py:68–137, photometric.py, experiment.py

### Guarded Shared State + Producer/Consumer (move_tracker)
`MoveTracker`: Capture-Daemon-Thread produziert Zustand (Board, Overlays, Note), FastAPI-Handler
konsumieren unter einem gemeinsamen `threading.Lock`. Innerhalb der Klasse konsequent; das Muster
endet aber an der Klassengrenze (`_STATE`-Dict der App ist ungeschützt, H1).

### Smoothing/Tracker-Objekt (MarkerTracker)
EMA-Glättung + Dead-Zone + Halten bei Okklusion + Seed aus Kalibrierung als eigenes zustandsbehaftetes
Objekt, wiederverwendet von Web-Kamera und move_tracker (live_align). Gute Wiederverwendung; die
Zustandslogik ist komplex genug, dass sie Dokumentation/Tests verdient.

## Implizit vorhanden / verbesserungswürdig

### Singleton via Modul-Globals (Web-Layer) — Anti-Pattern in dieser Form
`_TRAIN`, `_COLLECT`, `_INFER`, `_MANUAL`, `CAMERA`, `_STATE` sind Modul-Level-Singletons.
Für ein lokales Tool pragmatisch, aber ohne Locks und ohne Lebenszyklus (kein Timeout, kein
Cleanup beim Feature-Wechsel). Empfehlung: beibehalten, aber je Dict ein Lock + explizite
Reset-Semantik (H1).

### Model-Run als Artefakt-Contract (Run-Verzeichnis)
`data/models/<run>/` mit `config.json` + `best.pt` fungiert als implizites
„Model-Registry"-Pattern. Gut: Konsumenten laden Modell **und** Preprocessing-Config zusammen.
Schlecht: der Lade-Einstieg ist privat (`_load_run`, H4) und die Preprocessing-Anwendung
(Photometrie!) ist nicht Teil des Contracts (C1).

### Fehlende Muster, die sich anbieten
- **Observer/Voter-Seam im move_tracker:** Frame-Diff und (geplanter) CNN-Beobachter als
  gleichförmige Kandidaten-Lieferanten `(move, score)`, kombiniert von einer Voting-Instanz (M3).
- **Facade für „Frame → modellfertige Crops":** eine Funktion, die Geometrie + Photometrie aus
  der Run-Config kapselt — beseitigt die Train/Serve-Duplikation (C1/R1).
- **Schema-Objekte für Wire-Formate:** Pydantic-Modelle für API-Bodies (M2) und ein dokumentiertes
  Manifest-/Session-Schema (M5) — heute leben die Schemata nur im Writer-Code.
