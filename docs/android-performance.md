# Android: Strom und Leistung

Geraet ueberall `24117RK2CG` (SM8650), Android 16, ausser wo anders genannt. Drei Aussagen nicht
verwischen: Code, den Telefon und Desktop teilen; Code, den die App wirklich einschaltet; und
Tempo, das am Telefon gemessen und nicht aus dem Desktop-Replay abgeleitet ist. Offline-Decoder,
Alignment-Caches, mehrere Klassifikator-Sessions und `visualworkers` sind nur Desktop; Android
laesst `TrackerSeed.parallelCrops` auf `false` und hat eine CNN-Observation zur Zeit.

## Strom

### Das Messgeraet

`simpleperf`, `/sys/class/power_supply` und `batterystats --reset` sind auf diesem Geraet zu. Was
geht:

```bash
adb shell cmd battery get -f current_now          # µA; NEGATIV heisst: laedt in den Akku
adb shell dumpsys battery | grep 'Charge counter'
adb shell dumpsys thermalservice | grep -E 'socd|skin|ibat'
```

Gegengeprueft am `Charge counter` (780 gegen 790 mA). Jede Zahl ist ein **Netto**-Strom am PC-USB
(900 mA bei 5 V), Bildschirm an bei 79/255 — die **Differenzen** sind das Ergebnis.

### Wohin der Strom geht (2026-08-24/25)

Anlass: das Telefon entlud sich am Ladegeraet, 16 -> 14 % ueber zwei Stunden, SoC bis 72 °C.

| was laeuft | netto | eigene Last |
|---|---:|---:|
| App gestoppt, Bildschirm an (der Boden) | −775 mA | — |
| Kamera + Vorschau + QHD-Encoder, keine Erkennung | +18 mA | ≈ 793 mA |
| Tracking, Observer frei, Rec an, 1440p, **30 fps** | +452 mA | ≈ 1227 mA |
| **dasselbe bei 15 fps — ausgeliefert** | **−38 mA** | **≈ 737 mA ≈ 2,7 W** |
| 30 fps, `observerIntervalS = 0.20` | +164 mA | ≈ 939 mA |
| 15 fps plus `0.20` | −154 mA | ≈ 621 mA |
| dasselbe, Bildschirm aus | −225 mA | ≈ 550 mA |

- **Die Bildrate ist der Hebel, nicht die Rechenzeit.** 30 -> 15 fps sind 490 mA ≈ 1,8 W. Kamera
  und Encoder allein sind zwei Drittel der Kosten; an der Bildrate haengen Sensor, ISP,
  Voll-Frame-Convert, ROI-Motion und Encoder.
- **Der Bildschirm ist es nicht:** 25-71 mA. Mit Bildschirm aus laeuft alles weiter, Aufnahme
  eingeschlossen — `TrackerService` ist ein Foreground-Service vom Typ `camera` und haelt die
  Kamera am eigenen Lifecycle.
- Vergleichbar sind nur Laeufe innerhalb eines Builds (jeder Install killt die App); die ~142 mA
  fuer den Rekorder sind eine Schaetzung ueber eine Build-Grenze.

### Die Bildrate: 15 / 24 / 30, Vorgabe 15

`AppSettings.frameRate`; 30 ist der Ausweg, wenn eine Partie mehr Frames braucht (Nutzer,
2026-08-25). Bei 15 fps bleibt `luma` gleich (87 gegen 89), die Automatik belichtet laenger.

**Die Bewegungsschwelle haengt an der Bildperiode.** `RoiMotion` misst den Anteil geaenderter
Pixel gegen den VORIGEN Frame; bei 15 fps ueberstreicht dieselbe Hand die doppelte Flaeche
(Median-Verhaeltnis 2,01, saettigend bei grossen Bewegungen). Deshalb rechnet
`TrackerService.engineConfig()` `motionThr × 30 / fps`; bei 30 fps ist der Faktor 1 und jede alte
Messung gilt. Zehn Recordings, 328 Label-Plies:

| Satz | gefunden / verpasst / erfunden |
|---|---|
| 30 fps, `motionThr 0.25` | 303 / 25 / 6 |
| 15 fps, Schwelle unveraendert | 273 / 55 / 102 |
| **15 fps, `motionThr 0.50` — ausgeliefert** | **312 / 16 / 30** |
| Kontrolle: 30 fps, 0,50 | 295 / 33 / 5 |

0,5 ist keine bessere Schwelle, sondern die richtige fuer 15 fps (bei 30 verschlechtert sie). 20
der 30 Phantome liegen auf `2026-08-08-11-59-12`. **Faktor 4 (Schwelle 1,0) verworfen:** gleicher
Bewegungsanteil wie die Baseline, aber 237 / 91 / 8 — die Schwelle hat zwei Waende. Das
Settle-Fenster ist es NICHT (`settleFramesOverride=2` aendert keine Ziffer).

