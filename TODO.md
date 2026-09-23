# TODO — offen, kurz, nach Wert

> Nur Offenes. Ein Punkt = ein bis drei Zeilen: was, warum, wie messen. Erledigtes fliegt raus
> (Git ist das Archiv), Messergebnisse, die weiter gelten, gehoeren nach `docs/`. Richtungsfragen
> mit Messung dahinter stehen in `docs/offene-entscheidungen.md`.

## Aufnahmen — was der Regressionssatz nicht hat (2026-09-05)

Stand gemessen 2026-09-21: `docs/regression-reference.md` (396 gefunden, 3 verfehlt, **0**
erfunden, 8 Desync-Episoden) — die 385/14/1 galten vor der Champion-Beförderung `29b7dbc6`. `222203` mit 3 Referenz-Plies wertlos, `233929` verliert das Ende an die zu
frueh gestoppte Kamera. Der Satz ist gesättigt. Gezielt aufnehmen, mit der App (Ecken, Timeline,
`settings.json` liegen dann bei), jede mit **2 s Stillstand nach dem letzten Zug**:

- zwei Partien **von Schwarz gespielt** (`BLACK_BOTTOM`; der Replay liest die Seite aus `settings.json`)
- eine Partie im **dunklen Büro** ohne Lampe (der 2026-08-29-Standoff fehlt im Satz)
- eine **Sonderzug-Partie**: Rochade beide Seiten, en passant, Promotion + Unterverwandlung,
  Doppelschlag auf einem Feld
- eine **Blitzpartie** mit schnellem Hin-und-Zurück und Hand-Nachschleppe
- ein illegaler Zug im Schach (der `refusedStreak` ist im Korpus untestbar: 304/90/7 in beiden Armen)

## Tracker / Engine

- **Bug-Audit 2026-09-13: `docs/bug-audit-2026-09-13.md` fuehrt den Stand je Meldung.** Von 32
  sind **13 offen** (C2, C3, C4, C5, C7, C8, E1, E2, E11, E12, A3, A5, A7), der Rest gefixt,
  widerlegt oder mit den zwei toten Engines gegenstandslos geworden. Zwei sind Produktfragen
  (A3, A7), A5 und E1/E2 sind lasttragend — A/B auf dem Regressionssatz VOR dem Fix.
  Diese Zeile nur aus dem Dokument nachfuehren, nie aus dem Gedaechtnis.

- **Split ist Vorgabe (2026-09-13): 133 ms, 2 Frames.** Offen: Nachbarring in der Sicht-Serie
  EINZELN messen (Finger neben der Figur liest der Coverage-Kopf zu 24 % als frei), und eine
  Messung am Geraet — `docs/commit-latency.md` §4 (Tag 13).
- **Basis-Snapshot mit Temporal-Average je Feld (Nutzer, 2026-09-13):** letzter sauberer Blick je
  Feld als Referenz-Komposit, damit die Frame-Diff unter der Hand auf sichtbaren Feldern laeuft und
  die Referenz nie auf einem Arm-Schatten landet. Aendert die Evidenz selbst; Regressionssatz als Veto.
- **Drei Handy-Sessions (08-24, 08-30) tragen Schema 4 in `settings.json`** und fallen aus jeder
  `config=`-Messung; Migration im Codec oder Replay mit Vorgaben.


- **Observer-Rundreise am Handy (0,1–0,3 s je Zug):** eine Beobachtung aus der Ruhephase vor dem
  Kandidaten annehmen statt eine nach `pend.seq` zu verlangen; nur am Gerät messbar, Veto-Risiko
  ist die Hand unter der Bewegungsschwelle (`docs/commit-latency.md`).
- **Bewegtes Brett: gemessen, Rest offen.** `scripts/bump_replay.py` (2026-09-06) schiebt eine
  Aufnahme ab Frame N um dx/dy und spielt Kontroll- und Sprunglauf durch: 11-55-19 mit 20/8 px ab
  700 → 15/0/0 in beiden, ein Zug 68 Frames später, das Brett des Trackers danach 0,017–0,034
  Zellen (2–3 px) neben dem Kontrolllauf. Seitdem trägt jeder Halbzug `corners` (Engine bzw.
  Handy-Quad am Commit), Export und Review-Bretter schneiden je Ply. Offen: der Label-Replay
  (`prepareLabel`) mittelt sein Fallback-Quad weiter über das ganze Video; ein Sprung ohne
  Ply-Quad (Kamera-Roll-Video) bleibt dort ein statischer Median.
