# Gezielte Erfassung: vier Achsen, und warum der Kamerawinkel keine ist

`scripts/coverage_gaps.py` sagt, wo der Korpus dünn ist; `capture_plan.py` macht daraus
Aufnahmeaufträge, die App (`CaptureLight.kt`) misst live. Zahlen auf `real13-mix-v7-128`,
Stand 2026-09-14.

## Die Achsen

Über alle 24 Aufnahmen mit `corners` liegt die **Verkürzung** (`a8–h8` durch `a1–h1`) zwischen
0,955 und 1,025, Median 0,986 — 1,0 ist senkrecht von oben. Der Korpus hat **eine Kamerapose und
ein Höhenband**. Die Restfehler-Mechanik (Springer liest sich als Turm) ist also kein
Kamerawinkel, sondern die **Eigendrehung der Figur** — deshalb wirkte `--rot90` (+0,0245 gepaart
über sieben Seeds, 7/7, `evaluation.md`; die −0,046 in `evaluation.md` war
ein anderes Rezept). Ein Turntable als Kamerafahrt holt nichts Neues. Was fehlt:

| Achse | Stand | erreichbar über |
|---|---|---|
| **Ausrichtung** der Figur | nie bewusst variiert | Figur drehen |
| **Höhe** der Kamera | ein Band (`edge_px` 900–1000) | Kamera höher oder tiefer |
| **Licht** | Zieldomäne nur Mitte, siehe unten | Schatten/Spotlight |
| **Stellung** | Lücken | Aufbau |

## Das Band macht die Lampe, nicht das Feld

Kein einziges Feld trägt „sehr hell" als häufigstes Band, und dasselbe Feld streut über die
Aufnahmen massiv (`a8` 6 bis 207, `g4` 6 bis 225). Ein Auftrag, der ein Feld nennt und das Band
verschweigt, ist beim aktuellen Licht oft nicht erfüllbar. Deshalb:

- jedes `place` trägt `lo`/`hi`, der Plan trägt `squares` (Median und Spannweite je Feld);
- die **App misst das rektifizierte Brett live** und hängt Figuren auf die Felder, die gerade im
  Band liegen. **Die FEN folgt der Messung, nicht dem Vorschlag**;
- `capture.json` trägt `place` — was wirklich stand, mit gemessenem Grauwert — statt eines
  `reference_square`.

Die `id` ist `{laufende Nummer}-{Bänder}` — ein Bündel trägt viele Figuren, aber seine Bänder.

## Ein Auftrag ist ein Bündel

Bündelgrenzen: der **Figurenkasten** (`SET_BUDGET`, es gibt nur eine schwarze Dame), die
**Brettspanne** (`board_spread`, gemessen 112: eine Lampe verschiebt alle Felder zusammen, Bänder
weiter auseinander passen nicht in ein Bild) und `BAND_CAPACITY` (wie viele Felder einer Farbe
gleichzeitig in eine Gruppe fallen, p90 über 15 235 Bretter). `closes` nennt nur Lücken, für die
wirklich eine Figur steht; der Rest wandert in die nächste Aufnahme, eine leere Aufnahme wird nicht
ausgegeben.

## Die Zieldomäne ist `[40, 180)`

Die Randbänder sind Beifang: `sehr dunkel` (0-40, 6,8 %) trägt halben Kontrast und halbe
Farbigkeit, `sehr hell` (180-256) ist mit 0,4 % zu selten. Die Kamera regelt aus — Extremwerte
entstehen durch Schatten und Spotlight, nicht durch die Zimmerlampe. Die Domäne ist in fünf
**gleich breite** Gruppen geteilt (`dunkel`, `halbdunkel`, `mittel`, `halbhell`, `hell`, je 28
Grauwerte) — Quantilgrenzen wanderten mit jedem Datensatz. `OUTSIDE` hält `zu dunkel`/`zu hell`
für die Messung; `coverage_gaps.gaps()` beauftragt sie nie. Ergebnis: 29 dünne Zellen, 0 nur über
Licht erreichbar, 6 erfüllbare Aufträge mit 2 bis 10 Figuren; am echten Brett 9 von 10 Zielfeldern
im Band.

