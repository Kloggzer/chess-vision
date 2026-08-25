# Die Arena

Ein Brett, eine Kamera, ein Klassifikator und eine Anzeigetafel — und **kein Tracker**.

Hier lässt sich ein Zug-Tracker gegen echte Aufnahmen schreiben und messen, ohne eine Zeile des
bestehenden zu lesen. Alles in diesem Modul ist Infrastruktur: dekodieren, entzerren,
klassifizieren, bewerten. Das einzige, was es nicht liefert, ist eine Meinung darüber, **wann ein
Zug passiert ist**.

## Bauen und starten

```bash
cd android && ./gradlew.bat :arena:installDist
```

Danach aus `android/arena` heraus (jeder Pfad im Programm ist relativ zu diesem Verzeichnis):

```bash
./build/install/arena/bin/arena.bat list
```

| Befehl | Was er tut |
|---|---|
| `arena list` | alle Aufnahmen mit Video und ob eine Referenz danebenliegt |
| `arena run <aufnahme> [tracker=<fqcn>] [model=…] [align=N] [limit=N] [out=…]` | spielt die Aufnahme durch den Tracker und bewertet ihn |
| `arena score <plies.jsonl> <aufnahme>` | bewertet eine fertige Zugliste — auch eine, die außerhalb der JVM entstanden ist |
| `arena dump <aufnahme> [every=N] [model=…] [out=…]` | schreibt die Modell-Lesung je Frame als JSONL, für einen Tracker in einer anderen Sprache |

`limit=N` bricht nach N Frames ab — das ist der schnelle Durchlauf beim Entwickeln.

## Das Interface

```kotlin
class YourTracker : ArenaTracker {
    override fun onFrame(frame: FrameView): List<String> = emptyList()
}
```

`onFrame` bekommt jeden dekodierten Frame **in Reihenfolge** und gibt die Züge zurück, die *auf
diesem Frame* feststehen — als UCI (`e2e4`, `e7e8q`). Die Arena führt das Brett: sie spielt zurück,
was zurückkommt, und weist alles Illegale ab (laut, gezählt). Nichts zurückgeben ist immer erlaubt.

`FrameView` bietet:

| | |
|---|---|
| `index`, `tsMs`, `fps` | Frame-Nummer, Video-Zeit, Bildrate |
| `raw` | das BGR-Kamerabild (OpenCV `Mat`) — **nur während dieses Aufrufs gültig** |
| `quad` | die vier Brettecken im Bild (`a8, h8, h1, a1`), oder `null` |
| `squares()` | 64 Zeilen `a1..h8` mit den Klassenwahrscheinlichkeiten des Modells |
| `board(size)` | das entzerrte Brett als Bild; der Aufrufer gibt es frei |
| `classes`, `coverageOutput`, `coverageGate` | was die Spalten von `squares()` bedeuten |

`squares()` kostet echte Zeit (~20–40 ms für alle 64 Felder) und **jeder Aufruf wird gezählt**. Die
Zahl steht am Ende neben dem Ergebnis: ein Tracker, der auf jedem Frame fragt, ist keiner, der auf
einem Telefon laufen kann. Innerhalb eines Frames ist der zweite Aufruf gratis (gecacht).

## Wie ein Brett aussieht

```bash
./build/install/arena/bin/arena.bat board 2026-08-08-11-55-19 frame=60
```

schreibt zwei PNG: das entzerrte Brett, wie `frame.board()` es liefert, und dasselbe mit
eingezeichnetem Feldraster und beschrifteten Eckfeldern. Zwei Beispiele liegen als
`brett-rig.png` und `brett-handy.png` neben dem Auftrag.

Was dort zu sehen ist:

- **`a8` oben links, `h1` unten rechts** — Weiss spielt von unten. Die Ecken kommen als
  `[a8, h8, h1, a1]` (`frame.quad`), die 64 Zeilen von `squares()` dagegen als
  `a1, b1, …, h1, a2, …, h8` — rangweise von Reihe 1. Die beiden Reihenfolgen sind NICHT dieselbe.
- **Die Kantenlänge ist nicht fest.** Sie wird aus der Aufnahme gemessen: 928 px beim Rig-Video
  (Zelle 116 px), 1280 px bei der 4K-Handyaufnahme (Zelle 160 px). `frame.geometry()` sagt, was
  gerade gilt; `frame.board(size)` skaliert auf Wunsch.
- **Ein Crop ist grösser als sein Feld.** `padSide` 0,05 heisst, dass jede Seite 5 % einer Zelle
  Umgebung mitnimmt — die 80×80 px, die das Modell sieht, zeigen 1,1 Zellen.
- **Hohe Figuren ragen in die Nachbarfelder.** Die Kamera steht schräg über dem Brett, also liegt
  der Kopf einer Dame nicht über ihrem eigenen Feld. Das ist keine Fehlkalibrierung, sondern
  Perspektive, und auf der Grundreihe am stärksten.

## Was `squares()` liefert

Eine Zeile je Feld, in `a1..h8`-Reihenfolge (also `a1, b1, …, h1, a2, …, h8`). Die ersten 13 Spalten
sind eine Softmax über `empty, wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK`. Trägt das Modell
`coverageOutput`, ist Spalte 13 **keine Klasse**, sondern ein unabhängiges Sigmoid: wie stark das
Feld verdeckt ist. `coverageGate` ist der Wert, ab dem die Klassenlesung dieses Modells nichts mehr
wert ist — er folgt aus der Güte des Modells und unterscheidet sich zwischen Modellfamilien um den
Faktor 7.

Modelle liegen unter `android/app/src/main/assets/cnn_model/`. `arena run model=<name>` wählt eins.

## Die Bewertung

Drei Zahlen, nie zu einer verrechnet:

```
found 15 / missed 0 / invented 0 · median lag 1 frames
```

`found` sind Züge der Referenz, die der Lauf in der richtigen Reihenfolge gefunden hat (längste
gemeinsame Teilfolge über die SANs). `missed` sind Referenzzüge, die er nie gemeldet hat.
`invented` sind Commits, die in der Referenz nicht vorkommen — **Phantome**. Ein Phantom
disqualifiziert, ein Miss ist verhandelbar; deshalb wird nie gemittelt.

`median lag` ist der Abstand in Frames zwischen dem Referenzframe eines Zuges und dem Frame, auf
dem der Lauf ihn gemeldet hat. Bei einer PGN-Referenz gibt es keine Frames und keinen Lag.
