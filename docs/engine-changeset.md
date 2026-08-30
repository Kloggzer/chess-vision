# Die dritte Engine: das Veraenderte ist der Zeuge

> Gebaut 2026-08-26 aus den Fehlern der ersten beiden. Der Vergleich am Regressionssatz steht
> unten; die Auswahl liegt in den Einstellungen unter „Move engine" und im Replay als
> `engine=changeset`.

## Warum es sie gibt

Die zweite Engine (`:engine-stillness`) fragt das Modell nach allen 64 Feldern und sucht die legale
Fortsetzung, die diese Lesung erklaert. Am 2026-08-26 live gemessen, acht aufeinanderfolgende
Lesungen desselben ruhenden Bretts:

| Feld | Modell liest | steht dort |
|---|---|---|
| `c1` | wN 8/8 | weisser Laeufer |
| `f1` | wR 8/8 | weisser Laeufer |
| `b2` | wB/wN 8/8 | weisser Bauer |
| `c8` | bP 8/8 | schwarzer Laeufer |
| `e8` | bN 8/8 | schwarzer **Koenig** |
| `f8` | bN 7/8 | schwarzer Laeufer |
| `g7` | bN 7/8 | schwarzer Bauer |
| `h7` | bB 7/8 | schwarzer Bauer |

Zehn von rund dreissig Figuren, stabil, ueber jede Lesung. Auf Belegt/Farbe war dieselbe Lesung
fast ueberall richtig. **Identitaet ist das schwaechste, was das Modell produziert** — und die
zweite Engine haengt vollstaendig daran. Die erste (`:core-engine`) haengt nicht daran: sie liest
den Frame-Diff (`Scoring.kt`, `logit = k·(z − zThr)` ueber die beruehrten Felder) und laesst das
Modell nur bestaetigen. Deshalb kam sie mit demselben Material klar.

Die dritte kombiniert beides: **Stillstand als Ausloeser wie die zweite, Veraenderung als Beweis
wie die erste**, und das Modell wird nur nach `empty / white / black` gefragt.

## Wie sie entscheidet

1. `cellDeltas` (schon vorhanden, wurde bisher auf `peak` reduziert) liefert je Feld die mittlere
   Helligkeitsaenderung gegen das zuletzt VERSTANDENE Bild, Median abgezogen.
2. `ChangeEvidence` macht daraus Log-Odds in absoluten Graustufen, gedeckelt.
3. `ChangeSearch` bewertet jede legale Fortsetzung mit der Summe ueber ihre beruehrten Felder.
   „Nichts passiert" ist per Konstruktion 0 — dieselbe Form wie `Scoring.kt`, von der anderen Seite
   erreicht.
4. `ColourCheck` **waehlt mit**, statt nachtraeglich zu vetoen (siehe unten).

## Was gemessen wurde und den Entwurf geaendert hat

**Die Evidenz darf nicht saettigen.** Erste Fassung: steile Skala, jedes veraenderte Feld landete
auf dem Deckel `6.0`. Auf `11-55-19` wog ein Schatten auf `f7` damit genauso viel wie der Springer,
der `g8` wirklich verlassen hatte: `f7f6 10.0 | g8f6 10.0`, unentschieden, kein Commit. Mit flacher
Steigung in absoluten Graustufen (`K = 0.4`, Schwelle 10) traegt der Schatten 0,8 und die echten
Felder 6,0 — der Zug faellt aus dem Mehrdeutigkeitsband und committet. **3/12/1 → 12/3/1.**

**Die Referenz muss ein ruhendes Brett zeigen.** `StillPhase` nahm den ersten Frame, egal was er
zeigte. Auf `11-55-19` war das eine Hand mitten in der Bewegung, und jeder Vergleich danach lief
gegen sie: zwoelf „veraenderte" Felder, bevor ein Zug gespielt war. Jetzt wird die Referenz erst
gesetzt, wenn `!moving`. (Gilt auch fuer die zweite Engine.)

