# Der Desktop-Replay: warum er so gebaut ist

Die Belege, die vorher als lange Kommentarbloecke in
`android/desktop/src/main/kotlin/com/chesslab/desktop/DesktopMain.kt` und `ReplayOptions.kt`
standen. Im Code steht jeweils ein Satz mit Zeiger hierher; hier stehen die Messungen.

## Der Replay ist die Handy-Pipeline, nicht eine zweite

`replay <video>` faehrt einen aufgenommenen Clip durch den echten `TrackerStack` — dieselbe
Pipeline, dieselbe Engine, derselbe Coordinator. Es gibt hier keine zweite Schleife: die Datei
baut den Objektgraphen und fuettert ihn mit Frames, genau das, was `TrackerService` auf dem
Telefon tut, minus der Notification.

Die virtuelle Uhr kommt aus der Bildrate der Quelle, nicht von der Wanduhr. Damit ist ein Replay
deterministisch: dieselbe Datei ergibt dieselbe Partie — erst das macht einen Breakpoint
brauchbar.

## `align` hatte einen `raw`-Schalter, der nichts mehr verglich

Der Schalter verglich gegen eine GESPEICHERTE Kalibrierung, damit ein Leser sehen konnte, ob die
Verzeichnung oder die Brettgeometrie der Fehler war. Diese Datei kam aus `chesslab lens
calibrate`, geloescht 2026-08-20 — seitdem verglich der Schalter roh gegen roh. Die Frage
beantwortet heute `undistort`, das die Optik aus der Aufnahme selbst fittet.

## Die Ecken sind ein Vorlauf, keine Stufe in der Schleife

Der Quad entscheidet die Brett-GROESSE, und die entscheidet den Warp, gegen den die Engine ihre
Felder indiziert — er muss also bekannt sein, bevor der Stack existiert. Auf dem Telefon passiert
dasselbe, verteilt ueber einen Kalibrier-Screen.

`locateBoard` ruft die zwei Haelften von `quadOf` einzeln auf, damit jede ihre eigene Zeit
bekommt. Genau darum geht es: ArUco traegt aus Commit 4a7609e die Behauptung "44-87 ms" und
`improveQuad` eine von "70-85 ms bei boardSize 800", zu der sein eigener KDoc nicht steht — eine
einzelne kombinierte Zahl haette keine von beiden pruefen koennen.

## Was der gespeicherte Marker-Rand kostet

`margin` sagt, wie weit ausserhalb des Spielfelds die Marker sitzen, und ist heute eine Konstante:
`DEFAULT_MARKER_MARGIN` = 0,045, ein Wert fuer alle vier Ecken. Die Marker sind von Hand
aufgeklebt. `measureAlignment` stellt deshalb die einzige Frage, die entscheidet, ob die Konstante
hier gut genug ist — ueber `alignmentOf`, das absolut misst statt selbstbezueglich: es fittet die
neun Linien je Achse aus dem Brett selbst und meldet den schlimmsten Feldversatz gegen 4 % einer
Zelle, wobei jede nicht auffindbare Linie als UNGELESEN zaehlt statt angenommen zu werden.

Es aendert nichts. Ein je Ecke gemessener Rand lohnt den Bau erst, wenn das hier sagt, dass die
Konstante falsch ist, und um wieviel.

## Eine Kalibrierung, die nicht traegt, ist ein Befund und keine Datei

`calibrate` schreibt von sich aus nichts: eine Kalibrierung, die das Brett nicht unter die Grenze
bringt, wird gemeldet, nicht gespeichert. Die gespeicherte, die diese Rig schlechter machte, ist
genau das, was passiert, wenn man diese Unterscheidung ueberspringt.

`next()` ist eine LEIHGABE, kein Getter: es gibt eine `Mat` zurueck, die die Quelle weiter besitzt
und ueberschreiben wird. `latestCalibrationFrame()` gibt dagegen eine unveraenderliche Sicht
zurueck, die der Aufrufer freigeben muss. Die Naht ist so geschnitten, dass jeder Host seine eigene
Regel behaelt, statt dass eine von beiden still falsch ist.

## Offsets nur als Median ueber mehrere Frames

`medianOffset` mass bis 2026-08-07 EINEN Frame, waehrend `align` sechzig mass — eine Kalibrierung
wurde also gegen eine Zahl beurteilt, die anders zustande kam als die, mit der sie verglichen
wurde. Die Streuung je Lauf ist winzig (<= 0,07 px ueber sechzig Frames), aber das lernt man durch
Messen der Streuung, nicht durch Annehmen beim Ueberspringen.

## Die Brettgroesse wird gemessen, nicht konfiguriert

