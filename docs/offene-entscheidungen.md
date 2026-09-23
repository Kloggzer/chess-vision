# Entscheidungsvorlage (Stand 2026-09-23)

Jeder Punkt ist gemessen oder am Code belegt — es fehlt nicht die Analyse, sondern eine
Richtungsentscheidung. Erledigtes steht auf EINER Zeile; Herleitungen liegen in der Git-Historie.

**Spalte "Kiste":** (A) klein und verhaltensgleich · (B) mittel, braucht neue Tests · (C) aendert
Verhalten oder Format — nie ohne A/B am Regressionssatz.

| # | Punkt | Kiste | Empfehlung |
|---|---|---|---|
| 5 | Der Regressionssatz ist blind fuer die haeufigste Fehlerklasse | — | neue Aufnahmen, **ja** |
| 6 | `_persistent`: 1 797 zu Unrecht im Vorrat, 3 241 zu bergen | C | mit dem naechsten Neubau |
| 7 | `2026-08-15-23-01-43`: Export unvollstaendig | A | faellt mit 6 zusammen |
| 14 | Spender-Pool ohne `neighbour_p > 0`-Schutz | C | mit dem naechsten Rezeptschnitt |
| 21 | Fuenf Vertrags-Familien statt 19 Einzelformate | B | Naht 1–3 gebaut, 4–5 nach dem Neubau |
| 30 | Der Champion halbiert das Verdeckungs-Veto | B | **entscheiden** |
| 31 | Das Telefon holt den Champion nicht ab | C | **entscheiden** |
| 33 | `labeled-session-pack` koennte aus `row["board"]` schneiden | C | mit dem naechsten Export-Neubau |
| 34 | Session-Packs ohne `crop_fingerprint` | A | mit 33 zusammen |
| 35 | Die Kommentar-Ratsche zaehlt Bloecke, nicht ihre Laenge | B | Migration, nicht nebenbei |
| 40 | `occluders.json` nennt die falsche Kachelgroesse | A | Nutzer, eine Zeile unter `data/` |
| 44 | `pose_of` meldet `foreshorten: 0.0` ohne Messung | B | beim naechsten Anfassen der Spalte |
| 45–50, A, N | siehe unten; ungezaehlte Punkte dazwischen | | |

## Erledigt — je eine Zeile

- alt 3, 8–13, 17–19: gebaut oder gestrichen bis 2026-09-16 (u. a. Kommentar-Ratsche auf 5,
  Fixture-Baukasten, Modellkarte). 13: ein unqualifizierter Metrikname ist KORPUSWEIT, `visible_*`
  misst nur, was der Verlust lernt.
- 15 RNG je Loader-Worker: gebaut 2026-09-16; `--holdout-session` nagelt den Hand-Gate-Holdout
  fest, `DEFAULT_GATE` = `mnv3s-448-v3` (nicht schlechter, 0,85 statt 4,28 ms je Brett).
- 16 `p5`/`p95` im Aufnahme-Auftrag: gebaut 2026-09-16.
- 20 Acht Leser pruefen `coverage` truthy: gebaut, Commit `5c833c40` — eine leere Coverage `{}` ist
  "gemessen, nichts verdeckt", nur ein FEHLENDES `coverage` ist ungemessen.
- 22 Halbe letzte Zeile: gebaut 2026-09-16 — `ioutil` und `lib/atomic.ts` als Treuhand, der
  Zeilenumbruch entscheidet.
- 23 `UtteranceQueue`: gebaut 2026-09-16, eine Generation je Spruch.
- 24 `StockfishAnalyzer` 50 % fuer "nicht bewertet": gebaut 2026-09-16.
- 25 Leere Coverage im Settle-Median: gebaut, Commit `0929769b` (14 von 804 Plys zeigen jetzt "—").
- 26 `--smooth-iters` dreht die Figur: gebaut 2026-09-16, 0 von 12 Meshes betroffen.
- 27 Postgres: verworfen 2026-09-16 (Nutzer). Geparkt: `compose.yaml`, `db/schema/`,
  `tests/test_db_contract.py`; `data/pgdata` (47 MB) kann weg, sobald der Nutzer es sagt.
- 28 Messung, dann Absage: gebaut, Commit `5c833c40`. **Regel:** `matte.jsonl` ist eine HISTORIE,
  je FRAME gilt die juengere Zeile, auf beiden Seiten (`labeling.read_matte`, `lib/matte.ts`).
  Eine Zeile ohne `coverage` ist SAMs Absage — sie loescht eine fruehere Messung, der Frame ist
  danach ungemessen, nicht sauber.
- 29 `recut_coverage` las das falsche Alpha: gefixt und repariert 2026-09-16 (139 Zeilen); vor dem
  16.09. gebaute Datensaetze tragen die alten Zahlen bis zum Neubau.
