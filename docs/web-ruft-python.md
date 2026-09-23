# Web ruft Python — Bestandsaufnahme und Plan (2026-09-23)

Nutzer, 2026-09-23: "Gerne kannst du dich auf Python beschraenken und die Webanwendung die
Python/Kotlin Sachen callen, das brauchen wir nicht doppelt warten." Stand: Schritte 0 bis 3
umgesetzt (Abschnitt 6), 4 und 5 offen.

## 1. Inventar: TS rechnet, was Python/Kotlin schon rechnet

Hitze: **Zelle** = je `<img>` im Raster (60 je Seite), **Liste** = je Aufnahme auf Start-/Queue-Seite
(51 Aufnahmen), **Strom** = je Brett im Labeln-Strom, **Seite** = einmal je Seitenaufruf, **Klick**.

| # | TS-Stelle (Zeilen) | Aufrufer | Hitze | Paritaetstest | Gegenstueck |
|---|---|---|---|---|---|
| 1 | `lib/lcs.ts` `lcsReport`, `reviewedPlies` (56) | `review-cards.reviewOf` -> `/confirm/[name]`, `/strom/zuege`, `/api/zuege`; `recordings.writeConfirmation` | Seite/Klick | `lcs-parity.test.ts` + `tests/data/lcs_parity.json` | `realgames/confirm.py` `lcs_report`, `reviewed_plies` |
| 2 | `session-store/recordings.ts` `writeConfirmation`/`confirmUnlocked` (~60), `confirmedAgainst` | `POST /api/confirm/[name]`, `/api/zuege` | Klick | keiner gemeinsam | `session_store/recording.py` `write_confirmation` |
| 3 | `session-store/reference.ts` `referenceOrigin` (~20), `saveReference`-Pruefung; `lib/pgn.ts` (30); `review-cards.moveSquares` — alle ueber **chess.js** | `/api/pgn`, `/confirm`, Kette | Seite/Klick | keiner | `reference_is_the_phones_own`; python-chess |
| 4 | `lib/warp.ts` (304): Homographie 1-69, `squareCropBox` 70-98, Mesh 99-261, `sampleBox` 262-304 | `crops.ts` (204) -> `/api/cell`, `/api/board`, `/api/matte`; `stored.ts` (220) -> dieselben fuer nie exportierte Buendel | **Zelle** | `square-geometry-parity.test.ts` (67), `warp.test.ts` (195) mit `mesh_crop_parity.json`, `curvature_trend_parity.json` | `calibration.py` `square_to_crop_box`, `compute_homography`, `mesh_from_lines`, `smooth_mesh_curvature`, `mesh_point`; `labeling.crop_square`; Kotlin `CropBox.kt`, `LabeledVideoPack.kt` |
| 5 | `session-store/matte-fix.ts` `applyAlphaMask` (127, Mesh-Inverse) | `/api/matte` POST, danach `occluders recut` (schon CLI) | Klick | `matte-fix.test.ts` | `matte.recut_fixed`, `calibration.mesh_point` |
| 6 | `session-store/matte.ts` `latestFrames`, `measured`, `matteCensus`, `matteSources` (~150 von 269) | `chainState` (**Liste**), `label-stream`, `verify.ts` | Liste/Strom | `matte-state-parity.test.ts` (66) + `parity/_matte/matte_states.json`, `matte.test.ts` (250) | `labeling.read_matte`, `matte.matte_status`, `matte.dirty_pile` |
| 7 | `chain/chain.ts` Provenienz: `stampOf`, `headerOf`, `stillCurrent`, `sameLog`, `passOf`, `sameFile`, `inputsMoved` (~110); `exportedSession` mit Literal `>= 5` | `chainState` -> `/`, `/reparatur`, `/api/chain`, `queues.ts` | **Liste** | `chain.test.ts` (kein gemeinsames Fixture) | `provenance.py` `same_log`, `check`, `_check_inputs`; `realgames/position.SETTLE_MIN_FRAMES = 5` |
| 8 | `label/lanes.ts` `reachesPool` (440-448, "Spiegelt `slice_session`"), `visible` (340-344) | `openBoards`/`openCells` -> `/strom/labeln` | **Strom** | `lanes.test.ts` | `labeling._slice_session`; `cell_rule.classification_eligible` |
| 9 | `corpus/pool.ts` `foldPool`, `dedupCorrections`, `sessionLogs` (~120 von 167) | `/corpus` | Seite | `pool.test.ts` (170) | `labeling.load_corrections` + Slice-Pool |
| 10 | `lib/classes.ts` `IDENTITY_CLASSES`, `PIECE_VISIBLE_MAX` (34) | Palette (Client), Lanes, Korpus | Konstante | keiner | `config.IDENTITY_CLASSES`, `training/occlusion.PIECE_VISIBLE_MAX` |
| 11 | `lib/fen.ts` `fenLabels` (27) | `components/board-paint.tsx` (**Client**), `label-stream`, `pool`, `history-load` | Strom | `fen-labels-parity.test.ts` + `tests/data/fen_labels_parity.json` | `state.GameState.label_for` |
| 12 | `review-cards.ts` `REVIEW_SPREAD = 3` | Karten | Seite | `review-cards.test.ts` | `retime.REVIEW_CONTEXT + 1` |

