# CLAUDE.md — chesslab (Compressed)

> **Status:** Project in maintenance. Original specs (`specs/`) are historical; current state in `README.md` & `docs/architecture-review/`.

## Mission
- **Goal:** Build an auto-labeled image dataset for recognizing physical chess pieces on a board (fixed camera). Labels derived from FEN (64 examples per photo). Trains a per-square classifier.
- **Tracker:** The experimental move tracker lives in `android/` (Kotlin). The Python `chesslab track` command and its UI were deleted 2026-08-07, `track_feedback.py` with the capture rig on 2026-08-20. Python is dataset building, training and export only.

## Architecture & Data Flow
- **Path:** Camera -> Frame-Diff/Legacy Check -> Commit. The CNN path is asynchronous and sparse. `docs/tracker-flow.md` records a measured break ("no snapshot ever reached the engine"); specs/53 later measured `CnnSnapshot.gridOccluded` reaching the verify ladder in replay, so the break is unconfirmed for live — re-measure before quoting it.
- **Data Pipeline (`docs/data-pipeline.md`):** Sessions → Slice → Crop Pool → Dataset. *Note:* `unusable` flag is not retroactive; Parking does not prune the pool.
- **Temporal pass (2026-09-12):** the three-frame hand sensor is a chain step, `session
  temporal-pass`, between `matte` and `model-read`. SAM is the base; the sensor only ADOPTS frames
  SAM never cut (SAM then re-cuts them) and UPSERTS whole frames where SAM found nothing — never a
  cell-level merge (user, 2026-09-11). `docs/sensor-audit.md`.
- **Board store (2026-08-17):** a session keeps `boards/*.webp` (the rectified frame under its own quad), not source frames — 96 GB → 4.5 GB. It is the raster BOTH `crop_square` and `/api/cell` cut from. The row carries `board_size`/`board_border`; a reader that assumes its own scale cuts up to 59 px off. The board is written STRAIGHT (`realgames.straighten_boards`, 2026-08-21) and the row says so with `board_straightened`; every cut afterwards is a plain rectangle. A hand over the grooves makes a frame's own mesh worse than none (15.6 px against 16.1 raw), so a hand frame borrows the five nearest CLEAN frames' meshes — the camera does not move. Never straighten a second time.
- **Calibration:**
    - optics: measured by `:desktop undistort` into `lens.json`, NOT in the pipeline — see below.
    - `calibrate`: Board geometry (ArUco + Grid-Fit). ArUco is only "Coarse"; Grid provides accuracy. Markerless Cold Start is **not** supported.
- **Synth:** `build-synth` packs renderings directly into Memmap (no files). Rotation-Augment is train-time only.

## Non-Goals & Tech Stack
- **No Deep Learning Board Detection:** ArUco is only coarse correction.
- **No Reinforcement Learning:** Supervised Classification only.
- **Stack:** Python 3.11+, uv, Typer, OpenCV/NumPy/Pillow, python-chess, PyTorch (ROCm/CUDA), Android/Kotlin. License: GPL-3.0.

## Conventions
- **Classes (13 + coverage, 2026-08-18):** `wP`..`bK` + `empty` (`config.IDENTITY_CLASSES`).
  `occluded` is a **regression target**, not a class: `dataset build` defaults to `pieces13` and
  `train` to `--head occlusion`, which reads the manifest's `coverage` and masks every cell over
  `PIECE_VISIBLE_MAX = 0.15` out of the classification loss. Nobody paints occlusion any more —
  the human only checks that the alpha and the shown position are right.
  The 2-class `occupancy` scheme is **gone** (2026-08-20), Python and Kotlin: `--classes` takes
  `pieces13` or `pieces` only (`dataset_build.CLASS_MODES`).
  **Android ships coverage (Stand 2026-09-14):** the APK bundles SEVEN `p4*` models,
  `p4a-80-clahe` the `DEFAULT_MODEL`. All seven declare `coverage_output` — 13 class logits plus an
  INDEPENDENT coverage sigmoid in column 13 (`Observations.kt`, `Preprocess.kt`). Where it is
  declared, `TrackerService` switches the model-free arm OFF
  (`runGridOcclusion = coverageOutput != true`); the desktop replay runs both. The two arms have
  never been measured against each other (`docs/class-scheme.md`).
  **The threshold rides in the model, not the engine, and all seven now carry a MEASURED one
  (2026-09-14):** `coverage_gate` in the model's `config.json`, read by `ModelSpec`, applied onto
  `TrackerConfig.pOccludedThr`. Measured on the 12 recordings all seven held out, 104 337 piece
  reads against the SAM matte. **lambda = 3, because phantoms are the veto** (user, 2026-09-14:
  "das wichtigste ist keine phantome zu haben") — lambda is a DECISION, not a measurement, and 3
  demands 75 % per read where 2 demands 67 %. It costs about one point of the reads. Result:
  `p4a-128`/`p4afull-128` 0,35, `p4a-80-clahe` (DEFAULT) **0,25**, `p4a-80` 0,15, the three plain
  p4 runs 0,05. Under lambda 2 three of them would sit looser (clahe 0,35, `p4-128` 0,10,
  `p4full-128` 0,15). **0,5 was too loose for every one of them** — in the band it let through,
  the best sits at 47,8 % correct and the default at 29,5 %. `ModelSpecTest` pinned the gap and is
  green since. Repeating the measurement, and the guard bug that nearly voided it:
  `docs/occlusion-gate.md`.
  `BUNDLED_MODELS` is hand-maintained: a model merely dropped into `assets/cnn_model/` never
  appears in the picker.
