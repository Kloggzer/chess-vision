# TODO — offen, kurz, nach Wert

> Nur Offenes. Ein Punkt = ein bis drei Zeilen: was, warum, wie messen. Erledigtes wandert unten in
> „Erledigt" als EINE Zeile mit dem Messergebnis, Erzählung nach `docs/` oder Git. Die Langfassung
> aller Punkte bis 2026-09-05 liegt in `docs/todo-archive-2026-09-05.md`.

## Aufnahmen — was der Regressionssatz nicht hat (2026-09-05)

Stand: 9 von 10 Aufnahmen fehlerfrei, `222203` mit 3 Referenz-Plies wertlos, `233929` ein Phantom
am abgeschnittenen Ende. Der Satz ist gesättigt. Gezielt aufnehmen, mit der App (Ecken, Timeline,
`settings.json` liegen dann bei), jede mit **2 s Stillstand nach dem letzten Zug**:

- zwei Partien **von Schwarz gespielt** (`BLACK_BOTTOM`; der Replay liest die Seite aus `settings.json`)
- eine Partie im **dunklen Büro** ohne Lampe (der 2026-08-29-Standoff fehlt im Satz)
- eine **Sonderzug-Partie**: Rochade beide Seiten, en passant, Promotion + Unterverwandlung,
  Doppelschlag auf einem Feld
- eine **Blitzpartie** mit schnellem Hin-und-Zurück und Hand-Nachschleppe
- ein illegaler Zug im Schach (der `refusedStreak` ist im Korpus untestbar: 304/90/7 in beiden Armen)

## Tracker / Engine

- **Split (`commitHoldS`) bleibt aus, zwei Faelle offen (2026-09-13):** 11-59-12 verliert nach
  `Bxe4` (5032) 21 Plies, weil „board unchanged" bei 5050 die Referenz auf ein Snapshot-Bild zieht,
  das ab 5070 auf 24 Feldern abweicht — Ursache nicht isoliert. Messen: `splitsight2` gegen
  `drain15`; `docs/commit-latency.md` §4.
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
- **Jedes A/B braucht drei Seeds** (`docs/seed-noise-floor.md`); s3 und Composite haben eigene,
  ungemessene Grenzen; `val_conf_auroc` ist als Entscheider unbrauchbar.
- **Stored-Sessions v2:** 6 Packs mit Grid-Fit-Quad neu gepackt, 637 Hard-Empties geparkt. Offen:
  Dataset `real14-all-80-v2` bauen (Resolver muss die `-80-v2`-Verzeichnisse ziehen) und Retrain.
- **`load_packed` gibt ein nacktes 3-Tupel zurück**, das an zehn Stellen positional ausgepackt wird
  — mehrere Packs passen da nicht hinein, darum verweigert es Pack-Datensätze statt sie zu lesen.
- **Acht `scripts/*.py` kopieren `index = p2i or {r["path"]: r["_packed_idx"] …}` wörtlich** — eine
  Auflösung je Skript, keine davon mehrpack-fähig; `torch_data._pack_index` ist die eine Stelle.
- **Zwei `mm://`-Formate ohne gemeinsamen Bauer:** `synth_build._virtual_path` gegen die
  Kotlin-Schreiber; nur `packs.pack_name_of` liest beide.
- **`packed_meta.json` wird an vier Python-Stellen von Hand geschrieben** (`pack.py:208` und `:274`,
  `synth_build.py:278`, `packs.write_meta`) — kein Leser/Schreiber-Paar, die Schlüssel driften.
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
- **`labeled-session-pack` liest `frames/`, die es nicht mehr gibt** — aus `row["board"]` lesen.
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

- **Compose-Layouts sind unprüfbar** (zweimal dieselbe Karte, 2026-08-02 und -21). Zusicherung:
  in einem 220-dp-Container ist jeder Aktionsknopf ≥ 48 dp. Robolectric + `compose-ui-test`.
- **Schema 5** (2026-09-04) setzt die Tracker-Knöpfe auf dem Handy einmal zurück; `boardSize` misst
  sich neu. Beim nächsten Start prüfen.

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

## Erledigt — das Ergebnis in einer Zeile

- Commit-Latenz 333 → 200 ms median bei 15 fps (p90 400 → 267) ohne Score-Aenderung auf 15
  Aufnahmen: Sofort-Beobachtung (kadenzneutral) + Same-Frame-Drain (2026-09-12/13).
- Ankunftsregel fuer Schlagzuege und Sichtbarkeits-Serie gelten nur im Motion-Hold (`commitHoldS`);
  bei Standardwerten kosteten sie 467 ms je Schlagzug und einen Ply — jetzt bytegleich (2026-09-13).
- `refProvisional` laeuft vom Commit bis in den Export (`ref_provisional`), damit der Labeler die
  Frames vor der nachgezogenen Referenz kennt (2026-09-13).

