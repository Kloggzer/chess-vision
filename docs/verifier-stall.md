# Warum der Verifier stehen bleibt und die lila Felder stehen bleiben (2026-08-30)

Gemeldet: *„manchmal ist der verifier stuck, da werden lila felder nicht aufgeloest"*. Lila ist das
`changed`-Overlay. Aus `diag-150.ndjson`, ply 6: **314 s, 205 Entscheidungen, 204 abgelehnt**,
`verifyOutcome` bei allen 205 leer, `changed` dauerhaft 13–17 Felder auf Reihe 7/8 (f8 199/205,
g7 199, h8 196, c7 193, d8 187), `motion` im Median **0,0**, `cnnAgree` 0,918. Kurz davor:
`board moved 0,26 cells since the grid fit — re-measuring the correction`.

Diese Seite haelt fest, was davon der Code erklaert und was nicht.

## 1. `verifyOutcome` blieb leer, weil der Verifier nie gefragt wurde

`verifyOutcome` ist `pending?.voteOutcome`, und `pending` entsteht an genau EINER Stelle:
`Dispatch.dispatch`, also erst wenn `generateHypothesis` einen Kandidaten geliefert hat und
`commitGates` ihn durchgelassen hat. In diesem Fenster entstand keiner — bei 13–17 geaenderten
Feldern faellt `Hypothesis.tooMuchChangeGate` (`maxChanged` = 6), und was der CNN-Abzug davon
uebrig laesst, faellt in `noSingleFitsGate`. Ohne Kandidat kein `pending`, ohne `pending` kein
Urteil. **Der Verifier haengt nicht, er kommt nicht vor.**

Zwei Dinge folgen daraus, und nur eines ist ein Fehler:

- Was die Frage *wirklich* beantwortet, steht schon in derselben Zeile:
  `cnnSnaps=<gesehen>/<zur Leiter>/<ohne Evaluator>/<Tor zu>`. Der zweite Wert ist die Zahl der
  Beobachtungen, die die Verify-Leiter je erreicht haben.
- **Leer hiess bis heute zweierlei.** `applyVerdict` raeumte `pending` weg, BEVOR `recordDecision`
  lief, also trug ausgerechnet die Zeile, die die Leiter entschieden hat, `verify=` leer — genau wie
  die 204 Zeilen ohne Kandidat. `EngineState.verdictOutcome` traegt den Spruch jetzt ueber das
  Loeschen hinweg, genau eine Zeile weit. Danach heisst leer nur noch „nie geurteilt".

## 2. Eine Drift von 0,26 Zellen muss die Pixel-Referenz kosten

`LiveAlign.expireCorrection` warf bei `DRIFT_REFIT_CELLS` = 0,25 die Gitter-Korrektur weg und
liess sie neu messen — **die Referenz blieb**. Danach vergleicht jeder Frame ein Bild unter der
NEUEN Rektifizierung gegen eine Referenz unter der ALTEN.

Der engine-seitige Schutz greift dort nicht zuverlaessig: `Guards.cornersJumped` prueft die
KORRIGIERTEN Ecken achsenweise gegen `cornerJumpPx` = 6,0 px. Die Korrektur selbst ist der
Rillen-Rest, also klein — zwei Messungen derselben Aufnahme koennen sich um wenige Pixel
unterscheiden und damit unter der Schwelle bleiben, waehrend die Rektifizierung darunter gewechselt
hat. Groessenordnung, an `2026-08-30-14-33-02` gemessen (Brett 1007 x 1010 px im Frame, `boardSize`
976): eine Frame-Zelle ist ~126 px, `cornerJumpPx` = 6 px sind **4,8 % einer Zelle**, und 0,26
Zellen Drift sind ~32 px mittlerer Eckversatz — das 5,4-Fache der Schwelle.

Warum es die achte Reihe trifft: die Homographie bildet Ecken auf Ecken ab, also schlaegt ein
Eckfehler dort am staerksten durch, wo die Quell-Zelle am kleinsten ist — perspektivisch die
hinterste Reihe. Genau die Felder, die im Log gluehen.

**Geaendert:** `expireCorrection` meldet den Refit (`onRectificationChanged`), `TrackerStack`
schickt daraufhin `EngineAction.RectificationChanged`, und `TrackerEngine.rectificationChanged`
verwirft die visuelle Referenz. **Nicht** `captureBaseline`: der raeumt den Alarm-Latch mit weg,
und ein verrutschtes Brett sagt nichts darueber, ob Stellung und Brett wieder zusammenpassen
(Invariante 9).

Ungemessen bleibt die Verteilung von `quadDriftCells` auf dem Geraet — der Schwellenwert 0,25 ist
laut eigenem KDoc gesetzt, nicht gemessen. In `2026-08-30-14-33-02` bewegten sich die Ecken ueber
377 Frames um **exakt 0,0 px**: die Live-Ausrichtung lieferte dort 31 s lang keine einzige neue
Detektion, die Ecken standen auf den Kalibrierwerten. Eine Verteilung braucht Material, in dem sie
sich bewegen.

