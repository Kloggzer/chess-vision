# Phase 00 — Planer, API und die JSON-Formen

## Why

`scripts/coverage_gaps.py` nennt die Lücken, aber niemand kann sie aufnehmen: eine Zeile
`{"piece": "wQ", "square_color": "light", "band": "sehr hell", "have": 0}` sagt nicht, auf
welches Feld die Dame gehört. Die Brücke fehlt — welches Feld welches Helligkeitsband trägt,
steht messbar im Manifest, wurde aber nie ausgewertet.

**Diese Phase landet ALLEIN und zuerst.** 01 und 02 programmieren gegen ihre Formen.

## Design (entschieden — nicht neu entwerfen)

### `src/chesslab/turntable.py` (neu)

```python
#: Wie oft eine Figur gedreht wird. Acht Schritte zu 45 Grad; der Springer ist die Klasse,
#: die an der Eigendrehung scheitert, und 45 Grad sind von Hand noch zuverlaessig zu setzen.
ORIENTATION_STEPS = 8
#: Hoehenstufen als NAMEN, nicht als Zentimeter - der Nutzer stellt keine Messlatte auf.
HEIGHTS = ("tief", "normal", "hoch")

def square_bands(dataset: str) -> dict[str, str]:
    """Feld -> haeufigstes Helligkeitsband, aus dem Manifest gezaehlt.

    Das Brett traegt einen festen Lichtgradienten (h3 bei 156, a7 bei 20 auf 20-41-33), also ist
    die Zuordnung stabil und der einzige Weg, aus einer Bandluecke ein FELD zu machen."""

def shots(gaps: list[dict], bands: dict[str, str], limit: int = 10) -> list[dict]:
    """Luecken zu Aufnahmeauftraegen buendeln, teuerste Achse zuerst."""
```

Ein Auftrag, genau diese Schlüssel:

```json
{"id": "wQ-light-sehr-hell",
 "fix": "Stellung",
 "light": "sehr hell",
 "height": "normal",
 "orientations": 8,
 "place": [{"square": "h3", "piece": "wQ"}],
 "closes": [{"piece": "wQ", "square_color": "light", "band": "sehr hell", "have": 0}]}
```

`fix` ist `"Stellung"` oder `"Licht"` und kommt unveraendert aus `coverage-gaps.json`.
Bei `"Licht"` ist `place` leer und `light` nennt das Band, das der Nutzer herstellen muss.

### CLI

`chesslab turntable plan --dataset real13-mix-v7-128 --limit 10` schreibt
`data/reports/turntable-plan.json`: `{"generated_at", "dataset", "shots": [...]}`.
Registrierung wie die uebrigen Unterbefehle in `src/chesslab/cli.py` (Muster: `session_pack_cmd`,
`grep -n 'session_app.command' src/chesslab/cli.py`).

### Platform-API

Zwei Routen, `runtime = "nodejs"`, `dynamic = "force-dynamic"`, Muster von
`platform/app/app/api/ingest/hello/route.ts`:

| Route | Antwort |
|---|---|
| `GET /api/turntable/plan` | `turntable-plan.json` roh; fehlt die Datei: `{"shots": [], "why": "<Befehl>"}` mit Status 200 |
| `GET /api/turntable/coverage` | `coverage-gaps.json` roh; fehlt sie: ebenso |

Beide durch `authorized(request)` aus `@/lib/ingest` geschuetzt, wie der Ingest-Pfad.
`platform/app/lib/turntable.ts` traegt die TypeScript-Typen `Shot` und `Gap` — **keine `any`**,
01 importiert sie.

### `docs/turntable-capture.md` (neu, Deliverable)

Traegt die dauerhaften Fakten: die vier Achsen mit ihrer Begruendung, die Messung der
Kamerapose (0,954–1,025, Median 0,986, 24 Aufnahmen), warum Kamerawinkel nichts bringt, und die
Feld-zu-Band-Zuordnung.

## Steps

1. `square_bands` + `shots` + Tests → `feat(turntable): Luecken zu Aufnahmeauftraegen buendeln`
2. CLI-Unterbefehl → `feat(cli): chesslab turntable plan`
3. Beide Routen + `lib/turntable.ts` + Vitest → `feat(platform): Plan- und Abdeckungs-API`
4. `docs/turntable-capture.md` → `docs(turntable): die vier Achsen und warum der Winkel keine ist`

## Tests

`tests/test_turntable.py` — `uv run pytest -q tests/test_turntable.py`:

- `square_bands` ordnet `h3` einem helleren Band zu als `a7` (der gemessene Gradient).
- Eine Lücke mit `fix="Stellung"` wird zu einem Auftrag mit nichtleerem `place`.
- Eine Lücke mit `fix="Licht"` wird zu einem Auftrag mit **leerem** `place`.
- Zwei Lücken im selben Band und derselben Feldfarbe werden zu EINEM Auftrag gebündelt.
- `limit` schneidet ab, ohne die Reihenfolge zu ändern.

`platform/app/lib/turntable.test.ts` — `npm test -- turntable`: fehlende Datei ergibt
`{shots: [], why}` und wirft nicht.

## Acceptance

- `uv run chesslab turntable plan --dataset real13-mix-v7-128` schreibt eine Datei, deren
  `shots[0].closes[0].have` kleiner als 200 ist.
- `grep -rn '"any"\|: any' platform/app/lib/turntable.ts` trifft nichts.
- `docs/turntable-capture.md` existiert und nennt die Zahl 0,986.

## Do NOT

- Keine Android-Datei anfassen — das ist 01.
- `scripts/coverage_gaps.py` nicht ändern — das ist 02.
- Keine Schreib-Route. Der Rückkanal ist der bestehende Ingest, nicht eine neue API.