- **Matt-Zug wieder da (2026-09-07):** die Segmentnaht-Uhr ließ den letzten Zug von 21-12-56 und
  20-57-45 „hinter dem Video" landen; nach dem Nahtfix neu eingelesen, 54 bzw. 55 Halbzüge.
- **Sichtprüfung zeigt saubere Bilder (2026-09-07):** `frame_review` je Ply — der am wenigsten
  verdeckte Frame der Haltezeit statt des Eintrittsframes, auf dem die Hand noch liegt; dazu
  „stimmt nicht" je Karte und ein Editor für `reference.pgn` im Confirm.
- **Commit-Latenz (2026-09-07):** die halbe Sekunde am PC ist Hand-Nachlauf plus 0,2 s Hold; weniger
  Hold macht Phantome bei 30 fps, weniger Settle-Frames ändern nichts. Das Handy liegt auf der
  Video-Uhr 0,06–0,3 s hinter dem PC, nicht 2–3× (Decoder-Nahtfehler, `docs/commit-latency.md`).
- **Verify-Schleifen (2026-09-07):** ein abgelehnter Kandidat geht sofort an die Recovery statt im
  nächsten Bild wiederzukommen; Regressionssatz 0 Phantome, Commit-Latenz max 35,2 → 4,7 s bei
  Median 0,47 → 0,53 s (`docs/verifier-stall.md` §4).
- **Audit 0824 + Blockregel (2026-09-06):** beide Partien exportiert und gelesen (Identität 15,6/19,2 %
  wie sonst); Rochade mit Hand war ein Sechser-Block und galt als Schatten — Zugfelder überleben die
  Blockregel jetzt, 153751 Ply 12 sperrt e1/f1/g1 ab Frame 1334.
- **Einpflege-Ansicht `/strom/einpflegen` (2026-09-06):** alle Aufnahmen nach Kettenschritt gruppiert,
  Filter in der URL (`?nur=confirm,export`, `?gescheitert=1`), derselbe Knopf wie auf der Karte, Nav-Zähler.
- **Züge vom Handy übernehmen statt am PC neu erkennen (2026-09-06):** `:desktop phone-candidate`
  schreibt `candidate.json` aus Record + `timeline.jsonl`, Median-Abweichung 0 Frames gegen den
  Replay (max 4 von 66 Plies, 20-41-33), 440 s statt 1 325 s — Minuten statt einer knappen halben
  Stunde, nicht Sekunden: der Geometrie-Scan dekodiert das Video weiterhin einmal ganz.
- **137 GB Memmaps gelöscht (2026-09-05):** 14 gemessene Experiment-Datensätze (`real13-mix-v4-128/-96/-pad0/-ff/-ffbase`
  85 GB, `real13-straight-80-v1/-v2`, `real13-c8d1-r96`, `abA/abB/ab-files-80`, `comp13-v3/-v4-80`,
  `sp-parity-pool`); Rezepte (`manifest.jsonl`, `split.json`, `dataset.yaml`) bleiben, Neubau per
  `dataset build --like <name> --from-packs`. Liste in `scripts/drop_measured_memmaps.py`.
- **Sessions direkt in eine Memmap (2026-09-05):** `session pack` / `pack import` /
  `dataset build --from-packs`; auf 11-59-12 zeilengleich (50 310/50 310, Differenz 0), 1,684/255
  mittlere Pixelabweichung — der Pool-Datensatz 944 MB, der Pack-Datensatz 18 MB.
- **`pOcc` ohne Coverage im Nenner, Alarm-Gate auf der Belegungsachse (2026-09-05):** beide
  zeilengleich zur Basis (pocc-cold, Replay-Cache v6, damit die Messung nicht den alten `pOcc` liest).
- **Desync-Kern und Window-End (2026-09-05):** die Serie trägt den Schnitt aller Blicke; das
  Window-End verlangt beide Endfelder (Paare: volle Maske, Knob `windowEndBothEnds`, an). Beide
  zeilengleich zur Basis — `diff_after_verify` feuert im Satz nie, der Knob braucht die Dunkel-Aufnahme.
- **Billiges vom 2026-09-05:** Mattstellung per CNN adoptierbar (`reachable` prüft nur noch den
  Gegner im Schach); ein Modell-Snapshot je Neustart statt zweier Lesungen; `SessionTimeline.close()`
  wartet den Writer bis 2 s ab und schreibt verdrängte Zeilen als Zahl in die letzte Zeile;
  `occluders` nennt `connectivity`.
