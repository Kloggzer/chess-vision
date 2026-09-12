# Gezielte Erfassung: vier Achsen, und warum der Kamerawinkel keine ist

**Stand 2026-09-12.** Geschrieben, weil `scripts/coverage_gaps.py` sagt, wo der Korpus dünn ist,
aber niemand daraus eine Handlung ableiten konnte.

## Der Befund, der die Reihenfolge bestimmt

Über alle 24 Aufnahmen mit `corners` liegt die **Verkürzung** der hinteren Brettkante (`a8–h8`)
gegen die vordere (`a1–h1`) zwischen **0,955 und 1,025, Median 0,986** — und 1,0 heißt senkrecht
von oben. Der Korpus hat **eine Kamerapose und ein Höhenband**; `coverage_gaps.py` misst das seit
heute mit (`axes.foreshorten`, `axes.edge_px`) statt es zu behaupten.

Damit ist die gemessene Fehlermechanik — der Springer, der sich als Turm liest, 68 % der
Restfehler aus 12 von 280 Verweil-Episoden (`plan-98/02-fehleranalyse.md:11`) — **nicht** ein
Kamerawinkel-Problem. Die Kamera bewegt sich nie. Es ist die **Eigendrehung der Figur auf dem
Feld**. Genau deshalb hat `--rot90` so stark gewirkt: das Drehen des Crops war bisher die einzige
Art, wie das Modell eine Figur je von einer anderen Seite gesehen hat (+0,0245 gepaart über sieben
Seeds, Vorzeichentest 7/7, p = 0,0078 — `plan-98/00-plan.md`).

**Nicht verwechseln** mit `model-improvement-results-2026-08-27.md:66`, wo `rot90` mit −0,046
steht: das war 80 px, ohne Flip, ohne Brettkopf, auf einem anderen Datensatz. Beide Zahlen stimmen.

**Ein Turntable im Sinne einer Kamerafahrt holt daher nichts Neues.** Was fehlt, sind diese vier:

| Achse | Stand heute | erreichbar über |
|---|---|---|
| **Ausrichtung** der Figur | nie bewusst variiert | Figur drehen |
| **Höhe** der Kamera | ein einziges Band (`edge_px` 900–1000 in 406 077 von 602 723 messbaren Zeilen) | Kamera höher oder tiefer |
| **Licht** | 24 Lücken nur so erreichbar | Lampe |
| **Stellung** | 34 Lücken | Aufbau |

## Ein Auftrag nennt ein Feld und sagt kein Band zu

`coverage_gaps.py` nennt Lücken als (Figur × Feldfarbe × Helligkeitsband). Ein Auftrag kann das
Band aber nicht versprechen: **kein einziges der 64 Felder trägt „sehr hell" als häufigstes Band.**
Der Planer wählt deshalb das Feld der geforderten Farbe, dessen Median-Helligkeit der **Bandmitte
am nächsten** liegt — „das hellste bzw. dunkelste" wäre für das Band `mittel` nicht entscheidbar,
und `hell`, `dunkel` und `mittel` sind 18 der 34 Stellungs-Aufträge. Was erreicht wurde, **misst**
`axes` hinterher.

Die `id` eines Auftrags ist `{piece}-{square_color}-{band}`. Das Band muss hinein: 58 Lücken
verteilen sich auf nur 24 Paare aus Figur und Feldfarbe, **22 davon kollidieren** über die Bänder.

## Die Abdeckung kann nicht live sein

`coverage-gaps.json` entsteht aus einem **gebauten Datensatz**. Eine frisch hochgeladene Aufnahme
erscheint dort erst nach Slice, Export und Dataset-Bau. Wer nach einem Upload einen Balken wandern
lässt, lügt. Deshalb trägt jede Abdeckungsanzeige ihren `generated_at` mit.

## Die halbe Karte, und was sie falsch sagte

376 640 von 979 363 Manifestzeilen trugen keine `brightness` — alle Kompositen. Die sind aber
**echtes Material**: 2.5D-Montage echter Bretter mit echten Handplatten, auf demselben Rig gedreht
(`composite.py:1-4`, `RIG_SCALE = 0.60`). Ihre Helligkeit ist der Grauwert-Mittelwert des Crops
(`labeling.py:565`) und aus den Pack-Pixeln nachrechenbar; sie wurde nur nie notiert.

`scripts/backfill_brightness.py` hat sie am 2026-09-12 nachgetragen, alle 376 640. Was das an der
Lückenkarte bewegte:

| | halbe Karte (62 %) | volle Karte |
|---|---|---|
| dünne Zellen | 58 | **46** |
| davon bei null Belegen | 27 | **16** |
| nur über Licht erreichbar | 24 | **12** |

**12 der 58 Lücken waren längst gedeckt** — `bR` auf hellem Feld im Band `hell` trug 194 Belege,
`wR` auf dunklem Feld in `sehr dunkel` 179. Ein Plan auf der halben Karte hätte den Menschen nach
Material geschickt, das schon dalag. Auch die gewählten Felder verschoben sich (`h3` → `g4`), weil
die Kompositen die Medianhelligkeit jedes Feldes mitbestimmen.

Die Regel daraus: **nach jedem Re-Slice und jedem neuen Datensatz erst backfillen, dann die Karte,
dann den Plan.** Die Reihenfolge ist keine Formalie, sie war hier ein Viertel der Aufträge.

## Wie die Pose gerechnet wird

`capture_plan.pose_of(corners)` bekommt die Ecken in der Reihenfolge `[a8, h8, h1, a1]`
(`SessionRecorder.kt:70-72`) und gibt zwei Zahlen:

- `foreshorten` = Kante `a8–h8` durch Kante `a1–h1`; 1,0 ist senkrecht von oben.
- `edge_px` = Mittel **aller vier** Kanten, als Abstandsmaß.

`coverage_gaps.py` bündelt sie in Stufen von 0,05 bzw. 100 px. Der Verbund ist je Achse ein
anderer, und das ist der Kern:

| Achse | Schlüssel | Verbund |
|---|---|---|
| `height` | je Aufnahme | `session_id` → Ordner, `removeprefix("rg-")` |
| `orientation_deg` | je **Ply** | zusätzlich `row["ply"]` gegen `step["ply"]` aus `capture.json` |
| `foreshorten`, `edge_px` | je **Frame** | `corners` aus dem OBEREN `log.jsonl`, über den Frame-**Stamm** |

Über Frame-Namen darf die Ausrichtung **nicht** verbunden werden: das Bündel zählt
`frames/0000.jpg`, das obere Log trägt den Video-Index. `ply` überbrückt das — er steht allerdings
nur in 602 723 Zeilen, den 138 Komposit-Sessions fehlt er, und ein Ply steht für viele Frames
(Median 16). Der Verbund ist 1:n.

Was nicht erfasst ist, zählt unter `"unbekannt"` — nie unter `"normal"`. Nicht gemessen ist nicht
dasselbe wie gemessen und unauffällig.
