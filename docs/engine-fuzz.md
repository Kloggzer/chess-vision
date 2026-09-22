# Erreichbarkeit ohne Bilder — der synthetische Engine-Fuzzer (2026-09-20)

## Warum

Das Knopf-Screening (`scripts/screen_knobs.py` + `scripts/screen_report.py` — das hier genannte
`docs/knopf-screening.md` hat es nie gegeben, geprueft 2026-09-22 auch gegen die Git-Historie)
fand 13 Knöpfe, die an beiden Rändern ihres
plausiblen Bereichs **keinen einzigen Frame** anders machen. Das beantwortet aber nicht, ob sie
tot sind: ein Knopf kann stumm sein, weil seine Situation im Material fehlt, weil ein Tor davor
immer zuerst auflöst, oder weil er gar nicht angeschlossen ist. Um das zu trennen, braucht es
Läufe, die man zu Tausenden fahren kann — also ohne Video, ohne Warp, ohne Inferenz.

## Der Treiber

`FrameInput` trägt die drei teuren Größen als blanke Zahlen:

```kotlin
val motionRoiScore: Double
val gridLineCoverage: Double
val lumaPreClahe: Double
```

Die muss niemand rendern. `EngineFuzz.kt` fährt `TrackerEngine` direkt: ein synthetisches Brett
(Feldfarben, Figuren als Helligkeitsversatz, Hand als dunkle Felder), eine feste legale Zugfolge,
und Beobachtungen aus `observationFromProbs` — dieselbe Funktion, die die echte Pipeline nutzt,
nur mit gesetzten statt gerechneten Wahrscheinlichkeiten.

Gemessen: **rund 0,4 s je Lauf** gegen 12,5 s für ein Replay mit warmem visuellem Cache und 42,7 s
ohne, also **30× bis 100× billiger**.

## Zwei Fallen, beide gemessen

**Die Textur darf nicht je Frame würfeln.** Der erste Entwurf zog das Rauschen aus
`(seed, seq)`. Damit war jedes Bild maximal verschieden vom vorigen, die Engine sah in jedem Frame
das ganze Brett wechseln und stand dauerhaft auf `moving` — 0 von 6 Halbzügen committet. Ein
ruhendes Brett muss bytegleiche Frames liefern.

**Ein Rauschfeld für alle Füllungen ist schneller und falsch.** Der zweite Entwurf zog EIN Feld je
Lauf und addierte nur den Helligkeitsversatz. Dann ändert eine ankommende Figur die Struktur
nicht, der Census liest einen Schatten statt einer Figur — wieder null Commits. Es braucht ein
Feld **je Füllung**; das ist immer noch O(1) je Frame, weil es sechs Füllungen gibt.

**Figuren dürfen nicht alle heller sein als das leere Feld.** `BaselineOcclusion.isOccluder`
wertet `curMeans[i] >= refMeans[i]` konservativ als Verdeckung. Mit durchweg hellen Figuren blieb
der Lauf nach drei Zügen in „waiting for occluded squares to clear" stehen. Seitdem trägt das
Brett Feldfarben, weiße Figuren sind heller, schwarze dunkler.

Alle drei hängen an `EngineFuzzTest`: der Test prüft, dass die Engine die synthetischen Züge
wirklich **committet**. Ohne ihn meldet ein kaputter Treiber jeden Zustand als unerreichbar und
sieht dabei grün aus.

## Die Hülle

Ein Fuzzer, der `motionRoiScore = 0.9` auf ein stehendes Bild setzt, beweist nur, dass der Code
den Zustand HAT. Ob die Eingabe vorkommt, sagt der Korpus: die 1 066 309 Trace-Frames des
Screenings tragen denselben Eingabevektor je Frame. Gemessen auf den BASIS-Armen (11 001 Frames):

| Achse | min | p01 | Median | p99 | max |
|---|---|---|---|---|---|
| `motion` | 0,000 | 0,000 | 0,469 | 30,116 | 99,992 |
| `gridCoverage` | 0,000 | 0,714 | 1,000 | 1,000 | 1,000 |
| `cnnCoverageMax` | 0,000 | 0,000 | 0,003 | 1,000 | 1,000 |
| `cnnHandSquares` | 0 | 0 | 0 | 35 | 47 |
| `cnnAgeMs` | −1 | 0 | 0 | 34 | 41 |
| `stableFrames` | 0 | 0 | 0 | 186 | 220 |

Die Achsen sind **nicht unabhängig**: niedrige `gridCoverage` kommt nur zusammen mit hoher
`motion` vor — eine Hand, die die Linien verdeckt. Wer die Ränder einzeln zieht, baut Szenen, die
es nicht gibt. `Envelope` hält vorerst nur die Ränder; die Kopplung ist notiert, nicht erzwungen.

