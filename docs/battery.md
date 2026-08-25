# Wohin der Strom geht (2026-08-24/25)

Ein 24117RK2CG (SM8650) **entlädt sich am Ladegerät**: 16 % → 14 % über zwei Stunden Spiel,
`status` durchgehend `charging`, SoC zwischenzeitlich 72 °C. Diese Seite ist die Messung, die den
Grund gefunden hat, und was daraus scharfgeschaltet wurde.

## Das Messgerät

`simpleperf` ist auf diesem Gerät tot (der Hersteller hat `perf_event` gesperrt; auch
`simpleperf stat -e cpu-clock sleep 1` verweigert), `/sys/class/power_supply/battery/*` ist für
`shell` per SELinux zu, es gibt kein Root, und MIUI verweigert `dumpsys batterystats --reset` der
uid 2000. Was geht:

```bash
adb shell cmd battery get -f current_now
```

µA über `BatteryManager.BATTERY_PROPERTY_CURRENT_NOW`. **Auf diesem Gerät heißt negativ: es lädt in
den Akku**, positiv: es entlädt. Gegengeprüft an `dumpsys battery`s `Charge counter`, der steigt,
während `current_now` negativ ist — 780 mA aus dem Momentanwert gegen 790 mA aus 82 s
Coulomb-Zählung.

Jede Zahl unten ist ein **Netto**-Strom am Akku: Ladegerät rein, Last raus. Geladen wurde am
USB-Port des PCs (`Max charging current: 900000` bei 5 V), Bildschirm an bei Helligkeit 79/255, und
beides gilt für jede Zeile — also sind die **Differenzen** das Ergebnis, die Absolutwerte gelten
nur für dieses Ladegerät.

## Die Aufteilung

| # | was läuft | netto | eigene Last des Trackers |
|---|---|---:|---:|
| 01 | App gestoppt, Bildschirm an | **−775 mA** | — (der Boden) |
| 06 | Kamera + Vorschau + QHD-Encoder, **keine** Erkennung | **+18 mA** | ≈ 793 mA |
| 02 | Tracking, Observer frei, Rec an, 1440p, 30 fps | **+452 mA** | ≈ 1227 mA ≈ 4,6 W |
| 10 | **wie 02, nur 15 fps — das, was ausgeliefert wird** | **−38 mA** | ≈ 737 mA ≈ 2,7 W |
| 07 | wie 02, aber `observerIntervalS = 0.20` | **+164 mA** | ≈ 939 mA ≈ 3,5 W |
| 08 | wie 07, aber **15 fps** (beide Hebel) | **−154 mA** | ≈ 621 mA ≈ 2,3 W |
| 09 | wie 08, Bildschirm **aus** | **−225 mA** | ≈ 550 mA ≈ 2,0 W |

Die eigene Last ist die Zeile minus Zeile 01, bei den 3,71 V, die der Akku gemeldet hat.

**Zeile 10 ist die Antwort.** Die Bildrate allein dreht das Vorzeichen um: 490 mA ≈ 1,8 W gegen die
Baseline, bei voller Beobachtung, voller Auflösung und laufender Aufnahme. Der Observer-Hebel legt
weitere 116 mA drauf (Zeile 10 gegen 08), ist aber geparkt — siehe unten.

**Zeile 06 ist die wichtigste.** Sie ist kein Tracking-Lauf: die App stand auf dem Einrichten-Schirm,
Kamera und Encoder liefen, sonst nichts. Kamera und Encoder allein sind damit **zwei Drittel** der
gesamten Kosten; die komplette Pipeline plus Engine plus CNN sind die restlichen ≈ 430 mA. Deshalb
ist die Bildrate der Hebel und nicht die Rechenzeit — an ihr hängen Sensor, ISP, der
Voll-Frame-Convert, die ROI-Motion **und** der Encoder.

**Der Bildschirm ist nicht das Problem.** Zwei Vergleiche, beide klein: 71 mA (Zeile 09 gegen 08)
und 25 mA (−38 gegen −63 mA bei voller Beobachtung, 2026-08-25 00:32). Schwarzes AMOLED-UI bei
Helligkeit 79/255 — die Spanne ist Messrauschen, die Größenordnung ist die Aussage.

**Mit ausgeschaltetem Bildschirm läuft alles weiter, Aufnahme eingeschlossen.** Nachgeprüft bei
`mWakefulness=Dozing`: `chesslabVideo` füllt den Pre-Roll weiter, `chesslabPerf` meldet fps 15,8.
`TrackerService` ist ein Foreground-Service vom Typ `camera` und hält die Kamera an seinem eigenen
Lifecycle, nicht an dem der Activity.

## Scharf: die Bildrate

`CameraRequest.targetFps` war auf 30 festgenagelt und hatte einen Default, den niemand gewählt hat.
Jetzt ist es eine Einstellung — `AppSettings.frameRate`, **15 / 24 / 30, Default 15**. Was das
kostet, steht unten; 30 ist der Ausweg, wenn eine Partie mehr Frames braucht.

