# Entscheidungsvorlage (Stand 2026-09-23)

Jeder Punkt ist gemessen oder am Code belegt — es fehlt nicht die Analyse, sondern eine
Richtungsentscheidung. Erledigtes steht unten auf EINER Zeile, diese Liste ist kein Archiv.

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
| 45–51, A, W, N | siehe unten | | |

## Erledigt — je eine Zeile

Was gebaut, verworfen oder beantwortet ist. Volltext in der Git-Historie dieser Datei.

- alt 3, 8–13, 17–19: gebaut oder gestrichen bis 2026-09-16 (u. a. Kommentar-Ratsche auf 5, Fixture-Baukasten, Modellkarte).
- 15 RNG je Loader-Worker: gebaut 2026-09-16; `--holdout-session` nagelt den Hand-Gate-Holdout fest, `DEFAULT_GATE` = `mnv3s-448-v3` (nicht schlechter, 5x schneller).
- 16 `p5`/`p95` im Aufnahme-Auftrag: gebaut 2026-09-16.
- 20 Acht Leser pruefen `coverage` truthy: gebaut, Commit `5c833c40`.
- 22 Halbe letzte Zeile: gebaut 2026-09-16 — `ioutil` und `lib/atomic.ts` als Treuhand, der Zeilenumbruch entscheidet.
- 23 `UtteranceQueue`: gebaut 2026-09-16, eine Generation je Spruch.
- 24 `StockfishAnalyzer` 50 % fuer "nicht bewertet": gebaut 2026-09-16.
- 25 Leere Coverage im Settle-Median: gebaut, Commit `0929769b` (14 von 804 Plys zeigen jetzt "—").
- 26 `--smooth-iters` dreht die Figur: gebaut 2026-09-16, 0 von 12 Meshes betroffen.
- 27 Postgres: verworfen 2026-09-16 (Nutzer). Geparkt: `compose.yaml`, `db/schema/`, `tests/test_db_contract.py`; `data/pgdata` (47 MB) kann weg, sobald der Nutzer es sagt.
- 28 Messung, dann Absage: gebaut, Commit `5c833c40` — die juengere Zeile gilt auf beiden Seiten.
- 29 `recut_coverage` las das falsche Alpha: gefixt und repariert 2026-09-16 (139 Zeilen); vor dem 16.09. gebaute Datensaetze tragen die alten Zahlen bis zum Neubau.
- 32 Alarmspalte zaehlt Entscheidungen: erledigt, Commit `6c626891` (`scripts/compare_regression.py`).
- 36 Drei Wachen ohne Zeugen: erledigt 2026-09-21 — der Regressionssatz hat mit `-Satz v2` handreiches Material (`docs/regression-reference.md`).
- 37 / 41 `brightness`-Spalte der 80-px-Saetze: repariert 2026-09-22 (`real13-mix-v7-80`, `real13-mix-v6-80-clahe`); 80er-Laeufe sind danach nicht mehr mit dem Archiv vergleichbar.
- 38 Klassengewichte gegen die Verlustmaske: gebaut 2026-09-22 (`tests/test_bug_hunt_20260922f_gewichte.py`); sechs von sieben `scripts/`-Auswertern 2026-09-23 nachgezogen, `mine_hard_coverage.py` bewusst auf `coverage`.
- 39 `cleanCommitsOnly`: befoerdert, Commit `4ffe21f5` (Zahlen in `docs/regression-reference.md`).
- 42 Modell-Handarm: gebaut 2026-09-22 — `modelHandShapeFilter` (alter Schluessel weiter gelesen) plus `modelHandArm`; der Arm traegt auf `-Satz v2` eine Desync-Episode.
- 43 `classify` ohne Zeugen: gebaut 2026-09-22 (`tests/test_bug_hunt_20260922e_scan.py`), wirkt nur auf kuenftige Exporte.
- Sekundenachse in `docs/emission-correlation.md`: neu gemessen 2026-09-22 auf benanntem 30-fps-Satz, Aussage zu `cnnCooldownS` haelt.
- Leser-Ratsche ueber den Syntaxbaum statt `splitlines()`: gebaut 2026-09-17.
- Drei Tests, die ihren Fund nicht mehr fingen; zwei nie gemessene Berichtszahlen (`run_ingest`, `after_dedup`): gebaut 2026-09-17. Neun `xfail(strict)` warten weiter auf ein menschliches Ja zur Verhaltensaenderung.
- Vertauschter Aufbau b8/c8 und f1/g1: 239 Korrekturen 2026-09-17, Wache `lib/setup-swap.ts`. Unbeurteilt bleibt `2026-08-08-11-59-12` g7 (FEN `bB`, Modell 98 % `bP`).
- Held-out-Labelaudit (09-17/18): kein einziger Labelfehler auf den Aufnahmen (733 von 739 gesichtet), 5 908 Komposit-Widersprueche sind 49 Entscheidungen, alle richtig. Zwei Folds sind kein zweiter Zeuge; entschieden wird am Crop. Der einzige Fund waren 1 002 veraltete Labels (`scripts/sync_labels.py`).
- Brett-Vorschau zeigte den Rillen-Sensor statt der Matte: gefixt 2026-09-17.
- v8 aufgeschoben, `2026-09-15-16-54-44` bleibt Holdout (`tests/test_holdout_sessions.py`).
- Ausduennen je Standzeit: verworfen 2026-09-18 — `rot-thin16` bricht auf test-v1 ein (4 980 gegen 193 falsche Zellen), der Val aus einer Aufnahme sah es nicht.
- `test-v1` (`real13-test-v1-128`, 26 124 sichtbare besetzte Zellen): gebaut 2026-09-18 als wiederholbarer Benchmark (`benchmark` in `data/TEST-USED.json`, nicht `frozen`).
- 15 ueberschriebene menschliche Urteile: zurueckgestellt 2026-09-18; Regel: vor jedem Label-Schreiben `corrections.jsonl` UND `reviewed.jsonl` lesen.
- 80 gegen 128 px, gleiches Rezept: 128 gewinnt auf test-v1 um Faktor 11 (58 gegen 647 Fehler), 80 px streut Faktor 4 zwischen Seeds.
- Training auf abgeglichenen Labels: kein messbarer Effekt (2026-09-18).
- `test-v1` ohne Matten-Luecke: `labeling.clean_frames` trennt SAMs Absage vom sauber gemessenen Frame, gebaut 2026-09-18.
- `cnnConfThr`: 0,50–0,85 identisch 396/3/0, ab 0,95 ein Phantom — 0,85 bleibt, nach unten ist Luft (2026-09-18).
- `lib/answer.ts` deckt drei Poller: bewusst so, bis ein vierter die Form wiederholt.
- Zwei Routen-Wachen sind Redundanz: bleiben stehen (verstaendlichere Meldung).
- Mess-Ratsche sah die Pool-Form nicht: eingeloest 2026-09-22/23, Ledger 11 Zeilen / Summe 17; `stored.loadStored` liest mit `jsonlRowsStrict`.
- Drei benannte Web-Blindstellen (`ingest.sizeOf`, `data.frameSize`, `stored`) und `/confirm` las Lesefehler als "keine Datei": gebaut 2026-09-23, belegt ueber Route und Seite (`lib/blindstellen-20260923.test.ts`, `lib/confirm-read-errors.test.ts`).
- Drei Pack-blinde Analyse-Skripte (`gradcam_summary`, `session_colour`, `lr_range_test`): lesen wieder, 2026-09-23 (`tests/test_bug_hunt_20260923_packleser.py`).

## 5. Der Regressionssatz ist blind fuer die haeufigste Fehlerklasse

Inzwischen **siebenmal** gefahren, jedes Mal **385 / 14 / 1 / 167 bei 6 Alarmen**, Ziffer fuer
Ziffer. Er beweist zuverlaessig, dass nichts kaputtgeht — das ist sein Zweck, und er erfuellt ihn.

Aber: vier Stellungs-Luecken wurden gefunden, und **keine einzige** bewegt ihn. Das Gate von 0,5
auf 0,25 bewegt ihn nicht, obwohl es 17 % mehr Zellen maskiert. Die heutige Verify-Leiter-Aenderung
bewegt ihn nicht. Dem Satz fehlt Material, in dem eine Hand ueber einem Feld steht, das gerade die
Evidenz traegt.

**Die Frage:** neue Aufnahmen gezielt dafuer — von Schwarz gespielt, im Dunkeln, mit langsamen
Griffen ueber entscheidende Felder? Deckt sich mit dem, was ohnehin geplant ist.
**Empfehlung: ja, und zwar vor dem naechsten Re-Cut der Coverage.**

## 6. Der `_persistent`-Fix gilt nur fuer kuenftige Exporte — GEMESSEN 2026-09-16

`framescan._persistent` nahm die Vereinigung statt der Schnittmenge; `classify` erklaerte darauf
den Rest des Intervalls zu `stale`/`changed`, und diese Frames fielen aus dem sauberen Vorrat.
Behoben seit 2026-09-14 — aber was auf der Platte liegt, entstand unter der alten Regel.

**Gemessen ohne einen einzigen Re-Export:** `classify` laeuft offline gegen `scan.jsonl`, also
liessen sich beide Regeln ueber alle 18 Aufnahmen gegeneinander rechnen (`/tmp/probe_persistent.py`,
die alte Regel als `all(off[j] ...)` nachgebaut). **5 083 Frames werden anders eingestuft:**

| Richtung (alt → neu) | Frames | Bedeutung |
|---|---:|---|
| `changed` → `clean` | 2 523 | liegt zu Unrecht ausserhalb des Vorrats |
| `clean` → `changed` | 1 451 | liegt zu Unrecht IM Vorrat |
| `changed` → `occluded` | 516 | zu bergen (behaelt seine FEN) |
| `occluded` → `changed` | 346 | zu Unrecht im Vorrat |
| `stale` → `occluded` / `clean` | 202 | zu bergen |
| `stale` → `changed` | 45 | bleibt schmutzig, nur anders benannt |

**Zusammengefasst: ~3 241 Frames zu bergen, ~1 797 zu Unrecht im Vorrat.** Drei Aufnahmen tragen
die Haelfte: `2026-08-24-22-43-46` (3 005), `VID_20260802_222741` (816), `2026-08-08-00-39-57` (440).

**Vorbehalt:** das ist die EINSTUFUNG, nicht der Datensatz. Was davon wirklich ankommt, entscheidet
`select()` mit `per_position` — die Zahlen sind also eine Obergrenze.

**Was ein Re-Export kostet:** er schreibt `log.jsonl` neu, damit verlieren `model-reads` und
`pass.json` ihren Stempel (`chesslab.provenance`) und die Kette geht fuer JEDE der 18 Aufnahmen
wieder auf. Dazu `occluders recut-coverage`, weil die gespeicherte Coverage gegen die neuen Ecken
driftet. **Gehoert damit an den naechsten Neubau, nicht dazwischen.**

## 7. Eine Aufnahme ist unvollstaendig exportiert — nicht zwei, und nicht ungescannt

Nachgesehen 2026-09-16: `2026-08-30-14-33-02` ist erledigt (35 Zeilen, 31 mit `grid_lines`, 12 mit
`hand_squares`) — die Neu-Ausfuhr in der Nacht hat sie geschlossen. Der Eintrag hier war veraltet.

Bleibt `2026-08-15-23-01-43`, und die Diagnose war falsch: der SCAN ist vollstaendig
(3 867 Zeilen), der EXPORT nicht — 16 Log-Zeilen bei 628 Brettern auf der Platte. Nachscannen
hilft also nicht, es braucht eine Neu-Ausfuhr. Sie ist ausserdem eine der staerker betroffenen
Aufnahmen aus Punkt 6 (166 anders eingestufte Frames). **Faellt mit 6 zusammen.**

## 14. `torch_data.py:669` — Spender-Pool ohne `neighbour_p > 0`-Schutz

Jeder Val-Datensatz baut und zieht den Spender-Pool ueber hunderttausende Zeilen und liest ihn nie.
`SquareDataset` daneben guardet.

**Der Haken:** der Guard entfernt einen `random.sample`-Aufruf, **verschiebt also die
Zufallsfolge**. Laeufe davor und danach sind nicht mehr bitgleich vergleichbar.
**Die Frage:** Startzeit sparen und die Vergleichbarkeit mit dem Archiv aufgeben, oder liegen
lassen? **Empfehlung: liegen lassen, bis ohnehin ein Schnitt im Rezept ansteht** — dann mit.

## 21. Fuenf Vertrags-Familien statt 19 Einzelformate

