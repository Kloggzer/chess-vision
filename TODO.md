# TODO — the user's ideas, parked on purpose

> Ideas raised mid-work. Nothing here interrupts what is running; they get picked up between
> pieces of work. Newest first within a section. When one is done, move it out with a one-line
> result, not a tick — what it MEASURED is the point.

## Zwei Arme, zwei Latten — drei Annahmen im Classic-Motor, die nicht tragen (2026-09-03)

Aus dem Engine-Review (Claude + Codex, nur lesend). Die sechs klaren Logikfehler desselben Reviews
sind als `fix(engine)`-Commits mit roten Tests behoben; diese drei brauchen eine MESSUNG auf dem
Regressionssatz, bevor jemand etwas anfasst — Phantome disqualifizieren.

**7. `modelHandGate`-Ruheregel verlaesst sich auf den Rillen-Arm, der auf dem Handy AUS ist.**
`Taint.modelHandSquares` verwirft die Coverage-Flags nach `OBS_MAX_AGE_S` (3 s) ohne Bewegung, es
sei denn `gridHandSquares` bestaetigt sie — und `TrackerService` schaltet den Rillen-Arm bei jedem
Modell mit `coverage_output` ab (`runGridOcclusion = coverageOutput != true`). Eine ruhende Hand
laenger als 3 s ist auf dem Geraet fuer `handInFrame`, den Resting-Hand-Veto, das Recovery-Clean-Gate
und die Alarm-Verzoegerung unsichtbar. Der Filter existiert wegen `real14-80`s Phantom-Flags auf
ruhigem Brett (20260814-142947); jede Loesung muss das geschlossen halten.
Optionen (Codex): (a) *bevorzugt* — bewegungsqualifizierter Latch: Flags, die WAEHREND Bewegung
handfoermig waren, bleiben im Ruhezustand, solange DIESELBEN Felder weiter flaggen; keine neuen
Felder in der Ruhe, Freigabe wenn die Flags selbst gehen. (b) `gridArmActive` als Fakt am Snapshot —
"nicht gelaufen" darf nicht wie "gelaufen, nichts gesehen" aussehen; allein waere das aber die
Rueckkehr des 142947-Problems. (c) Rillen-Arm auf dem Handy nur in Ruhephasen und nur, wenn das
Modell noch Hand meldet — Kosten aus `docs/battery.md` messen. Messung: Ruhehand-Clips 3/10/30 s,
Ueberleben je Feld, falsche saubere Recovery-Votes; 142947 muss 0 Phantome bleiben.

**8. Window-End-Accept ohne Blind-Guard.** `VerifySingle.windowEnd` nimmt den Diff als
`diff_after_verify`, wenn `resyncCheck(nach dem Zug)` keine Konflikte hat — die Konfliktmenge kommt
nur aus SICHEREN Feldern, auf dunklem Brett also vakuum-leer; einzige Vorbedingung `toConf || fromConf`.
Sprosse 1 hat den `minConfidentBoard`-Guard, Sprosse 5 nicht. `VerifyPair.pairWindowEnd` ebenso:
`checked != 0L && preexisting` — ein sicheres beruehrtes Feld reicht.
Optionen: (a) *bevorzugt* — positive LOKALE Evidenz verlangen: `occN >= 2` aus `verifyMove` (beide
Endfelder lesbar) zusaetzlich zur Konfliktfreiheit, sonst HALTEN statt annehmen; fuer Paare die
volle beruehrte Maske statt "eins reicht". (b) `confidentCount >= minConfidentBoard` auch hier —
einfach, bestraft aber dunkle Ecken, die den Zug gar nicht betreffen. (c) Window-End nur noch
halten, Recovery/Periodik entscheidet — sicherste, aber die meisten verpassten Zuege im Dunkeln.
Messung: Emissionen nach `occN` 0/1/2 aufteilen, Phantome, spaetere Recovery-Latenz.

**9. Kleinere.** (i) `advanceDesyncStreak` zaehlt Teil-/Obermengen als stabil — der Staffellauf
`{a}→{a,b}→{b}→{b,c}→{c}` haelt die Serie, ohne dass ein Feld sie durchgehend traegt; schaerfere
Regel: laufender Kern `core = core ∩ conflicts`, leer = Neustart. (ii) `handTolerantCells`
(Experiment, Default 0, gemessen negativ laut `TrackerConfig`): `throughLocatedHand` verlaesst
`STATE_MOVE` nie — Knob und die drei Pfade loeschen, statt eine zweite Zustandsmaschine ohne
Abdeckung mitzuschleppen. (iii) `gridOccluded == 0` heisst "sauber", "abgeschaltet" und "diesen
Tick nicht gerechnet" zugleich; ein `HandEvidence(modelSquares, gridSquares, modelValid, gridValid)`
mit den abgeleiteten Praedikaten an EINER Stelle wuerde die vier Verbraucher auf eine Latte setzen.

**10. Die Baseline-Occlusion erreicht die Detektion nie (gemessen, Probe 2026-09-03).**
`FrameLoop.updateBaselineOcclusion` laeuft nur in MOVING/OCCLUDED und stempelt `OCCLUSION_KEEPALIVE_S`
= 0,1 s; die Detektion kommt fruehestens bei `holdUntil` = letzte Bewegung + `motionHoldS` (0,2 s).
Hand auf sechs Feldern, 30 fps: 16 dilatierte / 6 Kern-Felder sind 0,1 s live, bei JEDEM `Detect`
ist `motionOccluded = []`, `core = []`. Der Pixel-Arm der Verdeckung (Invariante 2, z nullen) und
das Kern-Tor (> 2 → OCCLUDED) sind unter Default-Timing tot; nur `restingHandVeto` (Modellkopf)
taintet. Der Keep-alive sollte laut eigenem Kommentar bis zum Ablauf des Holds bruecken — Fix waere
`expiry = max(nowS + 0,1, holdUntil + ein Frame)`. Das macht den Arm ERSTMALS scharf und kann
Zuege kosten (die Hand-Schleppe taintet das Zielfeld fuer `occluderHoldS`): Regressionssatz A/B.
**Probiert 2026-09-04 (Detektor laeuft auch waehrend des Settle-Fensters, Test rot -> gruen):**
`ClipReplayParityTest` weicht auf 7 von 18 Clips ab, `blender-capture` verliert `d5` und `exd5` —
ohne CNN haelt die ">2 Felder = Hand"-Heuristik einen Schlag fuer Verdeckung und nullt sein z.
Zurueckgenommen. Wer den Arm scharf macht, braucht zuerst einen Occlusion-Filter, der bewegte
Figuren von Haenden trennt (mit CNN: `cnnOcclusionFilter`, aber die Beobachtung darf 3 s alt sein).

**11. CNN-Seite, erst messen.** (a) `identityRead` bricht bei `inconclusive` (< 32 label-sichere
Felder) ab, bevor die Belegungsachse gefragt wird — im Dunkeln gibt es damit weder Match noch
Recovery, obwohl `deriveMovesDeep` ab `minConfidentRecovery` = 8 Feldern arbeiten koennte.
*Gemessen 2026-09-04* (Fallback auf die Belegungsachse, wenn >= `minConfidentBoard` Felder
belegungssicher sind): auf allen zehn Aufnahmen zeilengleich — kein Nachweis, nicht eingebaut. Der
Fall braucht eine Aufnahme aus dem dunklen Buero (2026-08-29), die es im Satz nicht gibt.
(b) `pOcc = 1 − pEmpty − pOccluded` behandelt die unabhaengige Coverage-Spalte wie eine
Softmax-Klasse; bei Coverage 0,14 (unter dem 0,15-Tor) faellt ein sicher besetztes Feld auf 0,81
und aus jedem Nenner. (c) `guessIllegalMove`/`hasOccupancyConflict` gaten mit `labelConfident`,
obwohl das Praedikat Belegung ist — ein Ziel mit pOcc 0,99, verteilt auf mehrere Figuren, ist kein
Ziel, und der Alarm verliert seine Zug-Form. (d) `cnnAdoptedFen` verlangt `needsMoves` — eine
Mattstellung ist per CNN nicht adoptierbar, per `setFen` schon. (e) Das Dunkel-Tor liegt doppelt
in `FramePipeline` und `FrameLoop`; der Engine-Zweig ist produktiv unerreichbar (nur Replay/Clips).

## ERLEDIGT: der Replay folgt der Handy-Messung (2026-08-30)

Ecken, Frame-Auswahl und Startstellung kommen aus der Aufnahme selbst (`baa0167c`), die
Zeitleiste traegt den Vorlauf, den das Video schon hatte (`626acb60`). Er erfindet nichts mehr —
vorher committete er `Nf3 d5` statt `d4 d5` — und trifft die Live-Zuege. Dass er nicht jeden
Lauf bis zum Ende nachfaehrt, wird NICHT weiterverfolgt: als Werkzeug reicht er.

Der urspruengliche Befund, zur Herkunft:

## Der Replay sah mehr Frames als das Telefon — und entschied deshalb anders (2026-08-30)

Gefordert: *"replay sollte sich verhalten wie das live spiel"*. Tut er nicht. Dieselbe Aufnahme,
live acht Halbzuege, im Replay vier und dann `no_legal_move`. Ausgeschlossen wurden nacheinander
`config=` (die Session bringt ihre eigene mit), `fps=` (die Bildraten-Emulation) und der Quad
(seitdem liest der Replay die Ecken der Aufnahme, 6f09f5ac). Keiner davon war es.

Die `timeline.jsonl` der Aufnahme zeigt, was live wirklich geschah:

```
seq=  0  ply=2  best= 20.24  changed=8   committet (e4 e5)
seq=199  ply=2  best= -2.05  changed=0   STUCK cnn_desync
seq=204  ply=2  best= -1.71  changed=1   STUCK no_legal_move
seq=209  ply=2  best= -1.84  changed=0   STUCK cnn_desync
seq=214  ply=3               changed=0   position was LOST - rebuilt by the CNN
```

**Live war der Frame-Diff blind** — `changed=0`, obwohl `d4` und `d5` gespielt waren. Die
Position lief auseinander und das CNN holte sie ueber `cnn_recovery` ein, mit der richtigen
Folge. Der Replay dagegen SIEHT dort etwas, committet `Nf3 d5` statt `d4 d5`, geraet nie in
den Verlust-Zustand und damit nie in die Recovery, die live die Rettung war.

Der Replay sieht also **mehr** als das Telefon. `fps=<n>` nimmt jeden k-ten dekodierten Frame
und trifft damit statistisch die richtige Anzahl, aber nicht dieselben Bilder, die CameraX live
durchgelassen hat — und der Diff haengt daran, WELCHE zwei Bilder er vergleicht.

**Die Aufnahme traegt die Loesung schon:** 377 `frame`-Eintraege in `timeline.jsonl`, jeder mit
`sensorTsNs`, `wallTsMs`, `fen`, `state` und `corners`. Das sind exakt die Frames, die die Engine
live verarbeitet hat. Eine Frame-Quelle, die dieser Liste folgt statt zu dezimieren, macht den
Replay deterministisch gleich — und `video_sync` (379 Eintraege, mit `durationNs` und `bytes`)
haelt die Zuordnung Video-Zeit zu Engine-Zeit.

Bis dahin gilt: **ein Replay ist keine Reproduktion.** Wer einen Live-Fehler nachstellen will,
kann sich auf ihn nicht verlassen, und das ist genau der Fall, in dem man ihn am meisten braucht.

## Der Verifier bleibt haengen — zwei von drei Fragen sind zu (2026-08-30)

Gemeldet: *"manchmal ist der verifier stuck, da werden lila felder nicht aufgeloest"*. Der ganze
Befund samt Zahlen steht jetzt in `docs/verifier-stall.md`; hier nur das Ergebnis.

**1. `verifyOutcome` leer: kein Fehler des Verifiers.** `pending` entsteht nur in
`Dispatch.dispatch`, also erst nach einem Kandidaten — und bei 13 bis 17 geaenderten Feldern
entsteht keiner (`maxChanged` = 6). Die Leiter wurde nie gefragt. Was das beantwortet, stand schon
in derselben Zeile: `cnnSnaps=.../<zur Leiter>/...`. Behoben wurde nur die Zweideutigkeit:
`applyVerdict` loeschte `pending`, BEVOR die Zeile geschrieben wurde, also trug ausgerechnet die
Zeile der Leiter `verify=` leer wie die 204 ohne Kandidat. `EngineState.verdictOutcome` traegt den
Spruch jetzt eine Zeile weit — leer heisst danach nur noch "nie geurteilt".

**2. Die Drift kostet jetzt die Pixel-Referenz.** `expireCorrection` mass die Korrektur nach und
liess die Referenz stehen; danach verglich jeder Frame gegen ein anders ausgerichtetes Bild.
`cornerJumpPx` = 6,0 px faengt das nicht: an `2026-08-30-14-33-02` gemessen ist eine Frame-Zelle
~126 px, die Schwelle also **4,8 % einer Zelle**, waehrend 0,26 Zellen Drift ~32 px sind. Der Refit
schickt jetzt `EngineAction.RectificationChanged`; der Latch bleibt dabei stehen (nicht
`captureBaseline`, Invariante 9).

**3. Offen: das Verfallsdatum gibt es, und es ist im Fehlerfall zu.** `maybePatchAnomaly` zieht
ein dauerhaft geaendertes Feld nach 5 s (besetzt) bzw. 30 s (leer) in die Referenz nach — ueber
314 s laengst faellig. Zwei Bedingungen halten es zu:

- `n <= maxChanged + 2` = 8, gemessen waren 13 bis 17. Die Decke heisst "resting-hand protection",
  und eine ruhende Hand ist genau das, was `motion` = 0,0 ueber 205 Entscheidungen mit immer
  denselben Feldern nicht ist.
- `cnnStatus == "mismatch"` ist eine Sperre ohne Ablauf: gesetzt in `CnnTick.onMismatch`, geloescht
  nur bei `onMatchOk` oder einem Commit — im Stillstand kommt keines von beidem. Dieselbe Form
  wurde bei `desyncObs` schon gefunden und mit `clearDesyncStreak()` geschlossen.

Die Decke einfach zu lockern waere geraten: sie wurde gegen die Hand gebaut. Der ehrliche Weg ist,
das Hand-Kriterium an die Hand-Signale zu haengen, die es ohnehin gibt (`locatedHand`,
`gridHandSquares`, `motion`), statt an die blosse Anzahl — und das an einer Aufnahme zu messen.
Dafuer fehlt Material: in `2026-08-30-14-33-02` bewegten sich die Ecken ueber 377 Frames um
**exakt 0,0 px**, die Live-Ausrichtung lieferte 31 s lang keine neue Detektion. Wer den Fall
nachstellen will, braucht eine Aufnahme, in der der Refit wirklich feuert.