- **Retime auch für den PC-Label-Replay.** `realgames retime` (`docs/retime.md`) legt die Plies
  eines Handy-Kandidaten dorthin, wo das Video die Stellung zeigt (16-20-19: 24 von 24
  verschoben, 8 nie gesehen). Der Replay-Label (`label`) committet mit derselben Engine und
  hinkt bei schnellen Händen genauso; der Job `label` ruft das Verb noch nicht.

- **`phone-candidate` dekodiert noch jedes Bild — seit 2026-09-06 zweimal** (440 s gegen 1 325 s
  Replay auf 20-41-33, plus der Review-Pass bis zum letzten Ply): der Geometrie-Scan braucht nur
  jeden 10. Frame — `grab()` statt `retrieve()` dazwischen, dann sind es Sekunden; der Review-Pass
  könnte per Seek nur die Ply-Fenster holen. Und: die 100-Samples-Schwelle des Replays (`geometryRefusals`) gilt im Verb nicht; auf dem
  31-s-Bündel schrieb es 8 Plies mit 39 von 48 ausgerichteten Samples — entscheiden, ob das reicht.
- **Ruhehand ohne Rillen-Arm.** `modelHandSquares` verwirft die Coverage-Flags nach 3 s Ruhe, wenn
  das Gitter nicht bürgt — auf dem Handy ist der Rillen-Arm bei Coverage-Modellen aus, also bürgt
  niemand: eine Hand > 3 s in Ruhe ist unsichtbar. Bevorzugt: bewegungsqualifizierter Latch (Flags,
  die während Bewegung handförmig waren, bleiben, solange dieselben Felder flaggen; keine neuen in
  Ruhe). Messen: Ruhehand-Clips 3/10/30 s, 20260814-142947 muss 0 Phantome bleiben.
- **Zugfolge nach Plausibilität** (User 2026-09-04). Bei einer Brücke mit mehreren Wegen zur selben
  Endstellung nimmt der Beam „kürzeste, zuerst gefunden". Stattdessen eine winzige Bewertung in
  `core-engine` (Material + SEE + max. 2 Halbzüge, Mikrosekunden), Stockfish nur falls das nicht
  trennt. Erst bauen, wenn ein Fall gemessen ist, in dem der Tracker die falsche Reihenfolge wählt —
  auf 11-59-12 hatte er recht, das Label nicht.
- **Alarm: Latch oder verfallende Warnung?** Der Latch hält bis Undo/Resync; ein Fehlalarm während
  des Zugs ist teuer. Die Alternative (Warnung, die verfällt, wenn die Stellung wieder passt) ist
  nie gemessen. Vorher klären, dann erst Schwellen (`alarmDeferObs`) drehen.
- **Identität schwach gewichten.** Auf 4K kippt die Identität (0,81–0,86), die Belegung nicht (0,97).
  Der Hypothesen-Score sollte Belegung+Farbe voll, Identität schwach zählen; Faktor aus dem gemessenen
  Verhältnis. Datenseite: 4K in `--scales` oder Crop auf Trainingszellgröße (siehe Daten).
- **`identityRead` bei `inconclusive`** fragt die Belegung nicht und resettet Recovery-Vote und
  Desync-Serie — ein starker Belegungswiderspruch im Dunkeln gilt als Blindblick. Belegungs-Fallback
  gemessen 2026-09-04: zeilengleich auf dem Satz (kein Nachweis) → braucht die Dunkel-Aufnahme.
- **Baseline-Occlusion erreicht die Detektion nie** (Keep-alive 0,1 s < Hold 0,2 s; Probe 2026-09-04).
  Scharf gemacht kostet es 7/18 Parity-Clips und `blender-capture` zwei Züge: ohne CNN hält die
  „>2 Felder = Hand"-Regel einen Schlag für Verdeckung. Braucht vorher einen Filter, der Figur von
  Hand trennt. Zurückgenommen.
- **Anomalie-Patcher ohne Verfallsdatum:** `cnnStatus == mismatch` sperrt ihn bis zum nächsten
  Match/Commit; im Stillstand kommt keins. Hand-Kriterium an die Hand-Signale hängen statt an die
  Zahl der Felder — braucht eine Aufnahme, in der der Refit wirklich feuert.
- **`HandEvidence`:** `gridOccluded == 0` heißt „sauber", „abgeschaltet" und „nicht gerechnet"
  zugleich. Ein Wert `HandEvidence(model, grid, modelValid, gridValid)` mit den Prädikaten an EINER
  Stelle setzt die vier Verbraucher auf eine Latte. Dann auch: beide Arme gegeneinander messen
  (Desktop-Schalter für `runGridOcclusion` als Knob).