## Erster Lauf: 2 000 Ziehungen, 717 s

Gegen die BASIS-Arme des Korpus (11 001 Frames). `max` ist die hoechste Haeufigkeit, die EINE
Ziehung erreicht hat.

| Zustand | Korpus | Fuzzer |
|---|---:|---:|
| `gate:dark` | **0** | **829** |
| `gate:moving` | 5 991 | 876 |
| `gate:detect` | 3 050 | 297 |
| `gate:settling` | 1 936 | 268 |
| `gate:occluded` | 24 | 119 |
| `stuck:too_many_changed` | 311 | 577 |
| `stuck:no_legal_move` | 1 048 | 276 |
| `stuck:occluded` | 84 | 248 |
| `stuck:cnn_desync` | 8 | 484 |
| `verify:confirmed` | 5 283 | 533 |
| `verify:resynced` | 4 856 | **0** |
| `verify:ghost` | 397 | **0** |
| `verify:verifying` | 181 | **0** |
| `verify:shadow` | 58 | **0** |
| `verify:overruled` | 0 | **0** |

Zwei Luecken, in entgegengesetzte Richtungen.

**Der Fuzzer erreicht einen Zustand, den der Korpus nie zeigt — und das ist ein TOTER PFAD
(korrigiert 2026-09-20).** `gate:dark` feuert 829-mal im Fuzzer und in 1 066 309 echten
Trace-Frames kein einziges Mal. Ich habe das zuerst als "erreichbar, nur nicht in diesem
Material" gelesen. Falsch: die Bedingung steht ZWEIMAL, auf derselben Groesse und derselben
Schwelle.

| | Ort | Bedingung | Folge |
|---|---|---|---|
| zuerst | `FramePipeline.darkNote` | `config.darkLumaThr > 0 && luma < config.darkLumaThr` | `FrameResult.Skipped` — **kein `FrameInput`** |
| danach | `FrameLoop` | `cfg.darkLumaThr > 0 && input.lumaPreClahe < cfg.darkLumaThr` | `Skip(SKIP_DARK)` = `gate:dark` |

Beide messen `lumaPreClahe`, beide lesen dasselbe Konfigurationsfeld. Ein Frame, der die zweite
Bedingung erfuellen wuerde, hat die erste schon getroffen und ist verworfen worden. **Das Tor der
Engine kann im Produkt nicht feuern.** Der Fuzzer erreicht es nur, weil er die Engine-Naht direkt
faehrt und die Pipeline umgeht.

Damit ist `darkLumaThr` der erste belegte Fall der Kategorie, nach der die ganze Untersuchung
suchte: nicht "seltene Situation", nicht "Tor davor loest zuerst auf", sondern **dieselbe Pruefung
zweimal, die zweite unerreichbar**. Ob die redundante Wache bleiben soll, ist eine Entscheidung
und keine Messung — sie kostet nichts und traegt, falls die Engine je aus einer anderen Quelle
gefahren wird. Genau das tut der Fuzzer.

**Was das ueber die Methode sagt:** Erreichbarkeit an der Naht ist NICHT Erreichbarkeit im
Produkt. Ein Fuzzer, der unterhalb eines Filters ansetzt, findet Zustaende, die es im Betrieb
nicht gibt. Jeder positive Fund gehoert deshalb gegen die vorgelagerte Kette geprueft.

**Wichtiger ist die Luecke andersherum: der Fuzzer erreicht `verify:resynced` nie, obwohl der
Korpus 4 856 davon traegt** — es ist dort der zweithaeufigste Verify-Zustand ueberhaupt. Dasselbe
fuer `ghost`, `verifying` und `shadow`. Damit ist der Treiber als Erreichbarkeits-Orakel **noch
nicht gueltig**: seine Nullen sind kein Befund, sondern seine eigene Luecke. Solange er die
Zustaende nicht reproduziert, die das echte Material nachweislich erzeugt, darf aus einer Null
nichts geschlossen werden.

Das ist zugleich das Abnahmekriterium: **die Zustands-Vokabel des Korpus ist die Eichung.** Erst
wenn der Fuzzer sie trifft, taeugt ein Nicht-Erreichen als Aussage.

Wo er heute schon traegt, traegt er deutlich: `stuck:cnn_desync` steht im Korpus bei 8 Frames und
im Fuzzer bei 484, `gate:occluded` bei 24 gegen 119. Fuer genau diese Knoepfe — die stummen —
liefert die synthetische Bahn also mehr Gelegenheiten als der ganze Screening-Satz, und das
60-mal billiger.

## Der Sensor ist nicht die Sprosse (2026-09-20, gemessen)

Nach der Korrektur blieb `verify:shadow` auch ueber **5 000 Ziehungen bei null**. Die naheliegende
Lesart — der Schatten-Sensor sei tot — ist falsch. `TrackerStatus.shadowVetoed` trennt die beiden
Faelle, und gemessen ueber 400 Ziehungen:

