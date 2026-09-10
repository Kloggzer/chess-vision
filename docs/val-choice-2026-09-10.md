# Der Val-Satz entscheidet mit — und unserer war blind

> Gemessen 2026-09-10 auf `real13-mix-v5-80-clahe` (112 Sessions) gegen `real13-mix-v4` (110).
> Anlass: vier Läufe über Nacht lagen auf gemeinsamem Testsatz **unter** den alten Modellen,
> obwohl der Korpus gefiltert und neu exportiert worden war.

## Die Kurzfassung

Nicht die Daten waren der wahrscheinlichste Grund, sondern **die Auswahl des Val-Satzes**. Der
neue Val (`2026-09-06-21-29-35`) enthält **keinen einzigen weißen Springer**, zwölf schwarze Damen
und 73 % `empty`. Damit ist `macro_recall` — und über ihn `score`, das Checkpoint-Kriterium —
auf vier von 13 Klassen Rauschen.

Der alte Val (`2026-08-16-20-41-33`) bildete die Trainingsverteilung dagegen fast exakt ab.

| Klasse | train % | alt (`20-41-33`) | neu (`21-29-35`) |
|---|---:|---:|---:|
| `empty` | 55 | 58,1 % | **73,1 %** |
| `wN` | 2,8 | 1,2 % (441) | **0,00 % (0)** |
| `bN` | 2,7 | 2,1 % (780) | 0,08 % (36) |
| `wQ` | 1,5 | 1,6 % (587) | 0,08 % (37) |
| `bQ` | 1,5 | 1,6 % (585) | **0,03 % (12)** |

**Folge:** der beobachtete Abstand zwischen den Nachtläufen (A 0,9366 gegen B 0,9459 auf
`val_visible_piece_acc`) ist nicht belastbar, und die Schwankungen im Verlauf — die zunächst der
Lernrate zugeschrieben wurden — erklären sich mindestens teilweise aus dem Val-Signal.

## Warum der Val gewechselt wurde

Der Schärfe- und Dunkelfilter (2026-09-09, `SHARP_MIN_FRACTION`, `DARK_CELLS_MAX`) hat
`20-41-33` von 1 048 auf 170 Zeilen gestutzt. Damit verlor der alte Val seine Abdeckung — im
neuen Datensatz trägt er nur noch 79 Bretter und fünf dünne Klassen. **Der Filter ist die Ursache
für den Wechsel**, der Wechsel wurde dann nach Bildqualität und Größe entschieden statt nach
Klassenabdeckung.

## Schärfe ist nur klassenweise vergleichbar

Die Laplace-Varianz je Feld hängt an der Quellauflösung; ein korpusweiter Median mischt drei
Kameraklassen. Getrennt gemessen (Median der eigenen Klasse):

| Auflösung | Sessions | Median | Ausreißer |
|---|---:|---:|---|
| 3840×2160 | 2 | 1359 | — |
| 2560×1440 | 12 | 407 | `20-41-33` **0,12×**, `21-29-35` 0,90× |
| 1920×1080 | 8 | 521 | zwei Häufungen: `VID_*` 0,12–0,32×, `2026-08-0x` 1,68–2,32× |

Zwei Dinge folgen daraus:

- Der alte Val war **auch innerhalb seiner Klasse** das schlechteste Material. Die alten Modelle
  wurden auf Ausschuss ausgewählt und auf dem leichtesten Material gemessen.
- Der Testsatz (`00-39-57`, `11-55-19`) liegt bei 1,68× und 2,26× **und** in der scharfen
  1080p-Häufung — einer Aufnahmefamilie, die im Training vier von 22 Sessions stellt. Zahlen von
  dort sagen wenig über den Normalfall und nichts über die 1440p-Handyaufnahmen.

## Klassenabdeckung je Session

13 der 22 echten Aufnahmen haben volle Abdeckung (keine Figur unter 100 Beispielen). Kandidaten
für einen künftigen Val, ohne die beiden Testsessions:

| Session | Bretter | seltenste | `empty` | Auflösung | Schärfe × Klasse |
|---|---:|---:|---:|---|---:|
| `2026-09-06-20-27-33` | 370 | 184 | 61 % | 1440p | 1,20× |
| `2026-09-06-20-57-45` | 339 | 117 | 67 % | 1440p | 1,33× |
| `2026-08-30-16-20-19` | 167 | 108 | 57 % | 1440p | 1,48× |
| `2026-08-07-13-52-38` | 383 | 372 | 55 % | 1080p | 1,87× |

Empfehlung: `20-27-33`, notfalls zusammen mit `20-57-45` (709 Bretter, ≥117 je Klasse). Beide
stammen vom selben Aufnahmetag — ein Val aus einem Tag misst einen Aufbau, nicht die Bandbreite.

## Die Turntables fehlen, seit es sie gibt

`data/crops/turntable-clean` trägt 32 512 Crops über 48 Sessions (508 vollständige Bretter): je
1 016 Springer, Läufer und Türme pro Farbe, je 508 Damen und Könige, **keine Bauern**. Weder
`real13-mix-v4` noch `real13-mix-v5-80-clahe` enthalten davon etwas — eine alte Lücke, keine
Regression.

**Sie schliessen aber keine Trainingslücke.** Gemessen im Train-Split von `real13-mix-v5-80-clahe`
liefern die Kompositen bereits über die Hälfte jeder Klasse, gerade der seltenen:

| Klasse | echt | komposit | train gesamt |
|---|---:|---:|---:|
| `wN` | 7 132 | 10 754 (60 %) | 17 886 |
| `wQ` | 3 927 | 5 377 (58 %) | 9 304 |

Die Turntables addieren darauf 6–9 %. Ihr eigenes Argument ist die **Winkelabdeckung** — sie
tasten dieselbe Figur nach Winkel ab, wo Kompositen Stellungen zusammensetzen. Sie stammen
allerdings aus denselben vier Quellvideos, die über `comp13-v3` ohnehin im Satz sind (0 identische
Crop-Pfade, aber gleiche Quelle). Aufnehmen ja, einen Sprung davon erwarten nein.

Als Val taugen sie nicht: einzelne Figuren auf einem Drehteller sind keine Spielstellungen.

## Was das für Vergleiche heißt

- `val_visible_piece_acc` ist **nur innerhalb desselben Val-Satzes** vergleichbar. Zwischen
  Datensätzen entscheidet `chesslab eval --dataset <gemeinsamer> --boards-only`.
- Ein gemeinsamer Testsatz genügt dafür nicht allein: er bestimmt, *wogegen* gemessen wird, aber
  der Val bestimmt, *welche Gewichte* antreten.
- Ein Val-Satz gehört nach **Klassenabdeckung** gewählt, nicht nach Bildqualität. Bildqualität
  entscheidet, wie schwer die Aufgabe ist; Abdeckung entscheidet, ob die Messung überhaupt misst.
