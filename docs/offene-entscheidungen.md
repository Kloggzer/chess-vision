# Was deine Entscheidung braucht (Stand 2026-09-14, abends)

Gesammelt während der Audit-Wellen. Jeder Punkt ist gemessen oder belegt — es fehlt nicht die
Analyse, sondern eine Richtungsentscheidung. Erledigtes fliegt raus, diese Liste ist kein Archiv.

## 1. `MarkerTracker`: Kotlin gefixt, Python bewusst nicht — Divergenz oder nachziehen?

Ein Eck-Sprung wurde über eine beliebig lange Lücke hinweg bestätigt: `pending` wurde nur in
`accept()` geleert, nie beim Altern, obwohl das KDoc **aufeinanderfolgende** Bilder verlangt.
Gemessen: Ecke bei (100,100), Kandidat (200,100), Marker 500 Bilder verdeckt, erste Sichtung
danach bei (205,100) → akzeptiert und auf **136,75** geglättet, auf ein einziges Wiedersehen hin.

`android/core-geometry/.../MarkerTracker.kt` ist seit 2026-09-14 gefixt.
`src/chesslab/calibration.py:751` trägt **denselben Fehler als treuen Port** und ist es nicht.

**Die Frage:** Python nachziehen? Es ist der Export-Pfad — ein Fix ändert die Ecken künftiger
Exporte, also die Geometrie neuer Crops. Bestehende Aufnahmen bleiben, wie sie sind. Nachziehen
heisst Parität, Nichtnachziehen heisst eine bekannte, dokumentierte Abweichung.

## 2. `_persistent`: der Fix gilt nur für KÜNFTIGE Exporte

`framescan._persistent` nahm die Vereinigung statt der Schnittmenge, also galten zwei abwechselnd
flackernde Zellen gemeinsam als dauerhafte Änderung — `classify` erklärte daraufhin den Rest des
Intervalls zu `stale`/`changed`, und diese Frames fielen aus dem sauberen Vorrat.

**Die Frage:** betroffene Aufnahmen neu exportieren, um die verlorenen Frames zu heben? Ein Export
kostet ~28 s je Aufnahme. Wie viele Frames es wirklich sind, ist NICHT gemessen — das ginge nur,
indem man einen Satz zweimal exportiert und vergleicht.

## 3. Der Regressionssatz ist blind für die häufigste Fehlerklasse

Dreimal am 2026-09-14 gefahren — vor den Engine-Fixes, nach dem Gate-Wechsel, nach Welle fünf.
Jedes Mal **385 / 14 / 1 / 167 und 6 Alarme**, Ziffer für Ziffer. Er beweist damit zuverlässig,
dass nichts kaputtgeht, und das ist sein Zweck.

Aber: **vier Stellungs-Lücken** wurden an dem Tag gefunden (Evidenz aus einer fremden Stellung),
und **keine einzige** bewegt den Satz. Auch das Gate von 0,5 auf 0,25 bewegt ihn nicht, obwohl es
17 % mehr Zellen maskiert. Dem Satz fehlt Material, in dem eine Hand über einem Feld steht, das
gerade die Evidenz trägt.

**Die Frage:** neue Aufnahmen gezielt dafür — von Schwarz gespielt, im Dunkeln, mit langsamen
Griffen über entscheidende Felder? Das deckt sich mit dem, was ohnehin geplant war.

## 4. Zwei Aufnahmen sind unvollständig gescannt

| Aufnahme | Zeilen | `grid_lines` | `hand_squares` |
|---|---|---|---|
| `2026-08-15-23-01-43` | 16 | ja | **nein** |
| `2026-08-30-14-33-02` | 4 | **nein** | **nein** |

Die anderen 22 sind vollständig. Beide sind winzig — Testexporte? Nachscannen oder parken?

(Die drei `--all`-Sweeps waren wochenlang wirkungslos, weil sie über das leere `data/sessions/`
liefen. Nachgeprüft: die Einzelverben wurden von Hand gefahren, die Daten sind bis auf diese
zwei vollständig. Seit 2026-09-14 laufen die Sweeps richtig.)

## 5. Testabdeckung: gemessen, aber ohne Konsequenz

Erstmals am 2026-09-14 gemessen: Python 67,1 %, Kotlin 64,7 % ohne `:app`, Web `lib/` 73,9 %,
die Web-Routen 18,6 %, die UI-Seiten 0 %.

**Die Frage:** soll daraus ein Tor werden (eine Zahl, die nur steigen darf), oder bleibt es eine
Momentaufnahme? Mein Eindruck nach diesem Tag: die Höhe sagt wenig — `core-engine` stand bei
92 % und trug trotzdem vier Stellungs-Fehler. Ein Tor auf die ROUTEN (18,6 %) wäre gezielter.

## 6. Die Kommentar-Ratsche steht bei 8, das Ziel ist 3

`CommentBudgetTest` feuert erst ab 8 aufeinanderfolgenden Kommentarzeilen; CLAUDE.md nennt 3 als
Ziel und 5 als Obergrenze. Python und TS sind bei harten 5.

**Die Frage:** Kotlin auf 5 ziehen? Das ist Handarbeit an den Dateien, die heute darüber liegen —
absehbar, aber nicht klein.
