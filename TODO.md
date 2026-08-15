# TODO — the user's ideas, parked on purpose

> Ideas raised mid-work. Nothing here interrupts what is running; they get picked up between
> pieces of work. Newest first within a section. When one is done, move it out with a one-line
> result, not a tick — what it MEASURED is the point.

## Next up (agreed, not started)

- **Stored-Sessions loggen den unkorrigierten Marker-Quad** (gemessen 2026-08-15): `log.jsonl` der
  Android-Stored-Sessions trägt den rohen Marker-Quad, `packLabeledSession` und der Abnick-Viewer
  rechnen beide mit konstantem `DEFAULT_MARKER_MARGIN = 0.045` — real variiert das beste Margin pro
  Session (0,0375–0,050; Session 20260812-222357: bis 14 px ≙ 12 % einer Zelle Versatz, im Training
  wie im Labeln identisch; die übrigen gemessenen Sessions ±6–7 px — systemisch, nicht eine
  Ausreißer-Session). Fix ZWEISTUFIG (User 2026-08-15): (1) Android DARF den grid-korrigierten
  Quad loggen statt des Marker-Quads, ABER nur ohne Laufzeitkosten — `improveQuad` rechnet im
  Live-Tracking ohnehin, das Ergebnis wegschreiben ist gratis; neue Rechenarbeit im Recorder ist
  tabu („ändert aber nicht langsamer macht"). (2) Der PC kontrolliert und korrigiert TROTZDEM
  nochmal: Grid-Fit über die gespeicherten JPEGs an EINER geteilten Stelle, die
  `packLabeledSession` UND der Abnick-Viewer nutzen — deckt alle 28 Bestands-Sessions rückwirkend
  und bleibt das Netz für schiefe Gerät-Quads. Bis dahin Versatz pack-identisch sichtbar.
  **Folge-Sweep (User 2026-08-15, bestätigt auf der Platte):** die versetzten Crops sind im
  Training — `real14-all-80-v1` und `real13-all-80-v1` listen `phone-stored-*`-Sessions (6 Packs,
  ±6–7-px-Klasse), und `hard_empty.jsonl` trägt **637** `phone-*`-Zeilen (aus versetzten Crops
  gemined — eine „leere" Zelle kann Nachbarinhalt zeigen). Reihenfolge nach dem Grid-Fit-Fix:
  (1) die 6 phone-stored-Packs mit korrigiertem Quad neu packen, (2) die 637 hard_empty-Zeilen
  neu ableiten oder parken (nie löschen), (3) Dataset als NEUEN Snapshot bauen (real14-all-80-v2,
  Datasets sind Snapshots), (4) Retrain mit Veto-Metrik als Entscheider. Passt zeitlich zum
  ohnehin geplanten Low-Light-Retrain — ein Rebuild, beide Gründe.
  **Stand 2026-08-15 nachmittags — (1) und (2) sind ERLEDIGT, (3)/(4) sind die Zündschnur:**
  alle 27 Stored-Sessions gefittet (521 Frames, 0 failed, align_worst_px max 35→3,3), die 6 Packs
  als `phone-stored-<id>-80-v2` neu gepackt (packed_meta: quad_source=grid-fit, 100 %), die 637
  phone-Hard-Empties geparkt (`data/_parked/hard_empty-phone-marker-quads-20260815.jsonl`,
  Voll-Backup daneben; Neu-Mining braucht einen GPU-Eval-Lauf). Build (3): v1-Konfiguration aus
  `data/datasets/real14-all-80-v1/dataset.yaml` übernehmen, Name v2 — OFFEN: die v2-Packs tragen
  dieselben `phone-<id>`-session_ids wie die alten Packs; vor dem Build sicherstellen, dass der
  Resolver die `-80-v2`-Verzeichnisse zieht (alte Packs parken oder Quelle explizit angeben).

- **Datensatz-Qualität per Zwei-Hälften-Kreuztest** (User, 2026-08-15: *"2 halbe Modelle die die
  andere Hälfte testen, dann die Flags nochmal nachlabeln"*). Korpus in zwei Session-Hälften
  teilen, je ein Modell pro Hälfte trainieren, jedes proposed auf der FREMDEN Hälfte — nie
  zirkulär, per Konstruktion. Die Disagreements Modell-vs-Label sind die Nachlabel-Flags —
  über ALLE Labels (User, 2026-08-15: *"ich möchte alle labels in frage stellen"*): Figuren,
  `empty` und `occluded`, voller 14c-Kopf, nicht nur die Occluder-Schiene. Landet in der
  Audit-Lane des Labeln-Stroms (docs/labeling-ux/CONCEPT.md §4.2, `audit-flags.jsonl`).
  Voraussetzungen liegen seit heute: `check_not_circular` sieht durch Varianten-Präfixe
  (`occ-rg-…`), der Proposer bekommt `--model`, und Proposals tragen `probs`. Interim bis dahin:
  Modell-Rotation pro Session (erstes nicht-zirkuläres Modell aus einer Präferenzliste).

- **Der Vorlauf kam mit ~1,4 s statt 20 s an** (gemessen am Handy 2026-08-14, Session
  `20260814-142947`). Rechnung: Commit (Verzeichnis) 14:29:47.998, Segment 0 geschlossen
  14:30:47.154 → 59,2 s Wanduhr, `mvhd`-Dauer 60,6 s, also ~1,4 s vor dem Commit — ziemlich genau
  EINE GOP. Der Ring ist es nicht: `PreRollRing` hält unter einem realistischen Feed (30 fps,
  1-s-GOPs, 83 kB/Sample, gedeckelt wie ausgeliefert) 19-20 s, und der Test dazu steht jetzt in
  `PreRollRingTest`. Verdacht ist damit der ZEITPUNKT der Scharfschaltung: `startVideo()` gibt
  still auf, solange `camera.videoResolution == null` ist, und der einzige zweite Auslöser ist
  `videoAvailability` — schlägt der fehl, armt erst `opened()`, also der Commit selbst. Beweisbar
  war das bisher nicht, weil die Armed-Phase keine Session hat und ihre Progress-Zeilen am
  `null`-Timeline verfallen. Jetzt loggt `CameraVideo` Arm, Ringtiefe (alle 5 s) und die geflushte
  Vorlauflänge, und `session.yaml` trägt `video_pre_roll_ns`. Nächster 60-Sekunden-Lauf am Handy
  beantwortet es ohne Forensik: `adb logcat -s chesslabVideo`.

- **Das 14er-Modell ist bei `occluded` zu aggressiv** (User am Brett, 2026-08-14). Deckt sich mit
  den Replay-Logs vom selben Tag: real14-80 las beim Start eine ganze Damenflügel-Flanke
  (`occlVeto=a3,a4,a5,a6,a7,b3,b4,b5,b6,…`) auf freiem Brett als verdeckt. Der Punkt ist nicht nur
  der Sensor, sondern was daran hängt: mit einem Modell OHNE `occluded` war `pOccluded = 0.0` und
  die Sperren (Hand-Veto, Recovery-Gate auf sauberem Brett, Count-Discount) liefen strukturell
  leer — dieses Modell schaltet sie zum ersten Mal scharf, und zwar mit einem unvalidierten Kopf.
  *Teilantwort seit 2026-08-14:* der Head hängt nicht mehr roh an der Engine — `modelHandSquares`
  (`core-engine/Taint.kt`, Knob `modelHandGate`) zählt occluded-Flags nur noch, wenn sie
  handförmig sind (adjazentes Paar, die Regel des Grid-Arms) UND Motion frisch ist oder der
  Grid-Arm die ruhende Hand bezeugt. A/B über Replays desselben Videos (`set:modelHandGate=…`).
  Offen bleibt das MODELL selbst (Kopf neu kalibrieren oder 13c + Grid-Arm als Default).

### Erledigt 2026-08-14 (Abend, Agenten-Runde) — was es gemessen hat

- **Session-Dateien verlieren nicht mehr still.** `SessionCapture` zählt überschriebene
  Pending-Fotos (`supersededFrames`, Nc6/Nf3-Vorfall) und sagt es in `reason`;
  `RecordingBundleHost` puffert die EINE Decision-Zeile, die die Session erst erzeugt, und
  reicht sie in die frische Timeline nach (Ply 1 fehlte in beiden Abend-Sessions). Referenzen
  sind ab jetzt trotzdem als Union aus `log.jsonl` + `timeline.jsonl` zu lesen — die Timeline
  trägt jeden Commit mit SAN und FEN, Rekonstruieren ist nie nötig.

- **Ein Arm-Owner statt zwei.** Der Doppel-„armed" beim Session-Wechsel kam nicht vom
  Prefs-Kollektor, sondern von `finalizeVideo`: die Encoder-final-Notification armte sich
  selbst neu, und ein Partie-Ende feuert sie zweimal (Session-Ende + Kamera-Stop). Re-Arm wohnt
  jetzt in `finished()`; `VideoRecorderPort`-Naht macht es JVM-testbar, Test beißt (alter Code
  = 3 Arms).

- **Die Quiet-Kante schreibt jetzt.** Einziger wirklich stummer Exit war der Ambiguity-Trichter;
  der schreibt eine gefaltete `QUIET ambiguous`-Zeile (eine pro Evidenzlage, nicht pro Frame,
  `foldOnChanged`). Alle anderen Exits sind über `markStuck` bereits sichtbar oder tragen kein
  changed-Set. Verhalten unverändert, Parity-Fixtures unberührt.

- **`config=` erreicht jetzt wirklich den Lauf.** Der Defekt war die GEGENRICHTUNG der
  notierten Messung (die 4-vs-8-Commits hatten Videos gekreuzt; All-Defaults war schon immer
  No-Op): drei Stellen lasen Restart-Knobs aus dem Settings-Repository, das ein Replay auf
  Defaults lässt — `alignEvery=2` aus einer Aufnahme kam nie an, `set:cnnVerify=false` wurde
  still zurückgedreht (882 Observations vorher, 0 nachher). Fix: `withLiveKnobsOf` — die zwölf
  Live-Knobs kommen aus dem Repo, alles andere aus der Config, mit der der Lauf gebaut wurde.

- **Emulator-Kamera: `videofile:` ist ein Feed-Test, kein Tracking-Test** (gemessen 2026-08-14).
  Drei Befunde: (1) Die 640x640-Blender-Clips können auf dem 16:9-Sensor NIE alle vier Marker
  zeigen — der Füll-Crop schneidet zwei ab, "No board yet" ist damit strukturell, nicht zufällig;
  der Smoke hat Tracking durch den Clip nie verifiziert ("this never worked", User). (2) Echtes
  QHD-Material wird erkannt und live-aligned (Quad folgt einem schräg hängenden Brett bei 2/4
  Codes). Die Wiedergabegeschwindigkeit passt bei längerem Zusehen ("die geschwindigkeit passt",
  User) — der Sensor tickt mit 33 ms (~30 fps) gegen 27,97 fps Clip, also ~7 % schnell, praktisch
  unauffällig; der erste Eindruck "zu schnell" hielt nicht. Für exakte Timing-/Engine-Fragen bleibt
  trotzdem der Desktop-Replay das Werkzeug, weil nur er die Uhr des Materials fährt. (3) Ein Loop, der mitten in der
  Partie startet, matcht nie die Startaufstellung — Commit-Pfade sind so nicht testbar. Will man
  den Smoke zum Tracking-Test machen: Clips auf 16:9 padden, kurz halten (Loop-Start = Partiestart)
  und die erwarteten UI-Texte gegen die specs/54-Wortlaute aktualisieren (scheitert heute an
  "Start tracking").

- **Lens end-to-end für die Rig-Kamera** (2026-08-10: *"ich würde gerne überall die Bilder sehen
  die auch der Algo sieht"*). Der Hebel ist an die DATEN gekoppelt (CLAUDE.md, specs/52: lens-
  korrigierte Inferenz gegen den roh trainierten Korpus = 003957 von 67 auf 15 Plies), deshalb in
  dieser Reihenfolge und nie einzeln: (1) alle Rig-Sessions im Pool undistorten + re-slicen
  (rg-2026-08-08-00-39-57 ist schon durch), (2) Modell auf dem korrigierten Korpus neu trainieren,
  Path-A gegen den Champion, (3) erst dann Label-Replays und Serving auf `lens` default. Bis dahin
  zeigen die gelabelten Burst-Bilder im Confirm bewusst das ROHE Algo-Bild und nur `frames-extra`
  ist korrigiert — die Mischung im ◀ ▶ ist bekannt und gewollt. Umfang gemessen 2026-08-10: NUR
  die Rig-Kamera (OBS-Videos: k1 ≈ −0,23, Bow halbiert, Fit akzeptiert); die vier Phone-Videos
  lehnt der Grid-Fit dreimal unabhängig ab (k1 ≈ 0) — die Handykamera entzerrt selbst, dort gibt
  es nichts zu tun.

- **The static takes still miss the gap they were filmed for.** Take 1 covers a1-e4 — White's
  half again, mostly empty squares. The corpus is already 57 % "occluded over empty" with 8
  examples of a covered black king. The next takes have to reach over ranks 7 and 8.
- **Mobile bucket sort** — a page that shows ONE crop big and a few large buckets underneath
  (occluded / empty / FEN is right / wrong → piece palette). Tap or swipe throws the crop in,
  the next appears. Meant for the phone, for volume; the brush stays the desktop tool.
  *"ich will das mal ausprobieren aber später"* (2026-08-09).
- **Video upload in the web UI** — today a new video is a `copy` into `data/testclip-raw/` plus
  four CLI steps (label → confirm → export-session → propose-occluded). The platform should
  take the file, put it where it belongs and run the chain. Asked 2026-08-09; the CLI path is
  written up in the answer of that day. *Mostly done since 2026-08-13:* a PHONE recording arrives
  by itself over the LAN, queues `training-video-pack`, and the whole
  label → confirm → export-session → propose-occluded chain is a button per card on `/`
  (`docs/phone-transfer.md`, `platform/app/README.md`). What is left is the RIG videos — a file the
  browser hands over, so the chain has something to start on.
- **Review provenance** — "keep" in the tinder band writes nothing, by design (a row repeating
  the FEN is noise in a global training input). Consequence: *looked at and correct* is
  indistinguishable from *never looked at*. If that distinction should survive a reload, it
  needs its own ledger next to `corrections.jsonl` — the user's point of 2026-08-09: "nur weil
  ich occluded anmale heißt das nicht, dass alle Bauern richtig sind".

- **Python zurückbauen, Kotlin als einzige Implementierung** (2026-08-09: *"python soweit
  rauszunehmen wie es geht ... da es auch die engine am gerät ist"*). Reihenfolge nach Schaden bei
  Drift, und jeder Schritt erst als PARITÄTSTEST, dann als Umzug:
  1. **Crops/Warp** — dieselbe Konstruktion liegt dreimal vor (`calibration.crops_for_frame`,
     `core-geometry/Crops.kt`, `platform/app/lib/warp.ts`). Trifft Gerät *und* Training, also der
     teuerste Drift; genau hier war der `ClipDriver`-Vorfall.
  2. **Brettgeometrie** — ArUco, Quad-Auflösung, `alignment_of`.
  3. Der TypeScript-Warp der Weboberfläche, sobald 1 steht.
  Nicht bewegbar: PyTorch-Training und der Datensatzbau. Ein `throw` in `chesslab slice` schaltet
  den Datensatzbau ab — der Umzug braucht vorher einen Kotlin-Weg, der die Crops liefert.

### Erledigt 2026-08-14 — was es gemessen hat

- **Der Recorder behält nur noch Footage, die ein Spiel trägt.** Der Encoder läuft ab
  Tracking-Start SCHARF: die Samples liegen in einem Ringpuffer (20 s / 80 MB hart, getrimmt nur
  an Keyframe-Grenzen — `camera/PreRollRing.kt`), der Muxer öffnet erst beim ersten committeten
  Zug und schreibt den Vorlauf mit auf 0 rebasten Timestamps als Segment 0 (`CameraVideo.keep`).
  Der Vorlauf gilt EINMAL, nicht pro Zug: die ruhigen Strecken zwischen den Zügen sind die
  gelabelten Trainingsdaten. Kill vor dem ersten Zug = Puffer stirbt mit dem Prozess, nichts auf
  der Platte (gewollt); Kill danach = wie bisher maximal ein Minuten-Segment weg. Auch das
  SESSION-Verzeichnis entsteht erst beim ersten Commit (`SessionCaptureController.queue`) —
  Aufbau, Markerkleben und Kalibrierung hinterlassen gar nichts mehr, und ein Janitor beim
  App-Start räumt Altlasten (`sync/UploadPlan.kt::sweepEmptyRecordings`, nie über `transfer.json`
  hinweg). Settings-Zeile sagt es ehrlich: "Armed — video starts with the first move".
  **Am Gerät noch NICHT verifiziert** — bewusst dem Nutzer überlassen (Installs auf dem Handy nur
  mit Backup, CLAUDE.md); JVM-Tests decken Ring, Commit-Gate und Janitor ab.

- **Jede Aufnahme trägt jetzt ihre Settings.** Das Handy schreibt beim Session-Start
  `settings.json` neben `session.yaml`: die volle TrackerConfig als ConfigCodec-Envelope
  (identische Wire-Form wie der DataStore-Slot), Modell/EP/Auflösung/Orientierung aus den
  AppSettings, Build-Version, plus `history` für jeden Knob, der mitten in der Session bewegt
  wurde (`tracker-runtime record/SessionSettings.kt`, verdrahtet in `TrackerService`). Der
  Replay-Dump `effective_config` ist seitdem KNOBS-getrieben statt handgepflegt — die
  handgepflegte Liste war fünf Keys kurz, darunter `handTolerantCells`, exakt der Knob, den
  `2026-08-13-19-34-23` gebraucht hätte. Wiederholen unter der echten Config:
  `:desktop … replay <video> config=<session>/settings.json` (Geometrie gewinnt weiterhin bei
  `boardSize`/`detSize`). Ein Vollständigkeitstest (`ConfigKnobsCompletenessTest`) hält den
  Katalog ab jetzt deckungsgleich mit `TrackerConfig`.

- **Eine abgebrochene Aufnahme kostet jetzt eine Minute statt der ganzen Partie.** Vier der elf
  übertragenen Aufnahmen (1,99 GB) hatten kein `moov`; Androids Exit-Log nannte den Täter:
  `reason=16 (PACKAGE UPDATED)` — ein `adb install` über die laufende Aufnahme, also SIGKILL ohne
  Callback. Der Recorder schließt seinen Muxer seither einmal pro Minute an einer Sync-Frame
  (`CameraVideo.SEGMENT_SECONDS`), Dateien `video.mp4`, `video-001.mp4`, … Am Gerät reproduziert:
  drei Segmente, Install mitten hinein, **die ersten beiden tragen `moov` und dekodieren
  (3600 Frames als ein Strom), verloren sind 4 Sekunden**. Die PC-Seite liest sie über
  `openRecording` als eine Aufnahme und nennt das abgeschnittene letzte Segment, statt daran zu
  scheitern. Die Segmentliste kommt von der PLATTE, nicht aus `session.yaml` — ein Kill verhindert
  auch das Schreiben der Metadaten.

## Open questions the measurements left behind

- **First-frame quad vs scan median** — worth ±6-25 plies and the direction is inconsistent per
  video (specs/52, "geometry A/B"). `alignment_of` over the run is the arbiter, not ply counts.
  The only one of the four still open.

### Answered on 2026-08-09 — what they measured

- **003957 reads 67/67 with the grid hand veto + the ply price — from 38/67 with 4 invented.**
  The break at ply 39 was a resting hand: `pOccluded` ≡ 0.0 under `id35-80`, the coverage gate
  cannot see a corner hand (whole-line, 50 % hit fraction), the census core read `occluded 0` —
  so the verify confirm rung read the hand on g4 as "arrived" and committed a fabricated `g4`,
  and the deep search bridged 3 more plies onto the wrong position. Two levers, attributed by
  A/B: `cnnPlyCostSquares=1` alone kills the bridge (1 invented instead of 4) but not the entry;
  `gridHandGate` (band-wise groove read of the crop warp, `GridOcclusion.kt`) also kills the
  entry — 67/67, all `cnn_occupancy`, despite the sensor reading a hand on ~39 % of frames in
  this blitz-paced video. Every eyeballed "false positive" was a real hand.

- **The static recording's "false positives on rank 8" were my overlay, not the producer.**
  `all_squares()` counts from rank 1 up while the warp puts rank 8 at the TOP, so the probe drew
  every score one board-flip away from the cell it belonged to. Redrawn with the square names in
  it: the cells over 0.7 are exactly a1-e1, a2-e2, a3-e3, a4-e4, b5-d5 and b6-c6 — the hand — and
  the untouched ranks 7 and 8 read 0.02-0.19. The separation is clean. **A cell overlay without
  the square name in it is not checkable**, which is why the probe now carries it.

- **The 12 phantoms of the dense arm are ALL `cnn_recovery`**, none from the resync (7 of those
  ran and invented nothing) and none from the verify ladder. They arrive in bursts at one frame —
  4767 produced four (`Rc7 Kd1 Rd7 Ke1`, a king round trip as parity filler) — and two bursts sit
  ON a missed real ply: `Bd7` at 4770 and `Qb4` at 6635. The same board difference, explained by a
  LONGER sequence. Cause: `deriveMovesDeepFull` ranked by hits with length as a mere tiebreak, so
  one misread square bought a 4-ply fabrication, and B↔R is the identity head's documented top
  confusion. Priced by `plyCostSquares` (see specs/53 STATUS for the table).
- **`P_OCCLUDED_THR = 0.5` is not what is blocking anything.** At four of the five phantom frames
  the head reads `occl=0` across the eight preceding observations, and at 4767 a hand (20-21 cells)
  had just cleared. A lower threshold would have prevented no phantom. The distribution is sharply
  bimodal — 3 638 of 4 410 observations at zero, then a broad hump at 13-20 cells — which is a hand
  and forearm, not a jittery threshold.
- **The 26-cell `disagree` board (frame 004266) is neither a shifted grid nor a wrong FEN.** Every
  one of the 8 neighbour offsets scores WORSE than 0/0, and no position in the whole game matches
  the reading better than the labeled one (best rival 40/64, labeled 38/64). It is simply a frame
  the model reads badly. It did surface something else, though: 760 of 760 dirty rows carried no
  `unknown_squares`, because the exporter fix never reached the exported data — see below.

## Standing rules that came out of the same conversations

- A newly exported session is a SUPPLEMENT to the corpus, never the bulk: two videos at 50 % of
  the train split cost 105 phantoms. Pre-cap with `--source-manifest` (specs/53 STATUS).
- The model may PROPOSE on a video, never on one it was trained on — `occluded_model.py`
  refuses that outright.
- **A fix in the exporter is not a fix in the data.** Both sessions sat on logs written before
  `unknown_squares` existed, because re-running the export meant decoding the whole video again.
  Re-export is cheap now (frames on disk are kept) and non-destructive (a repaired quad is carried
  over), so after any change to `plan_rows`, re-export and check the field is actually there.
