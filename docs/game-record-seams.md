# Das gespeicherte Spiel: Nähte, Segmente und was sie kosteten

Die Belege hinter `GameSessionController` und seinem Test
(`android/app/src/test/kotlin/com/chesslab/tracker/games/GameSessionControllerTest.kt`). Jeder Test
dort traegt einen Satz mit Zeiger hierher; der Testname sagt die Behauptung.

## Ein Ergebnis, das das BRETT nicht sehen kann

Aufgabe, vereinbartes Remis, eine Partie einfach beendet: `resultFromFen` gibt fuer alle `*`
zurueck, also las vor der gespeicherten Angabe jede normal beendete Partie in der Bibliothek
"Game in progress".

## Eine Sicht, zwei Quellen

Wenn `LiveGame.view()` und dieselbe Partie von der Platte je ueber einen Ply uneins waeren, saehen
Zuschauer und Nachbetrachtung wieder verschiedene Partien an — genau der Zustand, den das ersetzt
hat.

## Verwerfen muss das PROTOKOLL fallen lassen

Es tat frueher keins von beidem: "Reset game -> Discard" setzte den Tracker zurueck und liess dieses
Protokoll stehen, der naechste committete Ply war daraus illegal und oeffnete eine Naht in einer
Partie, die der Nutzer schon weggeworfen hatte. Unsichtbar, solange niemand das Protokoll las — in
dem Moment, als die laufende Partie das Partieformular auf dem Schirm wurde, war es eine verworfene
Partie, die weiter gezeigt wurde.

## Der Bug hinter jeder Naht auf dem Geraet

Commits und Statusaktualisierungen sind zwei Collectors auf zwei Flows, und der Status wird
gesampelt — ein Status, der einen Moment VOR einem Commit aufgenommen und einen Moment danach
zugestellt wird, traegt also die Stellung, die das Protokoll gerade verlassen hat. Das ist Bit fuer
Bit, wie eine Ruecknahme aussieht, und das Protokoll loeschte daraufhin den Ply, den es gerade
geschrieben hatte; der naechste Commit passte dann nicht mehr in die Linie und oeffnete eine Naht.
Gemessen am 2026-08-10: die Engine committete und meldete 69 Plies, alle sauber, und die
gespeicherte Partie behielt 39.

Was die zwei trennt, ist ZEIT und nicht Form: eine Ruecknahme bleibt auf dem Brett, ein spaetes
Sample wird binnen eines Intervalls von der aktuellen Stellung ueberholt.

## D1: die Engine committet ueber ZWEI Ereignisse

`MoveCommitted` und `SequenceCommitted` (schnelles Spiel `Commit.kt:165`, CNN-Recovery
`CnnTick.kt:252`). Beide reihen im Motor ein Sitzungsfoto ein (`Commit.kt:158`, `CnnTick.kt:223`),
und fuenf weitere Konsumenten des Busses behandeln beide. Dieser Controller behandelte nur das
erste, also fehlte jeder Paar-Commit und jede CNN-Recovery in der gespeicherten Partie UND in der
aufgezeichneten Sitzung. Ein Foto je COMMIT, nicht je Ply — das tut
`queueSessionCapture(sans.last())`.

## D2: nicht jeder Re-Anchor darf fotografieren

Python nimmt das aufgeschobene Foto nur, wenn die Verdeckungsmenge leer ist (`tracker.py`); die
Kotlin-Engine sendet `ReAnchored` bedingungslos (`TrackerEngine.kt:414`). Auf jedem Re-Anchor zu
flushen fotografiert das Brett mit einer Hand darueber — 64 Crops, als Figuren gelabelt, die nicht
zu sehen sind.

## D3: vier von fuenf Partien auf dem Geraet waren keine legalen Folgen

Sie brachen bei Ply 1, 2, 18 und 28. Die Engine kann keinen illegalen Zug committen, der Bruch ist
also das Brett der Engine, das zwischen zwei Commits SPRINGT (ein aufgeloester Alarm, ein
FEN-Resync, eine angenommene Recovery). Der Controller sah nichts davon: er behandelte
`MoveCommitted`, `SequenceCommitted` und `ReAnchored` und verwarf `Alarm` / `AlarmCleared`.

Eine Linie, die zwei Stellungen ueberspannt, ist als Partie UND als gelabelte Daten unbrauchbar,
weil jede FEN nach der Naht falsch ist. Der erste Fix SCHLOSS das Protokoll an der Naht, und das
kostete den Nutzer die Partie: eine gespielte Partie kam als drei Dateien vom Geraet
(*"fuer mich als Nutzer ist so ne Naht in der Game-Historie unverstaendlich"*). Seitdem oeffnet eine
Naht ein SEGMENT — eine neue legale Linie im selben Protokoll — und eine gespielte Partie bleibt ein
gespeichertes Protokoll.

