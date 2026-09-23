# Spec-Index — der zurückgezogene Baum

`specs/` (47 Pakete, letzte Änderung 2026-08-13) ist zurückgezogen, der Volltext steht in git:

```bash
git show fd9c1908:specs/53-cnn-headroom/entry.md      # ein Spec lesen
git checkout fd9c1908 -- specs/                       # alles zurueckholen
```

Diese Seite hält die Landkarte Nummer → Titel (Tabelle am Ende) und das, was aus dem Baum bindend
bleibt. Was heute gilt, steht in `CLAUDE.md` und den Fach-Docs; die Regeln der Engine
(Invarianten, Ablehnungstabelle) in `docs/tracker-flow.md`.

## Was bindend bleibt

| Regel | Der Beleg |
|---|---|
| `val_acc` entscheidet nichts | `25` reihte die Läufe **umgekehrt**: `occ-v7dsbn` hatte Start und Plateau am besten (0,9486) — und 2,3× die Phantome |
| Phantome sind das Veto; darunter Margin, dann Misses; unter ~8 Misses ist Rauschen | `25`, Nutzerentscheid |
| Normalisierer nie bei einer gemeinsamen Rate vergleichen | `32`: dieselbe BN-Architektur 82 Misses bei 3e-4, 0 bei 3e-3 |
| Der Crop ist eine Modell-Eigenschaft; halb deklariert wird abgelehnt | `45`: Sessions mit `pad_side` 0,05 geschnitten, Python und Android gaben 0,10 vor |
| Das Brett vermisst sich selbst; ArUco ist nur die grobe Ecke | `41`: Feldversatz Median 29,83 → 2,00 px |
| Ein Blick ist nie eine Brücke — zwei übereinstimmende saubere Blicke je Recovery-Commit | `39`: 17/5/3 → 20/2/0 auf `VID_20260802` |
| Der Tracker-Output ist keine Ground Truth | `40`: die Zugliste gehört dem Menschen; der Export **verweigert** statt zu warnen |
| Eine neue Session ist eine **Ergänzung**, nie die Masse | `53`: 50 % Anteil → 105–133 Phantome; 5,3 % → 2; nur `occluded`-Zeilen (1,8 %) → 0 |
| Splits nur aus `split.json` | `33`: 400 zufällige Manifest-Reihenfolgen ergeben **einen** Split, Ursache unbekannt |
| Ecken `[a8, h8, h1, a1]` | `15`: eine falsche Rotation transponiert still alle Labels |
| Jede Messung misst ihre Baseline im selben Lauf | `26` fand `25`s Schwelle nicht wieder — `phone.yaml` war neu kalibriert, Path A schnitt durchs aktuelle Profil |

## Android-Rewrite: die zwei harten Regeln (`17`)

1. `:core-engine` sieht nur chesslib + kotlin-stdlib.
2. Die Engine ist eine **einthreadige** Zustandsmaschine — das entfernt die ganze Race-Klasse, die
   Pythons `self.lock` bewachte.

Beide als Test erzwungen (`ClasspathPurityTest`). Der Python-Tracker ist seit 2026-08-07 gelöscht
(Tag `python-tracker-final`): die 18 Parity-Fixtures existieren, lassen sich aber nicht mehr aus
Python neu erzeugen. Die Harness fährt die ausgelieferten Defaults
(`-Pchesslab.sim.defaults=true`), nicht die aufgezeichnete `effectiveConfig` jedes Clips.

## Normalisierung: warum BatchNorm, und bei welcher Rate

`25` schloss BatchNorm aus — gemessen bei `lr 3e-4`, dem Projekt-Default, den nie jemand gewählt
hatte (laut `31` Folklore ohne Quelle). `32` fragte auf der neu geschnittenen Geometrie wieder:

| Lauf | Norm | Init | lr | Phantome | Misses @ 0 Ph |
|---|---|---|---:|---:|---:|
| `occ-v6-f5nd` (damaliger Champion) | GN | — | — | 0 | 3 |
| `occ-v7bn` | BN | warm von GN | 3e-4 | **1 988** | — |
| **`occ-v7bn-s-lr3e3`** | **BN** | **scratch** | **3e-3** | **0** | **0** |
| `occ-v7gn-s-lr3e3` | GN | scratch | 3e-3 | 11 | — |

- **Die Grenze war GroupNorm, nicht die MACs:** BatchNorm exportiert 89 Knoten gegen 503, Desktop
  3,9 gegen 20,2 ms je 64 Crops. Deshalb durfte das Modell wieder wachsen.