- 32 Alarmspalte zaehlt Entscheidungen: erledigt, Commit `6c626891` (`scripts/compare_regression.py`).
- 36 Drei Wachen ohne Zeugen: erledigt 2026-09-21 — `-Satz v2` hat handreiches Material
  (`docs/regression-reference.md`).
- 37 / 41 `brightness`-Spalte der 80-px-Saetze: repariert 2026-09-22 (`real13-mix-v7-80`,
  `real13-mix-v6-80-clahe`); 80er-Laeufe sind danach nicht mehr mit dem Archiv vergleichbar.
- 38 Klassengewichte gegen die Verlustmaske: gebaut 2026-09-22
  (`tests/test_bug_hunt_20260922f_gewichte.py`); sechs von sieben `scripts/`-Auswertern nachgezogen,
  `mine_hard_coverage.py` bewusst auf `coverage`.
- 39 `cleanCommitsOnly`: befoerdert, Commit `4ffe21f5` (Zahlen in `docs/regression-reference.md`).
- 42 Modell-Handarm: gebaut 2026-09-22 — `modelHandShapeFilter` plus `modelHandArm`; der Arm traegt
  auf `-Satz v2` eine Desync-Episode.
- 43 `classify` ohne Zeugen: gebaut 2026-09-22 (`tests/test_bug_hunt_20260922e_scan.py`), wirkt nur
  auf kuenftige Exporte.
- 51 Mutationsprobe `:core-engine` (229 Mutanten, 42 ungedeckte jetzt mit Test): entschieden
  2026-09-23, alle toten Wachen bleiben — `COMMIT_VOTES` ist ein Knopf, der tote
  `else if (bound) atEnd()` lebt auf, sobald er steigt; FEN-Nachpruefungen sind billige Absicherung.
  E13 gefixt (`docs/bug-audit-2026-09-13.md`).
- A3 Schreibschutz je Datei: gebaut 2026-09-23 — `_write_log` bewacht (`write_rows_guarded`,
  `Contested`), der Export traegt `HUMAN_KEYS = ("unusable",)` und verweigert mit
  `VerdictsWouldDrop`, wenn ein Urteil auf einem nicht mehr gewaehlten Frame laege
  (`--drop-verdicts` nur ausdruecklich); `trim_session` schreibt erst das Log; `lib/frame-flag.ts`
  schreibt bewacht (409). `upsert_proposals` stagt wie `close_seams`.
- A5 `MATTE_DIRTY` = `PIECE_VISIBLE_MAX`: `chesslab/cell_rule.py` haelt die Regel torch-frei.
  Neu zu entscheiden erst, wenn `--coverage-weight soft` Vorgabe werden soll (26 357 Matte-Zellen
  in (0,15; 0,6] lernt `soft` mit Gewicht ~0,355, die Lane zeigt sie nie).
- W1–W3 Urteils-Revisionen (2026-09-23): `adoptPgn` schreibt mit `flag: "wx"`; `retime` ueber
  `ioutil.write_json_guarded`; eine Bestaetigung traegt `confirmed_reference: {md5, at}` (md5 ueber
  die ROHEN Bytes), `/confirm` schickt den md5 der angezeigten Referenz (409 bei Abweichung),
  `realgames confirm` nimmt ihn beim Lesen. Weicht die Referenz ab, oeffnet `chainState` die
  Sprosse `confirm` wieder; ohne Stempel gilt `confirmRefUnknown`.
- W4–W5 Meldung/Widerruf und abgebrochener Export (2026-09-23): `adopt_reported_dirty` gleicht in
  beide Richtungen ab, `dirty_source=reported` wird abgeleitet, nicht getragen; unter
  `.export-running` wirft jedes `read_log` `ExportInterrupted` (Ausnahme `under_export=True`:
  `rewarp`, `write-boards`, `flag_frame`). Rest: Korpus-Berichte (`position-flags`, `frame_hands`)
  brechen an EINER abgebrochenen Aufnahme ab; `hand_gate.gate_session` prueft den Marker nicht.
- Sekundenachse in `docs/tracker-flow.md`: neu gemessen 2026-09-22, Aussage zu
  `cnnCooldownS` haelt.
- Leser-Ratsche ueber den Syntaxbaum statt `splitlines()`: gebaut 2026-09-17.
- Neun `xfail(strict)` warten weiter auf ein menschliches Ja zur Verhaltensaenderung.
- Vertauschter Aufbau b8/c8 und f1/g1: 239 Korrekturen 2026-09-17, Wache `lib/setup-swap.ts` (sie
  nennt die Felder, die eine Aufnahme durchgehend anders fuehrt). Unbeurteilt bleibt
  `2026-08-08-11-59-12` g7 (FEN `bB`, Modell 98 % `bP`).
- Held-out-Labelaudit (09-17/18): kein Labelfehler auf den Aufnahmen (733 von 739 gesichtet),
  5 908 Komposit-Widersprueche sind 49 Entscheidungen, alle richtig. Zwei Folds sind kein zweiter
  Zeuge; entschieden wird am Crop.
