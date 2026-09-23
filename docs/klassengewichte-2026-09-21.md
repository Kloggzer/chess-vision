# Die Klassengewichte stehen über einer anderen Zellmenge als der Verlust (2026-09-21, gemessen)

Der Befund war belegt, aber unbeziffert: `train.py` zählt `vis_counts` nur über
`coverage_of(r) <= PIECE_VISIBLE_MAX`, während `OcclusionLoss.validation_terms` **zusätzlich** mit
`(bright >= dark_min)` multipliziert. Die Gewichte stehen damit über einer größeren Zellmenge als
der Verlust lernt, und weil Dunkelheit nicht gleichverteilt ist, trifft das die Klassen ungleich.

Gemessen auf `real13-mix-v7-128` mit `split-pin.json` — dem Satz, auf den alle jüngsten Läufe
zeigen. Die Nachrechnung trifft die gespeicherten `effective_class_weights` des Laufs Ziffer für
Ziffer, die Messung sitzt also auf dem echten Pfad.

## Wie viel es ausmacht

Train-Split: 427 383 Zeilen, davon coverage-tauglich 376 506. Die Helligkeitsmaske nimmt davon
**6 900 weitere weg = 1,83 %**.

| Klasse | dunkel % | Gewicht alt | Gewicht neu | Abweichung |
|---|---:|---:|---:|---:|
| bN | 4,51 | 1,7700 | 1,8196 | **+2,80 %** |
| bP | 3,85 | 0,4383 | 0,4475 | +2,10 % |
| bR | 2,87 | 1,4273 | 1,4425 | +1,06 % |
| bB | 2,72 | 1,5606 | 1,5748 | +0,91 % |
| empty | 1,84 | 0,2936 | 0,2937 | +0,03 % |
| bK | 0,99 | 2,7136 | 2,6906 | −0,85 % |
| bQ | 1,04 | 3,2586 | 3,2323 | −0,81 % |
| wQ | 0,59 | 3,4009 | 3,3583 | −1,25 % |
| wP | 0,46 | 0,4523 | 0,4460 | −1,39 % |
| wB | 0,38 | 1,6272 | 1,6034 | −1,46 % |
| wR | 0,27 | 1,4307 | 1,4083 | −1,57 % |
| wK | 0,25 | 2,8225 | 2,7778 | −1,58 % |
| wN | 0,20 | 1,7912 | 1,7619 | −1,64 % |

**Die Erwartung bestätigt sich, und der Mechanismus ist direkt gemessen:** alle sechs schwarzen
Figurenklassen sind heute unterbewertet, alle sechs weißen überbewertet. Der Dunkelanteil nach
(Figurenfarbe × Feldfarbe) ist **schwarz auf dunklem Feld 6,70 %** gegen weiß auf dunklem 1,49 % —
Faktor 4,5 auf demselben Feldtyp. Die zwei Ausreißer gegen das Muster, bQ und bK, stehen auf d8/e8,
und e8 ist ein helles Feld.

## Die Empfehlung: nicht dafür allein bauen

Der größte Einzelfehler ist **2,80 %**, rund ein Drittel des bekannten 8-%-Ankers (Gewichte aus
allen statt aus den sichtbaren Zeilen, `CLAUDE.md`). Wichtiger noch: die *Spreizung* der Gewichte —
das, was die Gewichtung überhaupt tut — ändert sich von 11,58× auf 11,43×, also um **1,3 %**.

Der Fix ist ein Einzeiler (`vis_counts` auf `classification_eligible` statt auf `coverage_of`
allein), aber er verschiebt die Gewichte und damit jedes künftige Training. **Empfehlung: beim
nächsten ohnehin anstehenden Rezeptschnitt mitnehmen, nicht dafür allein einen schneiden.**

## Wo der Lichtgradient wirklich sitzt

Nicht die Grundreihen, keine Ecke. Zwei Achsen, in dieser Reihenfolge:

- **Feldfarbe dominiert:** dunkle Felder 3,96 %, helle 0,61 % — Faktor 6,5. Im 8×8-Raster ist das
  ein Schachbrettmuster (b8 7,45 % neben a8 0,60 %).
- **Ferne Bretthälfte:** Reihen 5–8 bei 3,15 %, Reihen 1–4 bei 1,39 %.
- **Linien fast flach** (a 2,59 % bis d 1,82 %).

Spitzenfelder: a5 9,91 %, c5 8,82 %, b8 7,45 %, c7 6,97 %. 105 von 157 Train-Aufnahmen tragen
mindestens eine dunkle Zelle.

Die alte Notiz „h3 bei 156, a7 bei 20" beschrieb einen Helligkeits*gradienten* über das Brett. Was
hier zählt, ist ein anderer Effekt: die Feldfarbe selbst, und erst danach die Entfernung.

## Der eigentliche Defekt liegt woanders

Die 80-px-Datensätze tragen die Spalte **gar nicht**:

| Datensatz | Zeilen | ohne `brightness` |
|---|---:|---:|
| `real13-mix-v7-128` | 979 361 | 0 |
| `real13-test-v1-128` | 213 093 | 0 |
| `real13-mix-v7-80` | 979 363 | **376 640 (38,5 %)** |
| `real13-mix-v6-80-clahe` | 841 521 | **376 640 (44,8 %)** |

