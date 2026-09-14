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

Die `id` eines Auftrags war `{piece}-{square_color}-{band}`. Das Band musste hinein: 58 Lücken
verteilen sich auf nur 24 Paare aus Figur und Feldfarbe, **22 davon kollidieren** über die Bänder.
Seit der Bündelung ist sie `{laufende Nummer}-{Bänder}` (`01-sehr-dunkel` … `05-sehr-hell`) —
ein Bündel trägt viele Figuren, aber immer noch seine Bänder.

## Der Vorschlag ist kein Auftrag mehr, und ein Auftrag ist ein Bündel (2026-09-14)

**Stand 2026-09-14.** Zwei Befunde haben die beiden Regeln oben eingerahmt; keiner hebt sie auf.

**Der Median wählt ein Feld, aber er sagt nicht, wie weit es daneben liegt.** Für „light sehr hell"
(Bandmitte 218) nennt die Regel `g4` — Median **157**. Das Feld streut über den Korpus aber selbst
massiv, und zwar über die Aufnahmen, nicht über die Position:

| Feld | min | p5 | Median | p95 | max |
|---|---|---|---|---|---|
| `a8` (hell) | 6 | 66 | 115 | 172 | 207 |
| `g4` (hell) | 6 | 83 | 157 | 203 | 225 |
| `h2` (dunkel) | 5 | 45 | 84 | 183 | 225 |
| `a7` (dunkel) | 4 | 26 | 45 | 106 | 201 |

Das Band kommt also **von der Lampe**, nicht vom Feld. Ein Auftrag, der ein Feld nennt und das
Band verschweigt, liest sich darum wie „stell was hin und dreh" und ist beim aktuellen Licht oft
gar nicht erfüllbar. Seitdem trägt jedes `place` sein `lo`/`hi` mit, der Plan trägt `squares`
(Median und Spannweite je Feld), und die **App misst das rektifizierte Brett live** und hängt die
Figuren auf die Felder um, die gerade wirklich im Band liegen (`CaptureLight.kt`). Die FEN folgt
der Messung, nicht dem Vorschlag — sonst wäre jede Figur aufs falsche Feld gelabelt.

**Ein Auftrag ist ein Bündel.** 46 Lücken waren 46 Aufnahmen à 8 Drehungen, obwohl auf ein Brett
viele Figuren gleichzeitig passen. Zwei Grenzen bündeln sie:

- **Der Figurenkasten** (`SET_BUDGET`): `bQ` fehlt in fünf Bändern, es gibt aber nur eine schwarze
  Dame — also fünf Aufnahmen, nicht fünf Aufträge im selben Bild.
- **Die Brettspanne** (`board_spread`, gemessen **112**: `a7` 45 bis `g4` 157). Eine Lampe
  verschiebt alle Felder zusammen; der Abstand zwischen ihnen ist der Gradient des Bretts. Bänder,
  deren Mitten weiter auseinanderliegen, können nicht in ein Bild — `sehr dunkel` (20) und
  `sehr hell` (218) verlangten 198.

Gemessen auf `real13-mix-v7-128`: **46 Lücken → 5 Aufnahmen** mit 3 bis 19 Figuren. Jede Aufnahme
fordert EINE Lampeneinstellung, nicht ein einziges Band: drei der fünf spannen zwei benachbarte
Bänder (`02-hell-sehr-hell`, `03-dunkel-hell`, `04-sehr-dunkel-dunkel`), was genau der Zweck von
`board_spread` ist — was zusammen erreichbar ist, kommt zusammen ins Bild.

`closes` nennt dabei nur die Lücken, für die auch wirklich eine Figur steht: findet `_assign` kein
freies Feld mehr, wandert die Lücke in die NÄCHSTE Aufnahme, statt als geschlossen gemeldet zu
werden. Und eine Aufnahme, die gar nichts stellen kann, wird nicht ausgegeben — `id='01-'` mit
„0 Figuren" bestand die Schema-Prüfung klaglos und hieß nichts (Review 2026-09-14).

`capture.json` trägt deshalb kein `reference_square` mehr, sondern `place` — was **wirklich**
stand, Feld für Feld, mit dem gemessenen Grauwert. Ein einzelnes Referenzfeld konnte ein Bündel
nicht beschreiben, und der Import bekommt damit die Ground Truth statt einer Ableitung.

## Die Felder müssen festgehalten werden, bevor der Mensch baut (2026-09-14)