- Brett-Vorschau zeigte den Rillen-Sensor statt der Matte: gefixt 2026-09-17. Ein Frame ohne Matte
  ist UNGEMESSEN, nicht handfrei, und die Vorschau sagt das.
- v8 aufgeschoben, `2026-09-15-16-54-44` bleibt Holdout (`tests/test_holdout_sessions.py`).
- Ausduennen je Standzeit: verworfen 2026-09-18 — `rot-thin16` bricht auf test-v1 ein (4 980 gegen
  193 falsche Zellen), der Val aus einer Aufnahme sah es nicht.
- `test-v1` (`real13-test-v1-128`, 26 124 sichtbare besetzte Zellen): wiederholbarer Benchmark
  (`benchmark` in `data/TEST-USED.json`, nicht `frozen`); `labeling.clean_frames` trennt SAMs Absage
  vom sauber gemessenen Frame.
- 15 ueberschriebene menschliche Urteile: zurueckgestellt 2026-09-18; Regel: vor jedem
  Label-Schreiben `corrections.jsonl` UND `reviewed.jsonl` lesen.
- 80 gegen 128 px, gleiches Rezept: 128 gewinnt auf test-v1 um Faktor 11 (58 gegen 647 Fehler),
  80 px streut Faktor 4 zwischen Seeds. Training auf abgeglichenen Labels: kein messbarer Effekt.
- `cnnConfThr`: 0,50–0,85 identisch 396/3/0, ab 0,95 ein Phantom — 0,85 bleibt (2026-09-18).
- `lib/answer.ts` deckt drei Poller: bewusst so, bis ein vierter die Form wiederholt. Zwei
  Routen-Wachen sind Redundanz: bleiben (verstaendlichere Meldung).
- Mess-Ratsche, Web-Blindstellen (`ingest.sizeOf`, `data.frameSize`, `stored`), `/confirm` las
  Lesefehler als "keine Datei": gebaut 2026-09-23 (`lib/blindstellen-20260923.test.ts`,
  `lib/confirm-read-errors.test.ts`).
- Drei Pack-blinde Analyse-Skripte (`gradcam_summary`, `session_colour`, `lr_range_test`): lesen
  wieder, 2026-09-23 (`tests/test_bug_hunt_20260923_packleser.py`).
- `prune_dead_rows` nutzt `MATTE_DIRTY` statt `any(coverage)`: gebaut 2026-09-22
  (`tests/test_bug_hunt_20260922b_matten.py`). Offen nur: nach dem naechsten `temporal-pass` die 27
  betroffenen Zellen (8 Frames) ansehen — steht dort eine Hand, war die alte Regel Labelverlust.
- Skript-Jagd Runde 2/3 (Punkt 50, `tests/test_bug_hunt_20260923_skripte.py`): `fix_ply_offset`
  liest beide Ledger, `thin_per_position`/`audit_montage`/`move_strip` lesen `coverage None` als
  ungemessen, `border_probe` seekt nicht mehr, `sweep_report` mittelt die letzten 20 Epochen,
  Mess-Skripte fahren ABBA, `reduce_video` verlangt eine Bildrate.
- `benchmark_export_warp.py`: misst seit Punkt 50 ABBA; die Zahl 23 -> 7 s in CLAUDE.md stammt aus
  dem alten Lauf (warmer Cache) und ist eine obere Schranke bis zur Neumessung.

## 5. Der Regressionssatz ist blind fuer die haeufigste Fehlerklasse

Siebenmal gefahren, jedes Mal Ziffer fuer Ziffer gleich: er beweist, dass nichts kaputtgeht. Aber
keine der vier gefundenen Stellungs-Luecken bewegt ihn, das Gate 0,5 -> 0,25 (17 % mehr maskierte
Zellen) auch nicht. Es fehlt Material, in dem eine Hand ueber dem Feld steht, das die Evidenz traegt.

**Empfehlung: ja** — neue Aufnahmen dafuer (von Schwarz, im Dunkeln, langsame Griffe ueber
entscheidende Felder), vor dem naechsten Re-Cut der Coverage.

## 6. Der `_persistent`-Fix gilt nur fuer kuenftige Exporte — GEMESSEN 2026-09-16

`classify` offline gegen `scan.jsonl` ueber alle 18 Aufnahmen, alte gegen neue Regel: 5 083 Frames
anders eingestuft, **~3 241 zu bergen, ~1 797 zu Unrecht im Vorrat** (Obergrenze — `select()` mit
`per_position` entscheidet, was ankommt). Drei Aufnahmen tragen die Haelfte: `2026-08-24-22-43-46`,
`VID_20260802_222741`, `2026-08-08-00-39-57`.

