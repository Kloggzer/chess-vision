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