Die Fehlerklasse, die in der Nacht vom 15. auf den 16.09. **zwoelf Mal** auftrat, ist immer
dieselbe: *nicht gemessen* wird als *gemessener Normalwert* gelesen — SAMs Absage als sauberes
Brett, eine fehlende Matte als `coverage 0.0`, ein leeres `settle_dev` als `0` statt `—`.

Die tragende Grenze ist **Platte → Speicher**, nicht Python → TypeScript: die Sprachgrenze
verdoppelt den Fehler, verursacht ihn aber nicht. Beide Seiten lesen JSONL mit `.get(key, default)`
und der Default ist der Normalwert.

Die 19 Formate zerfallen in fuenf Familien: **Messreihen** (`matte.jsonl`, `model-reads.jsonl`,
`interval-check.jsonl`), **Laeufe** (`log.jsonl`, `pass.json`), **Karten** (`config.json`,
`session.yaml`), **Urteile** (`review-notes.jsonl`) und **Packs** (`packed_meta.json`).
Nur die Messreihen tragen die Fehlerklasse — dort ist "fehlt" ein eigener Wert.

**Empfohlene Reihenfolge, eine Naht je Mal:**

1. `matte.jsonl` als `Measurement<Coverage>` mit drei Zustaenden (fehlt / abgesagt / gemessen),
   Leser auf beiden Seiten gegen dasselbe Fixture. **Schritt eins ist gebaut** (Punkt 20).
2. **Gebaut 2026-09-16:** `lib/jsonl.ts` ist der gemeinsame TS-Leser; fuenf Stellen sind
   verhaltensgleich umgestellt (`audit-flags`, `correction-violations`, `frame-hands`,
   `hand-flags`, `model-reads`, `pool`, `position-flags`, `stored`, `unusable-cells`).
   Schnitte stehen noch aus — 2026-09-21 nachgezaehlt **11 in 7 Dateien** (alt: 24 in 11).
3. **Gebaut 2026-09-16:** `platform/app/jsonl-readers.txt` plus `lib/jsonl-ratchet.test.ts`.
   Gegengeprobt — eine neue Ad-hoc-Lesestelle macht die Suite rot.
4. `ModelServingSpec`: was `train` in `config.json` schreibt und was das Serving daraus rechnen
   muss (CLAHE steht drin, wird aber nicht gebacken).
5. Versionierte Vertraege, Familie fuer Familie — zuletzt, weil es ohne 1–3 nichts haelt.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| B je Naht | 1 (fertig), 2 ≈ 3 h, 3 ≈ 1 h, 4–5 offen | 2 und 3 als naechstes, 4–5 erst nach dem Neubau |

## 30. Der Champion halbiert das Verdeckungs-Veto (2026-09-21, gemessen)

Der urspruengliche Eintrag fragte nach `gate:occluded = 0` im Fuzzer. **Das war ein Fehler im
Treiber**, nicht im Produkt: die synthetische Hand lag als starrer Block ab `a1`, waehrend die
Zuege anderswo stattfanden. Seit sie ueber den Zugfeldern wandert und die Bewegung mit dem echten
`RoiMotion` gemessen wird, steht `gate:occluded` bei 115.

Die Kopplung dahinter ist trotzdem real und jetzt beziffert. `FrameLoop` leitet die
Baseline-Verdeckungsschwelle als `motionPxThr * BASELINE_ABS_THR_FACTOR` (4,0) ab. Gemessen mit
`desktop fuzz check` auf denselben Szenen, nur dieser Knopf veraendert:

| `motionPxThr` | Schwelle | `veto:occlusion` | `veto:shadow` |
|---|---:|---:|---:|
| 20,0 (vor dem Champion) | 80 | **593** | 614 |
| 34,544 (Champion) | 138 | **345** | 582 |
| 41,5 (bester Kandidat der Budget-Suche) | 166 | 345 | 539 |

**Das Verdeckungs-Veto feuert unter dem Champion 42 % seltener** — so der Fuzzer. Auf ECHTEM
Material ist es mehr: ueber vier Regressionsaufnahmen faellt `occlVetoed` von 4 547 auf 1 423,
also **68,7 % weniger Frames** (`ff09040a`). Oberhalb von 34,5 kostet es nichts mehr — der Census
saettigt, wer die Reserve zurueckholen will, muss DARUNTER.

Der Regressionssatz zeigt davon nichts (396/3/0, Desync-Episoden 15 -> 8). **Das ist aber kein
Freispruch:** mit BEIDEN engine-eigenen Verdeckungsarmen AUS kommt derselbe Satz Ziffer fuer
Ziffer gleich heraus (`c7f3756b`, `docs/baseline-occlusion-off.md`). Er kann diese Achse also gar
nicht beurteilen. Es ist eine schmaler gewordene Reserve, kein gemessener Schaden — und kein
gemessenes Wohlbefinden.

**Zu entscheiden:** ob das reicht. Solange die Frage offen ist, sollte kein weiterer Kandidat
`motionPxThr` nach oben schieben; der beste der Budget-Suche brachte 21 Frames und wuerde die
Schwelle auf 166 heben.

Das Material dafuer ist `-Satz v2` (875 von 988 Frames verdeckt, seit 2026-09-21 Teil des
Regressionssatzes); der Vergleich `motionPxThr` 20 gegen 34,544 darauf steht aus.

## 31. Das Telefon holt den Champion nicht ab (2026-09-20)

`ConfigCodec.encode` schreibt JEDEN Knopf in die gespeicherte Konfiguration, `decode` legt
jeden gespeicherten Wert ueber die Vorgabe. Ein Geraet mit einmal gespeicherten Einstellungen
behaelt nach dem APK-Update die alten sechs Werte.

Ein `CONFIG_SCHEMA_VERSION`-Sprung erzwingt es, wirft aber jede Handeinstellung weg - und die
Regel dort lautet ausdruecklich "bump when a knob's MEANING changes", was hier nicht zutrifft.
Der Gegenvorschlag ist ein Handgriff am Geraet pro Kandidat. Bewusst offen gelassen.

## 35. Die Kommentar-Ratsche zaehlt Bloecke, nicht ihre Laenge (2026-09-21)

`CommentBudgetTest.commentBlocks` und sein Python-Zwilling `android/scripts/comment_budget.py`
zaehlen, WIE VIELE Laeufe von 5+ Kommentarzeilen eine Datei traegt. Ein bereits gebuchter Block
darf damit von 5 auf 50 Zeilen wachsen, ohne dass sich eine Zahl bewegt — die Ratsche verspricht
"no file gains a long comment block" und kann genau das nicht sehen.

Der Python-Zwilling in `tests/test_comment_budget.py` macht es anders herum: er bucht die LAENGE
des schlimmsten Blocks. Das ist die schaerfere Zahl, und sie ist auch die ehrlichere.

Die Umstellung ist aber keine Zeile, sondern eine Migration: `config/comment-budget.txt` traegt
heute Anzahlen, unter der Laengen-Regel werden daraus groessere Zahlen — und die Ratsche laesst
Eintraege ausdruecklich nur SCHRUMPFEN. Ein Wechsel muss die Datei also einmal neu setzen und
dabei die Regel fuer diesen einen Commit aussetzen. Bewusst nicht nebenbei gemacht;
`CommentBudgetCounterCheckTest.einWachsenderBlockBleibtEineEins` haelt die Blindstelle bis dahin
sichtbar fest, statt sie in Prosa zu verstecken.

## 40. `occluders.json` nennt eine Kachelgroesse, die um Faktor 2 danebenliegt (2026-09-22)

`data/occluders/occluders.json` meldet `tile: [1200, 1006]`; die Dateien daneben sind
2400 x 2012. Gefunden beim Durchkaemmen von `synth/` — dort faellt `composite.plate_long_side`
auf einen TODO-Pfad zurueck, wenn ein Pool kein `source` traegt, und genau dieser Rueckfall
laeuft heute fuer den geparkten 1080-Pool korrekt, weil DESSEN Kacheln wirklich halb so gross
sind.

**Kein Fix, weil die Zahl unter `data/` liegt und heute niemand sie liest** — `composite`
nimmt `source`, und das stimmt. Sie wird erst gefaehrlich, sobald ein Pool ohne `source`
dazukommt: dann entscheidet der Rueckfall anhand einer falschen Zahl ueber den Massstab jedes
hineinkomponierten Verdeckers.

**Zu entscheiden:** die Zahl in der `occluders.json` korrigieren (Nutzer, eine Zeile unter
`data/`), oder `plate_long_side` die Kachel messen lassen statt sie zu glauben.

## Welches Archiv-Flag traegt den Rezept-Abstand? (2026-09-18)

Die Archiv-Seeds (0,9963) und die Kontrolle (0,9874) unterscheiden sich nicht im Code, sondern in
vier Flags: `weight_cap` 3,0 / None, `loss` ce / occlusion, `aug_erase_p` 0,25 / 0,0, `pretrained`
False / True. In Fehlerzahlen (von 9 737 Val-Zellen) liegen zwei der drei Kontrollseeds im
Archivband (12–61), nur s42 konvergiert schlechter (123). `--weight-cap 3` ist der plausibelste
Kandidat (Faktor 15 in der Gewichtsspreizung). **Offen, niedrige Prioritaet:** Ablation mit vier
Armen zu je drei Seeds, oder zuerst zwei Seeds der Repro nachziehen.

## Prior-Kurve gemessen: lambda 8 ist die erste phantomfreie Schwelle (2026-09-18)

`prior_lambda` reitet seit 2026-09-17 im Modell, aber die Werte sind MIGRATIONSwerte (4,0 x T),
keine gemessenen Optima — so steht es in CLAUDE.md. Jetzt gemessen, am ausgelieferten Champ
`p4a-80-clahe` gegen `test-v1` (51 955 Zeilen, nie trainiert: das Modell ist aus der v4-Aera, die
Aufnahmen sind vom September).

| lambda | cell | board | **phantom** | miss | illegal |
|---|---|---|---|---|---|
| 0 | 0,9374 | 0,0395 | 17 | 29 | 3 219 |
| 4 | 0,9777 | 0,4589 | 2 | 35 | 1 112 |
| **5,98** (heute) | 0,9879 | 0,6234 | **1** | 38 | 575 |
| **8** | 0,9933 | 0,7351 | **0** | 33 | 284 |
| 10 | 0,9980 | 0,8918 | 0 | 32 | 43 |
| 12 | 0,9985 | 0,9177 | 0 | 29 | 9 |

**In diesem Bereich gibt es keinen Zielkonflikt.** Ueblicherweise kauft man Phantome mit Misses;
hier sind es bei lambda 8 **33 Misses gegen 29** bei lambda 0, also unveraendert, waehrend die
Phantome von 17 auf 0 fallen. Nach der Regel "Phantome sind das Veto, nimm die schaerfste
phantomfreie Schwelle" ist **8** die Antwort, und der Champ steht mit 5,98 eine Stufe darunter.

**Zwei Vorbehalte, bevor die Zahl ins Modell wandert:**

1. **Die Skalen sind nicht nachgewiesen gleich.** Python legt den Prior auf die Softmax
   (`p * exp(-lambda)`), Kotlin seit `priorOnTempered` auf die ROHEN Logits. Die FORM des Optimums
   traegt, die absolute Zahl gehoert an `scripts/replay-regression.ps1` bestaetigt.
2. **Ein starker Prior verdeckt Modellfehler.** Bei lambda 12 sinkt `illegal` auf 9 — die
   Entscheidung faellt dann fast nur noch ueber die Legalitaet. Was das kostet, wenn die
   Basis-FEN falsch ist, misst dieser Sweep nicht.

## `arena list`/`score` nennen die Referenz-HERKUNFT nicht (2026-09-22)

`truthOf` nimmt die LAENGERE der beiden Quellen, und `arena list` druckt danach nur eine Zahl
("21 plies"). `arena list` sieht 13 Aufnahmen mit `video.mp4` und `candidate.json`; **8 davon tragen keine
`reference.pgn`**, dort ist die Referenz allein die Ausgabe eines frueheren Tracker-Laufs. Zwei
Referenzen sind nachweislich falsch: `VID_20260802_222741` (CANDIDATE-ONLY) endet mit
`Nxf3+@7425`, das im Video nie passiert — dort stehen c6 und Matt bis Qxd7#; und
`VID_20260726_233432` fuehrt Nf3/e5 vor e4, wahre Ordnung 1.e4 e5 2.Nf3 auf den Frames
240/280/360 — die Aufnahme hat zwar eine `reference.pgn`, die den Streit entscheidet, nur sagt
die Ausgabe nicht, dass sie es war. Ein Lauf
gegen diese zwei meldet Phantome, die keine sind, und die Ausgabe sagt nicht, dass die Referenz
selbst strittig ist.

