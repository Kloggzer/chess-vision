# Kamera und Bild: Belichtung, Aufnahme-Encoder, CLAHE

Die Belege hinter `tracker-runtime/camera/BoardExposure.kt`, `BoardMeter.kt`,
`ExposureGovernor.kt`, `app/camera/TrackerCamera.kt`, `OpticsLock.kt`, `CameraVideo.kt` und
`core-geometry/CropClahe.kt`. Im Code steht jeweils ein Satz mit Zeiger hierher.

## Belichtung nach dem Brett

> Gemessen 2026-08-29/30 auf `24117RK2CG`, dunkles Buero, nur Monitorlicht.

### Warum die Automatik des Geraets nicht reicht

Sie hat **eine Zahl fuer den ganzen Rahmen**. Ein Frame spannt vom dunkelsten zum hellsten Feld
11- bis 163-fach; eine Blende mehr saettigt 19 bis 45 % des Bretts, bevor die dunkle Ecke gerettet
ist. Eine Regel, die nur die 64 Felder kennt, kann diesen Handel fuehren; eine Rahmenmessung nicht.

### Gestellt wird die Belichtungskorrektur, nicht Zeit und ISO

Manuell (`AE_MODE_OFF`, Sensor am Anschlag 66,7 ms) kam `luma` 65, AE mit +1,7 EV kam 109: manuell
faellt die ISP-Verstaerkung und das Tonemapping weg, der Sensor allein kommt nicht dorthin. Der
manuelle Pfad ist deshalb wieder ausgebaut; `ExposureSetting` ist ein Messwert, kein Stellwert.

### Die Regel und drei Fallen

Aufgehellt wird auf ein Perzentil der dunklen Felder (ein schwarzes Feld unter einer Figur ist
kein Grund, das halbe Brett zu saettigen), gedeckelt durch die Luft in den Spitzlichtern.

1. **Ein Regler, der bei Saettigung gegensteuert, pendelt.** Ueber 250 sagt jeder Pixel dasselbe,
   die Information zum Gegensteuern ist zerstoert — die erste Fassung lief auf zwei von fuenf
   Aufnahmen in einen Grenzzyklus. Ersetzt durch eine **monoton fallende Sperrklinke**.
2. **Gamma.** Der Analyzer-Frame ist gamma-codiert, die Belichtung linear: ein Feld von 12 auf 34
   zu heben kostet `(34/12)^2,2` = 3,4 EV, nicht 1,5. Ohne Umrechnung stellt die Regelung zu wenig.
3. **Ein Testbild, das auf die Verstellung nicht reagiert,** misst eine Physik, die es nicht gibt.
   Der Einschwing-Test rendert das Brett aus dem aktuellen Stellwert.

Live: Start beim Schieberwert des Nutzers, ein Schritt von 0,7 EV (der Schrittdeckel), dann Ruhe.

**Jede Verstellung verwirft die Pixel-Referenz** (`EngineAction.CaptureBaseline`), sonst liest der
Frame-Diff die Helligkeitsstufe als Bewegung. Der Preis einer Verstellung ist also ein verlorener
Zug. Deshalb Totband, Schrittdeckel, Messung nur jeden 30. Frame und 60 Frames Sperre nach jedem
Frame, der die Engine beschaeftigt hat.

### Sie hellt auf, sie blendet nicht ab (2026-08-30)

Die Klinke fiel bei `clippedFraction > clipCap` (2 %) auf `ev - 0,4`, auch wenn die Regelung nie
aufgehellt hatte — ein gut belichtetes Brett mit ein paar Spitzlichtern lief Schritt fuer Schritt
nach unten. **Der Boden ist der Schieberwert des Nutzers** (`nextExposure(baseEv = …)`): darueber
regelt sie frei, darunter nie, auch die Klinke nicht. Abblenden bleibt bei der Geraete-AE und beim
Schieber. Stellt der Nutzer den Schieber im Betrieb, ist sein Wert der neue Boden.

**Wer regelt, sagt es:** zu Beginn einer Aufhell-Episode meldet der Governor eine
`ExposureNotice`, der `TrackerService` macht daraus einen Toast.

### Die 10,0 ms sind nicht verhandelbar

