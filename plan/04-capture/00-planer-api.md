# Phase 00 — Planer, Schema und zwei Routen

## Why

`coverage_gaps.py` nennt Luecken, aber keine Handlung: `{"piece":"wQ","square_color":"light",
"band":"sehr hell","have":0}` sagt nicht, wohin die Dame gehoert.

**Landet ALLEIN und zuerst.** 01 und 02 schreiben gegen diese Formen.

## Design (entschieden — nicht neu entwerfen)

### `docs/capture-plan.schema.json` (neu, EINZIGE Autoritaet)

```json
{"id": "wq-light-sehr-hell", "fix": "Stellung",
 "reason": "wQ auf hellem Feld, Band 'sehr hell': 0 Belege",
 "place": [{"square": "h3", "piece": "wQ"}], "light": null, "reference_square": "h3",
 "height": "normal", "orientations": 8,
 "closes": [{"piece": "wQ", "square_color": "light", "band": "sehr hell", "have": 0}]}
```

| Schluessel | Regel |
|---|---|
| `id` | `"{piece}-{square_color}-{band}"`, kleingeschrieben, Leerzeichen zu `-`. **Das Band MUSS hinein**: 58 Luecken verteilen sich auf nur 24 Paare aus Figur und Feldfarbe, 22 davon kollidieren ueber die Baender |
| `fix` | `"Stellung"` oder `"Licht"`, unveraendert aus `coverage-gaps.json` |
| `reason` | ein Satz, warum es diesen Auftrag gibt |
| `place` | **immer** Liste von `{"square", "piece"}`; leer bei `fix="Licht"` |
| `light` | bei `fix="Licht"` das Zielband als Text, sonst `null` |
| `reference_square` | bei `fix="Stellung"` das Feld aus `place[0]`; bei `fix="Licht"` das Feld der geforderten Farbe, dessen Median-Helligkeit der **Bandmitte am naechsten** liegt (`(lo+hi)/2` aus `BANDS`) — das ist fuer alle fuenf Baender entscheidbar, „hellstes oder dunkelstes" waere es fuer `mittel` nicht |
| `height` | reihum aus `HEIGHTS`, damit ueber die Auftraege alle drei Hoehen vorkommen |
| `orientations` | immer `ORIENTATION_STEPS` |

**Ein Auftrag verspricht kein Band** — der Planer waehlt ein Feld, gemessen wird hinterher.

### `src/chesslab/capture_plan.py` (neu)

```python
ORIENTATION_STEPS = 8                      # 45-Grad-Schritte, von Hand zuverlaessig zu setzen
HEIGHTS = ("tief", "normal", "hoch")

class Gap(TypedDict):                      # genau die Schluessel aus coverage-gaps.json
    piece: str; square_color: str; band: str; have: int; fix: str; corpus_in_band: int
class Placement(TypedDict):
    square: str; piece: str
class Shot(TypedDict):                     # genau die Schluessel des Schemas, alle neun
    id: str; fix: str; reason: str; place: list[Placement]; light: str | None
    reference_square: str; height: str; orientations: int; closes: list[Gap]

def square_brightness(dataset: str) -> dict[str, float]:
    """Feld -> MEDIAN der gemessenen Helligkeit. Zeilen OHNE `brightness` zaehlen nicht mit:
    376 640 von 979 363 (alle Komposite) haben keine."""

def shots(gaps: list[Gap], bright: dict[str, float], limit: int = 10) -> list[Shot]:
    """Luecken zu Auftraegen, in der Reihenfolge, die `coverage_gaps.gaps()` schon liefert:
    `fix="Stellung"` vor `fix="Licht"`, darin aufsteigend nach `have` (`coverage_gaps.py:74`).
    Nicht umsortieren - die Quelle entscheidet, `limit` schneidet nur ab."""
```

### CLI

Neue Typer-Sub-App `capture` — Muster der acht vorhandenen bei `src/chesslab/cli.py:30-62`
(`app.add_typer(...)`), der Unterbefehl wie `session_pack_cmd` (`cli.py:407`).
`chesslab capture plan --dataset real13-mix-v7-128 --limit 10` schreibt
`data/reports/capture-plan.json`: `{"generated_at", "dataset", "gaps_from", "shots": [...]}`.