## Ablauf in der App

- **Licht stellen, Felder festhalten, dann aufbauen.** Eine Figur verschiebt den Mittelwert ihres
  Feldes (schwarz Median −22, bis −61); 16 von 80 Verschiebungen überspringen ein ganzes Band. Ohne
  Festhalten würfelte die erste Figur die Zuweisung neu. Danach `refit`: dieselben Felder, neu
  beurteilt — der Crop MIT Figur landet im Datensatz.
- **Gemessen wird auch während der acht Drehungen:** `driftLine` nennt die Verschiebung gegen den
  Festhalte-Moment; unter 3 Grauwerten „stabil". Felder ohne aktuelle Messung zählen nicht.
- **Das CNN kontrolliert, es sperrt nicht** (`TrackerStatus.debug.cnnReads`: `AGREES`,
  `OTHER_PIECE`, `EMPTY`, `UNSURE`, `OFF`, dazu `strayPieces`). Aufgenommen wird genau, wo das
  Modell Lücken hat — ein Widerspruch kann Aufbau oder Lücke sein. Tragend sind `EMPTY` auf einem
  Zielfeld und `strayPieces` (macht das `empty`-Label in jedem Frame falsch). Nur im Aufbau-Schirm
  armiert, während der Aufnahme aus.
- **`whitePov` durchreichen.** `warpFromCorners` kennt es nicht, `squareToColRow` dreht bei
  `!whitePov` um 180°. `measureSquares` verdrahtete `true` fest — jede Figur wäre gespiegelt
  gelabelt worden. `cellRect` (`BoardPreview.kt`) trägt dieselbe Annahme noch; wer es anfasst,
  prüft zuerst `BLACK_BOTTOM`.
- **Die Anweisung hängt nicht am Kamerabild:** ohne Bild zeichnet der Schirm sein eigenes Raster,
  `orderLine` nennt die Belegung im Klartext (`wQ c8 · bK a1`), und der Schirm startet `TrackerRun`
  selbst.

## Die Abdeckung ist nicht live

`coverage-gaps.json` entsteht aus einem **gebauten Datensatz**; eine neue Aufnahme erscheint erst
nach Slice, Export und Bau. Jede Anzeige trägt `generated_at`. **Nach jedem Re-Slice und neuen
Datensatz: erst `scripts/backfill_brightness.py`, dann die Karte, dann der Plan** — ohne die
`brightness` der Kompositen (376 640 Zeilen, echtes Material) waren 12 von 58 Lücken längst
gedeckt.

## Wie die Pose gerechnet wird

`capture_plan.pose_of(corners)`, Ecken `[a8, h8, h1, a1]` (`SessionRecorder.kt`):
`foreshorten` = `a8–h8` durch `a1–h1`; `edge_px` = Mittel aller vier Kanten. `coverage_gaps.py`
stuft sie in 0,05 bzw. 100 px. Verbund je Achse:

| Achse | Schlüssel | Verbund |
|---|---|---|
| `height` | je Aufnahme | `session_id` → Ordner, `removeprefix("rg-")` |
| `orientation_deg` | je **Ply** | `row["ply"]` gegen `step["ply"]` aus `capture.json` |
| `foreshorten`, `edge_px` | je **Frame** | `corners` aus dem OBEREN `log.jsonl`, über den Frame-Stamm |

Die Ausrichtung darf **nicht** über Frame-Namen verbunden werden (Bündel `frames/0000.jpg`, oberes
Log Video-Index); ein Ply steht für viele Frames (1:n), Kompositen fehlt er. Nicht Erfasstes zählt
unter `"unbekannt"`, nie unter `"normal"`.
