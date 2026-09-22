# Welche Wache merkt der Regressionssatz? (2026-09-21, gemessen)

Zehn boolesche Wachen der Engine, jede EINZELN abgeschaltet, jedes Mal der volle Satz
(`scripts/guard_ablation.ps1`, ~18 min je Lauf, 10 Aufnahmen). Bezug: **396/3/0, 8 Desync**.

| Wache | found | missed | inv | desync | Befund |
|---|---:|---:|---:|---:|---|
| `cnnVerify` | **-266** | **+266** | +7 | -8 | gedeckt |
| `cnnEvalOnSettle` | **-11** | **+11** | +1 | +13 | gedeckt |
| `liveAlign` | +3 | -3 | +0 | +1 | gedeckt |
| `requireMotionForMove` | +0 | +0 | +0 | +1 | nur eine Episode |
| `verifyObserveNow` | +0 | +0 | +0 | +1 | nur eine Episode |
| `windowEndBothEnds` | +0 | +0 | +0 | -1 | nur eine Episode |
| `baselineOcclusion` | +0 | +0 | +0 | +0 | **der Satz merkt NICHTS** |
| `gridHandGate` | +0 | +0 | +0 | +0 | **der Satz merkt NICHTS** |
| `modelHandGate`* | +0 | +0 | +0 | +0 | **misst nicht, was der Name sagt — siehe unten** |
| `usePrior` | +0 | +0 | +0 | +0 | **der Satz merkt NICHTS** |

## Der Befund ist nicht verstreut, er ist ein Muster

**Drei der vier stummen Wachen sind genau die Hand- und Verdeckungswachen.** `baselineOcclusion`
nimmt beide engine-eigenen Verdeckungsarme heraus, `gridHandGate` den modellfreien Hand-Sensor.
Keine davon bewegt eine einzige Ziffer.

> **\* Korrektur 2026-09-22: `modelHandGate=0` schaltet den Modellarm NICHT ab.** Die zwei
> Schalter sind nicht gebaut wie ihre Namen klingen. `gridHandSquares` beginnt mit
> `if (!config.gridHandGate) return 0L` — ein echter Ausschalter. `modelHandSquares` dagegen
> endet die Abkuerzung mit `return flagged`, also mit der ROHEN, ungefilterten Kopfmenge; der
> Schalter nimmt nur den Form- und Bewegungsfilter weg. Der Arm wird dadurch eher BREITER, nicht
> leiser — und laut dem KDoc an der Stelle existiert der Filter, weil `real14-80` `occluded`
> ueberpraediziert und ein einziges Phantomfeld die Recovery dauerhaft aushungerte.
> Die Zeile misst also "Formfilter weg", nicht "Modellarm weg". Der Unit-Test sagt es seit je
> richtig (`TaintTest`: *"restores the raw head"*); falsch war meine Lesart in dieser Tabelle.
> **Was der Modellarm allein beitraegt, ist damit weiter ungemessen.**

Das ist kein Freibrief fuer die Wachen und kein Beleg, dass das CNN die Arbeit traegt. Es ist
eine Aussage ueber den SATZ: er traegt 24 verdeckte Frames auf 11 001 (0,2 %). Die zwei Partien
vom 2026-09-19 tragen 875 auf 988 (89 %) und liegen ungenutzt da
(`docs/baseline-occlusion-off.md`, Punkt 30 der Entscheidungsvorlage).

**Praeziser: ihnen fehlt der Zeuge am ECHTEN Material, nicht jeder Zeuge.** Alle drei tragen
Unit-Tests — `baselineOcclusion` allein zehn in `BaselineOcclusionUnitTest` plus sechs weitere
Dateien, `gridHandGate` in `VerifySingleTest`, `modelHandGate` in `TaintTest`. Die pruefen die
Arithmetik auf gebauten Feldern. Was keiner von ihnen pruefen kann, ist das Zusammenspiel auf
einer echten Aufnahme mit einer echten Hand — und genau dort kommt ein Kandidat, der diese
Wachen verschlechtert, heute gruen durch.

## Zwei Korrekturen an dem, was ich vorher behauptet hatte

**`usePrior` ist NICHT der Prior, der zaehlt.** Die 385/14/1 -> 396/3/0 stammen von
`priorLambda` in `:core-cnn` (`Observations.applyPrior`), das inzwischen als `prior_lambda` im
Modell reitet. `TrackerConfig.usePrior` gatet etwas anderes: `Ambiguity.rerankWithPrior`, die
Umsortierung mehrdeutiger Kandidaten. Zwei Prioren, aehnliche Namen, und ich hatte sie in einen
Topf geworfen. Abgeschaltet bewegt der Boolean nichts.

**`windowEndBothEnds` ist kein Eichfall.** Ich hatte ihn als "feuert nie" gefuehrt; er wird an
zwei Stellen gelesen (`VerifyPair.kt:128`, `VerifySingle.kt:208`) und bewegt eine Episode.

## Wie belastbar ist eine Episode?

**Gemessen, nicht vermutet.** Ein elfter Lauf mit der Bezugskonfiguration und ohne jeden Knopf
(`abl-kontrolle`) reproduziert den Bezug Ziffer fuer Ziffer: +0/+0/+0/+0. Der Replay ist also
lauf-zu-lauf stabil, und **die +-1 in dieser Tabelle sind echte Effekte, kein Rauschen**.

Trotzdem bleibt eine bewegte Episode ohne bewegte Entscheidung ein duenner Nachweis, und
`guard_ablation.py` meldet sie seit `a56162ae` getrennt statt als "gedeckt".

## Der Fuzzer sieht das Gegenteil

`desktop fuzz ablate <wache>` (Sekunden statt 18 Minuten) bewegt bei `baselineOcclusion` sechs
Zustaende und bei `cnnVerify` `state:move` von 0 auf 14 — Wachen, die der Satz teils nicht sieht.
Umgekehrt sieht der Fuzzer `liveAlign` nicht, weil er keine Marker fuehrt. **Die beiden Sonden
sind komplementaer blind; keine von beiden ersetzt die andere.**