- **`minGridLineCoverage` entlastet `motionThr`.** Die obere Wand hängt an der Puffer-Hygiene, nicht
  am Commit-Gate (67→4 Plies bei `motionThr` 1,0, auch mit `nomotion`). Wer Luft will, dreht dort.
- **Modell-/Engine-Wechsel ohne Neustart.** `StackSwitch` kann tauschen; der Weg Einstellung → Tausch
  fehlt. Klären, was ein Wechsel mitten in der Partie mit Historie und Pixel-Referenz macht
  (`CaptureBaseline` wie bei der Belichtung).
- **Engine 2/3:** mehrdeutige Routen committen nichts (Stellung re-ankern statt Zeilen erfinden);
  ein verlorener Ply dreht die Zugfarbe (nur `ResyncToBoard` heilt); `wantsRead()` ignoriert das
  Wiederholungslimit von `due()`; Prior (`possibleLabels`) ungenutzt; Coverage-Gate 0,15 geerbt.
- **Laufzeit, geparkt:** `MarkerTracker` hält STALE-Ecken ewig (fürs feste Rig gewollt, eine
  Kamerabewegung im Verlust sieht `cornerJumpPx` nie); `SessionTimeline` schreibt in Sendereihenfolge,
  QNN-Zweig ohne AAR.
- **Vorlauf-Gegenprobe:** 45 s × 12,9 Mbit/s = 72 MB gegen `PRE_ROLL_MAX_BYTES` 80 MB — gerechnet,
  nicht gemessen (`adb logcat -s chesslabVideo`).

## Daten / Training / Labeling

- **Export-Marge gegen die Commit-Verzögerung (gemessen 2026-09-06):** der physische Zug liegt im
  Median 65 Frames (2,2 s), p90 167 Frames vor dem Commit, die Ruhe-Marge deckt 30 Frames. 79 von
  ~500 Plies tragen so „saubere" Frames mit alter Stellung; die Zellprüfung (`settle_left`,
  `unknown_squares`) hält sie aus dem Training, seit die Blockregel die Zugfelder durchlässt. Offen:
  Finger am unteren Bildrand sieht der Hand-Sensor nicht (153751 Frame 1334, 154327 Frame 1633) —
  die Zellen unter der Hand auf „sauberen" Frames bleiben ungesperrt, bis der Rand mit gemattet wird.
- **11-59-12 neu slicen und packen** — Frame-FENs ab Ply 65 waren falsch (a3/a4 vertauscht), am
  2026-09-04 korrigiert; ein bereits exportierter Pack trägt die alten Labels.
- **4K gehört in `--scales`** oder der 4K-Crop auf die trainierte Zellgröße (116 px), statt auf 80
  hochskaliert. Vorher messen, welcher Weg die Identität hebt.
- **Train/Serve-Resampling:** live nativer 576-px-Warp (INTER_LINEAR), Export 800er Warp → 110-px-Crop
  → INTER_AREA auf 80. `ParallelVisualPrepass` schneidet aus `geometry` statt `forNativeCrops()` und
  kennt kein CLAHE. Byte-Parität Python↔Kotlin über (Frame, Feld)-Schnittmenge per sha256 nie geprüft.
