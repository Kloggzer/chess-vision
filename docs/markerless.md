# Markerlos: das Brett ohne ArUco finden

> Spike 2026-08-30, Python-Prototyp. Code `src/chesslab/markerless.py`, CLI
> `chesslab calibrate markerless`, Pruefsatz `data/reports/markerless/fixture` (155 Frames aus 20
> Aufnahmen, je mit ArUcos gitterangepasstem Quad). Markerloser Kaltstart ist weiter **nicht
> unterstuetzt**; dieser Text sagt, wie weit der Spike kam und was fehlt.

## Stand

Gegen ArUcos Spielfeld, Orientierung ausgeklammert: Brett gefunden 149 von 155, nach
`correct_quad` **140 von 155 (90 %)** exakt (< 0,25 Zellen). Medianer Eckenfehler 0,06 Zellen,
70 ms je 1080p-Frame.

## Die Latte ist niedriger, als sie aussieht

Mit `alignment_of` (absolut: liegt jede Feldkante auf ihrer Rille) besteht **ArUco roh 0 von 14**
(8,7-11,2 px), ArUco + `correct_quad` 14 von 14 (2,5-3,6 px). Die Genauigkeit kommt vollstaendig
aus dem Grid-Fit; markerlos braucht nur einen Startquad, den `correct_quad` einfangen kann.

## Der Weg

1. Liniensegmente (LSD auf 960 px, Segmente > 25 px).
2. **Gitterrichtung aus dem VIERFACHEN Winkel** — der doppelte legt die zwei senkrechten Familien
   aufeinander.
3. **Takt** je Familie aus einem Kamm von 9 Linien, mit **saettigender** Summe (sonst traegt eine
   lange Tischkante den Kamm).
4. Echte Linien laengengewichtet anpassen; das Raster liefert nur die Zuordnung.
5. **Der Quad aus allen 81 Schnittpunkten**, nicht aus den vier aeussersten: die Ecken sind die am
   staerksten tonnenverzeichneten Punkte (Median 0,156 -> 0,067 Zellen).
6. **Die Lage aus der Paritaet** (`fix_phase`).

## Die Phase war das ganze Problem

Nach Schritt 5 ist die Skala exakt und **jeder** Restfehler ein ganzzahliger Zellversatz.

- **Das Karo kann die Lage nicht bestimmen:** um eine Zelle verschoben ist es nur invertiert und
  punktet gleich. Wo das Gitter aufhoert, steht in den Linien selbst.
- **Betrag reicht nicht, Vorzeichen schon.** Die schwaechste Reihe gegen das Karo: ein beschrifteter
  Rand variiert von den Buchstaben ebenso stark, nur nicht im Takt; die Grundreihe voller Figuren
  variiert weniger. Betrag 121/155, vorzeichenrichtig **137/155**, robust gegen die Parameter.
- Verworfen: Karo-Korrelation der Zellmittel und `OUTSIDE_WEIGHT` ("ausserhalb keine Linie" —
  flach ueber 0 bis 3, auf Brettern mit Beschriftungsrand ohnehin falsch). Suchbereich ueber
  ±1 Zelle bringt nichts.

## Wie es NICHT zu messen ist

Drei Messfehler machten aus 140 Treffern zusammen 48:

1. **`alignment_of` sieht keinen Versatz um eine Zelle** — ein Gitter sieht verschoben gleich aus
   (ein 104 px daneben liegender Quad bestand mit 3,10 px).
2. **Die Referenz traegt `margin`:** ein Profil-Quad liegt 0,045 je Seite ausserhalb des Spielfelds
   (1,09x). `field_to_profile` rechnet um.
3. **Orientierung ist kein Fehler:** welche Ecke a8 ist, kann ein Gitter nicht sagen. Bewertet wird
   der kleinste Eckenabstand ueber die vier Rollen; die Rollen im Code sind eine ANNAHME.

## Warum ArUco widerstandsfaehiger bleibt

Der Marker ist eine geschlossene Kontur mit schwarzem Rahmen, die Identitaet kommt aus einem
fehlerkorrigierenden Code (deshalb ChArUco), die Marker sitzen ausserhalb der Hand, und
`MarkerTracker` hat ein Gedaechtnis. Als Ersatz im Frame-Pfad taugt der Detektor nicht; der
Anwendungsfall ist der Kaltstart auf einem unpraeparierten Brett.

## Offen

- **Orientierung** kommt aus dem CNN. "a1 ist dunkel" verworfen: die Umsetzung waehlte die falsche
  von zwei Drehungen und riss zwei funktionierende Aufnahmen auf 7,8 Zellen.
- 9 Frames eine Zelle daneben, 3 zwischen 0,3 und 0,45 Zellen, 6 ohne Brett (meist ein Arm quer
  darueber; ein Gedaechtnis ueber Frames fehlt).
- Perspektivbereich ungemessen.
- **Kotlin ist die Referenz** — ein Umzug braucht vorher einen Paritaetstest.
