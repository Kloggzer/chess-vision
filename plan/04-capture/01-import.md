# Phase 01 — `chesslab capture import`: Buendel zu Brettern, ohne Kandidat

## Why

`export-session` macht aus einer Aufnahme Bretter, verlangt dafuer aber eine **bestaetigte
Zugfolge**: `realgames.py:1559` wirft ohne `candidate["confirmed"]`, `:1611` ohne
`reviewed_plies`, und `confirm` braucht eine `reference.pgn`. Eine Erfassung hat keine Partie —
kein Zug wird erkannt, keiner bestaetigt. Die ganze Maschinerie existiert, um je Frame
herauszufinden, WELCHES FEN gilt; bei einem gezielten Aufbau ist das per Konstruktion bekannt.

Diese Phase ist der fehlende Einstieg. Sie schneidet nichts selbst.

## Design (entschieden — nicht neu entwerfen)

### Wiederverwendet, nicht nachgebaut

| Braucht | Woher |
|---|---|
| Frames aus dem Video | `Recording.frames(start, wanted)` (`src/chesslab/recording.py:38`) |
| Bretter schreiben | `realgames.rewarp_boards(session_dir, rows, profile, frames=…)` (`realgames.py:1066`) — Mesh-Pooling, Geradeziehen, vier Schreiber |
| Buendel finden | `realgames.stored_session_dirs(name)` (`realgames.py:1963`) |

**Nichts von `candidate.json`, `confirm`, `reference.pgn` oder `known_segments` wird angefasst.**

### Der Befehl

```
chesslab capture import <name> [--profile <name>]
```

`name` ist die Aufnahme unter `data/recordings/`. Ablauf:

1. Buendel ueber `stored_session_dirs(name)`; genau eines erwartet, sonst Abbruch mit der Liste.
2. `log.jsonl` des Buendels lesen: je Zeile `frame` (`frames/%04d.jpg`), `ply`, `fen`, `corners`.
3. `capture.json` daneben lesen (Phase 02 schreibt sie). Fehlt sie: **Abbruch** — ohne sie ist
   nicht belegt, dass die Aufnahme eine Erfassung ist, und ein Partie-Buendel darf hier nicht
   durchrutschen.
4. Zeilen bauen, `rewarp_boards` rufen, das obere `log.jsonl` schreiben.

Die Zeilen tragen dieselben Schluessel wie eine exportierte Aufnahme (`frame`, `ply`, `fen`,
`corners`, `board_size`, `board_border`, `board_straightened`) — **`chesslab slice` und alles
danach sehen keinen Unterschied.** Welche das genau sind, sagt eine bestehende Aufnahme:
`data/recordings/2026-09-06-21-29-35/log.jsonl`, erste Zeile lesen und gleichziehen.

### Frame-Namen

Das Buendel zaehlt `frames/0000.jpg`, der Video-Frame-Index ist ein anderer. Das obere `log.jsonl`
traegt den **Video-Index**, wie der Export (`realgames.py:380`, `frames/{idx:06d}.png`) — sonst
stimmen die Bretter nicht mit ihren Namen ueberein. Die Zuordnung Bundle-Zeile → Video-Index kommt
aus der Reihenfolge: die n-te Zeile ist der n-te ANGEFORDERTE Frame.

## Steps

1. `src/chesslab/capture_import.py` mit `import_capture(name, profile)` → `feat(capture): Buendel zu Brettern ohne Kandidat`
2. CLI-Unterbefehl unter der Sub-App aus Phase 00 → `feat(cli): chesslab capture import`

## Tests

`uv run pytest -q tests/test_capture_import.py`:

- Ein Buendel mit drei Frames, `capture.json` und Ecken erzeugt drei Bretter und drei Zeilen.
- **Ohne `capture.json` bricht der Befehl ab** und schreibt nichts.
- Die geschriebenen Zeilen tragen dieselben Schluessel wie die erste Zeile von
  `data/recordings/2026-09-06-21-29-35/log.jsonl` (der Test liest sie und vergleicht die Menge).
- `ply` wird unveraendert uebernommen; `moveSan` taucht nirgends auf.
- Zwei Aufrufe hintereinander erzeugen dasselbe Ergebnis (der zweite ueberschreibt sauber).

## Acceptance

- `uv run chesslab capture import --help` antwortet.
- `grep -n "load_candidate\|confirmed\|reference.pgn\|known_segments" src/chesslab/capture_import.py`
  trifft **nichts**.
- `grep -n "def rewarp_boards\|Recording(" src/chesslab/capture_import.py` trifft beide — die
  Schwerarbeit wird gerufen, nicht nachgebaut.
- `uv run ruff check src/chesslab/capture_import.py` sauber.

## Do NOT

- `realgames.export_session` nicht anfassen und nicht umgehen-fuer-Partien: dieser Weg gilt nur
  fuer Buendel MIT `capture.json`.
- Keine eigene Warp-, Mesh- oder Schreiblogik.
- Keine Zugerkennung, kein FEN raten — das FEN steht im Buendel-Log.
