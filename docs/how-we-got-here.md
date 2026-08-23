# Wie sind wir hierher gekommen

Die Wendepunkte des Projekts, jeweils mit der Messung, die sie ausgelöst hat, und dem Datum.
Kein Erzähltext: eine Zeile pro Befund. Was heute gilt, steht in `CLAUDE.md` und in den Fach-Docs —
hier steht, **warum** es gilt und was dagegen versucht wurde.

Quelle ist der zurückgezogene Spec-Baum (47 Pakete, 382 Dateien, letzte Änderung 2026-08-13).
Landkarte Nummer → Titel → Verweise: `docs/specs-index.md`. Volltext in git unter `fd9c1908`:

```bash
git show fd9c1908:specs/32-normalization-on-clean-geometry/STATUS.md
git checkout fd9c1908 -- specs/          # alles zurueckholen
```

Projekt-Beginn `913b82cf`, 2026-06-29. Bis 2026-08-20: 1 133 Commits, sieben Wochen.

## Die Achse

| Datum | Wendepunkt | Die Messung dahinter | Spec |
|---|---|---|---|
| 2026-06-30 | Blueprint „Stufe 0–6": doctor · Kalibrierung · Spielstand · Capture+Labeling · Dataset · Training (**13 Klassen**) · Collect-UI | — | `00`–`06` |
| 2026-07-09 | Referee: „lieber verweigern als erfinden" | Hand über h1 → Phantom `h1→g1`; dann eine physisch illegale Rochade → Recovery committete die nächstliegende legale Fiktion | `09` |
| 2026-07-19 | Markerloses Brett geplant | **Nie ausgeführt.** Literatur: reine Geometrie-Detektion erreicht 34–50 % unter Bewegung + Verdeckung | `15` |
| 2026-07-26 | **Klassenkollaps auf 2** (`empty`/`occupied`) | Whole-Board-Occ **0,0293 → 0,9422**, Misses **8 826 → 49** (18 Clips, 1 366 Observationen) | `18` |
| 2026-07-26 | Strikter Kotlin-Port beginnt | Dreimal nachgepatcht, **kein einziger der ~40 live-getunten Schwellwerte je verifiziert** | `17` |
| 2026-07-27 | Live-Härtung an echter Aufnahme | Commit-Latenz = `motion_hold_s + 0,05…0,07` bei 30 fps; Boden **0,34** | `19` |
| 2026-07-28 | Recovery-Ehrlichkeit — Fund nebenbei | **Der Illegal-Move-Alarm war toter Code**, seit `18`: ein 2-Klassen-Modell liefert nie ein `label` | `20` |
| 2026-07-29 | `infer_size` wird Modell-Eigenschaft | `occ-v4-f3e20`: 32 px 227 · 64 px 39 · **96 px 19** · 128 px 43 Misses | `22` |
| 2026-07-31 | EP-Audit auf dem Gerät | QNN nicht im Build · **94 Fragmente über 47 Convs** · ~36 ms Faltung, ~30 ms Fragmentierung | `26` |
| 2026-07-31 | Alle 19 Sessions neu gefittet und neu geschnitten | Median-Feldkantenversatz **3,2–6,5 px → 2,0–3,3**; Geometrie allein: 1 Phantom/13 Misses → **0/3** | `30` |
| 2026-08-01 | **Normalisierung neu gefragt, auf sauberer Geometrie** | BN, Scratch, lr 3e-3: **0 Phantome / 0 Misses / Margin 0,035** — besser als GroupNorm | `32` |
| 2026-08-02 | Alignment-UI ersatzlos gestrichen | Gespeicherte Ecken sind nur ein Seed, `LiveAlign` überschreibt sie alle 3 Frames. **−935 Zeilen** | `36` |
| 2026-08-03 | **Das Brett ist sein eigenes Lineal** | `VID_20260802_222741`: `moves: []` → **22 Plies**; schlechtester Feldversatz Median **29,83 → 2,00 px** | `40`,`41` |
| 2026-08-06 | **Der Crop gehört dem Modell** | 0,10 vs 0,05 widersprach sich auf a7/c7/b8/h8; Python-Default → **0,05** | `45` |
| 2026-08-07 | **Python-Tracker gelöscht** (`ae56263b`, Tag `python-tracker-final`) | Kotlin ist die Referenz; `:desktop` fährt denselben Tracker | `52` |
| 2026-08-08 | Harness fährt die ausgelieferten Defaults, nicht die aufgezeichneten | Parity 18/18 · Defaults **16/18** · CNN an **7/18** (neun Clips committen nichts) | `52` |
| 2026-08-08 | Echte Partie exportiert und vorgeschlagen | **1 729 Frames → 110 656 Crops**; 126 720 Vorschläge, Präzision **12/12** auf 30 geschichteten Zellen | `53` |
| 2026-08-09 | **14. Klasse: funktioniert, zahlt sich nicht** | Path A 0 Phantome, Margin 2,3× besser als der Champion — die dichte Auswertung wird trotzdem nicht sicher | `53` |
| 2026-08-09/10 | Modellfreies Hand-Veto aus den Brettrillen | 003957: **38/67 Plies mit 4 erfundenen → 67/67 mit 0 erfundenen** | `53` |
| 2026-08-17/18 | `occluded` verlässt den Softmax, wird Coverage-Regression | 87,9 % der Zellen aus Frames mit ≥ 11 Flags; 59,9 % davon laut FEN `empty` | — |
| 2026-08-20 | 2-Klassen-Schema ersatzlos gelöscht, beide Seiten | — | — |

