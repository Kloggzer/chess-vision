# Phase 00 — Planer, Schema und zwei Routen

## Why

**Vorbedingung:** `uv run python scripts/backfill_brightness.py` muss gelaufen sein und
`coverage_gaps.py` danach neu. Ohne das rechnet die Luecken-Karte auf 602 723 von 979 363 Zeilen
— den 376 640 Komposit-Zeilen fehlt `brightness`, obwohl sie echtes Material sind (2.5D-Montage
echter Bretter mit echten Handplatten, `composite.py:1-4`). Ein Plan auf der halben Karte schickt
den Menschen nach Material, das schon daliegt.

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
| `place` | **immer** Liste von `{"square", "piece"}`; leer bei `fix="Licht"`. Das Feld ist dasjenige der geforderten Farbe, dessen Median-Helligkeit der **Bandmitte am naechsten** liegt — dieselbe Regel wie fuer `reference_square`, und die einzige, die fuer alle fuenf Baender entscheidbar ist. „Das hellste bzw. dunkelste" waere es fuer `mittel`, `hell` und `dunkel` nicht, und das sind 18 der 34 Stellungs-Auftraege |
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
`data/reports/capture-plan.json`: `{"generated_at" (ISO-8601), "dataset" (Name), "gaps_from" (Pfad der gelesenen `coverage-gaps.json`), "shots": [...]}`.

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
und so macht es jede der 50 vorhandenen `lib/*.test.ts`.

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
- Fuer Band `sehr hell` und `square_color="light"` waehlt der Planer das hellste helle Feld,
  fuer Band `mittel` dagegen das der Bandmitte naechste — dieselbe Regel, zwei Ausgaenge.
- **Die `id` ist ueber alle 58 echten Luecken eindeutig**, und der Gegentest zeigt, dass ein Slug
  OHNE Band nur 24 verschiedene ergaebe — sonst waere der Test tautologisch.
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
- `npm test -- capture-plan` deckt den 401-Zweig ab, weil die Routenlogik in `lib` liegt und die
  Route duenn ist — so machen es die 50 vorhandenen `lib/*.test.ts`.
- `docs/capture-plan.schema.json` und `docs/capture-axes.md` existieren; letztere enthaelt die
  Zeichenkette `Verkürzung` **und** `0,986` (die Zahl allein waere schwach: 0,9860 ist auch eine
  `val_visible_piece_acc` in `docs/evaluation.md`).

## Do NOT

- Keine Android-Datei — das ist 01. `scripts/coverage_gaps.py` nicht aendern — das ist 02.
- `data/reports/coverage-gaps.json` nur lesen; die Datei gehoert ihrem Erzeuger.
- Keine Schreib-Route: der Rueckkanal ist der bestehende Ingest.
- Kein Auftrag, der ein Helligkeitsband ZUSAGT. Kein `turntable` im Namen.
