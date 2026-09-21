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

## Der Vorschlag: in drei Stufen, die einzeln Wert haben

**Stufe 1 — Tipp auf Knopfdruck, gesprochen und geschrieben.**
Start-Dialog mit „eine Seite darf Hilfe anfordern" plus Kontingent; ein Tipp-Knopf am Tracking-
Screen; Inhalt aus `AnalysisResult`: bei `mate != null` „du hast Matt in n" (mit der Linie aus
`MateLineResolver`), sonst der beste Zug als SAN. Ausgabe über den vorhandenen `Speaker` **und**
als Karte, damit ein stumm geschaltetes Telefon den Tipp nicht verschluckt.
Das ist das ganze Feature bis auf das Mikrofon — und es kostet fast nichts, weil jede Rechnung
schon läuft.

**Stufe 2 — Zuhören, per Druck-zum-Sprechen.**
Ein Knopf, der das Mikrofon *für die Dauer des Drucks* öffnet. Das umgeht die Stromfrage, den
Thermik-Konflikt und das Sich-selbst-Hören vollständig, weil der Ansager in dieser Zeit ohnehin
nicht spricht. Eine Hotword-Erkennung („Hey Chesslab") umgeht nichts davon.

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
