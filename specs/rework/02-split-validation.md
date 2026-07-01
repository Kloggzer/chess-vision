# 02 — Harte Split-Validierung mit `--allow-degenerate`

**Größe:** S · **Hängt ab von:** 00 · **Blockiert:** —

## Ziel & Kontext

Das Training auf den bisherigen Datensätzen litt an Positions-Overfitting: mehrere Klassen
existieren nur in **einer** Session, der Test-Split war leer — `make_split` hat das nur als
Warnung ausgegeben (12× in `split.json`), und die Warnungen wurden überlesen. Ergebnis: Wochen
an Bake-off-Läufen mit eingeschränkter Aussagekraft. Ab jetzt scheitert der Split **hart** an
degenerierten Konstellationen; für bewusste Experimente gibt es einen Escape-Hatch.

## Änderungen

### 1. `src/chesslab/dataset.py` — Fehler vs. Warnungen trennen

Neue Funktion (Berechnung von `make_split` (≈ Z.181) selbst bleibt unverändert):

```python
def validate_split(split: dict, rows: list[dict]) -> tuple[list[str], list[str]]:
    """(errors, warnings). Errors = degeneriert, saubere Evaluierung unmöglich."""
```

**Errors (hart):**
- Eine Klasse (aus `config.CLASSES`, `occluded` ausgenommen falls global nicht vorhanden)
  kommt im Gesamtbestand vor, aber nur in **einer** Session.
- Test-Split leer. · Val-Split leer.

**Warnungen (weich, wie bisher):** Klasse fehlt in Val/Test; optional die Heuristik „Train- und
Val-Sessions haben dieselbe Figur-auf-Linie-Zuordnung" (aus Session-FENs ableitbar) — als
Warnung, NICHT hart (zu unscharf).

Fehlertext handlungsleitend, z. B.:
`Klasse wQ existiert nur in Session 20260626-134441 — neue Session mit zufälliger
Figur-Linien-Zuordnung aufnehmen, oder --allow-degenerate setzen.`

### 2. Durchreichen an alle Aufrufer

- `dataset.run_split(..., allow_degenerate: bool = False)` (≈ Z.319): bei Errors ohne Flag →
  `[FAIL]`-Zeilen auf stdout + Return-Code 1. Mit Flag: Errors werden als `[WARN]` gedruckt
  und zusätzlich in `split.json` unter `"degenerate_errors"` (additiv) abgelegt.
- `dataset_build.build_dataset(..., allow_degenerate=False)` (≈ Z.206): bei Errors
  `raise ValueError("\n".join(errors))`.
- CLI (`cli.py`): `chesslab split --allow-degenerate` und
  `chesslab dataset build --allow-degenerate` (Typer-Option, Default False, Hilfetext deutsch).
- Web (`web/app.py`): `POST /api/split` und `POST /api/datasets` (create/rebuild) bekommen
  additiven Body-Param `allow_degenerate: bool = Body(False)`. `ValueError` aus
  `build_dataset` → `HTTPException(400, detail=str(e))` (das React-Frontend zeigt `detail`
  bereits an — kein Frontend-Umbau). Der Legacy-Auto-Split in `POST /api/train`
  (≈ Z.502–507) wandelt den Fehler ebenfalls in eine `HTTPException(400, …)` mit den
  Fehlerzeilen um.

### 3. Doku

`REPORT.md`: kurzer datierter Absatz „Split-Validierung ist ab jetzt hart; Alt-Datensätze sind
degeneriert und brauchen `--allow-degenerate` oder neue Sessions (zufällige
Figur-Linien-Zuordnung)."

## Tests

`tests/test_dataset.py` / `tests/test_dataset_build.py` erweitern (bestehende
Fixture-Muster mit synthetischen Manifest-Zeilen wiederverwenden):

1. Manifest, in dem `wQ` nur in einer Session vorkommt → `validate_split` listet den Error;
   `run_split` → rc 1; `build_dataset` → `ValueError`.
2. Gleiches Manifest mit `allow_degenerate=True` → läuft durch, `split.json` enthält
   `degenerate_errors`.
3. Fixture mit ≥3 Sessions, jede Klasse in ≥2 Sessions, nichtleerem Val+Test → 0 Errors.
4. TestClient (`tests/test_web.py`-Muster): `POST /api/datasets` mit degenerierten Sessions →
   Status 400, `detail` enthält den Klassennamen; mit `allow_degenerate: true` → 200.

## Definition of Done

- [ ] `validate_split` mit Error/Warnung-Trennung; Fehlertexte handlungsleitend (deutsch)
- [ ] rc 1 / ValueError / HTTP 400 auf allen vier Pfaden (CLI split, CLI dataset build, API, Auto-Split in /api/train)
- [ ] `--allow-degenerate` überall verfügbar, `split.json` nur additiv erweitert
- [ ] Tests 1–4 grün, Gesamtsuite grün, Commit `rework 02: …`

## Guardrails

- `split.json`-Schema nur additiv erweitern (bestehende Reader dürfen nicht brechen).
- Die Figur-Linien-Heuristik NICHT hart schalten — false positives würden legitime Splits blocken.
- Vorhandene Alt-Datensätze auf Platte scheitern ab jetzt bewusst — genau das ist der Zweck;
  nicht „reparieren", sondern der Fehlertext führt zum richtigen Verhalten.