### Zwei Routen

Muster `platform/app/app/api/ingest/session/route.ts:12` — **nicht** `hello`, das nie ablehnt:
`if (!(await authorized(request))) return Response.json({ error: "unpaired" }, { status: 401 });`

| Route | Antwort |
|---|---|
| `GET /api/capture/plan` | `capture-plan.json` roh; fehlt sie: 200 mit `{"shots": [], "why": "<Befehl>"}` |
| `GET /api/capture/coverage` | `coverage-gaps.json` roh plus `generated_at` aus der **mtime** |

`platform/app/lib/capture-plan.ts` traegt `Shot`, `Gap`, `Placement` und die Huelle `CapturePlan`
(`generated_at`, `dataset`, `gaps_from`, `shots`) aus dem Schema, keine `any`. **Die Logik beider
Routen liegt dort**, die Route ist duenn — so testet `capture-plan.test.ts` auch den 401-Zweig,
und so macht es jede der rund 40 vorhandenen `lib/*.test.ts`.

### `docs/capture-axes.md` (Deliverable)

Die vier Achsen mit Begruendung, die Posenmessung (Verkuerzung 0,955–1,025, Median 0,986 ueber die
24 Aufnahmen mit `corners` in `data/recordings/*/log.jsonl`; der Datensatz selbst traegt 23 `rg-`
Aufnahmen, die 24. hat noch keinen Pack), der
Verweis auf die 7-Seed-Messung von `--rot90` und die Abgrenzung zum August-Wert −0,046, warum der
Kamerawinkel keine Achse ist, **und warum die Abdeckung nicht live sein kann**.

## Steps

1. Schema + `square_brightness` + `shots` + Tests → `feat(capture): Luecken zu Auftraegen`
2. CLI-Sub-App → `feat(cli): chesslab capture plan`
3. Routen + `lib/capture-plan.ts` + Vitest → `feat(platform): Plan- und Abdeckungs-Route`
4. Doku → `docs(capture): die vier Achsen und die Grenzen der Rueckmeldung`

## Tests

`uv run pytest -q tests/test_capture_plan.py`:

- `square_brightness` ignoriert Zeilen ohne `brightness`.
- `fix="Stellung"` ergibt nichtleeres `place`, `fix="Licht"` leeres `place` und gesetztes `light`.
- Bei `square_color="light"` waehlt der Planer das HELLSTE helle Feld.
- **Die `id` ist ueber alle 58 echten Luecken eindeutig** (Regressionsfall: ohne Band waeren es 24).
- Ueber zehn Auftraege kommt jede der drei Hoehen mindestens einmal vor.
- Bei `fix="Licht"` und Zielband `mittel` waehlt der Planer das Feld naeher an der Bandmitte,
  nicht das hellste.
- Die Reihenfolge der Auftraege entspricht der von `coverage_gaps.gaps()`.
- `limit` schneidet ab, ohne die Reihenfolge zu aendern.

`npm test -- capture-plan`: fehlende Datei ergibt `{shots: [], why}`; ohne Kopplung 401.

## Acceptance

```
uv run chesslab capture plan --dataset real13-mix-v7-128 --limit 58
python -c "import json;d=json.load(open('data/reports/capture-plan.json'));s=d['shots'];assert len(s)>0;assert len({x['id'] for x in s})==len(s);assert all(x['place'] for x in s if x['fix']=='Stellung')"
```
- `grep -c ': any' platform/app/lib/capture-plan.ts` gibt `0` (Exit 1 ist dabei normal).
- `docs/capture-plan.schema.json` und `docs/capture-axes.md` existieren; letztere enthaelt die
  Zeichenkette `Verkuerzung` **und** `0,986` (die Zahl allein waere schwach: 0,9860 ist auch eine
  `val_visible_piece_acc` in `docs/plan-98/00-plan.md`).

## Do NOT

- Keine Android-Datei — das ist 01. `scripts/coverage_gaps.py` nicht aendern — das ist 02.
- Keine Schreib-Route: der Rueckkanal ist der bestehende Ingest.
- Kein Auftrag, der ein Helligkeitsband ZUSAGT. Kein `turntable` im Namen.