Befunde nebenbei:
- `lanes.visible` mass nur `coverage <= 0,15`; der Verlust maskiert seit 2026-09-22 auch
  `brightness < CELL_DARK_MIN`. Bestaetigt und behoben in Schritt 3 (Abschnitt 6).
- `session.ts` liest `mesh` aus dem Log, das laut eigenem Kommentar niemand ausser dem Test nutzt.
- `io-policy-parity.test.ts`/`lib/jsonl.ts`/`lib/atomic.ts` sind I/O-Politik der eigenen
  Schreiber, keine Fachlogik — bleiben (Abschnitt 5).

## 2. Mechanismus: gemessen auf diesem Rechner (2026-09-23, je 5 Laeufe)

| Aufruf | ms |
|---|---|
| `uv run chesslab --help` | 955-1187 (unter Last einzeln bis 3 873) |
| `.venv/Scripts/chesslab.exe --help` (Typer laedt alle Verben) | 511-531 |
| `uv run python -c "import chesslab.labeling, cv2"` | 865-983 |
| `.venv/Scripts/python.exe -c` dasselbe | 332-344 (leer: 117) |
| `.venv/Scripts/python.exe -c "import chesslab.realgames.confirm, chess"` | 225-241 |
| `android/desktop/.../desktop.bat --help` (JVM) | 800-819 |

`uv` allein kostet ~550 ms je Start. Prototyp eines warmen Workers (Node startet
`.venv/Scripts/python.exe`, JSON-Zeilen ueber stdin/stdout; Skript nur im Scratchpad):

| Messung | Python-Worker | TS heute (`sharp` + `sampleBox`) |
|---|---|---|
| Start bis erste Antwort | 235-242 ms (einmal je Serverstart) | — |
| `lcs_report` 80 Plies, Roundtrip | 0,62 ms | — |
| 60 Zellen aus 22 Brettern, Bretter kalt | 439-543 ms | 642-646 ms |
| dieselbe Seite, Bretter im Cache | 88-90 ms | 138-139 ms |
| Speicher nach Import (cv2, chess, labeling, matte) | 46 MB, kein torch | — |

Entscheidung je Klasse:
- **(b) warmer Worker** fuer alles, was eine Anfrage beantwortet: Zelle, Liste, Strom, Seite.
  Ein Prozessstart je Zelle (>= 330 ms, mit `uv` ~1 s) ist ausgeschlossen; der Worker ist beim
  Raster sogar schneller als TS. Neues Verb `chesslab web-worker` (JSONL, `{id, op, args}` ->
  `{id, ok|error}`), gestartet mit `.venv/Scripts/python.exe` direkt statt `uv`, globalThis-gepinnt
  wie die LRU-Caches, `OPENBLAS_NUM_THREADS=1`, `matte.exit_with_parent()` gegen Waisen, Stopp
  ueber `killTree` (der venv-Shim hat zwei PIDs). Stirbt er, antwortet die Route 500 mit dem
  Grund — kein stiller TS-Rueckfall. Caches (Raster, Matte-Saetze, Stempel) ziehen mit um, mtime-gekeyt.
  Liste und Strom fragen GEBUENDELT (`chain_status(names[])`), nicht 51 Einzelanfragen.
- **(a) CLI mit `--json`** fuer Schreiben/Aktionen je Klick, ueber das vorhandene
  `runChesslabCapture` (heute schon fuer `session delete`, `occluders recut`). ~1 s ist dort
  akzeptabel, und Python haelt dann den Stempel-Riegel (`write_rows_guarded`) selbst.
- **(c) Artefakte** bleiben, wo Python sie schon schreibt (`position-flags`, `hand-flags`,
  `model-reads`, `corpus-index`). NICHT fuer Neues, das an web-geschriebenen Ledgern haengt
  (`corrections`, `review-notes`): dort waere das Artefakt sofort veraltet.
- Vergleichbares im Repo: nur Einmal-Starts (`spawn.ts`, `runners.ts`, Jobs). Einen stdin-Worker
  gibt es weder in Python noch in TS — er ist neu und bekommt deshalb Schritt 0.

## 3. Kotlin-Spiegel

