# Tipps auf Zuruf — Entwurf (2026-09-21)

Die Idee des Nutzers: beim Partiestart wählbar, dass **eine Seite** Hilfe anfordern darf, mit
Kontingent (sein Beispiel: Schwarz drei Mal). Angefordert per **Sprache**. Der Tipp kommt von der
Engine — bester Zug, eine Warnung („pass auf deinen Turm auf"), bei vorhandenem Matt „Matt in n".

Der Boden ist erhoben. Das Ergebnis verschiebt den Zuschnitt: **der teure Teil ist nicht die
Engine und nicht die Stimme, sondern das Zuhören** — und ein Teil der Idee hat heute überhaupt
keine Rechnung.

## Was schon da ist, und zwar fertig

- **Stockfish liegt als natives Binary im APK und läuft auf dem Telefon.** `UciEngine` spricht UCI,
  `StockfishAnalyzer` hält einen Analyse-Loop auf eigenem Thread. Bester Zug als UCI *und* SAN,
  Bewertung als Gewinnerwartung, und **die Mattdistanz mit Vorzeichen** liegt als
  `AnalysisLine.mate` vor — `EvalBar` rendert sie schon als `M3`.
- **„Matt in n, und so geht's" ist gebaut.** `MateLineResolver.resolve` verlängert eine kurze PV
  bis zum tatsächlichen Matt (max 12 Suchen, 72 Plies).
- **Text-to-Speech ist vollständig** — 523 Zeilen: eigene Engine-Schicht, Warteschlange,
  Audio-Fokus mit Ducking (`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`, Freigabe sobald leer),
  Stumm-Regeln bei Klingelton-aus und Nicht-Stören, Sprachen de/en, Einstellungsseite mit
  Testknopf. `MoveAnnouncer` spricht bereits committete Züge.
- **Anzeigeorte:** eine reservierte einzeilige `infoLine`, `AlarmCard` als Muster für „Karte über
  dem Brett", und `AnalysisPanel` als bestehender Dialog mit den Engine-Linien.

## Was fehlt — und was davon teuer ist

| Teil | Zustand | Kosten |
|---|---|---|
| Tipp-Inhalt „bester Zug" / „Matt in n" | Rechnung **liegt vor** | ~null |
| Tipp **sprechen** | TTS **fertig** | ~null |
| Start-Auswahl, Seite, Kontingent | gibt es nicht | klein, in sich geschlossen |
| Tipp **per Sprache anfordern** | gibt es **nichts** | teuer und riskant |
| „pass auf deinen Turm auf" | **keine Rechnung** | eigenes Feature |

### Das Zuhören ist der teure Teil

`RECORD_AUDIO` fehlt im Manifest, `SpeechRecognizer` kommt nirgends vor, es gibt im ganzen Projekt
**keine Tonausgabe außer TTS** — kein Piepsen, keine Vibration. Nötig wären: die Berechtigung samt
Laufzeitabfrage, ein `<queries>`-Eintrag (sonst findet der Erkenner ab Android 11 seinen Dienst
nicht), und eine Entscheidung zwischen Google-Cloud (braucht Netz), On-Device ab API 33 (Gerät muss
das Modell haben) oder einer mitgelieferten Engine wie Vosk — **eine dritte native Abhängigkeit
neben Stockfish, OpenCV und ONNX Runtime.**

Dazu zwei Kollisionen, die schon gebaut sind:

- **Audio-Fokus.** Ein Erkenner, der zuhört, während der Ansager „Springer f3" spricht, hört sich
  selbst. Heute gibt es genau einen Konsumenten, und der nimmt und gibt den Fokus sauber zurück.
- **Stumm.** `AndroidSilence.silenced()` schaltet die Stimme bei Klingelton-aus komplett ab. Ein
  per Sprache angeforderter Tipp würde dann **wortlos verschwinden**.

Und der Strom: der ausgelieferte Arbeitspunkt steht bei **−38 mA netto**, das Telefon lädt gerade
eben noch. Für Mikrofon-Dauerbetrieb gibt es in diesem Repo **keine Messung** — unbelegt. Bekannt
ist nur, dass das Gerät nach zwei Stunden auf 72 °C geht und `gateBlock` die Analyse dort längst
abschaltet. Ein Dauer-Erkenner zöge Budget genau dort, wo die Engine sich schon selbst opfert.

### „Pass auf deinen Turm auf" ist ein eigenes Feature

Bedrohungserkennung existiert nirgends. `GameReviewer` benotet einen **gespielten** Zug im
Nachhinein (`PlyGrade`, `MoveQuality`, „besser wäre gewesen"); ein Warnhinweis *vor* dem Zug ist
eine andere Rechnung. Machbar wäre sie aus vorhandenen Teilen — eine Suche auf der Stellung mit
vertauschtem Anzugsrecht zeigt, was der Gegner gerade droht —, aber das ist Entwurfsarbeit und
nicht „auch noch dazu".

## Nachtrag: der ZWECK ist Ausgleich, nicht Analyse (Nutzer, 2026-09-21)

> „Ich dachte das wäre ein Feature um Kinder oder schwächere gegen starke Spieler zu unterstützen
> … ich dachte als keyword Hilfe wäre genug."

Das ändert drei Dinge, und eine meiner Empfehlungen kippt damit.

**Der Zweck beantwortet meine erste „Entscheidung" von selbst.** Wenn ein Kind gegen einen starken
Spieler bestehen soll, ist der beste Zug, klar gesagt, genau richtig — ein Hinweis in der Art von
„pass auf deinen Turm auf" nützt jemandem nichts, der noch nicht sieht, *warum*. Und das
**Kontingent IST der Ausgleichsregler**: drei Tipps sind ein Handicap wie Springer-Vorgabe, keine
Sparmaßnahme. Das gehört in den Start-Dialog als das, was es ist.

**Und es kippt meine Empfehlung „Druck-zum-Sprechen".** Ich hatte den Knopf vorgeschlagen, weil er
Strom, Thermik und Selbsthören umgeht. Für diesen Zweck ist er falsch: **die Hände des Spielers
sind am Brett.** Zum Telefon zu greifen ist genau das Ereignis, gegen das dieser Tracker den
ganzen Tag kämpft — eine Hand über dem Brett ist Verdeckung, und im schlimmsten Fall committet die
Engine dabei etwas Falsches. Ein Kind, das nach dem Handy greift, um Hilfe zu holen, stört die
Aufnahme, die es gerade hilft. Sprache ist hier kein Komfort, sondern die einzige Eingabe, die das
Brett nicht anfasst.

**Ein einzelnes Schlüsselwort ist ein kleineres Problem als freie Sprache** — dafür gibt es
Schlüsselwort-Erkenner, die klein genug fürs Gerät sind. Das Zuhören selbst bleibt aber der Preis.

### Der Ausweg, der aus dem Projekt selbst fällt: ein Zeitfenster

Das Telefon muss nicht die ganze Partie zuhören. Es weiß, **wer am Zug ist** (`TrackerStatus.fen`)
und **wann ein Zug fertig gesetzt ist** (`MoveCommitted`). Das Mikrofon braucht also nur zu laufen:

- wenn die **unterstützte Seite am Zug** ist,
- **nachdem** der Gegenzug committet und der Ansager fertig gesprochen hat,
- **bis** der eigene Zug committet ist.

Das halbiert die Hörzeit auf die Denkzeit einer Seite, löst das Selbsthören **strukturell**
(der Ansager spricht im geschlossenen Fenster) und respektiert die Rangordnung von `gateBlock`:
wird es warm, schweigt das Mikrofon zuerst — mit einem hörbaren Hinweis, damit ein Kind nicht
vergeblich ruft.

Ob das den Strom trägt, ist offen und nicht geraten: für Mikrofonbetrieb gibt es in diesem Repo
keine Messung. Das Fenster macht die Frage aber beantwortbar, statt sie zu umgehen — man misst
eine Partie mit und eine ohne, wie `docs/battery.md` es für die Bildrate vormacht.

## Der Vorschlag: in drei Stufen, die einzeln Wert haben

**Stufe 1 — Tipp auf Knopfdruck, gesprochen und geschrieben.**
Start-Dialog mit „eine Seite darf Hilfe anfordern" plus Kontingent; ein Tipp-Knopf am Tracking-
Screen; Inhalt aus `AnalysisResult`: bei `mate != null` „du hast Matt in n" (mit der Linie aus
`MateLineResolver`), sonst der beste Zug als SAN. Ausgabe über den vorhandenen `Speaker` **und**
als Karte, damit ein stumm geschaltetes Telefon den Tipp nicht verschluckt.
Das ist das ganze Feature bis auf das Mikrofon — und es kostet fast nichts, weil jede Rechnung
schon läuft.

**Stufe 2 — Zuhören im Zeitfenster, Schlüsselwort „Hilfe".**
Nicht Druck-zum-Sprechen (die Hände sind am Brett) und nicht dauerhaft, sondern genau in der
eigenen Denkzeit: Fenster auf, wenn der Gegenzug committet und der Ansager geschwiegen hat, zu,
wenn der eigene Zug steht. Ein Schlüsselwort genügt, freie Sprache ist nicht nötig.

**Stufe 3 — Warnhinweise.**
Bedrohungserkennung als eigene Rechnung, eigener Entwurf, eigene Messung.

## Die drei Entscheidungen, die dem Nutzer gehören

1. **Wie viel verrät ein Tipp?** „Springer f3" spielt für dich; „pass auf deinen Turm auf" lenkt
   nur den Blick. Deine Beschreibung nennt beides, und es sind zwei verschiedene Features mit
   verschiedenen Kosten. Stufe 1 liefert das Erste.
2. **Gilt das Kontingent pro Partie oder pro Phase?** Drei Tipps in einer 60-Züge-Partie sind
   etwas anderes als drei in der Eröffnung.
3. **Darf ein Tipp die Engine hochfahren, wenn das Gate sie gerade abgeschaltet hat?** Heute ist
   `AnalysisSettings.enabled` per Vorgabe **aus**, und `gateBlock` opfert die Analyse bei Hitze,
   schwachem Akku oder zu langsamen Frames — mit dem ausdrücklichen Kommentar „analysis is what
   gets sacrificed, every time". Ein Tipp-Feature, das diese Rangordnung umkehrt, ist eine
   Produktentscheidung und keine Implementierung.

## Der riskanteste Punkt, und er ist keiner der obigen

**Wer fragt, und wann gilt der Tipp?** Die App weiß aus `TrackerStatus.fen`, wer am Zug ist —
aber nicht, wer das Telefon in der Hand hält; `BoardOrientation` sagt nur, welche Ecke `a8` ist.
Schlimmer: ein Tipp, der auf einer Stellung gerechnet wurde, die `GameSessionController` gerade
noch als möglichen Rückzieher führt (`UNDO_CONFIRM_MS = 500`) oder die der Alarm-Latch für
unglaubwürdig erklärt hat, ist **schlechter als kein Tipp**. Genau diese zwei Zustände haben in
diesem Projekt schon zweimal echte Partien zerlegt.

Ein Tipp muss deshalb an die Stellung gebunden sein, aus der er gerechnet wurde, und verfallen,
wenn sie nicht mehr gilt — dieselbe Disziplin, die `VerifySingle` für CNN-Schnappschüsse fordert
(`snap.fen != pend.fen` darf nicht abstimmen).

## Entschieden 2026-09-22: der Nutzer fragt, das Telefon bietet nichts an

> "Es ist ja nicht nur so das kinder das feature nutzen können sollen aber alle Spieler die die
> Hilfe anhaben, dann soll gerne einfach nach Hilfe gefragt werden können. Muss nicht aktiv
> passieren." — und praeziser: "Muss nicht präventiv vom Handy kommen sondern aktiv vom Nutzer"

Damit sind zwei Fragen weg, und eine dritte stellt sich anders.

**Die Richtung steht: HOLSCHULD, keine Bringschuld.** Das Telefon meldet sich nie von sich aus.
Kein praeventiver Hinweis, keine automatische Warnung, kein "du koenntest". Das ist der billigere
und der bessere Weg zugleich: ein Vorschlag, den niemand angefordert hat, muesste bei jeder
Stellung neu entscheiden, ob er jetzt angebracht ist — eine Rechnung, die es nicht gibt, und ein
Urteil, das der App nicht zusteht.

**Der Nutzerkreis ist groesser als gedacht.** Nicht "Kindermodus", sondern jede Seite, die Hilfe
eingeschaltet hat. Der Start-Dialog spricht deshalb neutral von Hilfe und Kontingent.

**Die dritte Frage aus dem Entwurf — "wie viel verraet ein Tipp?" — bleibt offen, aber sie
blockiert nichts mehr.** Stufe 1 liefert den besten Zug und "Matt in n"; ob es daneben je eine
leisere Sorte Tipp gibt ("pass auf deinen Turm auf"), ist Stufe 3 und hat weiter keine Rechnung.

### Zwei Vorgaben, die ich selbst gesetzt habe

Beide folgen bestehenden Konventionen dieses Projekts, keine davon braucht eine Messung.

1. **Das Kontingent gilt pro PARTIE.** Das Beispiel des Nutzers ("schwarz 3 mal") liest sich so,
   und es ist die Regel, die man ohne Nachschlagen im Kopf behaelt.
2. **Ein Tipp kehrt die Rangordnung von `gateBlock` nicht um.** Hat das Gate die Analyse wegen
   Hitze, Akku oder zu langsamer Bildrate abgeschaltet, gibt es eine hoerbare und sichtbare
   Absage — und das Kontingent wird NICHT verbraucht. Der Kommentar an der Stelle sagt seit je
   "analysis is what gets sacrificed, every time"; ein Tipp-Feature, das das umdreht, waere eine
   Produktentscheidung, und der Nutzer hat sie nicht getroffen.

Dieselbe Regel gilt fuer einen Tipp, dessen Stellung nicht mehr gilt (moeglicher Rueckzieher,
stehender Alarm-Latch): er verfaellt, und er kostet nichts.

## Aufgezeichnet 2026-09-22: der Record sagt, was vorgesagt war — und benotet es nicht

Stufe 1 liess eine Luecke offen: ein vorgesagter Zug zaehlte in der Nachbetrachtung weiter als
eigene Leistung. Wer drei Tipps nahm, bekam dafuer drei `BEST`-Bewertungen — als Ausgleichssystem
gedacht, erzaehlte die Partie hinterher nicht mehr, was passiert ist. Das ist die Fehlerfamilie
dieses Projekts: etwas Fremdes wird als gemessener Normalwert weitergereicht.

**Aufgezeichnet wird die Tatsache, additiv.** `StoredMove.hint` (`MoveHint`) traegt den Zug, den
der Tipp NANNTE, und ob der Spieler ihn dann spielte. Die Bindung ist die STELLUNG: `HintLedger`
legt einen zugestellten Tipp unter dem FEN ab, aus dem er gerechnet wurde, und
`GameSessionController` holt ihn genau fuer den Ply, der aus dieser Stellung gespielt wird. Ein
verfallener Tipp wird nie zugestellt und faellt damit nirgends an; ein Tipp, der nicht befolgt
wurde, bleibt ein Vermerk, ist aber **kein vorgesagter Zug**.

**"Kein Tipp" und "nicht aufgezeichnet" sind zwei Dinge.** Die Partie traegt `StoredGame.hints`
(`HintRecord`: Seite, Kontingent, zugestellte Tipps). Seine ANWESENHEIT sagt, dass ueberhaupt
hingesehen wurde. Eine Partie von vorher traegt ihn nicht, und jede Zeile darin liest als
`NOT_RECORDED` — nicht als "ohne Hilfe gespielt". `hintStatus(recorded, hint)` ist die eine
Stelle, die das entscheidet.

**Die Anzeige nennt es neutral:** `◆` an der Zugzeile heisst "dieser Zug wurde vorgesagt", `◇`
heisst "hier gab es einen Tipp, gespielt wurde ein anderer Zug", beides mit Klartext (deutsch und
englisch wie `AlarmPhrase`/`HintPhrase`) und als `contentDescription`. Die Legende erscheint nur
unter einer Partie, die auch Zeichen traegt.

### Offen, und ausdruecklich eine PRODUKTentscheidung: was die Benotung daraus macht

Die Benotung ist **unveraendert**. `GameReviewer`, `PlyGrade` und `MoveQuality` sehen den Vermerk
nicht; ein vorgesagter Zug bekommt weiter dieselbe Note wie jeder andere. Wie es weitergeht, ist
eine Entscheidung des Nutzers, keine Implementierung:

- **Nur markieren (heute).** Die Note bleibt, der Leser sieht die Herkunft und urteilt selbst.
- **Aus der Genauigkeit herausrechnen.** Vorgesagte Zuege zaehlen nicht in `Accuracy`/`GameGrade`,
  die Prozentzahl misst dann nur eigene Zuege — und faellt bei drei Tipps auf weniger Stichprobe.
- **Getrennt ausweisen.** Zwei Zahlen nebeneinander, "eigene Zuege" und "mit Hilfe", ohne dass eine
  von beiden die andere ersetzt.
- **Abwerten.** Eine eigene Stufe unterhalb von `BEST` fuer einen vorgesagten Zug — das ist die
  einzige Variante, die eine Wertung ERFINDET, und sie braucht eine Begruendung, die es nicht gibt.

Solange nichts entschieden ist, gilt: die Tatsache steht im Record und auf dem Schirm, die Zahlen
bleiben, wie sie waren.

## Durchsicht des Plans (2026-09-21) — vier Befunde am Code, einer trifft den Zweck

Der Umsetzungsplan zu `docs/tipps-auf-zuruf-entwurf.md` ging in eine unabhängige Durchsicht mit
ausdrücklicher Freigabe zum Neuentwurf. Urteil: **Stufe 1 bauen, Automatik streichen, Sprache
vorziehen** — und zwei zwingende Dinge fehlten ganz.

### Der Befund, der den Zweck selbst trifft

**Ein Tipp würde als eigene Leistung gutgeschrieben.** `GameReviewer` erkennt, dass der gespielte
Zug dem Enginezug entspricht, und setzt `playedBest` (`GameReview.kt`). Eine Herkunft „mit Tipp
gespielt" existiert nicht — `StoredMove` speichert nur Brett-Erkennungs-Provenienz
(`GameRecord.kt`). Das Kind bekäme für einen vorgesagten Enginezug **volle Genauigkeit**.

Ein Handicap-Feature, das die Bewertung fälscht, untergräbt genau das, wofür es da ist.

Nötig: Tipp mit FEN, Seite, Restkontingent und folgendem Ply speichern; im Review als „mit Hilfe"
kennzeichnen; assistierte Plies nicht als eigene `BEST`-Leistung in die Genauigkeit rechnen.

### Der Befund, der den Plan nicht laufen lässt

**`hintDriven` allein startet keine Engine.** Der Analyse-Host wird ausschließlich in `EvalBarSlot`
erzeugt (`EvalBar.kt`), und `BoardRow` setzt diesen Slot nur ein, wenn `analysis.enabled` wahr ist
(`TrackingScreen.kt`). Bei `enabled = false, hintDriven = true` existiert überhaupt kein Host, der
die Engine starten könnte.

Es braucht einen kopflosen Host außerhalb der Eval-Leiste: Sichtbarkeit und Laufgrund müssen
getrennte Zustände sein (`AnalysisDemand.NONE / HINTS / VISIBLE` — die Leiste rendert nur bei
`VISIBLE`, der Host läuft bei beidem).

### Die Automatik misst nicht Gefahr

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

### Weitere belegte Korrekturen

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

### Knopf gegen Sprache: beide Positionen waren zu absolut

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

### Zwei pädagogische Varianten, billig und unbelegt

- Tipp erst nach etwa zwanzig Sekunden eigener Denkzeit freigeben — kostet einen Timer, keine
  Schachrechnung.
- Zuerst „Schau dir deinen Springer an", auf zweiten Druck derselben Hilfe „Springer f3". Ableitbar
  aus SAN über das vorhandene `MovePhrase`, das Figur, Schlag, Rochade, Schach und Sprache schon
  kennt. Kostet einen Handgriff mehr und schwächt damit „einfach zu bedienen".

### Der Gegenentwurf, Version 1

Startkarte „Hilfe für: Niemand / Weiß / Schwarz", fest drei Hilfen, kein weiterer Startregler. Die
Hilfekonfiguration gehört zur laufenden Partie. Kopflose Analyse nur bei aktiver Hilfepartie, unter
dem **unveränderten** Druck-Gate. Ein großer Knopf „Hilfe (3)" nur am Zug der unterstützten Seite.
Der Druck erzeugt eine an FEN und Partie gebundene Anfrage; fehlt ein frisches Ergebnis, wartet sie
kurz; FEN-Wechsel, Alarm oder Rückzieher-Fenster verwerfen sie **kostenlos**. Zustellung als Karte
plus Sprache, dann atomar genau ein Verbrauch. Matttext nach Gewinner und Vorzeichen. Tipp und
folgender Zug werden als assistiert gespeichert, das Review markiert sie. **Keine Automatik.**
