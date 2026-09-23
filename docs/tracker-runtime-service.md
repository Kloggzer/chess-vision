# Der Analyzer-Loop und der Stack darunter

Die Belege hinter `TrackerCoordinator.kt` und `TrackerStack.kt`
(`android/tracker-runtime/src/main/kotlin/com/chesslab/tracker/service/`). Im Code steht jeweils
ein Satz mit Zeiger hierher.

## `TrackerCoordinator`

### Im Loop steht nichts Teures

Je Frame: Pixel veroeffentlichen, `FrameInput` bauen, gestaute Aktionen und Observationen abraeumen,
Engine laufen lassen, Ergebnis veroeffentlichen, dem CNN einen Frame anbieten, ggf. ausrichten.
Kein `runBlocking`, kein `await`, keine Platte, kein ArUco, keine Inferenz — der alte Service tat
das inline und hielt den Loop bei 100-150 ms (Commit 4a7609e). `LongParameterList` ist
unterdrueckt, weil die Liste DIE NAHT ist: jeder Parameter ist ein Mitarbeiter, den ein Host
stellen muss.

### Die Uhr ist ein Parameter

`EngineState` setzt `nowS` je Frame aus `FrameInput.timestampMs`, und mehrere Gates sind Alter
dagegen (Bewegungsfrist, Anomalie-Latch, CNN-Cooldowns). Die Wanduhr ist richtig fuer eine Kamera
und falsch fuer einen Replay, der so schnell dekodiert wie er kann: 319 s Video in 200 s machen
jedes Fenster 1,6x zu kurz, und zwei Laeufe derselben Datei widersprechen sich. Die Clip-Simulation
umging diese Klasse — deshalb waren 18 Clips gruen, waehrend ein echtes Video nichts committete.

### Die Frame-Uhr spannt die ganze Methode

Sie begann frueher in `FramePipeline.onFrame` und endete an der Engine; Preview-Bus, Status-Publish,
Observer-Anstoss und LiveAlign-Klon fehlten. `total + engine` las ~65 ms gegen ~90 ms Frame-Periode
— die Luecke war echte Arbeit.

### Belichtung, Fokus und die Pixel-Referenz

Gemessen wird NACH dem Frame, auf dem Warp, den er schon bezahlt hat. Eine Verstellung verschiebt
jeden Pixel; `CaptureBaseline` verwirft die Referenz ohne die Stellung. Das Grundrauschen wird VOR
der Regelung beobachtet, damit kein Paar ueber eine Verstellung reicht. Waehrend eines
Fokus-Sweeps stellt die Belichtung nicht, und der Sweep zaehlt als unruhiger Frame (nicht als
uebersprungener Aufruf), damit er den Hold mit armiert.

`ExposureGovernor.NONE` und `FocusGovernor.NONE` sind die Vorgaben: Replay und Clip-Sim stellen
keine Kamera, eine Verstellung waere eine Eingabe, die nicht in der Datei steht. Helligkeit misst
auf 160 px (20 px je Feld, die Groesse der Stillstands-Engine), Schaerfe auf 1024 px — der Warp auf
160 rechnet genau die Frequenzen weg, an denen Unschaerfe sichtbar waere. Der grosse Warp wird nur
bezahlt, wenn gemessen wird (Sweep, sonst alle 30 Frames).

### Die Notiz-Drossel

Notizen tragen Zaehlerstaende und wechseln im Stillstand fast jeden Frame; ohne Drossel schriebe
das Handy eine Zeile je Detektionsframe. Ein `Stuck` ist ein Zustandswechsel und geht immer durch.

### Die Kalibrierung wird eingereiht, nicht angewandt

`TrackerService.calibrate` laeuft auf Main, der Loop auf dem Analyzer-Thread; nur
`pipeline.corners` ist `@Volatile`. Inline geschrieben warpte ein Frame die NEUEN Ecken unter der
ALTEN Brettgroesse. Eine Referenz uebergeben und an der Frame-Grenze lesen macht den Tausch atomar.

### LiveAlign: ArUco gehoert nicht auf den Frame-Thread

Commit 4a7609e mass 44-87 ms alle 300 ms AUF dem Analyzer-Thread (die "Recorder-Spitzen"). Heute
laeuft es auf `dispatcher` mit hoechstens einer Detektion in Flug; die Ecken nimmt der NAECHSTE
Frame. `dispatcher` ist ein Parameter, weil der geerbte Scope-Kontext auf dem Telefon
`Dispatchers.Main.immediate` war — ArUco und der Fit liefen auf dem UI-Thread, waehrend der
Desktop `Dispatchers.Default` gab und gut aussah.

Aendert sich die gelieferte Groesse, wird der Marker-Tracker ERSETZT, nie skaliert (Commit
a7dab73): EMA ueber zwei Koordinatenraeume liess den Warp um ~2,3 Reihen driften. Die Generation
existiert, weil ein Job, der nach einer Neukalibrierung landet, sonst ein altes Quad mit neuer
Geometrie mischte und die frisch gemessenen Ecken ueberschrieb.

### `onGrid`: die Rillen-Korrektur

Ohne sie ueberschreibt `maybeAlign` alle `alignEvery` Frames die verfeinerten Ecken mit dem
Marker-Quad, und jeder Crop hat genau den Fehler, den die Verfeinerung beseitigen soll. GEMESSEN
einmal je Pose, dann gratis WIEDERANGEWANDT (vier Punkte durch eine 3x3), auf dem
Align-Dispatcher; nach einem App-Neustart steht sie wieder, auch ohne Kalibrier-Screen.