Rechnung, nicht Format, spiegeln nur Nr. 4: `meshPoint`, `smoothMeshCurvature`, `meshOrNull`
(`CropBox.kt`, `LabeledVideoPack.kt`) und `STORED_CROP = {pad_side: 0.05}` (`manifestRow`). Python
fuehrt dieselben drei Funktionen und ist gegen Kotlin schon gehalten (`test_crop_pixel_parity.py`,
`test_mesh_crop.py`, dieselben `parity/_geometry/*.json`). Also liefert der Python-Worker auch den
Stored-Weg; `:desktop` (JVM 0,8 s kalt) bleibt bei Einmal-Jobs (`label`, `rectify`, Replay). Ein
warmer JVM-Worker waere eine zweite Worker-Art fuer null Gewinn.

## 4. Reihenfolge nach Hebel

Jeder Schritt gleich abgesichert: (1) der bestehende Paritaetstest wird zum **Vertragstest**, der
DASSELBE Fixture gegen die Worker-Op faehrt, und laeuft gruen NEBEN der TS-Kopie; (2) die TS-Kopie
faellt, Aufrufer gehen auf die Op; (3) **Gegenprobe**: in Python eine Abweichung einpflanzen
(z. B. Tie-Break in `lcs_report` drehen), `__pycache__` loeschen, Vertragstest muss rot werden,
zuruecknehmen. Vitest und pytest nie parallel.

| Schritt | Inhalt | TS weg (ca.) | Tests weg/umgebaut | Risiko |
|---|---|---|---|---|
| 0 | `chesslab web-worker` + `lib/py-worker.ts` (Start, IDs, Fehler laut, `killTree`), Op `ping`; Route-Test: Worker tot -> 500 mit Grund | +~120 | neu | mittel: Lebenszyklus unter HMR/Windows |
| 1 | Review: Op `review(name)` = LCS, Referenz-SANs (python-chess), Zugfelder; CLI `realgames confirm --keep/--drop/--shown-ref --json` statt `writeConfirmation`; `referenceOrigin` -> Op | ~200 + chess.js | `lcs-parity` -> Vertrag | niedrig, kalter Pfad — beweist den Worker |
| 2 | Kette: Op `chain_status(names[])` = Provenienz (`provenance.check`), Matte-Census (`matte_status`), `SETTLE_MIN_FRAMES` | ~260 | `matte-state-parity` -> Vertrag; Teile von `chain.test`, `matte.test` | mittel: Liste auf jeder Startseite |
| 3 | Strom/Korpus: Op `admission(name)` (Slice-Zulassung + `classification_eligible` je Zelle), Op `pool()` | ~140 | `pool.test`, `lanes.test` (Teil) | mittel; schliesst den Dunkel-Befund |
| 4 | Raster: Ops `cell`, `board`, `matte_png`, `median` schneiden mit `crop_square`/`mesh_point` | ~730 (`warp` + `crops` + `stored`-Schnitt) | `square-geometry-parity`, `warp.test` -> Vertrag | hoch: heissester Pfad. Pixel aendern sich (cv2 statt Bilinear), dafuer IST es dann der Trainings-Crop; Gegenprobe gegen `labeling.crop_square` bytegleich |
| 5 | Stift: CLI `occluders apply-mask <name> <stem> <maske.png>` + `recut` in EINEM Aufruf | ~127 | `matte-fix.test` -> pytest | niedrig |

Nach Hebel allein kaeme 4 zuerst; es steht hinten, weil der Worker vorher auf kalten Pfaden (1, 2)
bewiesen sein muss, bevor jede Zelle an ihm haengt. Zusammen ~1 450 TS-Zeilen und fuenf
Paritaetstests weniger; `chess.js` faellt als Abhaengigkeit.

## 5. Was bewusst in TS bleibt

- **Routen, Seiten, Komponenten**: Darstellung, Karten-Gruppierung und Fenster (`review-cards`
  ohne LCS), Lane-Sortierung, `query.ts`, Kontrollstichprobe — Web-eigene Entscheidungen ohne Zwilling.
- **I/O-Politik** `lib/jsonl.ts`, `lib/atomic.ts`, `io-policy-parity.test.ts`: die Web-App bleibt
  Schreiberin ihrer Ledger (`corrections`, `review-notes`, `unusable-cells`); das ist Protokoll.
- **`fenLabels`** (27 Zeilen): FEN ist ein Format, und `board-paint.tsx` rechnet im Browser — der
  Client kann keinen Worker fragen. Der gemeinsame Fixture-Test bleibt.
- **`classes.ts`**: Konstanten fuer die Client-Palette. Statt Kopie ohne Test: ein Vertragstest
  vergleicht sie beim Testlauf mit der Worker-Op `constants`.
- **Kette/Jobs** (`cli-args.ts` mit `cli-parity`, `spawn.ts`, `heavy-lock.ts`): das ist der Aufruf
  selbst, kein Nachbau.

## 6. Stand der Umsetzung

### Schritt 0: Worker (2026-09-23)