- `22` hielt Multi-Scale für Gift für BatchNorm (293 Phantome); `32` misst mit denselben
  `--scales` null, sobald die Rate stimmt. Ursache war die Rate. `32` gewinnt über `22`–`26`.
- `CosineAnnealingLR(T_max=epochs)` bindet den Zeitplan an die Epochenzahl — „derselbe Lauf,
  länger" existiert nicht.

## Tracker-Befunde, die sonst nirgends stehen

- **Recovery zahlt für ihre Länge** (`53`): `plyCostSquares` 0 erfindet Brücken, 2 tötet die
  Recovery (003957 fällt von 67 auf 14 Plies), 1 ist ausgeliefert.
- **`motion_hold_s` hat einen Boden bei 0,34** (`19`): bei 0,32 trägt der erste Frame nach `Nf6`
  in `blender-scholars` 7 geänderte Felder gegen ein Limit von 6, der Tracker steht, und der
  spätere Commit verschluckt eine Dame. Kotlin steht auf 0,20, seit der Occluder-Hold abgespalten
  ist.
- **Das Gerät setzt die Decke** (`26`): QNN unerreichbar (`EACCES`, seit 2026-07-26 aus dem
  Build); die Latenzstreuung 61 → 75 ms war Throttling, nicht Contention. Per-channel A16W8 war der
  einzige phantomfreie Graph des Audits, float eingeschlossen — `_parity` sieht diese Fehlerklasse
  nicht.

## Sackgassen — gestorben an einer Messung

Die strukturell abgelehnten Ideen (Beam, HMM, Gate senken, …) stehen in `docs/tracker-flow.md`.

| Was | Gestorben woran | Spec |
|---|---|---|
| Markerloser Liniendetektor (`board_corners_from_lines`) | zweimal auf sechs Frames 775,6 / 897,5 px neben dem Brett, eingerastet auf Tisch- und Monitorkanten | `41` |
| `findChessboardCornersSB` / 2-D-Sattelpunkte | 0 von 30 Konfigurationen fanden das 7×7-Gitter; Figuren sitzen genau an der Verdeckungsgrenze | `41` |
| Saddle-Detektor als Ergänzung zum Bandfit | hinzunehmen macht es schlechter (5,73 gegen 5,14 px) | `30` |
| RANSAC statt Huber | 7,28 gegen 5,35 px — die Rillen unter Figuren sind eine systematische Minderheit, keine Ausreisser | `30` |
| CLAHE vor der Liniensuche | kein Gewinn — der Helligkeitsgradient ist nicht das Problem | `41` |
| Erst entzerren, dann messen | Gitterresiduum 1,48 → 4,24 px | `30` |
| Jitter-Augment gegen Geräte-Toleranz | `--jitter-translate 0.09`: 3 → 548 Misses | `30` |
| Precise-BN-Warmstart / DSBN / AdaBN auf dem fertigen Modell | 154 / 356 Phantome; AdaBN machte es schlechter (660 → 1 140) | `25` |
| Normalizer-frei (ScaledStdConv2d + SkipInit) | schnell (99 Knoten), aber `val_acc` Plateau 0,805 | `25` |
| `--patience` an `occ_board_acc` | 0,93⁶⁴ ≈ 1 % — killte einen Lauf in Epoche 9/20 | `25` |
| 13-Klassen-Softmax als Belegungsleser | 1 165 Phantome, nach Hard-Negative-Finetune 602, gegen eine Latte von 1 | `29` |
| Mehr CNN-Stimmen gegen systematische Feldfehler | `f4` war in 90 von 186 Observationen falsch — Stimmen verlieren gegen ein Feld, das 90-mal falsch ist | `18` |
| Höher aufgelöste Crops als Modellfix | < 0,2 pp, kein Clip ändert sich, 4× Kosten | `17` |
| Framing/Zoom (Sensor auf die Felder) | Gewinn nur 1,24–1,4× linear; grössere Warps kaufen nichts (`23`) | `24` |
| Batch-4-Verify | unerreichbar: `minConfidentBoard = 32`; senken hilft nicht, mit einer Hand stimmt der Check **leer** zu | `26`,`27` |
| Linsenkorrektur nur zur Inferenzzeit | 003957: 67 → 15 Plies; zahlt nur mit Retraining auf entzerrten Crops | `52` |
| „Ehrliches" Observer-Intervall im Replay (0,15 s) | 67 → 26 Plies | `52` |
| `cleanCommitsOnly` | feuerte auf keinem der drei Videos ein einziges Mal | `52` |
| Handgemalte `occluded`-Klasse | 87,9 % der Zellen aus Frames mit ≥ 11 Flags, davon 59,9 % laut FEN `empty` | — |
| `P_OCCLUDED_THR` gegen Phantome nachjustieren | an vier der fünf Phantom-Frames liest der Kopf `occl=0` | `53` |
| Telemetrie-Uplink mit mDNS-Discovery | die Discovery übernahm nach N Fehlschlägen jeden Endpunkt — ein Blackhole genügte | `34` |
| Tiefe als Review-Budget | in dünnen Endspielen war `depth 16` das kleinere Budget; heute `REVIEW_NODES` | `42`,`44` |
| Emulator als Screenshot-Gerät für den kalibrierten Tracker | nur die linke Frame-Hälfte kommt an, Marker verschwimmen beim Rescale | `49` |