| Achse | Treffer |
|---|---:|
| `veto:shadow` (das Veto feuert) | **51/400** |
| `veto:occlusion` | 20/400 |
| `verify:shadow` (die Leiter loest so auf) | **0/5000** |

Das Veto ist also in jeder achten Ziehung aktiv; was nie passiert, ist dass die Verify-Leiter
darauf ENDET. Der Korpus sagt dasselbe: 58 `verify:shadow` auf 11 001 Frames, waehrend Schatten
dort alltaeglich sind.

**Wer einen Sensor fuer tot erklaeren will, muss den Sensor messen, nicht seinen Ausgang.** Eine
Sprosse der Leiter ist ein SELTENES ERGEBNIS, kein Sensor — sie bleibt leer, weil vorher etwas
anderes aufloest. Genau die Klasse, die das Screening nicht von echter Stummheit trennen konnte.

Offen bleibt `verify:overruled`: null im Korpus (ausser unter entschaerfter Bewegungserkennung,
dort 332) und null in 5 000 synthetischen Ziehungen.

## Was der Ansatz NICHT kann

Fuzzing findet einen Pfad, es schließt ihn nie aus. Ein Zustand, den 2 000 Ziehungen nicht
erreichen, ist **nicht bewiesen tot** — er ist ungefunden. Wer Totstellen beweisen will, braucht
symbolische Ausführung (Pfadbedingung UNSAT), und die skaliert über eine Schleife von tausend
Frames nicht.

Und die Zufallssuche hat kein Gefälle: ein Zustand, der nie feuert, gibt ein Ja/Nein-Signal ohne
Richtung. Die Literatur löst das auf beiden Seiten gleich — AFLGo über die **Distanz** im
Aufrufgraphen, S-TaLiRo über die **Robustheit** der Bedingung. Für uns hieße das: statt „feuerte
`overruled`" den minimalen Abstand zur Verzweigungsbedingung über den Lauf. Das ist der nächste
Schritt und noch nicht gebaut.

## Einordnung in die Literatur

- **AFLGo** (Böhme et al., CCS 2017) — gerichtetes Greybox-Fuzzing auf Zielstellen.
- **Targeted PBT** (Löscher & Sagonas, ISSTA 2017) — Suchstrategie statt Zufallsgenerator; das
  Gegenstück für reellwertige Knöpfe.
- **Zest / JQF** — Coverage- UND Validitäts-Feedback; genau unser Hüllen-Problem.
- **S-TaLiRo / Breach** — Falsifikation reaktiver Systeme über einen parametrisierten
  Eingaberaum. Das ist die Form, die unserem Problem wirklich entspricht.

Keine dieser Bibliotheken ist eingebunden. Die Suche in `FuzzSearch.kt` ist eine Zufallssuche;
`scripts/optimise_knobs.py` trägt bereits Constrained-TPE über denselben Parameterraum, und
Erreichbarkeit ist dieselbe Suche mit anderem Ziel.

## Bedienung

```
desktop fuzz [laeufe] [seed] [out=<datei>]
```

Lädt kein OpenCV und braucht keine Aufnahme. Ausgabe: je Engine-Zustand die höchste erreichte
Häufigkeit und die Szene plus Konfiguration, die sie erzeugt hat.


## Wo der Treiber gegenueber der echten Kette luegt (Review 2026-09-20)

Eine unabhaengige Durchsicht hat Stellen gefunden, an denen der synthetische Treiber Eingaben
erzeugt, die die reale Pipeline nie erzeugt — oder umgekehrt. Sie begrenzen, was ein Befund wert
ist, und stehen hier, damit niemand mehr aus ihnen schliesst als drinsteckt.

**Gemessen und bestaetigt:**

- `motionRoiScore` ist vom Bild UND von `motionPxThr`/`motionMargin` entkoppelt. Die echte Kette
  rechnet ihn in `RoiMotion` aus genau diesen zwei Knoepfen und dem Bild. Folge: `fuzz check`
  kann die Wirkung von zwei der sechs Champion-Knoepfe auf den echten Sensor nicht pruefen, und
  der Treiber kann bytegleiche Bilder mit beliebigem Ausschlag liefern.
- `corners` steht fest, `timestampMs` steigt exakt um 33 ms: Ecken-Spruenge und Bildraten-Jitter
  kommen nicht vor. Der Warp faellt nie aus, fehlende Marker gibt es nicht.
- `board` bleibt `null`, die Rausch-, Fokus- und Belichtungsleser ausserhalb der Engine laufen
  also nicht mit.

### Behoben (2026-09-21)