- **Protokoll**: eine JSON-Zeile je Anfrage `{id, op, args}` auf stdin, eine je Antwort auf stdout:
  `{id, ok: true, value}` oder `{id, ok: false, error, kind}` (`kind` = Klasse der Python-Ausnahme,
  `UnknownOp`/`BadRequest` fuer Protokollfehler). EOF auf stdin beendet ihn — das ist der
  Waisenschutz, ein Wachfaden ist nicht noetig. Ein `print` in einer Op landet auf stderr.
- **Python**: Verb `chesslab web-worker` (`src/chesslab/cli/web_worker.py`), Ops in
  `src/chesslab/web_ops.py`. Ops, die eine Aufnahme lesen, bekommen `root` (= `CHESSLAB_DATA_DIR`
  der Web-App) und setzen `config.DATA` nur fuer den Aufruf — ein Worker bedient jede Wurzel.
  `ping` meldet `torch: false` (`tests/test_web_worker.py`, beide Startwege).
- **TS**: `lib/py/worker.ts` (neue Schicht `py` direkt ueber dem Kern, `service-deps.test.ts`),
  `lib/py/ops.ts` fuer die reinen Ops. Ein Worker je Prozess auf `globalThis`, ids, Zeitlimit
  (20 s, dann Kill und Neustart), Neustart nach Tod, `PyOpFailed` (Python lehnte ab) bzw.
  `PyWorkerDown` (keiner antwortete, mit stderr-Schwanz) — die Routen antworten darauf 500.
  `killTree` und `repoDir` liegen jetzt in `lib/py/worker.ts`, `chain/spawn.ts`/`cli-args.ts`
  reichen sie weiter.
- **Start**: `.venv/Scripts/python.exe -c "from chesslab.web_serve import main; main()"` (seit
  "Latenz" unten ohne das Paket `chesslab.cli`; das Verb ruft dasselbe `main`), also der Rumpf
  des Verbs ohne Typers Kommandobaum. Gemessen: acht gleichzeitige Starts ueber
  `-m chesslab.cli web-worker` 12,1 s, ueber den Rumpf 0,86 s (die Testsuite startet einen je
  Datei); einzeln kalt 250-340 ms bis zur ersten Antwort. `CHESSLAB_PYTHON` ueberschreibt das
  venv — `vitest.config.mts` setzt es, weil die Testdaten nicht neben dem Repo liegen.

### Schritt 1: Review und Bestaetigen (2026-09-23)

- **Weg**: `lib/lcs.ts` (51 Zeilen) und `lib/pgn.ts` (27) geloescht; `writeConfirmation`s
  Nachbau (~55 Zeilen), `referenceOrigin` (~20), `review-cards.moveSquares` (~13) und die
  chess.js-Pruefung in `saveReference` gehen an den Worker. `chess.js` ist aus `package.json`
  und `package-lock.json` raus (npm: 8 Zeilen weniger, sonst nichts).
- **Abweichung vom Plan**: das Bestaetigen laeuft als Worker-Op `confirm`, nicht als CLI
  `realgames confirm --keep/--drop --json`. Grund: die CLI liest `data/` relativ zum cwd und
  kennt keine andere Wurzel — die Tests (Daten unter tmp) haetten sie nicht erreicht, ohne die
  Wurzel-Oberflaeche der CLI zu aendern; dazu ~1 s je Klick gegen Millisekunden. Die Riegel
  stehen trotzdem EINMAL, in Python: `realgames.confirm.confirm_kept` ueber
  `recording.write_confirmation` (Stempel, `VerdictContested`, `ReferenceMoved` -> 409,
  `confirmed_reference`, `struck_plies` bleibt gestrichen). Die Bytes von `candidate.json` sind
  dieselben: an allen 32 echten Dateien ist Pythons `json.dumps(indent=2, ensure_ascii=False)`
  bytegleich zum alten TS-Schreiber mit `rawJSON`.
- **Paritaet vor dem Umzug** (chess.js gegen python-chess, echter Korpus): 111 PGNs
  (`reference.pgn` + `files/games/*.pgn`), 1 242 Zugfelder, 18 LCS-Wahrheiten — 0 Abweichungen.
  Dazu lief das `lcs_parity`-Fixture und die vier `pgn.test`-Faelle gegen beide Seiten gruen,
  bevor die TS-Kopien fielen. Bekannte Kante: `"kein pgn"` war fuer chess.js ein Fehler, fuer
  python-chess eine Partie ohne Zuege — der Upload scheitert in beiden Faellen (400, "holds no moves").
- **Python nachgezogen** (je ein roter Test zuerst, `tests/test_confirm_verdict.py`):
  `read_reference` gab bei einem illegalen Zug die Zuege DAVOR als Referenz zurueck (python-chess
  schreibt den Fehler nur ins Log) — jetzt `parse_reference` mit `problem`, `read_reference`
  wirft. `reference_is_the_phones_own` fragte `glob`, das ein EACCES auf `files/games` schluckt —
  jetzt `reference_origin` (`none`/`phone`/`outside`), nur FEHLEND ist eine Antwort.
