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
| **Geometrie je Frame** | **`realgames.fit_rows_to_grid(rows, profile, frames=…)`** (`realgames.py:1324`) |
| Bretter schreiben | `realgames.rewarp_boards(session_dir, rows, profile, frames=…)` (`realgames.py:1066`) — Mesh-Pooling, Geradeziehen, vier Schreiber |
| Buendel finden | `realgames.stored_session_dirs(name)` (`realgames.py:1963`) |

**`fit_rows_to_grid` ist NICHT optional** (ergaenzt 2026-09-13). Ohne sie bleiben die `corners`
das ArUco-Quad des Telefons, das CLAUDE.md ausdruecklich „only Coarse" nennt, und keine Zeile
bekommt `grid_lines` — dann findet `meshes_for_boards` (`realgames.py:1061`, liest genau diese
Spalte) nichts, jedes Brett bleibt gebogen und `board_straightened` entsteht nie.

Was das kostet, steht gemessen im Docstring der Funktion: `rg-2026-08-13-19-34-23` ging mit allen
137 Frames **rund 17 px** neben den eigenen Rillen heraus, ein nachtraeglicher Fit brachte es auf
**2,71 px**. Auf einer 116-px-Zelle sind 17 px ein Siebtel. Eine Erfassung, die schlechter
geschnitten ist als das vorhandene Material, verfehlt ihren Zweck.

Sie braucht **keinen Kandidaten** — nur `rows`, `profile` und einen Frame-Strom, dieselbe Form wie
`rewarp_boards`. Der Frame-Strom wird ZWEIMAL gebraucht (einmal fuer den Fit, einmal fuers
Schreiben); `Recording.frames` laesst sich zweimal aufrufen, genau wie im Export.

**Nichts von `candidate.json`, `confirm`, `reference.pgn` oder `known_segments` wird angefasst.**

### Der Befehl

```
chesslab capture import <name> [--profile <name>]
```

`name` ist die Aufnahme unter `data/recordings/`. Ablauf:

1. Buendel ueber `stored_session_dirs(name)`; genau eines erwartet, sonst Abbruch mit der Liste.
2. `log.jsonl` des Buendels lesen: je Zeile `frame` (`frames/%04d.jpg`), `ply`, `fen`, `corners`.
3. `capture.json` daneben lesen (Phase 02 schreibt sie, Form: `docs/capture-session.schema.json`).
   Fehlt sie: **Abbruch** — ohne sie ist nicht belegt, dass die Aufnahme eine Erfassung ist, und
   ein Partie-Buendel darf hier nicht durchrutschen. Fehlt einem Schritt `video_frame`: ebenfalls
   **Abbruch**, siehe unten.
4. Zeilen bauen, **`fit_rows_to_grid` rufen**, dann `rewarp_boards`, dann das obere `log.jsonl`
   schreiben — dieselbe Reihenfolge wie der Export.

Die Zeilen tragen dieselben Schluessel wie eine exportierte Aufnahme (`frame`, `ply`, `fen`,
`corners`, `board_size`, `board_border`, `board_straightened`) — **`chesslab slice` und alles
danach sehen keinen Unterschied.** Welche das genau sind, sagt eine bestehende Aufnahme:
`data/recordings/2026-09-06-21-29-35/log.jsonl`, erste Zeile lesen und gleichziehen.

### Frame-Namen — der Video-Index wird GELESEN, nicht hergeleitet

Das Buendel zaehlt `frames/0000.jpg`, der Video-Frame-Index ist ein anderer. Das obere `log.jsonl`
traegt den **Video-Index**, wie der Export (`realgames.py:380`, `frames/{idx:06d}.png`) — sonst
stimmen die Bretter nicht mit ihren Namen ueberein.

**Die Zuordnung kommt aus `capture.json`, Feld `steps[].video_frame`** (Schema:
`docs/capture-session.schema.json`, geschrieben von 02). Nicht aus der Reihenfolge: „die n-te
Zeile ist der n-te angeforderte Frame" waere zirkulaer — um Frames anzufordern, muesste man ihre
Indizes schon kennen, und das Buendel-Log traegt nur `frames/0000.jpg` und eine Wanduhrzeit.

Der Recorder KENNT die Zahl im Moment der Aufnahme: derselbe Wert steht fuer einen Zug in
`candidate.json` unter `moves[].frame` (gemessen: `{'ply': 1, 'san': 'e4', 'frame': 117,
't': 3.933, …}`), und `known_segments` liest genau den. Eine Erfassung hat keine Zuege, also
schreibt 02 ihn je Schritt in `capture.json`.

**Fehlt `video_frame`, bricht der Import ab.** Ein stiller Fehler waere hier teuer: die Bretter
bekaemen Namen von Frames, die sie nicht zeigen, und alles danach saehe korrekt aus. Dieselbe
Klasse traf uns schon einmal — bei der Seek-Messung lieferten 2 von 7 Sonden andere Pixel,
waehrend `POS_FRAMES` den gefragten Index meldete (`docs/export-decode.md`).

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
- **Der Frame-Name der geschriebenen Zeile ist `frames/{video_frame:06d}.png`**, gelesen aus
  `capture.json` — der Test setzt zwei Schritte mit `video_frame` 117 und 193 und erwartet genau
  diese Namen, NICHT 0 und 1.
- Ein `capture.json` ohne `video_frame` in einem Schritt fuehrt zum Abbruch, und nichts wird
  geschrieben.
- Zwei Aufrufe hintereinander erzeugen dasselbe Ergebnis (der zweite ueberschreibt sauber).

## Acceptance

- `uv run chesslab capture import --help` antwortet.
- `grep -n "load_candidate\|confirmed\|reference.pgn\|known_segments" src/chesslab/capture_import.py`
  trifft **nichts**.
- `grep -n "def rewarp_boards\|Recording(" src/chesslab/capture_import.py` trifft beide — die
  Schwerarbeit wird gerufen, nicht nachgebaut.
- `grep -n "enumerate\|video_frame" src/chesslab/capture_import.py`: `video_frame` kommt vor, und
  kein `enumerate` erzeugt einen Frame-Namen.
- `grep -n "fit_rows_to_grid" src/chesslab/capture_import.py` trifft — und der Test weist nach,
  dass die geschriebenen Zeilen `grid_lines` und `board_straightened` tragen, nicht nur `corners`.
- `uv run ruff check src/chesslab/capture_import.py` sauber.

## Do NOT

- `realgames.export_session` nicht anfassen und nicht umgehen-fuer-Partien: dieser Weg gilt nur
  fuer Buendel MIT `capture.json`.
- Keine eigene Warp-, Mesh- oder Schreiblogik.
- Keine Zugerkennung, kein FEN raten — das FEN steht im Buendel-Log.
