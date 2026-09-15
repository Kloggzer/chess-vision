# Die Partie-Auswertung: Budget, Benotung und der Screen

Die Belege hinter `android/app/src/main/kotlin/com/chesslab/tracker/analysis/GameReview.kt` und
`ui/review/GameReviewScreen.kt`. Im Code steht jeweils ein Satz mit Zeiger hierher.

## Das Engine-Budget sind KNOTEN, wie bei lichess

Keiner der zwei naheliegenden Knoepfe taugt. Ein ZEIT-Budget ist eine Eigenschaft des Telefons und
seiner Temperatur, also benotet dieselbe Partie warm anders als kalt. Eine TIEFEN-Schranke ist eine
willkuerliche Kante, die in jeder Phase woanders liegt: gemessen an der echten 83-Ply-Partie
streicht ein Knotenbudget, das eine MEDIANE Tiefe von 16 erreicht, ueber die Partie von 0 bis 245,
weil ein abgetauschtes Endspiel fuer denselben Aufwand ganz geloest wird, den ein Mittelspiel
braucht, um ueberhaupt 16 zu erreichen. `depth 16` wirft das weg, und specs/42 hat die Folge
gemessen: in einem duennen Endspiel erreicht das `movetime 400` der Live-Leiste Tiefe 31 — der
"tiefe" Durchgang war auf drei Plies der FLACHERE von beiden.

Knoten sind keins von beidem. Sie sind ueberall und auf jedem Geraet dieselbe Menge ARBEIT, gehen so
tief, wie eine Stellung es billig erlaubt, und sind das, was lichess' eigene Analysefarm je Zug
ausgibt. 1 500 000 ist deren Zahl, unveraendert uebernommen.

**Was es kostet und was es bringt**, gemessen ueber alle 84 Stellungen von `2026-08-02_2159` gegen
eine Referenz mit 6,8 M Knoten, Klassen mit den ausgelieferten Baendern gezaehlt:

| Budget | Median-Tiefe | Klassenwechsel gegen den tiefen Read |
|---|---|---|
| `depth 16` | 16 | 17 von 83 |
| 200 k Knoten | 16 | 17 von 83 |
| 500 k Knoten | 18 | 14 von 83 |
| **1,5 M Knoten** | **21** | **10 von 83** |

Das beantwortet auch den Einwand, der es hierher gebracht hat — *"I can't see all solutions with
depth 30"* (2026-08-03). Ein Median von 21 liegt in dem Band, das chess.com als Beginn sinkender
Ertraege der Engine-Qualitaet beschreibt, und entspricht ungefaehr dem, was ein starker
Vereinsspieler in einer scharfen Stellung sieht. Einen Zug an einer Widerlegung zu messen, die erst
eine Suche mit 6,8 M Knoten findet, lehrt niemanden etwas.

`capMs` ist ein SICHERHEITSVENTIL und nicht das Budget: es haelt eine pathologische Stellung davon
ab, die Auswertung zu parken, zum Preis der Reproduzierbarkeit in genau dieser Stellung. Die Tiefe
je Ply steht ohnehin auf dem Schirm, eine Note wird also nie als mehr ausgegeben als die Suche
dahinter.

`ReviewBudget` ist `@Serializable`, weil es der SCHLUESSEL der gespeicherten Analyse ist
(`ReviewStore`) und keine Notiz daneben: zwei Budgets benoten denselben Ply verschieden, und ein
Cache, der sein Budget nicht mittruege, verschmoelze zwei Meinungen still. `multiPv` ist 1, weil die
Auswertung nur die beste Linie liest — die zusaetzlichen Plaetze kosten im selben Budget Suchtiefe.
Stellbar ist es nur, damit `ReviewDepthMeasurement` die Anzeige der Live-Leiste exakt nachstellen
kann (`movetime 400`, `multiPv 3`).

`MATE_CP` ist 10 000: jeder Wert jenseits der ±1000-Decke von lichess taeugt, `winChanceCeiled`
klemmt ihn und lichess' eigenes `fromMate` tut genau dasselbe. Deshalb braucht hier nichts mehr
einen Sonderfall fuer Matt. Matt-in-5 -> Matt-in-9 ist eine Zahl minus sich selbst, und ein gegen
ein gewonnenes Endspiel getauschtes Matt sind die paar Punkte, um die das Endspiel wirklich
schlechter ist, statt einer Subtraktion von Tausenden.

## Entschiedene Plies zaehlen nicht

