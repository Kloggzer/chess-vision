# Der Desktop-Replay: warum er so gebaut ist

Im Code steht jeweils ein Satz mit Zeiger hierher (`DesktopMain.kt`, `ReplayOptions.kt`,
`MultiReplay.kt`, die Caches); hier steht die Begruendung.

## Der Replay ist die Handy-Pipeline, nicht eine zweite

`replay <video>` faehrt einen Clip durch den echten `TrackerStack` — dieselbe Pipeline, Engine und
Coordinator wie `TrackerService`, minus der Notification. Ein Lauf ist EINE Beschreibung
(`ReplayOptions`), damit zwei Laeufe sich in genau einem Feld unterscheiden; ein unbekanntes Wort
wird abgelehnt.

## Deterministisch: zwei Konstanten machen den Lauf wiederholbar (specs/52)

Dieselbe Datei lief einmal 54 und einmal 39 Plies. Zwei Ursachen, beide nur fuer den Replay behoben:

- **Wann eine Inferenz landet, war Wanduhr.** Der Beobachter rechnet INLINE
  (`observerDispatcher = Dispatchers.Unconfined`, auch in `MultiReplay`) auf einer festen
  Videozeit-Kadenz, damit der Schnappschuss vor dem naechsten Frame ankommt.
- **Vier intra-op ONNX-Threads sind nicht bitgleich** — eine Logit-Wackelei kippte bei Ply 26 eine
  Schwellenentscheidung. Der Replay oeffnet den Klassifikator mit EINEM Thread (47 statt 19 ms je
  Beobachtung, ein Bruchteil der Kadenz).

**`REPLAY_OBSERVER_INTERVAL_S = 0.0`, frei laufend und erklaert.** Die „modellierte Live-Rate"
0,15 s liess rec-20260808 von 67 auf 26 Plies fallen und erzeugte auf rec-20260807 ein Phantom
(23/2/1): Verify-Leiter und Recovery-Abstimmung sind auf eine Beobachtung alle 1–2 Frames geeicht.
Jede gute Messung im Archiv lief frei. Ist die Kadenz des Telefons das Experiment, sagt
`set:observerIntervalS=<s>` das ausdruecklich.

**Die Uhr ist die PTS, nicht `frames x 1000/fps`.** Das Telefon liefert nie CFR (Segmente mit
26,35/23,47 fps); die gezaehlte Uhr scherte die Videozeit. Ein per `stride` uebersprungener Frame
laesst die Uhr weiterlaufen. Auch der Bus drosselt Preview und Kalibrier-Abgriff (200 ms) auf der
Engine-Uhr, sonst hinge der LiveAlign-Frame an der Dekodiergeschwindigkeit des Hosts; er wird hier
gehalten, weil `TrackerStack` ihn nicht offenlegt.

## Welche Frames, ab wo

- **Die Frame-Auswahl der Aufnahme schlaegt `fps=`.** `fps=<n>` trifft die ANZAHL, aber nicht die
  Bilder, die CameraX durchliess; wo die Aufnahme ihre Auswahl gemessen hat, gilt sie und `stride`
  ruht. `fps=` ist ein Messinstrument, keine Vorgabe, und live verboten.
- **Der Vorlauf wird uebersprungen, bevor das Brett lokalisiert wird**, damit der Quad auf der
  Partie gemessen wird. Das Telefon leert seinen Vorlauf-Ring beim ersten Commit; ein im Aufbau
  eingerasteter Alarm kostete `2026-08-15-22-48-04` alle 19 Plies.
- **`start=` ist DEFAULT AUS** — ein springender Replay misst einen Tracker, den das Geraet nie
  faehrt. Der alte Zwei-Sekunden-Vorlauf landete 0,7 s vor dem ersten Zug, und ein Lauf schrieb 1/4
  statt 3/4.
- **Der Startindex kommt von der Quelle**, nicht aus einem `VideoFileSource`-Cast: eine segmentierte
  Aufnahme ist eine `ConcatFrameSource`, der Cast fiel auf 0. Aus demselben Grund `hookIndex`:
  `drive` zaehlt ab seinem ersten Frame, was auf 2026-08-16-20-41-33 878 Frames ausmachte und jedes
  Label 29 s vor sein Bild setzte.
- **Auf welchem Quad ein Lauf stand, gehoert zu seiner Provenienz.** Die Ecken des Telefons (aus
  `log.jsonl`) und `locateBoard` liegen gemessen 6 bis 25 Plies auseinander (specs/52, offen).

## Geometrie: ein Vorlauf, keine Stufe

- Der Quad entscheidet die Brett-GROESSE und damit den Warp; er muss vor dem Stack feststehen.
  `locateBoard` stoppt die zwei Haelften von `quadOf` einzeln — ArUco ("44-87 ms") und
  `improveQuad` ("70-85 ms") tragen je eine Zeitbehauptung, die eine kombinierte Zahl nicht pruefen
  koennte.