Ein Re-Export schreibt `log.jsonl` neu, entwertet damit die Stempel von `model-reads`/`pass.json`
fuer alle 18 und verlangt `occluders recut-coverage`. **Empfehlung:** an den naechsten Neubau.

## 7. Eine Aufnahme ist unvollstaendig exportiert

`2026-08-15-23-01-43`: der Scan ist vollstaendig (3 867 Zeilen), der Export nicht (16 Log-Zeilen
bei 628 Brettern). Braucht eine Neu-Ausfuhr, kein Nachscannen. **Faellt mit 6 zusammen.**

## 14. `torch_data.py` — Spender-Pool ohne `neighbour_p > 0`-Schutz

Jeder Val-Datensatz baut den Spender-Pool und liest ihn nie. Der Guard entfernt einen
`random.sample`-Aufruf und **verschiebt die Zufallsfolge** — Laeufe davor und danach sind nicht
mehr bitgleich. **Empfehlung:** liegen lassen bis zum naechsten Rezeptschnitt, dann mit.

## 21. Fuenf Vertrags-Familien statt 19 Einzelformate

Die haeufigste Fehlerklasse: *nicht gemessen* wird als *gemessener Normalwert* gelesen
(`.get(key, default)`, der Default ist der Normalwert). Die Grenze ist Platte -> Speicher, nicht die
Sprachgrenze. Familien: **Messreihen** (`matte.jsonl`, `model-reads.jsonl`, `interval-check.jsonl`
— nur sie tragen die Fehlerklasse), **Laeufe** (`log.jsonl`, `pass.json`), **Karten**
(`config.json`, `session.yaml`), **Urteile** (`review-notes.jsonl`), **Packs** (`packed_meta.json`).

Nahtfolge: 1. `matte.jsonl` mit drei Zustaenden (fehlt / abgesagt / gemessen) — gebaut (Punkt 20).
2. `lib/jsonl.ts` als gemeinsamer TS-Leser — gebaut. 3. Ratsche `platform/app/jsonl-readers.txt`
— gebaut. 4. `ModelServingSpec`: was `train` in `config.json` schreibt und das Serving rechnen muss.
5. Versionierte Vertraege je Familie. **Empfehlung:** 4–5 erst nach dem Neubau.

## 30. Der Champion halbiert das Verdeckungs-Veto (2026-09-21, gemessen)

`FrameLoop` leitet die Baseline-Verdeckungsschwelle als `motionPxThr * 4,0` ab. Unter dem Champion
(34,544 statt 20) faellt `occlVetoed` auf echtem Material um **68,7 %** (vier Aufnahmen, `ff09040a`);
oberhalb 34,5 kostet es nichts mehr. Der Regressionssatz zeigt nichts — mit BEIDEN Verdeckungsarmen
aus kommt er identisch heraus (`docs/regression-reference.md`), kann die Achse also nicht beurteilen.
`scripts/occlusion_reserve.py` misst die Reserve.

**Zu entscheiden:** ob die schmalere Reserve reicht. Bis dahin schiebt kein Kandidat `motionPxThr`
nach oben (der beste der Budget-Suche, 41,5, hebt die Schwelle auf 166). Ausstehend: 20 gegen
34,544 auf `-Satz v2` (875 von 988 Frames verdeckt).

## 31. Das Telefon holt den Champion nicht ab (2026-09-20)

`ConfigCodec` legt jeden gespeicherten Wert ueber die Vorgabe; ein Geraet mit gespeicherten
Einstellungen behaelt nach dem APK-Update die alten Werte. Ein `CONFIG_SCHEMA_VERSION`-Sprung
erzwingt es, wirft aber alle Handeinstellungen weg, und die Regel dort gilt nur fuer geaenderte
BEDEUTUNG. Alternative: Handgriff am Geraet je Kandidat. Bewusst offen.

## 35. Die Kommentar-Ratsche zaehlt Bloecke, nicht ihre Laenge (2026-09-21)

(Im Code teils als "Punkt 33" zitiert.) `CommentBudgetTest.commentBlocks` und
`android/scripts/comment_budget.py` zaehlen, WIE VIELE 5+-Bloecke eine Datei traegt — ein gebuchter
Block darf von 5 auf 50 Zeilen wachsen. `tests/test_comment_budget.py` bucht die Laenge des
schlimmsten Blocks, die schaerfere Zahl. Umstellen ist eine Migration: `comment-budget.txt` darf
nur schrumpfen und muss dafuer einmal neu gesetzt werden. Bis dahin haelt
`CommentBudgetCounterCheckTest.einWachsenderBlockBleibtEineEins` die Blindstelle fest.

## 40. `occluders.json` nennt eine Kachelgroesse, die um Faktor 2 danebenliegt (2026-09-22)

`data/occluders/occluders.json` meldet `tile: [1200, 1006]`, die Dateien sind 2400 x 2012. Heute
liest niemand die Zahl (`composite` nimmt `source`); gefaehrlich wird sie, sobald ein Pool ohne
`source` kommt und `composite.plate_long_side` auf sie zurueckfaellt. **Zu entscheiden:** Zahl
korrigieren (Nutzer, unter `data/`) oder `plate_long_side` die Kachel messen lassen.