Eine Stellung, die an BEIDEN Enden schon jenseits der ±1000-cp-Decke lag, konnte nichts mehr
beweisen. Solche Plies bekommen gratis genau 100 %, und ein langer Abschluss ist voll davon.
Gemessen an `2026-08-02_2159`, dessen letzte 15 Plies je Seite gegen ein erzwungenes Matt gespielt
werden: mitgezaehlt liest es Weiss 76,5 / Schwarz 75,6, weggelassen **71,4 / 66,5**. Neun Punkte von
Schwarz' Wertung waren die Laenge der eigenen Niederlage. Lichess zaehlt sie mit (ihr
Volatilitaetsgewicht hat seinen Boden bei 0,5 statt bei 0); sie auszuschliessen ist UNSERE Regel,
und deshalb nennt der Screen seinen Nenner.

Es gibt kein Centipawn-Feld in `PlyGrade`. Das war bis 2026-08-03 die Einheit und war der Defekt —
`Accuracy.kt` traegt die 32-von-83-Messung, die sie entfernt hat.

## Ein von der CNN WIEDERHERGESTELLTER Zug zaehlt wie jeder andere

Das ist eine Korrektur. Der `decider` sagt, WIE die App herausfand, was gespielt wurde, nicht ob es
passiert ist — eine Recovery rekonstruiert normalerweise den echten Zug, und dafuer die Haelfte
einer Partie zu verwerfen warf gute Evidenz weg. Was wirklich kein Protokoll des Spiels ist, ist
eine NAHT, und diese Plies werden gar nicht benotet: eine Naht ist eine Stelle, an der die App das
Brett verlor und woanders wieder aufnahm, und die Plies dorthin stehen in KEINER Zugliste eines
Abschnitts. Der erste Ply nach einer Naht folgt also nicht aus der Stellung davor, und ihn zu
benoten hiesse, einem Spieler anzulasten, was in der Luecke geschah (`seamPlies`).

## Benotet wird von der angeschauten Stelle nach aussen

Der alte Durchgang wertete Stellung 0 bis n und zeigte nichts, bis er fertig war: auf dem Geraet
beim ausgelieferten Budget gemessen **25 von 84 Stellungen in 55 s**, eine volle Partie waren also
Minuten Zaehlerstand. Ein Ply braucht die zwei Stellungen zu seinen Seiten, also bringt Benoten vom
Finger des Lesers nach aussen nach zwei Suchen eine echte Note auf den Schirm statt nach
vierundachtzig. Eine Stellung nach der anderen auf einem Engine-Prozess: eine Auswertung ist eine
Hintergrundarbeit und kein Wettrennen, und sie darf laufen, waehrend der Tracker noch die Kamera
hat.

## Die Funde sind nach SCHWUNG sortiert, nach sonst nichts

`GameGrade.findings()` sortierte frueher `compareByDescending { missedMate }` zuerst, also schlug
jedes verpasste Matt konstruktionsbedingt jeden echten Schwung: die oberste Zeile von "Was die
Partie entschied" war regelmaessig ein Zug von 98 % auf 98 %. Ein Matt aus gewonnener Stellung zu
verpassen ist eine Kuriositaet, kein Wendepunkt — das ist jetzt `missedChances()`, eine eigene
Frage mit eigenem Abschnitt. Ein Fund, der beides ist, steht in beiden, und das ist richtig.

Ein rekonstruierter Ply steht in keinem von beiden: `findings` filtert ihn, denn "lerne aus diesem
Fehler" ueber einen Zug, den der Tracker erfunden hat, ist die schlimmste Fassung des einen Bugs,
den dieses Projekt sich nicht leisten kann.

## Der Screen

**Moments ist der erste Tab** (specs/48). Eine fertige Partie wird geoeffnet, um herauszufinden, was
schiefging. Review — das Brett zum Durchsteppen — ist, wohin ein Moment einen schickt, wenn er
neugierig macht, und es beginnt weiter bei Ply 0; darauf zu oeffnen hiess, den Leser 83 Plies laufen
zu lassen, um die drei zu finden, auf die es ankam.

`TOP_FINDINGS` ist 3, weil die Aufgabe des Screens in seinen ersten fuenf Sekunden "welche Zuege
entschieden diese Partie" ist und eine Liste von elf ein zweites Problem ist. Das Arbeitsgedaechtnis
fasst etwa vier Bloecke, und die Zugnotation konkurriert schon darum.

Es gab einen zweiten Einstieg, `LiveReviewRoute` — den "Spectator"-Tab. Das war dieselbe Composable,
gefuettert von der laufenden Partie, auf einem eigenen Ziel, und ihr einziger eigener Inhalt war ein
WLAN-Schalter. Der Schalter steht jetzt im Ueberlaufmenue des Trackers, und dieser Screen liest
genau eine Art Partie.

### Beide Pfeile gehoeren demselben Ply

