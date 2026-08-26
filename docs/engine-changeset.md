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

**Eine Hand ist ein Grund zu warten, nie zu alarmieren.** Ueber `HAND_LIMIT` verdeckten Feldern
bricht `explain` ab, bevor irgendetwas bewertet wird.

**Die Farbpruefung waehlt, sie vetot nicht.** Als nachtraegliches Veto gebaut, und das war falsch:
sie toetete die beste Hypothese und die Engine gab auf. Auf `11-55-19` standen drei Wege derselben
Dame nach a4 (`d8a5+a5a4`, `d8d7+d7a4`, `d8e8+e8a4`) im Mehrdeutigkeitsband, ohne gemeinsamen
ersten Zug — ein Blick darauf, ob `a5` oder `d7` besetzt ist, trennt sie. Ein Test, der nur toetet,
verschenkt das. Jetzt filtert `accepts` die besten Hypothesen VOR der Auswahl.

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

## Messung