Das Replay-Instrument `fps=<n>` ist ein Frame-STRIDE ueber ein 30-fps-Video (kurze Belichtung,
kein Verschmieren) und kann den Schaden ueberzeichnen; `fps=24` ist damit nicht messbar
(`round(30/24) = 1`).

**Kein 10 fps:** Kamera 0 meldet keinen gesperrten AE-Bereich unter `[15,15]`. Ein nicht gemeldeter
Bereich ist ein Binding-Fehler, also laesst `TrackerCamera.pinFrameRate` die Automatik in Ruhe;
gemischte Bereiche wie `[15,30]` halbieren den Sensor nicht.

### Geparkt: der freilaufende Observer

`observerIntervalS = 0.0` heisst am Geraet ~20 Ganzbrett-Reads/s (je 23-45 ms). Sie sind redundant
(`docs/tracker-flow.md`: 19 Reads sind einer). Drosseln auf 0,20 spart **247 mA**. Er
bleibt an, bis der Nutzer im Spiel geprueft hat, dass es keinen Unterschied macht (2026-08-25).
Wer ihn dreht, misst nach: `verifyWindow = 8` Beobachtungen laufen dann in den
`verifyTimeoutS` 1,5 s, und `settleFrames`/`motionHoldS` verschieben sich mit.

`chesslabPerf` traegt `dropped[obsBusy=N obsInterval=M]`: freilaufend steigt `obsBusy` (~9/s),
gedrosselt `obsInterval` (~24/s).

### Nicht angefasst

- **1080p bleibt aus dem Default:** −108 mA, aber die Crop-Box faellt von 136,4 px (1440p,
  `boardSize` 992) auf 102,3 px, Faktor 0,80 gegen die 128 des Exports — einmal zu viel resampelt.
- **Die Session-Aufnahme bleibt an** — die Videos sind Trainingsmaterial.

## Rechenzeit am Geraet

### Was die App an Arbeit einschaltet (2026-08-13)

Synthetische Eingaben (gueltig fuer Kosten, nicht fuer Genauigkeit), mit Aufwaermen, verschraenkt:

| Pfad | vorher | jetzt |
|---|---:|---:|
| Grid-Bandmediane: Sortieren -> exaktes Histogramm + Transponieren | 76,57 ms | **20,56 ms** |
| ONNX/XNNPACK, 1 gegen 4 Threads | 16,16 ms | **6,87 ms** |
| ArUco-Detektor je Read neu gegen behalten | 3,80 ms | 3,75 ms |
| QHD YUV -> BGR, direkter NV21-Pfad | — | 0,83 ms |
| `gridOccludedSquares` komplett, 1072x1072 | — | 20,73 ms |

- Detektor behalten nimmt vor allem Allokations-Jitter (max 10,86 gegen 4,22 ms), kaum Median.
- `CameraFrameBus` nimmt das BGR der Pipeline statt eine zweite YUV-Konvertierung (bis 5 Hz), und
  versioniert seinen Frame: doppelte Align-Anfragen werden verworfen.
- `LiveAlign` laeuft auf einem Worker — ein Gewinn an Reaktionszeit, keine verschwundene Arbeit.
- Die modellfreie Verdeckung laeuft je CNN-Observation, nicht je Frame; bei 19,24 % beobachteten
  Frames spart die neue Arbeit **etwa 11 ms je aufgenommenem Frame**. Das sind gewichtete
  Komponentenmessungen, keine Stoppuhr ueber die ganze Schleife; eine Zuglatenz daraus zu addieren
  ist falsch (`chesslabState`/`Obs`/`Cnn`/`Perf` messen eine gespielte Partie).

### Das SM8650-Kostenmodell (specs/28)

**`session ms = 26,9 + 2,731 x MMAC/crop`**, R² 0,99972, Knick bei 9,8 MMAC/Crop, ausgeliefert 6,7.
Der Fixterm ist 64 % der Observation. **Das Backbone zu verbreitern ist nicht gratis, den Kopf zu
verbreitern schon.** `mobilenetv4_conv_small_035` bei 80 px: `conv_stem` + `blocks.0` sind die
Haelfte der MACs; das Modell ist **overhead-, nicht rechengebunden** (16/24/32 Kanaele).

### Execution Provider