- **Geometry:** Squares `a1`..`h8`; Corners `[a8, h8, h1, a1]`.
- **Config:** Paths/Parameters in YAML. Classes only in `config.CLASSES`.
- **Cache:** per-session crop counts via `manifest_cache.py` (mtime-keyed); its web callers went with the FastAPI layer.
- **Comments:** Target is **3 lines**. Up to **5** when it genuinely does not fit — 5 will be enforced soon. Comments say *why*, never what the code already says. Longer prose belongs in `docs/` with a one-line pointer. **Default is NO comment**: a small function (handler, wrapper, one-purpose helper) whose name plus imports tell the story gets none, and a comment longer than its function is wrong — delete it, don't trim it (User, 2026-08-15: "der kommentar ist länger als die funktion und sagt genau nichts").

## Known Pitfalls (Critical)

### 0. Frame selection (2026-08-18)
- **Measure first, pick after.** `framescan.py` scans every 3rd frame (distilled hand gate
  2,1 ms + grooves 13,6 ms, which only NAME the squares) before anything is chosen; `classify`
  then rules per frame. RT-DETR and `skin_patch` are gone — `docs/hand-gate.md`. The old
  export planned 8 boards per position and flagged afterwards, so a flagged slot went missing:
  20 % of positions kept their 8, now 91 % (`docs/frame-scan.md`).
- **The board is the witness, not the hand.** Labels hold while the position still looks like the
  commit's. A hand over an unchanged board is `occluded` and KEEPS its FEN — that material is what
  the occlusion labels are made of. Only `next_touches` decides `stale`; all 64 cells flagged the
  player's shadow on rank 1 (median 7 cells).
- **`boards/` is the clean p8 stock, `dirty/` the pile**, each row carrying `dirty_reason`.
- **`_persistent` nahm die VEREINIGUNG statt der Schnittmenge (gefixt 2026-09-14).**
  `all(off[j] …)` prueft bei Mengen nur auf nicht-leer, also galten zwei abwechselnd flackernde
  Zellen gemeinsam als dauerhafte Aenderung — `classify` erklaerte daraufhin den Rest des
  Intervalls zu `stale`/`changed`, und diese Frames fielen aus dem sauberen Vorrat. Seitdem
  entscheidet die Schnittmenge. **Der Fix aendert nur KUENFTIGE Exporte**; was auf der Platte
  liegt, entstand unter der alten Regel. Ein einzelner Schlussframe haelt trivial durch, kostet
  einen Frame und ist kein Fehler.
- **The CELL decides now, not the frame (2026-08-22).** With `settle_dev` on the row and a matte
  beside it, `dirty_reason` only steers what SAM mattes first: a cell over `PIECE_VISIBLE_MAX` keeps
  its FEN label (coverage takes it out of the loss), a visible one is checked against the interval's
  settled board, and one that departs becomes a card on the `Strittig` lane. That is what rescues
  `stale`/`changed` frames cell by cell (`docs/position-check.md`).

### 0.1 Crop sizes: 128 belongs to `board_size` 928, not to the pool (2026-08-23)
- **Two consumers, two sizes.** `data/crops/<tag>/` at 128 px is the artefact for the
  HUMAN (labeling lane); `packed_images.u8` at the target size is what the MODEL sees.
  Both should be cut FROM THE SOURCE, never one from the other.
- **Why 128:** it is the native crop box of the real export — `board_size` 928, cell 116,
  `pad_side` 0.05 gives 127.6 px, factor 1.000. For a 4K composite the box is 176, for
  1080p it is 90, so forcing 128 there resamples once too often (`docs/data-pipeline.md`
  3.1). Do NOT fix that by changing the pool size — that changes what the labeler sees.

### 1. Model & Normalization
- **Occlusion:** Models without the `occluded` class have `pOccluded = 0.0`. Hand verification must rely on the **MODEL-FREE** arm (`gridOccluded`) because the CNN arm is blind. Measured on 003957's 67-ply reference: 38/67 plies with 4 invented → **67/67 with 0 invented** (raw map), **LCS 65/67** under the adjacency rule. The gate only counts HAND-SHAPED flags (≥ 1 orthogonally adjacent pair): counting any flag blanks a whole replay on one leaning piece (c8), and a count threshold of 3 lets the leaving hand's 2-flag tail commit the fabrication it exists to stop.
- **Normalization:** BatchNorm works well; the learning rate is the critical factor, not the norm choice. Never rank normalizers at one shared rate — sweep the rate per normalizer or do not compare.
- **Metrics:** `val_acc` correlates inversely to the Veto Metric. Use `sweep_infer_size.py`.
- **The settle gate is blind in the dark corner.** The board carries a light gradient (h3 at 156,
  a7 at 20 on 20-41-33), so a black piece on a near-black square moves the score by ~1.5 against
  `SETTLE_LIMIT`. `interval-check.jsonl` measures this per ply instead of hiding it; closing it
  means normalising by the cell's own contrast, not moving the threshold.