**Kein Fix gebaut.** Welche Referenz vertrauenswuerdig ist, ist ein menschliches Urteil und kein
Messwert; es in den Code zu schreiben hiesse, eine Liste von Hand zu pflegen, die niemand pflegt.
Die BUNDLED-Frames sind getrennt davon behandelt (`Truth.kt`, 54 von 1242 Plies) — das ist eine
Eigenschaft der Datei und messbar, die Ordnung ist es nicht.
**Zu entscheiden:** ein Feld `reference: pgn|candidate` in die Ausgabe von `list` und `score`,
oder eine `reference.md` je Aufnahme, die den Streit benennt und die `arena` mitdruckt.

## `writeAtomic` ist unter Windows nicht nebenlaeufig (gemessen 2026-09-22)

Mit eigener Nebendatei je Schreibvorgang (Parity zu `chesslab.ioutil._side_file` und
`lib/atomic.ts::tmpFor`) reisst das Ziel nicht mehr. Was bleibt, ist die Plattform: vier Straenge
auf EINER Zieldatei liefern reihenweise `AccessDeniedException` beim `Files.move`, weil Windows
das Ersetzen einer Datei verweigert, die ein anderer Strang gerade ersetzt. Auf dem Telefon
(ext4, `rename(2)`) tritt das nicht auf, und dort laeuft nur EIN Prozess — gemeldet wird es
trotzdem, weil `:arena` und `:desktop` dieselbe Funktion unter Windows benutzen.

**Kein Fix gebaut.** Eine Sperre je Zieldatei waere die Antwort, aber sie gehoert dann in alle drei
Sprachen und nicht nur hier. **Zu entscheiden:** Sperre je Pfad in `io/Jsonl.kt`, oder die Regel
festschreiben, dass ein Pfad genau einen Schreiber hat.

## `per_position` fehlt in drei fertigen Datensaetzen (2026-09-22)

`build_dataset` schreibt `per_position` seit heute in den `dedup`-Block von `dataset.yaml`, und
`--like` erbt es. Die drei Saetze, die VOR dieser Aenderung ausgeduennt wurden, tragen die Zahl
nicht — gemessen am eigenen `counts`-Block:

| Datensatz | raw | after_dedup | Faktor | `dedup` sagt |
|---|---|---|---|---|
| `real13-v7-thin16` | 979 363 | 634 594 | 1,543 | `per_cell_cap: 0, phash_enabled: false` |
| `real13-v7-thin16-core` | 979 361 | 634 595 | 1,543 | dito |
| `real13-v7-thin16-rand` | 979 361 | 634 595 | 1,543 | dito |

Ein `--like real13-v7-thin16` baut daraus weiterhin den VOLLEN Korpus: 1,54x der Zeilen unter
einem Namen, der den Zwilling verspricht. Der Faktor passt auf `--per-position 16`, aber das ist
eine Rekonstruktion aus dem Verhaeltnis, keine Aufzeichnung — und das Nachtragen schreibt in
`data/`, also nicht ohne Anweisung.

**Empfehlung in einem Satz:** `per_position: 16` in die drei `dataset.yaml` nachtragen, damit
`--like` auf ihnen wieder ein Zwilling ist — oder, wenn die Zahl nicht sicher ist, `--like` auf
einem Spender ohne `per_position`-Schluessel verweigern, wie es der `blind`-Riegel fuer `dedup`
und `split` schon tut.

## Die Ratsche `tests/json_doors.txt` sieht den Anhaenge-Modus nicht (2026-09-22)

`doors_in` sucht `.write_text(`, `.open("w"` und `open(..., "w"` — `"a"` steht nicht in
`_WRITE`. Vier rohe Anhaenge an eine `.jsonl` sind ihr deshalb nie aufgefallen. Einer davon
(`sessions._record_archive_reason`) ist heute auf `ioutil.append_rows` umgestellt; die drei
anderen liegen in fremden Dateien und bleiben offen:

- `src/chesslab/session_writer.py:164` (`log.jsonl` des Recorders)
- `src/chesslab/training/train.py:1397` (`metrics.jsonl` eines Laufs)
- `scripts/fix_ply_offset.py:118`

Das Muster ist genau das, wogegen die Web-App `appendRows` und `platform/app/write-doors.txt`
bekommen hat: an eine halbe LETZTE Zeile geklebt wird aus dem tolerierten Schwanz Beschaedigung
MITTENDRIN, auf die danach jedes Lesen wirft.

**Empfehlung in einem Satz:** `_WRITE` um den Anhaenge-Modus erweitern und die drei Stellen
gleichzeitig auf `append_rows` umstellen, damit die Ratsche beim Sehendwerden nicht waechst.

### Nachtrag: auch der MEHRZEILIGE Aufruf faellt durch

Die Stelle oben zaehlt vier rohe Anhaenge. Es waren fuenf: `matte.alpha_worker` oeffnet
`matte.jsonl` als `path.open(\n "a",\n encoding="utf-8",\n)` — ueber vier Zeilen. `doors_in`
prueft `_WRITE` je ZEILE, ein um `"a"` erweitertes Muster haette diese Stelle also weiter nicht
gesehen. Sie ist seit 2026-09-22 auf `ioutil.append_rows(path, [])` vor dem Anhaengen
umgestellt (der Worker STREAMT danach weiter, ein Frame je `flush` bleibt die
Haltbarkeitseinheit), der Befund an der Ratsche bleibt.

Warum das gerade hier zaehlt: der Worker laeuft Minuten bis Stunden und verlaesst den Prozess
mit `os._exit` (`matte.exit_with_parent`, und der CLI-Zweig am Ende) — ungeleerte Puffer sind
der NORMALFALL, nicht der Stoerfall. Auf der Platte liegen heute vier abgerissene `.jsonl`
(von 1 536), alle vier genau auf einer Puffergrenze (8 192 / 24 576 / 114 688 / 237 568 Bytes).

**Empfehlung in einem Satz:** `_WRITE` nicht nur um `"a"` erweitern, sondern wie bei den
anderen Ratschen ueber den SYNTAXBAUM statt je Zeile pruefen — mit eingepflanzter Gegenprobe
fuer beide Formen.

## `split-f*.json` nach `drop_dead_rows`: nachziehbar ist nur, was das Manifest deckt

`drop_dead_rows.py` schrieb das Manifest neu und liess `split*.json` stehen. Gemessen am
geparkten Manifest vom 2026-09-17 traegt `real13-mix-v7-128` seitdem `counts.test` 188 102
gegen 188 101 tatsaechliche Zeilen; eine der beiden toten Zeilen lag im test-, eine im
train-Split. Seit 2026-09-22 rechnet das Skript jede Split-Datei mit
`dataset.make_split(..., precomputed_splits=...)` neu — dieser Weg reproduziert die Datei
bitgleich, wenn nichts fehlt, also aendert er nur, was sich wirklich geaendert hat.

Offen bleiben die FOLD-Dateien. `split-f0.json` deckt nicht jede Sitzung des Manifests, und
`make_split` stirbt darauf mit `KeyError` auf `split_of[session_id]` — ihren Zuschnitt neu zu
raten hiesse, ihn zu erfinden. Das Skript benennt sie jetzt und endet mit 1, statt sie stumm
stehen zu lassen. Auf der Platte betrifft das heute die sechs Split-Dateien von
`real13-mix-v7-128`, davon vier Folds.

Relevanz: 12 der 52 Datensaetze mit Manifest tragen heute tote `mm://`-Zeilen, vier davon
mit `split*.json` (`sp-parity-packs` 4 814 von 50 310; `turntable-13bn-80-hn1`,
`turntable-13bn-80-v2` und `turntable-13bn-v1` zu 100 %). Bei den drei turntable-Saetzen
bliebe nach einem Lauf ein LEERES Manifest neben einem Split, der volle val- und
test-Zahlen behauptet.

**Empfehlung in einem Satz:** entweder `make_split` eine Sitzung ausserhalb aller Splits
verkraften lassen (dann rechnen sich auch die Folds nach), oder die Fold-Dateien beim naechsten
ohnehin faelligen Re-Build neu erzeugen statt nachzuziehen.

## `learning_curve.py` schreibt `split-lc<k>.json` mit den Zahlen des VOLLEN Korpus

Nachgemessen 2026-09-22 an `real13-straight-80-v3-c8d1`: alle vier Dateien (`lc4`, `lc8`,
`lc12`, `lc17`) tragen dieselben `counts` (train 183 657) und dieselben `train_class_counts`
und `class_weights` wie `split.json` — obwohl `lc4` nur 4 der 17 Trainings-Aufnahmen fuehrt.
Fuer den Vorgabe-Kopf (`--head occlusion`) ist das folgenlos, weil `train.py` die Gewichte aus
den sichtbaren Zeilen neu rechnet; der Kommentar im Skript sagt das auch. Ohne diesen Kopf
trainiert ein k=4-Lauf mit den Gewichten von 17 Aufnahmen, und `validate_split` urteilt
ueber `counts`, die nie zu diesem Split gehoerten.

Nicht gebaut, weil ein Nachrechnen der Gewichte das REZEPT der vier Lernkurven-Punkte aendert
und sie mit den schon gefahrenen Laeufen unvergleichbar macht.

**Empfehlung in einem Satz:** `counts` und `train_class_counts` beim Schreiben nachrechnen,
`class_weights` unangetastet lassen und den Grund in die Datei stempeln — dann stimmt der
Nenner, ohne dass das Rezept wandert.

## `occluder_footprint_image` misst den Arm-Radius NUR entlang Welt-+X

Gemessen 2026-09-22 unter `tests/bpy_stub` (Kamera 28 mm, `--res 1024`, Faust auf d4): die
Funktion projiziert den Arm als KREIS, dessen Radius sie aus einem einzigen Versatz entlang
Welt-+X gewinnt (`_px(ax + r_world, ay, ARM_Z)`). Im Bild ist der Arm aber eine ELLIPSE, sobald
die Kamera kippt, und die zweite Achse misst niemand. Senkrecht sind beide Achsen gleich
(115,9 px), bei 30 Grad Kippung ist die y-Achse 19 % laenger (81,1 gegen 96,7 px), bei 45 Grad
57 %. Je nach Azimut der Kippung ist der eine Kreis also zu klein (Felder, die der Arm wirklich
deckt, behalten ihr Figuren-Label) oder zu gross (sichtbare Felder werden `occluded`).

Relevanz heute: klein. Im Vorgabeband (`--max-obliqueness 0.20`, also bis ~11 Grad) betraegt der
Fehler ~2 % des Radius und liegt damit unter der Quantisierung des 5x5-Abtastgitters (0,04 je
Feld). Erst `--max-obliqueness 0.45` (~24 Grad, ~9 %) bringt ihn ueber diese Schwelle.

