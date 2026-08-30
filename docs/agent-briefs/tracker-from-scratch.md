# Auftrag: Bau einen Zug-Tracker, der unseren schlägt

Vor dir liegt eine feste Kamera über einem Schachbrett, ein trainierter Klassifikator, der ein
einzelnes Feld liest, und ein Dutzend Aufnahmen echter Partien. Gesucht ist das, was dazwischen
fehlt: **die Entscheidung, wann ein Zug gespielt wurde und welcher.**

Am Ende willst du eine Liste von Halbzügen liefern, jeder mit dem Frame, auf dem er feststand.

## Warum das ein Experiment ist

Es gibt bereits einen Tracker in diesem Projekt. Er ist über Monate gewachsen, aus Frame-Differenz,
Vetos, Verify-Leitern und Commit-Gattern, und er trägt jede Entscheidung, die auf dem Weg dahin
getroffen wurde. Die Frage ist, ob jemand, der diesen Weg **nicht** kennt, mit denselben Signalen
etwas Besseres baut.

Deshalb: **Lies nichts von unserem Tracker.** Konkret ist alles unter `android/` außer
`android/arena/` gesperrt — besonders `android/core-engine/`, `android/tracker-runtime/` und
`android/desktop/`. Ebenso `docs/tracker-flow.md`, `docs/alarm-path.md`, `docs/hand-gate.md` und
`docs/position-check.md`. Das ist keine Geheimhaltung, sondern der Punkt der Messung: eine Lösung,
die unsere kennt, beantwortet die Frage nicht mehr.

Erlaubt und gewollt: `android/arena/README.md`, das Modul `android/arena/` selbst, alles was du
selbst schreibst — und **ausdrücklich alles von außen**. Lies Paper, sieh dir fremden Quellcode an,
such nach dem, was andere an diesem Problem versucht haben (Schacherkennung aus Kamerabildern gibt
es als Forschungsthema und als Open-Source-Projekt mehrfach). Diese Recherche ist erwünscht, nicht
geduldet: der einzige Weg, den du nicht nehmen sollst, ist unserer.

## Die Umgebung

`android/arena/README.md` beschreibt sie vollständig. In einem Satz: du implementierst

```kotlin
class YourTracker : ArenaTracker {
    override fun onFrame(frame: FrameView): List<String>   // UCI-Züge, die JETZT feststehen
}
```

in `android/arena/src/main/kotlin/com/chesslab/arena/agent/`, baust mit
`./gradlew.bat :arena:installDist` und lässt laufen:

```bash
./build/install/arena/bin/arena.bat run 2026-08-08-11-55-19 tracker=com.chesslab.arena.agent.YourTracker
```

Frames kommen in Reihenfolge, es gibt keinen zweiten Durchlauf und keinen Blick nach vorn. Pro Frame
hast du das rohe Kamerabild, die vier Brettecken, das entzerrte Brett und — wenn du danach fragst —
die Lesung des Klassifikators über alle 64 Felder. Das Fragen kostet Zeit und wird gezählt.

**Sieh dir zuerst an, was du bekommst:** `brett-rig.png` und `brett-handy.png` liegen neben diesem
Auftrag — ein entzerrtes Brett mit eingezeichnetem Raster, aus beiden Kameras. `arena board
<aufnahme> frame=N` erzeugt so ein Bild für jeden Frame. `a8` liegt oben links, `h1` unten rechts,
Weiss spielt von unten; die Kantenlänge misst die Arena aus der Aufnahme (928 px beim Rig, 1280 px
beim 4K-Handy). Die Ecken kommen als `[a8, h8, h1, a1]`, die 64 Zeilen von `squares()` dagegen
rangweise als `a1, b1, …, h8` — zwei verschiedene Reihenfolgen, und das ist die Sorte Fehler, die
man erst drei Stunden später bemerkt.

Willst du lieber in einer anderen Sprache arbeiten: `arena dump <aufnahme>` schreibt die Lesungen je
Frame als JSONL, und `arena score <deine-plies.jsonl> <aufnahme>` bewertet, was dabei herauskommt.

**Rechenlast: höchstens zwei Läufe gleichzeitig.** Jede JVM hält rund 6 GB, davon das meiste nativ
(OpenCV, FFmpeg, ONNX) und von keinem Heap-Limit erfasst; drei parallele Läufe haben auf dieser
Maschine schon einmal 32 GB gefüllt. Zum Entwickeln ist ohnehin `limit=2000` auf einer kurzen
Aufnahme der schnellere Weg — der volle Satz ist der Abschluss einer Idee, nicht ihr Test.

## Woran du gemessen wirst

Drei Zahlen je Aufnahme, nie zu einer verrechnet: **found / missed / invented**.

