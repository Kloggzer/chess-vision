# Auftrag: Der Warp zittert, und alle Schwellen zahlen dafür

## Das Problem

Das entzerrte Brett wird aus vier Ecken gerechnet, und diese Ecken werden regelmäßig neu gemessen
(`quadOf` — ArUco plus Gitter-Verfeinerung). Jede Neumessung fällt minimal anders aus, also
**verschiebt sich das entzerrte Bild um Bruchteile eines Pixels bis Pixel, obwohl sich physisch
nichts bewegt hat**. Die Kamera ist montiert, das Brett liegt fest — dieses Zittern ist reines
Messrauschen.

Es ist nicht kosmetisch. Jede Schwelle, die zwei aufeinanderfolgende Bilder vergleicht, muss über
diesem Rauschboden liegen, und deshalb liegen sie alle zu hoch. Gemessen am 2026-08-25 von einem
Agenten, der einen Tracker allein auf Bildvergleichen gebaut hat: Feld-Differenzen zwischen zwei
ruhigen Frames erreichten **16 bis 26 Graustufen** (Schatten, Arm am Bildrand, Warp-Jitter),
während ein echter Zug einer dunklen Figur auf ein dunkles Feld **unter 12** bleibt. Die beiden
Verteilungen überlappen, also ist die Schwelle nicht wählbar: bei 12 stirbt die Wahrheit, bei 4
regiert das Rauschen. Sein Verfahren zur Zug-Reihenfolge musste daran scheitern und ist gestrichen
worden.

## Was zu tun ist

**Zeitliche Glättung des Quads.** Statt der letzten Messung der Median der letzten N Messungen, je
Ecke und Koordinate. Der Median, nicht der Mittelwert: eine Hand über einem Marker erzeugt
Ausreißer, und ein Mittelwert nimmt sie mit.

Das betrifft zwei Orte, die dieselbe Krankheit haben:

1. **`android/arena/src/main/kotlin/com/chesslab/arena/Arena.kt`** — misst alle `alignEvery`
   Frames neu (Default 30) und benutzt die letzte Messung roh. Der einfachere Fall, fang hier an.
2. **Der Tracker selbst** — `LiveAlign` im laufenden Betrieb, `alignEvery` steht dort auf 3. Ob
   dort schon geglättet wird, ist Teil der Aufgabe: erst nachsehen, dann bauen.

## Was schon gemessen ist — nicht nochmal messen

- **Die Kamera bewegt sich nicht.** Bei den `fixed`-Aufnahmen (siehe `docs/recordings.md`) ist der
  wahre Quad über die ganze Aufnahme konstant. Die Streuung, die du siehst, ist Messrauschen.
- **`VID_20260824_154327` beziffert es selbst.** Die `candidate.json` dieser Aufnahme trägt
  `quad_spread_px: {median 0.794, p90 2.262, max 10.045}` und
  `worst_offset_px: {median 3.711, p90 4.668, max 38.134}` über 1 248 Messungen. Das ist die
  Größenordnung, gegen die du arbeitest, und zugleich ein fertiges Vorher-Maß.
- **Ein Ausreißer hat eine Ursache.** `max 38 px` ist keine Statistik, das ist eine Hand über einem
  Marker. Genau dafür der Median.
- **Turntable-Aufnahmen dürfen NICHT geglättet werden.** Dort dreht sich das Brett, der Quad ist je
  Frame echt verschieden, und ein Median über die letzten N wäre systematisch falsch. Welche
  Aufnahme was ist, steht in `docs/recordings.md` (Spalte `board`). Die Glättung braucht also einen
  Schalter, und sein Default muss die Turntable-Fälle heil lassen.

## Werkzeuge

- `arena board <aufnahme> frame=N` schreibt das entzerrte Brett als PNG, mit und ohne Raster. Zwei
  Frames derselben ruhigen Szene übereinandergelegt zeigen das Zittern direkt.
- `arena dump <aufnahme> every=N` schreibt die Modell-Lesung je Frame als JSONL.
- `squareOffsetOf(frame, quad)` (in `:tracker-runtime`) ist das unabhängige Maß: wie weit die 64
  Felder von dem entfernt sind, wo das Gitter des Bretts sie hinlegt. Es misst NICHT dasselbe wie
  die Streuung des Quads, und beide gehören in den Bericht.
- Der Replay misst mit: `./gradlew.bat :desktop:run --args="replay <video> quiet"` aus
  `android/desktop`, Optionen in `ReplayOptions.kt`. `set:<knob>=<wert>` setzt jeden registrierten
  Knopf, also auch einen neuen.

## Die Abnahme — was am Ende dastehen muss

1. **Vorher/Nachher am selben Video, in Zahlen.** Streuung des Quads je Ecke (Median, p90, max) und
   `squareOffsetOf` über die Aufnahme. Ein Bild allein zählt nicht.
2. **Der Rauschboden der Feld-Differenz.** Zwei ruhige, aufeinanderfolgende Frames, 64 Felder, die
   Verteilung der Differenzen — vorher und nachher. Das ist die Zahl, um die es eigentlich geht:
   sie soll unter die 12 fallen, an denen ein echter dunkler Zug liegt.
3. **Der Regressionssatz darf sich nicht verschlechtern.** Zehn Aufnahmen unter
   `data/recordings/`, gemessen mit `replay <video> score name=<aufnahme>
   model=real13-ms-s3-hn4-bn80`. Erwartet wird found/missed/invented je Aufnahme; die heutigen
   Zahlen stehen in `docs/agent-briefs/tracker-from-scratch.md`. **Phantome disqualifizieren** —
   eine Änderung, die einen einzigen erzeugt, ist keine Verbesserung, egal was sie sonst hebt.
   Höchstens zwei Replays gleichzeitig, jede JVM hält rund 6 GB, davon das meiste nativ.
4. **Die Schwellen bleiben, wo sie sind.** Sie nachzuziehen ist die NÄCHSTE Arbeit, mit eigener
   Messung. Wer beides zugleich ändert, kann hinterher nicht sagen, was gewirkt hat.

## Hausregeln

Kotlin über `./gradlew.bat :arena:ktlintFormat` formatiert, `:arena:detekt` und die Tests aller
angefassten Module grün (`--rerun-tasks`, sonst meldet Gradle „up-to-date" trotz Fehlern).
Kommentare sagen *warum*, nie was der Code schon sagt, und bleiben unter fünf Zeilen. Was du
misst, gehört in den Commit; eine Zahl ohne wiederholbaren Lauf dahinter ist eine Meinung.