Nicht gebaut, weil jede Korrektur eine LABEL-Entscheidung ist: die groessere Achse zu nehmen
schiebt Felder Richtung `occluded`, die kleinere Richtung Figur, und die Politik dazu
(„Praezision vor Recall") gehoert dem Nutzer, nicht dem Fix.

**Empfehlung in einem Satz:** beide Achsen messen und die Differenz in das AMBIGUOUS-Band
schieben, statt eine der beiden zum Kreis zu erklaeren — dann kostet der Fehler Frames statt
falscher Labels.

## `commit_truth.py` bewertet 7 von 11 Logs gegen `candidate.json`, nicht gegen ein PGN

Nachgezaehlt 2026-09-22 ueber `tmp/calib/*.log`: 4 Aufnahmen tragen eine `reference.pgn`
(`2026-08-08-00-39-57`, `VID_20260726_233432`, `VID_20260824_153751`, `VID_20260824_154327`),
die uebrigen 7 fallen auf `candidate.json` zurueck. Das ist die Zugliste EINES frueheren
Trackerlaufs (`source.cnn_run` steht darin), also kein unabhaengiger Zeuge — die Quote
"erfunden" misst dort den Abstand zweier Maschinenlaeufe, nicht den zur Wirklichkeit.

Gebaut wurde nur die Trennung: jede Zeile in `tmp/calib/commits.jsonl` traegt seit heute
`ref_kind`, und der Lauf druckt die Aufteilung. Ob die 7 Aufnahmen ueberhaupt in die
Kalibrierungszahl gehoeren, ist damit sichtbar, aber nicht entschieden.

**Empfehlung in einem Satz:** die Kalibrierung getrennt je `ref_kind` ausweisen und erst dann
entscheiden, ob die Kandidaten-Aufnahmen ein PGN bekommen oder aus der Zahl fallen.

## `prune_dead_rows` benutzte eine zweite Schwelle fuer dieselbe Entscheidung

Gemessen 2026-09-22 ueber alle 27 `data/recordings/*/matte.jsonl`: 37 wirksame SAM-Zeilen liegen
im Band `0 < max(coverage) <= 0,15`, also unter derselben `MATTE_DIRTY`, die `upsert_proposals`
"SAM hat nichts gefunden" nennt. 8 davon tragen eine Upsert-Zeile, in 4 Aufnahmeverzeichnissen
(`2026-08-13-19-34-23`, `2026-08-16-20-19-54`, `VID_20260824_153751`, `VID_20260824_154327`).
`prune_dead_rows` fragte dort `any(coverage.values())`, also ab 0,0001, und loeschte die
staerkere Upsert-Matte zugunsten der schwachen SAM-Messung: bei diesen 8 Frames kippen 27 Zellen
von `> 0,15` auf `<= 0,15` und geraten damit wieder in den Klassifikationsverlust.

Gebaut ist die Angleichung an `MATTE_DIRTY` (`tests/test_bug_hunt_20260922b_matten.py`). Sie
aendert kuenftige Laeufe: diese 8 Frames behalten ihre Upsert-Matte, wo der naechste
`temporal-pass` sie heute verworfen haette.

**Empfehlung in einem Satz:** die eine Schwelle behalten und nach dem naechsten `temporal-pass`
die 27 Zellen stichprobenhaft ansehen — steht dort wirklich eine Hand, war die alte Regel ein
stiller Labelverlust.

## Skript-Jagd 2026-09-22c: zwei Reste (einer davon inzwischen gemessen)

- **`straighten_ab`, Arm „mesh (eigener)“:** Frames ohne eigenes Mesh bekommen `own=None`, und
  `bow_of` misst dann das ROHE Brett — unter dem Namen des Mesh-Arms. Genau die Frames ohne Mesh
  sind laut Kopfkommentar ausnahmslos Handframes (1 116 von 7 344), und `sample_rows` zieht die
  Haelfte der Stichprobe aus ihnen. Die Hand-Spalte dieses Arms ist also teilweise die Roh-Spalte.
  Seit heute steht wenigstens der Nenner je Zelle in der Tabelle; die Trennung „nicht messbar“
  gegen „gemessen“ fehlt noch. Entscheidung: eigener Sentinel statt `None`, oder Arm weglassen?
- **`show_errors` las `float(r.get("coverage") or 0.0)`** — `None` heisst ungemessen, nicht
  sichtbar (Gedaechtnis: „Vor der Analyse die Fallen lesen“). Die erste Stichprobe (zwei grosse
  v6-Manifeste, 0 Zeilen ohne Coverage) legte „kein Fall“ nahe; der vollstaendige Durchlauf ueber
  `data/datasets/*/manifest.jsonl` fand ELF Datensaetze zu 100 % ohne Coverage, allein die fuenf
  groessten 380 214 Zeilen. Gezaehlt und benannt wird seitdem (`collect_wrong`, `cov_str`); ob
  ungemessene Zellen ueberhaupt auf den Bogen gehoeren, ist die offene Entscheidung.

## `conf_wrong`/`conf_right` bleiben bei 0,0, obwohl der Nenner leer sein kann

Gefunden 2026-09-22 in `training/engine.evaluate_dataset`: ohne eine einzige benotbare Zelle
meldeten `square_acc`, `macro_recall`, `conf_wrong`, `conf_right` und `_hit_rate` alle `0.0` —
die SCHLECHTESTE Note statt der fehlenden. Gedreht sind `square_acc`, `macro_recall` und
`_hit_rate` (`occ_recall`), weil ihre Geschwister `per_session_metrics`, `coverage_metrics`
dieselbe Groesse laengst als `None` melden und `evaluate._fmt` den Strich schon druckt.

Nicht gedreht sind `conf_wrong`/`conf_right`: `tests/test_training_bug_hunt.py` haelt dort
`conf_wrong == 0.0` als Teil eines anderen Befunds fest (verdeckter Fehler zaehlt nicht mit).
Das ist kein Widerspruch zur Konvention, sondern eine zweite Zusage an derselben Zahl.

Ebenfalls nicht gedreht bleiben `board_acc`, `visible_board_acc`, `board_acc_tol1` — sie laufen
ueber `data.board_accuracy`, und `fafc4f7d` hat genau das begruendet zurueckgestellt.

**Empfehlung in einem Satz:** die beiden Konfidenzen mit derselben Aenderung drehen, die den
fremden Test auf seine eigentliche Zusage umschreibt — oder ausdruecklich als Zahl stehen lassen.

## Skript-Durchsicht 2026-09-22d: was gefixt ist und was entschieden gehoert

Sieben Fixes in `scripts/` (Tests: `tests/test_bug_hunt_20260922d_skripte.py`). Offen bleiben
zwei Punkte, die eine Entscheidung und keine Korrektur sind:

- **`mine_hard_empty --dataset` scannte null Zeilen.** Ein unbedingtes `mm://`-Verwerfen warf auf
  `real13-mix-v6-128` 841 270 von 841 270 Zeilen weg, obwohl `--dataset` genau fuer diese Pfade
  einen Memmap-Leser mitbringt; die Ausgabe blieb eine vollstaendig aussehende Prozenttabelle bei
  Exit 0. Jetzt faellt nur, was niemand lesen kann, und es wird gezaehlt. **Offen:** die gemeldeten
  Zahlen aus jedem Lauf VOR heute auf einem Session-Pack-Datensatz sind 0/0 — wer sie irgendwo
  zitiert hat, misst neu.
- **`adabn_recalibrate` lehnt CLAHE-Laeufe jetzt ab.** `to_batch` normalisiert von Hand und ruft
  die Operator-Kette nie auf, also haette der Durchgang rohe Pixel gemessen. Betroffen waeren die
  beiden BatchNorm-Laeufe `mnv3s128-bn-all` und `mnv3s128-bn-all-p60` (`clahe_clip: 2.0`).
  **Offen:** ablehnen ist die sichere Antwort — CLAHE im Kalibrierpfad nachzuziehen waere die
  vollstaendige.

(Der dritte, `pack_dataset_sessions`, steht unter 50.)

## `scripts/benchmark_export_warp.py`: die Zahl 23 -> 7 s ist gegen einen warmen Cache gemessen

Der Vergleich faehrt IMMER `uncached` zuerst und `cached` danach, je einmal, auf derselben
Videodatei. Der zweite Lauf trifft also einen warmen Seitencache fuer Video und Bretter — genau
das Muster aus CLAUDE.md ("ein warmer Cache sieht aus wie ein sauberes Ergebnis"). Die in
`docs/export-decode.md` zitierte Beschleunigung der Mesh-Koordinatenkarte ist damit
eine OBERE Schranke, kein gemessener Effekt. Wer sie verteidigen will, faehrt die Reihenfolge
getauscht und zweimal warm, wie `docs/compiled-batch-aug.md` es fuer die Trainingszeiten verlangt.
Zweiter Punkt derselben Datei: `results["byte_identical"] = True` ist eine feste Zusage; bei null
gefundenen Brettern vergleicht die Schleife zwei leere Hash-Mengen und sagt trotzdem "identisch"
(`"boards": 0` steht daneben, wird aber von niemandem gelesen).

## Das Partie-Journal: die groessere Loesung, bewusst nicht gebaut (2026-09-22)

`GameStore.save` schreibt drei fuer sich atomare Artefakte (`<id>.json`, `<id>.pgn`,
`index.json`). Die Partie als Ganzes ist damit keine Transaktion: bricht das PGN oder der Index
weg, liegt eine halb geschriebene Partie auf der Platte. Gebaut ist heute nur das Kleine —
`GameSessionController.endAndSave` gibt `live` erst auf, NACHDEM `store.save` durch ist
(`SaveBeforeDropTest`), und `GameStore.rows` vereinigt den Index mit jedem `<id>.json`, das er
nicht nennt, so dass ein lesbarer, aber alter Index keine geschriebene Partie mehr verbirgt
(`CorruptGameIsNotMissingTest`). Die `<id>.json` ist damit der eine Nachweis, und `open` wirft
`GameUnreadable`, statt eine beschaedigte Partie wie eine nie gespielte als `null` zu melden.

Was das NICHT loest: ein `<id>.pgn`, das fehlt oder aelter ist als die `<id>.json`, faellt
niemandem auf — `pgn(id)` liefert die alte Datei, und `buildPgn` wird nur beim Export gerufen.
Ein Journal je Commit (Absicht schreiben, Artefakte schreiben, Absicht loeschen; beim Start
unvollendete Absichten aus der `<id>.json` nachziehen) waere die Antwort darauf und wuerde
zugleich das PGN und den Index wieder ableitbar machen. Offen, weil es einen Startpfad braucht,
den heute niemand hat, und weil der Verlust, den es abdeckt, nach dem Kleinen nur noch das
abgeleitete Artefakt trifft, nicht mehr die Partie.

## 44. `pose_of` meldet `foreshorten: 0.0`, wo nichts gemessen wurde (2026-09-22)

Gefunden bei der Mutationsprobe ueber `src/chesslab/`. `capture_plan.pose_of` rechnet die hintere
Kante durch die vordere:

```python
return Pose(foreshorten=round(edges[0] / front, 4) if front else 0.0, ...)
```

Ist die Vorderkante entartet (`front == 0`), steht in der Spalte eine **0,0** — und 0,0 heisst dort
"maximal verkuerzt", also eine Messung, die nie stattgefunden hat. Nach der Projektregel gehoerte
dort `None` hin, wie bei `coverage`, `settle_dev` und den Metriken mit leerem Nenner.

**Nicht gebaut**, weil es das SCHEMA der `pose`-Spalte aendert: `foreshorten` ist heute
`float`, und jeder Leser muesste `None` vertragen. Das ist eine Umstellung mit Radius, kein
Einzeiler.

**Heute ohne Fall** — eine entartete Vorderkante entsteht nur aus einem Quad, dessen `a1` und `h1`
zusammenfallen, und den weist die Geometrie vorher ab. Der Waechter selbst erzeugt hier also die
Luege, nicht die Daten.

**Empfehlung in einem Satz:** beim naechsten ohnehin faelligen Anfassen der `pose`-Spalte auf
`float | None` heben und die Leser mitziehen; ein eigener Gang lohnt fuer einen Fall, den es
heute nicht gibt, nicht.

## 45. Neun `candidate.json` tragen Vorgaben als gemessene Aufnahme-Konfiguration (2026-09-23)

Befund aus der Codex-Bugjagd ueber `:desktop`, an der Platte bestaetigt.

`ConfigCodec.decode` liefert bei einer fremden Schema-Version bewusst die VORGABEN plus eine
`note`. Der normale Replay-Pfad `loadRecordedConfig` lehnt diese `note` richtig ab.
`PhoneCandidate.settingsJson` druckt die Warnung dagegen nur und schreibt danach `decoded.config`
als vollstaendigen `effective_config`-Block — "nicht dekodierbar" wird so zu "gemessene
Standardkonfiguration", ohne jeden Unsicherheitsvermerk.

**Nachgesehen an `2026-08-24-22-43-46`:** die Aufnahme hat unter Schema 4
`boardSize = 992` und `pOccludedThr = 0,15` gespeichert (`files/sessions/…/settings.json`),
ihr `candidate.json` behauptet **1600 und 0,5** — die heutigen Vorgaben. Laut Codex betrifft
das neun Candidates aus Schema 4 und 5 (von 16 gefundenen `settings.json`: 8x v4, 5x v5, 3x v6).

**Der Code wird repariert**: `settingsJson` soll bei fremdem Schema ablehnen oder die Herkunft
ausdruecklich als unbekannt kennzeichnen, statt Vorgaben einzusetzen.

**Die neun Dateien liegen unter `data/` und werden NICHT angefasst.** Heute liest keine
Referenzmessung diesen Block automatisch (396/3/0 ist davon nicht betroffen), er wird aber
gefaehrlich, sobald jemand eine Aufnahme anhand ihres `effective_config` nachstellt.

**Empfehlung in einem Satz:** nach dem Code-Fix die neun Candidates mit `phone-candidate` neu
erzeugen lassen, oder ihren `effective_config`-Block als unbekannt markieren — beides schreibt
unter `data/` und braucht dein Ja.

### Nachtrag (2026-09-23): Code repariert

**45 (Code):** `PhoneCandidate.settingsJson` schreibt bei fremdem oder unlesbarem Schema jetzt
`"effective_config": {"unknown": "<Notiz des Codecs>"}` statt der Vorgaben — kein einziger Knopf,
der wie eine Messung aussieht (`PhoneCandidateTest`, fremdes Schema + Gegenprobe eigenes Schema).
**Offen:** die neun Dateien unter `data/` tragen weiter die Vorgaben. Ein `phone-candidate force=1`
je Aufnahme wuerde sie neu schreiben — das ist eine Entscheidung ueber `data/`, nicht Teil des Fixes.

**`multireplay` (B1):** repariert, Nachweis und was jetzt gilt in `docs/multireplay-2026-09-20.md`.
**Offen:** die 1,8x und die Zeitentabelle dort sind weiter ungemessen; der Messlauf steht aus.

**B3 ("kein Brett" im `score`-Modus) ist widerlegt:** `score` nimmt die Ecken aus dem Candidate
(`ReplayPlan.quad()` -> `quadFromCandidate`), und das wirft bei fehlender `geometry`. Der Zweig
`no board found` ist im `score`-Modus unerreichbar. Mit Exit 0 enden kann er nur ohne `score`
(schlichter `replay`, `frames`) — dort gibt es keinen Ergebnisblock, den jemand erwarten koennte.

## `writeCandidate` (Kotlin) ersetzt `candidate.json` ohne Wache (2026-09-23)

Die Web-Seite liest `candidate.json` und `reference.pgn` seit 2026-09-23 ueber `absentOnly`, und
`runLabel` prueft vorher `exists(candidate)`. **Offen:** der Kotlin-Schreiber `writeCandidate`
(`RealGameCandidate.kt`) loescht und ersetzt ohne eigene Pruefung; zwischen dem `stat` der Web-App
und dem Schreiben des `label`-Verbs liegt ein ganzer Replay. Eine Wache gehoert dorthin (Verweigern,
wenn `reviewed_plies` oder `confirmed` drinstehen), nicht in `platform/app` —
`writeFileAtomicGuarded` greift nicht, weil die Web-App die Datei gar nicht schreibt.

## `lr_range_test.py` spiegelt nur die Vorgaben von `train` (2026-09-23)

Seit dem Pack-Leser misst das Skript per Vorgabe `--head occlusion` (`OcclusionLoss`, Gewichte aus
`visible_class_counts`), das alte Rezept liegt unter `--head combined`; fruehere Baender (auch
"~1e-07 bei vier von sieben") sind auf CE ohne Maske gemessen und nicht vergleichbar.
**Offen:** `--weight-cap`, `--coverage-weight`, `--visible-max`, `--dark-min`, `--label-smoothing`
reicht das Skript nicht durch.

## 46. Ein Gate fuer drei Stockfish-Besitzer? — Live ja, Review bewusst nicht (2026-09-23)

Astra-Befund H3: "analysis is what gets sacrificed, every time" (`AnalysisGate.gateBlock`) galt nur
fuer `AnalysisHost`. **Tipp-Pfad: gebaut.** `MateLineResolver` oeffnete fuer die Mattlinie einen
zweiten Prozess, den das Gate nie erreichte; der Controller verwarf das Ergebnis nur. Jetzt bricht
`gatedLineResolver` die Rechnung ab, sobald `analysis.block` zuschlaegt, und die Suche selbst ist
abbrechbar (`analyse(..., cancelled)`) — vorher lief sie bis `capMs` + 5 s Nachfrist weiter
(`HintLineGateTest`).

**Review: nicht unter das Gate gestellt, nur die Prosa eingeschraenkt.** `docs/game-review.md`
erlaubt ausdruecklich, dass eine Auswertung laeuft, waehrend der Tracker die Kamera hat; sie ist
vom Nutzer gestartet, im App-Bar-Banner sichtbar und dort stoppbar. Ein gemeinsamer Arbiter/Lease
haette dieses dokumentierte Verhalten geaendert — das ist eine Produktentscheidung, keine
Reparatur. **Offen:** soll ein laufendes Review pausieren, wenn der Tracker unter 15 fps faellt
oder das Geraet drosselt? Wenn ja, ist der naechste Schritt ein Lease, das `ReviewHost` und
`AnalysisHost` teilen, und `gateBlock` bekommt einen zweiten Aufrufer.

## Die Rezeptzahlen "11,4 ms fest / 3,9 ms kompiliert" reproduzieren sich nicht (2026-09-23)

`CLAUDE.md` ("Der Trainingsschritt ist startgebunden") nennt eager **11,4 ms fest + 33,5 µs je Crop**,
kompiliert **3,9 ms fest**. `docs/training-stack-spike.md` nennt 11,9 / 33,5 und kompiliert 5,3.
Die Rohdaten daneben (`tmp/compile-spike/kernels-new.json`, `kernels-new-compiled.json`) ergeben
per kleinster Quadrate **11,90 ms + 34,67 µs** und kompiliert **4,61 ms + 31,9 µs** — keine der
beiden zitierten Fassungen. "59 %" haelt nur als 11,90 / 20,07 (gemessen bei 256); mit 11,4 waeren
es 56,8 %, gegen die Geradenvorhersage 57,3 %. Die Richtung (startgebunden) steht, die Ziffern nicht.
Jeder Punkt ist EIN Lauf zu 8 Schritten in fester Reihenfolge; dass das nicht reicht, zeigt der
Nachbar `profile_training_gpu.py --compile-test`: in `rep2.json` misst `eager_repeat` 24,95 ms
gegen `eager` 15,51 ms im SELBEN Prozess (+61 %).
`profile_training_kernels.py` schreibt die Gerade jetzt selbst (`fit`) und wiederholt das erste
Glied am Ende (`SIZES`, `VARIANTS`). **Offen:** CLAUDE.md auf die Zahlen eines Laufs mit Wiederholung
umstellen — erst nach einer Messung auf ruhigem Rechner, nicht aus diesem Eintrag.

## 47. `appendRows` liest den Schwanz mit `.catch(() => "")` — Absicht oder Luecke? (2026-09-23)

Die Mutationsprobe ueber `platform/app/lib/` drehte die Stelle auf `absentOnly` um: kein Test
faellt (ein Treffer in `spawn-quoting-2026-09-21.test.ts` war Last-Flackern, einzeln dreimal
gruen). Heute gilt jeder Lesefehler als "leere Datei": bei EMFILE entfaellt die Schwanzreparatur,
und gelingt das `appendFile` danach doch, klebt die neue Zeile an einen halben Schwanz —
Beschaedigung MITTENDRIN. `measurement-doors.txt` fuehrt die Stelle als Absicht ("leer IST dort ein
gueltiger Vorzustand"), das trifft aber nur ENOENT. **Zu entscheiden:** auf `absentOnly` umstellen
(ein EMFILE laesst das Anhaengen scheitern statt es zu riskieren) oder die Begruendung im Ratschen-
Eintrag auf "jeder Fehler" erweitern. Derselbe Fehler beim Widerruf (`dropReviewNotes`) ist seit
heute behoben: ein EACCES meldete dort "0 entfernt", jetzt wirft er.

## 48. Vierzehn Session-Packs trainieren auf Zellen, die der Nutzer gesperrt hat (2026-09-23)

Nachgemessen ueber alle 10 `unusable-cells.jsonl` (juengste Zeile je Zelle, `unusable: false`
nimmt zurueck; 40 aktive Sperren) gegen alle 323 `data/packs/*/manifest.jsonl`: **13 gesperrte
Zellen stehen in 14 Packs, 21 Zeilen** (80/128-Doppel), darunter `rg-2026-09-06-20-57-45`
005223/e8 als `bK`. `corrections.jsonl` (16 810 Urteile): **0** Pack-Zeilen mit einem Label, das
ein Mensch spaeter anders entschieden hat. Betroffen:

| Pack | Zellen |
|---|---|
| `rg-2026-08-08-11-55-19-80` | 001095/f1 |
| `rg-2026-08-16-20-41-33-80`, `-128` | 010011/e7, 010026/e7 |
| `rg-2026-08-24-22-43-46-80`, `-128` | 005550/d8 |
| `rg-2026-09-06-20-57-45-80`, `-128` | 005223/c8, d8, e8 |
| `rg-2026-09-06-21-29-35-80`, `-128` | 002730/h1 |
| `rg-2026-09-15-16-54-44-128` | 002271/a1, 005331/f2 |
| `rg-VID_20260727_233929-80`, `-128` | 000504/f8 |
| `rg-VID_20260802_222203-80` | 000426/g1 |
| `rg-VID_20260802_222741-128` | 004164/e6 |

Neu erzeugen je Pack: `chesslab session pack --session <sid> --size <80|128> --replace`.

**Seit heute lehnt `build_dataset(from_packs=True)` jeden dieser Packs ab** (`dataset_build._stale_packs`,
`tests/test_bug_hunt_20260923_packstand.py`); am Korpus lesend geprueft, sie trifft genau diese 14.
Ein neuer Pack stempelt seine Ledger in `ledgers.json`, ein alter ohne Stempel wird INHALTLICH
geprueft. `allow_stale_packs=True` gibt es nur am Python-Aufruf — `cli.py` war gesperrt, ein
`--allow-stale-packs`-Schalter fehlt dort noch.

**Nicht abgedeckt:** die fertigen Datensaetze kopieren die Zeilen bereits (u. a. `real13-mix-v6-*`,
`real13-mix-v7-*`, `real13-v7-thin16*`, `real13-test-v1-128`), und `train` filtert nicht nach
`unusable-cells.jsonl`. Ebenfalls offen: 5 843 Korrekturen, deren Zelle in keinem Pack steht —
ueberwiegend wohl Frames, die der Log verwirft, nicht ausgewertet.

**Empfehlung:** die 14 Packs mit `--replace` neu schneiden und die zitierenden Datensaetze erst
beim naechsten ohnehin faelligen Bau nachziehen, statt sie jetzt umzubauen.

**Nachtrag (2026-09-23): `train` und `eval` melden fertige Datensaetze.** Beim Start zaehlt
`dataset_build.check_verdicts` je Split die Zeilen, die heute einem Menschenurteil widersprechen
(gesperrt oder umgelabelt), druckt Beispielzellen und schreibt das Ergebnis als
`verdict_conflicts` in die `config.json` des Laufs bzw. in `eval_<split>.json`. Gefiltert wird
NICHT (Rezept, Archiv-Vergleich); `--strict-verdicts` bricht stattdessen ab. Die Pruefung liest je
Session die zwei Ledger und keinen Crop: 0,3–0,8 s auf `real13-mix-v7-128` (979 361 Zeilen; das
Manifest selbst zu laden kostet 11 s). Composites (`comp-*`, 138 Sessions) haben keine Ledger und
zaehlen als `sessions_without_ledger`. Gemessen lesend, Zeilen gesperrt/umgelabelt je Split:

| Datensatz (Split-Datei) | train | val | test |
|---|---|---|---|
| `real13-mix-v7-128` (`split.json`, `-pin`) | 8/0 | – | – |
| `real13-mix-v7-128` (Folds f0–f3) | 4–6/0 | 0–3/0 | 0–4/0 |
| `real13-mix-v7-80` (`split.json`, `-pin`) | 9/0 | – | 1/0 |
| `real13-mix-v7-80-real` | 9/250 | – | 1/10 |
| `real13-mix-v7-128-noblur`, `-nosharp` (`-pin`) | 8/250 | – | 0/10 |
| `real13-mix-v6-128` (`split.json`) | 5/58 | 1/212 | 2/0 |
| `real13-mix-v6-128` (`split-pin.json`) | 8/257 | 0/12 | 0/1 |
| `real13-mix-v6-80`, `-80-clahe` (`split.json`) | 5/58 | 2/212 | 2/0 |
| `real13-mix-v6-80`, `-80-clahe` (`split-pin.json`) | 8/257 | 0/12 | 1/1 |
| `real13-v7-thin16` / `-core` / `-rand` | 6/0, 2/0, 3/0 | – | – |
| `real13-test-v1-128` | – | – | 2/0 |

Die Umlabelungen sind neu gegenueber dem Pack-Befund oben: ueberwiegend `wB`<->`wN` und
`bB`<->`bN` in `rg-2026-08-08-11-59-12` (184–205 Zeilen) und `rg-VID_20260802_222203`, deren
Korrekturen vom 2026-09-17 stammen — juenger als diese Datensaetze, aelter als die Packs und als
`real13-mix-v7-128` (0 Umlabelungen). Test: `tests/test_bug_hunt_20260923_verdict_check.py`.

## A1–A5. Architektur-Review Python: fuenf Codex-Hypothesen, am Code geprueft (2026-09-23)

Bericht mit Zahlen und Widerlegungswegen: `docs/architektur-review-python-2026-09-23.md`. Die
belegten Befunde stehen als `xfail(strict=True)` in `tests/test_bug_hunt_20260923_architektur.py`.

**A1 — Settle-Messung ueberlebt neue Bretter (H2).** Neben dem Quad (`test_a_new_quad_drops_the_settle_measurement`)
jetzt auch die Pixel-Seite: `write_boards_session` (und `rewarp`, `straighten`, `fit-mesh`) lassen
`settle_*` stehen, `chain.ts` schliesst `settle-scan` auf EINE Zeile mit `settle_dev`. **Weiter 0 von
27**: in 9 nachtraeglich geschriebenen Logs aenderten sich nur `dirty`/`board`-Pfad/`unusable`, nie
`corners` oder `grid_lines`. Kein Fix, dieselbe Regel wie oben: wird die Zahl nicht mehr 0, bauen.

**A2 — `pass.json` und der Scan darunter haben verschiedene Uhren (H3).** `session_stamp` (nur Log)
gegen `temporal_flags.source_stamp` (Log, `session.yaml`, Bretter, Profil). Nach einer Profil-Aenderung
verweigert `propose_session`, die Kette meldet `temporal` erledigt. Heute 0 Faelle (ein Profil,
`desktop.yaml`, aelter als alles). **Schwerer wiegt: 0 von 8 554 wirksamen Matte-Zeilen tragen
`_source`**, `staleMatte` sieht fuer den ganzen Bestand keine Drift. **Zu entscheiden:** (a)
`recut-coverage --all` fahren — rechnet die Drift nach und stempelt nebenbei alles; aendert
Trainings-Coverage, also mit Datensatz-Neubau; (b) ob `provenance.source` das Profil mitnimmt.

**A3 — Schreibschutz pro Datei statt pro Session (H5).** Drei belegte Stellen: `_write_log`
(16 Aufrufe, dazu `realgames.write_session` und `lib/frame-flag.ts`) ohne Stempel-Riegel — ein
langer Lauf loescht ein menschliches `unusable` von waehrenddessen; `sessions._filter_matte_frames`
als achter, einziger unbewachter `matte.jsonl`-Schreiber; `upsert_proposals` benennt SAMs Alphas
zurueck, BEVOR der Ledger bestaetigt ist (`close_seams` hat das Staging-Muster). Heute 0 verlorene
Urteile, 1 gesetztes. **Nebenbefund:** ein Re-Export traegt `unusable` nicht weiter
(`REPAIRED_KEYS`), das Urteil lebt dann nur in der `.bak`. **Empfehlung:** `write_rows_guarded` in
`_write_log` (ein Sink, 16 Stellen), `unusable` in `REPAIRED_KEYS` oder in ein eigenes Ledger.

**A4 — `pass.json` sieht die `matte.jsonl` nicht (H6).** Die Reihenfolge lebt nur in
`cli.session_temporal_pass`, der Nachweis stempelt nur den Log. **21 von 27 `pass.json` sind von Hand
zusammengesetzt**, und **63 Frames in 18 Aufnahmen** tragen heute: SAM fand nichts, das Temporal-Alpha
liegt ueber 0,15, keine Upsert-Zeile — genau der Fall, fuer den der Upsert existiert; sie trainieren
mit Coverage ~0. **Empfehlung:** den `matte.jsonl`-Stempel in `pass.json` aufnehmen und in
`chain.ts` vergleichen; danach einmal `session temporal-upsert` ueber die 18.

**A5 — `MATTE_DIRTY` ist eine Kopie von `PIECE_VISIBLE_MAX` (H4).** Gewollt (torch-frei), heute
gleich, jetzt von `test_matte_dirty_is_the_piece_visible_cut` gehalten. Die Leser begruenden sie mit
"was der Verlust ohnehin maskiert" — das stimmt nur unter `--coverage-weight hard` ohne
`--visible-max`: 26 357 Matte-Zellen liegen in (0,15; 0,6], ein `soft`-Lauf lernt sie mit Gewicht
0,355 im Mittel, die Lane zeigt sie nie. **Zu entscheiden erst, wenn `soft` Vorgabe werden soll**;
bis dahin genuegt, die Konstante in ein torch-freies Modul zu ziehen (verhaltensgleich).

### Vorbefund zu A1 (2026-09-22)

`sessions.settle_scan_session` schreibt `settle_dev`/`settle_seen`/`settle_left` in dieselbe
`log.jsonl`, aus der es die Geometrie liest. Wird der Quad danach ersetzt, raeumt
`write_corner_rows` nur `align_worst_px` weg — die drei Settle-Felder bleiben stehen und
beschreiben ab da einen Quad, den die Zeile nicht mehr traegt. Danach verwirft
`labeling.iter_session_crops` Zellen an `settle_left` und `position_flags.frame_flags` baut Karten
aus diesen Abweichungen. Kein `_source` kann das sehen: Messung und Quelle stehen in DERSELBEN
Datei, ihr Stempel ist also per Konstruktion immer aktuell. Dasselbe gilt fuer
`fit_mesh_session` (Mesh) und jeden Schritt, der Ecken bewegt.

**Betroffen sind heute 0 von 27 Aufnahmen.** Gemessen ueber `data/recordings/*`: alle 27 tragen
`settle_dev`, und in keiner liegt ein `corners_set_at` oder ein `boards/*.webp` spaeter als die
`interval-check.jsonl`, die der Settle-Lauf schreibt. Ein Re-Export traegt die Felder ohnehin nicht
weiter (`realgames.REPAIRED_KEYS` kennt sie nicht), der Riss laeuft also nur ueber `autofix`,
`adopt` und `fit-mesh` auf einer bereits gescannten Aufnahme.

**Darum kein Fix.** Die Felder dort mitzuraeumen ist ein Dreizeiler, kostet aber jedem so
behandelten Frame seine Messung und setzt die Lane auf `—` statt auf eine Zahl — eine
Verhaltensaenderung ohne einen einzigen belegten Fall. Der Befund ist als
`xfail(strict=True)` festgehalten: `tests/test_bug_hunt_20260922_provenance.py`,
`test_a_new_quad_drops_the_settle_measurement`. **Wer die Zahl wieder misst und sie ist nicht
mehr 0, gehoert gebaut** — dann am besten als Raeumen plus Knopf an der Kette, nicht als stilles
Verwerfen.

### Nachtrag zu A3: Log-Riegel gebaut, Re-Export traegt `unusable` (2026-09-23)

Gebaut: `sessions.read_log` gibt `LogRows` mit dem Lese-Stempel zurueck, `_write_log` legt ihn vor
(`write_rows_guarded`) und wirft `Contested` statt einen alten Schnappschuss zurueckzuschreiben —
ein Sink, alle 16 Aufrufe ohne Umbau; Checkpoints nehmen den Stempel ihres eigenen Schreibens mit.
`_filter_matte_frames` ist bewacht. Der Export (`realgames.write_session`) liest das Log unmittelbar
vor dem Schreiben frisch, traegt `HUMAN_KEYS = ("unusable",)` je Frame-Stem auf die neue Zeile und
schreibt bewacht. Tests: `tests/test_bug_hunt_20260923_logriegel.py`.

**Gemessen auf der Platte (nur gelesen, 82 Sitzungsordner, 363 `log.jsonl.bak.*`):** 0 verlorene
Urteile — kein `unusable` der Backup-Geschichte fehlt im heutigen Log, 1 Ordner traegt ueberhaupt
eines (live `true`). Nichts zu reparieren.

**Offen, zu entscheiden:** (a) Ein Urteil auf einem Frame, den der neue Export NICHT mehr waehlt, hat
keine Zeile, auf die es wandern kann; der Export warnt und nennt die Stems, das Urteil lebt dann nur
in der `.bak` — waehlt ein spaeterer Export den Frame wieder, ist es weg. Eigenes Ledger (wie
`unusable-cells.jsonl`) oder Export verweigern? (b) `trim_session` verschiebt die Frames, BEVOR es
das Log bewacht schreibt; ein `Contested` dort laesst Log und Ordner auseinander. (c)
`lib/frame-flag.ts` schreibt weiter unbewacht (`writeFileAtomic`): landet ein Python-Schreiben
zwischen seinem Lesen und Schreiben, ueberschreibt das Web-Urteil dieses Ergebnis (Millisekunden).

### Nachtrag zu A3 (a) und (b): erledigt (2026-09-23)

**(a) Der Export verweigert.** Steht ein `unusable` auf einem Frame, den der neue Export nicht mehr
waehlt, bricht `realgames.export_session` mit `VerdictsWouldDrop` ab und nennt die Frames — einmal
frueh (nach der Planung, bevor `boards/` angefasst wird) und einmal im frischen Lesen vor dem
Schreiben (`write_session`), damit auch ein Urteil aus der Laufzeit greift. Durch geht es nur
ausdruecklich: `drop_verdicts=True` / `realgames export-session --drop-verdicts`, dann mit Warnung,
das Urteil bleibt in der `.bak`. **Auch `unusable: false` zaehlt:** gesetzt wird der Schluessel nur
von Menschen (`flag_frame`, `lib/frame-flag.ts`), ein `false` ist eine Ruecknahme und damit ein
Urteil; fehlend und `false` lesen sich zwar gleich, aber die Spur der Pruefung waere weg.
Geprueft: kein Skript ruft `export_session`/`write_session`; die Kette (`jobs.ts`) ruft die CLI
ohne Schalter und scheitert in diesem Fall mit der Meldung — gewollt. Der Vorgaenger-Test
`test_a_verdict_without_a_new_row_is_named` faehrt dafuer jetzt mit `drop_verdicts=True`.

**(b) `trim_session` schreibt erst das Log, dann verschiebt es.** Reject-Ordner mit `session.yaml`
und dem Log des Schwanzes wird als Ablage vorbereitet, dann `_write_log` bewacht; ein `Contested`
(oder jeder andere Abbruch dort) raeumt den frischen Reject-Ordner wieder weg, kein Frame hat sich
bewegt. Erst danach wandern die Bilder. Tests beider Punkte, mit Gegenprobe:
`tests/test_bug_hunt_20260923_trim_verdicts.py`. **(c) bleibt offen** (`lib/frame-flag.ts`).

### Nachtrag zu A3 (c): erledigt, und der Stand zu A2–A4 (2026-09-23)

**(c) `lib/frame-flag.ts` schreibt bewacht.** Stempel (`stampOf`, `mtimeMs:size`) VOR dem Lesen,
`writeFileAtomicGuarded` beim Schreiben; ein fremder Schreiber dazwischen ist `Contested`,
`/api/frame-verdict` antwortet 409 mit "Urteil NICHT gesetzt, Lane neu laden", die Labeln-Lane
zeigt die Meldung und laesst das Frame stehen. Die Sicherung dieses Versuchs wird wieder geraeumt.
Die Stempel beider Seiten werden nie ausgetauscht — jede Seite vergleicht nur ihren eigenen, und
beide schreiben per Umbenennen, also bewegt jedes Schreiben die mtime: am Probe-File nachgesehen,
Node sieht ein `write_rows` gleicher Groesse, Python ein Node-Rename. Ein `stat`-Fehler (EMFILE)
ist kein Freibrief, die Route schreibt dann nichts. Test mit Gegenprobe (HEAD rot 2/3, Stempel
NACH dem Lesen rot 1/3): `platform/app/lib/frame-flag-guard.test.ts`.

**Stand A2–A4 laut Nachtrag in `docs/architektur-review-python-2026-09-23.md`:**
- **A2 (H3), Matte-Teil:** `pass.json` traegt `_inputs` (`matte` als `ms:bytes`, `scan` =
  `temporal_flags.source_stamp`), `provenance.check` und `chain.ts::inputsMoved` pruefen sie.
  Altbestand ohne `_inputs` (alle 27) gilt weiter und wird als "Stand unbekannt" gemeldet.
  Offen bleibt (a) `recut-coverage --all` (Datensatz-Neubau) und (b) Profil in `provenance.source`.
- **A3 (H5):** (a), (b), (c) erledigt; `upsert_proposals` stagt wie `close_seams`.
- **A4 (H6):** der `matte.jsonl`-Stempel steht in `pass.json` (siehe A2). Offen: einmal
  `session temporal-upsert` ueber die 18 Aufnahmen mit den 63 Frames — erst ein neuer Pass stempelt.
- **A5 (H4):** `chesslab/cell_rule.py` haelt die Regel torch-frei; `matte.close_seams`/
  `recut_coverage` importieren `PIECE_VISIBLE_MAX` seit heute von dort statt aus `training.occlusion`.

## 49. `model.qnn.onnx` wird gebaut, aber nie abgelegt — Absicht? (2026-09-23)

Codex-Befund, belegt: `quantize.run_quantize` schreibt `model.qnn.onnx`, `scripts/stage_model_asset.py`
kopiert nur `model.onnx`, und keines der sieben Assets unter `assets/cnn_model/` traegt ein QNN-Graph.
Das passt zum Build: das `onnxruntime-android-qnn`-AAR ist raus (`docs/arch-bench-2026-09-10.md`),
`BundledGraphShapeTest` nennt QNN "bundled but not selectable", `StagedModel.qnn` ist nullable.
Deshalb NICHT still mitkopiert. **Zu entscheiden:** (a) so lassen und `--format qnn` als reines
Mess-Artefakt fuehren, oder (b) mit einem QNN-faehigen Build das Staging mitkopieren lassen —
dann gehoert der QNN-Graph mit in `export_fingerprint`, und die Paritaetsschwelle (`quantize.PARITY_FLOOR`,
seit heute Abbruch statt Warnung) ist dann eine Auslieferungs-, keine Hinweisgrenze.

## 50. Skript-Jagd Runde 2: was gefixt ist und was offen bleibt (2026-09-23)

Funde in zehn Skripten unter `scripts/`, jeder mit rotem Test auf dem echten Einstieg und Gegenprobe gegen HEAD
(`tests/test_bug_hunt_20260923_skripte.py`, zweiter Block). Keiner davon war schon auf der Platte
wirksam: `fix_ply_offset` wurde nie mit `--apply` gefahren (0 `ply-offset`-Zeilen in allen
`corrections.jsonl`), und alle Datensaetze tragen zu 100 % gemessene `coverage`.

- **`fix_ply_offset.py` las nur `corrections.jsonl`.** Ein "FEN stimmt" in `reviewed.jsonl` war fuer
  das Skript kein Urteil, `--apply` haette es ueberschrieben. Jetzt beide Ledger (auch geparkte,
  `ledger_paths`), und `coverage None` bzw. dunkel ueber `classification_eligible` wird nie korrigiert.
- **`matte_audit_montage.py` rasterte wie `matte_audit` vor 5f4a85c9:** `TILE/8` ueber das Brett mit
  Rand und ohne `white_pov`. Bei Schwarz unten markierte das Blatt das gespiegelte Feld.
- **`border_probe.py` seekte** (`CAP_PROP_POS_FRAMES`) und legte die Ecken der Zeile auf ein Nachbarbild;
  jetzt `stream_frames` mit `detect_rotation` wie der Export. `board_border` ohne Vorgabe 12.
- **`thin_per_position.py`**: `coverage or 0.0` stufte ungemessene Bretter als sauberste ein (jetzt
  Abbruch), und `r["ply"]` starb an jeder Komposit-Zeile — also an JEDEM Mischsatz v4 bis v7.
  Ein Komposit ist jetzt eine Stellung (`ply` None).
- **`audit_montage.py`/`move_strip.py`**: Beispiel-Crop nur gemessen sichtbar ueber die Zellregel;
  die Kachel schreibt `cov=--` statt `cov=0.00`.
- **`mix_datasets.py`**: zwei FEHLENDE Klassenlisten galten als gleich.
- **Messfallen:** `profile_training_gpu.py` (`synchronized`/`queued` und fused/unfused AdamW) und
  `benchmark_export_warp.py` (uncached/cached) messen jetzt abwechselnd (ABBA, Median plus alle
  Einzelwerte). Der fused-Vergleich meldete ohne ungefusten Bezug `parameters_equal: True` gegen sich
  selbst — jetzt `None`. **Die Zahlen in `docs/training-stack-spike.md` ("fused saved too little") und
  CLAUDE.md (Export 23 -> 7 s) stammen aus den alten Laeufen und sind erst nach Neumessung belastbar.**

**Offen, bewusst nicht angefasst:**
- `profile_training_gpu --experiments`: Arme weiter in fester Reihenfolge; `eager_repeat` am Ende ist
  die einzige Kontrolle. Verschraenken geht nicht ohne Weiteres, `autotune` setzt `cudnn.benchmark` global.
- `benchmark_batch_aug.py`: Bloecke je Variante (3 Wiederholungen, Aufwaermen), nicht verschraenkt —
  jede kompilierte Variante braucht ein eigenes `torch._dynamo.reset()`.
- `sweep_report.py`: `EPOCH_SD` 0,0157 ist die Zahl EINES Satzes (`_ab`), das Rausch-Kriterium
  `3 x EPOCH_SD` gilt fuer die Differenz zweier Fuenf-Epochen-Mittel ohne Seed-Streuung; CLAUDE.md
  verlangt 10–20 Epochen, gepaart je Seed. `macro`/`cov_p` kommen vom `best`-Checkpoint.
- `pack_dataset_sessions.py` erkennt einen veralteten Pack nur ueber die mtime des Spender-Manifests,
  nicht ueber `crop_fingerprint`. `reduce_video.py` setzt ein fehlendes FPS still auf 30.

**Tot und inzwischen geloescht (2026-09-23):** drei Skripte, deren Eingaben fehlten (Pfad A
las `frames/`, die der Brett-Speicher nicht mehr hat; `data/models/_noise` fehlte).

### Nachtrag: die vier offenen Skript-Punkte (2026-09-23)

Je Befund ein roter Test mit Gegenprobe gegen HEAD (`tests/test_bug_hunt_20260923_skripte.py`,
Block "Runde 3"). Nichts davon auf echten Daten gefahren.

- **`sweep_report.py`:** `EPOCH_SD` ist weg. Verglichen wird das Mittel der letzten **20** Epochen
  (`TAIL`, unter 10 kein Urteil), das Rauschen je Arm aus dessen eigenen Schwanz-Epochen, die
  Schwelle ist 3 x Standardfehler der Differenz. `macro`/`cov_p` mitteln dieselben Epochen statt
  vom `best` zu kommen. **Annahme, im Kopf der Tabelle benannt:** ohne Seeds ist das eine
  Untergrenze, und benachbarte Epochen sind korreliert — gepaart je Seed bleibt der Massstab.
- **`benchmark_batch_aug.py`:** misst ueber `alternating()` aus `profile_training_gpu.py`
  (importiert, nicht kopiert): ABBA, REPS 4, Median plus Einzelwerte (`ms_per_batch_reps`).
  Statt `_dynamo.reset()` je Kandidat EIN Reset vor allen; beide kompilierten Kandidaten teilen
  sich die `recompile_limit=32` (je 6 Graphen). Die Brett-Pruefung laeuft nach der Messung mit
  eigenem Reset. Rest-Unschaerfe: der zweite Kandidat prueft beim Aufruf auch die Guards des
  ersten (µs gegen ms je Batch). Die Zahlen in `docs/compiled-batch-aug.md` sind die alten.
- **`pack_dataset_sessions.py`:** fragt jetzt `dataset_build._stale_packs` — denselben Weg wie
  `dataset build --from-packs` (`ledgers.json`, ohne Stempel nach Inhalt). Ein Pack, den ein
  Urteil ueberholt hat, heisst `VERDICT`, nennt den `--replace`-Befehl und der Lauf endet mit 1;
  vorher hiess er `have`, und erst der Bau scheiterte. **Die Mtime bleibt**, aber nur fuer
  PIXEL: fuer einen Re-Slice gibt es keinen Stempel (`crop_fingerprint` greift bei `mm://`
  nicht). Sie vergleicht weiter gegen das Spender-Manifest — nach einem Umhaengen (v6) ist das
  juenger als jeder Pack, `STALE?` ist dann ein Fehlalarm. **Zu entscheiden:** Export-Stempel
  der `log.jsonl` in den Pack (wie `ledgers.json`), dann faellt die Mtime ganz.
- **`reduce_video.py`:** nennt der Container keine Bildrate (0, NaN), bricht es ab;
  `--fps N` gibt sie ausdruecklich vor. Aus dem Container gemessen wird nicht — `POS_MSEC` ist
  bei denselben Containern ebenso unzuverlaessig.

## W1–W3. Architektur-Review Web: drei Wege, auf denen ein Urteil verloren ging (2026-09-23)

Codex-Hypothesen zu `platform/app`, je mit rotem Test auf dem echten Weg und Gegenprobe
(`platform/app/lib/verdict-revisions.test.ts`, `tests/test_bug_hunt_20260923_retime.py`).

- **W1 `adoptPgn` — BELEGT.** Zwischen `exists(reference.pgn)` und dem `writeFile` landete ein
  Upload ueber `/api/pgn/<name>`; das Handy-PGN ueberschrieb ihn ohne Sicherung. Jetzt
  `flag: "wx"`, EEXIST heisst "ein Mensch war schneller" und wird als Absage gemeldet.
- **W2 `retime` — BELEGT.** Eine Bestaetigung waehrend des Laufs war nach dem Ersetzen weg.
  `retime` stempelt `candidate.json` vor dem Lesen und prueft den Stempel vor und nach der
  Nebendatei; bei Abweichung `refused:` (CLI Exit 1, Ledger-Grund), nichts ersetzt, keine
  Review-Bretter. `ioutil` hat fuer EINZELNE JSON-Dateien nur das unbewachte `write_json` —
  **zu entscheiden:** ein `write_json_guarded` dort, dann faellt `retime.py` aus `json_doors.txt`.
- **W3 Bestaetigung ohne Referenzstand — BELEGT.** `writeConfirmation` schreibt jetzt
  `confirmed_reference: {md5, at}` (md5 wie `referenceOrigin`, `at` = `confirmed_at`, `md5: null`
  = ohne Referenz bestaetigt). Weicht die aktuelle `reference.pgn` ab, oeffnet `chainState` die
  Sprosse `confirm` wieder (`outdated.confirm`); `confirmed` und `reviewed_plies` bleiben
  unangetastet. Ohne Stempel, oder mit einem, dessen `at` nicht mehr zu `confirmed_at` passt:
  `confirmRefUnknown`, gilt weiter, `/confirm` zeigt "Referenzstand unbekannt".
  **Offen:** `realgames.write_confirmation` (CLI) stempelt nicht — jede CLI-Bestaetigung ist
  "unbekannt". Und der POST rechnet gegen die Referenz VON JETZT, nicht gegen die, die die Seite
  beim Laden zeigte; wer das schliessen will, schickt den md5 der Seite mit.
- `lib/data.test.ts` erwartet den neuen Schluessel (Schluesselmengen-Test des Confirm-POST).
- **Nachtrag 2026-09-23: W1–W3 erledigt** (`tests/test_bug_hunt_20260923_confirm_stamp.py`,
  `platform/app/lib/confirm-stamp.test.ts`, Gegenprobe je Fix: zurueck, rot, rein).
  (1) `ioutil.write_json_guarded` (Stempel wie `write_rows_guarded`, `Contested`); `retime` schreibt
  darueber und ist aus `tests/json_doors.txt` raus, `realgames.py` dort von 2 auf 1.
  (2) `realgames.write_confirmation` stempelt `confirmed_reference: {md5, at}` in der Form von
  `writeConfirmation`, md5 ueber die ROHEN Bytes wie `referenceDigest` — beide Tests pinnen eine
  PGN mit BOM und CRLF auf `5c6da1fbf57ec1d48056dff3958c2080`. Bewacht: weicht die Datei vom
  Lesestand des Aufrufers ab (Bestaetigung in `/confirm` waehrend des Prompts), schreibt sie
  nichts und wirft `ValueError` (CLI `[ERR]`, Exit 1; `cli.py` unveraendert).
  (3) `/confirm` schickt `reference_md5` der angezeigten Referenz (null = keine); weicht die
  Datei ab, antwortet die Route 409 ("Seite neu laden") und schreibt nichts. Ohne den Schluessel
  (alter Client, `/api/zuege`) urteilt sie wie bisher gegen die Referenz von jetzt.
  **Offen:** die CLI hasht die Referenz beim SCHREIBEN, `confirm` liest sie aber vorher und
  fragt dazwischen interaktiv — wird sie in diesem Fenster ersetzt, steht der neue md5 am alten
  Urteil. Schliessen heisst: `confirm` nimmt den md5 beim Lesen von `truth_sans` und reicht ihn durch.

## W4–W5. Architektur-Review Web: Meldung/Widerruf und abgebrochener Export (2026-09-23)

Rote Tests auf dem echten Weg (Route, `adoptDirty`, Ledger, `chainState`; nur der Kindprozess
gefaelscht): `platform/app/lib/dirty-and-export-marker.test.ts`,
`tests/test_bug_hunt_20260923_adopt_dirty.py`. Gegenprobe je Fix: zurueck, rot, rein.

- **W4 `dirty-frame` und Widerruf — BELEGT, dreifach.** (a) Ein Widerruf entfernte nur die Note;
  `dirty=true` blieb im Log, egal ob der Lauf schon fertig war oder noch lief. (b) Zwei Klicks
  starteten zwei Prozesse auf dieselbe `log.jsonl`. (c) Ein gescheiterter Lauf stand nur in
  `jobs/<name>.adopt-dirty.log`. **Fix:** `adopt_reported_dirty` gleicht in BEIDE Richtungen ab —
  eine Zeile mit `dirty_source=reported`, deren Note fehlt, verliert die vier `dirty*`-Schluessel
  und ihr Brett geht zurueck nach `boards/`; Scan-Urteile (ohne `dirty_source=reported`) fasst
  er nie an. Melden UND Widerrufen stossen den Lauf an. Je Aufnahme laeuft hoechstens einer;
  kommt waehrenddessen eine Aenderung, folgt genau EIN weiterer, der die Notizen frisch liest —
  der Widerruf gewinnt also, ohne Python-seitiges Nachlesen. Das Scheitern (und die Erholung
  danach) kommt als `adopt-dirty`-Zeile in `jobs.jsonl` (`recordOffSlot`, nur Endzustaende, kein
  Heavy-Slot); ein Erfolg schreibt keine Zeile, sonst verdeckte er in `jobOf` den letzten
  Kettenschritt. `adopt-dirty` verweigert unter `.export-running` (ValueError, CLI Exit 1).
  **Offen:** (1) Nach einem Re-Export traegt ein gemeldetes Frame kein `dirty_source` mehr
  (`plan_scanned`), ein spaeterer Widerruf erreicht es dann erst beim naechsten Export.
  (2) `place_board` verschiebt Bretter VOR `_write_log`; endet der Lauf mit `Contested`, liegt das
  Brett im anderen Ordner als die Zeile sagt — gilt schon vorher, nicht angefasst. (3) Die
  CLI-Meldung sagt bei Ruecknahmen weiter "auf `occluded` gesetzt" (`cli.py` nicht angefasst).
- **W5 abgebrochener Export — BELEGT.** `exportedSession` las nur `log.jsonl`; mit
  `.export-running` bot die Kette `settle-scan`/`matte`/`temporal` an. Jetzt heisst der Marker
  `hasSession: false`, Sprosse `export`, Grund in `outdated.export` (steht als `reason` auf Karte
  und `/game`, dort ausserdem "Export abgebrochen"); `startStep` weist jeden Folgeschritt mit 409
  ab. **Python-Seite, Befund, nicht umgebaut:** ausser `session straighten` (und jetzt
  `adopt-dirty`) prueft KEIN Folgeschritt `export_interrupted` — nicht `session settle-scan`,
  nicht `occluders alpha-worker`, nicht `session temporal-pass`, nicht `realgames model-read`,
  nicht `slice_session`. Aus der CLI laufen sie also weiter auf gemischten Generationen.
  **Vorschlag:** ein Pruefpunkt in `sessions.read_log` (oder einem `read_log_for_work`, das die
  Verben statt `read_log` rufen), der unter dem Marker wirft; nur `export-session` und
  `session rewarp` lesen ohne ihn.

### W4–W5 erledigt (2026-09-23, Nachtrag)

Tests: `tests/test_bug_hunt_20260923_export_marker.py`, echter Weg ueber die CLI-Verben. Gegenprobe
je Fix: zurueck, rot, rein.

- **Ein Pruefpunkt.** `sessions.refuse_interrupted_export` wirft `ExportInterrupted` (erbt von
  `ValueError`, die CLI-Faenger enden mit Exit 1). BEIDE `read_log` rufen ihn — `sessions.read_log`
  und `labeling.read_log`, ueber den `matte`, `temporal_matte`, `occluded_model` und `slice` lesen.
  `EXPORT_MARKER`/`export_interrupted` wohnen jetzt in `sessions`, `realgames` fuehrt sie weiter aus.
  Daran vorbei (`read_log(..., under_export=True)`) lesen nur `session rewarp` und
  `session write-boards` (setzen und raeumen den Marker selbst, schneiden aus der Quelle neu) und
  `flag_frame` (ein menschliches `unusable`, das der laufende Export per `HUMAN_KEYS` mitnimmt).
  Der Export selbst liest das alte Log ueber `read_jsonl`, nie ueber `read_log`. `straighten` behaelt
  seine eigene, fruehere Absage (`NothingToDo`).
- **Folgen, gewollt:** unter dem Marker verweigern auch `scan`/`autofix`/`adopt`/`fit-mesh`/
  `mark-hands`/`park-frames` und die Skripte unter `scripts/`. **Befund, nicht umgebaut:** die
  Korpus-Berichte `realgames position-flags` und `frame_hands` laufen ueber ALLE Aufnahmen und
  brechen jetzt an EINER abgebrochenen ab (laut, mit Namen) statt sie zu ueberspringen;
  `hand_gate.gate_session` liest `log.jsonl` roh und prueft den Marker nicht (kein Kettenschritt).
  Zwei fremde Tests lesen nach einem absichtlich gescheiterten Export das Log mit `read_log` und
  sind deshalb rot: `test_bug_hunt_20260923_logriegel.py::test_a_write_racing_the_log_swap_is_contested`,
  `test_bug_hunt_20260923_trim_verdicts.py::test_a_verdict_on_an_unpicked_frame_set_during_the_export_refuses`
  — dort gehoert `under_export=True` an die Pruef-Zeile.
- **`place_board` plant nur noch** (Zeile umzeigen, Zug zurueckgeben); `move_boards` verschiebt
  NACH dem bewachten `_write_log`, in `adopt_reported_dirty` und `mark_hands_session`. Ein
  `Contested` laesst Brett und Zeile beieinander.
- **`adopt-dirty`-Meldung** zaehlt `set` und `retracted` getrennt; die Schlusszeile zaehlt nur
  neu gemeldete Frames.
- **W4 entschieden: ableiten, nicht tragen.** `dirty_source=reported` ist eine Folge der Note, kein
  Urteil im Log; es in `HUMAN_KEYS` zu tragen hiesse, einen inzwischen widerrufenen Stand
  weiterzuschreiben. Ein `adopt-dirty` nach dem Export allein reicht NICHT: `plan_scanned` hat die
  gemeldeten Frames schon `dirty` geplant, und `adopt` fasst eine `dirty`-Zeile ohne Quelle nicht an.
  Also stempelt `plan_scanned` `dirty_source=reported` genau dort, wo die Note ein `clean` hochgestuft
  hat (Scan-Urteile bleiben ohne), und `export_session` ruft hinter dem Marker einmal
  `adopt_reported_dirty` — das holt nach, was waehrend des Exports gemeldet oder widerrufen wurde
  und dort an `ExportInterrupted` scheiterte. Keine Web-Kette noetig.
- **`realgames confirm`** nimmt den md5 von `reference.pgn` beim Lesen (`read_reference`, dieselben
  Bytes wie die SANs) und reicht ihn an `write_confirmation`; weicht die Datei beim Schreiben ab
  (ersetzt waehrend der Rueckfrage), `ValueError`, Exit 1, nichts geschrieben.

## 51. Mutationsprobe `:core-engine`: tote Wachen und eine Richtungsfrage (2026-09-23)

229 Mutanten, je eine Wache, `:core-engine:test`. 175 fing die Suite, 42 waren ungedeckt und
haben jetzt einen Test (`VerifyLadderGuardTest`, `EngineGuardProbeTest`, Ergaenzungen in
`TaintTest`, `FrameLoopTest`, `ResyncTest`). Die drei Vorbefunde (`89248cac`, `a6fa47e3`,
`308d8161`) werden gefangen — bis auf die PAAR-Haelfte von `a6fa47e3`, die keinen Test hatte.
**Zu entscheiden** ist, was mit Wachen passiert, die unter keiner Eingabe etwas tun:
- **Tot unter `COMMIT_VOTES = 1`:** `VerifyPair` `else if (bound) atEnd()` im Commit-Zweig —
  `pendingVoted(..., 1)` ist immer wahr. Bleibt als Absicherung, falls die Konstante steigt?
- **Unerreichbar, weil jede Tuer, die das Brett aendert, `pending` raeumt:** die drei
  FEN-Nachpruefungen in `VerifySingle.tick`, `singleTick` und `VerifyPair.tick` (zusammen
  ausgehebelt: gruen) sowie `choosePromotion`s `board.fen() != pending.fen`.
- **Teilmenge einer anderen Wache:** `VerifySingle.tick` `cleanCommitsOnly && modelHandSquares`
  ist in `handHoldsVerdict` enthalten. `CnnTick.onMismatch`s Recovery-vor-Resync-Abbruch: ein
  Recovery-Commit loest immer den Alarm, und der Auto-Resync zaehlt nur unter Alarm.
  `FrameLoop` `ready = false` beim Gitter-Freigabeframe: die Puffer sind dort schon leer.
  `discardVisualReference` leert die Census-Caches, die ihr Identitaetsschluessel schon entwertet.
- **Grenzwert:** `verifyExpired` `>=` gegen `>` unterscheidet nur exakte Gleichheit.
Offen dazu die Richtungsfrage E13 (`docs/bug-audit-2026-09-13.md`): ob die Handfelder fuer den
Trainingsexport an die Stellung gebunden sein duerfen.
**Entschieden 2026-09-23:** alle Wachen bleiben. `COMMIT_VOTES` ist ein Knopf (benannte
Konstante, zwei Leser), der tote `else if (bound) atEnd()` lebt auf, sobald sie steigt; die
FEN-Nachpruefungen sind billige Absicherung. E13 ist gefixt: die Handfelder haengen nicht mehr an
der Stellung, das Alter begrenzt weiter `freshSnapshot` (3 s).

## N1–N3. Die Naht `core-engine` / `tracker-runtime` (2026-09-21, nicht gebaut)

Codex-Review, jeder Befund am Code geprueft; zwei weitere Hypothesen widerlegt (die zwei
Verdeckungsarme schweigen nie gemeinsam, der Doppelbesitz von "CNN laeuft" schadet nicht).

- **N1 — eine nicht ersetzbare Aktion kann still verdraengt werden.** `EngineHost.actions` fasst 32,
  `host.tick` ist der einzige Leerer. Mit `setCameraOn(false)` laeuft kein `onFrame` mehr, und der
  ungedrosselte `KnobSlider` (ein `UpdateConfig` je Compose-Frame) schiebt eine `AcceptCnnPosition`,
  `Undo`, `ChoosePromotion`, `CaptureBaseline` oder `CnnAvailability(false)` hinaus; `submit` gibt
  `Unit` zurueck. Faellt `CnnAvailability(false)` weg, bleibt `cnnRun = true` bei totem CNN — genau
  der Zustand, den `b7a9287d` schliessen sollte. Dazu verschluckt `stacks.current?.host?.submit`
  jede Aktion waehrend `StackSwitch.restart`. **Fix nicht klein:** ersetzbar/nicht ersetzbar im
  `EngineAction`-Typ (nur `UpdateConfig`, `SetDebugEnabled` koaleszieren), Rueckgabewert fuer
  `submit`, Uebergabe-Queue im `StackSwitch`.
- **N2 — der Close-Timeout gibt frei, was ein laufender Thread benutzt.** `CnnObserver.close()`
  kehrt nach `CLOSE_TIMEOUT_MS = 5000` zurueck, waehrend der Thread noch in `cnn.classify` steht;
  `TrackerStack.close` gibt danach Crop-Store und `CropClahe` frei, die der Thread in `cropFrame`
  benutzt — ein nativer Use-after-free. `CnnObserverCloseTest` deckt den Timeout-Zweig nicht.
  **Fix klein:** bei Timeout die Freigabe auf den Aufraeum-Task verschieben, Neubau erst nach dem Latch.
- **N3 — `FrameInput.board` liefert nach dem naechsten Frame fremde Pixel.** `OpenCvStages.boardAt`
  liest aus `scope`, das `endFrame()` nullt; ein festgehaltenes `FrameInput` gibt das Brett des
  NEUEN Frames unter alter `seq`. Heute liest nur `TrackerCoordinator` im selben `onFrame`.
  **Fix klein:** den Lazy an seine `seq` binden oder neben statt in `FrameInput` fuehren.

Offen dazu: die Invariante "genau ein brauchbarer Verdeckungsarm" haengt an `gridArmFor` in `:app`;
ein `== true` statt `!= true` schaltet den Phantom-Veto auf jedem ausgelieferten Modell ab.
