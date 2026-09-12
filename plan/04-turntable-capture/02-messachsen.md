# Phase 02 — Hoehe und Ausrichtung messbar machen

## Why

Die App soll nach Hoehe und Ausrichtung steuern, aber **beide stehen in keinem Manifest**. Ohne
Erfassung waere die naechste Aufnahme so blind wie die 24 bisherigen, die alle bei Verkuerzung
0,954–1,025 liegen. Ohne diese Phase nimmt 01 auf, ohne zu messen.

## Design (entschieden — nicht neu entwerfen)

### `capture.json` je Aufnahme (neu, von 01 geschrieben)

Neben `log.jsonl`. Die Ausrichtung ist **deklariert**, nicht gemessen — die App hat zum Drehen
aufgefordert, mehr kann sie ehrlich behaupten. `place` hat **dieselbe Form wie im Schema**, eine
Liste von Objekten:

```json
{"id": "wQ-light", "height": "normal", "light": null,
 "steps": [{"frame": "frames/0000.jpg", "orientation_deg": 45,
            "place": [{"square": "h3", "piece": "wQ"}]}]}
```

### Pose aus den Ecken RECHNEN, nicht glauben

`log.jsonl` traegt je Frame `corners` in der Reihenfolge `[a8, h8, h1, a1]`
(`SessionRecorder.kt:71-73`). Die hintere Kante ist `a8–h8`, die vordere `a1–h1`.

```python
def pose_of(corners: list[list[float]]) -> Pose:
    """`foreshorten` = hintere Kante / vordere, `edge_px` = mittlere Kantenlaenge."""
```

`Pose` ist ein `TypedDict` mit genau `foreshorten: float` und `edge_px: float` — kein loses
`dict`, damit der Leser dieselbe Form sieht wie der Erzeuger. Ort: `src/chesslab/turntable.py`.

### `scripts/coverage_gaps.py` erweitern

Ein Block `axes` neben `gaps`:

```json
{"axes": {"height": {"unbekannt": 979363}, "orientation_deg": {"unbekannt": 979363}}}
```

**Die Abbildung Zeile → Aufnahme.** Das Manifest traegt `session_id` (`rg-2026-09-11-20-00-52`),
der Ordner heisst `data/recordings/2026-09-11-20-00-52` — also `removeprefix("rg-")`, wie es
`scripts/hand_audit.py:session_facts` schon macht. **138 der 161 `session_id` sind `comp-*`** und
haben ueberhaupt keinen Ordner; sie zaehlen unter `"unbekannt"`, ohne Warnung. Fehlt `capture.json`
bei einer `rg-`Aufnahme, ebenfalls `"unbekannt"` — **nie** `"normal"`. Nicht erfasst ist nicht
dasselbe wie erfasst.

## Steps

1. `pose_of` + `Pose` + Tests → `feat(turntable): Kamerapose aus den Brettecken`
2. `capture.json` lesen, Achsen zaehlen → `feat(coverage): Hoehe und Ausrichtung als Achsen`
3. Doku ergaenzen → `docs(turntable): wie die Pose gerechnet wird`

## Tests

`uv run pytest -q tests/test_turntable.py`:

- Ein rechteckiger Quad ergibt `foreshorten == 1.0`.
- Kuerzere hintere Kante ergibt einen Wert **unter** 1,0 (Reihenfolge `[a8,h8,h1,a1]` beweisen).
- Eine `rg-`Aufnahme **ohne** `capture.json` landet unter `"unbekannt"`, nicht unter `"normal"`.
- Eine `comp-`Session ohne Ordner erzeugt keine Warnung und landet unter `"unbekannt"`.
- Zwei `capture.json` mit verschiedener Hoehe erzeugen zwei Eintraege in `axes.height`.

## Acceptance

- `uv run python scripts/coverage_gaps.py` schreibt einen `axes`-Block, in dem
  `axes.height.unbekannt` **alle** Zeilen des Korpus traegt — heute ist das der einzige Wert.
- `uv run ruff check src/chesslab/turntable.py scripts/coverage_gaps.py` sauber.
- `uv run pytest -q tests/test_comment_budget.py` gruen (Docstrings zaehlen mit, Limit 5).

## Do NOT

- Keine Android-Datei — das ist 01.
- `log.jsonl` nicht um Spalten erweitern: die Pose wird gerechnet, nicht gespeichert, sonst
  veraltet eine Kopie nach einem Re-Slice still.
- Keine Aufnahme nachtraeglich mit einer erfundenen Hoehe versehen.
- Das Helligkeitsband nicht anfassen — `band_of` behandelt fehlende `brightness` seit
  2026-09-12 als `"unbekannt"`, und 376 640 Zeilen haengen daran.
