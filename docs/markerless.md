# Markerlos: das Brett ohne ArUco finden

> Spike vom 2026-08-30. Prototyp in `tmp/mless_board.py`, Prüfstand `tmp/mless_bench.py`.
> `CLAUDE.md` führt markerlosen Kaltstart als **nicht unterstützt** — dieser Text misst, was
> nötig wäre, um das zu ändern.

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
   zu 0°. Mit `2θ` lag der „Hauptwinkel" eines Bretts *zwischen* den Familien; mit `4θ` wird eine
   um 5,94° gedrehte Aufnahme korrekt als solche erkannt.
3. **Takt** je Familie aus einem Kamm von 9 Linien, gewertet mit **sättigender** Summe: ohne
   Deckel trägt eine einzige lange Tischkante den ganzen Kamm.
4. **Lage** aus dem Karomuster — plus dem Ring **außerhalb**. Das Karo allein reicht nicht: um
   eine Zelle verschoben punktet es 0,467 gegen 0,457, weil sieben Reihen Brett plus eine Reihe
   Rand fast so gut passen wie acht Reihen Brett.
5. **Echte Linien anpassen** statt das Raster zu nehmen. Das Raster liefert nur die Zuordnung,
   welche Segmente zusammengehören; gefittet wird längengewichtet, Richtung frei. Ein
   Parallelogramm kann keine Perspektive, geschnittene Linien schon.
6. `board_candidates` bietet den Quad und seine acht Nachbarn (je eine Zelle versetzt) an —
   **als Vorschlag, nicht als Lösung.** Wer daraus mit `alignment_of` auswählt, wählt falsch: siehe
   unten. Der Aufrufer braucht eine eigene Entscheidung.

Die Schritte 2 und 4 kamen jeweils aus einem Fehlschlag, den erst die Messung sichtbar gemacht hat.
Der `Alignment`-Docstring des Projekts sagt die Lehre dahinter schon: *„`unread` is part of the
verdict, not a footnote … calling that a pass is how the pinned metric certified 302 bad frames in
2026-07."*

## Wie weit es trägt — und wie es NICHT zu messen ist

**Erst der Messfehler, weil er die halbe Arbeit war.** `alignment_of` ist absolut, aber es kann
eine um eine ZELLE verschobene Lösung nicht von der richtigen unterscheiden: ein Schachbrettgitter
sieht so verschoben genauso aus. Gemessen auf `00-39-57/3379` besteht ein 104 px (= eine Zelle)
daneben liegender Quad mit **3,10 px**, während ArUco selbst **4,41 px** hat. `unread` fängt es
nur, wenn der Rand an der 9. Linie keine Kante hat — dieses Brett hat dort seine Beschriftung.

Wer markerlos an `alignment_of` misst, bekommt also 16 von 18 „bestanden" und glaubt es. Das
richtige Maß ist der Abstand zu den ArUco-Ecken, in Zellen:

| | von 18 |
|---|---|
| Brett gefunden | **18** |
| dieselbe Lösung wie ArUco (< 0,25 Zellen) | **4** |
| genau **eine Zelle** daneben | 10 |
| ~9 Zellen — Brett um 90° gedreht | 4 |

Auf `2026-08-07-13-52-38` liegen alle vier Frames nach dem Grid-Fit bei **0,00 Zellen**, also exakt
auf ArUcos Lösung. Das Raster stimmt überall; was nicht stimmt, ist **welches 8×8** und **welche
Ecke a8 ist**.

Der Ein-Zellen-Fehler ist systematisch — immer dieselbe Richtung, 0,92 bis 0,95 Zellen auf drei
Aufnahmen. Das ist ein Hinweis, keine Zufälligkeit: vermutlich trägt die Rand-Beschriftung an
einer Seite stärkere Kanten als die letzte Spielreihe an der anderen. Wer daran weiterarbeitet,
fängt dort an.

## Was das Raster NICHT liefert

Die Orientierung. Welche Ecke a8 ist, sagt das Karo nicht — die vier 90°-Drehungen sind
ununterscheidbar. Der Prototyp nimmt „links oben = a8", was zu den vorhandenen Aufnahmen passt,
aber eine Annahme bleibt. ArUco löst das, weil die vier Marker verschieden sind.

Für einen echten markerlosen Kaltstart braucht es dafür eine eigene Quelle: die Rand-Beschriftung
lesen, die Grundstellung erkennen, oder den Nutzer einmal fragen.

## Offen

- **Die Phase.** 10 von 18 sitzen eine Zelle daneben, systematisch. Das ist das eine Problem,
  dessen Lösung den Rest freischaltet.
- **Die Orientierung.** Vier Frames liegen ~9 Zellen daneben, weil das Brett dort um 90° gedreht
  steht und „links oben = a8" nicht mehr gilt.
- Perspektive: der Fit trägt sie, aber gemessen ist der Bereich nicht.
- Laufzeit: der Phasen-Suchlauf ist Sekunden, nicht Millisekunden. Für eine **Kalibrierung** ist
  das egal, für einen Frame-Pfad nicht — und Kalibrierung ist der Anwendungsfall.
- Kotlin: alles hier ist Python-Prototyp. `docs/` und `MEMORY` halten fest, dass die Kotlin-Seite
  die Referenz ist; ein Umzug braucht vorher einen Paritätstest.