- `invented` sind Züge, die du gemeldet hast und die nicht gespielt wurden. Sie sind das **Veto**.
  Ein Lauf mit Phantomen ist kein besserer Lauf, egal wie viel er sonst findet.
- `missed` sind Referenzzüge, die du nie gemeldet hast. Verhandelbar.
- `median lag` ist der Abstand in Frames zwischen dem Referenzframe und deinem Commit. Nebenmetrik:
  die Referenzframes stammen selbst von einem Tracker, der zum Commit-Zeitpunkt gemeldet hat, also
  ist ~1–3 Frames der Boden und nicht dein Ziel.
- **Modell-Lesungen pro Lauf.** Das Ziel läuft auf einem Telefon. Ein Tracker, der auf jedem Frame
  die 64 Felder klassifiziert, ist keine Lösung, auch wenn er perfekt trifft. Unserer kommt auf
  71 bis 151 Lesungen für eine ganze Partie (siehe Tabelle unten).

Du bekommst **jede Aufnahme, die wir haben** — nichts ist zurückgehalten. Die Gegenprobe ist eine
Partie, die es heute noch nicht gibt: sie wird nach deiner Abgabe aufgenommen. Damit ist alles, was
sich an dieses Material anschmiegt, nicht bloß verboten, sondern wertlos. Rechne mit einem anderen
Tag, anderem Licht und einer Kamera, die neu ausgerichtet wurde.

## Die Latte

Der bestehende Tracker auf genau deinen Aufnahmen, mit demselben Modell und demselben Maß
(gemessen 2026-08-25):

| Aufnahme | Referenz | found | missed | invented | Lesungen | Lag |
|---|---:|---:|---:|---:|---:|---:|
| `VID_20260802_222203` | 3 | 3 | 0 | 0 | 90 | −1 |
| `VID_20260727_233929` | 10 | 7 | 3 | 0 | 58 | −49 |
| `2026-08-08-11-55-19` | 15 | 15 | 0 | 0 | 71 | −1 |
| `VID_20260726_233432` | 21 | 21 | 0 | 0 | 63 | −3 |
| `2026-08-07-13-52-38` | 25 | 25 | 0 | 0 | 151 | −3 |
| `VID_20260802_222741` | 28 | 27 | 1 | **6** | 200 | −3 |
| `VID_20260824_153751` | 35 | 9 | 26 | 0 | 33 | 0 |
| `2026-08-08-00-39-57` | 67 | 67 | 0 | 0 | 264 | −1 |
| `2026-08-08-11-59-12` | 73 | 52 | 21 | 0 | 108 | −1 |
| `VID_20260824_154327` | 117 | 10 | 107 | 0 | 29 | 0 |

Vier Aufnahmen löst er vollständig und ohne ein einziges Phantom auf — dort kannst du bestenfalls
gleichziehen. Auf den anderen ist Platz, und zwar viel: `VID_20260824_154327` ist eine vollständig
nachgespielte Partie über 117 Halbzüge, und er kommt bis Ply 10. Zu gewinnen ist an vier Stellen —
an den verpassten Plies, an den 6 Phantomen auf `222741`, an den Lesungen (29 bis 264 für eine ganze
Partie; wer 5 000 braucht, hat nichts gelöst), und daran, dass ein Verfahren erklärbar bleibt.

Zwei Dinge zum Lesen der Tabelle:

- Der negative Lag ist kein Vorsprung, sondern ein Artefakt: die Referenzframes stammen aus einem
  früheren Lauf desselben Trackers unter etwas anderen Einstellungen. Lies ihn als „gleichauf".
- **Die Referenz endet oft dort, wo unser Tracker aufgegeben hat** — die meisten `candidate.json`
  tragen die Notiz „Position lost". Wo eine `reference.pgn` weiter reicht, gilt sie; wo beide enden,
  weiss auch die Arena nicht weiter. Commits nach dem letzten Referenzzug zählen deshalb **nicht**
  als Phantom, sondern werden als `beyond the reference` ausgewiesen und von Hand geprüft. Das gilt
  nur, wenn du bis dahin nichts verpasst hast: wer einen Ply überspringt und weitermacht, hat
  Phantome.

## Verboten

- **Keine auswendig gelernten Partien.** Eine fest verdrahtete Zugliste, ein Abgleich gegen
  `candidate.json` oder `reference.pgn`, ein Eröffnungsbuch als Ersatz für die Wahrnehmung — alles
  disqualifiziert. Der Tracker darf nur aus den Bildern schließen, die er gerade gesehen hat.
- **Kein Blick in die Referenzdateien zur Laufzeit.** Auch nicht indirekt.
- **Kein Nachschlagen unseres Trackers**, siehe oben.
- Legale Schachregeln als Wissen zu benutzen ist dagegen ausdrücklich erlaubt — dass nur legale
  Züge möglich sind, ist eine Eigenschaft der Welt und keine Eigenschaft dieser Aufnahmen.