- **Die Brettgroesse wird gemessen, nicht konfiguriert** (`measuredBoardSize`, 320..1280); ein
  1600-Platzhalter liesse `FrameLoop.step` jeden Frame still verwerfen. Sie kommt auch nicht aus dem
  Modell: dies ist die Aufloesung des Diff-Pfads (`detSize = boardSize * detectScale`).
- **Die Optik wird aus DIESER Aufnahme gefittet** (`Stage.LENS`, 1,2 px besser als eine gespeicherte
  Kalibrierung). Lokalisiert wird auf denselben Pixeln, die der Tracker sieht. `align raw` verglich
  seit dem Loeschen von `chesslab lens calibrate` roh gegen roh; die Frage beantwortet `undistort`.
- **Marker-Rand:** `DEFAULT_MARKER_MARGIN` = 0,045 fuer alle vier Ecken. `measureAlignment` fittet
  die neun Linien je Achse und meldet den schlimmsten Feldversatz gegen 4 % einer Zelle; eine
  ungefundene Linie zaehlt als UNGELESEN. Ein Rand je Ecke lohnt erst, wenn das die Konstante
  widerlegt.
- **`calibrate` schreibt nichts**, was das Brett nicht unter die Grenze bringt — ein Befund, keine
  Datei. `next()` ist eine LEIHGABE (die Quelle ueberschreibt die `Mat`),
  `latestCalibrationFrame()` eine freizugebende Sicht.
- **Offsets nur als Median ueber mehrere Frames** — `medianOffset` mass bis 2026-08-07 einen Frame,
  `align` sechzig. Streuung je Lauf <= 0,07 px ueber sechzig Frames, gemessen.

## Das Modell besitzt die Crop-Komposition

Crop-Groesse (`pad_side`, `infer_size`), CLAHE und `coverage_gate` kommen aus der `config.json` des
Modells. Der Desktop fragte frueher nicht: 128er-Crops fuer ein 80er-Modell (jede Beobachtung flog,
der Lauf meldete `cnn=run`), rohe Crops fuer `p4a-80-clahe`, und die 0,5-Vorgabe statt des
Modell-Gates. Der Spec wird auch mit `nocnn` gelesen, damit `nocnn` den Klassifikator isoliert und
nicht die Geometrie.

**`nocnn` faehrt absichtlich einen anderen Tracker:** ohne Beobachtung faellt
`Taint.cnnOcclusionFilter` auf ">2 geaenderte Felder = eine Hand" zurueck.

## Die Settings werden NICHT mit der Lauf-Config geseedet

`settings.update(config)` liess 2026-08-08 rec-20260808 von 67 auf 26 Plies fallen, mit einem
Phantom auf rec-20260807. Die Settings halten die Codec-Vorgaben; nichts darf daraus einen Knopf
LESEN, den der Lauf besitzt. `config=<datei>` nimmt eine AUFGEZEICHNETE Config als Basis; die
Geometrie gewinnt trotzdem.

## Der Replay bedient wie das Handy (`b2d11570`)

Handy und Replay teilen `ModelServing.servingConfig` (tracker-runtime): Brettgroesse aus der
Geometrie, `coverage_gate`/Temperatur aus dem Modell, `motionThr x 30 / fps` mit der Rate, mit der
Bilder die Engine ERREICHEN (vorher nur beim Ueberspringen; die v2-Videos haben 15 fps). Ein
`settings.json` mit `"config_kind": "stored"` wird so bedient; ein altes ohne `config_kind` und ohne
History trug schon die bediente Config und bekommt nur die Geometrie (`ff92051b`).

## `quiet` macht einen Replay skriptbar

Mit Fenster ist Break-on-stuck richtig; ohne Fenster wartete ein Batch ewig auf eine Taste. `drive`
befragt die View VOR dem naechsten Frame, damit der Schirm den Zustand zeigt, der den Stopp
ausloeste.

## Was auf einer Zeile KEIN Beleg ist

- **`confidenceLine`** bleibt Diagnose: die Signale zum Commit-Zeitpunkt trennen Fabrikationen nicht
  von Treffern (`docs/commit-latency.md`).
- **`best = -3.12` auf jeder Recovery-Zeile** ist eine Vorbedingung, kein Gegenbeweis:
  `Hypothesis.noSingleFitsGate` feuert auf `best < 0.0`, und genau das loest die Recovery aus.
- **`motion = 0.0000` auf jeder Recovery-Zeile:** `cnnTick` wertet nur auf stabilem oder
  festgefahrenem Brett aus, auch eine echte schnelle Folge hat sich dann beruhigt.

Keine gemessene Groesse trennt bisher "mehrere echte Zuege" von "erfundene Bruecke" (specs/37).

## Der Beobachtungs-Cache (`CachingClassifier`)

- **Schluessel: der Crop-INHALT, unter einem Verzeichnis je Graph UND `config.json`**
  (`obsCacheDir`). Der Cache haelt WAHRSCHEINLICHKEITEN, und die haengen an `temperature`,
  `normalize`, `clahe_*`, `input_repr`. Ein Temperatur-A/B las 2026-09-16 deshalb 41 168 Antworten
  des Vorlaufs und meldete "kein Unterschied"; das einzige Zeichen war die halbierte Laufzeit.
  **Wer ein A/B faehrt, prueft die Laufzeit.** Engine-Knoepfe gehoeren nicht in den Schluessel,
  sie wirken hinter der Softmax.
