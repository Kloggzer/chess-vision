# Übergabe: Verdeckung als zweiter Ausgang

Was gebaut ist, was gemessen wurde, und was noch fehlt. Für einen Agenten, der die Pipeline
fertigstellt. Hintergrund und Zahlen: `docs/occluder-plates.md`, `docs/sampling.md`.

## Warum es das gibt

Die handmarkierte Klasse `occluded` war nie eine visuelle Klasse. **87,9 %** ihrer Zellen stammen
aus Frames mit 11 oder mehr geflaggten Feldern, und die FEN sagt für **59,9 %** davon `empty` —
12 865 leere Felder, die dem Modell als *besetzt* beigebracht wurden. Gemessener Preis über vier
Folds, gepaart, gleicher Seed:

| | mit `occluded` | ohne |
|---|---|---|
| square_acc | 0,8593 | **0,9129** |
| `wK` | 0,483 | **0,851** |
| Folds verbessert | — | **4 von 4** |

Die Klasse wird trotzdem gebraucht — als Veto, damit kein Zug ausgelöst wird, während eine Hand
über dem Brett liegt. Nur gehört sie nicht in denselben Softmax: eine Zelle trägt ein Label, also
konkurriert „könnte verdeckt sein" mit „das ist ein Bauer" und gewinnt dort, wo das Netz unsicher
ist. Deshalb **ein zweiter Ausgang** und ein **kontinuierliches** Ziel.

## Der Algorithmus, in drei Schritten

### 1. Occluder freistellen (`occluders.py`)

Aus Clips von Händen über einem beliebigen Hintergrund werden RGBA-Kacheln.

- **Plate**: der zeitliche Median über 48 Frames IST der leere Hintergrund — kein Clean Plate muss
  gefilmt werden. Zweistufig, weil eine Hand, die länger als die Hälfte des Clips stillsteht,
  selbst zum Median wird; der zweite Durchgang mittelt nur über Samples, deren Farbe zu **einer
  globalen** Hintergrundfarbe passt, nie zum ersten Median (sonst bestätigt er den Geist).
- **Bühne**: die größte Fläche, deren Chroma der Plate-Mitte entspricht. Keine konvexe Hülle.
- **Matte**: Chroma-Abstand zur Plate, Schwelle **per Otsu je Clip**. Ein Festwert geht nicht — ein
  Schatten verschiebt die Farbe auf gesättigtem Blau stärker (0,18) als auf entsättigtem Oliv
  (0,11), aber Haut verschiebt sie noch weiter (0,62 gegen 0,22).
- **Schatten ist Hintergrund.** Ein beschattetes Feld bleibt lesbar. Ein dunkler Ärmel ist kein
  Schatten: ein Schatten fällt nie unter ~45 % der Plate-Helligkeit.
- **Morphologie darf keinen Schatten annektieren.** `CLOSE` überbrückt Lücken, und ein Schattenband
  am Ärmel ist so eine Lücke — sichere Schattenpixel werden danach wieder ausgestanzt.
- **Kante**: Guided Filter mit dem Graubild als Führung, dann bei `EDGE_CUT` geschnitten. Über 0,74
  frisst er Fingerkuppen.
- **Kamera-Automatik**: `rebalance` rechnet Belichtungs- und Weißabgleichsdrift heraus (gemessen bis
  Faktor 1,405 auf Rot bei 0,771 auf Blau, sobald eine warme Hand ins Bild kommt).

### 2. Auflegen (`composite.py`)

- Der Occluder kommt auf das **Quellbild**, nicht auf das entzerrte Brett: eine echte Hand liegt
  über der Brettebene, die Homographie verzerrt sie also. Wer nach dem Warp einkopiert, bekommt
  eine Hand, die perfekt in der Ebene liegt — und die gibt es in echt nicht.
- Die Alpha läuft durch **denselben** Warp mit.
- Position, Winkel und Spiegelung sind gewürfelt; es muss kein plausibler Griff sein, nur eine
  plausible Verdeckung. **Die Größe nicht**: die Occluder-Clips entstanden auf demselben Rig, also
  ist der Maßstab `Bildkante / WORK_SIZE * RIG_SCALE`. Die Kachel wird beim Laden auf ihre
  Alpha-Ausdehnung beschnitten, sonst bezieht sich der Faktor auf die leere Bühne.
- **Mesh**: ein Mesh für den ganzen Clip, der Median über 40 Frames. Der Einzelframe-Fit setzt die
  Linien der Grundreihe auf die hohen Figuren statt aufs Brett.