Was oben stand und inzwischen stimmt — mit dem Beleg, denn zweimal habe ich einen Fix behauptet,
der nicht im Code stand:

| Befund | Stand | Beleg |
|---|---|---|
| `motionRoiScore` frei gesetzt | misst mit dem echten `RoiMotion` | `motionPxThr=200` bewegt `veto:shadow` 464 -> 176 |
| verdeckte Zuege nicht unter der Hand | Hand liegt ueber den Zugfeldern und wandert | `gate:occluded` 0 -> 115 |
| Schnappschuesse nach dem Frame | vor dem Frame, wie `EngineHost` | — |
| `pOccluded` binaer | abgestuft ueber `handCover` | `pOccludedThr=0.95` drueckt `veto:occlusion` 345 -> 162 |
| `gridOccluded` immer 0 | beide Arme EXKLUSIV ueber `coverageModel` | wie am Geraet: `runGridOcclusion = coverageOutput != true` |
| `state:*` als Frame-Anteil | Strich statt Zahl | in der Ausgabe geprueft |
| nativer `Mat` leckte | im `finally` | — |

**Die Lehre aus den zwei falschen Behauptungen:** eine Vorgabe zu aendern nuetzt nichts, wenn der
Aufrufer sie ueberschreibt (`gridArm` wurde vom Sampler weiter auf `true` gezogen), und eine
Ersetzung im Patch-Skript, die still nicht greift, wird zur Falschaussage im Protokoll. Beides
kam aus der Durchsicht, nicht aus meinem eigenen Blick.


## Die Bewegung kommt jetzt aus den Pixeln (2026-09-20, nach dem Review)

Der schwerste Vorwurf der Durchsicht war, dass `motionRoiScore` eine freie Zahl war: entkoppelt
vom Bild UND von `motionPxThr`/`motionMargin`. Damit konnte `desktop fuzz check` zwei der sechs
Champion-Knoepfe nicht pruefen — ausgerechnet die, an denen das Veto haengt.

Behoben: der Treiber rendert in einen `Mat` und misst mit dem **echten** `RoiMotion`. Dafuer
musste die Hand WANDERN statt als Block zu stehen — aus einem stehenden Bild entsteht keine
Bewegung. `motionPeak`/`motionFloor` sind ersatzlos raus; ein Szenenparameter ohne Wirkung ist
eine Luege. An ihrer Stelle steht `handSpeed`, die Felder je Frame.

Nachgewiesen an `fuzz check`:

| | `veto:shadow` | `veto:occlusion` | `gate:occluded` |
|---|---:|---:|---:|
| Vorgabe | 464 | 354 | 115 |
| `motionPxThr=200` | 176 | 642 | 160 |

Vorher bewegte derselbe Knopf **gar nichts**.

### Und damit faellt eine zweite eigene Behauptung

Ich hatte `gate:occluded = 0` gemeldet und auf die Kopplung `motionPxThr * 4` geschoben. Die
Kopplung ist real (Schwelle 80 -> 138,176), aber die Null war **ueberwiegend mein Treiber**: die
Hand lag als starrer Block ab `a1`, waehrend die Zuege anderswo stattfanden. Seit sie ueber den
Zugfeldern liegt und wandert, steht `gate:occluded` bei 115 in den Wach-Szenen und bei 9,35 % der
Frames in der Suche.

Der Kostenpunkt: ein Lauf kostet jetzt 1,21 s statt 0,33 s, weil je Frame ein 160er-Warp
dazukommt. Gegen ein Replay mit warmem Cache (12,5 s) bleiben das **10x**.

### Stand der Verteilungen, mit echter Bewegung

300 Ziehungen, 60 678 Frames. Anteile sind Frames MIT dem Zustand an allen gefahrenen Frames —
`state:*` sind Uebergaenge und deshalb nicht vergleichbar.

| Zustand | Fuzzer | Korpus |
|---|---:|---:|
| `gate:detect` | 53,5 % | 27,7 % |
| `gate:settling` | 16,3 % | 17,6 % |
| `gate:moving` | 15,0 % | 54,5 % |
| `gate:occluded` | 9,4 % | 0,2 % |
| `verify:confirmed` | 15,9 % | 48,0 % |
| `verify:verifying` | 23,7 % | 1,6 % |
| `verify:resynced` | 2,3 % | 44,1 % |
| `verify:ghost` | 3,1 % | 3,6 % |
| `gate:dark` | 5,9 % | 0 % (unerreichbar, s. o.) |

`verify:ghost` trifft der Fuzzer jetzt fast genau. `resynced` bleibt um Faktor 19 zu selten und
`moving` um Faktor 3,6 — die synthetischen Szenen sind kuerzer und ruhiger als eine echte Partie.
Als Orakel fuer "tot" taugt der Treiber deshalb weiterhin nur dort, wo er die Korpuswerte trifft.
