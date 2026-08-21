# Occluder-Platten und 2.5D-Compositing

Warum es das gibt, und welche Entscheidungen darin stecken. Code: `chesslab/occluders.py`
(Freistellen) und `chesslab/composite.py` (Auflegen + Label).

## Warum die Klasse `occluded` ersetzt wurde

Die handmarkierte Klasse war keine visuelle Klasse, sondern eine Markierung mit zu grober Körnung.
Gemessen am Korpus (2026-08-17): **87,9 %** aller `occluded`-Zellen stammen aus Frames mit **11 oder
mehr** geflaggten Feldern, 51,4 % aus Frames mit 21 bis 40 — ein Arm verdeckt keine 30 Felder. Was
die FEN unter dem Flag sagt: **59,9 % `empty`**, also 12 865 leere Felder, die dem Modell als
*besetzt* beigebracht wurden, und 8 603 Figurenbeispiele, die dem Klassifikator vorenthalten
blieben.

Folgen, auf dem Fold-2-Testsplit über 3 Seeds gemessen:

| | mit `occluded` | ohne |
|---|---|---|
| Recall `empty` | 0,908 | **0,989** |
| Recall `wP` | 0,579 | 0,807 |
| Recall `wK` | 0,268 | 0,471 |
| Recall `bK` | 0,224 | 0,690 |

Über den **ganzen** Korpus bestätigt (2026-08-18, vier Folds, repariertes Mesh, gleiches Rezept,
gleicher Seed — nur `occluded` unterscheidet sie). Gepaart gelesen, weil dieselben Folds verglichen
werden: **4 von 4 verbessern sich** bei `square_acc` und bei `wK`.

| Fold | sq_acc mit | ohne | wK mit | ohne |
|---|---|---|---|---|
| f0 | 0,8594 | **0,9221** | 0,33 | **1,00** |
| f1 | 0,8592 | **0,9229** | 0,65 | **0,98** |
| f2 | 0,8590 | **0,8784** | 0,64 | **0,72** |
| f3 | 0,8739 | **0,9036** | 0,10 | **0,48** |
| Median | 0,8593 | **0,9129** | 0,483 | **0,851** |

Die Klasse wird trotzdem gebraucht — als Veto, damit kein Zug ausgelöst wird, während eine Hand über
dem Brett liegt. Nur gehört sie nicht in denselben Softmax: eine Zelle trägt ein Label, also
konkurriert „könnte beeinflusst sein" mit „das ist ein Bauer" und gewinnt dort, wo das Modell
ohnehin unsicher ist. Deshalb ein **zweiter Ausgang** und ein **kontinuierliches** Ziel.

## Freistellen ohne Green Screen

- **Kein Clean Plate nötig.** Die Kamera steht fest, der Arm bewegt sich: der zeitliche Median über
  die Frames IST der leere Hintergrund. Zweistufig, weil eine Hand, die länger als die Hälfte des
  Clips an derselben Stelle steht, selbst zum Median wird — der zweite Durchgang mittelt nur über
  Samples, deren Farbe zu **einer globalen** Hintergrundfarbe passt, nie zum ersten Median.
- **Chroma statt Farbton.** Getrennt wird über den Abstand der Farbrichtung zum Hintergrund, die
  Schwelle bestimmt Otsu je Clip. Ein Festwert geht nicht: ein Schatten verschiebt die Farbe auf
  gesättigtem Blau stärker (0,18) als auf entsättigtem Oliv (0,11) — aber Haut verschiebt sie noch
  weiter (0,62 gegen 0,22), der Abstand ist also größer, er sitzt nur woanders.
- **Schatten ist Hintergrund.** Ein beschattetes Feld bleibt lesbar; würde der Schatten als
  Verdeckung zählen, wäre die Überflaggung wieder da, die das Ganze ersetzen soll.
- **Zusätzliches Licht auch.** Der Spiegelsatz dazu, und er hat gefehlt: eine Helligkeitsschwelle
  (`ratio > 1.3`) hielt im letzten Fünftel von `230602` die beleuchtete Matte fest, als eine Lampe
  darüberstrich — 88 % einer Kachel war Hintergrund, auf einem Frame ganz ohne Hand. Global rechnet
  `rebalance` so etwas heraus, ein lokaler Lichtstreifen bleibt aber stehen. Der Zweig ist raus; die
  beiden sauberen Clips verlieren dadurch unter 0,2 % der Fläche, weil ein Objekt, das heller ist
  als der Hintergrund UND dieselbe Farbe hat, praktisch nicht vorkommt.
- **Dunkler Ärmel ≠ Schatten.** Ein Schatten nimmt nur Licht weg und fällt nie unter etwa 45 % des
  Hintergrunds; darunter ist es ein Objekt. Gemessen: leeres Tuch 118, schwarzer Ärmel 20–26,
  Restschatten 39–61.
- **Morphologie darf keinen Schatten annektieren.** `CLOSE` überbrückt Lücken, und ein Schattenband
  am Ärmel ist so eine Lücke — es wird erst korrekt verworfen und danach wieder eingesammelt.
  Deshalb werden sichere Schattenpixel nach der Morphologie ausgestanzt.
