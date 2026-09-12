# Phase 03 — Hoehe und Ausrichtung messbar machen

## Why

Die App steuert nach Hoehe und Ausrichtung, aber **beide stehen in keinem Manifest**. Ohne
Erfassung waere die naechste Aufnahme so blind wie die 24 bisherigen, die alle bei Verkuerzung
0,955–1,025 liegen. Ohne diese Phase nimmt 02 auf, ohne dass es jemand messen kann.

## Design (entschieden — nicht neu entwerfen)

### Pose aus den Ecken RECHNEN

`log.jsonl` traegt je Frame `corners` als `[a8, h8, h1, a1]` (`SessionRecorder.kt:70-72`). Hintere
Kante ist `a8–h8`, vordere `a1–h1`.

```python
class Pose(TypedDict):
    foreshorten: float      # Kante a8-h8 / Kante a1-h1; 1,0 = senkrecht von oben
    edge_px: float          # Mittel ALLER VIER Kanten, als Abstandsmass

def pose_of(corners: list[list[float]]) -> Pose: ...
```

Ort: `src/chesslab/capture_plan.py` (von 00 angelegt, hier erweitert).

### `capture.json` lesen

Autoritaet ist `docs/capture-session.schema.json`, Schreiber ist 02. Diese Phase **liest nur** und
spiegelt die Form als `TypedDict` (`CaptureSession`, `CaptureStep`), damit beide Seiten der Naht
benannt sind. Fehlt die Datei, ist die Aufnahme `"unbekannt"` — nie `"normal"`.

**Der Verbund je Achse ist verschieden**, und das ist der Kern dieser Phase:

| Achse | Schluessel | Verbund |
|---|---|---|
| `height` | je Aufnahme | `session_id` → Ordner, `removeprefix("rg-")` |
| `orientation_deg` | je **Frame** | zusaetzlich `row["frame"]` gegen `Path(step["frame"]).stem` |
| `foreshorten` | je **Frame** | aus `corners` derselben `log.jsonl`-Zeile, ueber `pose_of` |

Die Datei liegt im Bundle unter `files/sessions/<id>/capture.json`; gesucht wird mit
`glob("files/sessions/*/capture.json")`, wie `realgames.stored_session_dirs` es tut.

### `scripts/coverage_gaps.py` erweitern

Ein Block `axes` neben `gaps`:

```json
{"axes": {"rows_counted": 979363,
          "height": {"unbekannt": 979363},
          "orientation_deg": {"unbekannt": 979363},
          "foreshorten": {"0.95-1.00": 602723, "unbekannt": 376640}}}
```

`foreshorten` ist der Abnehmer von `pose_of`: je Manifestzeile die Pose ihres Frames, in Stufen
von 0,05 gebuendelt. Ohne sie waere die Funktion geschrieben und nie aufgerufen — und die
Behauptung „der Korpus hat eine Pose" bliebe eine Fussnote statt einer laufenden Messung.

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
- **Eine Aufnahme MIT `capture.json` landet unter ihrer Hoehe und ihrem Winkel, nicht unter
  „unbekannt"** — der Test legt eine Aufnahme mit zwei Frames und zwei Winkeln an und erwartet
  `axes.orientation_deg == {"0": n, "45": n, "unbekannt": rest}`. Ohne diesen Fall bestuende auch
  eine Implementierung, die `capture.json` nie oeffnet.
- Eine Zeile mit `corners` bekommt einen `foreshorten`-Eimer, eine ohne landet unter `"unbekannt"`.

## Acceptance

- `uv run python scripts/coverage_gaps.py` schreibt `axes`. Heute gibt es keine einzige
  `capture.json`, also traegt `axes.height.unbekannt` alle Zeilen — das allein waere aber auch
  ohne jede Leseroutine wahr. Binaer geprueft wird deshalb ueber eine **angelegte** Aufnahme:
  `uv run pytest -q tests/test_capture_plan.py -k axes` muss den Fall „mit `capture.json`"
  gruen fahren, und zusaetzlich
  `python -c "import json;a=json.load(open('data/reports/coverage-gaps.json'))['axes'];assert a['foreshorten'] and a['rows_counted']>0"`.
- `uv run ruff check src/chesslab/capture_plan.py scripts/coverage_gaps.py` sauber.
- Kein Kommentar- oder Docstring-Block in den beiden Dateien ueber 5 Zeilen (`test_comment_budget`
  scannt nur `src/chesslab`; fuer `scripts/` von Hand pruefen).

## Do NOT

- Keine Android-Datei — das ist 02. `capture.json` nicht schreiben, nur lesen.
- `log.jsonl` nicht um Spalten erweitern: die Pose wird gerechnet, nicht gespeichert, sonst
  veraltet eine Kopie nach einem Re-Slice still.
- Keine Aufnahme nachtraeglich mit einer erfundenen Hoehe versehen.
- `band_of` nicht anfassen — fehlende `brightness` gilt seit 2026-09-12 als `"unbekannt"`, und
  376 640 Zeilen haengen daran.