- **Die Schwelle steht seit 2026-09-09 auf 45, nicht 15.** 15 war gegen den Rillen-Sensor
  geeicht, nicht gegen das Bild: es verwarf 2 999 Zellen, die die Coverage nicht ohnehin maskiert,
  und vier Fünftel davon lagen unter 35 und waren gewöhnliches Material — der Nutzer hakte die
  Karten der Reihe nach als unbedenklich ab. Über 45 waren 24 von 24 Stichproben Hände auf
  Feldern, die der FEN als Figur führt. Wer die Zahl wieder senkt, flutet die Lane.
- **Bewertet wird nur, was der Verlust auch lernt (2026-08-24):** der Occlusion-Verlust maskiert
  alles über `PIECE_VISIBLE_MAX`, also zählen `CHECKPOINT_WEIGHTS`, `auroc` und `conf_wrong` nur
  sichtbare Zellen. Über alle Zellen gerechnet sah das Modell 8 Punkte besser kalibriert aus, als
  es ist: verdeckte Zellen sind zu 55–63 % falsch, dabei aber *unsicher*.
  **Arme mit verschieden geschnittenem Val sind auf `piece_acc` gar nicht vergleichbar
  (2026-08-26):** die Ausdünn-Varianten trugen 2,9 % bis 15,0 % verdeckte Val-Zellen, und die
  Rangfolge der Arme war exakt die Rangfolge dieses Anteils — der gemeldete Sieger verschwand,
  sobald alle gegen DENSELBEN Val-Satz auf sichtbaren Zellen gemessen wurden
  (`docs/per-position-mix.md`, Korrektur). `val_visible_piece_acc` steht deshalb in
  `metrics.jsonl`, und Quervergleiche laufen über `chesslab eval --dataset <gemeinsamer>`.
  Aus demselben Grund kommen die Klassengewichte aus den sichtbaren Zeilen — Verdeckung trifft weiß 11–15 %, schwarz
  2–6 % (`occlusion-asymmetry`), die Gewichte in `split.json` liegen sonst bis zu 8 % daneben.
- **Die 0,15 ist gegen den RILLEN-Sensor geeicht, nicht gegen das Bild (gemessen 2026-09-16).**
  Erstmals gemessen (val+test, 84 608 Zellen), ab wann das Modell die Figur wirklich nicht mehr
  liest: im Band 0,15-0,25 noch **74 %** richtig, bei 0,25-0,40 **67 %**, bei 0,40-0,60 noch
  **31 %**, und erst ab **0,6** unter Zufall. Die harte Kante
  wirft also Signal weg, und der Schwanz darueber ist nicht schwach, sondern systematisch falsch.
  `chesslab train --coverage-weight soft` folgt stattdessen der gemessenen Kurve (S-Kurve auf 0,6
  gestaucht, liegt an jedem Messpunkt UNTER der Messung). **Vorgabe bleibt `hard`** — `soft` ist
  eine Rezept-Aenderung und macht Laeufe mit dem Archiv unvergleichbar. Die METRIK wandert nie mit:
  `classification_eligible` und `val_visible_piece_acc` bleiben auf 0,15, sonst wird jeder Arm auf
  seiner eigenen Zellmenge benotet. Zahlen, Vorbehalte und die Formel:
  `docs/coverage-weight-2026-09-16.md`.
- **Die gespeicherte `coverage` driftet gegen ihre Crops (gemessen 2026-09-16).** Sie ist ein
  Schnappschuss vom Matten; ein Re-Export verschiebt die Ecken, `crop_square` schneidet mit den
  neuen, die Zahl bleibt stehen. 13 von 24 Aufnahmen betroffen, 0,10 % der Zellen ueberqueren
  dabei `PIECE_VISIBLE_MAX` — fast alle auf der Grundreihe und als Totalkipper von 0,000 auf 1,000.
  `chesslab occluders recut-coverage --all` rechnet sie aus den Alphas neu (kein SAM, Minuten).
  **Nach jedem Re-Export faellig**, und nichts erinnert daran.
- **Coverage Matte Trap:** `training/torch_data.py:422` defaults unmattered crops to `coverage = 0.0`, making them indistinguishable from genuinely clear squares. Mixing matted and un-matted sessions into one occlusion-head build teaches the head that hands do not exist. Use matted sessions only.
- **SAMs ABSAGE ist kein sauberes Brett (2026-09-15).** Eine `matte.jsonl`-Zeile mit `skipped`
  (`zone too big`: Alpha über 60 % des Bretts) trägt WEDER `concepts` NOCH `coverage`. Zweimal
  wurde das als "nichts gefunden" gelesen statt als "nicht gemessen": `hand_gate.gate_label`
  lehrte dem Schüler damit die verdecktesten Bretter des Korpus als handfrei, und
  `temporal_matte.adopt_proposals` zählte sie als "schon gemattet", so dass genau die Frames ohne
  jedes Alpha ungefüllt blieben und mit `coverage = 0.0` ins Training gingen. `matte.matte_status`
  filtert an derselben Stelle richtig — **wer `matte.jsonl` liest, prüft `coverage` auf `None`.**

