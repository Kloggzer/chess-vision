# CLAUDE.md — die Arena

Dieses Verzeichnis ist ein Versuchsaufbau, kein Produktivprojekt. Der Auftrag steht in
`AUFTRAG.md` im Wurzelverzeichnis — lies ihn zuerst, er ist die Spezifikation.

## Worum es geht

Aus Videoaufnahmen einer festen Kamera über einem Schachbrett soll eine Liste von Halbzügen
entstehen, jeder mit dem Frame, auf dem er feststand. Die Umgebung dafür ist `android/arena/`
(siehe dessen `README.md`): sie dekodiert, entzerrt, klassifiziert und bewertet. Die Entscheidung,
wann ein Zug passiert ist, fehlt — die baust du.

## Was hier NICHT gelesen wird

In diesem Baum liegt der Kotlin-Code eines bestehenden Trackers, weil die Arena gegen ein paar
seiner Bausteine kompiliert (Geometrie, Modell-Laden). **Seine Logik ist gesperrt**:
`android/core-engine/`, `android/tracker-runtime/src/main/kotlin/com/chesslab/tracker/{service,
pipeline,games}/`. Das ist keine Geheimhaltung — der Versuch fragt, ob jemand ohne Kenntnis dieses
Wegs einen besseren findet, und eine Lösung, die unsere kennt, beantwortet die Frage nicht mehr.

Erlaubt und erwünscht ist alles von aussen: Paper, fremder Quellcode, Verfahren aus der Literatur.

## Arbeitsweise

- **Bauen:** `cd android && ./gradlew.bat :arena:installDist`
- **Laufen:** aus `android/arena` heraus
  `./build/install/arena/bin/arena.bat run <aufnahme> tracker=<fqcn>`
- **Schnell iterieren:** `limit=2000` bricht nach N Frames ab.
- **Stil:** `./gradlew.bat :arena:ktlintFormat` vor jedem Commit; `:arena:detekt` und `:arena:test`
  müssen grün sein. Kommentare sagen *warum*, nie was der Code schon sagt, und bleiben unter fünf
  Zeilen.
- **Messen statt vermuten.** Jede Zahl, die du nennst, muss aus einem Lauf stammen, den man
  wiederholen kann. Ein verworfener Weg mit einer Zahl daneben ist ein Ergebnis.