## Klassen: 13 → 2 → 13 → 14 → 13 + Coverage

Chronik mit Commits: `docs/class-scheme.md`. Hier nur, was jede Kehre **gemessen** hat.

- **13 war der Anfang** (`05`: *„a per-square classification model (13 classes)"*). Der Kreis
  schliesst sich am 2026-08-18.
- **Auf 2 (`18`).** Gegen `tiny-p3` bei identischer Diff-Referenz: Clips 14/18 → 16/18, Misses
  8 826 → 49. Bei 112 px/Feld nachgemessen weitet sich das: `tiny-p3` fällt auf 6/18, und **822
  seiner 924 verbliebenen Misses sind ein einziges Feld** (`f8`, `bB→empty` 777×).
- **Der Preis war benannt.** `blender-underpromo` committet `e8=Q+` wo `e8=N` steht — *„a pure
  IDENTITY question a 2-class model structurally cannot answer"*. Und der Illegal-Move-Alarm war
  damit tot (`20`).
- **Der 39:1-Miss-Bias war eine Clip-Domäne, keine Modell-Eigenschaft:** auf der echten Session
  `20260721-205618` (~200 px/Feld) macht dasselbe Modell **0 Misses und 92 Phantome**.
- **Zurück auf 13 (2026-07-31),** weil der Crop-Pool null `occluded`-Zeilen trug und ein
  untrainierter 14. Logit ein Argmax trotzdem gewinnt. **Identität darf dabei nie committen**
  (`21`): Figurentyp lag bei 0,46–0,59 gegen Belegung ~0,99.
- **Ein 13-Klassen-Softmax taugt nicht als Belegungsleser** (`29`): als solcher gelesen **1 165
  Phantome**, nach Hard-Negative-Finetune **602** — gegen eine Messlatte von 1. Daraus folgt der
  heutige Aufbau: Identität aus einem Kopf, der sie nicht aus der Belegung bezahlen muss.

## Geometrie: warum ArUco grob bleibt und kein Deep Learning kommt

- **ArUco liefert die grobe Ecke, der Grid-Fit die Genauigkeit.** `41` löschte
  `board_corners_from_lines` (*„decided by measurement"*): auf sechs Probeframes gab der
  markerlose Liniendetektor zweimal ein Quad zurück — **775,6 px und 897,5 px** neben dem Brett,
  eingerastet auf Schreibtisch- und Monitorkanten.
- **Ein Drei-Marker-Quad ist projektiv falsch, nicht affin** — es ist
  `cv2.getAffineTransform`s Parallelogramm anstelle einer Perspektive. Kette auf sechs Frames
  (Zelle 100 px): roh 24–37 px → affin 6,8–17,8 → **projektiv 1,86–2,10**.
- **Das alte Maß log.** `line_positions` pinnte Index 0 und 8 auf 0 und `board_size`; ein reiner
  Skalenfehler las sich 25 % zu klein, der Test behauptete das als *strukturell*, und das gepinnte
  Maß zertifizierte **302 Frames**, deren Gitter mit blossem Auge falsch ist. Heute:
  `MAX_OFFSET_FRAC = 0.04` und alle 18 Linien gelesen, sonst `unread` und durchgefallen.
- **Markerloser Kaltstart wurde geplant und nie gebaut** (`15`, fünf Phasen `todo`). Es gibt keine
  eigene Messung dafür oder dagegen.
- **Eine GESPEICHERTE Linsenkorrektur macht das Alignment schlechter, eine aus dem Brett gefittete
  nicht.** Die Zahlen 15,1 gegen 21,7 px standen hier als Tatsache, sind aber am 2026-08-07
  zurückgezogen worden (`dbbd4582`, durchgestrichen in `BoardLens.kt:90`): gemessen am 2026-07-21
  auf dem blanken ArUco-Quad, bevor `refinedQuad` im Pfad war. Neu über 60-Frame-Mediane: roh
  4,7–5,5 px, gespeicherte `calib.json` 4,4–5,3 (Vorzeichen kippt zwischen Sitzungen, Varifokal),
  aus dem Brett gefittet **3,5–3,9**. Der projektive Grid-Fit absorbiert den Grossteil selbst.
- **Trotzdem ist die Linse nicht im Pipeline-Pfad** (gemessen 2026-08-21, drei Rig-Aufnahmen,
  Hold-out): roher Brett-Bogen 15,2–16,6 px, Gitter-Mesh allein 0,9–1,1, gefittete Linse allein
  3,0–4,4, beides 0,4–0,7. Auf 116 px Zellbreite ist das Mesh-Ergebnis unter einem Prozent einer
  Zelle. Der Mesh gewinnt, die Linse ist Beiwerk (`scripts/straighten_ab.py`).
- **Der Restfehler ist systematisch pro Aufbau** — zwei Sessions unterscheiden sich im Vorzeichen.
  Kalibrier-Konstante, kein globaler Wert.

## Auflösung und Crop

- **Nicht die Sensorauflösung zählt, sondern die Box.** `crops_for_frame` warpt zuerst auf
  `board_size`; was ankommt, ist `board_size / 8 × (1 + 2·pad_side)` — auf dem festen Rig 110 px.
  Grössere Warps kaufen nichts (`23`), und das Bild zu füllen kauft 1,24–1,4× linear statt der
  2,7× des alten Docstrings (`24`). Bei 80 px Eingang ist Auflösung nicht der Engpass.
- **Eine untrainierte Grösse versagt still:** `occ-v4-f3e20` liest bei 80 px **133** besetzte
  Felder als leer, bei 96 px 19, bei 48 px 916. Ein Miss lizenziert ein erfundenes Schlagen.
- **Native Auflösung streut je Session um mehr als 2×** (96,9 · 173,2 · 102,3–214,0 px/Feld) —
  und **jeder Split ist genau eine Session**. Deshalb ist `--scales` Teil des Rezepts: ohne sie
  gehen 64 px Eingang auf 347 Misses / 599 Phantome. Bei 96 zu servieren geht nur, *weil* 96
  trainiert wurde.
- **Der Crop gehört dem Modell** (`45`): jede reale Session war mit `pad_side` 0,05 geschnitten,
  während Python und Android 0,10 vorgaben und keine der sieben gebündelten `config.json` überhaupt
  einen Crop deklarierte. Halb deklariert wird heute abgelehnt, sonst setzt sich eine Box zusammen,
  die niemand gewählt hat.

## Normalisierung: der teuerste Umweg

`25` (2026-07-30) schloss BatchNorm mit fünf Messungen aus und erklärte die Frage für beendet.
`32` (2026-08-01) öffnete sie **einmal** wieder — weil eine der fünf Ursachen „die Daten" war und
die Daten sich am 2026-07-31 geändert hatten.

| Lauf | Norm | Init | lr | Phantome | Misses @ 0 Ph | Margin |
|---|---|---|---:|---:|---:|---|
| `occ-v6-f5nd` (Champion) | GN | — | — | 0 | 3 | 0,050 / 0,093 |
| `occ-v7bn` | BN | warm von GN | 3e-4 | **1 988** | — | 1,000 |
| `occ-v7bn-s` | BN | scratch | 3e-4 | 0 | 82 | 0,298 |
| `occ-v7bn-s-lr1e3` | BN | scratch | 1e-3 | 0 | 16 | 0,055 |
| **`occ-v7bn-s-lr3e3`** | **BN** | **scratch** | **3e-3** | **0** | **0** | **0,035** |
| `occ-v7gn-s-lr3e3` | GN | scratch | 3e-3 | **11** | — | 0,990 |

- **`lr 3e-4` wurde nie gewählt, es war der Projekt-Default** — laut `31` reine Folklore ohne
  Quelle. BatchNorms einziger von der Literatur zugesprochener Vorteil ist die Toleranz für
  grössere Raten (Bjorck et al., arXiv:1806.02375); es bei GroupNorms Rate zu testen entfernt genau
  diesen Vorteil. Seit 2026-08-14: nur BatchNorm, `bn` im Namen.
- **Es zahlt zweimal.** BatchNorm exportiert **89 Knoten** gegen GroupNorms **503**, Desktop-CPU
  3,9 gegen 20,2 ms je 64 Crops. Auf dem Handy projiziert ~1,8×, nicht 5,2 — genug, dass das Modell
  wachsen darf: `occ-v9bn-wide` (2,50 M Parameter, 27,0 MMAC/Crop) läuft in **24,0 ms gegen die
  30,0 ms** des ausgelieferten GroupNorm-Graphen.
- **`CosineAnnealingLR(T_max=epochs)`** bindet den Zeitplan an die Epochenzahl. „Derselbe Lauf,
  länger" existiert nicht — jede frühere Lesart „es war konvergiert" aus einer Kurve ist verdächtig.
- **Der like-for-like-Vergleich fehlt bis heute:** der Champion ist eine Dreistufenkette
  (Synth-Pretrain → Pretrain → Real-Finetune). BatchNorm hat diese Kette **nie** bekommen.

## Der Tracker: von Python nach Kotlin

- **2026-07-26** beginnt der strikte Port (`17`) mit zwei als Test erzwungenen Regeln:
  `:core-engine` sieht nur chesslib + kotlin-stdlib, und es ist eine **einthreadige**
  Zustandsmaschine — das entfernt die ganze Race-Klasse, die Pythons `self.lock` bewachte. Beweis
  ist die Parity-Harness: 18 Clips, 969 Frames, null divergierende Frames. Das fps-Ziel ≥ 15 wurde
  nicht erreicht (~10,5–11 auf dem letzten gemessenen Build).
- **2026-08-07** wird der Python-Tracker als Ganzes gelöscht. Damit sind `pytest -m clips`,
  `emit_parity_fixtures.py` und `replay_clip_cnn.py` weg: **die 18 Fixtures existieren weiter,
  lassen sich aber nicht mehr aus Python neu erzeugen.**
- **Die Harness beurteilte die falsche Konfiguration.** Bis `-Pchesslab.sim.defaults=true` las jeder
  Clip seine *aufgezeichnete* `effectiveConfig`. Wirksamkeit bewiesen statt behauptet:
  `motionHoldS = 5.00` bewegt den Defaults-Lauf 16/18 → **5/18**, während der Parity-Lauf unter
  derselben Änderung byte-identisch blieb.
- **`motion_hold_s` hat einen gemessenen Boden.** Bei 0,32 trägt der erste Detektionsframe nach
  `Nf6` in `blender-scholars` **7** geänderte Felder gegen ein Limit von 6, der Frame fällt als
  `too_many_changed`, der Tracker steht 33 ruhige Frames, `Qxf7` wird gespielt und der spätere
  Commit verschluckt die Dame. Python trägt darum bis heute `0.34`; Kotlin steht auf `0.20`, seit
  der Occluder-Hold davon abgespalten wurde (`TrackerConfig.kt:101`).
- **Eine stille Ein-Ply-Desynchronisation lebte in Produktion** (`33`): `VerifySingle.evaluate`
  filtert die Antwort eines Paar-Kandidaten gegen die Position **vor** dem Zug, wo sie nie legal
  ist. `VerifyPair.tick` war unerreichbar, und der Commit-Anker landete auf einem Frame, der bereits
  beide Halbzüge zeigt.
- **Ein Blick ist nie eine Brücke** (`39`): zwei übereinstimmende saubere Blicke pro
  Recovery-Commit. Auf `VID_20260802`: 17 gefunden / 5 verpasst / **3 erfunden** → **20 / 2 / 0**.
- **Der Alarm heilte sich selbst** (`16`): das Rauschmodell lernte weiter, während er hing. Lernen
  friert seither ein, solange der Alarm steht.
- **Recovery zahlt für ihre Länge** (`53`): `plyCostSquares` 0 erfindet Brücken, 2 tötet die
  Recovery ganz (003957 fällt von 67 auf 14 Plies), 1 ist ausgeliefert.
- **Das Gerät setzt die Decke.** QNN ist auf dem Testgerät unerreichbar (`open_shell` → `EACCES`,
  227 ms gegen 97 ms auf der CPU, seit 2026-07-26 aus dem Build), der Graph zerfiel an der
  Normalisierung in 94 Fragmente, und die Latenzstreuung 61 → 75 ms war Throttling (34,0 → 37,1 °C),
  nicht Contention. Per-channel A16W8 ist der einzige phantomfreie Graph des Audits, float
  eingeschlossen — und der eingebaute `_parity`-Check sieht diese Fehlerklasse nicht.

## Labeling: warum die Hand die Labels nicht kaputt macht

- **Das Brett ist der Zeuge, nicht die Hand.** Eine Hand über einem unveränderten Brett ist
  `occluded` und **behält** ihre FEN — genau daraus bestehen die Verdeckungs-Labels.
- **Das Hand-Veto ist modellfrei** (`gridOccluded`, 2 Achsen × 9 Linien × 8 Bänder), weil die
  CNN-Seite ohne `occluded`-Klasse `pOccluded = 0.0` liefert.
- **Nur handförmige Flags zählen** (≥ 1 orthogonal benachbartes Paar). Jedes Flag zu zählen macht
  ein Replay blind, sobald eine Figur über ihre Rillen lehnt — auf `VID_20260802` flaggt ein Feld
  (c8) **73 % aller Frames**. Eine Zählschwelle von 3 lässt dagegen den 2-Flag-Schwanz der
  abziehenden Hand genau die Fabrikation committen, die das Gate stoppen soll.
- **Auflösung ist tragend:** im vollen Crop-Warp 2 / 11 / 2 fehlende Segmente auf
  sauber / Hand / sauber — bei detSize 30–40 von 144 ersäuft das Signal.
- **Der Export ertränkte den Korpus** (`53`): zwei exportierte Sessions stellten 63 354 von 127 162
  Trainingszeilen — **50 %**. Bei 13 Klassen produziert derselbe Korpus 165 Misses und null
  Phantome, bei 14 Klassen 105–133. Der Kollaps ist die **Domänen-Dominanz**, nicht die neue
  Klasse: bei 5,3 % Anteil bleiben 2 Phantome, mit nur den `occluded`-Zeilen (1,8 %) **null**.

## Sackgassen — mit dem Grund, an dem sie starben

| Was | Gestorben woran | Spec |
|---|---|---|
| 2-D-Sattelpunkte / `findChessboardCornersSB` für die 81 Kreuzungen | **0 von 30 Konfigurationen** fanden das 7×7-Gitter; die Rille ist ein Tal breiter als der ±4-px-Boxkernel, und die Verdeckungsgrenze liegt bei Blob ≈ 0,8 × Zelle — genau dort sitzen Figuren | `41` |
| Saddle-Detektor als Ergänzung zum Bandfit | 27–38 von 49 Kreuzungen, Residuum 2,32 px gegen 1,10; *hinzunehmen* macht es schlechter (5,73 gegen 5,14) | `30` |
| RANSAC statt Huber | 7,28 px gegen 5,35 — die schlechten Samples sind keine dünnen Ausreisser, sondern eine systematische Minderheit (Rillen unter Figuren) | `30` |
| CLAHE vor der Liniensuche | 3,04/2,22/1,93 gegen 3,12/2,21/1,80 ohne — der 6×-Helligkeitsgradient ist nicht das Problem | `41` |
| Erst entzerren, dann messen | Gitterresiduum 1,48 → **4,24 px**; diese Frames sind bereits korrigiert | `30` |
| Jitter-Augment, um die Geräte-Toleranz zurückzuholen | `--jitter-translate 0.09`: 3 Misses → **548**. Jitter in der Grössenordnung des entfernten Fehlers zerstört die Feldlesung 180-fach | `30` |
| Precise-BN-Warmstart | 154 Phantome — 4,3× besser als die Kontrolle, 154 schlechter als der Champion | `25` |
| DSBN (eine Statistik je Domäne) | **356** Phantome: die starke Form des Hebels ist schlechter als die schwache | `25` |
| Normalizer-frei (ScaledStdConv2d + SkipInit) | Tempo-Prämisse hielt komplett (**99 Knoten** statt 503), Genauigkeit nicht: `val_acc` plateau 0,805 | `25` |
| AdaBN auf dem fertigen Modell | Shift nur 0,034 σ; die korrigierten Statistiken einzusetzen machte es **schlechter** (660 → 1 140) | `25` |
| `--patience` an `occ_board_acc` gehängt | Bei `val_acc` 0,93 ist 0,93⁶⁴ ≈ 1 %, strukturell 0 — killte `occ-v6bn-f5nd` in Epoche 9/20 und wählte den Checkpoint blind | `25` |
| BatchNorm warm aus GroupNorm-Gewichten | `train_loss` 4,39 in Epoche 0 gegen GNs 0,126. **Kein Beleg über BatchNorm**, nur festgehalten, damit es niemand wiederholt | `32` |
| Focal Loss für Belegung | Kleine Regression (15/18 gegen 16/18). `--loss ce` bleibt Default | `18` |
| Mehr CNN-Stimmen gegen systematische Feldfehler | *„2 votes, 3 votes or 10 votes all lose to a square that is wrong 90 times in a row"* — `f4` war in 90 von 186 Observationen falsch | `18` |
| Höher aufgelöste Crops als Modellfix | < 0,2 pp Fehler, kein Clip-Ergebnis ändert sich, 4× Kosten (15,6 gegen 3,9 ms je Observation) | `17` |
| Batch-4-Verify (Faktor 8,2 nachgewiesen) | Unerreichbar: `minConfidentBoard = 32`, eine 4-Felder-Observation hat höchstens 4 sichere Felder. Senken hilft nicht — mit einer Hand über dem Brett stimmt der Check **leer** zu | `26`,`27` |
| Intrinsic-Image-Kanal (Finlayson, ECCV 2004) | Gebaut, default-off ausgeliefert, **nie live validiert** („Brett eingepackt"), inzwischen gelöscht. Übrig: die verwaiste `tests/data/intrinsic_golden.json` | `14` |
| Beam-Search / Multi-Hypothese | Freigegeben, begrenzt (K ≤ 4, Tiefe ≤ 4), **nie gebaut** — und ausdrücklich kein Ersatz für den Alarm: *„no branch contains an illegal move"* | `10` |
| HMM / Viterbi-Glättung | Glättung setzt bedingt unabhängiges Rauschen voraus; hier ist der Fehler systematisch pro Feld — korreliertes Rauschen macht den Glätter über die Zeit *sicherer* im Falschen | `39` |
| Ein Gate senken, wenn ein Kandidat wiederholt scheitert | Erzeugt Phantome, und Phantome sind das Veto | `39` |
| `board_size` 1600 am Inferenzpunkt | ±10 Misses von 1 715, ohne Richtung — Jitter, kein Signal | `23` |
| Quantisierter Graph auf 96 px | Der Kalibrator resized auf `out_size` und fragt `infer_size` nie; ORT lehnt 128 gegen 96 ab. Asset **fallen gelassen, nicht ersetzt** | `23` |
| Framing/Zoom-Paket (Sensor auf die Felder) | Phasen 00–03 nie gelaufen; der Gewinn ist ohnehin 1,24–1,4× linear | `24` |
| Linsenkorrektur nur zur Inferenzzeit | 003957 fällt **67 → 15 Plies**. Der Hebel ist an die Daten gekoppelt und zahlt nur mit Retraining auf entzerrten Crops | `52` |
| „Ehrliches" Observer-Intervall im Replay (0,15 s) | 67 → 26 Plies. Jeder gute Lauf hatte frei beobachtet (5 069 gegen 1 013 Observationen). Zwei Rivalen-Hypothesen vorher per A/B beerdigt | `52` |
| `cleanCommitsOnly` (nur committen, wenn nichts nach Hand aussieht) | Das strenge Gate feuerte auf **keinem** der drei Videos ein einziges Mal | `52` |
| Handgemalte `occluded`-Klasse | 87,9 % der Zellen aus Frames mit ≥ 11 Flags; 59,9 % davon laut FEN `empty` — 12 865 leere Felder als *besetzt* trainiert | — |
| 14-Klassen-Kopf from scratch | `val_acc` **0,08** in 15 Epochen. `--resume` vom Champion ist Pflicht (276 Tensoren übernommen, 2 übersprungen) | `53` |
| `P_OCCLUDED_THR` nachjustieren gegen Phantome | An vier der fünf Phantom-Frames liest der Kopf `occl=0`. **Keine niedrigere Schwelle verhindert eines der 12** | `53` |
| Telemetrie-Uplink (Ktor + Spool + mDNS + FastAPI + DuckDB) | Die Discovery adoptierte einen mDNS-Endpunkt nach N Fehlschlägen automatisch — den echten Server zu blackholen genügte, um die Übernahme auszulösen. *„And phase 00 did not compile."* | `34` |
| Tiefe als Review-Budget | `depth 16` war manchmal das *kleinere* Budget: in dünnen Endspielen erreichen 400 ms Tiefe 31. Heute zählt der Knoten (`REVIEW_NODES = 1_500_000`) | `42`,`44` |
| Emulator als Screenshot-Gerät für den kalibrierten Tracker | Von zwölf Zellen erreichen die App nur die **linke Hälfte** des Frames; fünf Clip-Varianten scheiterten an der Rescale-Unschärfe der Marker | `49` |

## Die Fehlerform, die dreimal wiederkam

- **Ein Schwellwert, getunt gegen toten Code.** `occlusion_color_thr` stand auf 1,5, „live getunt" —
  während das Farb-Gamut nie gebaut und das Veto nie aufgerufen wurde; sobald es lebte, überfeuerte
  1,5, heute 3,0. Dieselbe Form: `shadow_veto` wurde nie an `_generate_hypothesis` übergeben (`09`),
  und `board_corners_from_lines` hatte einen Monat lang keinen Aufrufer (`15`).
- **Ein Harness-Fehler, gelesen als Modellbefund.** `19` wurde geschrieben, um ein Phantom `Kd2` zu
  beseitigen. Am 2026-07-27 zeigte sich: `emit_parity_fixtures.py` lief mit `margin=0.0`, falsch für
  ArUco-Material — bei 0,00 committen 2 232 von 2 996 Frames nichts, bei 0,03 dreizehn Plies. Bei
  passender Geometrie sind Vor- und Nach-Veto-Zugliste identisch. **Jede auf echtem ArUco-Material
  durch die alte Harness gemessene Zahl ist ungültig.**
- **Eine Zahl aus einer fremden Tabelle.** `26` fand die Qualitätsschwelle aus `25` nicht
  reproduzierbar — bei leerem `git diff` für `src/` und `scripts/`. Ursache: `phone.yaml` war
  zwischendurch neu kalibriert worden, und Path A schneidet die Crops durch das *aktuelle* Profil.
  Regel seither: **jede Phase misst ihre eigene Baseline im selben Lauf wie den Kandidaten.**

## Was bindend bleibt

| Regel | Der Beleg |
|---|---|
| `val_acc` entscheidet nichts | `25` reihte die Läufe **umgekehrt**: `occ-v7dsbn` hatte den besten Start (0,8457) und das beste Plateau (0,9486) — und 2,3× die Phantome von Phase 00 |
| Phantome sind das Veto; darunter nach Margin, dann Misses; Unterschiede unter ~8 Misses sind Rauschen | `25` entry, Nutzerentscheid |
| Normalisierer nie bei einer gemeinsamen Rate vergleichen | `32`: dieselbe BN-Architektur geht bei 3e-4 auf 82 Misses, bei 3e-3 auf 0 |
| Der Crop ist eine Modell-Eigenschaft, keine Profil-Eigenschaft | `45`; halb deklariert wird abgelehnt |
| Das Brett vermisst sich selbst; ArUco ist nur die grobe Ecke | `41`: 29,83 → 2,00 px Median |
| Kotlin ist die Referenz | `52`, Tag `python-tracker-final` |
| Ein Blick ist nie eine Brücke | `39`: 17/5/3 → 20/2/0 |
| Der Tracker-Output ist keine Ground Truth | `40`: die Zugliste gehört dem Menschen, ein unbestätigter Kandidat wird nie Fixture, und der Export **verweigert** statt zu warnen |
| Eine neue Session ist eine **Ergänzung**, nie die Masse | `53`: 50 % → 105 Phantome; 5,3 % → 2; nur `occluded`-Zeilen (1,8 %) → 0 |
| Splits sind nicht aus Parametern reproduzierbar — immer `split.json` | `33`: 400 zufällige Manifest-Reihenfolgen ergeben **einen** Split; die Ursache ist bis heute unbekannt |
| Ecken-Reihenfolge `[a8, h8, h1, a1]` ist sakrosankt | `15`: eine falsche Rotation transponiert still alle Labels |

## Wo sich zwei Specs widersprechen

- **GroupNorm vs. BatchNorm.** `22`, `23`, `25` und `26` sagen alle „GroupNorm bleibt", `25` sogar
  *„the question is settled … do not reopen"*. `32` hebt das auf sauberer Geometrie und mit
  symmetrischem lr-Gitter auf. **`32` gewinnt** — jüngeres Datum, neue Daten, und `CLAUDE.md` folgt
  ihm seit 2026-08-14. `25`s Ausschlussmessungen bleiben gültig, aber nur *„bei lr 3e-4"*.
- **Multi-Scale.** `22` misst Multi-Scale als *Gift* für BatchNorm (293 Phantome); `32` misst mit
  demselben `--scales 48,64,80,96` null Phantome, sobald die Rate stimmt, und die diskriminierende
  Zeile `occ-v7bn-s1scale` (nur 80 px) wird **schlechter**, nicht besser. Ursache war die Rate.
- **Die Zahlen aus `18`.** `19` hält fest, dass 0,9422 und ihre Nachbarn auf einem Netz gemessen
  wurden, dem der ONNX-Export **alle 30 ReLUs** entfernt hatte, und nennt sie *suspect*. `18` wurde
  nie korrigiert; nach dem Retrain: 17 Misses / 0 Phantome statt 49 / 44.
- **`census_thr`.** `08` portiert 160 als verbatim-Wert; `config.py` steht auf 40,0 und begründet
  es: 160 vetote echte Dunkel-auf-dunkel-Ankünfte als Schatten. **Der Code gewinnt.**
- **Debug- und Tuning-Oberflächen auf dem Handy.** `12` D5 verbot sie ausdrücklich
  (Nutzerentscheid 2026-07-10); heute liefert die App `KnobCatalog.kt` und mehrere CNN-Debug-Panels
  aus, und `51` begründet, warum die Entwicklertür **kein** Schloss hat. **D5 ist überholt.**
- **Rotations-Augment.** `04` verbietet Spiegeln und 90°-Rotation kategorisch (die Feldfarbe hinge
  daran); `CLAUDE.md` erlaubt Rotation train-time für Synth. Die Ausnahme gilt nur für Synthetik.
- **Wo `corrections.jsonl` liegt.** Die Eigentums-Tabelle in `53` nennt
  `data/manifests/corrections.jsonl`; der ausgelieferte Writer schreibt
  `data/recordings/<name>/corrections.jsonl`. **Der Code gewinnt.**
