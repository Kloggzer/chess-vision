# Der Alarmpfad: wann das Brett für verloren erklärt wird (2026-08-24)

Der Latch ist die folgenreichste Handlung des Motors — er hält Commits an, bis ein Mensch
zurücknimmt oder resynct. Diese Seite hält fest, was ihn auslöst, was ihn zurückhält, und was er
dem Spieler sagt.

## Die Kette

`onStableMismatch` → `advanceDesyncStreak` → `raiseAlarmIfDue` → `latchAlarm`. Die Serie zählt
DISTINKTE Beobachtungen mit stabilem Konfliktsatz; `desyncObsN` = 3 heißt „über Sekunden
anhaltend", nicht „dreimal ausgewertet". Ein zweiter Weg ist der Standoff (`desyncStandoffObsN`
= 12) für Konflikte, die nicht zug-förmig sind — Rochade (2-und-2) oder ein einzelnes Feld
(1-und-0) nennt `guessIllegalMove` nie.

## Was ihn zurückhält

```kotlin
private fun EngineState.alarmDeferred(): Boolean =
    handInFrame() || desyncObs < config.desyncObsN + config.alarmDeferObs
```

Alle drei Latch-Stellen fragen das. **Die Serie läuft weiter** — Blitz braucht das —, nur das
Einrasten wartet.

`handInFrame()` ist die Vereinigung aller Occlusion-Signale: der engine-seitige Latch, das
Veto-Set dieses Frames, der Coverage-Kopf des Modells und der Rillen-Arm. Resync fragt sie, die
Commit-Gates fragen sie — der Alarmpfad war bis 2026-08-24 die einzige Stelle, die es nie tat, und
eine Hand über dem Brett löste den Positionsalarm aus, den sie erklärt (User-Bericht).

Auf dem Gerät tragen davon nur drei Quellen: `runGridOcclusion = coverageOutput != true` schaltet
den Rillen-Arm ab, sobald das Modell Coverage deklariert — und alle aktuellen tun das.

`alarmDeferObs` ist zusätzliche Luft in Beobachtungen, Default 0. Die Einheit ist absichtlich
keine Sekunde: `nowS` kommt aus der Frame-Schleife, und jede Alarm-Test-Rig ruft nach dem
Referenzframe nur noch `observe()` — die Uhr steht, ein Zeitfenster wäre dort nicht prüfbar. Bei
~10 Beobachtungen je Sekunde meint 1 dasselbe wie 100 ms.

## Was er sagt

`alarmGuessSan` nennt den Grund, nicht nur die Feststellung — sortiert nach Handlungsbedarf:

| Bedingung | Meldung |
|---|---|
| König zwei Felder ohne Rechte | `castling not available` |
| die gezogene Figur gehört der anderen Seite | `it is White/Black to move` |
| die Seite am Zug steht im Schach | `you are in check` |
| sonst | `illegal move suspected` |

Wer am Zug ist steht über dem Schach: sonst sucht der Falsche nach seinem König. Alarmkarte,
Sprachausgabe und Timeline-Zeile lesen dieselbe Funktion.

`guessIllegalMove` filtert NICHT nach Zugrecht — es liefert jedes Paar aus genau einem verlassenen
und einem belegten Feld. Deshalb greift der Falsche-Seite-Zweig überhaupt.

## Wenn die Diff-Kette allein feststeckt

Ein Kandidat, der am Evidenzboden (`commitLlFloor` = 2.0) durchfällt, lässt die Referenz stehen —
also misst der nächste Frame denselben Diff und schlägt denselben Zug vor. Gemessen am 2026-08-24:
70-mal dasselbe `Kf1` in 9 Sekunden, während die CNN **kein einziges Mal** auswertete, weil `stuck`
einen Zähler braucht, den das Flattern nicht hochlaufen lässt, und `stable` einen Puffer, den es
leert. Der Alarm hängt am CNN-Tick und konnte deshalb nie feuern.

`refusedStreak` zählt identische Ablehnungen und öffnet das Tor nach `refusedStreakForEval` = 3,
gedeckelt durch `cnnCooldownS`. Im Korpus löst es nie aus — die zehn Aufnahmen enthalten den Fall
nicht (niemand zieht dort illegal im Schach), also ist es dort neutral und für seinen Zweck
ungetestet. Sichtbar wird es nur am Gerät.

## Was hier NICHT stimmt, wenn man es aus Kommentaren liest

Der Kommentar an `cnnCooldownS` trug bis 2026-08-24 den Satz, ein Confirmer über einer Stimme
zahle den Cooldown je Stimme. Das ist seit dem Fix an `evaluationDue` falsch
(`recoveryConfirmer.count > 0` geht durch), und der Satz hat am selben Tag eine Fehlanalyse
getragen — „1,4 s Recovery-Boden", den es nicht mehr gab. Zahlen im Code gegen `git grep` prüfen,
bevor sie eine Entscheidung tragen.
