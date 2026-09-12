# Phase 00 — Planer, Schema und zwei Routen

## Why

`coverage_gaps.py` nennt Luecken, aber keine Handlung: `{"piece":"wQ","square_color":"light",
"band":"sehr hell","have":0}` sagt nicht, wohin die Dame gehoert. Die Bruecke fehlt.

**Landet ALLEIN und zuerst.** 01 und 02 schreiben gegen diese Formen.

## Design (entschieden — nicht neu entwerfen)

### Die Auftragsform: `docs/turntable-plan.schema.json` (neu, EINZIGE Autoritaet)

```json
{"id": "wQ-light", "fix": "Stellung", "reason": "wQ auf hellem Feld, Band 'sehr hell': 0 Belege",
 "place": [{"square": "h3", "piece": "wQ"}], "light": null, "reference_square": "h3",
 "height": "normal", "orientations": 8,
 "closes": [{"piece": "wQ", "square_color": "light", "band": "sehr hell", "have": 0}]}
```

| Schluessel | Bedeutung |
|---|---|
| `id` | Slug, Kleinbuchstaben, nur `[a-z0-9-]`; Leerzeichen werden `-` |
| `fix` | `"Stellung"` oder `"Licht"`, unveraendert aus `coverage-gaps.json` |
| `place` | **immer eine Liste von Objekten**, leer bei `fix="Licht"` |
| `light` | bei `fix="Licht"` das Zielband als Text, sonst `null` |
| `reference_square` | Feld, an dem der Nutzer das Licht beurteilt |
| `height` | `"tief"` \| `"normal"` \| `"hoch"` |

**Ein Auftrag verspricht kein Band.** Kein Feld hat „sehr hell" als haeufigstes Band; der Planer
waehlt das hellste (bzw. dunkelste) Feld der geforderten Farbe, und was erreicht wurde, misst
Phase 02 hinterher.

### `src/chesslab/turntable.py` (neu)

```python
ORIENTATION_STEPS = 8          # 45-Grad-Schritte, von Hand noch zuverlaessig zu setzen
HEIGHTS = ("tief", "normal", "hoch")

class Shot(TypedDict):         # exakt die Schluessel des Schemas, keine losen dicts
    ...

def square_brightness(dataset: str) -> dict[str, float]:
    """Feld -> MEDIAN der gemessenen Helligkeit. Zeilen ohne `brightness` zaehlen nicht mit:
    376 640 von 979 363 (alle Komposite) haben keine, und `or 0.0` warf sie frueher geschlossen
    ins dunkelste Band."""

def shots(gaps: list[dict], bright: dict[str, float], limit: int = 10) -> list[Shot]:
    """Luecken zu Auftraegen. `fix="Stellung"` -> hellstes/dunkelstes Feld der Farbe;
    `fix="Licht"` -> leeres `place`, Zielband in `light`."""
```

### CLI

`chesslab turntable plan --dataset real13-mix-v7-128 --limit 10` schreibt
`data/reports/turntable-plan.json`: `{"generated_at", "dataset", "gaps_from", "shots": [...]}`.
Registrierung wie die 24 vorhandenen Unterbefehle (`grep -n "session_app.command" src/chesslab/cli.py`,
Muster `session_pack_cmd` in `cli.py:407`).

### Zwei Routen

Muster ist `platform/app/app/api/ingest/session/route.ts:12` — **nicht** `hello`, das nie ablehnt:

```ts
if (!(await authorized(request))) return Response.json({ error: "unpaired" }, { status: 401 });
```

| Route | Antwort |
|---|---|
| `GET /api/turntable/plan` | `turntable-plan.json` roh; fehlt die Datei: 200 mit `{"shots": [], "why": "<Befehl>"}` |
| `GET /api/turntable/coverage` | `coverage-gaps.json` roh plus `"generated_at"` aus dessen mtime |

`platform/app/lib/turntable.ts` traegt `Shot` und `Gap` **aus dem Schema abgeschrieben**, keine
`any`. Die Kopplung ist die bestehende (`platform/app/lib/ingest.ts:262` `authorized`).

### `docs/turntable-capture.md` (Deliverable)

Die vier Achsen mit Begruendung, die Posenmessung (0,954–1,025, Median 0,986, 24 Aufnahmen),
warum der Kamerawinkel keine Achse ist, **und warum die Abdeckung nicht live sein kann**.

## Steps

1. Schema + `square_brightness` + `shots` + Tests → `feat(turntable): Luecken zu Auftraegen`
2. CLI → `feat(cli): chesslab turntable plan`
3. Routen + `lib/turntable.ts` + Vitest → `feat(platform): Plan- und Abdeckungs-Route`
4. Doku → `docs(turntable): die vier Achsen und die Grenzen der Rueckmeldung`

## Tests

`uv run pytest -q tests/test_turntable.py`:

- `square_brightness` ignoriert Zeilen ohne `brightness` (sonst faerbt ein Komposit das Feld dunkel).
- `fix="Stellung"` ergibt nichtleeres `place`, `fix="Licht"` **leeres** `place` und gesetztes `light`.
- Fuer `square_color="light"` waehlt der Planer das HELLSTE helle Feld, nicht irgendeines.
- `id` enthaelt nur `[a-z0-9-]`.
- `limit` schneidet ab, ohne die Reihenfolge zu aendern.

`npm test -- turntable` in `platform/app`: fehlende Datei ergibt `{shots: [], why}` und wirft nicht;
ohne Kopplung antwortet die Route 401.

## Acceptance

- `uv run chesslab turntable plan --dataset real13-mix-v7-128` schreibt eine Datei, in der **jeder**
  Auftrag mit `fix="Stellung"` ein nichtleeres `place` hat — pruefbar mit
  `python -c "import json;d=json.load(open('data/reports/turntable-plan.json'));assert all(s['place'] for s in d['shots'] if s['fix']=='Stellung')"`.
- `grep -c ': any' platform/app/lib/turntable.ts` gibt `0`.
- `docs/turntable-plan.schema.json` und `docs/turntable-capture.md` existieren; letztere nennt 0,986.

## Do NOT

- Keine Android-Datei — das ist 01. `scripts/coverage_gaps.py` nicht aendern — das ist 02.
- Keine Schreib-Route: der Rueckkanal ist der bestehende Ingest.
- Kein Auftrag, der ein Helligkeitsband ZUSAGT.