**Die Hand kommt aus den PIXELN, nicht aus dem Modell.** Auf `VID_20260726_233432` kreuzte eine
Hand den Damenfluegel, sieben Zellen bewegten sich um 26 bis 48 Graustufen — und das Modell meldete
`covered=[]`. Ein Schutz, der das Modell nach Haenden fragt, ist blind genau dann, wenn es darauf
ankommt. Ein Zug beruehrt 2 bis 4 von 64 Zellen, also kann ein hohes oberes QUARTIL kein Zug sein.

**Eine veraltete Referenz muss aufgegeben werden.** Die Referenz waechst nur an einem Brett fort,
das die Engine VERSTANDEN hat — ein Start, den sie nicht erklaeren kann, sperrt sie damit fuer die
ganze Aufnahme aus: nichts committet, die Referenz bleibt auf dem ersten Bild, und jeder gespielte
Zug vergroessert den Abstand, bis das Bild wie eine Hand aussieht. Gemessen auf `233432`: Unruhe im
**Median 18,6** gegen eine Schwelle von 5, und 0 von 21 Plies. Eine ueberfuellte Lesung ist eine
Hand und Warten wert; eine SERIE davon ist eine Referenz, die weg muss. **0/21/0 → 19/2/0.**

**Der Latch stoppt unsichere Commits, nie sichere.** Erste Fassung: der Alarm blockierte jeden
Commit, und aufloesen konnte ihn nur ein unveraendertes Brett — das nie kommt, solange gespielt
wird. Auf `VID_20260824_153751` vier abgelehnte Lesungen nach einem Latch.

**Die Farbpruefung KOSTET, sie toetet nicht.** Drei Formen wurden gemessen. Als nachtraegliches
Veto toetete sie die beste Hypothese und die Engine gab auf — auf `11-55-19` standen drei Wege
derselben Dame nach a4 im Mehrdeutigkeitsband, und ein Blick darauf, ob `a5` oder `d7` besetzt ist,
trennt sie. Als harter Filter ueber die Rangliste war sie noch schlechter: auf `VID_20260726_233432`
liest das Modell schwach, lehnte fast jeden Kandidaten ab, und der Arm committete in 21 Plies
**nichts** — `a2a4` stand bei 10,0 gegen eine Schwelle von 4 und flog raus. Ein PREIS ist die
ehrliche Form: genug, um Hypothesen zu trennen, die die Pixel unentschieden lassen, nie genug, um
Pixel zu ueberstimmen, die sich sichtbar bewegt haben. Die Farbachse war in derselben Sitzung
zweimal bei voller Ueberzeugung falsch.

**Streit ist nicht Unerklaerlichkeit.** Wenn die Pixel Kandidaten anbieten und das Modell **alle**
ablehnt, stehen zwei Zeugen gegeneinander — meist eine Hand halb aus dem Bild. Das ist kein Beweis,
dass das Brett falsch steht. `Change.Disputed` haelt an, ohne die Alarmleiter zu gehen. Vorher
latchte der Alarm bei einer Hand ueber der a-Linie, und danach committete bis zum Ende der Aufnahme
nichts mehr.

**Der Alarm braucht KEINEN vorherigen Zug.** Die zweite Engine verlangte `plies > 0`. Live am
2026-08-26 gemessen: eine Partie, die das Brett vor ihrem ersten Commit verlor, sass minutenlang
stumm da. Eine Partie, die gar nicht erst anfaengt, ist genau die, die man melden will.

**Gleiche Endstellung heisst nicht gleiche Zugliste.** Versucht: bei Routen, die dieselbe Stellung
erreichen, die beste committen. Ergebnis auf `11-55-19`: die Engine waehlte `Qd7`, gespielt war
`Qa5` — 13 gefunden, aber **3 Phantome** statt einem. Zurueckgenommen. Ein verpasster Zug ist
verrechenbar, ein erfundener ist das Veto.

**Jedes Tor, das einen Frame beendet, sagt es.** `onFrame` hat sechs stille Ausgaenge, und von
aussen sahen alle gleich aus, naemlich wie gar nichts. Sie heissen jetzt und stehen im Log
(`adb logcat -s chesslabDecision`). Ohne das waeren die Befunde oben nicht auffindbar gewesen.

