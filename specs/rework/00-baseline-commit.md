# 00 — Baseline-Commit

> **Status: ERLEDIGT** (Commit `bc623f3`, 2026-07-02). Diese Spec dokumentiert die Phase nur
> noch für Nachvollziehbarkeit — nichts mehr zu tun.

## Ziel

Den dreckigen Ist-Stand (move_tracker-Rework, Ingest-Adapter, Synth-Pipeline, Scan-UI,
Review-Berichte) sichern, bevor der Rework Dateien anfasst. Grüne Test-Baseline festhalten.

## Was getan wurde

1. `uv run pytest -q` → **102 passed, 3 skipped** (die verbindliche Baseline für alle Phasen).
2. `.gitignore`: `tmp/` ergänzt (`scans/` war schon drin). `synth_assets/` (0.9 MB, handgebaute
   Blender-Szene) und `synth_pieces/` (28 MB, gescannter Bauer) wurden bewusst **committet** —
   schwer reproduzierbare Artefakte.
3. Ein Commit über den gesamten Baum: `bc623f3 checkpoint: move_tracker rework, ingest adapters,
   synth pipeline, Scan UI, Architektur-Review`.

## Definition of Done

- [x] Testsuite grün (102/3)
- [x] `git status` sauber
- [x] Checkpoint-Commit vorhanden