## Welches Archiv-Flag traegt den Rezept-Abstand? (2026-09-18)

Archiv-Seeds 0,9963 gegen Kontrolle 0,9874 unterscheiden sich in vier Flags: `weight_cap` 3,0/None,
`loss` ce/occlusion, `aug_erase_p` 0,25/0,0, `pretrained` False/True. Plausibelster Kandidat:
`--weight-cap 3` (Faktor 15 in der Gewichtsspreizung). **Offen, niedrige Prioritaet:** Ablation mit
vier Armen zu je drei Seeds.

## Prior-Kurve gemessen: lambda 8 ist die erste phantomfreie Schwelle (2026-09-18)

`prior_lambda` im Modell sind MIGRATIONSwerte (4,0 x T). Gemessen am Champ `p4a-80-clahe` gegen
`test-v1` (51 955 Zeilen):

| lambda | cell | board | **phantom** | miss | illegal |
|---|---|---|---|---|---|
| 0 | 0,9374 | 0,0395 | 17 | 29 | 3 219 |
| **5,98** (heute) | 0,9879 | 0,6234 | **1** | 38 | 575 |
| **8** | 0,9933 | 0,7351 | **0** | 33 | 284 |
| 12 | 0,9985 | 0,9177 | 0 | 29 | 9 |

Kein Zielkonflikt: Misses bleiben, Phantome fallen auf 0. Nach der Phantom-Regel ist **8** die
Antwort. **Vorbehalte, bevor die Zahl ins Modell wandert** (`scripts/stage_model_asset.py`):
Python legt den Prior auf die Softmax, Kotlin auf die rohen Logits — die absolute Zahl gehoert an
`scripts/replay-regression.ps1` bestaetigt. Und ein starker Prior verdeckt Modellfehler; was eine
falsche Basis-FEN dann kostet, misst der Sweep nicht.

## `arena list`/`score` nennen die Referenz-HERKUNFT nicht (2026-09-22)

8 von 13 Arena-Aufnahmen tragen keine `reference.pgn`, ihre Referenz ist ein frueherer Trackerlauf.
Zwei Referenzen sind nachweislich falsch (`VID_20260802_222741`, `VID_20260726_233432`), ein Lauf
meldet dort Phantome, die keine sind. Welche Referenz stimmt, ist ein menschliches Urteil.
**Zu entscheiden:** Feld `reference: pgn|candidate` in `list`/`score`, oder `reference.md` je
Aufnahme, die `arena` mitdruckt.

## `writeAtomic` ist unter Windows nicht nebenlaeufig (gemessen 2026-09-22)

Vier Straenge auf EINER Zieldatei liefern `AccessDeniedException` beim `Files.move` (Windows
verweigert das Ersetzen waehrend eines anderen Ersetzens); auf dem Telefon kein Fall, aber `:arena`
und `:desktop` nutzen dieselbe Funktion. **Zu entscheiden:** Sperre je Pfad (dann in allen drei
Sprachen) oder die Regel "ein Pfad, ein Schreiber".

## `per_position` fehlt in drei fertigen Datensaetzen (2026-09-22)

`real13-v7-thin16`, `-core`, `-rand` wurden vor dem Schreiben von `per_position` ausgeduennt
(Faktor 1,543 raw/after_dedup); ein `--like` darauf baut den VOLLEN Korpus. **Empfehlung:**
`per_position: 16` nachtragen (schreibt in `data/`, braucht ein Ja) — oder `--like` auf einem
Spender ohne den Schluessel verweigern wie beim `blind`-Riegel.

## Die Ratsche `tests/json_doors.txt` sieht den Anhaenge-Modus nicht (2026-09-22)

`doors_in` kennt `"a"` nicht und prueft je ZEILE, sieht also auch ein mehrzeiliges
`path.open(\n "a", ...)` nicht. Rohe Anhaenge offen in `session_writer.py` (`log.jsonl`),
`training/train.py` (`metrics.jsonl`), `scripts/fix_ply_offset.py`; `matte.alpha_worker` und
`sessions._record_archive_reason` sind umgestellt. Bei `os._exit` sind abgerissene Schwaenze der
Normalfall (4 von 1 536 `.jsonl` auf Puffergrenzen). **Empfehlung:** Syntaxbaum statt Zeilen-Regex,
mit Gegenprobe fuer beide Formen, und die drei Stellen gleichzeitig auf `append_rows`.

## `split-f*.json` nach `drop_dead_rows`: nachziehbar ist nur, was das Manifest deckt