Segmente sind additiv: die flache Zugliste, die jeder bestehende Leser liest
(`GameSummary.moveCount`, die Partieliste, der Detail-Screen), haelt weiterhin jeden committeten Ply
in der Reihenfolge und ueber die ganze Partie einmal durchnummeriert.

## Nur fuer eine Luecke, die nichts erklaert

Eine CNN-Recovery committet von dort, wo das BRETT steht, und das Protokoll liegt um die Plies
zurueck, die der Tracker hinter einer Hand verpasst hat. Das ist kein verlorenes Brett: es gibt
genau eine legale Folge von hier nach dort, also werden die Plies angehaengt und die Linie laeuft
weiter. Der Bericht des Nutzers zu einer Partie voll davon: *"die Segmente sind mit einer Warnung
voneinander getrennt obwohl sie sich einfach schliessen lassen, da dort ein CNN recovery
stattfand"*.

Deshalb braucht ein Test ueber Naehte eine Luecke, die ueberhaupt keine legale Erklaerung hat —
`AFTER_JUMP` selbst ist keine Naht mehr, dort fehlt genau 1...e5 und `closeSeams` findet es.

## Eine Naht darf die Plies nicht verschlucken, die sie verursacht haben

Sie sind von der letzten Stellung des geschlossenen Protokolls aus illegal — das IST eine Naht — und
sie gehen der `startFen` des neuen Protokolls voraus, landen also in keiner der beiden Zuglisten.
Das war still: eine gespielte Partie am 2026-07-28 wurde als drei Dateien gespeichert, und Qxd4,
Qe5+ und Be7 stehen in keiner davon. Die Fragmente wieder aneinanderzuketten ist ohne sie unmoeglich.

Ein Undo einen Ply nach einer Naht darf kein Segment zuruecklassen, das keine Zuege haelt: das
Protokoll behauptete sonst, die App habe das Brett fuer nichts neu aufgebaut, und der Detail-Screen
zeichnete eine Nahtnotiz gefolgt von nichts.

## Kein Frame, solange der Alarm steht

Das Brett der App und das physische Brett widersprechen sich — das BEDEUTET der Alarm — ein jetzt
aufgenommenes Foto wird also gegen eine FEN gespeichert, die es nicht beschreibt. Das sind
vergiftete Trainingsdaten und hinterher nicht von guten zu unterscheiden.

Python hat kein eigenes Gate dafuer: alarmiert blockiert es jeden Commit und jeden Re-Anchor
(`tracker.py`), und diese zwei sind das Einzige, was den Rekorder antreibt. `TrackerEngine.kt:406`
blockiert Re-Anchor genauso. Der Test nagelt die Eigenschaft beim KONSUMENTEN fest, damit sie
ueberlebt, was immer die Engine tut — er faellt gegen ein `isClean`, das nur Verdeckung und Taint
prueft.

## Der Decider gehoert auf das Commit-Ereignis

Jeder der 77 Plies aus fuenf Geraetesitzungen speicherte `provenance: null` — auch die Sitzungen mit
eingeschaltetem Debug. Der Decider wurde aus der Debug-Nutzlast gelesen und ueber `accepted && uci`
zugeordnet, eine zweite Quelle, die danebenliegen kann, waehrend die Engine ihn direkt auf dem
Commit-Ereignis nennt. Ohne ihn kann eine gespeicherte Partie die eine Frage nicht beantworten, die
sich lohnt: welcher Pfad diesen Zug committet hat.

## PGN: ein Spiel je Segment

Eine PGN-Datei darf mehrere Partien halten, und das ist die ehrliche Form fuer ein Protokoll mit
Naht: ein Spiel je Segment, jedes aus seiner eigenen `[FEN]` nachspielbar. Aus zwei Stellungen eine
Hauptvariante zu fabrizieren erzeugt eine Datei, die jeder Leser falsch nachspielt.

## Migration der Geraete-Fragmente

Die vier am 2026-07-28 vom Geraet gezogenen Fragmente liegen im Vor-Segment-Format vor: eine legale
Linie ab `startFen`, mit `openedBySeam` daneben. `ignoreUnknownKeys` liesse das Feld beim ersten
Lesen fallen und der naechste Schreibvorgang loeschte es, also wird es migriert. Die Fragmente, die
tatsaechlich auf dem Geraet liegen, sind sogar aelter als `openedBySeam`: eine `startFen` mitten in
der Partie, eine Zugliste, und nichts, was sagt, woher sie kam. Sie muessen trotzdem oeffnen — als
ein Segment, das keine Naht behauptet, weil nie eine aufgezeichnet wurde.