## 3. Das Verfallsdatum gibt es — und es ist im Fehlerfall zu

`maybePatchAnomaly` IST der Ablauf, nach dem ein dauerhaft „geaendertes" Feld seine Zelle in die
Referenz nachgezogen bekommt: `nudgeTimeoutS` = 5 s fuer besetzte, `driftWindowS` = 30 s fuer leere
Felder. Ueber 314 s waren beide laengst faellig. Zwei Bedingungen halten ihn trotzdem zu:

```kotlin
val desynced = alarm != null || desyncObs > 0 || cnnStatus == CNN_STATUS_MISMATCH
val eligible = n > 0 && bestLl < 0.0 && n <= config.maxChanged + CHANGED_CEILING_SLACK && !desynced
```

- **Die Decke.** `maxChanged + 2` = 8, gemessen waren 13–17. Sie heisst „resting-hand protection",
  und eine ruhende Hand ist genau das, was `motion` = 0,0 ueber 205 Entscheidungen mit immer
  denselben Feldern *nicht* ist. Der Fall, in dem eine ganze Reihe stehen bleibt, faellt durch die
  Decke, die ihn haette heilen sollen.
- **`cnnStatus == "mismatch"` ist eine Sperre ohne Ablauf.** Gesetzt wird sie in
  `CnnTick.onMismatch`, geloescht nur bei `onMatchOk` oder einem Commit — und im Stillstand kommt
  keines von beidem. Dieselbe Form von Sperre wurde bei `desyncObs` schon einmal gefunden und mit
  `clearDesyncStreak()` geschlossen; `cnnStatus` blieb.

Was hier richtig ist, ist NICHT geraten: die Decke lockern heisst, den Patcher unter einer Hand
laufen zu lassen, und dagegen wurde sie gebaut. Der ehrliche Weg ist, das Hand-Kriterium an die
Hand-Signale zu haengen, die es ohnehin gibt (`locatedHand`, `gridHandSquares`, `motion`), statt an
die blosse Anzahl — und das an einer Aufnahme zu messen, nicht am Schreibtisch. Steht als offener
Punkt in `TODO.md`.

## Was die drei Namen verbindet

`STUCK too_many_changed`, `STUCK no_legal_move` und `STUCK cnn_desync` beschreiben denselben
Zustand aus drei Blickwinkeln: die Referenz ist gegen den aktuellen Warp nicht mehr vergleichbar,
`changed` wird nie 0, also laeuft `quietOutcome` nie und es gibt keinen Re-Anchor. Der einzige
gebaute Ausweg ist `CnnTick.onMatchOk` (Referenz nachziehen, wenn das CNN das Brett bestaetigt) —
und der haengt an `cnnAgree`, nicht am Pixelproblem. Bei 0,918 sagt das CNN nicht „unveraendert",
also bleibt die Tuer zu.

## 4. Der abgelehnte Kandidat kommt im naechsten Bild wieder (2026-09-06)

Gemessen an den Handy-Aufnahmen vom 2026-09-06 (Commit-Ausreisser bis 35 s): nach „Schatten" oder
„Geist" blieb die alte Referenz stehen, das naechste Bild schlug denselben Kandidaten erneut vor,
die Leiter lehnte ihn erneut ab — im Log unsichtbar, weil `recordRejection` gleiche Ablehnungen
faltete. Die Recovery, die die Stellung unabhaengig vom Kandidaten liest, kam nie dran, weil
`evaluationDue` sie erst nach dem Intervall zuliess.

**Geaendert:** nach einem terminalen Urteil (`VERIFY_STATE_GHOST`/`VERIFY_STATE_SHADOW`) reicht
`TrackerEngine` dieselbe Beobachtung an `cnnTick(afterRejectedVerify = true)` weiter. Legalitaet,
Hand-Sperren und die Zwei-Beobachtungen-Stimme der Recovery gelten weiter; ein Treffer verankert
nicht neu (Invariante 5). Ablehnungen der Leiter werden nicht mehr gefaltet.

**Gemessen** (`fix-verify3-20260907` gegen `pocc-cold-20260905`, Regressionssatz plus vier
Handy-Videos): Phantome ueberall 0 (233929: 1 → 0, dafuer 8/2 → 7/3 am abgeschnittenen Ende);
Commit-Latenz Median 0,47 → 0,53 s, p90 1,37 → 1,30 s, max 35,2 → 4,7 s. Die Variante, die
Schatten-Urteile bei unlesbaren Zugfeldern nicht verankerte, brachte 5 Phantome auf 00-39-57 und
ist verworfen. Was bleibt, sind Ausreisser von 12–18 s, die in Handy UND PC im Warten auf Ruhe
sitzen, nicht in der Verifikation.
