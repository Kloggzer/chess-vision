# TODO — the user's ideas, parked on purpose

> Ideas raised mid-work. Nothing here interrupts what is running; they get picked up between
> pieces of work. Newest first within a section. When one is done, move it out with a one-line
> result, not a tick — what it MEASURED is the point.

## Next up (agreed, not started)

- **Python und Kotlin stehen auf verschiedenen Klassenschemata** (gemessen 2026-08-20, nachgezogen
  nach dem Aufräumen). Das 2-Klassen-`occupancy` ist auf BEIDEN Seiten weg — `OCCUPANCY_CLASSES`,
  `to_occupancy_class`, `classesHaveIdentity` und die sechs Belegungsmodelle im APK sind gelöscht.
  Was bleibt, ist die Coverage-Lücke. Python ist seit 2026-08-18 auf 13 Klassen +
  Coverage-Regression: `dataset build` defaultet auf `pieces13`, `train` auf `--head occlusion`,
  das Modell gibt 13 Softmax-Logits plus EIN unabhängiges Sigmoid.
  Das Handy bündelt nur noch `real14-80` (Default, echtes 14-Klassen-Softmax mit `occluded` auf
  Index 13) und `id35-80` (13 Klassen, also `pOccluded = 0.0`) — **keines** deklariert
  `coverage_output`.
  **Die Bruchstelle ist der Export, nicht die Leseseite.** `ModelSpec.coverageOutput` und
  `observationFromProbs` lesen die Extraspalte längst, die Vertragstests dafür stehen
  (`OnnxSquareClassifierContractTest`) — sie feuern nur nie. Von den zehn Occlusion-Läufen ist
  nur `comp13-occ-bn-lr1e2-bs512` in `data/models/` geblieben (die neun anderen in
  `data/_delete/models/`, zusammengefasst in `docs/retired-runs.md`), und keiner ist als ONNX
  exportiert und gebündelt.
  **Reihenfolge:** (1) einen Occlusion-Lauf mit `chesslab export` ausgeben (schreibt
  `coverage_output: true` selbst, `evaluate.py:238`), (2) `model.onnx` + `config.json` unter
  `android/app/src/main/assets/cnn_model/<name>/` einhängen, (3) gegen `real14-80` per Replay
  A/B fahren — die Veto-Metrik entscheidet, nicht `val_acc`. Erst danach kann `modelHandGate` vom
  Softmax-Wert auf das kalibrierte Sigmoid umgestellt werden.
  **Hängt zusammen mit** „Das 14er-Modell ist bei `occluded` zu aggressiv" weiter unten: das ist
  genau die Klasse, die Python inzwischen abgeschafft hat. Ganze Chronik und Erkennungsregeln:
  `docs/class-scheme.md`.

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

- **Sessions direkt in eine Memmap, mehrere Memmaps im Training** (User, 2026-08-16). Heute liegen
  82 GB Frame-PNGs und 6.4 GB Crop-PNGs auf der Platte, erzeugt aus 954 MB Video — Faktor 86. Der
  Cache spart dabei nichts: **gemessen 249 Frames/s beim Vorwärts-Dekodieren gegen 32 Frames/s beim
  Lesen der gecachten PNGs**, also achtmal langsamer als die Quelle. Wiederverwendet wird er 4–7 mal
  je Session (`log.jsonl.bak.*`), drei von 18 Sessions nie.
  **Ziel:** `session pack <id>` schreibt Video → Crops → `data/packs/<session>/` (Memmap + Manifest),
  mit demselben Gate wie der Slice. Der Loader liest MEHRERE Packs: `path2idx` wird `(pack, index)`,
  `PackedSquareDataset` hält eine Memmap je Pack, weiterhin lazy pro Worker (Windows-Spawn).
  `build_dataset` nimmt Packs statt eines Crop-Pools. Danach `slice` und die Frame-PNGs zurückbauen.
  **Gewinn:** ~98 GB → ~9.4 GB; eine neue Session ist eine neue Memmap statt eines Neupackens des
  ganzen Korpus (heute Minuten, mehrmals täglich); und die Kotlin-Packs (`labeled-video-pack`,
  `turntable-pack`) werden wieder nutzbar — heute verweigert `pack_dataset` ihre `mm://`-Zeilen,
  weshalb das Turntable-Material nicht in die Fold-Datensätze kam.
  **Preis, bewusst:** eine Memmap friert Crop-Größe, `pad_side` und Mesh ein. Wer daran dreht, muss
  zurück ans Video — das ist heute nicht anders, nur verdeckt.