Verwandt und vermutlich derselbe Zustand unter drei Namen: `cnn_desync` rastet auf einem korrekten
Brett ein (oben), `STUCK occluded` mit verstreuten Feldern bei `motion=0` (weiter unten). Beide
haengen daran, dass `changed` nie 0 wird und `quietOutcome` deshalb nie laeuft.

## Was aus der Belichtungsarbeit offen blieb (2026-08-30, User)

`CameraLook.locked` ist ausgebaut. Was der Ausbau kostet: der Fokus kann wieder wandern, solange
niemand eine Distanz nennt — die Automatik wird nicht mehr festgehalten. Der `Manual`-Regler im
Fokus-Panel ist die Antwort darauf.

- **Ein Rauschmass in die Perf-Zeile.** Belegt ist, dass das Rohbild seit `1ee08beb` rund sechsmal
  weniger Verstaerkung sieht (ISO 404 auf 71). Ungemessen ist, ob das im ZELLMITTEL ankommt:
  `cellDeltas` mittelt ueber 92x92 Pixel und daempft unkorreliertes Rauschen um rund Faktor 92.
  Ohne diese Zahl bleibt der Gewinn Physik statt Wirkung.

## Modell- und Engine-Wechsel sollen ohne Neustart gehen (2026-08-30, User)

Die App sagt es heute selbst: *"Saved, waiting for a tracker restart: app settings — This build
cannot restart the tracker from here — close and reopen the app to apply."* Beim Umschalten auf
`p4a-80-clahe` musste die App per `am force-stop` neu gestartet werden.