Gemessen bei 15: `fps=15,2`, `luma` unverändert **87 gegen 89** — die Automatik gleicht die längere
Belichtung aus. `idle` auf der `chesslabPerf`-Zeile steigt von 9 auf 35 ms, der Analyzer wartet
also den größten Teil der Periode.

`CameraVideo` hat dabei ein `frameRate`-Feld bekommen: `KEY_BIT_RATE` ist pro SEKUNDE und der
Encoder gibt es pro FRAME aus, ein 15-fps-Strom als 30 konfiguriert hätte die halbe Bitrate
weggeworfen — und die Aufnahme ist Trainingsmaterial.

### Was 15 fps kostet

Über die zehn Recordings mit Kandidat (`data/recordings/<n>/candidate.json`, 328 Label-Plies), mit
dem Handy-Modell `real13-ms-s3-hn4-bn80`:

| Satz | gefunden / verpasst / **erfunden** |
|---|---|
| Baseline: 30 fps, `motionThr 0.25` | 303 / 25 / **6** |
| 15 fps, Schwelle unverändert | 273 / 55 / **102** |
| **15 fps, `motionThr 0.50`** — was ausgeliefert wird | **312 / 16 / 30** |
| Kontrolle: 30 fps, `motionThr 0.50` | 295 / 33 / **5** |

Die letzte Zeile ist die, die den Fall entscheidet, und sie stammt aus der Frage des Nutzers:
**0,5 ist keine bessere Schwelle, sie ist die richtige Schwelle für 15 fps.** Bei 30 fps macht
dieselbe Erhöhung es schlechter (303 → 295 gefunden, 25 → 33 verpasst); bei 15 fps macht sie den
Zusammenbruch rückgängig. Das ist die Signatur einer Kopplung, nicht die eines besseren Werts.

Was bleibt: 30 Phantome gegen 6, davon **20 auf `2026-08-08-11-59-12`** — dem Recording, das die
Baseline mit 21 verpassten Zügen ohnehin am schlechtesten liest. Bei 15 fps findet es 14 Züge mehr
und erfindet 20. Auf den anderen neun ist der Unterschied Rauschen. Der Nutzer hat 15 fps
ausdrücklich als Default gewählt (2026-08-25): *„die regression ist fein, wenn man mehr braucht am
handy kann man ja auf 30fps gehen"*.

**Der Mechanismus ist die Bewegungsschwelle.** Auf `154327`, beide Läufe über dieselben 415,8 s:

| | 30 fps | 15 fps |
|---|---|---|
| `moving → waiting` | 690 | 274 |
| `move → moving` (gelesen) | **47** | **7** |
| Entscheidungen | 71 | 14 |

Der Tracker sieht bei halber Bildrate MEHR Bewegung, nicht weniger, und bleibt in `moving` hängen.
`RoiMotion` misst den **Prozentsatz der Pixel, die sich gegenüber dem VORIGEN Frame geändert
haben**, gegen `motionThr = 0.25`. Bei 15 fps liegen zwei Frames 66 ms statt 33 ms auseinander,
dieselbe Handbewegung überstreicht die doppelte Fläche — die Schwelle hängt an der Frame-Periode,
und das steht nirgends.

Das Settle-Fenster ist es NICHT: `fps=15 set:settleFramesOverride=2` liefert Zahl für Zahl
dasselbe wie `fps=15` allein (66/7/94, 33/2/2, 9/42/0). Der Override kam an — der Kopf des Laufs
zeigt `override: settleFramesOverride=2.0` — er ändert nur nichts.

**Die Bindung steht im Code**: `engineConfig()` in `TrackerService` rechnet
`motionThr × 30 / fps`, an einem Ort für vier Aufrufer. Bei 30 fps ist der Faktor 1, also gilt jede
Zahl, die je bei 30 fps gemessen wurde, unverändert weiter.

**Eine Einschränkung des Instruments:** `fps=<n>` im Replay ist ein Frame-STRIDE über ein
30-fps-Video, also jeder 2. Frame mit KURZER Belichtung. Am Gerät hat ein 15-fps-Frame die doppelte
Belichtungszeit, eine bewegte Hand ist verschmiert statt gesprungen. Das Replay kann den Schaden
also überzeichnen — beweisen lässt sich das mit diesem Werkzeug nicht, und „vielleicht ist es am
Gerät besser" ist kein Grund, Phantome auszuliefern. Aus demselben Grund ist `fps=24` mit diesem
Werkzeug gar nicht messbar: `round(30/24) = 1`, der Stride bleibt 1 und der Lauf ist die Baseline.

### Warum kein 10 fps

`CONTROL_AE_TARGET_FPS_RANGE` nimmt nur Bereiche, die die Kamera meldet, und Kamera 0 — die, die
der Tracker bindet — meldet keinen gesperrten Bereich unter 15:

```
[15,15] [19,19] [21,21] [24,24] [25,25] [26,26] [30,30]  + [14,21] [14,25] [14,26] [14,30] [25,30]
```

`[10,10]` gibt es nur auf Kamera 1, 2 und 5. Ein nicht gemeldeter Bereich ist ein Binding-Fehler,
also lässt `TrackerCamera.pinFrameRate` die Automatik dann in Ruhe — die Einstellung stünde auf 10
und der Sensor liefe auf 30. Die gemischten Bereiche sind auch nicht im Angebot: `[15,30]` lässt der
Automatik dieselbe Freiheit wie vorher, nur ein GESPERRTER Bereich halbiert den Sensor wirklich.

## Geparkt, aber greifbar: der freilaufende Observer

`observerIntervalS = 0.0` ist Pythons Default und heißt „nächster Ganzbrett-Read, sobald der letzte
fertig ist". Am Gerät sind das **~20 Beobachtungen pro Sekunde**: bei 30 fps wuchs der Zähler
`dropped[obsBusy=…]` auf der `chesslabPerf`-Zeile um 9 pro Sekunde, also wurden 21 von 30 Frames
angenommen. Jede ist ein voll aufgelöster, geränderter `warpPerspective` plus zwei Ebenen-Kopien auf
dem Analyzer-Thread, dann 64 Crops, Preprocessing und Inferenz auf dem Observer-Thread — 23 bis
45 ms.

Dass diese Reads redundant sind, steht schon in `docs/emission-correlation.md`: innerhalb einer
Stellung ρ = 0,901, effektive Stichprobe 0,052 n — **19 Reads sind einer** — und jeder 5. Read
schlägt auf der Kette alle Reads (64/2/4 gegen 57/9/19).

Gemessen kostet der Freilauf **247 mA ≈ 0,92 W** (Zeile 02 gegen 07).

**Er bleibt trotzdem an.** Der Nutzer will volle Beobachtung, bis er im Spiel selbst geprüft hat,
dass die Drosselung keinen Unterschied macht (2026-08-25). Der Hebel liegt dort, wo er hingehört:
`observerIntervalS` in den Einstellungen unter CNN, mit der gemessenen Zahl in seinem Text.

Wer ihn dreht, sollte zwei Dinge nachmessen, die die Kadenz mitverschiebt:

- **Verify gegen Timeout.** `verifyWindow = 8` Beobachtungen sind bei 3/s 2,7 s, `verifyTimeoutS`
  ist 1,5 s. Bei 20/s waren dieselben 8 in 0,4 s durch. Der Regelfall `verifyObsVotes = 2` passt
  (0,7 s), ein umstrittener Verify läuft jetzt in den Timeout, statt sein Fenster auszuschöpfen.
- **Settle.** `settleFrames = 3` sind bei 15 fps 0,2 s statt 0,1 s, dazu `motionHoldS = 0.20`.

## Nicht angefasst, und warum

- **1080p bleibt aus dem Default-Pfad.** Gemessen −108 mA (das Handy lädt), aber die Krippe ist
  `boardSize/8 × 1,10`, und die Kalibrierung misst am Gerät `boardSize` 992 bei 1440p: Zelle 124 px,
  Box **136,4 px**, bequem über den 128, an denen der Export schneidet. Bei 1080p misst dieselbe
  Bildausschnitt-Geometrie ≈ 744: Zelle 93 px, **Box 102,3 px, Faktor 0,80** — einmal zu viel
  resampelt (`docs/data-pipeline.md` 3.1). Wählbar bleibt es.
- **Die Session-Aufnahme bleibt an.** Die Videos sind Trainingsmaterial.

## Nachmessen

```bash
adb shell cmd battery get -f current_now          # µA, negativ = lädt
adb shell dumpsys battery | grep 'Charge counter'
adb shell dumpsys thermalservice | grep -E 'socd|skin|ibat'
```

Die `chesslabPerf`-Zeile trägt die zwei Zähler, die den Observer sichtbar gemacht haben:
`dropped[obsBusy=N obsInterval=M]`. Freilaufend steigt `obsBusy` um ~9/s und `obsInterval` steht;
gedrosselt ist es umgekehrt, `obsInterval` steigt um ~24/s.

## Läufe, die eine Build-Grenze kreuzen — auf das Etikett achten

Ein zweiter Agent hat auf demselben Gerät APKs installiert (23:27:53, 23:49:02), und jeder Install
killt die laufende App. Vergleichbar sind Läufe nur innerhalb eines Builds: **02/03** und **07/08**
sind je ein A/B auf einem Build, **04** (obs 0.20, Rec aus, 1440p: +63 mA) und **05** (dasselbe bei
1080p: −108 mA) liegen hinter einer Build-Grenze — die 142 mA für den Rekorder sind eine Schätzung,
keine kontrollierte Messung.