**~500 ms, gemessen:** `improveQuad` 412-432 ms, `quadOf` 625 ms bei `boardSize` 1248 am
Dev-Rechner (2026-08-07); am Geraet ungemessen und langsamer. Die halbe Sekunde ist der Grund fuer
den Dispatcher-Parameter. Die Korrektur lebt im rektifizierten Raum und ist eine Konstante je
Aufbau (specs/30), also auf wandernde Marker-Quads uebertragbar.

### Warum die Korrektur verfaellt

Konstante je Kalibrierung heisst: Konstante DIESES AUFBAUS. Ein angestossenes Telefon verfolgt das
Quad korrekt und bekaeme sonst die alte Korrektur still obendrauf — ein paar Pixel konsistenter
Versatz, die Fehlerform, die dieses Projekt das 5,5-fache seiner Leerfeld-Marge kostete.
`DRIFT_REFIT_CELLS = 0.25` ist **ein Startwert, keine Messung** — vor dem Zitieren messen.

## `TrackerStack`

### Was ein Neustart NICHT vergisst

Ein Neustart wendet die konstruktionszeitlichen Knoepfe an; er ist kein Reset. Stellung,
Kalibrierung und Eckenausrichtung gehoeren dem Nutzer und werden uebergeben; die Zug-HISTORIE
nicht (die Engine wird mit einer FEN geseedet, Undo startet leer). `TrackerSeed` ist das
Halter-Objekt, nach dem detekt fragt — seine Felder gegen dieselbe Schwelle zu zaehlen bestraft
die Loesung.

- Der Diagnose-Schreiber (`onDecision`) wird uebergeben: ein Neustart, der ihn vergaesse, liesse
  die neue Engine ihre Zeilen an niemanden schreiben.
- Der Host besitzt die Log-Plattform, der Stack die KANALNAMEN — die sind das Ziel von
  `adb logcat -s`, also Verhalten.
- CLAHE je Crop kommt aus der `config.json` des Laufs, nicht aus einer Einstellung: ein mit CLAHE
  trainiertes Modell ohne CLAHE bekommt Pixel, die es nie sah.

### Der Observer-Dispatcher

`null` (Vorgabe, Telefon) ist ein eigener Thread, damit Frames weiterfliessen, waehrend das Modell
denkt. Ein REPLAY gibt einen direkten Dispatcher: die Observation ist vor dem naechsten Frame
fertig, und wann ein Snapshot landet, haengt nur am Video. Der Kadenz-Knopf ist
`observerIntervalS`.

### Der Observer laeuft auf der Uhr der ENGINE

Im Replay laeuft die Engine auf Videozeit; ein Observer auf der Wanduhr ist eine zweite Uhr, und
dieselbe Datei committete einmal 23 und einmal 25 Plies.

### Seed-Werte werden nicht erneut angewandt

Ein `settings.config`-Collector wandte frueher die Repository-VORGABE einen Tick nach dem Start
an: `set:cnnVerify=false` eines Replays wurde gedruckt und still wieder eingeschaltet (882
Observationen, `gateOff=0`). Aus demselben Grund liest `LiveAlign` die Config DIESES LAUFS — ein
`config=`-Replay mit `alignEvery=2` richtete sonst jeden dritten Frame aus.

### Die Ausrichtung laeuft im Replay inline

Das ist nicht nur Determinismus, es haelt den Desktop durch OpenCV EINFAEDIG: nebenlaeufig
committete `detectMarkers` (Windows, 4.10) auf einem unscharfen Frame einen ~53-GB-Nativpuffer, und
`Core.setNumThreads(1)` allein machte das nur seltener.

### Das Observations-Hauptbuch und die Verwurf-Zaehler

Eine Zeile je Snapshot: welcher Frame, welche Videozeit, ob der Read eine Hand sah. Ein verpasster
Zug, dessen Fenster `occl=0`-Zeilen enthaelt, hatte einen sauberen Blick und verschwendete ihn.
`grid` bleibt der modellfreie Rueckfall; Coverage-Modelle melden dort absichtlich Null. Was still
verworfen wird, zaehlt `dropLine()` auf der Perf-Zeile — die Kadenz-Regression vom 2026-08-08
(67 -> 26 Plies) war unsichtbar, weil jeder Pfad still verwarf.

### Was der Stack NICHT besitzt

Die `TrackerCamera` (genau EIN `ProcessCameraProvider`-Binding app-weit), den `CameraFrameBus`, den
`StatusPublisher` und die `SettingsRepository`. Die UI sammelt deren `StateFlow`s schon ein; eine
getauschte Flow-Instanz ist ein Screen, der still aufhoert zu aktualisieren.

### Schliessen: Observer zuerst

Er haelt als einziger Thread und native Session und muss vor der Pipeline stoppen, aus der er
schneidet, sonst liest er freigegebenen OpenCV-Speicher. `timings` ueberlebt den Stack, also
duerfen die Zaehler eines geschlossenen Stacks nicht auf die Zeile des naechsten schreiben.

### `StackSwitch`: die Reihenfolge IST der Vertrag

**Detach, close, build.** Abkoppeln macht einen Frame waehrend des Neustarts zu einem verworfenen
statt zu einem Aufruf in eine geschlossene Pipeline; vor dem Bauen schliessen verhindert zwei
ONNX-Sessions und zwei Saetze Warps gleichzeitig — auf einem Telefon ein OOM. Generisch ueber `T`
nur, damit die Ordnung gegen ein Fake auf der JVM pruefbar ist.