### 2. Data & Splits
- **Ohne Memmap kein Training (2026-08-24):** ein veralteter Pack fiel still auf den Datei-Loader
  zurück — die Folds und die SWA-Läufe liefen dreifach langsam an ihm vorbei, ohne dass es jemand
  sah. `_require_pack` bricht jetzt ab; `--allow-unpacked` nur für Sets unter der Packgrenze.
  **Nach jedem Re-Slice neu packen**, sonst trägt der Pack Pixel von vorgestern.
- **Hard-Negative-Mining auf Trainingsdaten findet fast nur Verdecktes (2026-08-24):** 98,6 % der
  gefundenen Fälle liegen über `PIECE_VISIBLE_MAX` und sind damit aus dem Klassifikationsverlust
  maskiert — sie 4× zu verstärken kostet Sampling-Budget und lehrt den Figurenkopf nichts. Grund:
  auf dem Trainings-Split ist alles Lernbare gelernt, übrig bleibt, was der Verlust nie sah
  (sichtbar UND überzeugt falsch: 156 von 292 105 Zeilen). Mining lohnt nur auf **ungesehenem**
  Material. `scripts/mine_hard_empty.py --dataset <name>` liest Trainings-Split und Memmap statt
  des splitlosen Crop-Pools; `--fresh` verhindert, dass Zeilen aus einem anderen Zuschnitt
  überleben.
- **Der Val-Satz gehoert nach KLASSENABDECKUNG gewaehlt, nicht nach Bildqualitaet (2026-09-10):**
  `2026-09-06-21-29-35` sah sauber aus (Schaerfe 0,90x seiner Klasse) und traegt **null weisse
  Springer**, 12 schwarze Damen, 73 % `empty`. Damit ist `macro_recall` — und ueber ihn `score`,
  das Checkpoint-Kriterium — auf vier von 13 Klassen Rauschen, und Laufvergleiche darunter sind
  nicht belastbar. 13 der 22 Aufnahmen haben volle Abdeckung; `docs/val-choice-2026-09-10.md`
  nennt die Kandidaten und warum der Dunkelfilter den alten Val unbrauchbar gemacht hat.
- **Schaerfe nur je Auflösungsklasse vergleichen (2026-09-10):** die Laplace-Varianz haengt an der
  Quelle — 4K 1359, 1440p 407, 1080p 521 im Median. Ein korpusweiter Median mischt drei Kameras.
- **Reproducibility:** Splits are not deterministic from Params → **always use `split.json`**.
- **Geometry Fix (2026-07-31):** Old dataset was mis-aligned (3-6px Offset). Crops must be re-sliced. Old Path-A numbers are void.
- **Hard Empties:** `hard_empty.jsonl` is global training input. **Park** if not in use (`data/_parked/`).
- **Datensätze werden session-basiert gebaut (2026-09-11):** jede Aufnahme EINMAL je Größe nach
  `data/packs/<session>-<size>/`, der Datensatz zitiert sie über `--from-packs` statt die Pixel zu
  kopieren. Eine Aufnahme mit `boards/` wird aus dem Brett geschnitten, ein Komposit aus seinem
  Pool (`--pool <tag>`, 54 liegen in zweien) — beides über dieselben Funktionen wie der Monolith,
  **30 580 Zeilen bitgleich, 0 Abweichungen** gegen `real13-mix-v6-128`. **Die v6-Saetze sind seit
  2026-09-11 umgehaengt**: `real13-mix-v6-128` und `-80` zitieren ihre Packs (617 bzw. 616 MB statt
  41,4 und 16,2 GB), ihre Memmaps sind geloescht. Umgehaengt heisst: NUR die Spalte `path` wurde
  gedreht, damit Zeilen, Splits und jede alte `config.json` gueltig bleiben — ein `--like`-Zwilling
  trug 228 Zeilen mehr, weil der Brettweg live schneidet und der Pool ein Schnappschuss ist.
  `-80-clahe` bleibt Monolith, `bake_pack` kennt keinen Session-Pack. **Ein Pack ist
  unveränderlich, aber nicht automatisch aktuell**: ein Pack vom 2026-09-05 trug 3 333 Zeilen zu
  viel und Pixel bis 68 Graustufen daneben, und nichts hütet das — nach einem Re-Slice die Packs
  der Aufnahme wegwerfen. Migration, Platzrechnung und was `-clahe` blockiert:
  `docs/session-packs.md`.

### 3. Android & Build
- **Inference:** ~16ms per frame (small model). Execution provider AUTO is correct; leave it alone.
- **Testing:** Gradle Tasks are "up-to-date" even with errors → always use `--rerun-tasks`.
- **UI:** Text-first Controls need `contentDescription`. Spacing strictly on 12dp Tokens (Guard enforced).

### 4. Installation & Hardware
- **Phone: back up `files/` before touching the install.** On 2026-08-20 six source videos
  (2.4 GB) existed ONLY on the device, five of them with no backup at all. Back up with
  `adb exec-out "run-as com.chesslab.tracker tar cf - files" > files.tar` into
  `data/footage/phone-backups/<serial>-<ts>/`. Measured the same day: `adb install -r` with the
  SAME signing key **kept** all 39 sessions — what wipes `files/` is a signature mismatch (Android
  then uninstalls first) or an instrumented test run. Prefer the emulator anyway.
