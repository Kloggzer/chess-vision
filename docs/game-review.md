# Die Partie: gespeichertes Spiel, Auswertung, Tipps

Die Belege hinter `GameSessionController` (und `GameSessionControllerTest`),
`analysis/GameReview.kt`, `ui/review/GameReviewScreen.kt` und `hints/`. Im Code steht jeweils ein
Satz mit Zeiger hierher.

## Das gespeicherte Spiel: Naehte und Segmente

### Ein Ergebnis, das das Brett nicht sehen kann

Aufgabe, Remis, eine einfach beendete Partie: `resultFromFen` gibt fuer alle `*`. Ohne die
gespeicherte Angabe las jede normal beendete Partie "Game in progress".

### Eine Sicht, zwei Quellen

`LiveGame.view()` und dieselbe Partie von der Platte duerfen ueber keinen Ply uneins sein, sonst
sehen Zuschauer und Nachbetrachtung verschiedene Partien.

### Verwerfen muss das Protokoll fallen lassen

"Reset game -> Discard" setzte frueher nur den Tracker zurueck; der naechste Ply war im alten
Protokoll illegal und oeffnete eine Naht in einer Partie, die der Nutzer schon weggeworfen hatte.

### Ein spaetes Status-Sample ist keine Ruecknahme

Commits und Status sind zwei Collectors auf zwei Flows; ein Status, der vor einem Commit gesampelt
und danach zugestellt wird, traegt die alte Stellung — Bit fuer Bit eine Ruecknahme. Das Protokoll
loeschte daraufhin den eben geschriebenen Ply: am 2026-08-10 committete die Engine 69 Plies, die
gespeicherte Partie behielt 39. Was die zwei trennt, ist ZEIT: eine Ruecknahme bleibt stehen, ein
spaetes Sample wird binnen eines Intervalls ueberholt.

### Die Engine committet ueber ZWEI Ereignisse

`MoveCommitted` und `SequenceCommitted` (schnelles Spiel, CNN-Recovery). Der Controller behandelte
nur das erste, also fehlte jeder Paar-Commit und jede Recovery in Partie UND Sitzung. **Ein Foto je
COMMIT, nicht je Ply** (`queueSessionCapture(sans.last())`).

### Kein Foto mit Hand, kein Foto im Alarm

- Die Kotlin-Engine sendet `ReAnchored` bedingungslos; auf jedem Re-Anchor zu fotografieren nimmt
  das Brett mit einer Hand darueber auf — 64 Crops, als Figuren gelabelt, die niemand sieht.
- Solange der Alarm steht, widersprechen sich App-Brett und echtes Brett; ein Foto dann ist
  vergiftetes Trainingsmaterial. Der Test nagelt das beim KONSUMENTEN fest, damit es ueberlebt,
  was immer die Engine tut.

### Eine Naht oeffnet ein Segment, nur fuer eine Luecke, die nichts erklaert