Das Geraet faehrt **10,0 ms** und bezahlt den Rest mit ISO — bei `[15,15]` (66,7 ms erlaubt), mit
`SCENE_MODE = NIGHT`, mit Antibanding aus und sogar ganz ohne gepinnte Spanne (dann 10,0 ms bei
ISO 404 und 31 fps). Es ist das Tuning, nicht der Pin und nicht das Flimmer-Raster. **Der Pin
bleibt richtig**, er kostet keine Belichtungszeit, er haelt nur die Bildrate stabil. Eine breitere
Spanne zu waehlen bringt nichts.

**Der Ausweg: Qualcomms Belichtungs-Vorrang.**
`org.codeaurora.qcamera3.iso_exp_priority.select_priority = 1` plus `use_iso_exp_priority = <ns>`
setzt die Zeit, die AE regelt nur noch das ISO (erlaubt 0,02 bis 392 ms). Gemessen: 10,0 ms /
ISO 404 vorher, **33,3 ms (halbe Bildperiode) / ISO 71** eingebaut, gleiche Helligkeit und
Bildrate. `CONTROL_AE_PRIORITY_MODE` (API 36) meldet dieses Geraet nur als OFF; wo die Vendor-Tags
fehlen, faellt `pinExposureTime` still aus. `OpticsLock` schreibt `sensor <ms> ISO <n>`, sobald sich
eine der Zahlen merklich bewegt.

### Zwei Fallen beim Verdrahten

- **Zeit/ISO gehoeren nicht in `CameraLook`:** `AppSettings.cameraLook()` baut den Blick ohne das
  Feld neu, jedes Neu-Anwenden setzte es auf `null`.
- **`setExposureCompensationIndex` ist ein AE-Aufruf** und holt `CONTROL_AE_MODE` zurueck auf ON.

### Der ISO-Gewinn kommt im Diff-Kanal nicht an

`cellDeltas` mittelt eine ganze Zelle (~120x120 Quellpixel) und daempft unkorreliertes Rauschen um
sqrt(N). `NoiseFloor` misst `busyLevel` ueber Paare ruhiger Bretter und schreibt es als `noise=` auf
die Perf-Zeile. Median vor dem Umbau 1,09, danach 2,63 — **kein Gewinn sichtbar**; `busy` traegt
Warp-Zittern, Schattendrift und Restbewegung, nicht Sensorrauschen. Bei ruhigem Brett ist
`3 * busy` rund 1,0-1,2 und lag damit unter der Schwelle 4,0 der inzwischen entfernten
`ChangeEvidence`-Engine (`d8453566`); ein Rauschgewinn darunter
erreicht die Zugentscheidung nicht, er zahlt sich wenn ueberhaupt im CNN-Crop aus. Ein sauberer A/B
(gleiche Stellung, mit und ohne `iso_exp_priority`) fehlt.

## Der Aufnahme-Encoder (`CameraVideo.kt`)

### Warum selbst kodiert wird

Dieses Telefon bietet kein CameraX-QHD-Recorder-Profil und kann `VideoCapture` nicht neben
`ImageAnalysis` binden; ein zweiter Kamera-Besitzer waere falsch. Der eine Analyzer-Strom wird in
einen Hardware-AVC-Encoder kopiert; `MediaCodec.getInputImage()` legt das Ebenen-Layout offen.
`TooManyFunctions` ist unterdrueckt, weil die Zahl der Lebenszyklus des Encoders ist.

### Bitrate (2026-09-13)

`BITS_PER_PIXEL = 0,54` ist das 1,5-fache der 0,362, die der Korpus misst: 1440p/15 landet auf
29,9 Mbit/s, 2160p/15 auf 67,2. `MIN_VIDEO_BIT_RATE = 8_000_000` ist der Boden — dort liegt die
schwaechste Aufnahme (`rg-2026-09-11-20-00-52`), und die gilt schon als grenzwertig. Gerechnet wird
auf der GELIEFERTEN Groesse, nie auf der angefragten.

**Der Encoder wird gefragt, nicht angenommen:** eine Rate ueber dem Bereich des Codecs lehnt
`configure` nicht ab, sie wird still uminterpretiert. Vorher fragen macht daraus eine Log-Zeile und
eine Notiz in `capture.json`. `KEY_BIT_RATE` ist pro SEKUNDE, der Encoder verteilt sie pro FRAME:
ein 15-fps-Strom, dem 30 gesagt wurden, verschenkte die Haelfte der Detailtiefe.