## Was über die Daten bekannt ist

Damit du keine Zeit mit Messungen verbrennst, die schon gemacht sind. Das sind Eigenschaften der
Aufnahmen und des Modells, keine Hinweise auf eine Lösung.

- **Die Kamera bewegt sich nicht.** Sie ist montiert, das Brett liegt fest. Die Ecken werden
  trotzdem regelmäßig neu gemessen, weil eine Hand den Marker verdecken kann.
- **Der Klassifikator sieht ein Feld, nie das Brett.** Er weiß nichts von Nachbarn, nichts von
  Stellungen, nichts von Zügen. Auf der Grundstellung liest er 64 von 64 Feldern richtig.
- **Verdeckung ist der Normalfall, nicht die Ausnahme.** Genau in dem Moment, in dem ein Zug
  passiert, ist eine Hand über dem Brett. Modelle mit `coverageOutput` melden je Feld, wie verdeckt
  es ist; über `coverageGate` ist die Klassenlesung dieses Felds wertlos. Gemessen: verdeckte Felder
  werden zu 55–63 % falsch klassifiziert, dabei aber mit niedriger Konfidenz.
- **Verdeckung ist einseitig.** Gespielt wird nur von Weiß, also sind weiße Felder 2–5× häufiger
  verdeckt als schwarze.
- **Das Brett hat einen Helligkeitsverlauf.** Über die Fläche liegen zwischen den Ecken rund 130
  Graustufen. Eine schwarze Figur auf dunklem Feld in der dunklen Ecke ist der schwierigste Fall.
- **Modellwahl.** Die Arena serviert nur 13+1-Modelle: 13 Klassenwahrscheinlichkeiten plus eine
  unabhängige Coverage-Spalte. Voreingestellt ist `real13-ms-s3-hn4-bn80` (`coverageGate` 0,15),
  daneben liegen `real13-ms-s2-bn80-bs256-swa1e4` und `comp13-occ-bn-lr1e2-bs512` (Gate 0,02 —
  das Gate folgt aus der Güte des Modells und unterscheidet sich zwischen den Familien um den
  Faktor 7). Du darfst wechseln, und `frame.squares("<modell>")` liest ein zweites im selben Lauf;
  jede Lesung wird je Modell gezählt. Sag dazu, welches du gemessen hast.
- **Was das Modell über sich selbst weiss.** `arena models` zeigt die Kernzahlen, die vollen Karten
  liegen unter `data/models/<modell>/`: `model_card.json` und `eval_*.json` mit Recall je Klasse,
  sichtbar gegen alle Felder, je Session; `confusion_*.txt` mit der Verwechslungsmatrix;
  `metrics.jsonl` mit dem Trainingsverlauf. Gemessen auf dem Test-Split des Trainings, nicht auf
  diesen Aufnahmen. Der Default trifft eine **sichtbare** Figur zu 81 % und eine sichtbare Belegung
  zu 99,9 %.
- **Vorsicht mit den Zahlen, die Verdeckung mitzählen.** Eine verdeckte Zelle behält ihr FEN-Label,
  ist aber aus dem Klassifikationsverlust maskiert — das Modell lernt sie nie und wird trotzdem
  dafür bewertet. `board_acc` (alle 64 Zellen gleichzeitig richtig) ist deshalb allein durch
  Verdeckung auf 54 % gedeckelt und obendrein `piece_acc` hoch 32; wir zeigen sie nicht mehr an.
  Dasselbe gilt für den Recall je Klasse: `wK` steht bei 0,14, aber der weisse König steht auf e1,
  wo die spielende Hand hinlangt — die Zahl misst überwiegend, wo die Hand ist, und nicht, welche
  Figur das Modell nicht kennt. Was du misst, prüfe darauf, ob es Verdeckung mitmisst.

## Was zu liefern ist

1. Der Tracker im Modul, lauffähig über `arena run`.
2. Die Zahlen auf allen Aufnahmen deines Arbeitsverzeichnisses, in einer Tabelle neben der Latte,
   plus die Anzahl der Modell-Lesungen je Lauf.
3. **Eine Seite darüber, worauf dein Verfahren beruht** — welches Signal die Entscheidung trägt,
   welche Annahme es bricht, wenn es bricht. Ohne das ist ein guter Lauf ein Zufall, den niemand
   nachbauen kann.
4. Was du versucht hast und verworfen hast, mit der Zahl daneben. Verworfene Wege sind Ergebnisse.
5. Woher deine Ideen kommen: Paper, Projekte, Verfahren, die du gelesen und benutzt hast, mit Link.
   Eine fremde Idee zu übernehmen ist gut; sie ohne Quelle zu übernehmen macht sie unprüfbar.
