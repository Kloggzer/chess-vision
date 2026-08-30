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
   Deckel trägt eine einzige lange Tischkante den ganzen Kamm. Takt und Lage fallen in EINER
   Suche je Achse — beides steht in derselben Kurve.
4. **Lage aus den Linien-ENDEN, nicht aus dem Karo.** Ein Brett hat genau neun Linien je Achse;
   an Position -1 und +9 ist keine. Gemessen liegt dort an der richtigen Stelle **exakt null**, auf
   vier Aufnahmen und beiden Achsen — das ist das eindeutigste Merkmal im ganzen Bild.
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
| Brett gefunden | **17** |
| dieselbe Lösung wie ArUco (< 0,25 Zellen) | **11** |
| Ecken um 90° rotiert (dann 1,25 Zellen) | 4 |
| eine Zelle daneben | 2 |
| kein Brett | 1 |

Die elf Treffer liegen bei **0,00 bis 0,01 Zellen** — exakt auf ArUcos Lösung, aus einem Bild ohne
Marker. Die vier rotierten sind `2026-08-13-12-46-24`, wo das Brett um 90° gedreht steht: rollt man
die Eckenliste um eins, fällt der Fehler von 8,6 auf 1,25 Zellen. Das Brett ist also gefunden, nur
die Rollen stimmen nicht.

**Warum das Karo als Phasen-Merkmal ausschied.** Der erste Entwurf nahm dafür die Korrelation der
64 Zellmittel. Gemessen: um eine Zelle verschoben ist ein Karo einfach INVERTIERT und punktet
praktisch gleich — 1,880 gegen 1,879 auf `11-59-12`. Der Betrag ist gleich groß, das Vorzeichen
sagt nur, ob die Ursprungszelle hell oder dunkel ist, und das hängt daran, welche Ecke im
gefundenen Achsensystem der Ursprung ist. Es kann den Takt bestimmen, aber niemals die Lage.

Auf dem Weg dahin habe ich mich zweimal selbst getäuscht: erst mit einer Sonde, deren Achsen bei
einem Gitterwinkel nahe 90° vom Brett WEG zeigten (sie maß neben dem Brett und meldete „das Karo
ist auf vollen Brettern tot"), dann mit einem Vorzeichen, das ich für ein fehlendes Signal hielt.
Beide Male sah die falsche Erklärung plausibel aus. Der Ausweg war beide Male, die Annahme
auszurechnen statt sie zu glauben.

## Was das Raster NICHT liefert

Die Orientierung. Welche Ecke a8 ist, sagt das Karo nicht — die vier 90°-Drehungen sind
ununterscheidbar. Der Prototyp nimmt „links oben = a8", was zu den vorhandenen Aufnahmen passt,
aber eine Annahme bleibt. ArUco löst das, weil die vier Marker verschieden sind.

Für einen echten markerlosen Kaltstart braucht es dafür eine eigene Quelle: die Rand-Beschriftung
lesen, die Grundstellung erkennen, oder den Nutzer einmal fragen.

## Offen

- **Die Orientierung.** Vier Frames haben die Eckenrollen um 90° gedreht — das ist jetzt der
  größte verbleibende Posten, und das Karo kann ihn prinzipiell nicht lösen.
- **`2026-08-13-12-46-24`** bleibt auch nach dem Rollen bei 1,25 Zellen: anderes Brett, deutliche
  Perspektive, dünnere Rillen. Dort ist noch etwas anderes offen.
- Ein Frame findet gar kein Brett (`00-39-57/3379`, Hand über dem Brett).
- Perspektive: der Fit trägt sie, aber gemessen ist der Bereich nicht.
- Laufzeit: der Phasen-Suchlauf ist Sekunden, nicht Millisekunden. Für eine **Kalibrierung** ist
  das egal, für einen Frame-Pfad nicht — und Kalibrierung ist der Anwendungsfall.
- Kotlin: alles hier ist Python-Prototyp. `docs/` und `MEMORY` halten fest, dass die Kotlin-Seite
  die Referenz ist; ein Umzug braucht vorher einen Paritätstest.