Eine Figur verschiebt den Crop-Mittelwert **ihres eigenen Feldes**. Gemessen über 40 Felder mit je
mindestens 50 Belegen pro Art (`empty` / weiß / schwarz):

| | Median | Spanne |
|---|---|---|
| weiße Figur | −3 | −41 bis +32 |
| schwarze Figur | −22 | −61 bis +8 |

Die Bänder sind 40 bis 76 Grauwerte breit — **16 der 80 Verschiebungen überspringen ein ganzes
Band.** Ohne Gegenmaßnahme hätte die erste hingestellte Figur die Zuweisung neu gewürfelt und die
Anzeige wäre unter der Hand des Nutzers gewandert.

Der Ablauf ist deshalb zweistufig: **Licht stellen** (`assign` läuft, die Felder wandern) →
**Felder festhalten** → aufbauen (`refit`: dieselben Felder, nur neu beurteilt). Das Licht wird
weiter bewertet, und zwar richtig — der Crop **mit** Figur ist der, der im Datensatz landet.

Gemessen wird auch **während der acht Drehungen**, nicht nur beim Aufbau: eine Wolke oder ein
Schatten zieht das ganze Brett mit, und eine Aufnahme, die dabei aus dem Band läuft, fiele sonst
erst im fertigen Datensatz auf — mit allen Frames schon geschrieben. `driftLine` nennt den Median
der Verschiebung gegen den Moment des Festhaltens und das stärkste Feld dazu; unter 3 Grauwerten
heißt es „stabil", weil die schmalsten Bänder 40 breit sind. Felder ohne aktuelle Messung zählen
nicht mit — ein fehlender Read wäre sonst ein Sturz um 200.

## Das CNN kontrolliert den Aufbau, es sperrt ihn nicht (2026-09-14)

Beim Aufbau läuft eine Kontrolle über `TrackerStatus.debug.cnnReads` (kein UI-Seitenkanal,
`entry.md`), je Zielfeld ein Zustand: `AGREES`, `OTHER_PIECE`, `EMPTY`, `UNSURE`, `OFF`. Dazu
`strayPieces` — Felder ohne Ziel, auf denen das Modell sicher eine Figur sieht.

**Warum es kein Veto sein darf:** aufgenommen wird genau auf den Kombinationen, die dem Modell
fehlen. 16 der 46 Lücken haben **null** Belege — dort ist seine Zuverlässigkeit nicht einmal
messbar. Ein Widerspruch kann also der Aufbau sein oder die Lücke selbst, und die beiden sind
nicht unterscheidbar. Der Mensch entscheidet; nichts wird gesperrt.

**Was trotzdem trägt:**

- `EMPTY` auf einem Zielfeld — der häufigste Fehler bei 19 Figuren, und er hängt *nicht* an der
  Figurklasse, sondern nur an der Belegung.
- `strayPieces` — eine Figur auf einem Feld, das die FEN als `empty` führt, macht dieses Label in
  **jedem** Frame des Laufs falsch, und dem Bild sieht man es später nicht an.
- `UNSURE` ist keine Aussage über den Aufbau und wird als solche angezeigt, nicht als Fehler.

Der Payload kostet 64 Felder je Bild und ist deshalb nur im Aufbau-Schirm armiert — **während der
Aufnahme aus**, die 4K-Aufnahme hat das Budget nicht.

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

## Die Orientierung entscheidet, welches Pixel welches Feld ist (2026-09-14)

`warpFromCorners` kennt **kein** `whitePov` — es baut die Homographie nur aus `corners` und
`margin` (`Warp.kt`). Die Feldzuordnung kennt es dagegen sehr wohl: `squareToColRow` dreht sie um
180 Grad, wenn `!whitePov`. Steht die Brettorientierung also auf `BLACK_BOTTOM`, liegt `a8` im
gewarpten Bild da, wo bei `WHITE_BOTTOM` `h1` liegt.

`measureSquares` verdrahtete `whitePov = true` fest. Folge wäre gewesen: jede Figur auf dem
gespiegelten Feld gemessen, dorthin gehängt und dorthin gelabelt — jeder Crop des Laufs falsch,
ohne Symptom. Der Schirm reicht die Einstellung jetzt durch (`AppSettings.orientation.whitePov`).