Sie kommt aus dem erkannten Quad und wird dann in die Config kopiert, genau wie auf dem Telefon.
`measuredBoardSize` klemmt auf 320..1280, also widerspricht eine Config, die noch den
1600-Platzhalter traegt, jeder Ebene, die der Warp erzeugt, und `FrameLoop.step` weist sie ab —
"ein still verworfener Frame nach dem anderen".

Sie kommt NICHT aus dem Modell. Das Modell besitzt die Crop-Komposition (specs/45: `pad_side`,
`infer_size`); dies ist die Aufloesung, in der der DIFF-Pfad arbeitet
(`detSize = boardSize * detectScale`), und der Erkenner hat darueber nicht zu bestimmen.

## Die Optik wird aus DIESEM Material gefittet

Eine gespeicherte Kalibrierung nimmt an, die Optik habe sich seither nicht bewegt; auf dieser Rig
schlug ein Fit aus dem Material die gespeicherte um 1,2 px. Der Fit laeuft ueber `Stage.LENS` — die
Frame-Quelle entzerrt nie selbst. Das Brett wird auf DENSELBEN Pixeln lokalisiert, die der Tracker
sehen wird: auf rohen Frames lokalisieren und auf korrigierten tracken hiesse, den Stack mit einem
Quad aus dem anderen Raum zu seeden.

## Der Vorlauf wird uebersprungen, bevor das Brett lokalisiert wird

Die Aufnahme beginnt VOR der Partie. Das Telefon leert seinen Vorlauf-Ring beim ersten Commit
(`video_pre_roll_ns`), also heisst Tracken ab Frame 0: Brettaufbau und Haende tracken, die die
Engine des Telefons nie sah — und ein dort eingerasteter Alarm hat keinen Nutzer, der ihn loescht,
was `2026-08-15-22-48-04` alle 19 Plies kostete. Uebersprungen wird vor dem Lokalisieren, damit der
Quad auf der Partie gemessen wird und nicht auf dem Aufbau.

`start=` ist DEFAULT AUS: das Telefon trackt ab seinem ersten Frame, ein Replay, das springt, misst
einen Tracker, den das Geraet nie faehrt. Frueher wurde auf `session.yaml`s `video_pre_roll_ns`
minus zwei Sekunden Vorlauf gespult. Auf 2026-08-14-20-35-52 landete das 0,7 s vor dem ersten Zug —
zu wenig Anlauf fuer eine saubere Referenz, `e4` registrierte nie als Aenderung, und der Lauf
schrieb 1/4 statt 3/4.

## Auf welchem Quad ein Lauf stand, gehoert zu seiner Provenienz

Die zwei Quellen liegen gemessen 6 bis 25 Plies auseinander (specs/52 "geometry A/B", noch offen).
Am 2026-08-14 wurde eine Label-Plan-Baseline gegen `locateBoard`-Laeufe gestellt, ohne dass das
jemand sehen konnte — ein Tag Verdacht gegen `config=` fuer einen Unterschied, den der Quad machte.
Am 2026-08-30 scheiterte daran eine Reproduktion: live liefen acht Halbzuege, im Replay vier, und
`config=` wie `fps=` waren unschuldig.

## Der Startindex kommt von der Quelle, nicht von einem Cast

`replayStartFrame` ist, wo das Lokalisieren den Dekoder stehen liess — der erste Frame, den der
Tracker sieht, und der Ursprung, ab dem jeder Vorlauf seine Zeilen zaehlt. Er wird von der Quelle
selbst gelesen und nicht ueber einen `VideoFileSource`-Cast: eine segmentierte Aufnahme ist eine
`ConcatFrameSource`, der Cast fiel auf 0 durch, und der Vorlauf keyte seine Detektionen dann um
einen Lokalisierungslauf zu frueh.

Aus demselben Grund gibt es `hookIndex`: `drive` zaehlt ab seinem eigenen ersten Frame, was
`skipPreRoll` plus den Lokalisierungs-Lauf ins Video hinein ist — 878 Frames auf
2026-08-16-20-41-33, dessen exportierte Labels danach alle 29 s vor ihrem Bild sassen. Eine
Live-Kamera hat nichts, wovon sie zaehlen koennte, und behaelt den Zaehler.

## Das Modell besitzt die Crop-Komposition, und der Desktop fragte nicht

Crops wurden in `BoardGeometry`s 128x128 geschnitten, waehrend `id35-80` 80x80 nimmt — jede
Observation flog innerhalb von `CnnObserver` und wurde als Warnung verschluckt, waehrend der Lauf
`cnn=run` meldete. Der Spec wird gelesen, ob die CNN an ist oder nicht, damit `nocnn` den
Klassifikator isoliert und nicht die Geometrie: zwei Laeufe, die sich in einem Schalter
unterscheiden, muessen sich in einer Sache unterscheiden.