Vier von fuenf Partien auf dem Geraet waren keine legalen Folgen: das Brett der Engine SPRINGT
zwischen zwei Commits (aufgeloester Alarm, FEN-Resync, Recovery). Das Protokoll an der Naht zu
SCHLIESSEN zerlegte eine Partie in drei Dateien (*"fuer mich als Nutzer ist so ne Naht in der
Game-Historie unverstaendlich"*). Seitdem oeffnet eine Naht ein **Segment** — eine neue legale
Linie im selben Protokoll. Die flache Zugliste haelt weiter jeden Ply, durchnummeriert.

Eine CNN-Recovery committet von dort, wo das Brett steht, und das Protokoll liegt um die hinter
einer Hand verpassten Plies zurueck. Gibt es genau eine legale Folge dorthin, werden die Plies
**angehaengt**, keine Naht. Ein Naht-Test braucht deshalb eine Luecke ohne jede legale Erklaerung
(`AFTER_JUMP` ist keine Naht mehr, dort fehlt genau 1...e5).

Eine Naht darf die Plies nicht verschlucken, die sie verursacht haben — am 2026-07-28 standen Qxd4,
Qe5+ und Be7 in keiner der drei gespeicherten Dateien. Ein Undo direkt nach einer Naht laesst kein
leeres Segment zurueck.

### Decider, PGN, Migration

- **Der Decider gehoert auf das Commit-Ereignis.** Aus der Debug-Nutzlast gelesen trugen alle 77
  Plies aus fuenf Geraetesitzungen `provenance: null`.
- **PGN: ein Spiel je Segment**, jedes aus seiner eigenen `[FEN]` nachspielbar.
- **Alte Fragmente werden migriert:** `ignoreUnknownKeys` liesse `openedBySeam` fallen und der
  naechste Schreibvorgang loeschte es. Noch aeltere Fragmente (nur `startFen` und Zuege) oeffnen
  als ein Segment, das keine Naht behauptet, weil nie eine aufgezeichnet wurde.

## Die Auswertung

### Das Budget sind KNOTEN, wie bei lichess

Ein ZEIT-Budget benotet dieselbe Partie warm anders als kalt; eine TIEFEN-Schranke liegt in jeder
Phase woanders. `REVIEW_NODES = 1 500 000` ist lichess' Zahl je Zug. Gemessen ueber die 84
Stellungen von `2026-08-02_2159` gegen 6,8 M Knoten:

| Budget | Median-Tiefe (Spanne) | Klassenwechsel |
|---|---|---|
| `depth 16` | 16 (0..16) | 17 von 83 |
| 500 k Knoten | 18 (0..245) | 14 von 83 |
| **1,5 M Knoten** | **21 (0..245)** | **10 von 83** |

Die Spanne ist das Argument: derselbe Aufwand loest ein abgetauschtes Endspiel bis Tiefe 245 und
bringt ein Mittelspiel auf 16. Am Telefon reproduziert das Knotenbudget die PC-Tiefe (Median 20
gegen 21). `capMs` ist ein Sicherheitsventil, nicht das Budget.

`ReviewBudget` ist `@Serializable`, weil es der SCHLUESSEL der gespeicherten Analyse ist
(`ReviewStore`): zwei Budgets benoten denselben Ply verschieden. `multiPv` ist 1; stellbar nur,
damit `ReviewDepthMeasurement` die Live-Leiste (`movetime 400`, `multiPv 3`) nachstellen kann.

`MATE_CP` ist 10 000: jeder Wert jenseits von lichess' ±1000-Decke taugt, `winChanceCeiled` klemmt
ihn wie lichess' `fromMate`. Matt braucht deshalb keinen Sonderfall.

### Was benotet wird

- **Entschiedene Plies zaehlen nicht.** Lag eine Stellung an beiden Enden jenseits der
  ±1000-cp-Decke, bekommt der Ply gratis 100 %. Auf `2026-08-02_2159` las das Weiss 76,5 /
  Schwarz 75,6 statt **71,4 / 66,5** — neun Punkte von Schwarz' Wertung waren die Laenge der
  eigenen Niederlage. Das ist UNSERE Regel (lichess zaehlt sie), deshalb nennt der Screen den
  Nenner.
- **Ein von der CNN wiederhergestellter Zug zaehlt wie jeder andere** — der `decider` sagt, WIE
  der Zug gefunden wurde, nicht ob er geschah. Nicht benotet wird der erste Ply nach einer NAHT
  (`seamPlies`): er folgt nicht aus der Stellung davor.
- **Von der angeschauten Stelle nach aussen.** Der alte Durchgang (0 bis n) schaffte am Geraet 25
  von 84 Stellungen in 55 s und zeigte bis zum Ende nichts; ein Ply braucht nur seine zwei
  Nachbarstellungen. Eine Stellung nach der anderen auf einem Engine-Prozess.
- **Funde nach SCHWUNG sortiert.** Verpasste Matts vorn zu sortieren setzte regelmaessig einen Zug
  von 98 % auf 98 % an die Spitze; das ist jetzt die eigene Frage `missedChances()`. Ein
  rekonstruierter Ply steht in keinem von beiden Abschnitten.

### Der Screen

- **Moments ist der erste Tab** (specs/48): eine fertige Partie oeffnet man, um zu finden, was
  schiefging. `TOP_FINDINGS` ist 3 — das Arbeitsgedaechtnis fasst etwa vier Bloecke.
- **Beide Pfeile gehoeren demselben Ply:** gespielt (Letzter-Zug-Farbe) und was die Engine
  stattdessen wollte (Akzent). Diese Paarung IST die Auswertung. Frueher zeichnete der Pfeil den
  Engine-Zug des NAECHSTEN Ply, Pfeil und Karte lagen einen Ply auseinander. Identische Zuege
  zeichnen nichts zusaetzlich.
- **Das Verdikt hat zwei Spalten** (*"die zweispaltigkeit war besser"*, 2026-08-04): links die
  Stellung VOR dem Ply (Zug, Kosten, erzwungenes Matt), rechts, was die Engine gespielt haette. Ein
  Fund fuehrt auf den Ply DAVOR, wo der bessere Zug noch da war.
- **Der Tab-Name ist das LABEL, immer.** `Moments · 24` aenderte sich beim Streamen und
  `tap-text "Moments"` scheiterte. `TAB_COUNT_SLOT` reserviert auf BEIDEN Seiten Platz, damit das
  Label und nicht das Paar zentriert ist.
- **Eine Erklaer-Geste:** ⓘ neben einer Ueberschrift oeffnet einen Dialog und erklaert ein KONZEPT.
  Braucht ein Label das, um verstanden zu werden, ist das Label falsch.
- **Kein Engine-Zustand auf diesem Screen:** fertig hat keinen, laufend gehoert er dem
  Analyse-Banner der App-Leiste. Der Lauf ueberlebt den Screen (`ReviewHost`), sichtbar und
  stoppbar, und ist deshalb vom `AnalysisGate` ausgenommen. Die Karte, die ihn startet, ist nach
  specs/48 Regel 3 der gefuellte Button.

## Tipps auf Zuruf

**Entschieden 2026-09-22: HOLSCHULD.** Eine Seite, die Hilfe eingeschaltet hat, darf fragen; das
Telefon bietet nie von sich aus etwas an — *"Muss nicht präventiv vom Handy kommen sondern aktiv
vom Nutzer"*. Nicht "Kindermodus", sondern jede Seite mit Hilfe. Der Zweck ist Ausgleich: das
Kontingent ist ein Handicap, keine Sparmassnahme.

**Gebaut (Stufe 1, Knopf):** Hilfe fuer Niemand / Weiss / Schwarz je PARTIE, Kontingent pro Partie
(`DEFAULT_HINT_QUOTA = 3`). Inhalt: bester Zug als SAN, bei erzwungenem Matt "Matt in n" aus Sicht
der unterstuetzten Seite. Ausgabe als Karte UND Sprache, damit ein stummes Telefon den Tipp nicht
verschluckt.

- **Ein Tipp kehrt `gateBlock` nicht um:** hat das Gate die Analyse wegen Hitze, Akku oder
  Bildrate geopfert, gibt es eine Absage, und die kostet kein Kontingent.
- **Ein Tipp ist an seine Stellung gebunden** und verfaellt kostenlos bei FEN-Wechsel, Alarm oder
  offenem Rueckzieher-Fenster (`HINT_SETTLE_MS` = `UNDO_CONFIRM_MS`). Genau diese Zustaende haben
  schon zweimal echte Partien zerlegt.
- **Der Record sagt, was vorgesagt war.** `StoredMove.hint` (`MoveHint`) traegt den genannten Zug
  und ob er gespielt wurde; `HintLedger` bindet ueber die FEN. `StoredGame.hints` sagt, dass
  ueberhaupt aufgezeichnet wurde — eine Partie ohne ihn liest `NOT_RECORDED`, nicht "ohne Hilfe".
  Anzeige `◆` (vorgesagt) und `◇` (Tipp, anderer Zug gespielt), mit Klartext.

**Offen, und eine PRODUKTentscheidung:** die Benotung ist unveraendert — ein vorgesagter Zug
bekommt dieselbe Note wie jeder andere. Moeglich: nur markieren (heute), aus der Genauigkeit
herausrechnen, getrennt ausweisen, oder abwerten (die einzige Variante, die eine Wertung erfindet).

**Nicht gebaut:** Zuhoeren auf ein Schluesselwort "Hilfe" (Stufe 2) — `RECORD_AUDIO` und ein
Erkenner fehlen, Strom fuer das Mikrofon ist ungemessen; wenn, dann nur im Fenster zwischen
committetem Gegenzug und eigenem Zug, damit der Ansager sich nicht selbst hoert. Warnhinweise
("pass auf deinen Turm auf", Stufe 3) haben keine Rechnung. **Keine Automatik:** der Abstand
zwischen Engine-Linien misst keine Gefahr, 400 ms `multiPv 3` sind eine Anzeige und kein Urteil,
und ein geteiltes Kontingent verbraucht Hilfen ohne Zustimmung.