- **Undistortion:** the lens model is NOT in the pipeline. Measured 2026-08-21 over three rig
  recordings, hold-out: raw 15.2–16.6 px bow, the grid mesh alone 0.9–1.1, the fitted lens alone
  3.0–4.4, both 0.4–0.7. On a 116 px cell the mesh's 1 px is under a percent, so the lens is not
  worth its own fit per recording. `:desktop undistort` still exists and still refuses the phone
  (k1 ≈ 0). The FIT lives in Kotlin (`LensFit.fitLens`), the model rides in `lens.json`, and
  `warp_padded(..., lens=)` is the seam — nothing passes it today. Python's `lens.py` and the
  whole `calib.npz` path went on 2026-08-21: it solved from many board POSES, which a fixed
  mount cannot give, so it always refused.

## Verification
- **Alarm & Occlusion:** `docs/alarm-path.md` (was den Latch haelt und was er sagt),
  `docs/occlusion-gate.md` (die Schwelle je Modell), `docs/emission-correlation.md` (warum
  Cooldowns keine Unabhaengigkeit kaufen und mehr Reads nichts beitragen).
- **Strom:** `docs/battery.md` — das Messgeraet (`cmd battery get -f current_now`, NEGATIV heisst
  laden), die Aufteilung, und warum die Bildrate der Hebel ist und nicht die Rechenzeit. Wer die
  Bildrate anfasst, muss `motionThr` mitziehen: `TrackerService.engineConfig()` tut das mit
  `× 30 / fps`, und die Kopplung ist am Regressions-Satz gemessen.
- **Python:** `uv run pytest`, `ruff`, `vulture` (min_confidence 80).
- **Abdeckung:** erstmals gemessen 2026-09-14 — Python 67,1 %, Kotlin 64,7 % ohne `:app`,
  Web `lib/` 73,9 %. Die drei Aufrufe und die zwei Fallen (pytest-cov toetet den CUDA-Graph-Test,
  `:app` lieferte keinen Kover-Bericht, solange `ModelSpecTest` rot war — seit den gemessenen
  `coverage_gate`s ist er gruen, die Falle ist also zu): `docs/test-coverage-2026-09-14.md`.
- **Producer order:** `session settle-scan` writes `settle_dev`/`settle_seen`; only then does
  `realgames position-flags` have anything to lay out. Without a measurement a cell is not
  undisputed, it is unmeasured, and the lane says `—` rather than `0`. Die Kette kennt den Schritt
  seit 2026-09-15 als eigene Sprosse zwischen `export` und `matte` und prueft ihn an `settle_dev`
  in der `log.jsonl` — vergessen heisst jetzt Knopf, nicht leere Lane.
- **Herkunft statt Existenz (2026-09-15):** `pass.json` und `model-reads.jsonl` tragen `_source`
  (`chesslab.provenance`): Mtime-plus-Groesse der `log.jsonl`, bei den Lesarten dazu das Modell.
  `chain.ts` vergleicht statt nur zu existieren, ein Lauf von vor dem letzten Re-Export macht die
  Sprosse wieder auf. Eine Datei OHNE Stempel gilt weiter — alles, was heute auf der Platte liegt.
- **Android:** `gradlew.bat :app:ktlintCheck ...` (check all modules!). Emulator via `scripts/android-emulator.ps1` (never use `installEmulator` due to shared devices).
- **Routen-Ratsche (2026-09-16):** `platform/app/route-coverage.txt` listet jede API-Route ohne
  Test und darf nur schrumpfen — `lib/route-coverage.test.ts` schlaegt an, wenn eine neue
  ungetestete Route dazukommt, wenn eine getestete ihren Test verliert, oder wenn eine Zeile auf
  eine Route zeigt, die es nicht mehr gibt. Ein Test zaehlt, wenn er `@/app/<pfad>/route`
  importiert. Bewusst die ROUTEN und nicht die Gesamtabdeckung: die Hoehe sagt wenig
  (`core-engine` stand bei 92 % und trug vier Stellungs-Fehler), die Routen sind die duennste
  Stelle und tragen den Handy-Weg. **Stand 2026-09-16: 0 von 29 ohne Test** — die Liste ist leer,
  und die Ratsche haelt sie so. Sie hielt an dem Tag 18.
- **JSONL-Ratsche (2026-09-16):** `lib/jsonl.ts` ist der eine Leser fuer `.jsonl` in der Web-App
  — Leerzeile ueberspringen, halb geschriebene letzte Zeile ueberspringen, nur Objekte. Wer selbst
  in Zeilen schneidet, beantwortet diese drei Fragen neu und lag dabei schon mehrfach daneben;
  `platform/app/jsonl-readers.txt` listet die 24 Schnitte in 11 Dateien, die es noch tun, und darf
  nur SCHRUMPFEN (`lib/jsonl-ratchet.test.ts`); Testdateien zaehlen nicht mit, die zerlegen ihr
  eigenes Fixture. Erste Naht der Vertrags-Familien, Punkt 21 der Entscheidungsvorlage.