Was gespielt wurde (in der Letzter-Zug-Farbe) und was die Engine stattdessen wollte (Akzent). Diese
Paarung IST die Auswertung — *"weiss Zug war …, dann die Veraenderung anzeigen, und bester Zug waere
… mit Pfeil zeigen, selbiges auch fuer Schwarz"* — und die Verdikt-Karte darunter buchstabiert sie
in Worten aus, fuer den Ply beider Seiten ohne Unterschied.

Der Pfeil war bis dahin der Engine-Zug des NAECHSTEN Ply, also der Zug, der VON HIER zu spielen
waere, und damit nannten Brettpfeil und "Engine-Zug" der Karte zwei verschiedene Zuege —
*"die Zuordnung der Pfeile stimmt nicht, die werden um ein[s] versetzt dargestellt"*. Das Brett
zeigt weiterhin die Stellung NACH dem gespielten Zug, und genau darum werden die zwei zusammen
gezeichnet: allein gelesen ist eine Alternative zu einem schon geschehenen Zug die Zweideutigkeit,
die die Paarung beseitigt. In der Startstellung gibt es keinen gespielten Ply, dort ist der Rat der
des ersten: der Eroeffnungszug der Engine. Ein Engine-Zug, der mit dem gespielten identisch ist,
zeichnet nichts zusaetzlich — ein Pfeil unter einem Pfeil ist ein dickerer Pfeil und keine zweite
Aussage, und die Karte sagt ohnehin "best".

### Das Verdikt hat ZWEI Spalten, und jede ist eine Stellung

*"die zweispaltigkeit war besser"* (2026-08-04). Bei `a5cdfd1` waren es zwei Spalten, daraus wurde
ein Stapel ueber die volle Breite, und genau das machte die Hoehe der Bildunterschrift zu einer
Funktion ihres Inhalts. Die Teilung ist nicht kosmetisch. **Links ist die Stellung VOR diesem Ply**:
der gespielte Zug, wie er heisst, was er kostete, und — wo es eins gibt — das erzwungene Matt, das
von dort lief. **Rechts beantwortet die Frage, die das Verdikt erzeugt**: was die Engine stattdessen
gespielt haette. Ein Fund fuehrt beim Antippen auf den Ply DAVOR — die Stellung, in der der bessere
Zug noch da war. Auf dem Fehler selbst zu landen zeigt nur den Schaden.

### Der Name eines Tabs ist das LABEL, immer

Die Zahl stand frueher im selben `Text` (`Moments · 24`), also aenderte sich der Name, waehrend die
Analyse streamte — beobachtet als `· 2` → `· 11` → `· 20` → `· 24` ueber drei Minuten — und
`tap-text "Moments"` scheiterte. Das ist die `CLAUDE.md`-Regel in freier Wildbahn.

`TAB_COUNT_SLOT` haelt auf BEIDEN Seiten jedes Labels Platz fuer eine Zahl frei — drei Ziffern plus
Abstand. Auch auf der leeren Seite, und das ist der Punkt: mit zentriertem Paar verschob sich ein
Label um die halbe eigene Zahl nach links, also sassen `Moments` und `Moves` neben der Mitte ihres
Tabs und `Review` nicht — die drei Labels fluchteten weder miteinander noch mit der Unterstreichung.
Zentriert ist das LABEL.

### Die eine Erklaer-Geste

Ein kleines ⓘ neben einer Ueberschrift, das einen Dialog oeffnet. Gleiches Zeichen, gleiche Geste,
gleiche Art Inhalt ueberall — eine Mischung aus Tooltips, Sheets und Dialogen ist schlimmer als
nichts. Es erklaert einem, der tiefer will, ein KONZEPT; es ist kein Freibrief, Jargon auf dem
Schirm zu lassen und ihn hier zu uebersetzen. Wenn ein Label das braucht, um ueberhaupt verstanden
zu werden, ist das Label falsch.

### Der Engine-Zustand steht zweimal auf Null

Eine FERTIGE Auswertung hat keinen Zustand, der eine Karte wert waere. Ein LAUFENDER Durchgang hat
einen, aber der gehoert nicht diesem Screen: der Lauf ueberlebt den Screen inzwischen, also meldet
ihn das Analyse-Banner der App-Leiste, das angeheftet ist, auf jedem Screen erscheint und den
einzigen Stop-Knopf traegt. Ihn hier ebenfalls zu zeichnen ergab zwei Fortschrittsbalken und zwei
Zaehler uebereinander.

Die Karte, die den Durchgang startet oder fortsetzt, ist nach specs/48 Regel 3 der gefuellte Button
— Auswerten ist, WOFUER der Screen einer ungelesenen Partie da ist. Sie war eine blanke
`TextAction` ohne sichtbare Trefferflaeche, im einzigen Tab, der auch den Fortschritt versteckte.