**Nicht aufgefallen, weil es einen Zwilling hat:** `cellRect` (`BoardPreview.kt`) verdrahtet
dieselbe Annahme für das Tracking-Overlay. Messung und Overlay sind damit konsistent *zueinander*
falsch, aber beide inkonsistent zu den Crops, die das CNN sieht. Das Overlay ist nicht mit
korrigiert — wer es anfasst, prüft zuerst, ob `BoardPreview` je unter `BLACK_BOTTOM` lief.

## Die Zieldomaene ist `dunkel` bis `hell` — die Raender kommen als Beifang (2026-09-14)

Am Geraet gemessen und vom Nutzer bestaetigt: die beiden Randbaender waren nicht nur schwer zu
treffen, sie liegen auch grossenteils ausserhalb dessen, was das Modell koennen muss.

| Band (alt) | Anteil | Kontrast | Dynamik | Farbigkeit |
|---|---|---|---|---|
| `sehr dunkel` (0-40) | 6,8 % | **28,7** | 83,8 | 13,3 |
| Mitte | 92,8 % | 69,2 | 183,8 | 21,9 |
| `sehr hell` (180-256) | 0,4 % | 75,3 | 206,1 | 24,7 |

`sehr dunkel` traegt **halben Kontrast und halbe Farbigkeit** — da ist wenig zu lernen.
`sehr hell` ist dagegen das kontrastreichste Band ueberhaupt, aber mit 1 352 Zellen so selten,
dass ein Auftrag dafuer den Aufwand nicht traegt. Nichts brennt aus: der hellste je gemessene
Wert ist **240**, der dunkelste **2** — 0 und 255 gibt es nicht, weshalb die geometrische Mitte
eines Randbands (20 bzw. 218) ein Ziel war, das nie existierte.

**Beide entstehen ohnehin nicht durch die Zimmerlampe.** Die Kamera regelt aus: bei Kerzenlicht
wird das Bild nicht dunkel, sondern verrauscht. Ein Extremwert entsteht durch SCHATTEN und
SPOTLIGHT — punktuelles Licht macht helle und tiefdunkle Zellen im selben Bild. Deshalb sind die
Raender Beifang einer solchen Aufnahme, kein eigener Auftrag.

Die Zieldomaene `[40, 180)` ist seitdem in fuenf **gleich breite** Gruppen geteilt (`dunkel`,
`halbdunkel`, `mittel`, `halbhell`, `hell`, je 28 Grauwerte). Gleich breit und nicht nach
Quantilen: Quantilgrenzen verschoeben sich mit jedem neuen Datensatz und machten alte
Lueckenzahlen unvergleichbar. `OUTSIDE` haelt `zu dunkel` und `zu hell` fuer die Messung bereit;
`coverage_gaps.gaps()` laeuft nur ueber `BANDS` und beauftragt sie nie.

**Was das bringt, gemessen auf `real13-mix-v7-128`:** 46 duenne Zellen -> **29**, davon **0 nur
ueber Licht** erreichbar (vorher 12). Aus 5 unmoeglichen Auftraegen werden **6 erfuellbare** mit
2 bis 10 Figuren. Am echten Brett (`20-19`, ohne jede Lichtaenderung): **9 von 10 Zielfeldern im
Band** statt 0 von 13.

Dritte Buendelgrenze ist seitdem `BAND_CAPACITY` — wie viele Felder EINER Farbe gleichzeitig in
eine Gruppe fallen, p90 ueber 15 235 volle Bretter. Ohne sie verlangte der Plan zwoelf Figuren
fuer eine Gruppe, in die ein einziges Feld faellt.

## Die Anweisung darf nicht am Kamerabild haengen (2026-09-14)

Zwei Fehler, die zusammen dafuer sorgten, dass der Nutzer **nie sah, was er aufbauen soll**:

- Der Erfassungs-Schirm startete `TrackerRun` nie. Ohne laufenden Dienst gibt es keine Kamera und
  kein `boardPreview` — der Mensch musste erst von Hand eine Partie starten.
- `TargetBoard` zeichnete das Overlay nur UEBER dem Kamerabild und sonst einen leeren Hinweis.
  Dazu war die Auftragszeile auf „10 Figuren, Kamera tief" gekuerzt, weil das Brett die Felder ja
  zeigte. Ohne Bild stand damit nirgends, welche Figur wohin gehoert.

Seitdem zeichnet der Schirm ohne Bild sein eigenes Raster, und `orderLine` nennt die Belegung im
Klartext (`wQ c8 · bK a1`) — unabhaengig davon, ob die Kamera etwas liefert.