- **Die Treuhand fuer JSON (2026-09-16):** jeder Schreib- und Lesevorgang auf `.json`/`.jsonl`
  laeuft durch `chesslab.ioutil` — `read_jsonl` (halbe LETZTE Zeile faellt weg, eine kaputte
  MITTENDRIN wirft, `newline=""` weil 1127 der 1329 Dateien CRLF tragen), `write_rows`/`write_json`
  (Nebendatei, dann umhaengen), `append_rows` (repariert erst den abgerissenen Schwanz),
  `update_rows`/`write_rows_guarded` (Stempel-Riegel, `Contested` statt stiller Ueberschreibung).
  `read_jsonl` liest `utf-8-sig`: PowerShells `Out-File` stempelt hier ein BOM, und eines liess
  2026-08-16 jeden Datensatz-Bau am Vorflug sterben.
  Zwei Ratschen, beide duerfen nur SCHRUMPFEN: `tests/json_doors.txt` (wer selbst SCHREIBT) und
  `tests/jsonl_readers.txt` (wer selbst in Zeilen SCHNEIDET). Was drauf bleibt, sind Artefakte
  EINES Laufs und drei Fehltreffer; was Sessions teilen, ist umgestellt. **Vor dem Umstellen
  gemessen**: 40 000 Manifest- und alle 9 423 `matte.jsonl`-Zeilen ueberstehen
  `read_jsonl` + `write_rows` BYTEGLEICH — erst danach durften die Aufrufer ihre rohen Zeilen
  aufgeben.
  **Auch `scripts/` faellt unter beide Ratschen** (2026-09-16): dort waren es 61 Leser und 36
  Schreiber, jetzt 13 und 7.
- **Drei Sprachen, dieselbe Politik (2026-09-16):** `src/chesslab/ioutil.py`,
  `platform/app/lib/jsonl.ts` + `lib/atomic.ts`, `android/tracker-runtime/.../io/Jsonl.kt`.
  Ueberall entscheidet der ZEILENUMBRUCH, ueberall wird ueber eine Nebendatei geschrieben und die
  bei einem Abbruch geraeumt. **Kotlin braucht kein `appendRows`** — gemessen null Stellen, die an
  eine fremde oder aeltere Datei anhaengen; `SessionTimeline` und `SessionRecorder` kuerzen ihre
  Datei im Konstruktor. Der Bruch lag auf der LESE-Seite: die Desktop-Werkzeuge warfen auf die
  halbe letzte Zeile, die das Telefon erwartbar hinterlaesst (`TornTailTest`), und `RecordedFrames`
  verschluckte umgekehrt eine kaputte Zeile MITTENDRIN.
  **Die Web-App hat denselben Treuhaender**: `lib/atomic.ts` mit `writeFileAtomic`,
  `writeFileAtomicGuarded` (Stempel-Riegel, `Contested`) und `appendRows`. Rohes `appendFile` an
  eine `.jsonl` mit halber letzter Zeile klebte die neue Zeile daran — aus dem von `lib/jsonl.ts`
  tolerierten Schwanz wurde damit Korruption MITTENDRIN, auf die danach JEDES Lesen wirft;
  `appendRows` schneidet vorher ab (`lib/append-tail.test.ts`). `platform/app/write-doors.txt`
  haelt die Ratsche: Stand 3 Stellen in 2 Dateien, beim Start der Arbeit 12 in 10.
- **Comment budget:** `CommentBudgetTest` (in `:app`) is a ratchet over all Kotlin modules — enforcement fires at **5** consecutive comment lines since 2026-09-15, the same hard limit TS and Python carry; target is still 3. Note that a Kotlin KDoc's `/**` and `*/` count, so 5 is three prose lines. `android/config/comment-budget.txt` may only shrink; after cleaning a file run `uv run python android/scripts/comment_budget.py`. TS and Python have twins (2026-08-15): `platform/app/lib/comment-budget.test.ts` with `platform/app/comment-budget.txt`, and `tests/test_comment_budget.py` with `tests/comment_budget.txt` — hard limit 5 lines for new files, budget entries may only shrink.

## Training: der Feed ist nicht mehr der Engpass (2026-09-07)
- **`--num-workers 2`, nicht 8.** `config.DEFAULT_NUM_WORKERS` steht weiter auf 8; das ist seit
  dem Loader-Umbau Verschwendung. Gemessen gegen das GPU-Budget von 127 µs/Crop: 1 Worker reicht
  warm (104 µs), ist kalt aber zu langsam (129 µs); **2 sind cold-safe** (79 µs). 3 und 4 halten
  nur Speicher. Zwei parallele Läufe brauchen damit 4 statt 16 Prozesse — die Stellschraube, an
  der die Speicher-Abstürze hingen (`docs/batch-aug.md`).