### Minuten-Segmente

Der MP4-Index (`moov`) entsteht beim SCHLIESSEN des Muxers. 2026-08-13 hatten vier von elf
uebertragenen Aufnahmen (1,99 GB) kein `moov` — `reason=16 (PACKAGE UPDATED)`, ein Install ueber
eine laufende Aufnahme. Ein SIGKILL fuehrt keinen Callback aus; die einzige Verteidigung ist, schon
finalisiert zu haben. Der Schnitt faellt auf den ersten Keyframe an oder nach der Minutengrenze
(ein Segment mit P-Frame vorn waere eine Sekunde Muell): bis zu eine Sekunde ueberlang, kein Frame
verworfen oder verdoppelt.

`writtenBytes()` zaehlt JEDES Segment (`outputFile.length()` war Segment 0 allein: 76,7 MB in
`session.yaml`, 761 MB auf der Platte). Gelesen nach `releaseEncoder`, damit jeder Index steht.

### Der Vorlauf-Ring

Eine Aufnahme startet ARMIERT: Encoder laeuft, Muxer nie geoeffnet, Samples gehen in einen
`PreRollRing` (`PRE_ROLL_SECONDS`, `PRE_ROLL_CEILING_BYTES`). Erst `keep` (erster committeter Zug)
oeffnet die Datei und schreibt den Ring mit auf null rebasierter PTS. Ein Lauf, der nie behalten
wird, schreibt NICHTS — Aufbau und Kalibrierung waren am 2026-08-13/14 neun von elf Aufnahmen
(4,7 GB). Ring und Live-Pfad teilen eine Uhr (`originUs`), an der Naht ueberlappt nichts. `keep`
ist idempotent. `preRollUs` landet als `video_pre_roll_ns` in `session.yaml`; null heisst armiert
AM Commit, nicht davor.

Die armierte Phase hat keine Session, ihre Fortschrittszeilen fallen auf eine Null-Timeline — eine
Aufnahme mit 1,4 s Vorlauf, wo 20 faellig waren, konnte nicht sagen, wann armiert wurde.
`ARMED_LOG_INTERVAL_MS` schreibt deshalb die Tiefe ins Log.

`VideoRecorderPort` ist die Naht fuer `RecordingBundleHost`; Armieren besitzt der Recorder, nicht
die Encoder-Callbacks (doppeltes "armed", 2026-08-14).

## CLAHE im Band

> `real13-mix-v4`, vier Arme zu 60 Epochen, gleiches Rezept, Seed und Split (2026-08-29/30).
> Training `training/torch_data.py:_Clahe`, Serving `CropClahe.kt`, Bruecke `CropClaheParityTest`.

| Arm | best | val-Fehler | test-Fehler |
|---|---:|---:|---:|
| ohne CLAHE | 0,9328 | 939 | 810 |
| CLAHE auf allem | 0,9315 | 958 | **1 269** |
| **CLAHE 25–40** | **0,9499** | **705** | **603** |

**Pauschal schadet CLAHE**, erst das Fenster macht einen Gewinn (-25 % Fehler auf val, -26 % auf
test). Ein BAND und keine Schwelle, weil es unter 25 schadet (0,7807 -> 0,7455: keine Struktur, nur
Rauschen) und zwischen 25 und 40 +8,0 Punkte bringt. Sichtbar wird die Kerbe der Laeufer-Mitra —
`bB->bP` war in jedem Arm die haeufigste Verwechslung. Die 18 "Phantome" des Band-Arms auf test
sind keine: 17 davon sind h6 mit der Dame von g6 im Randstreifen, CLAHE feuerte auf keinem.

Am Geraet (2026-08-30, dunkles Buero): `p4a-80` liest 8 von 12 abweichenden Feldern richtig,
`p4a-80-clahe` 11 von 12, alle drei Reparaturen auf dunklen Feldern.

**Offene Kopplung:** das Fenster ist auf den Zellmittelwert in 8 bit definiert und haengt damit an
der Belichtung. Bei +1,7 EV (was der Governor waehlt) fallen 64 % der besetzten Zellen heraus. Es
gehoert an ein Perzentil oder den Kontrast der Zelle (`TODO.md`).