- **Eine Seite statt neun Lanes, nach Wert sortiert** (User, 2026-08-16: *"prinzipiell eine
  Seite"*). Der Labeln-Strom zeigt nicht mehr Lanes zur Auswahl, sondern die nächste Frage —
  sortiert nach `wert = p_fehler × klassengewicht × neuheit`. `p_fehler` kommt aus dem Kreuztest
  (Out-of-Fold), `klassengewicht` steht fertig in `split.json` (`wK` 3.404 gegen `empty` 0.318),
  `neuheit` liefert `collapseEvents`. Jede Frage trägt sichtbar ihre Herkunft (Hand, Identität,
  Regelbruch, Audit), das FEN-Wort und die Modell-Lesart; Klasse und Schwelle bleiben als
  Verengung, sind aber nicht mehr der Weg zur Arbeit.
  **D1 wird aufgelöst, nicht umgangen:** die Einheit ist die FRAGE, nicht Brett oder Zelle — ein
  Brett mit vier verdächtigen Feldern sind vier Fragen. Ein Nenner für alles, Renderer bleibt frei.
  **Die Kontroll-Stichprobe darf nicht in die Sortierung:** jede n-te Frage wird gleichverteilt
  gezogen und ist als solche markiert. Ohne diesen eingewobenen Zufall gibt es keinen Weg zu
  Brodleys E2 („wie viel Schlechtes blieb drin"), und keine Genauigkeitszahl auf dem Korpus ist
  danach noch vergleichbar.
  Reihenfolge: Kreuztest fertig → Flags einmal von Hand ansehen, ob die Sortierung trägt → dann
  bauen. Trägt sie nicht, ist der Umbau gespart. Das CONCEPT steht nicht im Weg: seine Entscheidung
  „zwei Ströme" begründet sich mit unvereinbaren Modi von *Züge* gegen *Labeln*, nicht mit den
  Lanes innerhalb von Labeln.

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

- **ERLEDIGT ANDERS, 2026-08-21: der Mesh nimmt die Wölbung, nicht die Linse.** Gemessen über
  drei Rig-Aufnahmen mit Hold-out (`scripts/straighten_ab.py`): roher Brett-Bogen 15,2–16,6 px,
  Gitter-Mesh allein 0,9–1,1, gefittete Linse allein 3,0–4,4, beides 0,4–0,7. Auf 116 px
  Zellbreite ist ein Pixel unter einem Prozent einer Zelle, also ist die Linse den Fit pro
  Aufnahme nicht wert. Der Store wird stattdessen einmal geradegezogen
  (`realgames.straighten_boards`). Was unten steht, ist der ALTE Plan und nur noch Historie.

- ~~**Lens end-to-end für die Rig-Kamera**~~ (2026-08-10: *"ich würde gerne überall die Bilder sehen
  die auch der Algo sieht"*). Der Hebel ist an die DATEN gekoppelt (CLAUDE.md, specs/52: lens-
  korrigierte Inferenz gegen den roh trainierten Korpus = 003957 von 67 auf 15 Plies), deshalb in
  dieser Reihenfolge und nie einzeln: (1) alle Rig-Sessions im Pool undistorten + re-slicen
  (rg-2026-08-08-00-39-57 ist schon durch), (2) Modell auf dem korrigierten Korpus neu trainieren,
  Path-A gegen den Champion, (3) erst dann Label-Replays und Serving auf `lens` default. Bis dahin
  zeigen die gelabelten Burst-Bilder im Confirm bewusst das ROHE Algo-Bild und nur `review-extra/`
  (bis 2026-08-20 `frames-extra/`) ist korrigiert — die Mischung im ◀ ▶ ist bekannt und gewollt. Umfang gemessen 2026-08-10: NUR
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
- **Video upload in the web UI** — today a new video is a `copy` onto disk plus four CLI steps
  (label → confirm → export-session → model-read). The platform should
  take the file, put it where it belongs and run the chain. Asked 2026-08-09; the CLI path is
  written up in the answer of that day. *Mostly done since 2026-08-13:* a PHONE recording arrives
  by itself over the LAN, queues `training-video-pack`, and the whole
  label → confirm → export-session → model-read chain is a button per card on `/`
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

## Open questions the measurements left behind

- **First-frame quad vs scan median** — worth ±6-25 plies and the direction is inconsistent per
  video (specs/52, "geometry A/B"). `alignment_of` over the run is the arbiter, not ply counts.

## Standing rules that came out of the same conversations

- A newly exported session is a SUPPLEMENT to the corpus, never the bulk: two videos at 50 % of
  the train split cost 105 phantoms. Pre-cap with `--source-manifest` (specs/53 STATUS).
- The model may PROPOSE on a video, never on one it was trained on — `occluded_model.py`
  refuses that outright.
- **A cell overlay without the square name in it is not checkable.** `all_squares()` counts from
  rank 1 up while the warp puts rank 8 at the TOP; a probe drawn without the names read every
  score one board-flip away from its cell and invented a rank-8 false positive that was not there.
- **A fix in the exporter is not a fix in the data.** Both sessions sat on logs written before
  `unknown_squares` existed, because re-running the export meant decoding the whole video again.
  Re-export is cheap now (frames on disk are kept) and non-destructive (a repaired quad is carried
  over), so after any change to `plan_rows`, re-export and check the field is actually there.

## Lens: die Krümmung, die im Brett-Store sichtbar wurde (2026-08-17, gelöst 2026-08-21)

Der User sah die Wölbung in `rg-2026-08-07-13-52-38/boards/000147.webp`, und am 2026-08-20 in
einem Trainings-Crop. Befund, gemessen:

- **Die Ursache war die Hand, nicht die Linse.** 1 116 der 7 344 exportierten Frames trugen gar
  keinen Mesh, und das waren AUSNAHMSLOS Frames mit einer Hand auf dem Brett; wo doch einer
  zustande kam, war er von der Hand verzogen (Hand-Frames blieben bei 15,6–15,7 px Bogen,
  saubere bei 1,0). Das ist genau das Occlusion-Material.
- **Gelöst**: der Store wird beim Schreiben einmal geradegezogen, ein Hand-Frame leiht den Mesh
  seiner fünf nächsten sauberen Nachbarn (die Kamera steht fest). Gemessen an 207 echten
  Brettern: sauber 16,57 → 0,99 px, mit Hand 15,78 → 1,95 px.
- Das gespeicherte Brett WAR der rohe rektifizierte Warp; Trainings-Crop und Label-Ansicht
  begradigten jeder für sich. Beides ist weg — es gibt eine Begradigung, im Store.
- Gemessene Wölbung über das 928er Brett, Mittel über 200 Frames je Session: die eine
  undistortete Session (`00-39-57`, k1 = −0,269) liegt bei 13,7 px in x, alle rohen bei 15–56 px.
- Der Fit gehört laut `Undistort.kt` bewusst nach Kotlin (`data/lens/calib.npz` wurde bei
  2560×1440 mit RMS 5,46 px gefittet, die Kamera liefert 1920×1080). Das ANWENDEN eines
  gefitteten Modells ist dagegen ein `cv2.undistort` und könnte im Stream vor dem Warp laufen —
  dann bräuchte Undistortion nicht mehr den PNG-Umweg über `frames/`.
- Offen bleibt NUR die Inferenz: der Tracker warpt roh und kennt gar keinen Mesh (Kotlin kann
  Gitterlinien messen, aber `gridLinesWithCurvature`/`gridLineFracs` sind nicht portiert). Solange
  das so ist, sieht das Gerät eine andere Geometrie als der neue Trainingskorpus. Das darf NICHT
  einzeln scharfgeschaltet werden — specs/52 hat gemessen, dass entzerrte Inferenz gegen ein roh
  trainiertes Modell 003957 von 67 auf 15 Plies fallen lässt. Reihenfolge: erst auf dem geraden
  Korpus neu trainieren, dann Tracker-seitig begradigen.

## Zwei Aufnahmen behalten ihren Bogen — die Kruemmung war nie messbar (2026-08-21)

Der Store ist geradegezogen, aber der Mesh kann nur den Bogen nehmen, den er GEMESSEN hat.
`_curved_axes` (realgames.py) gibt die `cx`/`cy` nur alles-oder-nichts heraus: jede der 18 Linien
braucht >= `MIN_CURV_SAMPLES` Punkte, und keine darf ueber `MESH_CURV_LIMIT` liegen. Wo das
scheitert, bleibt eine Zeile bei Versaetzen und Neigungen.

Seit 2026-08-21 leiht ein Frame ohne Kruemmung die der Aufnahme (Median ueber die sauberen Frames,
die eine tragen, mindestens `MESH_POOL_MIN` = 3) — das rettete `20-35-52` von 6,35 auf 1,70 px.
Zwei Aufnahmen haben aber gar keine zu leihen:

| Aufnahme | saubere Frames mit Kruemmung | Bogen danach |
|---|---|---|
| `2026-08-13-19-34-23` | 1 von 55 | 5,5 px |
| `2026-08-14-20-48-55` | 0 von 105 | 5,4 px |

Zum Vergleich: der Korpus-Median liegt bei 0,97 px, roh waren es 6,07.

Zu klaeren, falls das stoert: WARUM die Kruemmung dort durchfaellt (zu wenige Bandpunkte auf
einzelnen Linien, oder Linien ueber dem Limit). Die Alles-oder-nichts-Regel selbst ist bewusst so —
"ein Konsument darf nie eine halbe Stufe schneiden" — und sollte nicht aufgeweicht werden, um eine
Zahl schoener zu machen.

## Der gerade Store kostet eine Interpolation — sie liesse sich einsparen (2026-08-21)

Der Export warpt heute Frame -> Brett und zieht das Brett DANACH gerade. Das sind zwei
Resamplings, wo der alte Zell-Schnitt eines hatte. Gemessen als Laplace-Energie des fertigen
Crops gegen einen aus dem rohen Brett geschnittenen: bilinear **-44 %**, kubisch **-22 %**,
Lanczos4 -19 %, alle bei ~290 ms je 952-px-Brett. Ausgeliefert wird kubisch.

Die -22 % waeren ganz zu vermeiden, indem der Mesh in `warp_board_for_crops` HINEINKOMPONIERT
wird: eine Abbildung vom Frame direkt auf das gerade Brett, ein Resampling wie frueher. Genau das
tut `sampleBoxMesh` (`lib/warp.ts`) schon fuer die Ansicht — es geht in einem Zug durch Mesh UND
Homographie.

Nicht gemacht, weil es die Paritaets-Zwillinge in Kotlin und TS mitzieht und der Nachruest-Weg
(`session straighten`, der auf FERTIG gewarpten Brettern arbeitet) das zusaetzliche Resampling
ohnehin nicht vermeiden kann. Ein frisch exportierter und ein nachgeruesteter Store waeren dann
unterschiedlich scharf — auch eine Entscheidung, die jemand treffen muss.

## `labeled-session-pack` liest Frames, die es nicht mehr gibt (gefunden 2026-08-21)

`packLabeledSession` (LabeledVideoPack.kt) oeffnet `row["frame"]`, also ein PNG unter `frames/`.
Seit dem Brett-Store (2026-08-17) haelt keine Aufnahme mehr Quellframes — das Verb kann auf dem
heutigen Korpus gar nicht laufen und faellt mit "could not decode" hin, bevor es irgendetwas packt.

Zu tun, wenn es gebraucht wird: aus `row["board"]` lesen statt zu warpen, `board_size`/
`board_border` der Zeile als Geometrie nehmen (wie Pythons `usable_board` es prueft) und ein
Brett ohne `board_straightened` verweigern statt es stumm zu schneiden. Der Warp entfaellt dabei
ganz — das gespeicherte Brett IST der Warp, und seit 2026-08-21 auch schon gerade.

Solange das offen ist, ist Pythons `slice` der einzige Weg von einer Session zu Trainings-Crops.

## Hände in „sauberen" Frames — wie viele rutschen durch? (2026-08-18)

Frage vom User: wie sicher sind wir, dass die nicht-`dirty` Frames keine Hände enthalten?

Stand, gemessen:

- `hand_squares` ohne `dirty` gibt es **null** — aber nur per Konstruktion: `mark_hands_session`
  setzt `dirty`, sobald der Gitter-Sensor anschlägt. Die Zahl sagt nichts über das, was er
  **übersieht**.
- Vor Einführung des Sensors zeigten laut seinem eigenen Docstring **424 von 2 228** Frames eine
  deutliche Hand ohne Flag (19 %). Die Trefferquote des Sensors selbst wurde nie gemessen.
- Sichtprobe an **40 zufälligen nicht-`dirty` Brettern** aus allen 20 Sessions: in etwa einem
  Drittel ist Haut zu sehen. Ein Teil davon liegt auf dem Randstreifen und berührt kein Feld —
  aber nicht alles. Auge, keine Messung.

Korpusweit: 51,9 % der 27 958 Frames sind `dirty`, 25,9 % tragen `hand_squares`.

**Was die Zahl liefern würde:** der Verdeckungs-Ausgang (`--head occlusion`), sobald er auf den
komponierten Daten trainiert ist. Über die nicht-`dirty` Frames laufen lassen, Überdeckung je Zelle
schätzen, und die Verteilung ist die Antwort. Das ist derselbe Lauf, der die Labelvorschläge für
das Tool erzeugt — also kein Extraaufwand, nur Reihenfolge.

## Verdeckte Stellungen: Frames zurückgewinnen statt dichter exportieren (2026-08-18)

Gemessen an 003957 (66 Stellungen, Export `--every 3`): je Stellung liegen median 47 Frames vor,
davon **median 11 sauber** — und **45 der 66 Stellungen (68 %) haben weniger als 16**. Mit
`--per-position 16` liefern zwei Drittel der Stellungen also weniger, als der Sampler will.

Der naheliegende Fix wäre ein dichterer Export (`--every 1`, dreifacher Brettspeicher). **Verworfen
(User 2026-08-18):** lieber weniger Bretter für eine verdeckte Stellung als dreimal so viel Material
für alle. Die Reduktion bleibt am Ende der Pipeline, wo sie hingehört.

**Die Idee, die noch aussteht:** in einem zweiten Durchgang Frames zurückholen, die heute pauschal
fallen. Kandidaten, in aufsteigender Schwierigkeit:

- Frames im `dirty`-Fenster (±1 s um den Commit), auf denen **keine** Hand zu sehen ist und deren
  Stellung sich nachweislich nicht ändert — das Fenster ist eine Zeitregel, kein Sensor.
- Frames mit Hand, aber nur auf Feldern, die für diese Stellung ohnehin nicht gebraucht werden:
  die Matte weiß pro Feld, wie viel verdeckt ist, also können 60 saubere Felder bleiben, während 4
  fallen. Heute fliegt der ganze Frame (`labeling.MATTE_DIRTY`).
- Stellungen unter dem Ziel gezielt auffüllen, statt gleichmäßig über alle zu streuen.

Der Preis der letzten beiden ist, dass ein Brett dann nicht mehr vollständig ist — `keep_per_position`
wählt heute bewusst ganze Bretter. Also erst messen, ob unvollständige Bretter dem Sampler schaden.

## Sampler: Metadaten als Strata (2026-08-18)

Der Coreset stratifiziert heute nach Stellung und streut innerhalb nach Aussehen (k-center greedy).
Der User weist zu Recht darauf hin, dass `hand_squares`, `dirty` und der Ply-Wechsel ebenfalls
Schlüsselereignisse sind und eigene Strata verdienen — um Ereignisse herum dichter abtasten.

Gemessen spricht dafür: über 60 s eines Session-Videos bewegt sich das Brett-Aussehen in 0,1 s nur
das 2,6-fache eines Einzelframes (glatt wäre 3,0) — Licht und Schatten sind auf dem 0,1-s-Raster
also vollständig erfasst. Der maximale Einzelframe-Sprung liegt aber bei **17,97 gegen Median
0,72**, Faktor 25: das sind die schnellen Ereignisse, und die trifft das Raster nur zufällig.

Also: für Licht/Schatten/Stellung reicht das vorhandene Extrakt, für Hände nicht. Erst angehen,
wenn der Verdeckungs-Zweig steht.

## Reste des Pre-roll-Offsets (Ursache behoben 2026-08-19)

- Die alten Einzeldatei-Sessions liegen 1 Frame daneben (Locate-Walk). 33 ms — nicht repariert,
  weil ein Re-Export jeden Stem neu plant und die Labels dort entwertet.
- `rg-VID_20260802_222203` ist mit vertauschtem b8/c8 aufgebaut worden (Läufer auf b8). Von Hand
  korrigiert; die 298 Crops davon in gebauten Datasets tragen den Tausch bis zum nächsten Rebuild.
- Aufbau-Check vor Zug 1 fehlt weiterhin — genau dieser Fall.

## Bretterkennung per CNN statt ArUco (2026-08-20, nur ein Gedanke)

Das Nicht-Ziel „kein Deep Learning für die Bretterkennung" ist **unbelegt**: `specs/15` hatte fünf
Phasen `todo` und hat nie gemessen, die 34–50 % in der Doku sind Literatur. Nachgerechnet, damit
das morgen nicht nochmal jemand herleiten muss:

- **Geschwindigkeit kauft nichts.** Auf dem Gerät wird einmal pro Aufbau kalibriert und das Quad
  gehalten; im Export läuft der Fit pro Frame, aber offline. Niemand wartet darauf.
- **Genauigkeit auch nicht.** Ein Netz besetzt den GROBEN Platz, den ArUco füllt. Die 1,86–2,10 px
  kommen vom Grid-Fit, der die 18 eigenen Linien des Bretts liest — ein Keypoint-Netz startet bei
  4–8 px Quantisierung und bräuchte zur Verfeinerung genau diesen Grid-Fit. Kette wäre
  CNN→Grid-Fit statt ArUco→Grid-Fit.
- **Der Gewinn wäre: die Marker fallen weg** (markerloser Kaltstart), und mit ihnen
  `margin = 0.045`, das es nur gibt, weil ArUco-Ecken nicht die Feldecken sind.
- **Die Labels sind umsonst:** 7 344 Frames tragen schon `corners` aus `export-fit`.
- **Das Risiko ist der Fehler, der den klassischen Detektor erledigt hat.** 9 unterscheidbare
  Aufbauten über 20 Aufnahmen; `board_corners_from_lines` rastete auf Schreibtisch- und
  Monitorkanten ein, 775 px daneben. Ein CNN darauf scheitert **selbstbewusst**, ArUco laut.

Falls je gebaut: CNN schlägt vor, **Grid-Fit hat das Veto** (findet er nicht alle 18 Linien
innerhalb `MAX_OFFSET_FRAC`, wird abgelehnt, nicht gemittelt), und das Abnahmekriterium ist das
Maß des Grid-Fits — ein falsches Maß hat hier schon 302 Frames zertifiziert, deren Gitter mit
blossem Auge falsch war. Erst mehr Aufbauten, sonst misst man auswendig gelerntes Mobiliar.

## `board_size` folgt nicht dem gemessenen Quad (2026-08-20, gemessen)

`board_size` ist konstant 928 für jede Aufnahme, aber wie gross das Brett im Bild sitzt, schwankt
von **96,3 bis 125,4 px/Feld** — 30 %. **14 von 20 Aufnahmen sind nicht 1:1:** zwölf verkleinern um
6–8 % (die Richtung, vor der `config.py` selbst warnt), und zwei vergrössern —
`VID_20260726_233432` (0,83) und `VID_20260727_233929` (0,87) erfinden 17–21 % Pixel, bevor
überhaupt jemand schneidet. Das trifft nicht nur die Oberfläche: das Modell trainiert auf 128 aus
demselben Store.

Fix wäre, `board_size` pro Aufnahme aus dem gemessenen Quad abzuleiten (auf ein Vielfaches von 8
gerundet) statt zu setzen, und die beiden Aufnahmen neu zu exportieren.

Getrennt davon: die Labeling-Oberfläche holt `CROP = 192` aus einem 127,6-px-Kasten, also 1,5×
bilinear hoch — Kette von der Quelle bis zum Auge 1,53× bis 1,99×. Die Kästen selbst sind über
Python/Kotlin/TS bytegleich gepinnt (`mesh_crop_parity.json`, 1e-9), die PIXEL nicht: Python
rundet den Kasten auf ganze Pixel und skaliert mit `cv2.resize`, TS sampelt bilinear pro
Ausgabepixel. Kein Test vergleicht je ein Bild.

## Compose-Layouts sind unprüfbar (2026-08-21, zweiter Vorfall)

**Null `@Preview`, null Compose-Tests im ganzen Projekt.** Jedes Layout ist ausschliesslich
durch Starten der App prüfbar, und beide Vorfälle an derselben Karte musste ein Mensch finden:

| | Opfer | Abhilfe damals |
|---|---|---|
| 2026-08-02 | die Aktionsleiste UNTER der Karte, 1-2 mm hoch, nicht drückbar | `heightIn(max = 200)` auf der Prosa |
| 2026-08-21 | "Accept CNN position" als Haarstrich | Prosa auf `weight(1f, fill = false)` |

**Derselbe Mechanismus beide Male:** eine `Column` misst ihre NICHT-gewichteten Kinder zuerst
und der Reihe nach, jedes mit dem Rest als Deckel. In `Watching` ist die Reihenfolge Infozeile →
`BoardRow` (quadratisch, also so hoch wie das Gerät breit ist) → Karte → Aktionsleiste. Wer
später kommt, bekommt Krümel. **Begrenzen ist nicht bevorzugen** — der Deckel von 2026-08-02
trägt nur, solange die Karte selbst genug Platz hat.

Die eine Zusicherung, die beide Vorfälle gefangen hätte: *in einem auf 220 dp gedeckelten
Container ist die gemessene Höhe jedes Aktionsknopfes mindestens das Touch-Ziel von 48 dp.*

Drei Instrumente, nach Kosten:

- **`@Preview` der Karte im gedeckelten Container** — ~15 Zeilen, sofort in Android Studio
  sichtbar, fängt es aber nur, wenn jemand hinschaut. Landet im APK, sofern nicht in einem
  eigenen `debug`-Source-Set.
- **Robolectric + `compose-ui-test`** — eine Abhängigkeit und etwas Konfiguration, läuft dann in
  `:app:testDebugUnitTest` mit und kann die 48-dp-Zusicherung wirklich prüfen. Das ist das
  Instrument, das die Regression zum Test macht statt zum Blick.
- **Screenshot-Tests (Paparazzi/Roborazzi)** — fängt auch Farbe, Abstand und Umbruch, kostet
  dafür Referenzbilder, die gepflegt werden wollen.

Randbedingung: `:app` steht bei 457 Testfällen und muss grün bleiben; `:app:detekt` hat einen
vorbestehenden Fund (`ModelSpecTest` LongParameterList), der nicht durch neue Testinfrastruktur
wachsen darf.

## Verdeckungsdaten aus einer stehenden Stellung (2026-08-21, Code entfernt)

`export_static` und seine vier Helfer (149 Zeilen, null Tests, null Aufnahmen dieser Art auf
Platte) sind raus: das Feature wurde nie benutzt, und Verdeckungsmaterial fällt aus den echten
Partien genug ab. Es hatte auch nie ein CLI-Verb, war also seit seinem einzigen Commit
unerreichbar. `git log --diff-filter=D -- src/chesslab/realgames.py` holt es zurück.

**Die Idee ist trotzdem gut, falls Verdeckungsdaten je knapp werden:** bei einer Partie musst du
erst wissen, WELCHER Zug wann passierte, bevor du Labels hast. Bei einer stehenden Stellung
kennst du sie ab Frame 1 — nichts ändert sich —, und die einzige Unbekannte ist die Hand. Die
verrät sich durch Bewegung: jeden Frame gegen das Pixel-Mittel der Aufnahme, die ruhigsten 65 %
sind sauber, der Rest ist `dirty` und damit genau das Material, das SAM3 nachlabelt.

Zwei harte Voraussetzungen, die es NICHT zum Turntable-Werkzeug machen: ein einziges Quad für die
ganze Aufnahme (Median der Ecken) und das Pixel-Mittel als Ruhe-Referenz. Beides bricht, sobald
sich Brett oder Kamera bewegen.

## Hintergrund-Randomisierung entfernt (2026-08-21)

`bg_p` und sein Unterbau (`randomize_border_bg`, `_procedural_bg`, `_pool_bg`, vier Stellschrauben,
das CLI-Flag) sind raus. Es ersetzte bei BESETZTEN Crops den Rand — also das Brett — durch einen
zufälligen, weich überblendeten Hintergrund und behielt die Figur in der Mitte; halb prozedurale
Texturen, halb Ausschnitte anderer Bretter. Wahrscheinlichkeitsbasiert, damit „zufälliger
Hintergrund" nicht selbst zum Hinweis auf „besetzt" wird.

**Warum es weg ist:** 0 von 10 ausgelieferten Modellen haben es benutzt, jedes Rezept des Nutzers
übersteuerte es auf 0, und **ob es hilft, wurde nie gemessen** — der Satz im Config klang nach
Ablation, sagte aber nur, dass die Flags existieren, damit man ablatieren *könnte*.

**Das Problem dahinter ist echt und bleibt:** gemessen relied eine Springer-Vorhersage zu 8 % auf
die Figur und zu 43 % auf das Brett drumherum. `chesslab reliance` misst genau das weiter. Wenn die
Abkürzung wiederkommt, ist das hier der Bauplan der Gegenmassnahme — `git log --diff-filter=D --
src/chesslab/training/torch_data.py` holt sie zurück.

Nebenwirkung, positiv: der Zweig, der bei `bg_p > 0` still den gepackten Memmap-Loader abschaltete
(F8 in `training-pipeline-review.md`), fällt mit weg. Der Pack-Pfad ist jetzt bedingungslos.

## Aufnahmen haben 22 verschiedene Formen (2026-08-21, gemessen)

`data/recordings/` hält **43 Aufnahmen in 22 unterschiedlichen Verzeichnisformen**. Zwei Arten
liegen unvermischt nebeneinander, dazu ein langer Schwanz aus Einzelfällen:

| Form | Anzahl | Inhalt |
|---|---|---|
| roher Handy-Upload | 16 | `files/`, `reference.pgn`, `reviewed.jsonl` — Video liegt in `files/sessions/<id>/video.mp4` |
| fertig exportiert | 5 | `boards/`, `candidate.json`, `log.jsonl`, `video.mp4` **oben**, `session.yaml` |
| Mischformen und Einzelfälle | 22 | beides zugleich, plus `*.bak.preroll`, `*.bak.bkq-swap2`, `training-pack-fast`, `training-pack-safe-dense`, `phone-tracker-config-align3.json`, `phone-session.tar` … |

**Warum das weh tut:** derselbe Inhalt liegt an zwei Orten, je nach Alter der Aufnahme. Wer
`<ts>/video.mp4` prüft, findet 25; wer zusätzlich `<ts>/files/sessions/*/video.mp4` prüft, findet
alle. Ich bin am 2026-08-20 selbst darauf hereingefallen und habe daraufhin falschen Alarm über
verlorene Videos geschlagen.

**Zu tun:** eine Zielform festlegen, den Bestand dorthin migrieren, und die Ausweichpfade im Code
entfernen statt sie zu pflegen. Legacy-Daten werden angepasst, nicht umschifft.

## Videostand, korrigiert (2026-08-21)

Die frühere Fassung dieses Eintrags behauptete, nur 9 von 43 Aufnahmen hätten noch ihr Video und
über 30 hingen am Telefon. **Beides falsch** — die Zahl 9 kam von der Suche an der falschen Stelle.

Richtig: **25 von 43 haben ihr Video lokal (7,9 GB).** Die 18 ohne haben auch auf dem Handy keins,
da fehlt also nichts. Genau **6 Videos** existierten nur auf dem Gerät (2,4 GB, das grösste
1,86 GB), fünf davon ganz ohne Backup — die sind seit dem 2026-08-20 in
`data/footage/phone-backups/f86dfdca-20260820-205905/files.tar` gesichert.

Die Entscheidung bleibt trotzdem offen: sollen die Quellvideos beim Export automatisch mitkommen,
damit dieser Zustand nicht wieder entsteht?

## Parität zwischen den webp-Exporten (2026-08-21)

**Ziel: bytegleiche Frames.** Kotlins `training-video-pack` und die Python-Kette
(`export-session` → `slice`) schneiden aus **derselben** Quelle — demselben Video, derselben
Aufnahme — und müssen dasselbe Bild liefern. Heute ist das ungeprüft.

Gemessen an `2026-08-15-22-48-04`: Kotlin nimmt 238 Frames und schreibt 15 232 Crops in
`training-pack/accepted/`, Python schneidet 17 114. Die Zahlen dürfen abweichen — die beiden
wählen bewusst verschieden aus —, aber **wo beide denselben Frame und dasselbe Feld schneiden,
müssen die Bytes gleich sein.**

Der Test dafür: eine Aufnahme, die beides hat (11 der 43 haben ein `training-pack`), die
Schnittmenge über (Frame, Feld) bilden und `sha256` je Crop vergleichen. Eine Abweichung ist eine
echte Divergenz in Warp, Mesh-Schnitt, Resize oder webp-Kodierung — und dann ist zu klären, welche
Seite recht hat.

Warum das zählt: die Geometrie ist über `mesh_crop_parity.json` schon dreifach gepinnt (Python,
Kotlin, TS, auf `1e-9`) — aber das pinnt **Kästchen-Koordinaten, nicht Pixel**. Kein Test hat je
ein Bild verglichen. Solange das offen ist, kann ein Modell auf Crops trainiert werden, die anders
aussehen als die, die der Tracker auf dem Gerät sieht.

Verwandt: der Sampler-Unterschied zwischen Python (`cv2.resize`, `INTER_AREA` beim Verkleinern) und
der Labeling-Oberfläche (bilinear pro Ausgabepixel) steht weiter oben in dieser Datei.