- **Tests**: `lcs-parity`, `pgn.test`, `review-cards.test`, `confirm-stamp`, `verdict-revisions`,
  `recordings.test`, `chain.test` (`referenceOrigin`) fahren jetzt den echten Worker. Nach Python
  gewandert: die beiden EACCES-Faelle von `referenceOrigin` und der fremde Schreiber zwischen
  Lesen und Umhaengen (TS-fs-Mocks erreichen Python nicht); die Uebersetzung der Python-Fehler in
  `ReferenceMoved`/`Contested` prueft `lib/py/worker.test.ts` am Fake.
- **Gegenproben** (Python veraendert, `__pycache__` geloescht, Web-Test rot, zurueck): LCS-Gleichstand
  `>=` -> `>` (lcs-parity rot), `game.errors` ignoriert (pgn.test rot), Zugfelder vertauscht
  (review-cards rot), Herkunft immer `outside` (chain.test rot), gezeigte Referenz ungeprueft
  (confirm-stamp 2x rot), `struck_plies` nicht geschrieben (3 rot). Der Stempel-Vergleich in
  `write_confirmation` ist nur von pytest aus sichtbar (2 rot).
- **Latenz** (der umgezogene Teil einer Review-Seite: Referenz lesen, Herkunft, LCS, Zugfelder;
  Median ueber 18 Aufnahmen mit Referenz, je 15 Laeufe): vorher 6,2-7,0 ms (chess.js + TS), nachher
  4,3-5,1 ms (Worker warm); groesste Partie (117 Plies) 13,9 -> 12,9 ms. Einmal je Serverstart
  kommt der Kaltstart dazu (250-340 ms).
- **Offen** (in Schritt 2 erledigt): `confirmedAgainst` und die Schicht `py` in `docs/web-architektur.md`.

### Schritt 2: Kette (2026-09-23)

- **Op `chain_status(root, names[], target, model)`** (`src/chesslab/chain_state.py`): je Aufnahme
  Export (`exported`/`settled`/`interrupted`, `SETTLE_MIN_FRAMES` aus `realgames.position`),
  Matte-Census, Herkunft der Alphas (`staleMatte`), Pass (`absent`/`fresh`/`stale`/`matte_moved`/
  `input_moved`), Lesarten (`absent`/`fresh`/`stale`/`other_model`) und `against`
  (`recording.confirmation_against`). `chainStates(names)` stellt EINE Anfrage fuer die ganze
  Seite: Startseite, Warteschlangen, `/reparatur` (`lib/chain/bundled.test.ts` zaehlt sie).
  Die Saetze und `nextStep` bleiben in TS — das ist Darstellung.
- **Weitere Ops**: `matte_census(root, name, target)` (nach einem Matte-Job),
  `confirmed_against(candidate, reference_md5)` (`/confirm`).
- **Weg**: in `chain.ts` `exportedSession`, `stampOf`, `headerOf`, `stillCurrent`, `sameLog`,
  `passOf`, `sameFile`, `scanInputPath`, `inputsMoved` (−152/+51 Zeilen); in `matte.ts` der
  Census samt Regex-Scanner, `matteSources`, `measured` (−104/+10); `confirmedAgainst`s Rumpf.
  Python parst jede Datei je (mtime, Groesse) einmal (`chain_state.parsed`).
- **Paritaet** (echter Korpus, 51 Aufnahmen): vor dem Umzug Python gegen die TS-Felder, nach dem
  Umzug der VOLLE `ChainState` gegen den TS-Stand — beide Male 0 Abweichungen.
- **Zwei Regeln sind jetzt die von `alpha_worker`**, beide ohne Treffer im Korpus: der Stapel ist
  `matte.dirty_pile` (eine Log-Zeile ohne `board` kann kein Lauf matten, die Web-Kopie zaehlte
  sie mit — `matte.test.ts` "a log row without a board"), und `done` zaehlt eine Absage mit
  `coverage` nicht (dieselbe Menge wie `--limit`).
- **Nach Python gewandert**: die fs-Mock-Faelle aus `chain.test.ts` (EACCES auf Log, Pass,
  Lesarten, Log-Stempel, Profil) und `position-flags.test.ts` (EMFILE im Census) —
  `tests/test_chain_state.py`. In TS bleibt: ein Python-Fehler kommt als `PyOpFailed` an.
- **Gegenproben** (Python veraendert, `__pycache__` geloescht, Web-Test rot, zurueck): Census ohne
  Stapel-Schnitt, `SETTLE_MIN_FRAMES` `>=` -> `>`, Pass ohne Log-Pruefung (4 rot), 1-ms-Toleranz
  des Passes weg, `same`/`moved` vertauscht (3 rot), anderes Modell ignoriert, Pass ohne
  Matte-Eingabe, `staleMatte` immer falsch, Absage als offen gezaehlt — je rot. Die
  1-ms-Toleranz der LESARTEN deckt kein Web-Test.