`drop_dead_rows.py` rechnet Split-Dateien seit 2026-09-22 neu (bitgleich, wenn nichts fehlt). Die
FOLD-Dateien decken nicht jede Sitzung, `make_split` stirbt dort mit `KeyError`; das Skript benennt
sie und endet mit 1. 12 von 52 Datensaetzen tragen tote `mm://`-Zeilen, drei turntable-Saetze zu
100 %. **Empfehlung:** `make_split` eine Sitzung ausserhalb aller Splits verkraften lassen, oder die
Folds beim naechsten Re-Build neu erzeugen.

## `learning_curve.py` schreibt `split-lc<k>.json` mit den Zahlen des VOLLEN Korpus

Alle `lc`-Dateien tragen `counts`, `train_class_counts`, `class_weights` von `split.json`. Unter
`--head occlusion` folgenlos (Gewichte werden neu gerechnet), sonst trainiert k=4 mit den Gewichten
von 17 Aufnahmen. **Empfehlung:** `counts`/`train_class_counts` nachrechnen, `class_weights`
unangetastet lassen (sonst wandert das Rezept) und den Grund in die Datei stempeln.

## `occluder_footprint_image` misst den Arm-Radius NUR entlang Welt-+X

Der Arm wird als Kreis projiziert, ist bei gekippter Kamera aber eine Ellipse (30 Grad: y-Achse
19 % laenger, 45 Grad: 57 %). Im Vorgabeband (`--max-obliqueness 0.20`) ~2 %, unter der
Abtastquantisierung. Jede Korrektur ist eine LABEL-Entscheidung. **Empfehlung:** beide Achsen
messen und die Differenz ins AMBIGUOUS-Band schieben — kostet Frames statt falscher Labels.

## `commit_truth.py` bewertet 7 von 11 Logs gegen `candidate.json`, nicht gegen ein PGN

Nur 4 Aufnahmen tragen `reference.pgn`; bei den 7 anderen misst "erfunden" den Abstand zweier
Maschinenlaeufe. Gebaut ist `ref_kind` je Zeile in `tmp/calib/commits.jsonl`. **Empfehlung:**
Kalibrierung getrennt je `ref_kind` ausweisen, dann entscheiden: PGN nachtragen oder rausnehmen.

## Skript-Jagd 2026-09-22c: zwei Reste

- **`straighten_ab`, Arm "mesh (eigener)":** Frames ohne Mesh (1 116 von 7 344, alle Handframes)
  messen das ROHE Brett unter dem Namen des Mesh-Arms. Eigener Sentinel statt `None`, oder Arm weg?
- **`show_errors`:** ungemessene Coverage wird jetzt gezaehlt und benannt (elf Datensaetze zu
  100 % ohne Coverage). Offen: gehoeren ungemessene Zellen ueberhaupt auf den Bogen?

## `conf_wrong`/`conf_right` bleiben bei 0,0, obwohl der Nenner leer sein kann

`training/engine.evaluate_dataset` meldet ohne benotbare Zelle jetzt `None` fuer `square_acc`,
`macro_recall`, `_hit_rate`. `conf_wrong`/`conf_right` bleiben `0.0`, weil
`tests/test_training_bug_hunt.py` `conf_wrong == 0.0` als Teil eines anderen Befunds haelt;
`board_acc`-Familie bleibt ebenfalls (`fafc4f7d`). **Empfehlung:** beide mit derselben Aenderung
drehen, die den fremden Test auf seine eigentliche Zusage umschreibt — oder bewusst stehen lassen.

## Skript-Durchsicht 2026-09-22d: zwei Entscheidungen

- **`mine_hard_empty --dataset`** scannte auf Session-Pack-Saetzen null Zeilen bei Exit 0 (gefixt).
  Jede frueher auf einem solchen Satz gemeldete Zahl ist 0/0 — wer sie zitiert, misst neu.
- **`adabn_recalibrate` lehnt CLAHE-Laeufe ab** (`to_batch` ruft die Operator-Kette nie auf);
  betrifft `mnv3s128-bn-all`, `-p60`. Offen: CLAHE im Kalibrierpfad nachziehen.

## Das Partie-Journal: die groessere Loesung, bewusst nicht gebaut (2026-09-22)

`GameStore.save` schreibt drei je fuer sich atomare Artefakte. Gebaut: `endAndSave` gibt `live`
erst nach dem Speichern auf, `GameStore.rows` vereinigt Index und `<id>.json`, `open` wirft
`GameUnreadable`. Ungeloest: ein fehlendes oder aelteres `<id>.pgn` faellt niemandem auf. Ein
Journal je Commit loeste das, braucht aber einen Startpfad, den es nicht gibt, und deckt nur noch
abgeleitete Artefakte. Offen.

## 44. `pose_of` meldet `foreshorten: 0.0`, wo nichts gemessen wurde (2026-09-22)

Bei entarteter Vorderkante (`front == 0`) steht 0,0 = "maximal verkuerzt"; nach Projektregel
gehoert dort `None` hin. Heute ohne Fall (die Geometrie weist ein solches Quad vorher ab), aber ein
Schemawechsel `float` -> `float | None`. **Empfehlung:** beim naechsten Anfassen der `pose`-Spalte.