## Die Fehlerform, die wiederkam

- **Ein Schwellwert, getunt gegen toten Code:** `occlusion_color_thr` stand „live getunt" auf 1,5,
  während das Veto nie aufgerufen wurde; lebendig überfeuerte es. Ebenso `shadow_veto` (`09`).
- **Ein Harness-Fehler, gelesen als Modellbefund** (`19`): `emit_parity_fixtures.py` lief mit
  `margin=0.0`, falsch für ArUco-Material. Jede damit auf ArUco-Material gemessene Zahl ist
  ungültig. Die Zahlen aus `18` stammen zudem von einem Export ohne ReLUs.

## Wo Specs und Code sich widersprechen — der Code gewinnt

- `census_thr`: `08` sagt 160, der Code 40 — 160 vetote echte Dunkel-auf-dunkel-Ankünfte.
- Debug-Oberflächen auf dem Handy: `12` D5 verbot sie; `51` begründet die offene Entwicklertür.
- Rotations-Augment: `04` verbietet es; erlaubt ist es nur train-time für Synth.
- `corrections.jsonl` liegt unter `data/recordings/<name>/`, nicht wie in `53` unter
  `data/manifests/`.

## Landkarte

| # | Titel |
|---|---|
| 08 | Android tracker (Kotlin): production port of `chesslab track` |
| 09 | Illegal-move referee & shadow-destination fix (Python tracker) |
| 10 | multi hypothesis |
| 11 | Streaming CNN observer & frame-signature contract (Python tracker) |
| 12 | Android parity port: 2026-07-09 Python tracker fixes → Kotlin |
| 13 | Android visual overhaul (dark tournament) + games library & analysis |
| 14 | Finlayson intrinsic-image channel (shadow-free diff input, experimental) |
| 15 | Markerless board detection under motion + piece occlusion (Python tracker) |
| 16 | Android correctness parity (port of the 2026-07-21 Python tracker fixes) |
| 17 | Android rewrite: strict Kotlin port of the Python move tracker |
| 18 | Occupancy model: make the CNN good at the one job it has |
| 19 | Live hardening: what a real recorded game exposed |
| 20 | Recovery honesty: stop inventing captures, stop fragmenting games |
| 21 | Give the observation piece identity back, so the alarm can fire again |
| 22 | Infer at the resolution the camera actually delivers |
| 23 | Resolution all the way down: the warp, the crop, and the model that ships |
| 24 | Frame the board: spend the sensor on the squares, not the table |
| 25 | Normalization endgame: can anything but GroupNorm ship? |
| 26 | Cheaper at the same quality |
| 27 | Can a local verify be as safe as the whole board? |
| 28 | Wider, not thinner |
| 29 | Widen the output band |
| 30 | sharper alignment |
| 31 | cite what we rely on |
| 32 | normalization on clean geometry |
| 33 | the reply that vanishes |
| 34 | Diagnostics you can read |
| 35 | One seam per concern |
| 36 | Alignment leaves the user interface |
| 37 | A way back |
| 38 | The rows land in Grafana |
| 39 | What the tracker remembers |
| 40 | Label a real game |
| 41 | The board is its own ruler |
| 42 | One board, two clocks |
| 43 | The camera when you ask for it |
| 44 | A review you can read |
| 45 | The crop belongs to the model |
| 46 | A position analysed once |
| 47 | One interface |
| 48 | Paper and ink |
| 49 | The screen you play in front of |
| 50 | Give the review back |
| 51 | One door for developers |
| 52 | The harness runs what ships |
| 53 | The occluded class exists, and a human can afford to check it |
| 54 | A screen anyone can read |