- **Latenz** Kette ueber alle 51 Aufnahmen (15 warme Laeufe): vorher TS kalt 560 ms, warm Median
  132 ms; nachher gebuendelt kalt 949 ms (1,7x: Worker-Start, Imports, erstes Parsen — einmal je
  Serverstart), warm Median 80 ms. Startseite samt `gameInfo` warm 763 -> 504 ms.

### Schritt 3: Strom und Korpus (2026-09-23)

- **Op `admission(root, names[])`** (`src/chesslab/stream_admission.py`): je Aufnahme `blocked`
  (Stems, deren FEN-Urteil der Slice verwirft: `labeling.frame_dirty`, aus `iter_session_crops`
  herausgezogen und dort benutzt) und `ineligible` (Stem -> Felder ausserhalb von
  `cell_rule.classification_eligible`; Coverage aus der Matte, Helligkeit aus `bright` der
  Lesarten — gemessen wie die `brightness` des Slice). `StreamBoard.reachesPool` und
  `LabelStream.ineligible` tragen das zum Client; `lanes.reachesPool` ist weg, `visible` liest nur.
- **Befund `lanes.visible` bestaetigt**: roter Test zuerst (`label-stream.test.ts`, e2 bei
  `bright` 12 stand in der Strittig-Lane). Im Korpus fallen 2 186 dunkle, sichtbare Zellen neu
  heraus, davon 458 Stellungs- und 1 Hand-Karte. `reachesPool`: 0 Abweichungen im Korpus
  (`carried` und "verdeckt ohne Settle" kannte die TS-Kopie nicht; beides kommt nicht vor).
- **Op `pool(root, names[])`, `session_dirty`** (`src/chesslab/corpus_pool.py`): der POOL mit
  `labeling.load_corrections`. **Befund**: die Web-Kopie kannte `retract: true` nicht und zaehlte
  zurueckgenommene Urteile weiter (roter Test in `pool.test.ts`). Sonst 0 Abweichungen im Korpus
  (13 577 Frames, 868 928 Zellen, 2 079 Waisen). Weg: `foldPool`, `dedupCorrections`,
  `sessionLogs` (−105/+9).
- **Gegenproben**: Helligkeit nicht weitergereicht (label-stream rot), `frame_dirty` ueberbrueckt
  (4 rot), `load_corrections` durch last-wins ohne Ruecknahme ersetzt (pool.test rot).
- **Latenz Strom**: gemessen und nachgezogen im Abschnitt "Latenz" unten.

### Offen fuer Schritt 4/5

- `loadMatte` (Strom, `verify.ts`) liest `matte.jsonl` weiter in TS; `matte-state-parity.test.ts`
  haelt ihn am gemeinsamen Fixture. Umzug zusammen mit dem Raster (4).
- Der POOL bleibt "jede Zelle jedes Log-Frames", nicht "was ein Slice ergaebe": dafuer muesste die
  Zellregel aus `iter_session_crops` als reine Funktion heraus — `labeling.py` war waehrend dieser
  Arbeit in fremder Bearbeitung, also nur `frame_dirty`.
- Kaltstart ohne Vorwaermen bleibt ueber den Zielen; mit `instrumentation.ts` siehe "Latenz".

## Latenz (2026-09-23)

Auftrag: der Strom war mit Worker langsamer als die TS-Kopie (kalt 4,1-5,2 s gegen 1,4 s, warm
~680 gegen ~360 ms). Gemessen mit dem Skript unten ueber den echten Korpus (51 Aufnahmen, 27 mit
Lesarten, 161 MB `model-reads.jsonl`, 868 928 Zeilen).

**Wo die Zeit hing**

- **Die +300 ms warm waren nie der Worker.** Die Maschine wird nach ~3 s Prozessleben oder nach
  einer Ruhepause um ~1,5x langsamer — eine reine CPU-Schleife in frischem Node ohne Worker: 140 ms,
  nach 5 s Pause 220 ms, im Dauerlauf ab ~3 s 200-500 ms. Der alte Kaltlauf dauerte 5 s, also lagen
  alle Warmlaeufe schon im langsamen Zustand. Gegenprobe: der reine TS-Strom (Op antwortet sofort)
  mit 0,8 s Pause nach dem Kaltlauf misst 465/568/667 ms, der Strom mit Worker in derselben Lage
  380-445/446-509/629-685 ms. Die Op selbst kostet warm 15-26 ms Wanduhr ab Node (Antwort 493 KB,
  `json.dumps` 5 ms). Kein Nagle-, Flush- oder Doppelanfrage-Effekt: eine Anfrage je Seite
  (`lib/chain/bundled.test.ts` prueft genau `["admission"]`, auch beim zweiten Laden).
