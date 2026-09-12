# Phase 02 — Hoehe und Ausrichtung messbar machen

## Why

Die App steuert nach Hoehe und Ausrichtung, aber **beide stehen in keinem Manifest**. Ohne
Erfassung waere die naechste Aufnahme so blind wie die 24 bisherigen, die alle bei Verkuerzung
0,955–1,025 liegen. Ohne diese Phase nimmt 01 auf, ohne dass es jemand messen kann.

## Design (entschieden — nicht neu entwerfen)

### Pose aus den Ecken RECHNEN

`log.jsonl` traegt je Frame `corners` als `[a8, h8, h1, a1]` (`SessionRecorder.kt:70-72`). Hintere
Kante ist `a8–h8`, vordere `a1–h1`.

```python
class Pose(TypedDict):
    foreshorten: float      # hintere Kante / vordere; 1,0 = senkrecht von oben
    edge_px: float          # mittlere Kantenlaenge, als Abstandsmass

def pose_of(corners: list[list[float]]) -> Pose: ...
```

Ort: `src/chesslab/capture_plan.py` (von 00 angelegt, hier erweitert).

### `capture.json` lesen

Format und Schreiber: Phase 01. Diese Phase **liest nur**. Fehlt die Datei, ist die Aufnahme
`"unbekannt"` — nie `"normal"`.

### `scripts/coverage_gaps.py` erweitern

Ein Block `axes` neben `gaps`:

```json
{"axes": {"rows_counted": 979363,
          "height": {"unbekannt": 979363},
          "orientation_deg": {"unbekannt": 979363}}}
```

**Der Nenner ist ausdruecklich ein anderer als bei `gaps`.** `gaps` zaehlt nur sichtbare
Figurenzellen (`empty` und alles ueber `PIECE_VISIBLE_MAX` fallen raus, `coverage_gaps.py:50`);
`axes` zaehlt **alle** Manifestzeilen, weil Hoehe und Ausrichtung Eigenschaften der Aufnahme sind
und nicht der Zelle. `rows_counted` macht das explizit, damit niemand die beiden Bloecke
gegeneinander rechnet.

**Die Abbildung Zeile → Aufnahme.** `session_id` `rg-2026-09-11-20-00-52` → Ordner
`data/recordings/2026-09-11-20-00-52`, also `removeprefix("rg-")`, genau wie
`scripts/hand_audit.py:52`. **138 der 161 `session_id` sind `comp-*`** und haben keinen Ordner;
sie zaehlen unter `"unbekannt"`, ohne Warnung — das ist kein Fehler, sondern ihre Natur.

## Steps

1. `pose_of` + `Pose` + Tests → `feat(capture): Kamerapose aus den Brettecken`
2. `capture.json` lesen, Achsen zaehlen → `feat(coverage): Hoehe und Ausrichtung als Achsen`
3. `docs/capture-axes.md` ergaenzen → `docs(capture): wie die Pose gerechnet wird`

## Tests

`uv run pytest -q tests/test_capture_plan.py`:

- Ein rechteckiger Quad ergibt `foreshorten == 1.0`.
- Eine kuerzere hintere Kante ergibt einen Wert **unter** 1,0 — der Test setzt die Ecken in der
  Reihenfolge `[a8,h8,h1,a1]` und beweist damit die Zuordnung, nicht nur das Vorzeichen.
- Eine `rg-`Aufnahme **ohne** `capture.json` landet unter `"unbekannt"`, nicht unter `"normal"`.
- Eine `comp-`Session ohne Ordner erzeugt keine Warnung und landet unter `"unbekannt"`.
- Zwei `capture.json` mit verschiedener Hoehe erzeugen zwei Eintraege in `axes.height`.
- `axes.rows_counted` ist groesser als die Summe aller `gaps[*].have` (verschiedene Nenner).

## Acceptance

- `uv run python scripts/coverage_gaps.py` schreibt `axes`, und heute traegt
  `axes.height.unbekannt` **alle** Zeilen — pruefbar:
  `python -c "import json;d=json.load(open('data/reports/coverage-gaps.json'));a=d['axes'];assert a['height']['unbekannt']==a['rows_counted']"`
- `uv run ruff check src/chesslab/capture_plan.py scripts/coverage_gaps.py` sauber.
- Kein Kommentar- oder Docstring-Block in den beiden Dateien ueber 5 Zeilen (`test_comment_budget`
  scannt nur `src/chesslab`; fuer `scripts/` von Hand pruefen).

## Do NOT

- Keine Android-Datei — das ist 01. `capture.json` nicht schreiben, nur lesen.
- `log.jsonl` nicht um Spalten erweitern: die Pose wird gerechnet, nicht gespeichert, sonst
  veraltet eine Kopie nach einem Re-Slice still.
- Keine Aufnahme nachtraeglich mit einer erfundenen Hoehe versehen.
- `band_of` nicht anfassen — fehlende `brightness` gilt seit 2026-09-12 als `"unbekannt"`, und
  376 640 Zeilen haengen daran.
