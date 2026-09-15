# Der Analyzer-Loop und der Stack darunter

Die Belege hinter `TrackerCoordinator.kt` und `TrackerStack.kt`
(`android/tracker-runtime/src/main/kotlin/com/chesslab/tracker/service/`). Im Code steht jeweils
ein Satz mit Zeiger hierher.

## Warum im Loop nichts Teures steht

Je Frame, der Reihe nach: Pixel veroeffentlichen, `FrameInput` bauen, gestaute Aktionen und
CNN-Observationen abraeumen, Engine laufen lassen, Ergebnis veroeffentlichen, dem CNN einen Frame
anbieten, ggf. neu ausrichten. Nichts davon blockiert — kein `runBlocking`, kein `await`, keine
Platte, kein ArUco, keine Inferenz. Der alte 970-Zeilen-Service tat all das inline und hielt den
Loop bei 100-150 ms (Commit 4a7609e).

`LongParameterList` ist unterdrueckt, weil die Liste DIE NAHT IST: jeder Parameter ist ein
Mitarbeiter, den ein Host stellen muss, und keine zwei gehoeren zusammen. Das Halter-Objekt, nach
dem detekt fragt, existierte nur, um detekt zu genuegen — dieselbe Begruendung, die
`preprocessInto` in `:core-cnn` und `OpenCvStages` in diesem Modul fuehren. Der naechste Parameter
verdient ein Argument.

## Die Uhr ist ein Parameter, und das ist der Grund

`EngineState` nennt Determinismus BINDEND: `nowS` wird je Frame einmal aus
`FrameInput.timestampMs` gesetzt, und mehrere Gates sind Alter dagegen — die Bewegungs-Frist unter
`requireMotionForMove`, der Anomalie-Latch, die CNN-Cooldowns. Die WANDUHR ist richtig fuer eine
Kamera, wo ein Frame wirklich dann ankommt, wenn er ankommt, und falsch fuer einen Replay, der so
schnell dekodiert wie er kann: ein 319-Sekunden-Video in 200 Sekunden durchgeschoben macht jedes
dieser Fenster 1,6x zu kurz, und zwei Laeufe derselben Datei widersprechen sich.

Die Clip-Simulation hatte das Problem nie, weil sie diese Klasse umgeht und ihren eigenen
Zeitstempel direkt an `FramePipeline.onFrame` gibt. Deshalb waren 18 Clips gruen, waehrend ein
echtes Video nichts committete.

## Die Frame-Uhr spannt die GANZE Methode

Sie begann frueher innerhalb von `FramePipeline.onFrame` und endete an der Engine, womit drei
Stufen von nichts gemessen wurden: der Preview-Bus davor sowie Status-Publish, Observer-Anstoss und
LiveAlign-Klon danach. Deshalb las `total + engine` ~65 ms gegen eine beobachtete Frame-Periode von
~90 ms — die Luecke war echte Arbeit, kein Messrauschen.

## Belichtung, Fokus und die Pixel-Referenz

Gemessen wird NACH dem Frame, nicht davor: die Messung liest den Warp, den dieser Frame schon
bezahlt hat. Eine Verstellung verschiebt jeden Pixel, also ist die Pixel-Referenz danach hin —
`CaptureBaseline` ist genau das, ohne die Stellung zu verlieren. Das Grundrauschen wird VOR der
Regelung beobachtet, damit kein Paar ueber eine Verstellung hinweg gemessen wird.

Waehrend eines Fokus-Sweeps stellt die Belichtung nicht: sie verschoebe den Kontrast unter der
laufenden Messreihe, und der Gipfel ist ein Vergleich von Reihe zu Reihe. Der Sweep zaehlt als
unruhiger Frame, nicht als uebersprungener Aufruf — so armiert er den Hold mit, statt den Frame
nach ihm ueber die frische Pixel-Referenz regeln zu lassen.

`ExposureGovernor.NONE` und `FocusGovernor.NONE` sind die Vorgaben, damit Replay und Clip-Sim
unveraendert bleiben: die stellen keine Kamera und keine Linse, und eine Verstellung mitten im
Replay waere eine Eingabe, die nicht in der Datei steht.

Die Messgroessen: 160 px Brett sind 20 px je Feld, reichlich fuer einen Mittelwert und die Groesse,
die die Stillstands-Engine ohnehin warpt. Die Schaerfe misst auf 1024 px (128 px je Feld) — ein
Figurenrand ist wenige Pixel breit, und der Warp auf 160 rechnet genau die Frequenzen weg, an denen
Unschaerfe sichtbar waere. Der grosse Warp wird nur bezahlt, wenn ueberhaupt gemessen wird (Sweep,
sonst alle 30 Frames).

## Die Notiz-Drossel

