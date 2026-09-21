# Durchsicht des Plans (2026-09-21) — vier Befunde am Code, einer trifft den Zweck

Der Umsetzungsplan zu `docs/tipps-auf-zuruf-entwurf.md` ging in eine unabhängige Durchsicht mit
ausdrücklicher Freigabe zum Neuentwurf. Urteil: **Stufe 1 bauen, Automatik streichen, Sprache
vorziehen** — und zwei zwingende Dinge fehlten ganz.

## Der Befund, der den Zweck selbst trifft

**Ein Tipp würde als eigene Leistung gutgeschrieben.** `GameReviewer` erkennt, dass der gespielte
Zug dem Enginezug entspricht, und setzt `playedBest` (`GameReview.kt`). Eine Herkunft „mit Tipp
gespielt" existiert nicht — `StoredMove` speichert nur Brett-Erkennungs-Provenienz
(`GameRecord.kt`). Das Kind bekäme für einen vorgesagten Enginezug **volle Genauigkeit**.

Ein Handicap-Feature, das die Bewertung fälscht, untergräbt genau das, wofür es da ist.

Nötig: Tipp mit FEN, Seite, Restkontingent und folgendem Ply speichern; im Review als „mit Hilfe"
kennzeichnen; assistierte Plies nicht als eigene `BEST`-Leistung in die Genauigkeit rechnen.

## Der Befund, der den Plan nicht laufen lässt

**`hintDriven` allein startet keine Engine.** Der Analyse-Host wird ausschließlich in `EvalBarSlot`
erzeugt (`EvalBar.kt`), und `BoardRow` setzt diesen Slot nur ein, wenn `analysis.enabled` wahr ist
(`TrackingScreen.kt`). Bei `enabled = false, hintDriven = true` existiert überhaupt kein Host, der
die Engine starten könnte.

Es braucht einen kopflosen Host außerhalb der Eval-Leiste: Sichtbarkeit und Laufgrund müssen
getrennte Zustände sein (`AnalysisDemand.NONE / HINTS / VISIBLE` — die Leiste rendert nur bei
`VISIBLE`, der Host läuft bei beidem).

## Die Automatik misst nicht Gefahr

„Abstand beste zu dritter Linie" misst, wie stark sich beste und drittbeste Fortsetzung
unterscheiden. Drei Gegenbeispiele:

| Linien | Abstand 1→3 | Wirklichkeit |
|---|---|---|
| 80, 79, 20 | groß | zwei fast gleich gute Züge — Tipp unnötig |
| 20, 19, 18 | klein | die Seite kann längst in Gefahr sein |
| 80, 20, 19 | groß | tatsächlich „nur ein Zug hält" |

Die relevante Größe ist **beste gegen ZWEITE** Linie: was verliert der Spieler, wenn er den besten
Ersatz statt des besten Zuges wählt. Dazu muss aus Weißsicht in die Sicht der unterstützten Seite
übersetzt werden (`AnalysisLine` speichert alles aus Weißsicht), und Matt braucht eine eigene
Fallunterscheidung.

Aber auch dann nicht ausliefern: der Code dokumentiert selbst, dass 400 ms bei `multiPv 3` **eine
Anzeige und kein Urteil** sind — ein vermeintlicher Patzer kann ein Tiefenartefakt sein
(`ReviewDepthMeasurementTest`). Und der Loop analysiert jede FEN nur einmal; eine Bestätigung aus
zwei Suchen gibt es nicht.

**Ein Produktfehler unabhängig von jeder Schwelle:** Automatik und Anfrage dürfen kein gemeinsames
Kontingent haben. Entweder das Telefon verbraucht die Hilfen des Kindes ohne Zustimmung, oder
automatische Hilfen kosten nichts und werden zu unbegrenztem Coaching. Beides widerspricht
„Schwarz darf dreimal fragen".

## Weitere belegte Korrekturen

- **Die Hilfeseite ist Partiezustand, kein `AppSettings`-Wert.** `AppSettings` trägt dauerhafte
  Gerätevorgaben; „in dieser Partie bekommt Schwarz drei Hilfen" gehört an `GameSessionController`
  und gilt bis `endAndSave`/`discard`. Nur die Vorgabe `hintQuota = 3` darf App-Einstellung sein.