Dasselbe gilt fuer CLAHE: die Vorverarbeitung kommt aus der `config.json` des Modells. Der Desktop
baute sie nie — jeder Replay mit `p4a-80-clahe` servierte dem CLAHE-trainierten Modell rohe Crops.

Und fuer das Coverage-Gate: es reitet im MODELL, nicht in der Engine (`docs/occlusion-gate.md`),
und `:app` wendet es seit der Messung beim Attach an. Der Replay tat es nicht — jede Messung hier
lief auf der 0,5-Vorgabe, waehrend das Telefon die 0,15 des Modells fuhr, und ein Feld zwischen
beiden zaehlte in einem Lauf als Zeuge und im anderen nicht.

## Der Bus haengt an der Engine-Uhr

`CameraFrameBus` wird hier gehalten statt vom Stack zurueckgelesen: `TrackerStack` nimmt den Bus
als Konstruktor-Argument und legt ihn nicht offen, und eine geteilte Naht fuer das
Debugging-Fenster eines Hosts zu verbreitern waere der falsche Tausch.

Er drosselt seinen Preview- und Kalibrier-Abgriff auf 200 ms — per Vorgabe auf der WANDUHR
gemessen, womit der Frame, auf dem LiveAlign anschlaegt, davon abhing, wie schnell dieser Host
dekodiert. Videozeit macht daraus auf jedem Lauf denselben Frame (und live IST `FrameClock` die
Wanduhr).

## Die Settings werden bewusst NICHT mit der Lauf-Config geseedet

`settings.update(config)` wurde am 2026-08-08 probiert und liess rec-20260808 von 67 Plies auf 26
zusammenfallen, mit einem Phantom auf rec-20260807 — ueber einen Pfad, den die A/B-Tests nicht
festnageln konnten (liveAlign aus und eine schnellere Kadenz heilten es beide nicht). Jede gute
Messung im Archiv lief mit dem Repository auf Codec-Vorgaben. Dieser Zustand ist jetzt erklaert
statt zufaellig, und der eine Knopf, bei dem die zwei Quellen sich widersprachen
(`observerIntervalS`), ist in beiden 0,0. Genau deshalb darf hier nichts daraus einen Knopf LESEN,
den der Lauf besitzt: es haelt die Vorgaben.

## `nocnn` faehrt einen anderen Tracker, mit Absicht

Mit CNN arbitriert die Engine Verdeckung je Feld; ohne faellt `Taint.cnnOcclusionFilter` auf
">2 geaenderte Felder = eine Hand" zurueck. `nocnn` faehrt diesen Rueckfall absichtlich, damit die
zwei verglichen werden koennen, statt dass einer fuer den anderen gehalten wird.

## `quiet` ist, was einen Replay skriptbar macht

Mit offenem Fenster ist Break-on-stuck richtig — ein Mensch schaut zu und will, dass es anhaelt.
Dieselbe Vorgabe macht aus einem Batch-Replay einen Prozess, der ewig auf eine Taste wartet, die
niemand druecken wird.

In `drive` wird die View VOR dem naechsten Frame befragt, nicht danach: wenn sie auf einer
haengenden Engine stoppt, muss auf dem Schirm der Zustand stehen, der den Stopp ausgeloest hat, und
nicht der danach.

## Die Uhr ist die PTS, nicht `frames x 1000/fps`

Die gezaehlte Uhr nahm CFR an, was das Telefon nie liefert (Segmente mit 26,35/23,47 fps). Sie
scherte die Videozeit auf VFR-Material und zwang das Label-Verb zu verlustbehafteten
Neukodierungen (2026-08-14, Session 143233). Die PTS ist exakt und bleibt reproduzierbar. Ein per
`stride` uebersprungener Frame laesst die Uhr trotzdem weiterlaufen — die Eigenschaft, die die
gezaehlte Uhr von Hand halten musste.

## Die Frame-Auswahl der Aufnahme schlaegt `fps=`

`fps=<n>` trifft die ANZAHL der Frames, aber nicht die Bilder, die CameraX live durchliess — und
daran haengt, was der Diff vergleicht. Wo die Aufnahme ihre eigene Auswahl gemessen hat, gilt sie
und `stride` ruht: ein Replay, der andere Bilder waehlt als die Messung, ist keine Reproduktion.

`fps=` ist live verboten: eine Kamera verwirft schon, was die Pipeline nicht nimmt — der Stride
existiert, um einem Replay dieselbe Realitaet deterministisch zu geben.

## `confidenceLine` bleibt Diagnose

Die Signale, die die Engine ZUM COMMIT-ZEITPUNKT hatte, waren dazu gedacht, eine Commit-Schwelle
gegen eine Ziel-Fabrikationsrate zu eichen statt sie von Hand zu stellen. Gemessen 2026-08-24:
sie trennen Fabrikationen nicht von Treffern (`docs/commit-calibration.md`).