- **Kalt war es das Parsen der Lesarten**: `iter_jsonl` mit Pool-Hook 2,4-2,6 s fuer 161 MB, dazu
  `classification_eligible` je Zelle mit frischem dict. Logs 0,3 s, Matte 0,18 s, Imports 0,2 s,
  Prozessstart nach Ruhe 0,3-0,6 s.
- **Kette kalt**: `chain_status` 0,62 s, davon ein Sechstel `Path(...).stem` (22 000 Aufrufe);
  Node las seine sechs Dateien je Aufnahme erst NACH der Python-Antwort.

**Was sich geaendert hat**

- `stream_admission.read_cells`: ein Muster ueber die Bytes (die Zeilenform von
  `occluded_model.read_session`), das nur gilt, wenn es JEDE Datenzeile trifft — sonst, und bei
  halber letzter Zeile, Leerzeile, Kopf mittendrin, Escape, anderer Reihenfolge oder NaN, entscheidet
  `iter_jsonl` wie bisher. Die Regel wird je (Coverage, Helligkeits-Token) EINMAL gerufen statt je
  Zelle. Korpus: 0 Abweichungen gegen den JSON-Weg (83 471 gesperrte Zellen, 130 Bretter), keine
  Datei faellt auf den JSON-Weg. Das Log liegt nicht mehr als Zeilenliste im Worker.
- `chain_state._stem` ohne `Path` (gleichwertig, 19 Randfaelle in `test_chain_state.py`).
- Worker-Einstieg `chesslab.web_serve` (ohne `chesslab.cli`: 195 statt 220-236 ms Import), importiert
  `web_ops` vor der ersten Anfrage; Antwort ohne Leerzeichen (`separators`). `ping` meldet `cli`.
- `loadLabelStream` schickt `admission` als ERSTES, vor den Lane-Dateien; `chainStates` liest die
  Node-Dateien NEBEN `chain_status`. Beide kehren erst zurueck, wenn Python fertig ist (sonst haelt
  der Worker nach einem Node-Fehler Dateien offen — EBUSY im Test).
- **Verworfen**: Kindprozesse, die einen Teil der Aufnahmen rechnen. Vorab gestartet sparte einer
  ~0,3 s am Strom, kostete die Kette aber +0,35 s (Startkonkurrenz); bei Bedarf gestartet brachte er
  nach Ruhe nichts (Worker 7 Aufnahmen in 1,3 s, Gehilfe 44 — zusammen kaum schneller als allein).

**Vorher/jetzt** (je 5 Laeufe, vor jedem Prozess 6 s Ruhe, Median; "vorher Worker" = derselbe
Aufbau am Morgen, ohne Pausen)

| Pfad | vorher TS | vorher Worker | jetzt | Ziel |
|---|---|---|---|---|
| Strom kalt, Worker startet mit der Seite | 1,4 s | 4,7-5,3 s | **2,19 s** | 1,5 s — nicht erreicht |
| Strom, erste Seite nach Serverstart (vorgewaermt) | 1,4 s | — | **2,54-2,64 s** = TS in gleicher Lage (2,54-2,63 s) | 1,5 s |
| Strom warm | ~360 ms | ~680-750 ms | **380-510 ms**, = TS in gleicher Lage | 360 ms |
| Op `admission` kalt ab Node | — | 4,5 s | **2,1 s** | — |
| Kette kalt, Worker startet mit der Seite | 560 ms | 929-1356 ms | **1,10-1,23 s** | 600 ms — nicht erreicht |
| Kette, erste Seite nach Serverstart (vorgewaermt) | 560 ms | — | **56-86 ms** | 600 ms — erreicht |
| Kette warm | 132 ms | 80 ms | **51-56 ms** | — |

In Python allein (ohne Start): Zulassung aller 51 kalt 4,1 s -> 1,6 s, Kette 0,62 -> 0,59 s.

**Vorwaermen beim Serverstart** (`platform/app/instrumentation.ts`, nur `NEXT_RUNTIME=nodejs`): startet
den Worker und rechnet `chain_status` und `admission` vor, der Server wartet NICHT darauf (~2,7 s).
Die erste Seite reiht sich beim laufenden Worker ein, statt einen zweiten zu starten; ein Fehler
wird geloggt (`[instrumentation] Python-Worker vorwaermen fehlgeschlagen`), Kette und Zulassung
scheitern unabhaengig. Danach antwortet `admission` in 15 ms. Die erste Strom-Seite braucht trotzdem
~2,6 s — das ist der TS-Teil (Node-Caches kalt) im gedrosselten Zustand nach 2,7 s Arbeit: der reine
TS-Strom nach 2,7 s CPU-Last misst dasselbe. Oeffnet man die Seite nach einer Ruhepause, gilt die
Zeile "vorher TS" (1,4 s). Test: `lib/instrumentation.test.ts` (Fake-Worker: ein Start, Edge startet
nichts, Fehler geloggt); Gegenproben Runtime-Pruefung weg, Fehler geworfen statt geloggt, Worker je
Aufruf neu — je rot.

