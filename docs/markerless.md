# Markerlos: das Brett ohne ArUco finden

> Spike 2026-08-30. Code in `src/chesslab/markerless.py`, CLI `chesslab calibrate markerless`,
> Prüfsatz `data/reports/markerless/fixture` (155 Frames aus 20 Aufnahmen, je mit ArUcos
> gitterangepasstem Quad). `CLAUDE.md` führt markerlosen Kaltstart als **nicht unterstützt** —
> dieser Text misst, was nötig wäre, um das zu ändern.

## Stand

Gegen ArUcos Spielfeld, Orientierung ausgeklammert (dazu unten):

| | von 155 |
|---|---:|
| Brett gefunden | 149 (96 %) |
| roh auf ArUcos Lösung (< 0,25 Zellen) | 137 (88 %) |
| nach `correct_quad` | **140 (90 %)** |

Medianer Eckenfehler **0,06 Zellen**, 90 % unter 0,22. Laufzeit **70 ms je Frame** auf 1080p,
davon 2 ms für die Lagekorrektur.

`data/reports/markerless/aruco-gegen-markerlos.png` zeigt es am Ergebnis — dem entzerrten Brett.
Vier von sechs Crops sind deckungsgleich; die zwei übrigen sind um 90° gedreht, das Feld stimmt.

## Die Latte ist niedriger, als sie aussieht

