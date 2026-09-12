# Phase 02 — Höhe und Ausrichtung messbar machen

## Why

Die App soll nach Höhe und Ausrichtung steuern, aber **beide stehen heute in keinem Manifest**.
Ohne Erfassung kann kein Werkzeug sagen, welche Höhe fehlt — und die nächste Aufnahme wäre so
blind wie die 24 bisherigen, die alle bei Verkürzung 0,954–1,025 liegen.

Ohne diese Phase misst 01 nichts, es nimmt nur auf.

## Design (entschieden — nicht neu entwerfen)

### `capture.json` je Session (neu)

Die Erfassungs-App legt sie neben `log.jsonl`. Die Ausrichtung ist **deklariert**, nicht
gemessen — die App hat zum Drehen aufgefordert, das ist alles, was sie ehrlich behaupten kann:

```json
{"shot_id": "wQ-light-sehr-hell",
 "height": "normal",
 "light": "sehr hell",
 "steps": [{"frame": "000123", "orientation_deg": 45, "place": {"h3": "wQ"}}]}
```

### Höhe zusätzlich MESSEN, nicht nur glauben

`log.jsonl` trägt je Frame `corners` (`[a8, h8, h1, a1]`). Daraus zwei Zahlen, die heute niemand
rechnet und die keine Aufnahme nachträglich braucht:

```python
def pose_of(corners: list[list[float]]) -> dict:
    """`foreshorten` = hintere Kante / vordere (1,0 = senkrecht von oben),
    `edge_px` = mittlere Kantenlaenge als Abstandsmass.

    Gemessen ueber alle 24 Aufnahmen: foreshorten 0,954-1,025, Median 0,986 - der Korpus hat
    genau eine Pose. Ohne diese Spalten ist das nicht nachpruefbar."""
```

Ort: `src/chesslab/turntable.py` (Phase 00 hat sie angelegt, hier erweitert).

### `scripts/coverage_gaps.py` erweitern

Zwei neue Achsen in `data/reports/coverage-gaps.json`, als eigener Block neben `gaps`:

```json
{"axes": {"height": {"normal": 981234, "hoch": 0, "tief": 0},
          "orientation_deg": {"0": 981234, "45": 0, "90": 0}}}
```

Fehlt `capture.json`, zählt die Aufnahme unter `"unbekannt"` — **nicht** unter `"normal"`.
Nicht erfasst ist nicht dasselbe wie erfasst und normal.

## Steps

1. `pose_of` + Tests → `feat(turntable): Kamerapose aus den Brettecken`
2. `capture.json` lesen, in den Achsen-Block zählen → `feat(coverage): Hoehe und Ausrichtung als Achsen`
3. `docs/turntable-capture.md` um die Messung ergänzen → `docs(turntable): wie die Pose gerechnet wird`

## Tests

`tests/test_turntable.py` (von Phase 00 angelegt) — `uv run pytest -q tests/test_turntable.py`:

- Ein perfekt rechteckiger Quad ergibt `foreshorten == 1.0`.
- Ein Quad mit kürzerer hinterer Kante ergibt einen Wert unter 1,0.
- Eine Session **ohne** `capture.json` landet unter `"unbekannt"`, nicht unter `"normal"`.
- Zwei `capture.json` mit verschiedener Höhe erzeugen zwei Einträge in `axes.height`.

## Acceptance

- `uv run python scripts/coverage_gaps.py` schreibt einen `axes`-Block, in dem
  `axes.height.unbekannt` heute **alle** Zeilen des Korpus trägt.
- `uv run ruff check src/chesslab/turntable.py scripts/coverage_gaps.py` sauber.

## Do NOT

- Keine Android-Datei anfassen — das ist 01.
- `log.jsonl` nicht um Spalten erweitern. Die Pose wird gerechnet, nicht gespeichert; ein
  Re-Slice würde eine gespeicherte Kopie sonst still veralten lassen.
- Keine Aufnahme nachträglich mit einer erfundenen Höhe versehen.