## Was sie NICHT kann

- **Aus einem verlorenen Ply kommt sie nicht allein zurueck.** Fehlt ein Halbzug, ist die
  Zugfarbe vertauscht und die halbe Suchbaumhaelfte ist die falsche. Das teilt sie mit beiden
  Vorgaengern; `ResyncToBoard` ist der Ausweg.
- **`adopt()` haengt doch an der Identitaet** — es ist der einzige Pfad, der es tut, und der
  Mensch, der ihn ausloest, hat das Brett gesehen.
- **Mehrdeutige Routen bleiben liegen.** Siehe oben: bewusst, weil die Alternative Phantome sind.

## Der Schlag auf besetztes Feld (2026-08-30)

Der Diff kann ihn **prinzipiell nicht sehen**: vorher steht dort eine Figur, nachher auch. Weil
`sum()` ueber die beruehrten Felder summiert und ein Feld unter der Schwelle negativ zaehlt, zahlt
die richtige Hypothese fuer ihr eigenes Zielfeld drauf.

Live gemessen an `Nxe5 Nxe5 dxe5`: 314 s, 205 Entscheidungen, alle `no_legal_move`. Die
Herkunftsfelder sprachen (`f3` 12/205 bei z 5,5, `d4` 3/205 bei 4,2–4,6), das Zielfeld `e5` wurde
**kein einziges Mal** genannt — auch nicht unter der Schwelle, bei durchschnittlich 7,9 gelisteten
Feldern je Entscheidung.

Der Ausweg ist die Achse, auf der das Modell nachweislich gut ist: nicht die Identitaet, sondern
die **Farbe**. Bei `Nxe5` wechselt `e5` von Schwarz auf Weiss. `ColourCheck.captures` meldet genau
diese Felder, und `charged()` schreibt `CAPTURE_CREDIT` dafuer gut — unter vier Bedingungen:

1. die Hypothese wechselt dort die Farbgruppe, und keine Seite ist `empty` (also ein Schlag);
2. das Modell liest die NEUE Gruppe mit mindestens `SURE`;
3. die Pixel schweigen dort (`evidence.at(sq) <= 0`) — nur wo der Diff blind ist;
4. das Feld ist nicht verdeckt.

Bedingung 3 ist der Schutz: ein Zug auf ein LEERES Feld wechselt auch die Gruppe, aber dort
sprechen die Pixel laut, und der Kredit bleibt aus. An Phantomzuegen aendert sich nichts.

`CAPTURE_CREDIT` (3,0) liegt unter `OBJECTION_COST` (4,0), damit ein Einwand einen Zuspruch
weiterhin ueberstimmt. **Der Wert ist noch nicht am Regressionssatz kalibriert** — die vier
Aufnahmen aus `scripts/replay-batch.ps1` liegen nicht mehr unter `data/`. Er ist so gewaehlt, dass
er die Strafe knapp aufwiegt, und zwei Tests halten die Richtung fest: der Schlag committet, und
er committet NICHT, wenn das Modell die neue Farbe nicht bestaetigt.

## Die offene Frage: die Skala der Evidenz

Der Ausschlag eines echten Zuges ist **nicht kameraunabhaengig**, und keine der beiden Formen, die
gemessen wurden, taugt fuer alle Aufnahmen:

| | `13-52-38` | `11-55-19` | `153751` |
|---|---|---|---|
| Ausschlag eines echten Zuges | 11–15 Graustufen | > 25 | ~30 |
| Ruhepegel des Bretts (oberes Quartil) | ~1 | ~2–3 | 2,1 |

Eine **absolute** Schwelle (10 Graustufen) laesst auf `13-52-38` fast nichts uebrig — der richtige
Zug `d2d4` stand bei 0,7 gegen eine Commit-Schwelle von 4. Eine **relative** (Vielfaches des
Ruhepegels) rettet die Aufnahme, gibt aber auf `153751` auch marginalen Feldern Gewicht, erzeugt
Mehrdeutigkeit und kostet dort 24 von 35 Plies.