- **Doppelte Posen** werden über die IoU verworfen, und zwar auf 1/8 verkleinerten Silhouetten.
  Gemessen: der Vergleich in voller Auflösung kostet bei 500 gehaltenen Posen 823 ms gegen die
  konstanten 360 ms des Schnitts selbst und wächst weiter; über 3 160 echte Kachelpaare verschiebt
  die Verkleinerung die IoU um höchstens 0,006 und kippt am Schnitt 0,85 keine Entscheidung.

## SAM 3 statt Chroma — geprüft und verworfen (2026-08-21)

Der Chroma-Schnitt lebt davon, dass die Bühne einfarbig ist. SAM 3 braucht das nicht, also lag
nahe, die Kacheln damit zu schneiden. Gebaut, gemessen, wieder entfernt — hier steht, was dabei
herauskam, damit es niemand ein zweites Mal baut.

**Was für SAM 3 sprach.** Auf denselben Frames geschnitten (`occluders.alpha_of` gegen SAM 3, damit
beide dasselbe Bild bekommen) deckte SAM 3 30–60 % mehr Fläche ab und traf die Ränder an Ärmel und
Uhr präziser. Es braucht keine einfarbige Bühne, also auch keine Aufnahme-Disziplin.

**Was dagegen sprach.** 3–4 s je Bild auf der GPU gegen Millisekunden für Chroma — ein voller Lauf
über die drei Clips wären bei Schrittweite 4 rund 2,4 Stunden. Ein Blindtest über 13 Zeilen ergab
kein klares Urteil: manchmal identisch, manchmal SAM 3 leicht besser.

**Was dabei über die Daten gelernt wurde, und weiterhin gilt:**

- Die Kachel wird auf die BÜHNEN-Box beschnitten, nicht auf die Hand. Die Matte füllt das Bild aber
  nicht (58 % bei zwei Clips, 73 % beim dritten), also wird jede Hand, die über die Mattenkante
  hinausragt, dort abgeschnitten. Gemessen: `222655` 37/472, `224656` 0/506, **`230602` 456/456**.
- `230602` ist in seiner zweiten Hälfte fast durchgehend leer — was die Kacheln von dort erklärt.
- Die Konzept-Union hat Nähte (Uhr gegen Arm) und der Ring kerbt den Finger ein. Beides ist
  reparierbar (`ring` als Konzept, kleine Löcher füllen), aber Löcher-Füllen nach Topologie allein
  ist FALSCH: eine zur Schlaufe gekrümmte Hand schließt Hintergrund ein, und der muss offen bleiben.

## Aufnahme

Fest aufgestellte Kamera aus Brettposition, Hintergrund formatfüllend, **gleichmäßig ausgeleuchtet**
(ein harter Schattenwurf ist der einzige Fall, den die Trennung nicht schafft), Belichtung und
Weißabgleich sperren. Ohne Sperre rechnet `rebalance` den Drift heraus — gemessen bis Faktor 1,405
auf Rot bei 0,771 auf Blau, sobald eine warme Hand ins Bild kommt.

## Auflegen

Der Occluder kommt auf das **Quellbild**, nicht auf das entzerrte Brett: eine echte Hand liegt über
der Brettebene, die Homographie verzerrt sie also, und wer nach dem Warp einkopiert, bekommt eine
Hand, die perfekt in der Ebene liegt. Die Alpha läuft durch denselben Warp mit.

Position, Winkel und Spiegelung sind gewürfelt — es muss kein plausibler Griff sein, nur eine
plausible Verdeckung. **Die Größe nicht:** die Occluder-Clips entstanden auf demselben Rig wie das
Brett, nur mit näherer Kamera. Der Maßstab ist deshalb `Bildkante / WORK_SIZE * RIG_SCALE`, und die
Kachel wird beim Laden auf ihre Alpha-Ausdehnung beschnitten, damit sich der Faktor auf die Hand
bezieht und nicht auf die leere Bühne.

Gemessen wird über den **Crop**-Ausschnitt, geschnitten mit `crops_for_frame` — demselben Aufruf,
der auch das Bild schneidet. Damit ist die Label-Region per Konstruktion die Crop-Region, Mesh und
Pads eingeschlossen, und genau die Körnungslücke von oben kann nicht zurückkommen.

---

## Was der gelöschte Vorschlags-Produzent gemessen hat (`specs/53`, 2026-08-09)

> ⚠ **Das Werkzeug existiert nicht mehr.** `src/chesslab/occluded.py` (512 Zeilen) und
> `realgames propose-occluded` sind am 2026-08-19 mit `fbbe5a34` gelöscht worden — der Pixel-Score
> gegen den Intervall-Median ist durch die SAM-3-Alpha ersetzt, der Modell-Kanal heißt jetzt
> `realgames model-read`, und der Rillen-Kanal lebt als `src/chesslab/grid_occlusion.py` im
> Frame-Scan weiter. `fbbe5a34` parkte die 42 alten Vorschlagsdateien (131 MB) nach
> `data/_parked/occluded-proposals-2026-08-19/` — dieses Verzeichnis ist im aktuellen
> Arbeitsverzeichnis **nicht mehr da**. Die Zahlen unten sind **historisch** und stehen
> hier, weil sie die einzige Präzisionsmessung sind, die es zu diesem Übergang gibt.