Zuerst gemessen, was ArUco eigentlich leistet — mit `alignment_of`, dem **absoluten** Urteil
(„liegt jede Feldkante auf ihrer Rille"), nicht gegen einen anderen Quad:

| | bestanden | Fehler |
|---|---|---|
| ArUco roh | **0 / 14** | 8,7 – 11,2 px |
| ArUco + `correct_quad` | 14 / 14 | 2,5 – 3,6 px |

**ArUco allein besteht die Prüfung nie.** Die Genauigkeit kommt vollständig aus dem Grid-Fit.
Markerlos muss also nicht ArUcos Präzision erreichen, sondern nur einen Startquad liefern, den
`correct_quad` einfangen kann.

## Der Weg

1. **Liniensegmente** (LSD auf 960 px Arbeitsbreite, Segmente > 25 px).
2. **Gitterrichtung** aus dem **vierfachen** Winkel. Nicht dem doppelten: ein Gitter hat zwei
   senkrechte Familien, und die legt der doppelte Winkel aufeinander — 0° und 90° werden beide
   zu 0°. Mit `2θ` lag der „Hauptwinkel" eines Bretts *zwischen* den Familien.
3. **Takt** je Familie aus einem Kamm von 9 Linien, gewertet mit **sättigender** Summe: ohne
   Deckel trägt eine einzige lange Tischkante den ganzen Kamm.
4. **Echte Linien anpassen** statt das Raster zu nehmen. Das Raster liefert nur die Zuordnung,
   welche Segmente zusammengehören; gefittet wird längengewichtet, Richtung frei.
5. **Der Quad aus allen 81 Schnittpunkten**, nicht aus den vier äußersten. Die Ecken sind die am
   stärksten tonnenverzeichneten Punkte im Bild (roh 15–17 px Bauch, `CLAUDE.md`); eine
   Homographie über das ganze Gitter mittelt den Bauch, statt ihn an seinem Maximum abzulesen.
   Gemessen: medianer Fehler 0,156 → 0,067 Zellen, Anteil unter 0,15 Zellen 72 → 106 von 149.
6. **Die Lage aus der Parität** (`fix_phase`), siehe unten.

## Die Phase war das ganze Problem

Nach Schritt 5 ist die Skala exakt (Größenverhältnis 1,000 ± 0,01) und **jeder** verbleibende
Fehler ein ganzzahliger Zellversatz. Vier Merkmale probiert, zwei gemessen und verworfen:

| Merkmal | trifft die Lage |
|---|---:|
| Karo-Korrelation der 64 Zellmittel | verworfen |
| „außerhalb ist keine Linie" (`OUTSIDE_WEIGHT`) | ohne Wirkung |
| Alternation der schwächsten Reihe, Betrag | 121 / 155 |
| **Alternation der schwächsten Reihe, vorzeichenrichtig** | **137 / 155** |

- **Das Karo kann die Lage nicht bestimmen.** Um eine Zelle verschoben ist es nur INVERTIERT und
  punktet praktisch gleich — 1,880 gegen 1,879 auf `11-59-12`. Der Betrag ist gleich groß, das
  Vorzeichen sagt nur, ob die Ursprungszelle hell oder dunkel ist.
- **`OUTSIDE_WEIGHT` ist wirkungslos geworden.** Über 0,0 bis 3,0 gemessen: 121 bis 125 Treffer,
  also flach. Die Regel „bei −1 und +9 ist keine Linie" stimmt auf Brettern mit
  Beschriftungsrand ohnehin nicht — dort liegt genau da die Außenkante.
- **Betrag reicht nicht, Vorzeichen schon.** Der erste Ansatz nahm das Minimum über die 16 Reihen
  und Spalten der *Stärke* der Alternation. Ein beschrifteter Rand variiert von den Buchstaben
  aber ebenso stark wie ein Karo, und die echte Grundreihe steht voller Figuren und variiert
  dadurch WENIGER. Genau deshalb brach `11-55-19` von 7/7 auf 2/7 ein. Vorzeichenrichtig gegen
  das Karo gerechnet, kehrt sich das um: Buchstaben folgen keinem Takt.

Das Maß ist gegen seine Parameter unempfindlich — über sechs Ring-Geometrien schwankt es um
±1 Frame, während die Betrags-Version zwischen 106 und 130 lag. Ein größerer Suchbereich als
±1 Zelle bringt nichts (identisch bei ±2 und ±3).

## Wie es NICHT zu messen ist

Drei Messfehler, und zusammen machten sie aus 140 Treffern die Zahl 48.

**1. `alignment_of` kann eine um eine Zelle verschobene Lösung nicht erkennen.** Ein
Schachbrettgitter sieht so verschoben genauso aus. Auf `00-39-57/3379` besteht ein 104 px daneben
liegender Quad mit **3,10 px**, während ArUco selbst **4,41 px** hat. Wer markerlos daran misst,
bekommt 16 von 18 „bestanden" und glaubt es.

**2. Die Referenz trägt `margin`, der Detektor nicht.** Ein Kalibrierprofil-Quad liegt
`margin = 0,045` je Seite **außerhalb** des Spielfelds (`compute_homography`), ist also 1,09× so
groß. Dagegen sah jeder richtige markerlose Quad um 7,4 % zu klein und um 0,36 Zellen versetzt aus
— gemessen 0,925 und +0,30. Das ist keine Ungenauigkeit, das ist eine Konvention.
`field_to_profile` rechnet um.

**3. Die Orientierung als Fehler zu zählen.** 39 von 155 Frames lagen exakt richtig, nur mit
gerollten Ecken. Welche Ecke a8 ist, kann ein Gitter prinzipiell nicht sagen — die vier Drehungen
sind ununterscheidbar. Bewertet wird deshalb der kleinste Eckenabstand über die vier Rollen.

Auf dem Weg dahin zusätzlich zwei Selbsttäuschungen: eine Sonde, deren Achsen bei einem
Gitterwinkel nahe 90° vom Brett WEG zeigten und daraufhin „das Karo ist auf vollen Brettern tot"
meldete, und ein Vorzeichen, das ich für ein fehlendes Signal hielt. Der Ausweg war beide Male,
die Annahme auszurechnen statt sie zu glauben.

## Was ArUco anders macht — und warum es widerstandsfähiger bleibt

Ein ArUco-Detektor sucht **kein Gitter**: adaptive Schwelle → Konturen → Polygone auf vier Ecken
reduzieren → jedes Viereck entzerren → **Bits auslesen**. Die Identität kommt aus einem
fehlerkorrigierenden Code. Daraus folgt der Unterschied:

- **Der Marker ist eine geschlossene Fläche mit garantiert schwarzem Rahmen.** Das Spielfeld hat
  keine solche Kontur — es geht nahtlos in den Beschriftungsrand über.
- **Die Phase löst der Code, nicht das Bild.** Genau dafür gibt es ChArUco: ein reines Schachbrett
  ist mehrdeutig, also klebt man Marker in die weißen Felder.
- **Die Marker sitzen außerhalb des Spielfelds.** Eine Hand greift in die Mitte, die vier Ecken
  bleiben frei; markerlos braucht Gitterlinien quer über das ganze Brett. Beide Frames ohne Fund
  sind ein Arm quer über dem Brett.
- **ArUco hat ein Gedächtnis.** `MarkerTracker` hält Marker über Frames; dieser Detektor fängt
  jeden Frame bei null an.

Als **Ersatz** für ArUco im Frame-Pfad taugt der Detektor nicht. Der Anwendungsfall ist der
Kaltstart auf einem unpräparierten Brett — und dort sitzt er in 90 % der Fälle exakt auf ArUcos
Lösung.

## Offen

- **Die Orientierung.** Bewusst nicht gelöst; sie kommt aus dem CNN. Eine Idee ist gemessen und
  VERWORFEN: „a1 ist dunkel" halbiert die vier Drehungen auf zwei, aber die Umsetzung wählte die
  falsche und riss zwei funktionierende Aufnahmen von 0,00 auf 7,8 Zellen.
- **9 Frames bleiben eine Zelle daneben**, 3 weitere zwischen 0,3 und 0,45 Zellen.
- **6 Frames finden kein Brett**, überwiegend mit einer Hand quer darüber. Ein Gedächtnis über
  Frames — ArUcos eigentlicher Vorteil — ist hier ungenutzt.
- **Perspektive**: der Fit trägt sie, aber gemessen ist der Bereich nicht.
- **Kotlin**: alles hier ist Python-Prototyp. Die Kotlin-Seite ist die Referenz; ein Umzug braucht
  vorher einen Paritätstest.
