# Der Sensor hielt die eingestellte Bildrate nicht — und die Schwelle rechnete trotzdem mit ihr

Nutzer, 2026-09-19, mitten im Spiel: "hinten raus dauert das erstaunlich lange fuer die erkennung".
Live am Geraet gemessen (`adb logcat`, Sitzung `20260919-155028`).

## Was gemessen wurde

Einstellung: `resolutionMode = R1440`, `frameRate = FPS15`. Geliefert:

    chesslabCamera: sensor gap 133,3 ms between delivered frames
    chesslabPerf: ... total=21.2  engine=5.0  fps=7.5  idle=109.3  luma=146.8

**7,5 fps statt 15.** Die Pipeline braucht 10-38 ms und wartet dann 110 ms — der Sensor ist der
Engpass, nicht die Rechnung. Die CNN-Inferenz ist mit 15-28 ms je 64 Crops unauffaellig.
`StageTimings.begin` sagt genau das: "idle well above zero means the sensor is — typically
auto-exposure stretching the frame period in low light".

Die Luecke waechst mit fallendem Licht: 133,3 -> 141,2 -> **164,2 ms**, waehrend `luma` von 148
auf 127 faellt. Das ist das "hinten raus".

## Zwei Fehler, beide behoben

**1. Die AE-Spanne wurde nach der OBERgrenze gewaehlt.** `pinFrameRate` nahm die engste Spanne mit
`upper == targetFps` — ein `[7,15]` erfuellt das und laesst der Belichtung trotzdem jede Periode
bis 143 ms. Die Zusage steckt in der UNTERgrenze. `chooseAeRange` waehlt jetzt unter den Spannen
mit `lower >= targetFps` die engste: `[15,15]` vor `[15,30]` vor `[30,30]`. Findet sich keine,
bleibt es beim lauten `Log.w` und AE laeuft frei — eine nicht angebotene Spanne ist ein
Bindungsfehler, und eine tote Kamera ist schlimmer als eine langsame.

**2. `motionThr` skalierte mit der EINGESTELLTEN Rate.** Es ist ein Anteil geaenderter Pixel gegen
das VORHERIGE Bild, heisst also "Bewegung je Frame-Periode", und wird mit `30 / fps` skaliert. Bei
15 statt 7,5 wurde x2 gerechnet, wo x4 richtig war — die Schwelle war **halb so gross wie noetig**,
die Engine sah dauernd Bewegung, das Brett galt nie als ruhig, und der Commit wartete.
`effectiveFrameRate` nimmt jetzt die gelieferte Rate, sobald sie die eingestellte um mehr als
15 % verfehlt; nach OBEN wird nie korrigiert, die Obergrenze kappt `pinFrameRate` bewusst.
`retuneDue` loest das genau EINMAL aus, nach 60 Frames — bei jedem Bild zu stimmen liesse
`motionThr` wandern und machte Laeufe unvergleichbar.

## Der Handel, den das kostet

Eine gepinnte Rate deckelt die Belichtungszeit, also wird das Bild dunkler, und `darkLumaThr = 18`
kann anfangen zu feuern. Der Nutzer dazu: "die fehlende Helligkeit muss dann halt mit EV
kompensiert werden". Die Regelung dafuer existiert (`CameraLookControl.setExposureCompensationIndex`,
`BoardExposureGovernor`) — **ob sie ausreicht, ist NICHT gemessen.**

## Was diese Aenderung NICHT geprueft hat

**Der Regressionssatz kann sie nicht pruefen.** Weder `engineConfig` noch `chooseAeRange` liegen auf
dem Desktop-Replay-Pfad — der hat keine Kamera und keine Bildrate. Das Tor ist eine echte Aufnahme
am Geraet: `sensor gap` und `fps=` im Perf-Log muessen danach bei 15 liegen.

**Ob das 24117RK2CG bei `R1440` ueberhaupt eine Spanne mit `lower >= 15` anbietet, ist offen.**
Der Code-Kommentar vermerkt, dass seine Rueckkamera "no locked range below 15" advertised; welche
sie bei 1440p wirklich anbietet, steht erst im naechsten `AE target fps range pinned to ...`. Bietet
sie keine, hilft nur 1080p — dort wurden 14-15 fps gemessen.