Erzeugt wurden 126 720 Vorschläge über beide Sessions, 1 410 bei `hi 0.7`:

| Session | Zeilen | `occluded` @0,7 | p50 | p90 | p99 | >0,5 | =1,0 | ungültig |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| rg-rec-20260808-003957 | 48 640 | 495 (1,02 %) | 0,015 | 0,230 | 0,701 | 1 748 | 41 | 0 |
| rg-rec-20260808-115912 | 78 080 | 915 (1,17 %) | 0,011 | 0,242 | 0,719 | 2 872 | 148 | 0 |

### Die 30-Zellen-Konfusionstabelle (`hi = 0.7`, `lo = 0.3`)

30 Zellen, `numpy`-Seed 42, geschichtet über die drei Score-Bänder (12/9/9) über **beide** Sessions,
jede aus dem Session-Frame durch denselben Warp gerendert, den der Scorer benutzt (Zelle plus
1,5 Zellen Halo, Zelle umrandet), und per Augenschein klassifiziert. Die Review-PNGs unter
`data/realgames/*/frames/` wurden **nicht** benutzt: deren Farbverdikt-Overlay verdeckt genau die
Pixel, auf denen die Entscheidung ruht. Das Schichten nach Band ist es, was Präzision bei `hi`
direkt schätzbar macht — Band A ist eine gleichverteilte Ziehung aus `score > hi`.

| Band | n | occluder | shadow | clean |
|---|---:|---:|---:|---:|
| A: score > 0,7 (Vorschlag `occluded`) | 12 | **12** | 0 | 0 |
| B: 0,3 < score ≤ 0,7 (Tinder-Band der UI) | 9 | 8 | 0 | 1 |
| C: score ≤ 0,3 | 9 | 0 | 0 | 9 |

**precision(occluder | score > 0,7) = 12/12 = 1,00**, über der 0,9-Latte. `lo = 0.3` bestätigt sich
von der anderen Seite: Band C ist 9/9 clean.

Zwei ehrliche Einschränkungen, und beide gelten weiter:

- **Recall bei `hi` ist niedrig.** Band B ist 8/9 occluder — die meisten verdeckten Zellen sitzen im
  Review-Band, nicht im Vorschlag. Der Trade ist hier richtig (ein falsches `occluded` vergiftet das
  Training, ein Miss lässt nur das FEN-Label stehen), aber die `hi`-Menge allein ist nicht die Klasse.
- **In 30 Ziehungen kam kein einziges `shadow` vor.** Die benannte Falsch-Positiv-Klasse ist nicht
  aufgetreten, also ist die Schatten-Invarianz des Census-Kanals **durch diese Tabelle ungetestet** —
  belegt nur durch den synthetischen Vertrag in `tests/test_realgames.py`.

## Der Rillen-Sensor: Auflösung ist tragend, und c8 ist der stehende Falsch-Positive

Der modellfreie Hand-Sensor (`core-geometry/GridOcclusion.kt`, Python-Spiegel
`src/chesslab/grid_occlusion.py`) hält den bandweisen Rillen-Read des Alignment-Fits **pro Segment**
statt ihn zu Linien einzusammeln: 2 Achsen × 9 Linien × 8 Bänder = ein Segment je Feldkante, ein Feld
liest `occluded` ab **2 fehlenden Kanten**.

- **Auflösung entscheidet:** im vollen Crop-Warp **2 / 11 / 2** fehlende Segmente auf
  sauber / Hand / sauber (die 11 exakt unter der Hand geclustert); bei **detSize 30–40 von 144**
  ersäuft das Signal. Der Sensor wird deshalb dort gestempelt, wo die Crops geschnitten werden.
- **Der stehende Falsch-Positive:** auf `VID_20260802_222741` liest **ein** Feld — c8, eine Figur,
  die über ihre eigenen Rillen lehnt — auf **73 % aller Frames** geflaggt, minutenlang am Stück.

Daraus die Gate-Regel, gemessen gegen beide Versagensarten (`specs/53`, 2026-08-10):

| Gate-Regel | 003957 (67-Ply-Referenz) | 222741 (keine Referenz; ohne Gate 28) |
|---|---|---|
| jedes Flag (Rohkarte) | **67/67, 0 erfunden** | **0 Plies** — c8 blankt das Replay |
| Zählschwelle ≥ 3 | 39 Plies (`g4` durch den 2-Flag-Schwanz) | 28 |
| **orthogonal benachbartes Paar** | **67 Plies, LCS 65/67** | **28** |

Die abziehende Hand läuft über 2-Flag-Frames aus (h3+h2 — immer Nachbarn), deshalb committet eine
Zählschwelle von 3 genau die Fabrikation, die das Gate verhindern soll. Die Regel ist **räumlich, pro
Observation, ohne Zeitzustand** (`gridHandSquares`, `SQ_NEIGHBOURS`).