- **`margin` nie selbst setzen** — `load_profile("desktop")` als Basis nehmen und nur `frame_size`,
  `board_size`, `crop.out_size` ersetzen. Mit `margin=0` gilt der Beschriftungsrand als Brett, jeder
  Crop sitzt daneben und der Grid-Fit findet gar nichts.
- Die Überdeckung wird mit **demselben `crops_for_frame`-Aufruf** aus der Alpha geschnitten wie das
  Bild. Damit IST die Label-Region die Crop-Region, Mesh und Pads eingeschlossen.

### 3. Trainieren (`training/occlusion.py`)

Ein Ausgang mehr an derselben linearen Schicht: `logits[:, :-1]` sind die Figuren, `logits[:, -1]`
ist die Verdeckung. Eine Ausgabe, also bleibt der exportierte Graph in Form.

- **BCE gegen den Bruchteil**, nicht gegen ja/nein. Das Compositing kennt ihn exakt, und ein
  kalibrierter Ausgang macht die Veto-Schwelle zum Drehknopf statt zum Neutraining.
- **Der Figurenverlust schaut ab `PIECE_VISIBLE_MAX = 0.15` weg.** Gemessen an komponierten Crops
  mit bekannter Überdeckung: die Genauigkeit auf besetzten Feldern fällt zwischen 0,10 und 0,20 von
  0,62 auf 0,41 und liegt ab 0,30 unter Rateniveau. Die Zelle trainiert weiter den
  Verdeckungsausgang — nur der Figurenkopf ignoriert sie.
- Beide Ziele reisen in **einem** Tensor `(B, 2)`, damit die Trainingsschleife `for x, y in loader`
  unangetastet bleibt.

## Stand

Fertig, getestet, committet:

- `occluders.py` + `chesslab occluders extract` — 215 Kacheln aus drei Clips liegen in
  `data/occluders/plates/`
- `composite.py` + `chesslab occluders composite` — erzeugt Crops mit `coverage` im Manifest
- `training/occlusion.py` + `--head occlusion` — Verlust, Metriken, Datenpfad
- `data/turntable/VID_20260817_214400.mp4` — 4K, 30 fps, ArUco 26/26, 161 px je Feld,
  Grundstellung (Ballkranz auf d1/d8 = Dame, Schlitz auf e1/e8 = König, **nicht** vertauscht)

## Was noch fehlt, in dieser Reihenfolge

1. **Ein zweites Turntable-Video mit anderer Aufstellung.** Das vorhandene trägt nur die
   Grundstellung, also 12 Figurenstellungen. Für den Verdeckungsausgang allein reicht das (dem ist
   die Figur darunter egal), für den Figurenkopf nicht.
2. **Den Compositing-Datensatz bauen** und mit `--head occlusion` trainieren. Der Verdeckungsteil
   kann sofort starten, er braucht Punkt 1 nicht.
3. **Über den echten Korpus laufen lassen.** Das Modell schätzt dann pro Zelle eine Überdeckung.
   Zwei Ergebnisse in einem Lauf:
   - die Antwort auf „wie viele Hände stecken in den nicht-`dirty` Frames?" (Sichtprobe an 40
     Brettern: etwa ein Drittel zeigt Haut — siehe `TODO.md`)
   - Labelvorschläge fürs Web-Tool, damit der Nutzer bestätigt statt pinselt
4. **50 Validierungsframes mit echten Händen**, binär auf Zellebene. Erst danach ist belegt, dass
   der aus komponierten Bildern gelernte Ausgang auf echte Griffe überträgt.

## Fallen, die schon einmal Zeit gekostet haben

- **Kein `__main__`-Guard** in einem Skript mit DataLoader-Workern: Windows importiert das Skript in
  jedem Worker neu und spawnt endlos.
- **Zwei GPU-Prozesse gleichzeitig** haben den Treiber gekillt. Sweeps strikt nacheinander; die
  Totzeit dabei ist konstant **50 s je Lauf** (Prozessstart, nicht Daten).
- **Die Checkpoint-Auswahl ist Rauschen.** `best.pt` und `last.pt` widersprechen sich über die
  Richtung eines Effekts — heute viermal. Jede Aussage auf beiden Checkpoints prüfen und **gepaart
  je Fold** lesen, nicht über Mediane: die Fold-zu-Fold-Streuung ist größer als jeder Effekt.
- **Geometrie- und Initialisierungsfixe stabilisieren, heben aber nicht.** Mesh-Reparatur und
  14-Klassen-Warmstart halbieren die Streuung; das Niveau hob bisher nur bessere Labels.
