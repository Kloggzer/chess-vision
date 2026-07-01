# 07 — Training: Occupancy-Checkpoint-Metrik + kamerarealistische Augmentierung

**Größe:** S–M · **Hängt ab von:** 00 · **Blockiert:** —

## Ziel & Kontext

Der Haupt-Konsument der Modelle ist der move_tracker, und der braucht primär verlässliche
**Occupancy** (leer/besetzt je Feld) — die Figurenidentität kennt er aus der Zughistorie.
Die Diagnose-Metriken zeigen: Occupancy ist heute schon die stärkste Fähigkeit der Modelle
(occ_acc 0.78–0.91), der Figurentyp der Flaschenhals (type_err 0.52–0.59). Trotzdem steuert
das Training Checkpoint-Wahl und Early-Stopping über `(macro_recall, board_acc)` —
`board_acc` (alle 64 Felder korrekt) ist bei 8–70 Val-Frames fast Rauschen. Diese Phase stellt
die Steuerungsmetrik auf Occupancy um und macht die Augmentierung realistischer (echte
Kamera-Daten haben stärkere Helligkeits-/Schärfe-Varianz als die bisherigen ±0.2-Jitter).

## Änderungen

### 1. `training/data.py` — `checkpoint_score` (headless, torch-frei)

```python
def checkpoint_score(rows: list[dict], classes: list[str],
                     trues: list[int], preds: list[int]) -> tuple[float, float, float]:
    """Sortierbarer Score für Checkpoint/Early-Stopping:
    (occ_board_acc, occ_acc, macro_recall) — Occupancy zuerst, macro_recall als Tiebreaker."""
```

Implementierung über die **vorhandenen** Helfer `occupancy_piece_breakdown`
(training/data.py:99) und `occupancy_board_acc` (training/data.py:135) — nichts neu erfinden.
macro_recall wie bisher berechnet weiterreichen.

### 2. `training/train.py` — Score-Umstellung (≈ Z.176–199)

- Nach `evaluate_dataset`: `score = checkpoint_score(val_rows, classes, trues, preds)` ersetzt
  das bisherige `(macro_recall, board_acc)`-Tupel für best.pt-Wahl UND Early-Stopping-Patience.
- metrics.jsonl je Epoche **additiv** um `val_occ_acc`, `val_occ_board_acc`, `val_piece_acc`
  erweitern (bestehende Keys `val_acc`/`val_macro_recall`/`val_board_acc` bleiben — Training.tsx
  liest sie).
- Log-Zeile pro Epoche + Early-Stopping-Meldung + Abschluss-Print benennen die neue Metrik
  („best nach occ_board_acc=…").

### 3. `config.py` — `AugmentPolicy` (≈ Z.130–149)

Neue Werte: `brightness=0.35`, `contrast=0.35`, `gamma=(0.6, 1.8)`, `blur_sigma_max=1.5`.
**Rotation/Flip bleiben verboten** (feste Kamera; Feldfarbe ist Signal — entry.md Regel 5).
Werte fließen automatisch durch `torch_data.build_transform`.

### 4. Doku

- `REPORT.md`: datierter Hinweis „Checkpoint-Kriterium ab 2026-07-xx: occupancy-first —
  best.pt neuer Runs ist nicht mit Bake-off-Ära-Runs vergleichbar; alte Metriken werden
  weiterhin geloggt."
- Optional additiv: `/api/runs` liefert `best_occ_board_acc` mit (kein Frontend-Zwang).

## Tests

`tests/test_training.py` erweitern (bestehende torch-freie Muster nutzen):

1. `checkpoint_score` auf handgebauten rows/trues/preds:
   - Occupancy perfekt, alle Typen falsch → occ_board_acc == 1.0 (Score hoch trotz
     macro_recall niedrig).
   - Genau ein Occupancy-Flip pro Frame → occ_board_acc == 0.0, occ_acc < 1.
   - Sortierbarkeit: Score-Tupel a > b verhält sich wie erwartet.
2. AugmentPolicy-Pinning: Assertion auf die neuen Werte (schützt vor versehentlichem Revert);
   bestehende Assertions in `tests/test_config.py` auf alte Werte prüfen/aktualisieren.
3. Falls die Suite ein Mini-Training fährt (torch-gated): metrics.jsonl-Zeile enthält die drei
   neuen Keys.

## Definition of Done

- [ ] `checkpoint_score` in training/data.py, aus vorhandenen Helfern komponiert
- [ ] train.py steuert best.pt + Patience über den neuen Score; Logs benennen die Metrik
- [ ] metrics.jsonl nur additiv erweitert; AugmentPolicy-Werte umgestellt
- [ ] REPORT.md-Hinweis; Tests grün; Gesamtsuite grün; Commit `rework 07: …`

## Guardrails

- KEINE bestehenden metrics-Keys umbenennen/entfernen (Training.tsx pollt sie).
- Rotation/Flip nicht einführen, auch nicht „nur ein bisschen".
- Die Metrik-Umstellung ändert, welcher Checkpoint gewinnt — beabsichtigt; A/B der neuen
  Augmentierungswerte auf einem echten Datensatz ist Operator-Aufgabe, nicht Teil dieser Phase.