Gemessen, beide Richtungen, jeweils auf der Aufnahme, die es zeigt — hier steht bewusst KEINE
weitere Konstante. Was fehlt, ist eine Ableitung der Skala aus etwas Messbarem (Kontrast der
Figuren gegen ihr Feld, aus dem Board-Store), nicht ein weiterer Handgriff am Regler.

## Was der Score misst (2026-08-30)

**Das Modell gehoert an die Zahl.** Derselbe Satz lief einmal unter `p4full-128` und einmal
unter `p4a-80-clahe` und gab auf `VID_20260727_233929` 10 gegen 8 gefundene Halbzuege. Ohne den
Namen daneben sind das zwei Zahlen ohne Aussage, und `printScore` schreibt ihn seitdem mit.

**Das Label ist ein Benchmark, kein Urteil.** Beim Aufnehmen wurde je Zug gewartet, bis die
DAMALIGE App ihn erkannte — `candidate.json` protokolliert einen historischen Stand aus App,
Engine und Modell. Ein `missed` ist auf dieser Aufnahme echt schlechter, nur ist die Aufnahme
kein Ziel an sich: ihre Trainingsdaten sind gesammelt, sie hat ihren Zweck erfuellt. Ein Satz,
den ein Umbau nicht mehr vollstaendig einholt, kann ihn trotzdem wert sein — das ist eine
Abwaegung und wird keine Zahl. `invented` ist die harte: ein erfundener Zug ist immer falsch.

## Messung

Regressionssatz, 2026-08-26, `model=real13-ms-s3-hn4-bn80`, je gefunden/verpasst/**erfunden**:

| Aufnahme (Plies) | Diff (`classic`) | Stillstand (`stillness`) | Veraenderung (`changeset`) |
|---|---|---|---|
| `2026-08-07-13-52-38` (25) | **25/0/0** | **25/0/0** | 9/16/0 |
| `2026-08-08-00-39-57` (67) | **67/0/0** | **67/0/0** | 28/39/0 |
| `2026-08-08-11-55-19` (15) | **15/0/0** | **15/0/0** | **15/0/0** |
| `2026-08-08-11-59-12` (73) | 52/21/0 | 66/7/**96** | 31/42/0 |
| `VID_20260726_233432` (21) | 19/2/**2** | **21/0/0** | 19/2/0 |
| `VID_20260824_153751` (35) | 9/26/0 | **35/0/0** | 10/25/0 |
| `VID_20260824_154327` (117) | 10/107/0 | **28/89/0** | 4/113/**3** |

`2026-08-16-20-41-33` traegt kein Video (Handy-Session) und ist im Video-Replay nicht messbar.

**Der dritte Arm ist heute nicht konkurrenzfaehig.** Er erreicht `11-55-19` fehlerfrei, ist auf
`233432` phantomfrei besser als der Diff-Arm, und auf `11-59-12` der einzige ohne Phantome — aber
auf `00-39-57`, `153751` und `154327` liegt er weit zurueck. Der Grund steht oben unter „Die offene
Frage": die Skala der Evidenz ist nicht abgeleitet, sondern eingestellt.

### Der Latch: was der Phantom-Verzicht kostet

Eine Variante, die dem Latch ERLAUBT, eine eindeutige Erklaerung durchzulassen, wurde gemessen:

| Aufnahme | streng (Vorgabe) | Latch aufgeweicht |
|---|---|---|
| `13-52-38` | 9/16/**0** | 21/4/**2** |
| `00-39-57` | 28/39/**0** | 33/34/**2** |
| `11-59-12` | 31/42/**0** | 53/20/**0** |
| `154327` | 4/113/3 | 6/111/3 |

Deutlich mehr gefunden, und Phantome dort, wo vorher keine waren. Nach der Projektregel ist das
kein Tausch, sondern ein Ausschluss — die strenge Form bleibt die Vorgabe. Was der Deadlock
wirklich braucht, ist ein Ausweg aus dem Latch, der kein Commit ist.