- **Immer mit `--batch-aug`.** ColorJitter, Gamma, Blur, Rauschen und Cutout laufen dann als EINE
  Batch-Operation auf der GPU statt je Crop in PIL: 66× billiger, weil sie overhead- und nicht
  rechengebunden sind (der 3×3-Blur kostet je Crop 846 µs, ToTensor für denselben vollen
  Durchgang 37). Gleiche Verteilungen, aber float statt uint8 — **statistisch dasselbe Rezept,
  nicht bitgleich**. Die Reihenfolge stimmt seit 2026-09-08 wieder: `BatchGeometry` nimmt Affine
  und Flips mit aufs Gerät, hinter die Photometrie, bitgleich zu `torchvision`s NEAREST-Affine.
- **Eine Op mit Stärke 0 ist nicht weg.** `T.ColorJitter(0,0,0)` zieht weiter Zufallszahlen und
  wendet die Identität an; `--aug-scale 0` holte deshalb nur 25 % statt 73 %. `build_transform`
  lässt sie seitdem weg statt sie leer mitlaufen zu lassen.
- **CLAHE gehört in den Pack, nicht in den Loader** (`chesslab dataset bake`, `docs/pack-bake.md`).
  Der gebackene Pack trägt seine Parameter in `packed_meta.json["baked"]`; `train` lässt den
  Operator dann aus dem Loader, schreibt ihn aber weiter in `config.json` — **das Serving sieht
  rohe Kamerabilder und muss ihn selbst rechnen.**
- **Der Feed ist gemessen, nicht geschätzt:** 985 → 76 µs/Crop. Weitere Loader-Arbeit kauft null
  Wanduhrzeit, die GPU ist der Boden.
  **Seit den Session-Packs ist der Boden die PLATTE, nicht die GPU (2026-09-12):** auf
  `real13-mix-v7-128` (48,1 GB Packs, 13 GB freier Cache) wartet der Trainingsschritt zu 68–77 %
  auf Daten, bei 80 px (18,8 GB) zu 55 %. **Mehr Worker helfen nicht** — gemessen 2 gegen 4, warm
  10,7 gegen 10,6 s je Epoche und dieselbe Wartezeit auf die Zehntelsekunde; vier Prozesse stehen
  an derselben Platte an. Und die Worker-Zahl ist **kein freier Schalter**: der Trainingsverlust
  war NICHT bitgleich (0,733245 gegen 0,741672), ein Wechsel macht Läufe unvergleichbar.
  `scripts/worker_probe.py` fährt die Probe; sie braucht einen ruhigen Rechner. Der Trainings-Batch auf 8 Bretter zu heben brächte 17 %,
  ändert aber BatchNorm-Statistik und Gradientenrauschen — für die Folds also nein.

## Der Trainingsschritt ist startgebunden, nicht rechengebunden (2026-09-10)
- **Das Rezept, das gilt** — auf dem Spike-Stack (`tmp/compile-spike`, PyTorch 2.13/ROCm 10/Triton):
  `--batch-aug --compile-batch-aug --compile-model --fused-adamw`, Worker bleiben bei 2
  (`BATCH_AUG_WORKERS`). Gemessen 30,3 → ~11,5 s je Epoche gegen den alten Ausgang.
  **Alle vier Schalter bleiben per Vorgabe AUS**: der gepinnte Stack hat kein Triton und stirbt
  an den Compilern, und `--fused-adamw` verschiebt die Parameter um 2,4e-7 — eine stille
  Umstellung machte neue Laeufe mit dem Archiv unvergleichbar.
- **Gemessen ist die feste Startzeit, nicht die Rechnung.** Die Gerade ueber die Batch-Groessen:
  eager 11,4 ms fest + 33,5 µs je Crop, kompiliert 3,9 ms fest. Bei 256 Crops sind also **59 %
  des Schritts reiner Startaufwand** — 2 611 aten-Aufrufe zu 4,6 µs. `torch.compile` macht 860
  daraus. Der Auslastungszaehler folgt genau dem Arbeitsanteil (43 % eager, 51–68 % kompiliert);
  **er ist keine Effizienzzahl**, und 100 % sind mit 6,7 MMAC je Crop nicht erreichbar.
- **`--fused-adamw` entfernt eine echte Synchronisation je Schritt**, nicht nur Aufrufe:
  `GradScaler._maybe_opt_step` liest `found_inf.item()` von einem CUDA-Tensor und leert die
  Warteschlange. Mit `fused=True` reicht `GradScaler.step` `grad_scale`/`found_inf` als
  Geraete-Tensoren durch und geht daran vorbei. **Was es bringt, haengt am Engpass**: bei
  CPU-Augmentierung 1,07x, mit kompilierter Augmentierung 1,55x. Die Modell-Mathematik bleibt
  bitgleich.
- **Qualitaet: kein messbarer Unterschied, drei Seeds, drei Arme** (eager / nur Augmentierung /
  beide Compiler). Gepaart erreicht der beste Kandidat t = −1,90 bei df = 2. Nach zwei Seeds sah
  eine Rangfolge sauber aus, Seed 44 kippte sie — `docs/compiled-batch-aug.md`.