## 45. Neun `candidate.json` tragen Vorgaben als gemessene Aufnahme-Konfiguration (2026-09-23)

**Code repariert:** `PhoneCandidate.settingsJson` schreibt bei fremdem Schema
`"effective_config": {"unknown": "<Notiz>"}` statt der Vorgaben (`PhoneCandidateTest`). **Offen:**
neun Candidates aus Schema 4/5 unter `data/` tragen weiter die Vorgaben (z. B. `2026-08-24-22-43-46`:
gespeichert 992 / 0,15, behauptet 1600 / 0,5). Keine Referenzmessung liest den Block. **Empfehlung:**
`phone-candidate force=1` je Aufnahme — schreibt unter `data/`, braucht ein Ja.

Dazu: `multireplay` (B1) repariert, aber die 1,8x und die Zeitentabelle in
`docs/desktop-replay.md` sind ungemessen. B3 ("kein Brett" im `score`-Modus) widerlegt.

## `writeCandidate` (Kotlin) ersetzt `candidate.json` ohne Wache (2026-09-23)

`RealGameCandidate.writeCandidate` loescht und ersetzt ohne Pruefung; zwischen `stat` der Web-App
und dem Schreiben liegt ein ganzer Replay. Die Wache gehoert dorthin (verweigern bei
`reviewed_plies`/`confirmed`), nicht nach `platform/app`. Offen.

## `lr_range_test.py` spiegelt nur die Vorgaben von `train` (2026-09-23)

Misst per Vorgabe `--head occlusion`; aeltere Baender sind CE ohne Maske und nicht vergleichbar.
Offen: `--weight-cap`, `--coverage-weight`, `--visible-max`, `--dark-min`, `--label-smoothing`
werden nicht durchgereicht.

## 46. Ein Gate fuer drei Stockfish-Besitzer? — Live ja, Review bewusst nicht (2026-09-23)

Tipp-Pfad gebaut: `gatedLineResolver` bricht die Mattlinie ab, sobald `analysis.block` zuschlaegt
(`HintLineGateTest`). Das Review laeuft laut `docs/game-review.md` bewusst neben dem Tracker.
**Offen:** soll es pausieren, wenn der Tracker unter 15 fps faellt oder das Geraet drosselt? Dann
ein Lease, das `ReviewHost` und `AnalysisHost` teilen.

## Die Rezeptzahlen "11,4 ms fest / 3,9 ms kompiliert" reproduzieren sich nicht (2026-09-23)

Aus `tmp/compile-spike/` per kleinster Quadrate: eager **11,90 ms + 34,67 µs**, kompiliert
**4,61 ms + 31,9 µs** — weder CLAUDE.md (11,4 / 3,9) noch `docs/training-speed.md` (5,3).
Jeder Punkt war ein Lauf in fester Reihenfolge; derselbe Arm streut im selben Prozess um +61 %.
Die Richtung (startgebunden) steht. `profile_training_kernels.py` fittet jetzt selbst und
wiederholt das erste Glied. **Offen:** CLAUDE.md erst nach einer Messung auf ruhigem Rechner umstellen.

## 47. `appendRows` liest den Schwanz mit `.catch(() => "")` — Absicht oder Luecke? (2026-09-23)

Jeder Lesefehler gilt als "leere Datei": bei EMFILE entfaellt die Schwanzreparatur, und die neue
Zeile klebt an einen halben Schwanz. `measurement-doors.txt` nennt es Absicht, das trifft aber nur
ENOENT; kein Test faellt, wenn man auf `absentOnly` dreht. **Zu entscheiden:** auf `absentOnly`
umstellen oder die Ratschen-Begruendung auf "jeder Fehler" erweitern.

## 48. Vierzehn Session-Packs trainieren auf Zellen, die der Nutzer gesperrt hat (2026-09-23)

13 gesperrte Zellen (von 40 aktiven Sperren) stehen in 14 Packs, 21 Zeilen; 0 Pack-Zeilen
widersprechen `corrections.jsonl`. `build_dataset(from_packs=True)` lehnt diese Packs ab
(`dataset_build._stale_packs`); `dataset build --allow-stale-packs` (`cli/dataset.py`) laesst sie durch. `train`/`eval` melden
Konflikte fertiger Datensaetze als `verdict_conflicts` (filtern nicht, `--strict-verdicts` bricht
ab); groesste Umlabelungen in `real13-mix-v6-*` (bis 257 train-Zeilen, `wB`<->`wN`/`bB`<->`bN`).
Offen: 5 843 Korrekturen, deren Zelle in keinem Pack steht, nicht ausgewertet. **Empfehlung:** die
14 Packs mit `chesslab session pack --session <sid> --size <80|128> --replace` neu schneiden, die
zitierenden Datensaetze erst beim naechsten faelligen Bau.