- **Engine-Review 2026-09-03/04:** 34 Fix-Commits (Livelock im Dunkeln, Desync-Serie über Commit,
  Recovery-State, 3-Ply-Verify, Promotion-Prompt ohne Ausgang, Alarm-Bypass, Warps/Sessions-Leaks,
  monotone Uhr, LiveAlign-Generation, Teardown-Reihenfolge …), core-engine 9 743 → 7 724 Zeilen,
  Regressionssatz vorher/nachher zeilengleich, danach mit korrigierten Labels 9/10 fehlerfrei.
- **Rillen-Sensor blind seit dem nativen Crop-Warp (2026-09-04):** 576-px-Warp flaggte 13 Felder
  auf ruhigem Rig-Brett, vier Aufnahmen 0 Plies; eigener Warp in Kalibriergröße, AN = AUS.
- **Referenzen (2026-09-04):** `233432` `1.e4 e5 2.Nf3 Nf6` statt `Nf3 e5 e4 Nf6`; `222741` `Nxf3+`
  nie gespielt; `11-59-12` beide Knoten nach dem Tracker (Label hatte a3/a4 vertauscht) → 73/0/0.
  `222741`-Schwanz `c6 Qxe5 cxd5 Qd6+ Bd7 Qxd7#` am 2026-09-05 aus der Montage bestätigt → 33/0/0/0.
- **Belegungs-Fallback bei `inconclusive` (2026-09-04):** zeilengleich, nicht eingebaut.
- **CLAHE im Replay (2026-09-04):** nie gebaut, jetzt wie das Handy; zeilengleich zu ohne.
- **Scorer (2026-09-04):** `beyond` (164 von 171 „Phantomen" auf 11-59-12 lagen hinter dem Label)
  und `reordered` (gleiche Endstellung, Lookahead 12).
- **Replay folgt der Handy-Messung (2026-08-30):** Ecken, Frames, Startstellung aus der Aufnahme.
- **Verifier hängt (2026-08-30):** `verifyOutcome` leer hieß „nie gefragt"; Drift kostet die Pixel-Referenz.
- **Flat-field auf Brettebene (2026-08-30):** 57 % mehr Val-Fehler — Verstärkung hebt das Rauschen mit.
- **Abtausch auf einem Feld ist EIN Kandidat (2026-08-30);** frei gesuchte Dreier erfanden `Rg1`.
- **Rauschmaß in der Perf-Zeile (2026-08-30)** — `NoiseFloor`, zwei Frames je Sekunde.
- **Coverage-Gate im Replay (2026-08-25):** Diff-Engine unberührt, Stillness 7 → 67 Plies.
- **Pull statt Push (2026-08-25):** Lesungen 972 → 210, 6 238 → 891; nicht die Ursache von 003957.
- **Alarm auf Identität (2026-08-25):** Latch zu Recht — die Kette Identität kippt → Suche findet
  nichts → Brett läuft weg → Belegung widerspricht. `cnnColorAxis` ×5 auf 153751, aber 5 Phantome auf 154327.
- **`alarmMinS` 1,5 s (2026-08-26):** 153751 9/26/0 → 35/0/0.
- **Linse gegen Mesh (2026-08-21):** Mesh allein 0,9–1,1 px, Linse nicht den Fit wert; `calib.npz` weg.
- **SAM 3 unter autocast (2026-08-23):** 5,72×, 0 von 9 600 Zellen kippen. SAM 3.1 kein Upgrade.
- **per-position 8 → 2 kostet (2026-08-25):** 3/3 Seeds negativ auf jeder Metrik.
- **Vorlauf 1,4 s statt 20 s (2026-08-30):** der Encoder armt mit dem Kamera-Bind — so lang, wie die
  Kamera vor dem ersten Zug lief.
- **Hintergrund-Randomisierung, `export_static` (2026-08-21):** entfernt, nie benutzt bzw. gemessen.
- **Videostand (2026-08-21):** 25 von 43 lokal, 6 nur auf dem Handy — gesichert unter `data/footage/phone-backups/`.
- **Pre-roll-Offset (2026-08-19):** Ursache behoben; alte Einzeldatei-Sessions 1 Frame daneben, bewusst so.
- **Nur aufnehmen, was interessiert (2026-09-13, Nutzeridee):** das Video laeuft heute durch, auch
  wenn zehn Minuten lang dieselbe Stellung steht. Fuer Training ist das redundant —
  `corpus-is-threefold-redundant` misst, dass 3,9 % der Crops gleich gut sind. Der Encoder KANN
  schon puffern statt schreiben (`PreRollRing`, armiert bis zum ersten Commit), also ist die
  Maschinerie da. Offene Fragen vor einem Bau: was ist „interessant" (Bewegung? Hand? Commit plus
  Fenster?), und was kostet es an Occlusion-Material, das gerade aus den Hand-Frames kommt. Bei
  67 Mbit/s waere der Gewinn gross: 500 MB/min laufen sonst auch durch die Wartezeit.