- **GroupNorm zerlegte den Graphen** (specs/26): 94 Fragmente, 45 % der 66 ms auf dem CPU-EP
  (`Transpose`/`Reshape`/`InstanceNormalization`). Ein zusammengelegter 1-Fragment-CPU-Graph war
  1,7x LANGSAMER, NNAPI 4,9x — die Loesung war, die Norm zu entfernen. BatchNorm faltet beim Export
  in die Conv: 89 statt 503 Knoten, am Desktop 3,9 gegen 20,2 ms. Auf dem Telefon ist der
  BN-Gewinn nie gemessen; ~1,8x ist eine Projektion.
- **Der gemeldete EP muss der sein, der lief** (specs/17): ORT haengt einen EP an, auch wenn er
  keinen Knoten nimmt (QNN bei `QnnDevice_create`-Fehler), und nur das Profil sagt es
  (`args.provider`). `EpProfile.dominantProvider` summiert Kernelzeit; `EpVerdict` nennt nie einen
  nicht beobachteten Provider. Die Verwechslung kostete 166 gegen 97 ms je 64 Crops.

### 128 px gegen 80 px

Dieselben Gewichte, zwei Exportgroessen, 64 Crops, XNNPACK, 4 Threads. Zeit: **Faktor 2,2-2,4**
(2026-08-27: 20,74 / 21,63 ms bei 80 px, 50,23 ms bei 128 px). Die 6,91 ms vom 2026-08-23 sind
nicht reproduziert; das Kostenmodell sagt 18,3 ms voraus und stuetzt die neue Zahl. Strom
bei Volllast: 541 gegen 662 mA, also **Energie je Brett Faktor 3,0** (11,2 gegen 33,3 mA·s). Live bei 2,65 Reads/s (Median aus
17 Recordings) kostet 128 px **+58 mA, -7 % Laufzeit**; die Bildrate bleibt der groessere Hebel.

Nachmessen (debug-APK, Modelle nach `filesDir/cnn_bench/model{80,128}.onnx`; HyperOS zeigt der
App nicht, was `adb push` ins externe Verzeichnis legt):

```
adb shell am start -n com.chesslab.tracker/com.chesslab.tracker.benchmark.AndroidOptimizationBenchmarkActivity --es only cnnsize
adb shell am start -n com.chesslab.tracker/com.chesslab.tracker.benchmark.AndroidOptimizationBenchmarkActivity --ei soak 128 --ei secs 150
```

Mit `chesslab export` exportieren (Opset 17): ein Opset-18-Graph aus `torch.onnx.export`
**SIGSEGVte** die Laufzeit. `adb install -r`, nie `installDebug` oder `connectedDebugAndroidTest`
auf einem Telefon mit Sessions.

### Quad-Korrektur ist Arbeit je Pose, nie je Frame

`improveQuad` am Dev-Rechner bei `boardSize` 1248: **412-432 ms**, `quadOf` 625 ms (2026-08-07);
am Geraet nie gemessen. Beide Tracker messen einmal je Pose und wenden die Korrektur danach
gratis an (vier Punkte durch eine 3x3), `TrackerCoordinator.onGrid`. Aeltere Zahlen (31-85 ms
bei 800) sind ueberholt; `:desktop`'s `Cost.kt` misst statt zu zitieren.

### APK-Groesse: Loecher im Zip

AGP packt inkrementell und laesst **Loecher**, wo Eintraege entfernt wurden (bis ~23 MB). APK-Zahlen
nur nach sauberem Umpacken (`Remove-Item app/build/intermediates/apk; :app:packageDebug
--rerun-tasks`) und **Dateigroesse und Summe der Zip-Eintraege immer zusammen**. arm64-only,
ohne ungenutzte QNN-Backends und ohne `material-icons-extended`: 329,8 -> 163,2 MB (2026-07-25);
x86_64 ist seitdem der eigene `emulator`-Flavour.

## Werkzeug: exaktes Arbeitsprofil

```powershell
cd android
.\gradlew.bat :desktop:run --args="replay <video.mp4> quiet workprofile"
```

Opt-in; ohne `workprofile` ist jede Messstelle ein Inline-No-op. Der Bericht zaehlt Aufrufe,
wiederholte Eingaben, kopierte Bytes, Cache-Treffer, `self ms`/`incl ms` und den Aufrufgraphen der
instrumentierten Grenzen. Neue teure Grenzen bekommen eine `WorkOperation` und einen
`WorkProfiler.span` mit Frame-Sequenz oder Zustands-Fingerabdruck als Eingabe. Zeiten sind
Diagnose, kein Regressionsorakel; `RecordingWorkProbe.snapshot().check(...)` macht Zaehler,
Wiederholungen und Bytes zu deterministischen Test-Budgets.

Das Review-Budget der Partie-Auswertung (1,5 M Knoten): `docs/game-review.md`.