- **`board_acc` ist `piece_acc`^32 und ignoriert Verdeckung** (54 % Deckel). Reihenfolge:
  `visible_board_acc`, dann eine Toleranzvariante („höchstens eine Zelle falsch"), dann erst
  `CHECKPOINT_WEIGHTS`. Trainingscode — abstimmen.
- **Jedes A/B braucht drei Seeds** (`docs/evaluation.md`); s3 und Composite haben eigene,
  ungemessene Grenzen; `val_conf_auroc` ist als Entscheider unbrauchbar.
- **Stored-Sessions v2:** 6 Packs mit Grid-Fit-Quad neu gepackt, 637 Hard-Empties geparkt. Offen:
  Dataset `real14-all-80-v2` bauen (Resolver muss die `-80-v2`-Verzeichnisse ziehen) und Retrain.
- **`load_packed` / `open_packed_rows` sind nicht mehrpack-fähig.** Sie weisen Pack-Datensätze beim
  Namen ab; wer mehrere Packs lesen will, geht über `resolve_dataset_packs` (wie `oof_review.py`,
  `lr_range_test.py`). Offen, ob die beiden selbst mehrpack-fähig werden oder wegfallen.
- **Die Kotlin-Schreiber bauen `mm://` weiterhin selbst** (`Crops.kt`, `LabeledVideoPack.kt`,
  vier Stellen `"mm://$id/$stem/$square"`). Python hat seit 2026-09-20 EINEN Bauer
  (`packs.mm_path`), und `tests/test_mm_path_contract.py` haelt alle drei Formen samt der
  Kotlin-Literale fest — der Vertrag ist nur das erste Segment. Ein Kotlin-Bauer waere der Rest.
- **`crop_fingerprint` in Session-Packs** und **`labeled-session-pack` aus `row["board"]`**: Punkte 33/34
  in `docs/offene-entscheidungen.md`.
- **Composite:** Pool 128 → 80 ist ein Resampling zu viel (1,54× Laplace direkt); Überblendung
  variieren (hart/Gauss/Poisson, ICCV 2017); Median-Mesh dreht mit dem Brett (r 0,87 zum Winkel).
  Alles Bildmessungen — Val-Wert gegen `comp13-occ-bn-lr1e2-bs512` ist der Gegentest.
- **per-position:** 8→2 kostet (3/3 Seeds); offen, welche Hälfte trägt (`c8d2` gegen `c2d8`).
- **`SETTLE_CELL_PX` 32 sweepen** (16/32/48/80) mit `SETTLE_LIMIT` als Mitläufer.
- **`OPENBLAS_NUM_THREADS=1` für `serving.py`** — 3,2 GB Commit, vorher Latenz messen.
- **Hände in „sauberen" Frames:** ~ein Drittel von 40 Stichproben zeigt Haut; die Trefferquote des
  Sensors wurde nie gemessen. Der Occlusion-Kopf über die nicht-`dirty` Frames ist die Antwort.
- **Verdeckte Stellungen:** 68 % der Stellungen haben < 16 saubere Bretter. Frames zurückholen
  (Zeitfenster ohne Hand, Felder statt Frames verwerfen), nicht dichter exportieren.
- **Sampler:** Hände/Ply-Wechsel als eigene Strata (Sprung 17,97 gegen Median 0,72).
- **Krümmung fehlt auf `2026-08-13-19-34-23` und `2026-08-14-20-48-55`** (5,4–5,5 px Bogen); der
  gerade Store kostet eine Interpolation (−22 % Laplace kubisch) — Mesh in den Warp komponieren.
- **`board_size` folgt nicht dem Quad** (96–125 px/Feld, 14 von 20 nicht 1:1); Labeling-UI skaliert
  1,5× hoch. Pro Aufnahme aus dem Quad ableiten, `233432`/`233929` neu exportieren.
- **43 Aufnahmen in 22 Verzeichnisformen** — Zielform festlegen, migrieren, Ausweichpfade löschen.
  Sollen Quellvideos beim Export automatisch mitkommen?
- **Labeling-UX:** eine Seite, Fragen nach `p_fehler × klassengewicht × neuheit` sortiert, mit
  eingewobener Zufallsstichprobe; Zwei-Hälften-Kreuztest über ALLE Labels; Mobile Bucket-Sort;
  Review-Provenance („angesehen und richtig" ≠ „nie angesehen"); Rig-Video-Upload im Web.
- **Belichtung vs CLAHE-Fenster:** das absolute Grauband 25–40 ist die falsche Parametrisierung,
  sobald geregelt wird (bei +1,7 EV fallen 64 % der besetzten Zellen heraus); CLAHE-Arme sind auf
  ungeregeltem Material trainiert. Und: das Gerät fährt 30 ms bei ISO ~3190 statt 66,7 ms.
- **CLAHE vor dem Blur** hebt Rauschen, das der Blur wegnimmt — `motionPxThr`/`motionThr` sind an der
  heutigen Kette kalibriert; erst Rauschboden messen (`scripts/motion_stats.py`), dann tauschen.
- **Markerlos** (`markerless.py`, 140/155 exakt): Orientierung fehlt (aus dem CNN), kein Gedächtnis
  über Frames (6 Frames ohne Brett), 9 Frames eine Zelle daneben, Perspektive unvermessen, kein Kotlin.
  CNN-Bretterkennung nur als Gedanke: Grid-Fit hätte das Veto.
- **Python zurückbauen:** Crops/Warp (dreifach: Python, Kotlin, TS), Brettgeometrie, TS-Warp —
  je erst Paritätstest, dann Umzug. Training und Datensatzbau bleiben Python.

## App

- **Compose-Layouts sind unprüfbar** (zweimal dieselbe Karte, 2026-08-02 und -21). Die Zusicherung
  „in einem 220-dp-Container ist jeder Aktionsknopf ≥ 48 dp" steht jetzt zweimal: `AlarmCardLayoutTest`
  für die Karte und `ActionTouchTargetTest` für die vier Primitive — letzterer fand `TextAction` bei
  40 dp (Material-Vorgabe, als einziges ohne `Touch.min`), gefixt 2026-09-22. **Offen bleibt die Form**:
  `CaptureSetupRoute`/`CaptureTurnRoute` stapeln wachsende Prosa, ein `aspectRatio`-Kind und die
  Aktionen ZULETZT in einer `Column` ohne Scroll und ohne Prosa-Deckel — dieselbe Anordnung wie beide
  Vorfälle. Nicht geprüft, weil `CaptureHost` ein `object` ohne Naht ist; testbar erst nach einem
  `CaptureSetupContent(...)` mit reinen Parametern.
- **Schema 5** (2026-09-04) setzt die Tracker-Knöpfe auf dem Handy einmal zurück; `boardSize` misst
  sich neu. Beim nächsten Start prüfen.
- **Tipps auf Zuruf** (Nutzer-Idee, 2026-09-21): `docs/game-review.md`. Stufe 1 (Tipp auf
  Knopfdruck, gesprochen und geschrieben) kostet fast nichts; Speech-to-Text gibt es nirgends. Drei
  Entscheidungen beim Nutzer: wie viel ein Tipp verraet, Kontingent pro Partie oder Phase, und ob ein
  Tipp die Engine hochfahren darf, wenn `gateBlock` sie gerade geopfert hat.

## Offene Fragen

- **Erster Quad vs Scan-Median** — ±6–25 Plies, Richtung je Video verschieden; `alignment_of` über
  den Lauf entscheidet, nicht Ply-Zahlen.

## Regeln aus den Messungen

- Eine neu exportierte Session ist ERGÄNZUNG, nie die Masse: zwei Videos bei 50 % des Train-Splits
  kosteten 105 Phantome. Vorher deckeln (`--source-manifest`).
- Das Modell schlägt nie auf einem Video vor, auf dem es trainiert wurde (`occluded_model.py` weigert sich).
- Ein Zell-Overlay ohne Feldnamen ist nicht prüfbar (`all_squares()` zählt von Reihe 1, der Warp
  legt Reihe 8 nach oben).
- Ein Fix im Exporter ist kein Fix in den Daten: nach jeder Änderung an `plan_rows` neu exportieren
  und das Feld prüfen. Nach jedem Re-Slice neu packen.
- Jede Verhaltensänderung am Motor läuft über `scripts/replay-regression.ps1` vorher/nachher;
  Phantome disqualifizieren, Verpasstes ist verhandelbar, `beyond`/`reordered` sind keine Fehler.

## Recorder: nur aufnehmen, was interessiert (Nutzer, 2026-09-13)

Entschieden: sparsam ist die Vorgabe, voll bleibt waehlbar. Gemessen rueckwirkend ueber 13 Aufnahmen
(148,5 min, 401 Plies, Export nutzt 3,07 % der Frames) — kein Ausloeser spart viel UND deckt alles:

| Ausloeser | Bytes gespart | Deckung | Verdeckung | Plies mit ≥ 8 |
|---|---:|---:|---:|---:|
| Commit ±2 s | 73 % | 69 % | 85 % | 74 % |
| Commit ±2 s ODER Bewegung | 55 % | 83 % | 96 % | 84 % |
| Commit ±4 s ODER Bew. ±1 s | 33 % | 94 % | 99,6 % | 91 % |

Gruende: stille Strecken sind kurz (Median 0,54 s), ein stilles Brett kostet fast so viel wie eine
Hand (17,5 gegen 20,1 Mbit/s, I-Frame jede Sekunde), und 76 % der Verdeckung liegt VOR dem Commit
(Median −0,8 s, p99 −10,9 s) — ein Ausloeser muss rueckwirkend behalten. Der `PreRollRing` ist ein
Einmal-Ding (`goLive()` setzt ihn auf `null`), ein getakteter Recorder ist neue Maschinerie.
Vorher die zwei billigen Hebel: `VIDEO_I_FRAME_SECONDS = 1` vergroessern (spart ohne Frameverlust),
und `PRE_ROLL_MAX_BYTES` = 80 MB ist die echte Grenze — bei 67,2 Mbit/s nur 9,5 s Vorlauf, unter dem
p99 der Verdeckung. Die Aufnahme muss ihren Modus und den behaltenen Anteil in `session.yaml` tragen.