Notizen tragen Zaehlerstaende ("Much change (7 squares + 1 occluded)…", "holding reference for
3s"), also wechselt der Text waehrend eines Stillstands auf fast jedem Frame und das Handy schriebe
eine Zeile je Detektionsframe. Ein `Stuck` ist ein Zustandswechsel und geht immer durch.

## Die Kalibrierung wird eingereiht, nicht angewandt

`TrackerService.calibrate` laeuft auf dem Main-Thread, waehrend dieser Loop auf dem Analyzer-Thread
mitten im Frame steht. Nur `pipeline.corners` ist `@Volatile`; die Geometrie, die Profil-Baseline
und der Marker-Glaetter dahinter sind gewoehnliche Felder. Inline geschrieben warpte ein Frame mit
den NEUEN Ecken unter der ALTEN Brettgroesse — die zwei Haelften einer Kalibrierung erreichten den
Loop einen Frame auseinander, genau der Zustand, fuer den `FrameLoop` eine Ebene verweigert. Eine
Referenz uebergeben und an der Frame-Grenze lesen macht den Tausch aus Sicht des Loops atomar.

## LiveAlign: ArUco gehoert nicht auf den Frame-Thread

Commit 4a7609e mass es mit 44-87 ms alle 300 ms AUF DEM ANALYZER-THREAD — die "Recorder-Spitzen",
die wochenlang der Aufnahme angelastet wurden. Heute laeuft es auf `dispatcher` mit hoechstens
einer Detektion in Flug, und die Ecken werden vom NAECHSTEN Frame aufgenommen.

`dispatcher` ist ein Parameter und nicht der Kontext von `scope`, weil dieser KDoc lange
"ein Hintergrund-Dispatcher" behauptete und das Telefon keinen hatte. `TrackerService` ist ein
`LifecycleService` und gibt `lifecycleScope`; `TrackerStack` baut seinen Scope als
`parent.coroutineContext + SupervisorJob()`, was `Dispatchers.Main.immediate` erbt. Also liefen
ArUco UND der einmal-je-Pose-Fit auf dem UI-THREAD auf genau dem Host, wo das zaehlt, waehrend der
Desktop `Dispatchers.Default` gab und gut aussah. `scope` behaelt den Elternkontext, den die
Settings- und Observer-Collectors darauf zu Recht wollen.

Bei einer Aenderung der gelieferten Groesse wird der Marker-Tracker ERSETZT, nie skaliert
(Commit a7dab73): seine geglaetteten Punkte sind Pixelkoordinaten, und EMA-Mischung zweier
Koordinatenraeume liess den Warp um ~2,3 Reihen driften. Neu-Seeden kostet ein paar Frames
Ausrichtung; Skalieren kostet eine ganze Partie.

Die Generation existiert aus demselben Grund: der Worker haelt einen ALTEN Frame und den Glaetter
von davor und liest `geometry` in sich selbst — ein Job, der nach einer Neukalibrierung landet,
mischte ein Quad von vorher mit der neuen Geometrie und ueberschrieb die Ecken, die der Nutzer
gerade gemessen hatte.

## `onGrid`: die Rillen-Korrektur

Ohne sie ist die Verfeinerung zur Kalibrierzeit Dekoration: `maybeAlign` leitet das Quad alle
`alignEvery` Frames — ~0,2 s bei 15 fps — neu aus den Markern ab und weiss nichts von Rillen, hat
die verfeinerten Ecken also fast sofort ueberschrieben, und jeder Crop wurde mit genau der
Geometrie geschnitten, die die Verfeinerung beseitigen soll.

GEMESSEN einmal je Pose, dann umsonst WIEDERANGEWANDT: vier Punkte durch eine 3x3. Es laeuft auf
dem Align-Dispatcher mit einer Detektion in Flug, kostet also hoechstens einen ausgelassenen Align.
Hier zu messen statt den Wert vom Kalibrier-Screen zu tragen heisst auch, dass es nach einem
App-Neustart wieder steht, wo der Screen nie laeuft.

**Es kostet ~500 ms, und das ist gemessen.** Auf der Entwicklermaschine bei boardSize 1248 liest
`improveQuad` allein 412-432 ms und das ganze `quadOf` darum 625 ms (Mediane, 2026-08-07). Dieser
KDoc sagte frueher "70-85 ms bei boardSize 800", was selbst flaechenskaliert ~200 ms waere — die
echte Zahl ist rund das Dreifache. AUF DEM GERAET ist es noch nicht gemessen, dort wird es
langsamer sein. Die halbe Sekunde ist der Grund, warum der Dispatcher ein Parameter ist: eine
Einmal-je-Pose-Kosten auf einem Hintergrund-Dispatcher ist in Ordnung, dieselbe auf dem Main-Thread
ist ein sichtbares Einfrieren, das nichts meldete.

Die Korrektur lebt im rektifizierten Raum, was sie auf ein Quad uebertragbar macht, auf dem sie
nicht gemessen wurde — der ganze Live-Fall, da die Marker zwischen Detektionen ein wenig wandern.
`specs/30` mass diesen Rest als systematisch je Aufbau und im Vorzeichen zwischen Aufbauten
verschieden, also genau als Konstante je Kalibrierung.

## Warum die Korrektur verfaellt

Ohne `fittedAt` ueberlebte die Korrektur ihre eigene Voraussetzung. Ihr KDoc nennt den Rillen-Rest
"eine Konstante je Kalibrierung" nach `specs/30` — das stimmt und traegt eine unausgesprochene
Bedingung: es ist eine Konstante DIESES AUFBAUS. `maybeAlign` leitet das Quad alle `alignEvery`
Frames neu ab, ein angestossenes Telefon wird vom Quad also korrekt verfolgt und bekommt dann eine
an der alten Pose gemessene Korrektur obendrauf, still, fuer den Rest der Sitzung. Das ist die Form
des Fehlers, die dieses Projekt das 5,5-fache seiner Leerfeld-Marge kostete: ein paar Pixel
konsistenter Versatz, bei dem nichts laut scheitert.

`DRIFT_REFIT_CELLS = 0.25` ist **ein Startwert, keine Messung.** Es gibt keine Verteilung von
`quadDriftCells` vom Geraet; ein Viertelfeld ist gewaehlt, weil es weit ueber dem Zittern des
Marker-Glaetters und weit unter einer Verschiebung liegt, die jemand "das Brett hat sich bewegt"
nennen wuerde. Vor dem Zitieren als abgeleitete Zahl messen — eine Schwelle zu erfinden und als
gemessen zu praesentieren ist genau das, was den ersten Entwurf von `specs/36` versenkte.

## Was ein Neustart NICHT vergisst

Ein Neustart existiert, um die 34 konstruktionszeitlichen Knoepfe anzuwenden; er ist kein Reset.
Stellung, Kalibrierung und Eckenausrichtung gehoeren dem Nutzer, nicht der Config, und werden dem
neuen Stack uebergeben. Die Zug-HISTORIE wird nicht mitgenommen: `TrackerEngine` wird mit einer FEN
geseedet, also startet Undo nach einem Neustart leer (STATUS D07x-3).

Bei `TrackerSeed` ist `LongParameterList` unterdrueckt, weil DIES das Halter-Objekt ist, nach dem
detekts Regel fragt — das Ding, das die Parameterliste von `TrackerStack` kurz haelt. Seine Felder
gegen dieselbe Schwelle zu zaehlen bestraft die Loesung fuer das Problem.

Der Diagnose-Schreiber (`onDecision`) wird aus demselben Grund uebergeben wie die Stellung: ein
Neustart, der ihn vergaesse, liesse die neue Engine ihre Zeilen an niemanden schreiben, und die
Sitzung, in der das zaehlt, ist immer die, in der niemand die Luecke bemerkt hat. Ebenso die Logs:
der Host besitzt die Plattform, der Stack besitzt die KANALNAMEN — und diese Namen sind das, worauf
`adb logcat -s` gerichtet wird, also Verhalten und keine Dekoration.

CLAHE je Crop kommt aus der `config.json` des Laufs und nicht aus einer Einstellung: ein Modell,
das mit CLAHE trainiert wurde, aber ohne bedient wird, bekommt Pixel, die es nie gesehen hat. Null
ist der Zustand jedes bisher ausgelieferten Modells.

Der Observer-Dispatcher: `null` — die Vorgabe und was das Telefon nutzt — ist ein eigener Thread,
denn Live-Frames muessen weiterfliessen, waehrend das Modell denkt. Ein REPLAY gibt stattdessen
einen direkten Dispatcher, damit die Observation vor dem naechsten Frame inline fertig ist: wann
ein Snapshot relativ zu den Frames landet, haengt dann an nichts als dem Video. Der Kadenz-Knopf
dafuer ist `observerIntervalS` — synchron bei 0 hiesse Inferenz auf jedem Frame.

## Was der Stack NICHT besitzt

Bewusst nicht dabei: die `TrackerCamera` (genau EIN `ProcessCameraProvider`-Binding darf
app-weit existieren — MEMORY `android-single-camera-owner`; ein Neustart richtet es neu aus), der
`CameraFrameBus`, der `StatusPublisher` und die `SettingsRepository`. Die letzten drei, weil die UI
ihre `StateFlow`s schon einsammelt: eine getauschte Flow-Instanz ist ein Screen, der still
aufhoert zu aktualisieren — genau die Fehlerart, gegen die dieses ganze Paket existiert.

## Das Observations-Hauptbuch

Eine Zeile je ausgesandtem Snapshot: welchen Frame die CNN ansah, zu welcher Videozeit, und ob ihr
eigener Read eine Hand sah. Die Veraltungs-Sicherung der Engine (`CnnTick`: verwerfen, wenn
`snap.fen` weitergezogen ist) fuehrt das Buch bereits — das hier macht es SICHTBAR, und es ist die
Zahl, auf die Hebel 2 gatet: ein verpasster Zug, dessen Fenster `occl=0`-Zeilen enthaelt, hatte
einen sauberen Blick und hat ihn verschwendet; einer ohne hatte nie eine Chance.

`grid` bleibt der modellfreie Rueckfall fuer Modelle ohne Coverage-Ausgang. Coverage-Modelle melden
hier absichtlich Null, weil beide Arme zu fahren einen vollen Brettdurchgang verschwendet.

## Was still verworfen wurde, wird gezaehlt

Die Kadenz-Regression vom 2026-08-08 (67 -> 26 Plies) war genau deshalb unsichtbar, weil jeder
dieser Pfade still verwarf. `dropLine()` haengt an der Perf-Zeile beider Hosts.

## Der Observer laeuft auf der Uhr der ENGINE

Auf dem Telefon sind die zwei dasselbe; im Replay laeuft die Engine auf der virtuellen Uhr des
Videos, und ein Observer, der sich auf der Wanduhr taktet, ist eine zweite Uhr in einer Maschine —
seine Kadenz haengt dann daran, wie schnell DIESER Host dekodiert, und so produzierte dieselbe
Datei einmal 23 und einmal 25 committete Plies.

Die Werte des Seeds werden gesetzt und NICHTS wendet sie erneut an: ein `settings.config`-Collector
tat das frueher, und da keiner der Knoepfe live stellbar ist, konnte er nur einen
neustart-gebundenen Wert tragen — die VORGABE der Repository, einen Tick nach dem Start. So wurde
das `set:cnnVerify=false` eines Replays akzeptiert, ausgedruckt und dann still wieder eingeschaltet
(882 Observationen, `gateOff=0`).

Aus demselben Grund liest `LiveAlign` die Config DIESES LAUFS: `liveAlign`/`alignEvery`/
`alignScale` sind neustart-gebunden, also servierte ein Lesen von der Repository deren VORGABE an
jeden Host, dessen Repository nicht die Config des Laufs ist — das aufgenommene `alignEvery=2`
eines `config=`-Replays richtete wie alles andere jeden dritten Frame aus (20260814-143233,
2026-08-14).

## Warum die Ausrichtung im Replay inline laeuft

Sie teilt die Dispatcher-Wahl des Observers: inline fuer Replays, eigener Worker live. Inline ist
nicht nur Determinismus (ein Align landet auf einer Video- und nicht auf einer Wandzeit) — es ist,
was den Desktop durch OpenCV EINFAEDIG macht: liefen die Stufen des Drive-Threads und ArUco
nebenlaeufig, committete `detectMarkers` im Windows-Build 4.10 auf einem bewegungsunscharfen Frame
einen einzelnen ~53-GB-Nativpuffer (specs/52 STATUS, 2026-08-08), und `Core.setNumThreads(1)`
allein machte den Ballon nur seltener, nicht unmoeglich.

## Schliessen in umgekehrter Reihenfolge, Observer zuerst

Er ist das einzige Mitglied, das einen Thread und eine native Session haelt, und er muss vor der
Pipeline stoppen, aus der er schneidet: eine Observation, die in eine geschlossene Pipeline
ueberlebte, laese freigegebenen OpenCV-Speicher. Der Engine-Host braucht kein Close — er ist
Warteschlangen und gewoehnliche Objekte, und der ganze Sinn seines Neubaus ist, dass sein
Thread-Anspruch mitgeht. Das `timings`-Objekt ueberlebt den Stack auf dem Telefon (der Service
besitzt es ueber Neustarts hinweg), also duerfen die Zaehler eines geschlossenen Stacks nicht
weiter auf die Zeile des naechsten schreiben.

## `StackSwitch`: die Reihenfolge IST der Vertrag

**Detach, close, build.** Zuerst abkoppeln macht aus einem waehrend des Neustarts ankommenden Frame
einen verworfenen Frame statt eines Aufrufs in eine geschlossene Pipeline; vor dem Bauen schliessen
haelt einen Neustart davon ab, zwei ONNX-Sessions, zwei Observer-Threads und zwei Saetze
vollaufloesender Warps gleichzeitig zu halten — auf einem Telefon ist das ein OOM und keine
Ineffizienz. Generisch ueber `T` ist es nur, damit die ORDNUNG gegen ein Fake auf der Desktop-JVM
geprueft werden kann: der echte Stack braucht OpenCV- und ONNX-Natives.