**Lazy Importe**: `web_ops` zog beim Start ueber `chain_state` (`realgames.position`), `stream_admission`
und `corpus_pool` (`labeling`) `cv2` und numpy. Jetzt erst in der Op, die sie braucht: Import 190-205
-> 104-110 ms, 390 -> 200 Module; `ping` meldet `cv2: false` (`tests/test_web_worker.py`).

**Die wacklige Suite**: gleichzeitige Python-Starts nach einer Ruhepause dauern auf diesem Rechner
Sekunden — 8 gleichzeitige `python -c pass` 11,6-13,6 s ueber das venv, 5,0-5,3 s ueber den
Basis-Interpreter, 8 `node -e 0` 0,5 s; direkt danach 0,3 s. Es sind die Prozessstarts, nicht die
Importe (`import cv2` ebenso lang wie `pass`). Jede Testdatei startete ihren eigenen Worker, also
liefen 15-18 Dateien in ihr 5-s-Limit. Jetzt startet `lib/py/shared-worker.setup.ts` (vitest-
`globalSetup`) EINEN Python fuer die ganze Suite; die Dateien bekommen ueber `CHESSLAB_PY_WORKER`
ein Node-Relais (`node -e`, TCP auf 127.0.0.1) darauf. Fake-Worker-Tests setzen weiter ihren eigenen
Befehl. Ergebnis: `npx vitest run` mit Standardeinstellung 3x hintereinander mit je 30 s Pause gruen,
Dauer 5 s statt 25-30 s. `maxWorkers` bleibt unangetastet.

**Absicherung**: `test_stream_admission.py` — Schnellweg = JSON-Weg (LF, CRLF, BOM), acht
Zeilenformen erzwingen den JSON-Weg, unveraenderte Lesarten werden nicht neu geparst. Gegenproben
(Quelle veraendert, `__pycache__` geloescht, rot, zurueck): Cache aus (1 rot), Zeilenzaehlung weg
(6 rot), Helligkeit verschoben (3 rot), Zeilenschluss-Pruefung weg (1 rot).

Mess-Skript (`CHESSLAB_DATA_DIR` gesetzt; `PAUSE_MS` nach dem Kaltlauf, `WARM=1` wie nach dem
Serverstart, `BURN_MS` CPU-Last als Gegenprobe):

```js
// Aus platform/app: node <pfad>/latency.mjs <stream|ts-stream|chain|admission> [laeufe] — CHESSLAB_DATA_DIR gesetzt.
import { createRequire } from "node:module";
const APP = process.cwd().replaceAll("\\", "/");
const { createJiti } = createRequire(`${APP}/package.json`)("jiti");
const jiti = createJiti(`${APP}/x.ts`, { alias: { "@": APP } });
const [what = "stream", runs = "4"] = process.argv.slice(2);
const py = await jiti.import(`${APP}/lib/py/worker.ts`);
const { loadLabelStream, liveGames } = await jiti.import(`${APP}/lib/label/label-stream.ts`);
const { listGames, dataDir } = await jiti.import(`${APP}/lib/session-store/recordings.ts`);
const { chainStates } = await jiti.import(`${APP}/lib/chain/chain.ts`);
// "ts-stream": derselbe Strom, die Op antwortet sofort `{}` — der reine TS-Anteil als Vergleich.
if (what === "ts-stream") py.setPyWorkerCommand({ command: process.execPath, args: ["-e",
  "require('readline').createInterface({input:process.stdin}).on('line',l=>{const r=JSON.parse(l);" +
  "process.stdout.write(JSON.stringify({id:r.id,ok:true,value:{}})+'\\n')})"] });
// WARM=1: wie nach dem Serverstart — `instrumentation.warmPython` ist durch, bevor die erste Seite laeuft.
if (process.env.BURN_MS) { const t = performance.now(); let x = 0; while (performance.now() - t < Number(process.env.BURN_MS)) x += Math.sqrt(x + 1); }
if (process.env.WARM) {
  const t = performance.now();
  await (await jiti.import(`${APP}/instrumentation.ts`)).warmPython();
  console.log("warm", Math.round(performance.now() - t));
}
const ms = [];
for (let i = 0; i < Number(runs); i++) {
  if (i === 1 && process.env.PAUSE_MS) await new Promise((r) => setTimeout(r, Number(process.env.PAUSE_MS)));
  const t0 = performance.now();
  if (what.endsWith("stream")) await loadLabelStream();
  else if (what === "chain") await chainStates(await listGames());
  else await py.pyCall("admission", { root: dataDir(), names: await liveGames() });
  ms.push(Math.round(performance.now() - t0));
}
console.log(what, JSON.stringify(ms));
await py.stopPyWorker();
process.exit(0);
```