## A1–A5. Architektur-Review Python (2026-09-23)

Bericht: `docs/architektur-review-python-2026-09-23.md`, Tests:
`tests/test_bug_hunt_20260923_architektur.py`. A3 und A5 stehen unter Erledigt.

**A1 — Settle-Messung ueberlebt neue Bretter/Quads.** `settle_dev`/`settle_seen`/`settle_left`
stehen in derselben `log.jsonl` wie die Geometrie; `write_corner_rows`, `rewarp`, `straighten`,
`fit-mesh` raeumen sie nicht, kein `_source` kann das sehen. **Betroffen 0 von 27 Aufnahmen**,
deshalb kein Fix (er kostete jedem Frame seine Messung). Festgehalten als `xfail(strict=True)`,
`tests/test_bug_hunt_20260922_provenance.py::test_a_new_quad_drops_the_settle_measurement`.
**Wird die Zahl nicht mehr 0, bauen** — als Raeumen plus Knopf an der Kette.

**A2 — `pass.json` und der Scan haben verschiedene Uhren.** Gebaut: `pass.json` traegt `_inputs`
(`matte`, `scan`), `chain.ts::inputsMoved` prueft; Altbestand (alle 27) gilt als "Stand unbekannt".
**Zu entscheiden:** (a) `recut-coverage --all` (rechnet Drift nach, stempelt 8 554 Matte-Zeilen
ohne `_source`; aendert Trainings-Coverage, also mit Datensatz-Neubau); (b) Profil in
`provenance.source` aufnehmen.

**A4 — 63 Frames in 18 Aufnahmen ohne Upsert.** SAM fand nichts, das Temporal-Alpha liegt ueber
0,15, keine Upsert-Zeile — sie trainieren mit Coverage ~0. **Offen:** einmal
`session temporal-upsert` ueber die 18.

## 49. `model.qnn.onnx` wird gebaut, aber nie abgelegt — Absicht? (2026-09-23)

`quantize.run_quantize` schreibt den QNN-Graph, `scripts/stage_model_asset.py` kopiert nur
`model.onnx`; das QNN-AAR ist raus. **Zu entscheiden:** (a) `--format qnn` bleibt reines
Mess-Artefakt, oder (b) QNN-faehiger Build — dann gehoert der Graph in `export_fingerprint` und
`quantize.PARITY_FLOOR` wird eine Auslieferungsgrenze.

## 50. Skript-Jagd Runde 2/3: was offen bleibt (2026-09-23)

Die Fixes stehen unter Erledigt. Offen:
- `profile_training_gpu --experiments`: Arme in fester Reihenfolge, `eager_repeat` ist die einzige
  Kontrolle (`autotune` setzt `cudnn.benchmark` global).
- `pack_dataset_sessions.py`: die Mtime gegen das Spender-Manifest bleibt fuer PIXEL und meldet
  nach einem Umhaengen (v6) `STALE?` falsch. **Zu entscheiden:** Export-Stempel der `log.jsonl` in
  den Pack (wie `ledgers.json`), dann faellt die Mtime.
- Die Zahlen in `docs/training-speed.md` ("fused saved too little"),
  `docs/training-speed.md` und CLAUDE.md (Export 23 -> 7 s) stammen aus Laeufen vor ABBA.

## N1–N3. Die Naht `core-engine` / `tracker-runtime` (2026-09-21, nicht gebaut)

- **N1 — eine nicht ersetzbare Aktion kann still verdraengt werden.** `EngineHost.actions` fasst 32,
  nur `host.tick` leert; ohne Kamera schiebt der ungedrosselte `KnobSlider` z. B.
  `CnnAvailability(false)` hinaus (`cnnRun = true` bei totem CNN). **Fix nicht klein:**
  ersetzbar/nicht ersetzbar im `EngineAction`-Typ, Rueckgabewert fuer `submit`, Uebergabe-Queue im
  `StackSwitch`.
- **N2 — Close-Timeout gibt frei, was ein laufender Thread benutzt.** Nach
  `CLOSE_TIMEOUT_MS = 5000` gibt `TrackerStack.close` Crop-Store und `CropClahe` frei, waehrend
  `cnn.classify` noch laeuft — nativer Use-after-free. **Fix klein:** Freigabe auf den Aufraeum-Task.
- **N3 — `FrameInput.board` liefert nach dem naechsten Frame fremde Pixel** (`scope` wird von
  `endFrame()` genullt). Heute liest nur `TrackerCoordinator` im selben `onFrame`. **Fix klein:**
  den Lazy an seine `seq` binden.

Dazu: die Invariante "genau ein brauchbarer Verdeckungsarm" haengt an `gridArmFor` in `:app`; ein
`== true` statt `!= true` schaltet den Phantom-Veto auf jedem ausgelieferten Modell ab.