- **`best` taugt nicht zum Vergleich.** Es ist das Maximum ueber 60 verrauschte Ziehungen und
  liegt konstruktionsbedingt 2,3–2,9 sd ueber dem Niveau des Laufs, gemessen im Schnitt 2,9 —
  aber der Aufschlag streut selbst zwischen 1,4 und 6,1 sd und kuerzt sich deshalb NICHT heraus.
  Ein Lauf hatte seinen Bestwert bei Epoche 4 von 60. Vergleiche laufen ueber das Mittel der
  letzten 10–20 Epochen, gepaart je Seed. Das Rauschen kommt dabei zu 94 % aus dem Modell und
  nur zu 6 % aus dem Val (11 684 sichtbare Figurenzellen, Stichproben-sd 0,0024) — ein groesserer
  Val hilft nicht, Mitteln ueber Epochen schon.
- **Ein fertiger Lauf blockierte im Teardown** (ROCm-Windows, dieselbe Stelle wie `matte`):
  `cli.py` verlaesst den Trainingsprozess jetzt mit `os._exit`, nachdem alles geschrieben ist,
  und gibt den Lock von Hand zurueck. Ein Sweep darf nicht am Exit-Code haengen, sondern an den
  Epochen auf der Platte.
- **Zeiten nur auf ruhigem Rechner.** Derselbe Arm mass 13,17 / 15,71 / 19,54 s je nachdem, was
  daneben lief. Immer zwei warme Wiederholungen je Arm, Aufwaermepochen verwerfen — der
  Lauf-zu-Lauf-Abstand war 0,8 s bei einem Effekt von 1,1 s.

## Export: der Decoder holt nur noch, was gewollt ist (2026-09-08)
- **`Recording.frames(wanted=…)` statt selbst filtern.** `cap.read()` ist `grab()` + `retrieve()`;
  der Export will 11 % der Frames und bezahlte die Farbkonvertierung für alle — zweimal, einmal
  für den Fit und einmal für den Warp. `read` 10,4 ms je Frame gegen `grab` 1,96 ms, am echten
  Zeilensatz 25,5 s → 4,7 s je Durchlauf. Bitgleich, und so getestet.
  **`measure_settle` ist ausgenommen**: seine Cluster sind per Konstruktion lückenlos.
- **Bretter kodieren nebenläufig, `BOARD_WRITERS = 4`.** `imwrite` ist 73 % der Schneide-Phase
  (50 ms je 928-px-Brett bei Qualität 95, die eine Datenentscheidung ist und bleibt) und gibt das
  GIL frei: 66,3 s → 22,8 s. Vier, nicht mehr — ein Frame in Flug ist 11 MB.
- **Die drei Frame-Phasen laufen in Prozessen** (`--workers`, Vorgabe 4). Erlaubt ist das, weil die
  Segment-Zählung exakt stimmt; **ein Seek ist es NICHT** (2 von 7 Sonden lieferten andere Pixel,
  während `POS_FRAMES` den gefragten Index meldete), also startet ein Worker an der Segmentgrenze
  (`Recording.segment_base`) und läuft mit `grab` vor. Aufgeteilt wird in zusammenhängende
  Strecken, nie reihum. Nachgewiesen: gleiche Statistiken, Zeile für Zeile identisch, Bretter
  bytegleich. **Ein Abschnitt darf nie sein eigenes Mesh poolen** — der Elternteil rechnet es.
- **Ein Export: ~223 s → 27,8 s** auf 20-19 (262 Zeilen), Bretter bytegleich nachgewiesen. Der
  Brett-Schnitt skaliert über Prozesse NICHT (33 → 23 s, dann Sättigung, weil `grab` bei vier
  Prozessen 3,4 statt 1,4 ms kostet) — was ihn wirklich löste, war die zwischengespeicherte
  Mesh-Koordinatenkarte (23 → 7 s, `docs/export-geometry-performance.md`).
- **Die Drehung war doppelt**: OpenCV dreht nach Container-Metadaten automatisch, der Export drehte
  zurück. `_combined_rotation` fasst beide zusammen. Die Winkel ADDIEREN — gemessen 2026-09-08 auf
  drei Aufnahmen, `ROTATE_90_CLOCKWISE` aufs rohe Bild ergibt das auto-gedrehte, das `META` 90
  nennt. Unsere Aufnahmen heben sich alle auf (90 + 270), und eine Aufhebung beweist die
  Konvention NICHT — deshalb die direkte Messung.
- **GPU bringt hier nichts, gemessen**: OpenCL kostet mit Transfer 10,6 statt 2,1 ms je Remap. Und
  Hardware-Dekodierung ist auf diesem Rechner zu (kein D3D11 im pip-Wheel, `rocDecode` ist
  Linux/Instinct, unter Windows nur AMF ohne Python-Bindung).
- **`measure_settle` seekte** und lief damit auf teils falschen Bildern — behoben. Was übrig ist,
  steht gemessen in `docs/export-decode.md`; der nächste Batching-Kandidat ist
  `line_band_samples` (38 848 winzige `polyfit` auf 40 Frames), nicht die Farbkonvertierung.
- **Ein zweiter Export-Lauf ist schneller, ohne dass etwas besser wurde**: er startet auf den
  gefitteten Ecken des ersten und fittet 13 statt 125 Frames nach. Nie zwei Läufe derselben
  Session als A/B gegeneinander stellen.

## Model Guidelines (2026-08-14)
- **BatchNorm Only:** We only use BatchNorm-trained models. Others are too slow.
- **Naming Convention:** BatchNorm models must contain `bn` in the filename or path.