Betroffen sind jeweils **alle 138 Komposit-Aufnahmen vollständig**. `brightness_of` liest ein
fehlendes `brightness` bewusst als 255 — die Regel „ausgeschriebenes `null` ist UNGEMESSEN, nicht
dunkel" steht so im Docstring und ist richtig. Die Folge eine Ebene höher kannte aber niemand:
**auf den 80-px-Sätzen ist die Dunkel-Maske für 38,5 % der Zeilen wirkungslos, auf den
128-px-Sätzen für keine.**

Damit lernen die zwei Größen unter **verschiedenen Verlustmasken**. Jeder 128-gegen-80-Vergleich
im Projekt ist davon betroffen — dieselbe Fehlerfamilie wie „Arme mit verschieden geschnittenem
Val sind auf `piece_acc` gar nicht vergleichbar" (`CLAUDE.md`, 2026-08-26). Und der ausgelieferte
Champion `p4a-80-clahe` ist auf einem dieser Sätze trainiert.

Es ist keine Eigenschaft der Größe: wo beide Sätze die Spalte tragen, stimmen die Werte auf 0,01
überein. Es ist eine **Lücke einer Slice-Generation**.

**Zu entscheiden:** ob die 80-px-Sätze neu geschnitten werden (dann tragen sie die Spalte und sind
wieder vergleichbar), oder ob der Unterschied dokumentiert stehen bleibt und jeder
Größenvergleich ihn nennen muss. Ein drittes „später" gibt es nicht — heute ist es das zweite,
nur unausgesprochen.

## Gebaut 2026-09-22 — und der reparierte 80er hat den Effekt verachtfacht

Der Fix steht: `train.visible_class_counts` zählt über `occlusion.classification_eligible`, also
über **genau** die Zellmenge, die `OcclusionLoss` gewichtet. Festgehalten in
`tests/test_bug_hunt_20260922f_gewichte.py` — der Test fragt den Verlust nach seiner eigenen
`visible_count` statt die Formel nachzubauen, und war ohne den Fix rot.

Nachgemessen auf dem heute reparierten Korpus (Punkt 37/41, `real13-mix-v7-80` trägt die Spalte
jetzt lückenlos, 0 statt 376 640 Zeilen ohne `brightness`):

| Korpus | zusätzlich maskiert | größter Einzelfehler | Spreizung alt → neu |
|---|---:|---:|---|
| `real13-mix-v7-128` | 6 900 (1,83 %) | **+2,80 %** (bN) | 11,5834× → 11,4345× (1,30 %) |
| `real13-mix-v7-80` **nach** der Reparatur | 6 900 (1,83 %) | **+2,80 %** (bN) | 11,5834× → 11,4345× (1,30 %) |
| `real13-mix-v7-80` **vor** der Reparatur | 663 (0,18 %) | +0,34 % (bP) | 11,5834× → 11,5591× (0,21 %) |

**Zwei Befunde, und der erste korrigiert die Erwartung im Auftrag:** der Effekt ist *nicht*
gewachsen — die 2,80 % vom 2026-09-21 wurden auf `-128` gemessen, und das war schon der
vollständige Korpus. Der reparierte 80er reproduziert ihn Ziffer für Ziffer, die beiden Größen
rechnen also endlich unter derselben Maske. Auf der **80er-Achse** dagegen ist er von 0,34 % auf
2,80 % gesprungen, Faktor 8: vorher war die Dunkelmaske dort für 38,5 % der Zeilen wirkungslos,
und der alte Gewichtsfehler war nur deshalb klein, weil die Maske selbst kaum etwas tat.

Der größte Einzelfehler liegt damit weiter bei **rund einem Drittel des 8-%-Ankers**, die
Spreizung ändert sich um 1,3 %. Das war nie der Grund zu bauen — der Grund ist, dass der 80er
Korpus heute ohnehin geschnitten wurde und zwei Brüche zusammen billiger sind als zwei einzelne.

**Der Bruch, ausgeschrieben:** ab diesem Commit sind die `effective_class_weights` eines
Occlusion-Laufs mit dem Archiv **nicht mehr vergleichbar**. Betroffen ist jeder Lauf mit
`--head occlusion` auf einem Datensatz, der eine `brightness`-Spalte trägt; alte Packs ohne die
Spalte rechnen unverändert weiter (jede Zelle gilt als hell). Der ausgelieferte Champion
`p4a-80-clahe` sitzt auf dem **alten** Stand — und zusätzlich auf einem Satz, dessen Dunkelmaske
zu 44,8 % wirkungslos war. Wer ihn gegen einen neuen Lauf stellt, vergleicht zwei Rezepte, nicht
zwei Modelle.

## Nachtrag aus CLAUDE.md (2026-09-23)

Verdeckung trifft Weiss 11–15 %, Schwarz 2–6 % (`occlusion-asymmetry`, gespielt wird von Weiss);
Gewichte aus allen Zeilen statt aus den sichtbaren lagen deshalb bis zu 8 % daneben. Sechs
Auswerter unter `scripts/` zaehlen seit `f7e3d85d` ueber `classification_eligible`;
`mine_hard_coverage.py` bleibt bewusst auf `coverage`.