- **Der geplante `HintSilencedTest` ist so nicht formulierbar.** `Speaker.say` gibt nichts zurück;
  erst `SpeechEngine` prüft `silenced()` und verwirft dort. Der Controller kann gar nicht wissen,
  dass der Speaker stumm blieb. Richtig: Karte kommt, Kontingent genau einmal ab — und ein eigener
  `SpeechEngine`-Test belegt, dass kein TTS-Aufruf erfolgte.
- **Das Mattvorzeichen darf nicht ignoriert werden.** `mate != null` heißt nicht „du hast Matt in
  n" — der Wert liegt aus Weißsicht vor. Drei Fälle: die Seite erzwingt Matt; sie wird mattgesetzt
  (dann nur der beste Zug, kein Wort über das eigene Matt); die Partie ist vorbei.
- **Der Verbrauch muss atomar sein.** Doppeltippen, zwei Auslöser gleichzeitig, ein spät
  eintreffendes Ergebnis — klassische Doppelzustellungen. Acht fehlende Testfälle wurden benannt,
  darunter „neue Partie setzt das Kontingent zurück" und „Service-Neuanbindung während der Partie".
- **Der dritte Knopf gehört nicht in die `ActionBar`.** Die wurde ausdrücklich auf „Take back" und
  „End game" reduziert; ein großer Kontextknopf darüber ist leichter zu treffen.

## Knopf gegen Sprache: beide Positionen waren zu absolut

Meine Ablehnung des Knopfes („die Hände sind am Brett") ist **unbelegt** — aus dem Code lässt sich
nicht zeigen, dass ein Tippen die Kamera verschiebt. Und „der Vater kann drücken" ist ein einzelnes
Nutzungsszenario, kein allgemeiner Eingabevertrag.

Reihenfolge: **Knopf als MVP, Schlüsselwort als nächster echter Schritt, keine Automatik als Ersatz
für Sprache.**

Ein sozialer Punkt, den keiner von uns bedacht hatte: **ein gesprochener Tipp plus sichtbare Karte
verrät dem starken Gegner die Hilfe, bevor sie ausgeführt wird.** Das kann in Ordnung sein, muss
aber bewusst entschieden werden; ein Bluetooth-Ohrhörer machte die Ausgabe privat.

Als dritte Eingabe vorgeschlagen und als Option — nicht als Standard — bewertet: ein
Bluetooth-Medienknopf oder ein kleiner Klicker. Ein Druck, kein Mikrofon-Dauerbetrieb, kein Griff
ans Kameratelefon. Ausdrücklich abgeraten wird von Schütteln, Handzeichen über dem Brett oder
absichtlich illegalen Zügen: sie benutzen genau den Wahrnehmungskanal, den der Tipp schützen soll.

## Zwei pädagogische Varianten, billig und unbelegt

- Tipp erst nach etwa zwanzig Sekunden eigener Denkzeit freigeben — kostet einen Timer, keine
  Schachrechnung.
- Zuerst „Schau dir deinen Springer an", auf zweiten Druck derselben Hilfe „Springer f3". Ableitbar
  aus SAN über das vorhandene `MovePhrase`, das Figur, Schlag, Rochade, Schach und Sprache schon
  kennt. Kostet einen Handgriff mehr und schwächt damit „einfach zu bedienen".

## Der Gegenentwurf, Version 1

Startkarte „Hilfe für: Niemand / Weiß / Schwarz", fest drei Hilfen, kein weiterer Startregler. Die
Hilfekonfiguration gehört zur laufenden Partie. Kopflose Analyse nur bei aktiver Hilfepartie, unter
dem **unveränderten** Druck-Gate. Ein großer Knopf „Hilfe (3)" nur am Zug der unterstützten Seite.
Der Druck erzeugt eine an FEN und Partie gebundene Anfrage; fehlt ein frisches Ergebnis, wartet sie
kurz; FEN-Wechsel, Alarm oder Rückzieher-Fenster verwerfen sie **kostenlos**. Zustellung als Karte
plus Sprache, dann atomar genau ein Verbrauch. Matttext nach Gewinner und Vorzeichen. Tipp und
folgender Zug werden als assistiert gespeichert, das Review markiert sie. **Keine Automatik.**