Die Maschinerie dafuer steht schon: `StackSwitch` kann den Stack tauschen, und die Reihenfolge
(**detach, close, build**) ist dort dokumentiert und begruendet. Was fehlt, ist der Weg von der
Einstellung zu diesem Tausch — `AppSettings.modelDir` und `engine` sind als restart-only gelesen
(`TrackerService`, Kommentar "a change restarts the stack, which is what `StackSwitch` exists
for"), aber die Stelle, die den Neustart ausloest, gibt es in diesem Build nicht.

Zu klaeren: was ein Wechsel mitten in einer Partie mit der Zughistorie macht. Ein neues Modell
liest dieselbe Stellung moeglicherweise anders, und die Pixel-Referenz ist danach ohnehin hin —
`CaptureBaseline` waere die naheliegende Antwort, dieselbe wie bei der Belichtungsverstellung.

## Belichtungsregelung und das CLAHE-Fenster arbeiten gegeneinander (2026-08-30, gemessen)

Das Fenster `--clahe-min-mean 25 --clahe-max-mean 40` ist auf den Zellmittelwert in 8 bit
definiert, und der haengt an der Belichtung. Ueber die sichtbaren Val-Zellen gerechnet
(`tmp/clahe_vs_ev.py`):

| EV | im Fenster | davon **besetzt** | Median | unter 25 |
|---:|---:|---:|---:|---:|
| ±0 (Korpus) | 15,6 % | **2 236** | 56,7 | 13,7 % |
| +0,70 | 14,1 % | 1 641 | 70,7 | 6,5 % |
| **+1,70** | 11,4 % | **813** | 96,9 | **0,0 %** |
| +2,40 | 4,5 % | 308 | 120,8 | 0,0 % |

+1,70 EV ist der Wert, den `BoardExposureGovernor` live selbst gewaehlt hat
(`docs/board-exposure.md`). Dort fallen **64 % der besetzten Zellen aus dem Fenster**, und der
Anteil zu dunkler Zellen geht auf null.

Kein Widerspruch — es ist derselbe Gewinn auf dem besseren Weg: echtes Licht am Sensor statt
gestreckter Kontrast im Nachhinein. Aber zwei Dinge folgen:

- **Ein absolutes Graufenster ist die falsche Parametrisierung**, sobald die Belichtung geregelt
  wird. Es gehoert an ein Perzentil der Brettverteilung oder an den KONTRAST der Zelle statt an
  ihren Pegel.
- **Die CLAHE-Arme sind auf ungeregeltem Material trainiert.** Geht die Regelung live, sieht das
  Modell hellere Bretter als im Training — eine Train/Serve-Luecke, die niemand gemessen hat.

Ungeklaert bleibt ausserdem die AUFTEILUNG: das Geraet faehrt 30,0 ms bei ISO ~3190, obwohl
66,7 ms moeglich sind. Der manuelle Lauf zeigte dieselbe Helligkeit bei 28 % weniger Verstaerkung —
ueber die Belichtungskorrektur ist das nicht steuerbar.

## `cnn_desync` rastet auf einem KORREKTEN Brett ein (2026-08-29, live belegt)

Testpartie im dunklen Buero, `data/games/2026-08-29-abend/testpartie-2329.pgn`. Nach 11.Nxd4 haengt
der Tracker 25 Minuten in der Schleife

    ply=21 REJECT why=STUCK cnn_desync    changed=[]  cnnAgree=1.000
    ply=21 REJECT why=STUCK no_legal_move

Alle 64 Felder aus der Live-Ansicht gegen `r1b1kb1r/pp3ppp/2p5/3pP3/BP1Nn3/1PN5/2P2PPP/R1B1K2R b`
gelesen: **die Stellung stimmt exakt**, der zweifelhafte Commit 11.Nxd4 (`by=cnn_recovery`,
margin 0,13) eingeschlossen. Das Veto ist also falsch, und es blockiert dauerhaft den stillen
Re-Anchor (`TrackerEngine.quietOutcome`, Zweig `desync != null`).

Die UI meldet abwechselnd "Change on 1 squares" bis "8 squares, but no legal move fits" —
Rauschpegel, kein Zug. Und sie bietet keinen Ausweg: das Ueberlaufmenue hat Recalibrate,
Camera view, Tracking camera, Light, Share on Wi-Fi. Kein Resync, kein Baseline. Uebrig bleiben
"Take back move" (waere hier falsch gewesen) und "End game".

Zwei Dinge zu klaeren: WELCHES Feld das CNN anders liest (der Konflikt steht nur in `state.note`
und wird nirgends geloggt), und ob der Standoff-Bound `desyncStandoffObsN` hier ueberhaupt greift.

Dazu, aus derselben Partie: von 21 Halbzuegen kamen 4 ueber `cnn_recovery` ("position was LOST —
rebuilt by the CNN, not detected") und einer ueber `cnn_overrule`. Der Frame-Diff-Pfad traegt die
Partie nicht, das CNN traegt sie.

## ERLEDIGT, negativ: Flat-field auf Brettebene (2026-08-30)

Gebaut, 463 739 Crops geschnitten, zwei Datensaetze auf identischer Zeilenmenge gepackt, zwei Arme
zu 60 Epochen. Ergebnis: **klar schlechter.**

| Arm | best | letzte 10 | val-Fehler | Genauigkeit | macro |
|---|---:|---:|---:|---:|---:|
| ohne Flat-field | 0,9524 | 0,9227 | 648 | 0,9800 | 0,9399 |
| Flat-field | 0,9255 | 0,9026 | **1 020** | 0,9685 | 0,9026 |

57 % mehr Fehler. Und der Grund steht in den Helligkeitsbaendern: die Korrektur hat getan, was sie
versprach — "sehr dunkel" schrumpft von 1 307 auf **39** Zellen, "dunkel" waechst von 1 580 auf
2 644. Nur ist die Genauigkeit im Band "dunkel" dabei von 0,9544 auf **0,8211** gefallen, und die
Laeufer/Bauer-Verwechslung hat sich mehr als verdoppelt (119 auf 285 von 1 710).

**Die Lehre ist dieselbe wie beim CLAHE-Band:** eine Verstaerkung hebt das Rauschen mit. Wo kein
Signal ist, macht Nachbearbeitung keins — sie macht die Zelle nur heller und genauso mehrdeutig.
CLAHE traegt deshalb NUR im Fenster 25-40 und drueckt darunter; Flat-field legt seine Verstaerkung
ueber alles, auch ueber die dunkelste Ecke, und genau dort bricht es.

Was WIRKT, ist echtes Licht am Sensor: `docs/board-exposure.md`.

Code bleibt (`imgops.cell_illumination`, `slice --flat-field`), die Datensaetze
`real13-mix-v4-ff*` auch — wer die Idee wieder aufgreift, soll die Messung nicht zweimal machen.

## ERLEDIGT: der native Crop-Warp hatte das Hand-Gate blind gemacht (gemessen 2026-09-04)

Gemessen, wie unten gefordert: bei `p4a-80-clahe` (outW 80, Crop-Warp 576 px) flaggte
`gridOccludedSquares` auf ruhigem Rig-Brett 13 Felder (`grid=0x6080c00040024664`), jede Lesung
wurde als Hand gehalten, und die vier Rig-Aufnahmen des Regressionssatzes lieferten **0/25, 0/67,
0/15, 0/73**. Das Handy war nie betroffen (Arm bei Coverage-Modellen aus), der Desktop-Replay seit
2026-08-29 durchgehend — jede Replay-Zahl der Rig-Aufnahmen aus dieser Zeit ist damit ungueltig.
Fix `a37e95fa`: der Sensor liest einen eigenen Warp in Kalibriergroesse, die Crops bleiben nativ.
Danach Rillen-Arm AN = Rillen-Arm AUS auf allen zehn Aufnahmen (25/0/0, 67/0/0, 15/0/3, 66/7/171,
19/2/2, 8/2/1, 3/0/0, 27/1/6, 35/0/0, 117/0/0; die 171 liegen bis auf 7 hinter dem Referenzende).
Offen bleibt die Frage von damals nur noch fuer die Figurenachse.

## Engine-Review 2026-09-03/04: was der Regressionssatz zu den 18 Fixes sagt

Basis `37e6fc77` gegen `bf56d611`, beide mit `set:gridHandGate=false` (= Handy-Semantik, weil der
Desktop-Sensor bis `a37e95fa` blind war): **zeilengleich auf allen zehn Aufnahmen**, null neue
Phantome. Dazwischen lag ein echter Rueckschritt, den erst der Replay zeigte: `210ffccc`
(Recovery -> `STATE_WAITING`) deckte auf `2026-08-08-00-39-57` einen Phantom-Promotion-Prompt auf
(Restrauschen nach der Recovery, seq 6436), der `promoPending` setzt und damit jede Detektion
blockiert — im Replay antwortet niemand, 67/0/0 -> 45/22/0. Der Prompt zieht sich seit `bf56d611`
zurueck, wenn das CNN das Zielfeld zweimal sicher leer liest; der Kanal `chesslabNote` macht
solche Stillstaende sichtbar (Notiz-/Stuck-Wechsel als Zeile, `adb logcat -s chesslabNote`).

## Der native Crop-Warp verkleinert auch das Hand-Gate (2026-08-29, ungemessen) — Original

`BoardGeometry.forNativeCrops()` zieht den bordierten Crop-Warp von der kalibrierten `boardSize`
(real 1008-1248) auf die aus dem Modell abgeleitete: **576 bei `outW` 80**, 928 bei 128. Gemessen
ist der Nutzen auf der Figurenachse (nativ 0,9120 gegen 0,9095 heruntergerechnet, 18 282 Zellen).

**Nicht gemessen ist die Nebenwirkung.** `gridOccludedSquares` liest DENSELBEN Warp
(`CnnCropAdapter.kt`), und `gridSegments(gray, geom.boardSize, ...)` skaliert seine Suchfenster
zwar mit, aber die Rillenlinien haben bei 576 nur noch gut die Haelfte der Pixel. Das ist der
modellfreie Arm hinter dem 67/67-Meilenstein — der, der Fabrikationen verhindert.

**Zu messen, bevor das aufs Geraet geht:** den Regressionssatz zweimal replayen, einmal mit
kalibrierter und einmal mit nativer Crop-Groesse, und `gridOccluded` je Ply vergleichen. Ein
Gate, das seltener anschlaegt, kauft Genauigkeit mit Phantomen — der schlechteste Tausch, den
dieses Projekt kennt.

## CLAHE verstaerkt das Rauschen, das der Blur danach wieder wegnimmt (2026-08-29)

`GrayPipeline.toGray` ist `cvtColor -> [CLAHE] -> GaussianBlur(5,5)`. Der Blur laeuft
**unbedingt**, auch bei `claheClip = 0` — er gehoert also nicht zu CLAHE, sondern zum Verbraucher:
`FrameLoop.kt:146` zaehlt ueber `motionScore` Pixel mit Differenz ueber `motionPxThr = 20`, und
Sensorrauschen erzeugt genau solche. Nur hebt CLAHE denselben Rauschboden vorher an — im Projekt
belegt (`FrameLoop.kt:105`: „CLAHE amplifies near-black sensor noise"), weshalb das
Dunkelframe-Gate VOR CLAHE misst.

Signaltechnisch waere **erst glaetten, dann verstaerken** besser: man verstaerkt das Rauschen gar
nicht erst. Die heutige Reihenfolge ist aus `tracker.py:1008 _gray` portiert und mit
Vergleichbarkeit begruendet („reference and current must be enhanced identically"), was beide
Reihenfolgen erfuellen.

**Zu messen, bevor jemand tauscht:** `motionPxThr = 20` und `motionThr` sind an der HEUTIGEN Kette
kalibriert, inklusive der `motionThr x 30 / fps`-Kopplung. Ein Tausch verschiebt den Rauschboden im
Differenzbild und entwertet beide Schwellen. Also: Rauschboden vorher/nachher auf dem
Regressionssatz messen (`scripts/motion_stats.py`, `motiondump=`), dann erst entscheiden — und die
Schwellen im selben Zug neu bestimmen, nicht danach.

Nebenbefund derselben Untersuchung: genau dieser Blur macht `grayDet` fuer die CNN-Spur unbrauchbar
— `median3`, eine aehnliche Glaettung, kippte alle drei hellen Testzellen von `wB` auf `wP`.

## ERLEDIGT: der Abtausch auf einem Feld ist jetzt EIN Kandidat (2026-08-30)

`loglikSequenceScores` sucht bis drei Halbzuege, jenseits von zwei aber nur den Abtausch auf
DEMSELBEN Zielfeld — frei gesucht erfand die dritte Ebene ein `Rg1` statt `Bc4 Bc5 O-O` und
brach die Paritaet. Live bestaetigt: schnelles Vor und Zurueck laeuft. Was der Diff NICHT kann,
steht unten: `f3e5 c6e5 d4e5` und `f3e5 c6d4` beruehren dieselben vier Felder und scoren gleich —
diese Wahl trifft das Modell in `pairColourConflicts`, und das ist die richtige Zustaendigkeit.

Der urspruengliche Befund von 2026-08-26, zur Herkunft:

## Ein Doppelschlag aufs selbe Feld faellt fast immer durch die Ambiguitaetsschwelle (2026-08-26)

Live beobachtet, Damentausch auf d4 (`tmp/live/session.log`, ply 11/12): der Paar-Kandidat
`d1d4 + d8d4` scort 17,60 gegen 17,33 des besten Rivalen — Margin **0,27** bei geforderten
`ambiguityMarginLl = 2,0`. Zweimal "QUIET ambiguous", dann committet der Motor die Haelften
einzeln, die zweite ueber den Legalitaets-Prior.

Der Grund steht im Code (`Scoring.kt:104`): teilen sich beide Haelften ein Zielfeld, zaehlt es in
`unionSum` **einmal**. Ein Doppelschlag beruehrt damit drei Felder (d1, d8, d4), sein Rivale — der
Einzelzug `d8d4` — zwei davon. Der Vorsprung schrumpft auf EIN Feld, waehrend ein gewoehnliches
Paar vier verschiedene Felder beruehrt und den doppelten Abstand hat. Die Schwelle ist fuer den
Normalfall gesetzt und trifft den Sonderfall mit voller Haerte.

Kein Datenverlust: die Zuege kamen einzeln durch. Aber es ist Reibung genau dort, wo Blitz sie
haeuft, und der Prior entscheidet statt des Bildes. **Zu messen, bevor jemand die Schwelle
anfasst:** ob eine Ausnahme fuer Paare mit geteiltem Zielfeld (z. B. Margin gegen die Zahl der
UNTERSCHIEDLICHEN Felder normiert) Phantome kostet — `ambiguityMarginLl` ist die Konstante, die
`docs/how-we-got-here.md` als teuerste im Motor fuehrt.

## Der Replay hat das Coverage-Gate des Modells nie angewandt (gefunden 2026-08-25)

`:app` setzt es beim Attach (`withCoverageGateOf`, `TrackerService.kt:679`), der Desktop nicht —
also lief **jede Replay-Messung dieses Projekts** mit dem Default `pOccludedThr = 0,5`, waehrend
das Geraet die 0,15 des Modells faehrt. Ein Feld, das zwischen den beiden verdeckt ist, zaehlte im
Replay als Zeuge und auf dem Telefon nicht. Behoben; `docs/occlusion-gate.md` sagt seit der Messung,
dass die Schwelle mit dem Modell reist.

**Die Diff-Engine ist davon unberuehrt** — voller Regressionssatz vorher/nachher zeilengleich. Was
sie aus der Coverage liest, liegt offenbar nie zwischen den beiden Schwellen. Fuer die
Stillstands-Engine, die jedes Feld ueber dem Gate aus der Evidenz nimmt, ist es dagegen der
Unterschied zwischen 7 und 67 Plies auf `2026-08-08-00-39-57`.

**Und es ist kein einseitiger Gewinn.** Auf `VID_20260824_154327` kostet dasselbe korrekte Gate:
101/16/0 mit 0,5, aber 66/51/0 mit 0,15 — beide ohne Phantome. Das strengere Gate verwirft mehr
Felder als verdeckt und damit auch Evidenz. Die 0,15 stammen aus einer Messung an anderem Material
(loss ratio 2 gegen die SAM-Matten); ob sie fuer diese Kamera stimmen, ist eine eigene Frage.

## Pull ist gebaut — und war NICHT die Ursache von `00-39-57` (gemessen 2026-08-25)

`EngineOps.wantsCnnRead()` ist die Bedarfsfrage, die der Naht fehlte: der Observer stellt sie einmal
je Frame vor seinen eigenen Toren (`CnnObserver.wantsFrame`), Default `true` — womit sich fuer die
Diff-Engine nichts aendert, die ohnehin jede Lesung nimmt und hinterher aussortiert. Die
Stillstands-Engine antwortet nur mit ja, wenn das Brett ruht UND sich seit dem letzten verstandenen
Bild etwas geaendert hat UND seither eine Hand darueber war.

**Was es spart, gemessen:**

| Aufnahme | Lesungen Push | Lesungen Pull |
|---|---:|---:|
| `2026-08-08-11-55-19` | 972 | **210** |
| `VID_20260824_153751` | 1 783 | **92** |
| `VID_20260824_154327` | 6 238 | **891** |
| `2026-08-08-00-39-57` | 5 069 | — |

Ergebnis unveraendert oder besser: 15/0/0, 35/0/0 — und `154327` gegen die volle 117-Ply-PGN
**101/16/0**, gegen 81/36/0 unter Push und 10/107/0 mit der Diff-Engine. Null Phantome.

**Die Hypothese zu `00-39-57` war widerlegt und ist inzwischen geloest.** Nicht die Taktung: mit
Pull stand dasselbe 7/60/2. Es waren zwei andere Dinge, beide gemessen: das Bild (`bgrDet` ist
schon ein Resample, 1920 -> 464 -> 160 glaettet zweimal) brachte 7 -> 24, und das fehlende
Modell-Gate den Rest, 24 -> **67/0/0 bei 192 Lesungen**. Der Agent hatte in der Arena 67/0/0 bei
178 — die Zahlen decken sich, weil er dort immer beides richtig hatte.

**Neu daneben:** mit Pull faellt `11-59-12` auf 66/7/97 (Push: 52/21/0) — mehr gefunden, aber die
Skip-Kaskade des Agenten tritt auf (er hatte dort 66/7/171). Das ist derselbe Mittelspiel-Knoten,
kein neues Verhalten, aber unter dieser Wertung sind 97 Phantome 97 Phantome.

## Der Alarm rastet auf IDENTITAET ein, obwohl er das nicht darf (gemessen 2026-08-25)

`VID_20260824_154327`: der Tracker committet zehn Plies, dann `ALARM latched on
a1,g1,h1,d4,f4,g4,c5,g5,a8,f8` — und danach nichts mehr, 107 Plies und 11 000 Frames lang, weil
der Latch nur ein Mensch loest und im Replay keiner da ist. Die zehn genannten Felder, gegen die
Stellung nach Ply 10 gemessen (`tmp/arena/alarm-154327.jsonl`, Frame 1000, Coverage-Gate 0,15):

| Feld | erwartet | gelesen | Konfidenz | Art |
|---|---|---|---|---|
| a1 | wR | wP | 0,93 | Identitaet |
| g1 | wN | wR | 0,94 | Identitaet |
| h1 | wR | wB | 0,99 | Identitaet |
| f4 | wB | wP | 0,95 | Identitaet |
| a8 | bR | bN | 0,96 | Identitaet |
| f8 | bB | bN | 0,75 | Identitaet |
| d4, g4, c5, g5 | — | korrekt | — | kein Konflikt |

**Null Belegungs- oder Farbfehler auf diesen Feldern, alle unverdeckt.**

**Korrektur (nachgemessen, gegen die erste Lesart dieses Eintrags):** der Latch ist trotzdem NICHT
falsch gefallen. `hasOccupancyConflict` (`Resync.kt:37`, das Alarmtor) prueft die Belegungsachse
und ist damit genau die Regel, die es sein soll — nur zaehlt es ueber die ganze Konfliktliste, und
die enthielt neben den sechs Identitaetsfeldern auch `g4`, `g5` und `c5`. Dort war der Widerspruch
echt: `g4->empty@1,00`, `g5->wP@1,00`, `c5->empty@1,00` ab Frame 1100. Das sind **die naechsten
Zuege** (g4-g5, cxd4), die der Tracker nicht erkannt hat.

Die Kette ist also: Identitaet kippt → `deriveMovesDeep` sucht auf der Identitaetsachse und findet
die Zuege nicht → das Brett laeuft weg → jetzt widerspricht die BELEGUNG wirklich → Alarm, zu
Recht. **Der Latch ist die Folge, nicht der Fehler.** Repariert wird die Suche, nicht das Tor.

Was NICHT hilft: `cnnMarginSquares` hochziehen. Mit der Farbachse und Margin 2 faellt derselbe
Lauf von 50/1/9 auf 7/44/0 — dieselbe Beobachtung wie bei `plyCostSquares` ("at 2 recovery commits
nothing at all").

Zusammenhang: dieselbe Ursache, aus der `cnnColorAxis` denselben Lauf von 10/107/0 auf 54/63/5
hebt und der Stillstands-Arm auf 81/36/0 kommt — der bepreist Identitaet von vornherein nur mit
0,4 und hat gar keinen Identitaets-Alarm.

## Die zweite Engine laeuft — was als Naechstes zu messen ist (2026-08-25)

`engine=stillness` gegen `classic`, voller Regressionssatz, `real13-ms-s3-hn4-bn80`:

| Aufnahme | classic | stillness |
|---|---|---|
| `2026-08-08-11-55-19` | 15/0/0 | 15/0/0 |
| `2026-08-07-13-52-38` | 25/0/0 | 25/0/0 |
| `2026-08-08-11-59-12` | 52/21/0 | 52/21/0 |
| `VID_20260727_233929` | 7/3/0 | 7/3/0 |
| `VID_20260802_222203` | 3/0/0 | 3/0/0 (+14 hinter der Referenz) |
| `VID_20260802_222741` | 27/1/**6** | 27/1/**1** |
| `VID_20260824_153751` | 9/26/0 | **35/0/0** |
| `VID_20260824_154327` (gegen die 117-Ply-PGN) | 10/107/0 | **81/36/0** |
| `VID_20260726_233432` | 21/0/0 | 19/2/2 (Referenz falsch geordnet, siehe unten) |
| `2026-08-08-00-39-57` | **67/0/0** | 7/60/2 |

- **`00-39-57` ist der eine echte Rueckschritt und der naechste Messpunkt.** Derselbe Code holt in
  der Arena dort 67/0/0 bei 178 Lesungen. Zwei Unterschiede kommen infrage, und sie sind trennbar:
  die Lesungen kommen GESCHOBEN statt gezogen (Stufe 2 des Umbaus), und das Bild ist der
  Detection-Warp bei `detSize` statt des vollen Bretts. Erst den zweiten pruefen — er ist billiger.
- **Die Lesezahl ist unter PUSH nicht messbar.** `observerIntervalS = 0.0` heisst: der Observer
  liest, so schnell die Inferenz fertig wird. Was diese Engine an Strom spart, zeigt sich erst,
  wenn sie selbst zieht.
- **Zwei Zeilen sind Referenzartefakte, kein Verhalten.** `222203` hat drei Referenz-Plies und der
  Lauf spielt weiter (der Desktop-Scorer kennt kein `beyond`, der Arena-Scorer schon); `233432`
  traegt eine geratene Zugreihenfolge.

## Aus dem Arena-Experiment (2026-08-25)

- **`cnnColorAxis` ist gebaut und gemessen — die Margin fehlt noch.** Der Knob schaltet den
  Suchkanal in `DeepSearch` von der exakten Figurenklasse auf Belegung+Farbe (`wR` und `wN` fallen
  auf `w` zusammen). Voller Regressionssatz, `model=real13-ms-s3-hn4-bn80`:

  | Aufnahme | aus | an |
  |---|---|---|
  | sechs Rig-Aufnahmen | unveraendert | unveraendert |
  | `VID_20260824_153751` | 9/26/0 | **35/0/0**, Alarm weg |
  | `VID_20260824_154327` (gegen die 117-Ply-PGN) | 10/107/0 | 54/63/**5** |

  Also: kein Schaden, wo Identitaet nie das Problem war, und ein Faktor 5 dort, wo sie kollabiert
  — aber auf 154327 kauft es 44 Plies fuer 5 Phantome. **Naechster Schritt:** eine groebere Achse
  macht Hypothesen aehnlicher, also `cnnMarginSquares` (heute 1) mitziehen und beides zusammen
  messen. Vorher NICHT scharfschalten — Phantome disqualifizieren.

Der Fable-Agent hat einen Tracker von Null gebaut (`docs/agent-briefs/tracker-from-scratch.md`,
Arbeitsbaum `../chess-vision-arena`). Was er gefunden hat, ist nachgeprueft; was er BRAUCHT, steht
hier als Arbeit an uns. Reihenfolge nach gemessenem Ertrag.

- **Der Bildvergleich taugt NICHT als Hand-Signal — gemessen, nicht vermutet** (2026-08-25, nach
  Freigabe unseres Trackers an den Arena-Agenten). Er hat unsere beste Idee nachgebaut:
  Per-Zell-Nivellierung gegen den Schatten (`docs/position-check.md`) plus Census-Transform gegen
  die Helligkeit, an drei bekannten Knoten bei 160 px und 320 px vermessen. Ergebnis:
  (a) ein Arm auf dem Brett saettigt Census ueber 25+ Zellen — **ein Arm IST Struktur**, und
  helligkeitsinvariant hilft dagegen nicht; (b) der entscheidende Zug `e7e5` auf `233432`
  erscheint in KEINEM sauberen Zwischenbild, bei keiner Aufloesung: er fiel vollstaendig unter die
  Hand; (c) auf dem `233929`-Tail widerspricht das einzige lesbare Signal der Referenz und ist
  unverifizierbar. Seine Sonde (`GapProbe`, log-only) bleibt als Instrument, entscheidet aber
  nichts.
  **Was das heisst:** Wer ein Hand-Signal sucht, soll es nicht aus Frame-Differenzen bauen. Die
  verbliebene Option ist die Coverage-Spalte des Modells — sie ist aus Pixeln GELERNT, nicht aus
  Differenzen gerechnet, und damit die einzige Quelle, die von diesem Negativergebnis nicht
  getroffen ist. Und: wo ein Zug vollstaendig unter der Hand liegt, gibt es kein Zwischenbild,
  das irgendein Verfahren finden koennte — dort ist die Reihenfolge prinzipiell unbeweisbar und
  gehoert in die Wertung (siehe `reordered` im Arena-Scorer), nicht in ein besseres Veto.

- **Ein Hand-Signal je Feld, das Hand von Schatten trennt** (sein groesster Engpass, und unserer).
  Seine verbleibenden Fehler sind Ordnungsknoten: bei identischer Endstellung sind „3 Zuege" und
  „2 Zuege" aus Standbildern nicht unterscheidbar (11-59-12 Ply 48). Die Zwischen-Standbilder
  traegen die Antwort, aber sein Bild-Veto starb an Schatten und Warp-Jitter (~10 Graustufen
  Rauschen), waehrend echte dunkle Zuege darunter liegen. Wir haben den Kanal bereits: die
  Coverage-Spalte der 13+1-Modelle. **Zu tun:** `FrameView` gibt Coverage je Feld heraus (steht
  schon in Spalte 13, wird aber nirgends als eigenes Signal angeboten) — **erledigt 2026-08-25,
  `frame.coverage()` und `frame.covered()`**. Offen bleibt die Messung: leistet Coverage die
  Trennung, an der die Graustufen-Differenz nachweislich scheitert (siehe Eintrag darueber)? Das
  ist die eigentliche Frage, und sie ist noch unbeantwortet.

- **Warp-Glaettung: die Quad-Neumessung erzeugt das Rauschen, gegen das alle Schwellen kaempfen.**
  Die Arena misst den Quad alle 30 Frames neu; jede Messung verschiebt das entzerrte Brett um
  Pixel und hebt den Zellen-Rauschboden. Das zwingt Bewegungs- und Aenderungsschwellen hoch und
  hat sein Ordnungs-Veto unbrauchbar gemacht. **Zu tun:** Median ueber die letzten N Quads statt
  der letzten Messung — in der Arena UND im Tracker, dort heisst es `alignEvery`/LiveAlign.
  Danach die Schwellen neu messen, nicht vorher.

- **Ein zweites Modell als Schiedsrichter, aber nur im Streitfall.** Bei persistentem
  Identitaets-Konflikt eine Zweitlesung mit `comp13`/`real13-s2` holen (~5-10 Extra-Lesungen je
  Partie). Die Arena zaehlt Lesungen bereits je Modell, das Werkzeug ist also da. Offene Frage:
  ob die Familien unabhaengig genug irren — sonst kauft die zweite Stimme nichts
  (`docs/emission-correlation.md`).

- **Aufnahmen mit Auslauf.** `VID_20260727_233929` verliert seine letzten vier Zuege, weil das
  Video rund drei Sekunden nach dem letzten Zug schneidet und nie ein lesbares Ruhefenster kommt.
  Beide Tracker verlieren sie. **Zwei Sekunden Stillstand am Ende jeder Aufnahme sind gratis
  Recall** — gehoert in die Aufnahmeanweisung, nicht in den Code.

- **Referenzen mit geratener Zugreihenfolge korrigieren.** 51 von 606 Referenz-Plies (8 %) liegen
  in Buendeln, also mehrere Zuege auf demselben Frame — der alte Tracker hat dort einen Rueckstand
  in geratener Ordnung committet. Auf `VID_20260726_233432` ist die Ordnung nachweislich falsch
  (`Nf3+e5@335`, waehrend die Bilder e4@240, e5@280, Nf3@360 zeigen — Dump in
  `tmp/arena/order-233432.jsonl`); auf `VID_20260802_222741` steht ein Endzug `Nxf3+@7425`, den
  das Video nicht zeigt, und die Partie laeuft dort bis Frame 9468 mit einer kohaerenten
  Mattsequenz weiter. Solange das so steht, misst die Latte gegen falsche Labels und ein besserer
  Tracker sieht schlechter aus. **Zu tun:** die acht Aufnahmen mit Buendeln durchsehen, Ordnung
  aus den Bildern bestaetigen, `reference.pgn` von Hand nachziehen.

- **Arena: Ordnungs-Aequivalenz auch im Scorer.** Wo zwei Zugfolgen dieselbe Endstellung erreichen,
  ist die Reihenfolge aus Standbildern nicht beweisbar. Der LCS-Scorer bestraft die Abweichung
  trotzdem und zaehlt danach alles als Phantom (Skip-Kaskade: 171 „invented" auf 11-59-12, die
  fast vollstaendig hinter dem Referenz-Ende liegen). **Zu tun:** Umordnungen mit identischer
  Endstellung als Treffer werten, und die `beyond`-Regel auch dann greifen lassen, wenn davor ein
  solcher Knoten liegt.

## Next up (agreed, not started)

- **Auf 4K-Aufnahmen kippt die IDENTITAET, nicht die Belegung** (gemessen 2026-08-25 auf der
  Grundstellung, also ohne jede Verdeckung; gefunden vom Arena-Agenten, unabhaengig nachgeprueft).
  `real13-ms-s3-hn4-bn80` auf vier Frames je Aufnahme, 256 Zellen:

  | Aufnahme | Zelle | Belegung+Farbe | Identitaet |
  |---|---:|---:|---:|
  | `2026-08-08-11-55-19` (Rig 928) | 116 px | 1,000 | 1,000 |
  | `VID_20260824_153751` (4K 1280) | 160 px | 0,973 | 0,859 |
  | `VID_20260824_154327` (4K 1280) | 160 px | 0,969 | 0,812 |

  Verwechselt wird typisiert und farbtreu: `wR->wK`, `wN->wR`, `wB->wR`, `bK->bB`, `bP->bB`. Auf dem
  Rig-Material kein einziger Fehler. Das ist der Sampling-Shift aus `CLAUDE.md` 0.1 — trainiert auf
  116-px-Zellen, serviert mit 160.
  **Zwei Folgerungen, unabhaengig voneinander:**
  (1) *Daten/Training:* 4K gehoert in `--scales`, oder der 4K-Crop muss auf die trainierte
  Zellgroesse gebracht werden statt auf 80 px hochskaliert. Vorher messen, welcher der beiden Wege
  die Identitaet hebt.
  (2) *Engine:* Der Hypothesen-Score sollte Belegung und Farbe voll gewichten und die Identitaet
  schwach — ein Turm, der als Springer gelesen wird, darf einen sonst eindeutigen Zug nicht
  blockieren. Der Faktor folgt aus dem gemessenen Verhaeltnis der beiden Zuverlaessigkeiten, nicht
  aus einer Handkalibrierung. Erklaert vermutlich die Regression auf `154327` (10 von 117).

- **ERLEDIGT (2026-08-30): der Replay-Default ist jetzt `p4a-80-clahe`** (`8ae77814`), das
  `coverage_output` deklariert — der modellfreie Hand-Arm laeuft damit nicht mehr mit, und
  `real14-80` ist gar nicht mehr gebuendelt. Der Score nennt sein Modell seitdem in der
  Kopfzeile, denn derselbe Satz gab unter zwei Modellen 10 gegen 8 gefundene Halbzuege. Offen
  bleibt allein die Frage (2) unten: was `gridOccludedSquares` auf jenen Frames wirklich flaggte.
  Der urspruengliche Befund:

- **Der Replay-Default `real14-80` verriegelt den Tracker — jede Messung damit ist eine andere
  Messung** (gemessen 2026-08-25 beim Aufbau der Arena). `ReplayOptions.model` steht auf
  `DEFAULT_MODEL` = `real14-80`, das kein `coverage_output` deklariert, also laeuft der modellfreie
  Hand-Arm mit. Derselbe Aufruf, nur `model=real13-ms-s3-hn4-bn80` dazu:
  `2026-08-07-13-52-38` von **4/21/3 auf 25/0/0**, `2026-08-08-00-39-57` von **0/67/0 auf 67/0/0**
  (`tmp/arena/baseline/*.log` gegen `*.r13.log`). Bei `real14-80` haengt der Lauf dauerhaft in
  `STUCK occluded` mit ueber das ganze Brett verstreuten `occlVeto`-Feldern bei `motion=0` — also
  flaggt der Gitter-Sensor dort keine Hand, sondern etwas anderes.
  **Zu klaeren:** (1) Ist der Default noch richtig, wenn die gemessen bessere Wahl daneben liegt?
  (2) Was flaggt `gridOccludedSquares` auf diesen Frames wirklich — die Regel „nur handfoermige
  Flags" aus `CLAUDE.md` sollte genau das verhindern. (3) `docs/tracker-flow.md` nennt einen
  ungeklaerten Bruch auf 003957; mit dem 13+1-Modell loest dieselbe Aufnahme 67/67 auf.

- **`board_acc` misst `piece_acc` hoch 32 — und ignoriert die Verdeckung** (gemessen 2026-08-25,
  Frage des Users: *„warum ist die board accuracy so low, wird da occlusion nicht bedacht?"*).
  Zwei Ursachen, sehr ungleich gewichtet.
  **(a) Die Verdeckung fehlt.** `board_accuracy` (`training/data.py:67`) gruppiert ALLE Crops eines
  Frames, ohne Coverage-Filter. Ein Brett gilt nur als richtig, wenn auch jede verdeckte Zelle
  stimmt — und die sind aus dem Verlust maskiert, das Modell lernt sie nie. Im Val-Split von
  `real13-straight-80-v3` tragen **46 % der 1 020 Bretter mindestens eine verdeckte Zelle** (Median
  12, max 32), also ist `board_acc` konstruktionsbedingt auf **54 %** gedeckelt. Für die Belegung
  gibt es den sichtbar-Zwilling schon (`visible_occupied_board_acc` = 0,678), für die Identität
  **nicht** — `visible_board_acc` existiert nicht.
  **(b) Der Exponent, und der ist der eigentliche Grund.** Ein Brett hat rund 32 Figuren; bei
  `piece_acc` = 0,657 sind alle gleichzeitig richtig mit `0,657^32 = 1,5e-06`. Dass 1,9 %
  herauskommen, liegt nur an figurenarmen Endspielen und stark korrelierten Fehlern. Die
  Deckelung erklärt 54 statt 100 — sie erklärt nicht 1,9.
  **Vorschlag, in dieser Reihenfolge:** (1) `visible_board_acc` als Zwilling ergänzen, damit die
  Zahl wenigstens ehrlich ist (hebt sie kaum: Deckel weg, Exponent bleibt). (2) Eine Variante MIT
  TOLERANZ danebenstellen — „höchstens eine Zelle falsch" statt „alle richtig". Bei 0,657 je Figur
  ist „alles richtig" keine Metrik, sondern ein Lotterielos, und eine Größe, die fast immer 0 ist,
  kann keine Auswahl steuern. (3) Erst dann diskutieren, ob sie in `CHECKPOINT_WEIGHTS` gehört —
  heute steht dort aus gutem Grund `occupied_board_acc`, weil die Belegung sichtbar bei 99,4 %
  liegt und die 64 Zellen übersteht.
  **Achtung:** Trainingscode, also mit dem laufenden Agenten abstimmen.

- **`minGridLineCoverage` ist der Hebel, der `motionThr` entlasten koennte** — gefunden beim
  Strom-Auftrag (2026-08-25), nicht verfolgt, weil der User `motionThr` so lassen wollte.
  Der Motion-Score macht zwei Jobs: Puffer-Hygiene in `stableBranch` (welche Frames duerfen in
  das gemittelte Paar) und Scharfschalten des Commit-Gates. **Gemessen ist, dass die obere Wand
  am ERSTEN haengt**: bei `motionThr = 1.0` faellt `2026-08-08-00-39-57` von 67 auf 4 Plies, und
  mit `nomotion` — also ohne Commit-Gate — bleibt es bei 4. Die Hand wird dann in den Mittelwert
  gerechnet, statt die Puffer zu leeren.
  CNN-Occlusion kann das nicht uebernehmen (Frage des Users): sie kommt pro Beobachtung, darf
  `OBS_MAX_AGE_S = 3.0` s alt sein und beantwortet „ist da eine Hand" statt „ist dieser Frame
  kontaminiert". `occludedByGrid(input.gridLineCoverage)` macht denselben Job aber schon, pro
  Frame und im selben Pfad — es verwirft beide Puffer, wenn der Verdecker geht. Wer `motionThr`
  Luft verschaffen will, dreht dort. Zahlen: `docs/battery.md`.

- **Der Alarm feuert bei Bewegung zu schnell — Latch zu kurz, oder das Prinzip stimmt nicht**
  (User am Brett, 2026-08-25: *„bei bewegen wird zu schnell ein alarm getriggert"*). Steht NACH
  dem Handcheck vom Vortag, ist also nicht damit erledigt.
  **Erster Verdacht, und er zeigt auf eine eigene Aenderung:** `desyncObsN` = 3 ist im Code als
  *„persistent over seconds"* dokumentiert, ausdruecklich NICHT als „dreimal ausgewertet". Seit
  2026-08-24 macht `evaluationDue` einen angefangenen Desync aber im Beobachtungstakt voll
  (`desyncObs in 1 until desyncObsN`), damit Blitz mitkommt — drei Beobachtungen sind damit rund
  **300 ms** statt 2,1 s. Genau davor warnt der Kommentar an `advanceDesyncStreak`. Die
  Begruendung dafuer war die Korrelationsmessung (Warten kauft keine Unabhaengigkeit), und die
  gilt weiter; was sie NICHT sagt, ist dass die Dauer selbst egal waere — sie ist die Definition
  von „anhaltend".
  **Drei Hebel, in dieser Reihenfolge zu pruefen:**
  (1) Dauer und Anzahl TRENNEN — eine eigene Mindestdauer (`nowS - desyncSince`) neben
  `desyncObsN`, statt beides ueber das Produkt aus Anzahl und Cooldown zu erschlagen. Das ist der
  saubere Zuschnitt: schnelle Serie fuer Blitz, aber der Latch wartet trotzdem eine echte Sekunde.
  (2) `alarmDeferObs` von 0 hochdrehen — vorhanden, per Knob, kostet keinen Neubau. Schnellster
  Test, ob mehr Luft ueberhaupt hilft.
  (3) Den Handcheck nachmessen: `handInFrame()` traegt auf dem Geraet nur drei seiner vier
  Quellen, weil `runGridOcclusion = coverageOutput != true` den Rillen-Arm abschaltet. Wenn eine
  bewegte Hand vom Coverage-Kopf zu spaet erkannt wird, hilft kein Zeitfenster.
  **Die Grundsatzfrage des Users daneben:** ob ein LATCH ueberhaupt die richtige Form ist. Er
  haelt bis Undo oder Resync — bei einem Fehlalarm waehrend des Zugs ist das teuer, und die
  Alternative (eine Warnung, die von selbst verfaellt, wenn die Stellung wieder passt) ist nie
  gemessen worden. Vor Hebel (1) klaeren, sonst optimiert man die Schwelle einer Mechanik, die
  vielleicht die falsche ist.

- **Beide Occlusion-Arme gegeneinander messen** (offen seit Wochen, CLAUDE.md: *„never been
  measured against each other"*). Auf dem Gerät läuft heute NUR der Coverage-Kopf: sobald ein
  Modell `coverage_output` deklariert, schaltet `TrackerService` den Rillen-Arm ab
  (`runGridOcclusion = coverageOutput != true`) — und alle aktuellen Modelle deklarieren ihn. Der
  abgeschaltete Arm ist der mit dem 67/67-Meilenstein hinter sich, der laufende hat keine Messung.
  Der Desktop-Replay fährt beide, der A/B ist also machbar; er braucht nur, dass der Schalter ein
  Knob wird statt einer Zeile in `TrackerService`. Drei Arme: Modell / Rillen / beide.

- **Der `refusedStreak` ist im Korpus untestbar** (2026-08-24). Er öffnet das CNN-Tor nach drei
  identischen Ablehnungen und war die Antwort auf 70× `Kf1` in 9 Sekunden ohne eine einzige
  Auswertung. Im A/B über die zehn Recordings ändert er **nichts** — 304/90/7 in beiden Armen, bei
  identischen Read-Zahlen —, weil keine der Aufnahmen den Fall enthält: dort zieht niemand illegal
  im Schach. Also entweder eine Aufnahme davon machen, oder einen Clip bauen. Bis dahin steht eine
  Engine-Änderung ohne Beleg im Baum.

- **Rauschgrenze steht — jedes A/B braucht drei Seeds** (gemessen 2026-08-25, Zahlen und Methode
  in `docs/seed-noise-floor.md`). Der frühere Punkt „das Training ist nicht deterministisch" ist
  widerlegt: gleicher Seed liefert bit-identische Läufe. Was streut, ist der Seed — beim
  s2-Rezept `val_visible_acc` um 0,0097, `val_piece_acc` um 0,0247, `val_conf_auroc` um 0,0994.
  **Offen bleibt daraus:** (1) die berichteten Unterschiede zwischen s2/s3 (0,011) liegen im
  Rauschen, es gibt also derzeit keinen belegten „besten Stand" — wer einen will, fährt drei Seeds
  je Kandidat. (2) Die Rauschgrenze ist nur für **s2** gemessen; s3 und der Composite-Pfad haben
  ihre eigene und könnten enger sein. (3) `val_conf_auroc` ist als Entscheidungsgröße unbrauchbar,
  solange ihre Spanne so groß ist wie der Abstand, den man messen will.

- **Python und Kotlin stehen auf verschiedenen Klassenschemata** (gemessen 2026-08-20, nachgezogen
  nach dem Aufräumen). Das 2-Klassen-`occupancy` ist auf BEIDEN Seiten weg — `OCCUPANCY_CLASSES`,
  `to_occupancy_class`, `classesHaveIdentity` und die sechs Belegungsmodelle im APK sind gelöscht.
  Was bleibt, ist die Coverage-Lücke. Python ist seit 2026-08-18 auf 13 Klassen +
  Coverage-Regression: `dataset build` defaultet auf `pieces13`, `train` auf `--head occlusion`,
  das Modell gibt 13 Softmax-Logits plus EIN unabhängiges Sigmoid.
  **Der Export ist seit 2026-08-24 erledigt.** Das Handy bündelt vier Modelle: `real14-80`
  (Default, 14-Klassen-Softmax), `id35-80` (13 Klassen, `pOccluded = 0.0`) und drei mit
  `coverage_output` — `comp13-occ-bn-lr1e2-bs512`, `real13-ms-s3-hn4-bn80`,
  `real13-ms-s2-bn80-bs256-swa1e4`. `scripts/stage_model_asset.py` legt sie ab und ergänzt dabei
  `coverage_output` und `coverage_gate`, die `chesslab export` beide NICHT schreibt.
  **Offen ist nur noch Schritt (3):** der Replay-A/B gegen `real14-80`, mit der Veto-Metrik als
  Entscheider. Und: `BUNDLED_MODELS` ist handgepflegt — ein Modell allein im Asset-Ordner
  erscheint nie im Picker.
  **Die Bruchstelle ist der Export, nicht die Leseseite.** `ModelSpec.coverageOutput` und
  `observationFromProbs` lesen die Extraspalte längst, die Vertragstests dafür stehen
  (`OnnxSquareClassifierContractTest`) — sie feuern nur nie. Von den zehn Occlusion-Läufen ist
  nur `comp13-occ-bn-lr1e2-bs512` in `data/models/` geblieben (die neun anderen in
  `data/_delete/models/`, zusammengefasst in `docs/retired-runs.md`), und keiner ist als ONNX
  exportiert und gebündelt.
  **Reihenfolge:** (1) einen Occlusion-Lauf mit `chesslab export` ausgeben (schreibt
  `coverage_output: true` selbst, `evaluate.py:238`), (2) `model.onnx` + `config.json` unter
  `android/app/src/main/assets/cnn_model/<name>/` einhängen, (3) gegen `real14-80` per Replay
  A/B fahren — die Veto-Metrik entscheidet, nicht `val_acc`. Erst danach kann `modelHandGate` vom
  Softmax-Wert auf das kalibrierte Sigmoid umgestellt werden.
  **Hängt zusammen mit** „Das 14er-Modell ist bei `occluded` zu aggressiv" weiter unten: das ist
  genau die Klasse, die Python inzwischen abgeschafft hat. Ganze Chronik und Erkennungsregeln:
  `docs/class-scheme.md`.

- **Stored-Sessions loggen den unkorrigierten Marker-Quad** (gemessen 2026-08-15): `log.jsonl` der
  Android-Stored-Sessions trägt den rohen Marker-Quad, `packLabeledSession` und der Abnick-Viewer
  rechnen beide mit konstantem `DEFAULT_MARKER_MARGIN = 0.045` — real variiert das beste Margin pro
  Session (0,0375–0,050; Session 20260812-222357: bis 14 px ≙ 12 % einer Zelle Versatz, im Training
  wie im Labeln identisch; die übrigen gemessenen Sessions ±6–7 px — systemisch, nicht eine
  Ausreißer-Session). Fix ZWEISTUFIG (User 2026-08-15): (1) Android DARF den grid-korrigierten
  Quad loggen statt des Marker-Quads, ABER nur ohne Laufzeitkosten — `improveQuad` rechnet im
  Live-Tracking ohnehin, das Ergebnis wegschreiben ist gratis; neue Rechenarbeit im Recorder ist
  tabu („ändert aber nicht langsamer macht"). (2) Der PC kontrolliert und korrigiert TROTZDEM
  nochmal: Grid-Fit über die gespeicherten JPEGs an EINER geteilten Stelle, die
  `packLabeledSession` UND der Abnick-Viewer nutzen — deckt alle 28 Bestands-Sessions rückwirkend
  und bleibt das Netz für schiefe Gerät-Quads. Bis dahin Versatz pack-identisch sichtbar.
  **Folge-Sweep (User 2026-08-15, bestätigt auf der Platte):** die versetzten Crops sind im
  Training — `real14-all-80-v1` und `real13-all-80-v1` listen `phone-stored-*`-Sessions (6 Packs,
  ±6–7-px-Klasse), und `hard_empty.jsonl` trägt **637** `phone-*`-Zeilen (aus versetzten Crops
  gemined — eine „leere" Zelle kann Nachbarinhalt zeigen). Reihenfolge nach dem Grid-Fit-Fix:
  (1) die 6 phone-stored-Packs mit korrigiertem Quad neu packen, (2) die 637 hard_empty-Zeilen
  neu ableiten oder parken (nie löschen), (3) Dataset als NEUEN Snapshot bauen (real14-all-80-v2,
  Datasets sind Snapshots), (4) Retrain mit Veto-Metrik als Entscheider. Passt zeitlich zum
  ohnehin geplanten Low-Light-Retrain — ein Rebuild, beide Gründe.
  **Stand 2026-08-15 nachmittags — (1) und (2) sind ERLEDIGT, (3)/(4) sind die Zündschnur:**
  alle 27 Stored-Sessions gefittet (521 Frames, 0 failed, align_worst_px max 35→3,3), die 6 Packs
  als `phone-stored-<id>-80-v2` neu gepackt (packed_meta: quad_source=grid-fit, 100 %), die 637
  phone-Hard-Empties geparkt (`data/_parked/hard_empty-phone-marker-quads-20260815.jsonl`,
  Voll-Backup daneben; Neu-Mining braucht einen GPU-Eval-Lauf). Build (3): v1-Konfiguration aus
  `data/datasets/real14-all-80-v1/dataset.yaml` übernehmen, Name v2 — OFFEN: die v2-Packs tragen
  dieselben `phone-<id>`-session_ids wie die alten Packs; vor dem Build sicherstellen, dass der
  Resolver die `-80-v2`-Verzeichnisse zieht (alte Packs parken oder Quelle explizit angeben).

- **Sessions direkt in eine Memmap, mehrere Memmaps im Training** (User, 2026-08-16). Heute liegen
  82 GB Frame-PNGs und 6.4 GB Crop-PNGs auf der Platte, erzeugt aus 954 MB Video — Faktor 86. Der
  Cache spart dabei nichts: **gemessen 249 Frames/s beim Vorwärts-Dekodieren gegen 32 Frames/s beim
  Lesen der gecachten PNGs**, also achtmal langsamer als die Quelle. Wiederverwendet wird er 4–7 mal
  je Session (`log.jsonl.bak.*`), drei von 18 Sessions nie.
  **Ziel:** `session pack <id>` schreibt Video → Crops → `data/packs/<session>/` (Memmap + Manifest),
  mit demselben Gate wie der Slice. Der Loader liest MEHRERE Packs: `path2idx` wird `(pack, index)`,
  `PackedSquareDataset` hält eine Memmap je Pack, weiterhin lazy pro Worker (Windows-Spawn).
  `build_dataset` nimmt Packs statt eines Crop-Pools. Danach `slice` und die Frame-PNGs zurückbauen.
  **Gewinn:** ~98 GB → ~9.4 GB; eine neue Session ist eine neue Memmap statt eines Neupackens des
  ganzen Korpus (heute Minuten, mehrmals täglich); und die Kotlin-Packs (`labeled-video-pack`,
  `turntable-pack`) werden wieder nutzbar — heute verweigert `pack_dataset` ihre `mm://`-Zeilen,
  weshalb das Turntable-Material nicht in die Fold-Datensätze kam.
  **Preis, bewusst:** eine Memmap friert Crop-Größe, `pad_side` und Mesh ein. Wer daran dreht, muss
  zurück ans Video — das ist heute nicht anders, nur verdeckt.

- **Eine Seite statt neun Lanes, nach Wert sortiert** (User, 2026-08-16: *"prinzipiell eine
  Seite"*). Der Labeln-Strom zeigt nicht mehr Lanes zur Auswahl, sondern die nächste Frage —
  sortiert nach `wert = p_fehler × klassengewicht × neuheit`. `p_fehler` kommt aus dem Kreuztest
  (Out-of-Fold), `klassengewicht` steht fertig in `split.json` (`wK` 3.404 gegen `empty` 0.318),
  `neuheit` liefert `collapseEvents`. Jede Frage trägt sichtbar ihre Herkunft (Hand, Identität,
  Regelbruch, Audit), das FEN-Wort und die Modell-Lesart; Klasse und Schwelle bleiben als
  Verengung, sind aber nicht mehr der Weg zur Arbeit.
  **D1 wird aufgelöst, nicht umgangen:** die Einheit ist die FRAGE, nicht Brett oder Zelle — ein
  Brett mit vier verdächtigen Feldern sind vier Fragen. Ein Nenner für alles, Renderer bleibt frei.
  **Die Kontroll-Stichprobe darf nicht in die Sortierung:** jede n-te Frage wird gleichverteilt
  gezogen und ist als solche markiert. Ohne diesen eingewobenen Zufall gibt es keinen Weg zu
  Brodleys E2 („wie viel Schlechtes blieb drin"), und keine Genauigkeitszahl auf dem Korpus ist
  danach noch vergleichbar.
  Reihenfolge: Kreuztest fertig → Flags einmal von Hand ansehen, ob die Sortierung trägt → dann
  bauen. Trägt sie nicht, ist der Umbau gespart. Das CONCEPT steht nicht im Weg: seine Entscheidung
  „zwei Ströme" begründet sich mit unvereinbaren Modi von *Züge* gegen *Labeln*, nicht mit den
  Lanes innerhalb von Labeln.

- **Datensatz-Qualität per Zwei-Hälften-Kreuztest** (User, 2026-08-15: *"2 halbe Modelle die die
  andere Hälfte testen, dann die Flags nochmal nachlabeln"*). Korpus in zwei Session-Hälften
  teilen, je ein Modell pro Hälfte trainieren, jedes proposed auf der FREMDEN Hälfte — nie
  zirkulär, per Konstruktion. Die Disagreements Modell-vs-Label sind die Nachlabel-Flags —
  über ALLE Labels (User, 2026-08-15: *"ich möchte alle labels in frage stellen"*): Figuren,
  `empty` und `occluded`, voller 14c-Kopf, nicht nur die Occluder-Schiene. Landet in der
  Audit-Lane des Labeln-Stroms (docs/labeling-ux/CONCEPT.md §4.2, `audit-flags.jsonl`).
  Voraussetzungen liegen seit heute: `check_not_circular` sieht durch Varianten-Präfixe
  (`occ-rg-…`), der Proposer bekommt `--model`, und Proposals tragen `probs`. Interim bis dahin:
  Modell-Rotation pro Session (erstes nicht-zirkuläres Modell aus einer Präferenzliste).

- **Der Vorlauf kam mit ~1,4 s statt 20 s an** (gemessen am Handy 2026-08-14, Session
  `20260814-142947`). *Beantwortet 2026-08-30 an `rg-2026-08-30-14-33-02`: der Ring war es nicht
  und die Scharfschaltung auch nicht — `video_pre_roll_ns` = 6,27 s, und im Video steht bei t=0
  die Grundstellung, die Hand greift bei t≈2,8 s nach e2, committet wird bei t≈6,33 s. Die
  Belichtung regelt in der ersten Sekunde noch hoch, also armte der Encoder mit dem Kamera-Bind:
  der Vorlauf ist so lang, wie die Kamera vor dem ersten Zug lief, und `PRE_ROLL_SECONDS` = 45
  ist nur die Obergrenze. Wer 45 s will, muss den Tracker 45 s vor dem ersten Zug starten.*
  **Offen bleibt die Gegenprobe an einem langen Lauf** (`adb logcat -s chesslabVideo` nennt Arm,
  Ringtiefe alle 5 s und die geflushte Länge): dass die Byte-Grenze greift, bevor die Zeitgrenze
  es tut, ist gerechnet, aber nicht gemessen — 45 s × 12,9 Mbit/s (die effektive Rate dieser
  Aufnahme) sind 72 MB gegen `PRE_ROLL_MAX_BYTES` = 80 MB, also keine Handbreit Luft.

- **Das 14er-Modell ist bei `occluded` zu aggressiv** (User am Brett, 2026-08-14). Deckt sich mit
  den Replay-Logs vom selben Tag: real14-80 las beim Start eine ganze Damenflügel-Flanke
  (`occlVeto=a3,a4,a5,a6,a7,b3,b4,b5,b6,…`) auf freiem Brett als verdeckt. Der Punkt ist nicht nur
  der Sensor, sondern was daran hängt: mit einem Modell OHNE `occluded` war `pOccluded = 0.0` und
  die Sperren (Hand-Veto, Recovery-Gate auf sauberem Brett, Count-Discount) liefen strukturell
  leer — dieses Modell schaltet sie zum ersten Mal scharf, und zwar mit einem unvalidierten Kopf.
  *Teilantwort seit 2026-08-14:* der Head hängt nicht mehr roh an der Engine — `modelHandSquares`
  (`core-engine/Taint.kt`, Knob `modelHandGate`) zählt occluded-Flags nur noch, wenn sie
  handförmig sind (adjazentes Paar, die Regel des Grid-Arms) UND Motion frisch ist oder der
  Grid-Arm die ruhende Hand bezeugt. A/B über Replays desselben Videos (`set:modelHandGate=…`).
  *Gemessen 2026-08-24, gegen die Vermutung:* die BREITE der Vetos ist kein Fehler. Aus 11 306
  gematteten Frames deckt eine echte Hand im Median 3 Felder, im p90 **23** und maximal 41 — eine
  Ausdehnungsgrenze würde echte Hände wegwerfen. Der Coverage-Kopf ist zudem gut kalibriert (echte
  Verdeckung < 5 % → Vorhersage Median 0,001; > 45 % → 0,838). Was fehlte, war die SCHWELLE: 0,5
  ließ Reads durch, die zu 84 % falsch sind. Sie reist jetzt als `coverage_gate` im Modell
  (`docs/occlusion-gate.md`). Offen bleibt der A/B der beiden Arme gegeneinander — Coverage-Kopf
  gegen Rillen —, den CLAUDE.md seit Wochen als „never measured" führt und den der Schalter
  `runGridOcclusion = coverageOutput != true` heute gar nicht zulässt.


- **The static takes still miss the gap they were filmed for.** Take 1 covers a1-e4 — White's
  half again, mostly empty squares. The corpus is already 57 % "occluded over empty" with 8
  examples of a covered black king. The next takes have to reach over ranks 7 and 8.
- **Mobile bucket sort** — a page that shows ONE crop big and a few large buckets underneath
  (occluded / empty / FEN is right / wrong → piece palette). Tap or swipe throws the crop in,
  the next appears. Meant for the phone, for volume; the brush stays the desktop tool.
  *"ich will das mal ausprobieren aber später"* (2026-08-09).
- **Video upload in the web UI** — today a new video is a `copy` onto disk plus four CLI steps
  (label → confirm → export-session → model-read). The platform should
  take the file, put it where it belongs and run the chain. Asked 2026-08-09; the CLI path is
  written up in the answer of that day. *Mostly done since 2026-08-13:* a PHONE recording arrives
  by itself over the LAN, queues `training-video-pack`, and the whole
  label → confirm → export-session → model-read chain is a button per card on `/`
  (`docs/phone-transfer.md`, `platform/app/README.md`). What is left is the RIG videos — a file the
  browser hands over, so the chain has something to start on.
- **Review provenance** — "keep" in the tinder band writes nothing, by design (a row repeating
  the FEN is noise in a global training input). Consequence: *looked at and correct* is
  indistinguishable from *never looked at*. If that distinction should survive a reload, it
  needs its own ledger next to `corrections.jsonl` — the user's point of 2026-08-09: "nur weil
  ich occluded anmale heißt das nicht, dass alle Bauern richtig sind".

- **Python zurückbauen, Kotlin als einzige Implementierung** (2026-08-09: *"python soweit
  rauszunehmen wie es geht ... da es auch die engine am gerät ist"*). Reihenfolge nach Schaden bei
  Drift, und jeder Schritt erst als PARITÄTSTEST, dann als Umzug:
  1. **Crops/Warp** — dieselbe Konstruktion liegt dreimal vor (`calibration.crops_for_frame`,
     `core-geometry/Crops.kt`, `platform/app/lib/warp.ts`). Trifft Gerät *und* Training, also der
     teuerste Drift; genau hier war der `ClipDriver`-Vorfall.
  2. **Brettgeometrie** — ArUco, Quad-Auflösung, `alignment_of`.
  3. Der TypeScript-Warp der Weboberfläche, sobald 1 steht.
  Nicht bewegbar: PyTorch-Training und der Datensatzbau. Ein `throw` in `chesslab slice` schaltet
  den Datensatzbau ab — der Umzug braucht vorher einen Kotlin-Weg, der die Crops liefert.

## Open questions the measurements left behind

- **First-frame quad vs scan median** — worth ±6-25 plies and the direction is inconsistent per
  video (specs/52, "geometry A/B"). `alignment_of` over the run is the arbiter, not ply counts.

## Standing rules that came out of the same conversations

- A newly exported session is a SUPPLEMENT to the corpus, never the bulk: two videos at 50 % of
  the train split cost 105 phantoms. Pre-cap with `--source-manifest` (specs/53 STATUS).
- The model may PROPOSE on a video, never on one it was trained on — `occluded_model.py`
  refuses that outright.
- **A cell overlay without the square name in it is not checkable.** `all_squares()` counts from
  rank 1 up while the warp puts rank 8 at the TOP; a probe drawn without the names read every
  score one board-flip away from its cell and invented a rank-8 false positive that was not there.
- **A fix in the exporter is not a fix in the data.** Both sessions sat on logs written before
  `unknown_squares` existed, because re-running the export meant decoding the whole video again.
  Re-export is cheap now (frames on disk are kept) and non-destructive (a repaired quad is carried
  over), so after any change to `plan_rows`, re-export and check the field is actually there.

## Zwei Aufnahmen behalten ihren Bogen — die Kruemmung war nie messbar (2026-08-21)

Der Store ist geradegezogen, aber der Mesh kann nur den Bogen nehmen, den er GEMESSEN hat.
`_curved_axes` (realgames.py) gibt die `cx`/`cy` nur alles-oder-nichts heraus: jede der 18 Linien
braucht >= `MIN_CURV_SAMPLES` Punkte, und keine darf ueber `MESH_CURV_LIMIT` liegen. Wo das
scheitert, bleibt eine Zeile bei Versaetzen und Neigungen.

Seit 2026-08-21 leiht ein Frame ohne Kruemmung die der Aufnahme (Median ueber die sauberen Frames,
die eine tragen, mindestens `MESH_POOL_MIN` = 3) — das rettete `20-35-52` von 6,35 auf 1,70 px.
Zwei Aufnahmen haben aber gar keine zu leihen:

| Aufnahme | saubere Frames mit Kruemmung | Bogen danach |
|---|---|---|
| `2026-08-13-19-34-23` | 1 von 55 | 5,5 px |
| `2026-08-14-20-48-55` | 0 von 105 | 5,4 px |

Zum Vergleich: der Korpus-Median liegt bei 0,97 px, roh waren es 6,07.

Zu klaeren, falls das stoert: WARUM die Kruemmung dort durchfaellt (zu wenige Bandpunkte auf
einzelnen Linien, oder Linien ueber dem Limit). Die Alles-oder-nichts-Regel selbst ist bewusst so —
"ein Konsument darf nie eine halbe Stufe schneiden" — und sollte nicht aufgeweicht werden, um eine
Zahl schoener zu machen.

## Der gerade Store kostet eine Interpolation — sie liesse sich einsparen (2026-08-21)

Der Export warpt heute Frame -> Brett und zieht das Brett DANACH gerade. Das sind zwei
Resamplings, wo der alte Zell-Schnitt eines hatte. Gemessen als Laplace-Energie des fertigen
Crops gegen einen aus dem rohen Brett geschnittenen: bilinear **-44 %**, kubisch **-22 %**,
Lanczos4 -19 %, alle bei ~290 ms je 952-px-Brett. Ausgeliefert wird kubisch.

Die -22 % waeren ganz zu vermeiden, indem der Mesh in `warp_board_for_crops` HINEINKOMPONIERT
wird: eine Abbildung vom Frame direkt auf das gerade Brett, ein Resampling wie frueher. Genau das
tut `sampleBoxMesh` (`lib/warp.ts`) schon fuer die Ansicht — es geht in einem Zug durch Mesh UND
Homographie.

Nicht gemacht, weil es die Paritaets-Zwillinge in Kotlin und TS mitzieht und der Nachruest-Weg
(`session straighten`, der auf FERTIG gewarpten Brettern arbeitet) das zusaetzliche Resampling
ohnehin nicht vermeiden kann. Ein frisch exportierter und ein nachgeruesteter Store waeren dann
unterschiedlich scharf — auch eine Entscheidung, die jemand treffen muss.

## `labeled-session-pack` liest Frames, die es nicht mehr gibt (gefunden 2026-08-21)

`packLabeledSession` (LabeledVideoPack.kt) oeffnet `row["frame"]`, also ein PNG unter `frames/`.
Seit dem Brett-Store (2026-08-17) haelt keine Aufnahme mehr Quellframes — das Verb kann auf dem
heutigen Korpus gar nicht laufen und faellt mit "could not decode" hin, bevor es irgendetwas packt.

Zu tun, wenn es gebraucht wird: aus `row["board"]` lesen statt zu warpen, `board_size`/
`board_border` der Zeile als Geometrie nehmen (wie Pythons `usable_board` es prueft) und ein
Brett ohne `board_straightened` verweigern statt es stumm zu schneiden. Der Warp entfaellt dabei
ganz — das gespeicherte Brett IST der Warp, und seit 2026-08-21 auch schon gerade.

Solange das offen ist, ist Pythons `slice` der einzige Weg von einer Session zu Trainings-Crops.

## Hände in „sauberen" Frames — wie viele rutschen durch? (2026-08-18)

Frage vom User: wie sicher sind wir, dass die nicht-`dirty` Frames keine Hände enthalten?

Stand, gemessen:

- `hand_squares` ohne `dirty` gibt es **null** — aber nur per Konstruktion: `mark_hands_session`
  setzt `dirty`, sobald der Gitter-Sensor anschlägt. Die Zahl sagt nichts über das, was er
  **übersieht**.
- Vor Einführung des Sensors zeigten laut seinem eigenen Docstring **424 von 2 228** Frames eine
  deutliche Hand ohne Flag (19 %). Die Trefferquote des Sensors selbst wurde nie gemessen.
- Sichtprobe an **40 zufälligen nicht-`dirty` Brettern** aus allen 20 Sessions: in etwa einem
  Drittel ist Haut zu sehen. Ein Teil davon liegt auf dem Randstreifen und berührt kein Feld —
  aber nicht alles. Auge, keine Messung.

Korpusweit: 51,9 % der 27 958 Frames sind `dirty`, 25,9 % tragen `hand_squares`.

**Was die Zahl liefern würde:** der Verdeckungs-Ausgang (`--head occlusion`), sobald er auf den
komponierten Daten trainiert ist. Über die nicht-`dirty` Frames laufen lassen, Überdeckung je Zelle
schätzen, und die Verteilung ist die Antwort. Das ist derselbe Lauf, der die Labelvorschläge für
das Tool erzeugt — also kein Extraaufwand, nur Reihenfolge.

## Verdeckte Stellungen: Frames zurückgewinnen statt dichter exportieren (2026-08-18)

Gemessen an 003957 (66 Stellungen, Export `--every 3`): je Stellung liegen median 47 Frames vor,
davon **median 11 sauber** — und **45 der 66 Stellungen (68 %) haben weniger als 16**. Mit
`--per-position 16` liefern zwei Drittel der Stellungen also weniger, als der Sampler will.

Der naheliegende Fix wäre ein dichterer Export (`--every 1`, dreifacher Brettspeicher). **Verworfen
(User 2026-08-18):** lieber weniger Bretter für eine verdeckte Stellung als dreimal so viel Material
für alle. Die Reduktion bleibt am Ende der Pipeline, wo sie hingehört.

**Die Idee, die noch aussteht:** in einem zweiten Durchgang Frames zurückholen, die heute pauschal
fallen. Kandidaten, in aufsteigender Schwierigkeit:

- Frames im `dirty`-Fenster (±1 s um den Commit), auf denen **keine** Hand zu sehen ist und deren
  Stellung sich nachweislich nicht ändert — das Fenster ist eine Zeitregel, kein Sensor.
- Frames mit Hand, aber nur auf Feldern, die für diese Stellung ohnehin nicht gebraucht werden:
  die Matte weiß pro Feld, wie viel verdeckt ist, also können 60 saubere Felder bleiben, während 4
  fallen. Heute fliegt der ganze Frame (`labeling.MATTE_DIRTY`).
- Stellungen unter dem Ziel gezielt auffüllen, statt gleichmäßig über alle zu streuen.

Der Preis der letzten beiden ist, dass ein Brett dann nicht mehr vollständig ist — `keep_per_position`
wählt heute bewusst ganze Bretter. Also erst messen, ob unvollständige Bretter dem Sampler schaden.

## Sampler: Metadaten als Strata (2026-08-18)

Der Coreset stratifiziert heute nach Stellung und streut innerhalb nach Aussehen (k-center greedy).
Der User weist zu Recht darauf hin, dass `hand_squares`, `dirty` und der Ply-Wechsel ebenfalls
Schlüsselereignisse sind und eigene Strata verdienen — um Ereignisse herum dichter abtasten.

Gemessen spricht dafür: über 60 s eines Session-Videos bewegt sich das Brett-Aussehen in 0,1 s nur
das 2,6-fache eines Einzelframes (glatt wäre 3,0) — Licht und Schatten sind auf dem 0,1-s-Raster
also vollständig erfasst. Der maximale Einzelframe-Sprung liegt aber bei **17,97 gegen Median
0,72**, Faktor 25: das sind die schnellen Ereignisse, und die trifft das Raster nur zufällig.

Also: für Licht/Schatten/Stellung reicht das vorhandene Extrakt, für Hände nicht. Erst angehen,
wenn der Verdeckungs-Zweig steht.

## Reste des Pre-roll-Offsets (Ursache behoben 2026-08-19)

- Die alten Einzeldatei-Sessions liegen 1 Frame daneben (Locate-Walk). 33 ms — nicht repariert,
  weil ein Re-Export jeden Stem neu plant und die Labels dort entwertet.
- `rg-VID_20260802_222203` ist mit vertauschtem b8/c8 aufgebaut worden (Läufer auf b8). Von Hand
  korrigiert; die 298 Crops davon in gebauten Datasets tragen den Tausch bis zum nächsten Rebuild.
- Aufbau-Check vor Zug 1 fehlt weiterhin — genau dieser Fall.

## Bretterkennung per CNN statt ArUco (2026-08-20, nur ein Gedanke)

Das Nicht-Ziel „kein Deep Learning für die Bretterkennung" ist **unbelegt**: `specs/15` hatte fünf
Phasen `todo` und hat nie gemessen, die 34–50 % in der Doku sind Literatur. Nachgerechnet, damit
das morgen nicht nochmal jemand herleiten muss:

- **Geschwindigkeit kauft nichts.** Auf dem Gerät wird einmal pro Aufbau kalibriert und das Quad
  gehalten; im Export läuft der Fit pro Frame, aber offline. Niemand wartet darauf.
- **Genauigkeit auch nicht.** Ein Netz besetzt den GROBEN Platz, den ArUco füllt. Die 1,86–2,10 px
  kommen vom Grid-Fit, der die 18 eigenen Linien des Bretts liest — ein Keypoint-Netz startet bei
  4–8 px Quantisierung und bräuchte zur Verfeinerung genau diesen Grid-Fit. Kette wäre
  CNN→Grid-Fit statt ArUco→Grid-Fit.
- **Der Gewinn wäre: die Marker fallen weg** (markerloser Kaltstart), und mit ihnen
  `margin = 0.045`, das es nur gibt, weil ArUco-Ecken nicht die Feldecken sind.
- **Die Labels sind umsonst:** 7 344 Frames tragen schon `corners` aus `export-fit`.
- **Das Risiko ist der Fehler, der den klassischen Detektor erledigt hat.** 9 unterscheidbare
  Aufbauten über 20 Aufnahmen; `board_corners_from_lines` rastete auf Schreibtisch- und
  Monitorkanten ein, 775 px daneben. Ein CNN darauf scheitert **selbstbewusst**, ArUco laut.

Falls je gebaut: CNN schlägt vor, **Grid-Fit hat das Veto** (findet er nicht alle 18 Linien
innerhalb `MAX_OFFSET_FRAC`, wird abgelehnt, nicht gemittelt), und das Abnahmekriterium ist das
Maß des Grid-Fits — ein falsches Maß hat hier schon 302 Frames zertifiziert, deren Gitter mit
blossem Auge falsch war. Erst mehr Aufbauten, sonst misst man auswendig gelerntes Mobiliar.

## Markerlos: was nach 90 % noch fehlt (2026-08-30, gemessen)

`src/chesslab/markerless.py` sitzt auf 140 von 155 Frames exakt auf ArUcos Lösung, medianer
Eckenfehler 0,06 Zellen, 70 ms je Frame (`docs/markerless.md`). Offen:

- **Die Orientierung.** Bewusst ausgeklammert — welche Ecke a8 ist, kann ein Gitter prinzipiell
  nicht sagen. Soll aus dem CNN kommen. „a1 ist dunkel" ist gemessen und VERWORFEN: halbiert die
  vier Drehungen auf zwei, die Umsetzung wählte die falsche.
- **6 Frames finden gar kein Brett**, überwiegend mit einem Arm quer darüber. ArUcos eigentlicher
  Vorteil ist hier ungenutzt: `MarkerTracker` hat ein Gedächtnis über Frames, dieser Detektor
  fängt jeden Frame bei null an. Das ist der billigste nächste Schritt.
- **9 Frames bleiben eine Zelle daneben.** Ein grösserer Suchbereich hilft nicht (±2 und ±3 sind
  identisch) — das Paritätsmass wählt dort falsch, es greift nicht zu kurz.
- **Perspektive ist nicht vermessen.** Der 81-Punkt-Fit trägt sie, aber der Bereich ist unbekannt.
- **Kotlin fehlt ganz.** Alles Python-Prototyp; ein Umzug braucht vorher einen Paritätstest.

## `board_size` folgt nicht dem gemessenen Quad (2026-08-20, gemessen)

`board_size` ist konstant 928 für jede Aufnahme, aber wie gross das Brett im Bild sitzt, schwankt
von **96,3 bis 125,4 px/Feld** — 30 %. **14 von 20 Aufnahmen sind nicht 1:1:** zwölf verkleinern um
6–8 % (die Richtung, vor der `config.py` selbst warnt), und zwei vergrössern —
`VID_20260726_233432` (0,83) und `VID_20260727_233929` (0,87) erfinden 17–21 % Pixel, bevor
überhaupt jemand schneidet. Das trifft nicht nur die Oberfläche: das Modell trainiert auf 128 aus
demselben Store.

Fix wäre, `board_size` pro Aufnahme aus dem gemessenen Quad abzuleiten (auf ein Vielfaches von 8
gerundet) statt zu setzen, und die beiden Aufnahmen neu zu exportieren.

Getrennt davon: die Labeling-Oberfläche holt `CROP = 192` aus einem 127,6-px-Kasten, also 1,5×
bilinear hoch — Kette von der Quelle bis zum Auge 1,53× bis 1,99×. Die Kästen selbst sind über
Python/Kotlin/TS bytegleich gepinnt (`mesh_crop_parity.json`, 1e-9), die PIXEL nicht: Python
rundet den Kasten auf ganze Pixel und skaliert mit `cv2.resize`, TS sampelt bilinear pro
Ausgabepixel. Kein Test vergleicht je ein Bild.

## Compose-Layouts sind unprüfbar (2026-08-21, zweiter Vorfall)

**Null `@Preview`, null Compose-Tests im ganzen Projekt.** Jedes Layout ist ausschliesslich
durch Starten der App prüfbar, und beide Vorfälle an derselben Karte musste ein Mensch finden:

| | Opfer | Abhilfe damals |
|---|---|---|
| 2026-08-02 | die Aktionsleiste UNTER der Karte, 1-2 mm hoch, nicht drückbar | `heightIn(max = 200)` auf der Prosa |
| 2026-08-21 | "Accept CNN position" als Haarstrich | Prosa auf `weight(1f, fill = false)` |

**Derselbe Mechanismus beide Male:** eine `Column` misst ihre NICHT-gewichteten Kinder zuerst
und der Reihe nach, jedes mit dem Rest als Deckel. In `Watching` ist die Reihenfolge Infozeile →
`BoardRow` (quadratisch, also so hoch wie das Gerät breit ist) → Karte → Aktionsleiste. Wer
später kommt, bekommt Krümel. **Begrenzen ist nicht bevorzugen** — der Deckel von 2026-08-02
trägt nur, solange die Karte selbst genug Platz hat.

Die eine Zusicherung, die beide Vorfälle gefangen hätte: *in einem auf 220 dp gedeckelten
Container ist die gemessene Höhe jedes Aktionsknopfes mindestens das Touch-Ziel von 48 dp.*

Drei Instrumente, nach Kosten:

- **`@Preview` der Karte im gedeckelten Container** — ~15 Zeilen, sofort in Android Studio
  sichtbar, fängt es aber nur, wenn jemand hinschaut. Landet im APK, sofern nicht in einem
  eigenen `debug`-Source-Set.
- **Robolectric + `compose-ui-test`** — eine Abhängigkeit und etwas Konfiguration, läuft dann in
  `:app:testDebugUnitTest` mit und kann die 48-dp-Zusicherung wirklich prüfen. Das ist das
  Instrument, das die Regression zum Test macht statt zum Blick.
- **Screenshot-Tests (Paparazzi/Roborazzi)** — fängt auch Farbe, Abstand und Umbruch, kostet
  dafür Referenzbilder, die gepflegt werden wollen.

Randbedingung: `:app` steht bei 457 Testfällen und muss grün bleiben; `:app:detekt` hat einen
vorbestehenden Fund (`ModelSpecTest` LongParameterList), der nicht durch neue Testinfrastruktur
wachsen darf.

## Verdeckungsdaten aus einer stehenden Stellung (2026-08-21, Code entfernt)

`export_static` und seine vier Helfer (149 Zeilen, null Tests, null Aufnahmen dieser Art auf
Platte) sind raus: das Feature wurde nie benutzt, und Verdeckungsmaterial fällt aus den echten
Partien genug ab. Es hatte auch nie ein CLI-Verb, war also seit seinem einzigen Commit
unerreichbar. `git log --diff-filter=D -- src/chesslab/realgames.py` holt es zurück.

**Die Idee ist trotzdem gut, falls Verdeckungsdaten je knapp werden:** bei einer Partie musst du
erst wissen, WELCHER Zug wann passierte, bevor du Labels hast. Bei einer stehenden Stellung
kennst du sie ab Frame 1 — nichts ändert sich —, und die einzige Unbekannte ist die Hand. Die
verrät sich durch Bewegung: jeden Frame gegen das Pixel-Mittel der Aufnahme, die ruhigsten 65 %
sind sauber, der Rest ist `dirty` und damit genau das Material, das SAM3 nachlabelt.

Zwei harte Voraussetzungen, die es NICHT zum Turntable-Werkzeug machen: ein einziges Quad für die
ganze Aufnahme (Median der Ecken) und das Pixel-Mittel als Ruhe-Referenz. Beides bricht, sobald
sich Brett oder Kamera bewegen.

## Hintergrund-Randomisierung entfernt (2026-08-21)

`bg_p` und sein Unterbau (`randomize_border_bg`, `_procedural_bg`, `_pool_bg`, vier Stellschrauben,
das CLI-Flag) sind raus. Es ersetzte bei BESETZTEN Crops den Rand — also das Brett — durch einen
zufälligen, weich überblendeten Hintergrund und behielt die Figur in der Mitte; halb prozedurale
Texturen, halb Ausschnitte anderer Bretter. Wahrscheinlichkeitsbasiert, damit „zufälliger
Hintergrund" nicht selbst zum Hinweis auf „besetzt" wird.

**Warum es weg ist:** 0 von 10 ausgelieferten Modellen haben es benutzt, jedes Rezept des Nutzers
übersteuerte es auf 0, und **ob es hilft, wurde nie gemessen** — der Satz im Config klang nach
Ablation, sagte aber nur, dass die Flags existieren, damit man ablatieren *könnte*.

**Das Problem dahinter ist echt und bleibt:** gemessen relied eine Springer-Vorhersage zu 8 % auf
die Figur und zu 43 % auf das Brett drumherum. `chesslab reliance` misst genau das weiter. Wenn die
Abkürzung wiederkommt, ist das hier der Bauplan der Gegenmassnahme — `git log --diff-filter=D --
src/chesslab/training/torch_data.py` holt sie zurück.

Nebenwirkung, positiv: der Zweig, der bei `bg_p > 0` still den gepackten Memmap-Loader abschaltete
(F8 in `training-pipeline-review.md`), fällt mit weg. Der Pack-Pfad ist jetzt bedingungslos.

## Aufnahmen haben 22 verschiedene Formen (2026-08-21, gemessen)

`data/recordings/` hält **43 Aufnahmen in 22 unterschiedlichen Verzeichnisformen**. Zwei Arten
liegen unvermischt nebeneinander, dazu ein langer Schwanz aus Einzelfällen:

| Form | Anzahl | Inhalt |
|---|---|---|
| roher Handy-Upload | 16 | `files/`, `reference.pgn`, `reviewed.jsonl` — Video liegt in `files/sessions/<id>/video.mp4` |
| fertig exportiert | 5 | `boards/`, `candidate.json`, `log.jsonl`, `video.mp4` **oben**, `session.yaml` |
| Mischformen und Einzelfälle | 22 | beides zugleich, plus `*.bak.preroll`, `*.bak.bkq-swap2`, `training-pack-fast`, `training-pack-safe-dense`, `phone-tracker-config-align3.json`, `phone-session.tar` … |

**Warum das weh tut:** derselbe Inhalt liegt an zwei Orten, je nach Alter der Aufnahme. Wer
`<ts>/video.mp4` prüft, findet 25; wer zusätzlich `<ts>/files/sessions/*/video.mp4` prüft, findet
alle. Ich bin am 2026-08-20 selbst darauf hereingefallen und habe daraufhin falschen Alarm über
verlorene Videos geschlagen.

**Zu tun:** eine Zielform festlegen, den Bestand dorthin migrieren, und die Ausweichpfade im Code
entfernen statt sie zu pflegen. Legacy-Daten werden angepasst, nicht umschifft.

## Videostand, korrigiert (2026-08-21)

Die frühere Fassung dieses Eintrags behauptete, nur 9 von 43 Aufnahmen hätten noch ihr Video und
über 30 hingen am Telefon. **Beides falsch** — die Zahl 9 kam von der Suche an der falschen Stelle.

Richtig: **25 von 43 haben ihr Video lokal (7,9 GB).** Die 18 ohne haben auch auf dem Handy keins,
da fehlt also nichts. Genau **6 Videos** existierten nur auf dem Gerät (2,4 GB, das grösste
1,86 GB), fünf davon ganz ohne Backup — die sind seit dem 2026-08-20 in
`data/footage/phone-backups/f86dfdca-20260820-205905/files.tar` gesichert.

Die Entscheidung bleibt trotzdem offen: sollen die Quellvideos beim Export automatisch mitkommen,
damit dieser Zustand nicht wieder entsteht?

## Parität zwischen den webp-Exporten (2026-08-21)

**Ziel: bytegleiche Frames.** Kotlins `training-video-pack` und die Python-Kette
(`export-session` → `slice`) schneiden aus **derselben** Quelle — demselben Video, derselben
Aufnahme — und müssen dasselbe Bild liefern. Heute ist das ungeprüft.

Gemessen an `2026-08-15-22-48-04`: Kotlin nimmt 238 Frames und schreibt 15 232 Crops in
`training-pack/accepted/`, Python schneidet 17 114. Die Zahlen dürfen abweichen — die beiden
wählen bewusst verschieden aus —, aber **wo beide denselben Frame und dasselbe Feld schneiden,
müssen die Bytes gleich sein.**

Der Test dafür: eine Aufnahme, die beides hat (11 der 43 haben ein `training-pack`), die
Schnittmenge über (Frame, Feld) bilden und `sha256` je Crop vergleichen. Eine Abweichung ist eine
echte Divergenz in Warp, Mesh-Schnitt, Resize oder webp-Kodierung — und dann ist zu klären, welche
Seite recht hat.

Warum das zählt: die Geometrie ist über `mesh_crop_parity.json` schon dreifach gepinnt (Python,
Kotlin, TS, auf `1e-9`) — aber das pinnt **Kästchen-Koordinaten, nicht Pixel**. Kein Test hat je
ein Bild verglichen. Solange das offen ist, kann ein Modell auf Crops trainiert werden, die anders
aussehen als die, die der Tracker auf dem Gerät sieht.

Verwandt: der Sampler-Unterschied zwischen Python (`cv2.resize`, `INTER_AREA` beim Verkleinern) und
der Labeling-Oberfläche (bilinear pro Ausgabepixel) steht weiter oben in dieser Datei.

## Datenpipeline: gesammelt, nicht sortiert (2026-08-22 bis 2026-08-24)

Einzelbefunde aus der Pipeline-Arbeit. Sie standen bis 2026-08-25 unter der
webp-Paritaets-Ueberschrift darueber, mit der sie nichts zu tun haben.

- **`SETTLE_CELL_PX` sweepen (2026-08-22).** Steht auf 32 px und ist nie gemessen worden — der
  Kommentar begruendet nur, warum es KLEIN ist. Weniger kann reichen: die Frage ist, ob sich der
  Inhalt geaendert hat, nicht wie scharf er ist. Achtung, `SETTLE_LIMIT = 15.0` ist an dieser
  Geometrie kalibriert und muss mitgemessen werden. Gegenprobe: 16 / 32 / 48 / 80 px auf einer
  Session, verglichen gegen die Felder, die `departures` meldet.

- **`occluders.py`: dieselbe Konnektivitaets-Falle notieren (2026-08-23).** `drop_specks` (Z. 57)
  und `stage_of` (Z. 121) rufen `connectedComponentsWithStats(m, 8)` — die 8 landet auf `labels`,
  nicht auf `connectivity`. Verhalten ist zufaellig korrekt, weil die Vorgabe ohnehin 8 ist, die
  Schreibweise luegt aber. Beim naechsten Anfassen auf `connectivity=8` heben; fuer `drop_specks`
  gilt dabei zu pruefen, ob die invertierte Runde (Pinholes) nicht 4 braucht.

- **Composite-Mesh dreht sich mit dem Brett (2026-08-23).** `composite.median_mesh` nimmt EINEN
  Median ueber den ganzen Clip. Gemessen auf `VID_20260817_214400` ueber 30 Frames und den vollen
  Winkelbereich: die Linienlage `x` korreliert mit **0,87** zum Drehwinkel, `y` mit 0,68 — also ein
  systematischer Anteil, der zu keinem Einzelframe passt. In Pixeln auf board_size 1280: 1,6 px
  (`x`) und 3,3 px (`y`), auf einer 160-px-Zelle also 1-2 %. Der Median heilt dafuer den Einzelfit,
  den Figuren auf der Grundreihe verziehen. Richtig waere der dritte Weg: pro Frame fitten und die
  verzogenen Linien reparieren (`sessions._repair_mesh_outliers`, `smooth_mesh_curvature`).

- **Composite: die Ueberblendung variieren (2026-08-23).** `composite.over` blendet immer hart
  ueber das Alpha. `Cut, Paste and Learn` (ICCV 2017, arxiv 1708.01642) misst **8 AP** Unterschied
  allein dadurch, dass ueber den Datensatz hinweg VERSCHIEDENE Verfahren gemischt werden (hart,
  Gauss-weich, Poisson) — bei immer derselben Kante lernt das Netz die Kante statt das Objekt.
  Passt zur eigenen Messung: Crops MIT Occluder haben Laplacian 1023, ohne 3453. Als eigener Lauf
  gegen comp13-v3 halten, nicht mit hineinmischen.

  Quellen:
  - Cut, Paste and Learn, ICCV 2017 — https://openaccess.thecvf.com/content_ICCV_2017/papers/Dwibedi_Cut_Paste_and_ICCV_2017_paper.pdf
  - Code zum Papier — https://github.com/debidatta/syndata-generation
  - Poisson-Blending in der Praxis — http://alondaks.com/2017/12/01/object-detection-data-augmentation-via-poisson-blending/

  Ausserdem aus dem Papier: Realismus auf PATCH-Ebene genuegt, global unrealistische Kompositionen
  schaden nicht — das ist die Rechtfertigung dafuer, dass wir Haende ueberhaupt aufkleben duerfen.

- **Der Speicherfresser ist OpenBLAS, nicht Torch (2026-08-23, gemessen).** Ein Torch-Prozess
  RESERVIERT 3,48 GB Commit, bevor er irgendwas rechnet — Working Set dabei 0,38 GB. Die
  Reservierung sind OpenBLAS-Thread-Arenen (14 Threads = 14 Kerne), nicht Torch selbst:
  `OPENBLAS_NUM_THREADS=1` druckt den Commit auf **0,28 GB (12x)** und laesst
  `torch.get_num_threads()` trotzdem auf 14. `OMP_NUM_THREADS=1` spart genauso viel, setzt aber
  auch Torch auf 1 Thread; `MKL_NUM_THREADS` tut im ROCm-Build gar nichts. Skaliert linear:
  2 Threads 0,45 GB, 4 Threads 0,79 GB.
  **Warum das zaehlt:** 16 Dataloader-Worker = 56 GB Commit allein fuers Importieren. Am
  2026-08-23 hielten 44 verwaiste python.exe **115 GB Commit** von 160 GB Limit, und Tests fielen
  mit `WinError 1455 Auslagerungsdatei zu klein` + `OpenBLAS error: Memory allocation still failed`.
  Das ist der Mechanismus hinter „max 8 Worker".
  **Naechster Schritt:** `OPENBLAS_NUM_THREADS=1` fuer Worker-Prozesse setzen (GPU-Pfade wie SAM 3
  nutzen OpenBLAS ohnehin nicht) — vorher auf den CPU-lastigen Pfaden (`dataset build`) die
  Laufzeit gegenmessen, nicht blind setzen.

- **`OPENBLAS_NUM_THREADS=1` fuer die uebrigen Torch-Prozesse pruefen (2026-08-23).** Gesetzt ist
  der Cap jetzt in `config.loader_kwargs` (alle Loader-Worker) und im SAM-3-Alpha-Worker — beides
  GPU-Pfade, die OpenBLAS nicht anfassen. **Offen:** `serving.py` haelt einen langlebigen
  Torch-Prozess und wuerde 3,2 GB Commit sparen, macht aber ggf. CPU-Inferenz — vorher die
  Latenz messen, nicht blind setzen. `training/evaluate.py` und `gradcam.py` laufen kurz, lohnen
  kaum. Der Blender-Sharder in `cli.py` spawnt keine Torch-Prozesse und ist nicht betroffen.

- **SAM 3.1 ist fuer uns kein Upgrade (geprueft 2026-08-23).** `facebook/sam3.1` enthaelt KEIN
  `model.safetensors`, nur `sam3.1_multiplex.pt` (3,50 GB); die config sagt
  `architectures: ['Sam3VideoModel']`, `model_type: sam3_video`. `Sam3Model.from_pretrained`
  laedt das nicht — ein Drop-in-Test existiert in unserem Pfad nicht.
  Inhaltlich passt es auch nicht: der Gewinn ist Object Multiplexing (bis 16 Objekte in einem
  Forward-Pass, ~7x schnelleres Tracking, bessere VOS-Zahlen). Wir schneiden EIN Standbild ohne
  Tracking, und gemessen kommt genau EINE Instanz zurueck (`person`/`hand` treffen,
  `arm`/`sleeve`/`wristwatch` liefern 0 Instanzen). Bildqualitaet beansprucht das Model Card nicht.
  **Neu pruefen, wenn** Meta einen transformers-nativen Bild-Checkpoint unter 3.1 nachreicht.

- **Memmap direkt aus der Quelle schneiden (2026-08-23).** Der Pool bleibt bei 128 px — das ist
  das Artefakt fuer den MENSCHEN und zugleich die native Box des echten Exports (`board_size`
  928 -> Zelle 116 -> Box 127,6, Faktor 1,000). Fuer das MODELL soll die Memmap auf Zielgroesse
  direkt aus der Quelle kommen, nicht ueber den Pool: heute ist der Composite-Pfad
  Box -> 128 -> 80, also zweimal skaliert, beim 1080p-Clip mit einem Hochskalieren dazwischen.
  Gemessen durch den echten Pfad, Laplace auf 80 px: 4K 980 -> 1219 (1,24x), 1080p 652 -> 865
  (1,33x). Geometrie und Zahlen in `docs/data-pipeline.md` 3.1.
  **Vorlage:** `synth_build` macht es schon so (ein Warp, direkt in die Memmap, `mm://`-Zeilen
  statt Dateien). Der Irrweg, stattdessen die Pool-Groesse zu aendern, ist mit `9d1bda44`
  zurueckgenommen — er haette die Lane fuer den Menschen quellabhaengig gemacht.
  **Offen:** ob 1,24-1,33x am Val-Wert etwas bewegen. Gegentest gegen
  `comp13-occ-bn-lr1e2-bs512`.


- **Vorschlag: den Composite-Pool nicht ueber 128 packen (gemessen 2026-08-23).** `pack_dataset`
  schneidet heute aus `data/crops/comp13-v3` (128 px) auf 80. Das ist ein Resampling zu viel: der
  Pfad ist Zelle -> `board_size` -> 128 -> 80, waehrend Kotlin auf `board_size` warpt und in EINEM
  Schritt auf die Modellgroesse schneidet.
  **Gemessen** auf echten Quellframes, gleiche Zelle, gleiches Ziel 80 px:
  direkt 160->80 gegen 160->128->80 bringt **1,54x Laplace-Varianz** (je Quelle 1,49x und 1,56x),
  Rolloff 78 gegen 66. Zum Vergleich liegt die Zieldomaene `real13-straight-80-v3` bei Laplace
  1618, der Direktschnitt bei 786, der Pool-Umweg bei 511 — der Umweg reisst also gut die Haelfte
  des verbleibenden Abstands selbst auf.
  **Warum das sauber ist:** der reale Pfad macht es schon so (`boards/` mit `board_size` 928,
  Zelle 116, ein Schritt auf 80). Der Composite waere damit ANGEGLICHEN, nicht schaerfer als die
  Zieldomaene. Die Kotlin-Paritaet bleibt unberuehrt: `MAX_BOARD_SIZE = 1280` ist bewusst gespiegelt
  (`realgames.py` <-> `CalibrationStore.kt`), daran wird NICHT gedreht.
  **Wie:** den 128er Pool als Reserve behalten, aber `pack_dataset` bei abweichender Zielgroesse
  aus der Quelle neu schneiden statt aus dem Pool — sonst verliert man die Mehrfach-Aufloesung.
  **Offen:** das ist eine BILDmessung. Ob 1,54x Laplace am Val-Wert etwas bewegt, ist ungemessen;
  der Gegentest waere ein Trainingslauf gegen `comp13-occ-bn-lr1e2-bs512` als Basis. Und es faellt
  in `composite.py`, wo gerade ein anderer Kontext arbeitet — vorher abstimmen.

- **BEANTWORTET: `--per-position` 8 → 2 kostet spürbar** (gemessen 2026-08-25, drei Seeds je Arm,
  volle 60 Epochen). Die Vermutung war „acht Bretter je Stellung sind acht fast identische
  Ansichten, der Datensatz wächst und die Information nicht". Sie ist widerlegt.
  Ausgedünnt wurde OHNE Neu-Export (`scripts/thin_per_position.py`): dieselben Crops aus derselben
  Memmap, nur weniger davon — 6 799 Bretter auf 1 916, 424 519 Crops auf 116 475. Ein Neu-Export
  hätte andere Bilder gewählt und zwei Änderungen vermischt.
  Gepaart je Seed, p8 minus p2 — **3 von 3 positiv auf jeder Metrik**:

  | Metrik | Seed 42 | Seed 43 | Seed 44 |
  |---|---|---|---|
  | `visible_acc` | +0,0330 | +0,0052 | +0,0049 |
  | `piece_acc` | +0,0990 | +0,0401 | +0,0354 |
  | `occupied_board_acc` | +0,3570 | +0,2280 | +0,1271 |

  **Nebenbefund:** die meisten Stellungen tragen 16 Bretter, nicht 8 — `per_position` 8 PLUS
  `dirty_per_position` 8, im Schnitt 14,2. Die Frage hieß real „14 oder 4".
  **Offen bleibt, welche Hälfte den Wert trägt:** zwei Arme laufen, `c8d2` (8 saubere + 2
  verdeckte) gegen `c2d8`, bei gleicher Größe (291k gegen 288k Crops) und gleicher Batch. Da
  `piece_acc` am stärksten einbrach und Identität aus SICHTBAREN Zellen gelernt wird, ist die
  Erwartung, dass die sauberen Bretter tragen — dann wäre die Antwort nicht „weniger", sondern
  „anders gemischt".

## Der Latch: gefixt, und was daran noch offen ist (2026-08-26)

`alarmMinS` (1,5 s) macht aus dem Beobachtungs-Zaehler die Dauer, die sein KDoc immer behauptet
hat. Gemessen: `153751` 9/26/0 → **35/0/0**, `154327` 10/107/0 → 64/53/11, fuenf weitere Aufnahmen
unveraendert. Offen:

- **Der Scorer zaehlt Versatz als Erfindung.** Auf `154327` stehen 7 der 11 „erfundenen" Zuege
  gleichzeitig in der Verpasst-Liste — richtig gespielt, nur nach einem fehlenden Zug verschoben.
  Echte Erfindungen: `d4`, `d3` (und `Rd8` gegen gelabeltes `Rhd8`, derselbe Zug). Wer die Zahl
  „11 Phantome" ohne diese Aufteilung zitiert, trifft eine falsche Entscheidung.
- **Der Latch hat weiterhin keinen Ausweg ausser einem Menschen.** Das ist der naechste Schritt und
  betrifft alle drei Engines: ein Alarm, der zu Recht steht, sperrt die Aufnahme bis zum Resync.
- **`CnnTick.kt` traegt zwei Detekt-Befunde** (`evaluationDue` 4 Rueckgaben, `DoubleNegativeLambda`)
  aus dem Takt-Commit. Nicht angefasst, aber sie blockieren `:core-engine:detekt`.

## Die dritte Engine — was noch offen ist (2026-08-26)

`:engine-changeset` steht, gemessen und dokumentiert in `docs/engine-changeset.md`. Offen:

- **Mehrdeutige Routen kosten Züge.** Drei Wege derselben Dame zum selben Feld teilen keinen
  ersten Zug, also committet nichts. Die beste zu raten wurde probiert und kostete 2 Phantome
  (`11-55-19`). Denkbarer Ausweg: die STELLUNG re-ankern, ohne Zugzeilen zu erfinden — dann
  zählen die Plies als verpasst statt als erfunden, und die Verfolgung läuft weiter.
- **Ein verlorener Ply dreht die Zugfarbe** und macht die halbe Suche unbrauchbar. Betrifft alle
  drei Engines. Bisher nur über `ResyncToBoard` zu heilen.
- **`wantsRead()` ignoriert das Wiederholungslimit, das `due()` durchsetzt** (Engine 2 und 3).
  Kostet Inferenzen, keine Korrektheit — aber es ist Strom.
- **Der Prior aus dem alten Tracker ist ungenutzt.** `Expected.possibleLabels` + `applyPrior` +
  `invalidMass` würden unmögliche Klassen wegdrücken (`d4:bQ@1.00`, wo die schwarze Dame auf `d8`
  steht). Hindernis: `possibleLabels` läuft mit einem Halbzug und expandiert breit — Tiefe 6, die
  Engine 2 erklärt, ist rechnerisch nicht zu haben. Für Engine 3 weniger dringend, weil sie
  Identität ohnehin nicht befragt.
- **`:tracker-runtime:detekt` scheitert mit 10 vorbestehenden Befunden** (u. a.
  `CnnCropAdapter.cropFrameSource` 66 Zeilen). Nicht von diesem Umbau, aber es blockiert das Gate.
- **Das Coverage-Gate für DIESE Kamera ist geerbt, nicht gemessen.** `c8d1-seed43` trägt 0,15 aus
  der `real13`-Familie. Live standen `e1`/`g1` dauerhaft als verdeckt.

## Erledigt — das Ergebnis in einer Zeile

Die Langfassungen stehen in `docs/` und in der Git-Historie; hier bleibt nur, was sie GEMESSEN
haben, damit niemand dieselbe Frage nochmal stellt.

- **Linse gegen Mesh (2026-08-21):** roher Brett-Bogen 15,2–16,6 px, Gitter-Mesh allein 0,9–1,1,
  gefittete Linse allein 3,0–4,4, beides 0,4–0,7. Auf 116 px Zellbreite ist ein Pixel unter einem
  Prozent — die Linse ist den Fit pro Aufnahme nicht wert. Der Store wird stattdessen einmal
  geradegezogen (`realgames.straighten_boards`). Der ganze `calib.npz`-Pfad ist weg: er löste aus
  vielen Brett-POSEN, die ein fester Aufbau nicht liefern kann.
- **SAM 3 unter autocast (2026-08-23):** fp16 bringt **5,72×** auf dem Produktionspfad
  (2,866 → 0,501 s/Frame), über 150 Frames abgesichert — 0 von 9 600 Coverage-Zellen kippen.