- Tragfaehig nur, weil der Replay deterministisch ist (oben): dieselbe Datei schneidet
  bytegleiche Crops. Hashen kostet ~2 ms gegen 47 ms gesparte Inferenz.
- **Eine Datei JE AUFNAHME, nicht je Eintrag** (2026-09-20). Vorher 655 588 Dateien zu 3,5 KB;
  kalt kostete ein zufaelliger Zugriff unter Last 10–13 ms, warm 0,22 ms. Der Umbau aenderte einen
  WARMEN Lauf nicht (35,0 -> 34,9 s) — die "bis zu 70 %" galten nur kalt. Er bringt einen
  sequenziellen Kaltstart und Platz (Cache 2 365 -> 142 MB).
- **Der eigentliche Engpass eines Einzellaufs ist der START:** 19,8 von 34,9 s (57 %) sind JVM,
  Modell und Vorlauf.

## Der visuelle Cache (`VisualObservationCache`, `visualcache=`)

Die Beobachtungen EINER Aufnahme, einmal gebaut und von allen Optimierer-Versuchen gelesen:
42,7 -> 12,5 s je Lauf (**3,4x**), 6 MB je Aufnahme. Gegenprobe: gleiche Konfiguration gleicher
Plies-Hash, `motionThr=0.45` entscheidet weiter anders — der Cache reproduziert und ueberschreibt
das Engine-Verhalten nicht.

- **Der Legalitaets-Prior gehoert zur Signatur.** Die Beobachtung wird abgelegt, NACHDEM
  `observationFromProbs(..., possibleFor(startFen), ...)` die Maske der aktuellen Stellung
  gerechnet hat (auf `233432` wichen schon bei `seq 2` 64 von 64 Feldern von der rohen Zeile ab).
  Der Kopf traegt Video, Modell und `visualCacheSignature` ueber Geometrie, Quad, Ausrichtung,
  Bildrate und Prior; `VERSION` wird gehoben, aeltere Dateien werden abgelehnt statt falsch gelesen.
- **`visualcache-partial`:** der Beobachter sieht hoechstens jeden zweiten Frame (200 von 400, kein
  Knopf hebt das auf), und andere Konfigurationen fordern andere Frames an. Tolerant liefert
  `lookup` `null` = normal rechnen; streng wirft er. Vor einem FREMDEN Cache schuetzt die Signatur.
- **Offen:** `ParallelVisualPrepass` rechnet ohne Prior und vergleicht bitweise gegen den Cache,
  also scheitert `visualworkers=` reproduzierbar bei `seq 2` (Stand 2026-09-21).

## `multireplay`: N Konfigurationen in einem Durchgang (`configs=<datei>`)

Je Zeile ein Name und die Knoepfe, die er gegen den Hauptlauf aendert; jede Zusatz-Engine bekommt
ihren eigenen Bewertungsblock. Ohne `configs=` ist der Hauptpfad unveraendert.

- **Geteilt wird die Pixelarbeit** (`SharedFrameWork`): der Warp einmal je FRAME, jeder fragende
  Store bekommt eine Kopie (`Mat.clone()`, eigene `seq`/`tsMs`/Seam-Planes); jeder Arm hat seinen
  eigenen `PlaneRing`, weil die Engine Planes per Referenz haelt (invariant 14). Nur `roiMotion`
  haengt an der Konfiguration und wird je Wertepaar gehalten. Alle Arme teilen EINE ONNX-Sitzung.
- `ExtraEngines.open` lehnt Arme ab, die sich in `boardSize`/`detectScale`/`diffClaheClip`
  unterscheiden (sie formen die geteilte Bildkette); `warpDetection` bricht bei verschiedenen Ecken
  ab; nur eine ECHTE Geometrie-Aenderung wird durchgereicht (`onGeometryChanged` wirft die Kette
  weg). Jeder Arm druckt `cnn[<tag>]: observations=… noCrops=…`.
- **Bis 2026-09-23 bekam ab dem zweiten Zusatzarm keine Engine einen Crop** (ein Store fuer alle,
  `croppedSeq` blockte den Rest; ab sechs Armen ueberschrieb zudem der geteilte Ring fremde Planes).
  Keine Engine-Entscheidung stand darauf. Nachweis seit dem Fix: `MultiReplayArmsTest`, drei und
  sechs gleiche Arme gegen den Einzellauf, gleiche Beobachtungen, Zuege und Warp-Anzahl.
- **Die Beschleunigung ist ungemessen** — die frueheren 1,8x stammen aus dem kaputten Stand. Der
  visuelle Cache greift dieselben Kosten an (die Beobachtung) und wirkt ueber alle Versuche; beide
  addieren sich nicht. `multireplay` lohnt fuer Messreihen, deren Punkte vorab feststehen (Gitter,
  Schwellenkurve); fuer TPE fehlt der Batch-Betrieb.
