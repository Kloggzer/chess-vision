# Regressionssatz: Referenzstand, was er messen kann und was nicht

Die Zahlen, gegen die ein neuer Lauf sich rechtfertigt. Wer sie ersetzt, schreibt Datum, Commit und
Bedingungen dazu — ein Referenzstand ohne die ist keiner.

## Der Stand (2026-09-22)

    .\scripts\replay-regression.ps1 -Tag baseline-an

Baum nach `29b7dbc6` (Champion-Vorgaben, unten) und `4ffe21f5` (`cleanCommitsOnly` als Vorgabe).
Der Prior kommt aus der `config.json` des Modells (`prior_lambda`), nicht aus `prior=` — das Banner
sagt `prior=modell`. Modell `p4a-80-clahe`.

| Aufnahme | gefunden | verfehlt | erfunden | Desync-Episoden |
|---|---:|---:|---:|---:|
| 2026-08-07-13-52-38 | 25 | 0 | 0 | 0 |
| 2026-08-08-00-39-57 | 67 | 0 | 0 | 0 |
| 2026-08-08-11-55-19 | 15 | 0 | 0 | 1 |
| 2026-08-08-11-59-12 | 73 | 0 | 0 | 0 |
| VID_20260726_233432 | 21 | 0 | 0 | 0 |
| VID_20260727_233929 | 7 | 3 | 0 | 1 |
| VID_20260802_222203 | 3 | 0 | 0 | 6 |
| VID_20260802_222741 | 33 | 0 | 0 | 0 |
| VID_20260824_153751 | 35 | 0 | 0 | 0 |
| VID_20260824_154327 | 117 | 0 | 0 | 0 |
| **Summe** | **396** | **3** | **0** | **8** |

**Der Lauf ist reproduzierbar, gemessen:** ein zweiter Lauf derselben Konfiguration
(`abl-kontrolle`) liefert +0/+0/+0/+0. Eine einzige Desync-Episode Unterschied ist damit ein echter
Effekt, kein Rauschen — aber eine bewegte Episode ohne bewegte Entscheidung bleibt ein duenner
Nachweis, `guard_ablation.py` meldet sie getrennt.

## Zwei Spalten, die man leicht falsch liest

- **Die Alarmspalte von `replay-regression.ps1` zaehlt `ALARM latched`-ZEILEN**, also abgelehnte
  Entscheidungen unter einem stehenden Latch — nicht Episoden. Der Champion sah darin mit 7 gegen 5
  schlechter aus, waehrend seine Desync-Episoden von 15 auf 8 fielen. Gezaehlt wird die EPISODE:
  `scripts/compare_regression.py` stellt beide nebeneinander, `desync` ist die, die zaehlt, und
  `scripts/optimise_knobs.py` minimiert Episoden. Die Skriptspalte bleibt, weil jede zitierte
  Referenzzahl an ihr haengt.
- **`11-59-12` zaehlt Nachlauf hinter der Referenz als „invented"** — eine Eigenheit der Aufnahme,
  keine Erfindung der Engine.

## Der zweite Teil: `-Satz v2` (handreiches Material)

Die zwei Partien vom 2026-09-19 tragen 875 verdeckte Frames auf 988 — hier ist die Hand-Achse
messbar. Referenz nach Anker-Fix (`9cc951a3`) und `cleanCommitsOnly`: **`15-50-28` 87/0/0,
`16-26-22` 55/4/0.** Die vier Fehlenden sind die letzten vier Halbzuege (`Qxc8`, `Rxc8+`, `Ne8`,
`Rxe8#`), der bekannte Reorder-Fall. `cleanCommitsOnly` holte die Zuege ohne Verzugskosten
(`scripts/commit_lag.py`: Median 0,33 s, p90 1,14 s ueber 142 Plies).

**Seit `b2d11570` (2026-09-26): 146/0/0 bei 0 Desync** (`16-26-22` 59/0/0). Der Replay rechnet mit
der Konfiguration des Handys (`servingConfig`): `motionThr` skaliert jetzt auch ohne Bildsprung mit
der Engine-Rate, und die v2-Videos haben 15 fps. Die vier Reorder-Halbzuege werden erkannt,
`taintIdentityThr` 0,5 ist neutral (`tmp/batch/serving-v2`, `-v2-taint0`). v1 unveraendert
396/3/0/8 (`tmp/batch/serving-v1`).

## Was der Hauptsatz NICHT messen kann: die Hand-Achse

Er traegt 24 verdeckte Frames auf 11 001 (0,2 %). Jede boolesche Wache einzeln abgeschaltet
(`scripts/guard_ablation.ps1`, ~18 min je Lauf, 2026-09-21), Bezug 396/3/0/8:

| Wache | found | missed | inv | desync |
|---|---:|---:|---:|---:|
| `cnnVerify` | -266 | +266 | +7 | -8 |
| `cnnEvalOnSettle` | -11 | +11 | +1 | +13 |
| `liveAlign` | +3 | -3 | +0 | +1 |
| `requireMotionForMove`, `verifyObserveNow` | +0 | +0 | +0 | +1 |
| `windowEndBothEnds` | +0 | +0 | +0 | -1 |
| `baselineOcclusion`, `gridHandGate`, `modelHandGate`, `usePrior` | +0 | +0 | +0 | +0 |

- **Drei der vier stummen Wachen sind die Hand- und Verdeckungswachen.** Das ist eine Aussage ueber
  den SATZ, nicht ueber die Wachen: sie arbeiten die ganze Zeit (das Verdeckungs-Veto feuert in
  Tausenden Frames), nur steht dort nichts auf dem Spiel, das der Satz zaehlt. Unit-Tests pruefen
  ihre Arithmetik; das Zusammenspiel mit einer echten Hand prueft nur `-Satz v2`.
- **`baselineOcclusion=0`** nimmt beide engine-eigenen Arme heraus, Verdeckung UND HSV-Schattenveto
  (seit 2026-09-21 am selben Schalter, vorher lief das Schattenveto weiter;
  `docs/tracker-flow.md`). Mit repariertem Schalter weiter 396/3/0/8.
  **Niemand sollte damit ausliefern:** die zwei Arme sind unabhaengige Evidenz.
- **`modelHandGate=0` schaltet den Modellarm NICHT ab.** `modelHandSquares` gibt dann die ROHE
  Kopfmenge zurueck, der Schalter nimmt nur den Form- und Bewegungsfilter weg (`TaintTest`:
  *"restores the raw head"*). `gridHandSquares` dagegen ist ein echter Ausschalter. Was der
  Modellarm allein beitraegt, ist ungemessen.
- **`usePrior` ist nicht der Prior, der zaehlt.** Er gatet `Ambiguity.rerankWithPrior`; der Sprung
  385/14/1 -> 396/3/0 gehoert `priorLambda` (`Observations.applyPrior`, heute `prior_lambda`).
- **`windowEndBothEnds`** wird nur in `VerifyPair` wirksam und bewegt eine Episode.
- **`desktop fuzz ablate <wache>`** (Sekunden statt 18 Minuten) sieht `baselineOcclusion` und
  `cnnVerify`, aber nicht `liveAlign` (keine Marker). Fuzzer und Satz sind komplementaer blind.

**Wie zuverlaessig der Coverage-Kopf ist:** je ZELLE F1 0,958 gegen SAMs Matte (16 000 Zellen,
`docs/occlusion-gate.md`), als FRAME-Filter verpasst er bei seiner besten Schwelle 34 von 59
Faellen.

## Die Champion-Vorgaben (`29b7dbc6`, 2026-09-20, vorlaeufig)

| Knopf | vorher | jetzt |
|---|---:|---:|
| `motionThr` | 0,25 | **0,219** |
| `motionPxThr` | 20,0 | **34,544** |
| `motionMargin` | 0,10 | **0,0274** |
| `motionHoldS` | 0,20 | **0,1592** |
| `commitHoldS` | 0,067 | **0,0632** |
| `maxChanged` | 6 | **5** |

Gefunden mit `scripts/optimise_knobs.py` (Constrained-TPE, Racing) auf fuenf Aufnahmen: 437 Frames
frueher. Treffer und Phantome wie vorher, Desync-Episoden 15 -> 8 (fast ganz aus `222203`).

- **Die Vorgabe erreicht ein benutztes Telefon NICHT.** `ConfigCodec.decode` legt jeden
  gespeicherten Wert ueber die Vorgabe; sie greift nur bei Neuinstallation oder Zuruecksetzen. Ein
  `CONFIG_SCHEMA_VERSION`-Sprung wuerde jede Handeinstellung wegwerfen und ist fuer
  Bedeutungsaenderungen reserviert — bewusst nicht getan.
- **Tests wurden nicht auf die neuen Zahlen umgeschrieben**, sondern setzen die Groesse, die sie
  meinen, selbst. `FrameLoopTest.coreOccludedStateExitsOnAQuietBoard` pinnt `motionPxThr = 20.0`,
  weil der Vorfall von 2026-08-07 an dieser Empfindlichkeit haengt.

### `motionPxThr` steuert die Verdeckungsschwelle mit

`FrameLoop` leitet die Baseline-Verdeckungsschwelle als `motionPxThr * BASELINE_ABS_THR_FACTOR`
(4,0) ab. Der Champion hob sie damit von **80 auf 138,176** — der Optimierer sah diese Kopplung nie.
`BaselineOcclusionUnitTest` prueft weiter gegen 80,0, und `Motion.kt` traegt mit
`MOTION_PX_THR_DEFAULT = 20.0` einen zweiten Vorgabewert, den die elementaren Bewegungstests nutzen.

Auf echtem Material (`scripts/occlusion_reserve.ps1`, vier Aufnahmen, 11 001 Frames, nur dieser
Knopf veraendert):

| Arm | `changed` | `occlVetoed` | `shadowVetoed` | beide Arme einig* |
|---|---:|---:|---:|---:|
| `motionPxThr = 20` | 6 823 | 4 547 | 4 355 | 73,8 % |
| Champion (34,544) | 8 118 | **1 423** | 3 766 | **26,5 %** |

\* `scripts/occlusion_arms.py`: Anteil der Frames, in denen Coverage-Kopf und Baseline-Arm
gemeinsam melden, von allen, in denen einer meldet (Uebereinstimmung, kein Guetemass). Unter dem
Champion spricht der Kopf in 66,9 % allein — und er ist als Frame-Filter die schwaechere Haelfte.

Das Verdeckungs-Veto feuert auf **68,7 % weniger Frames** (synthetisch, `desktop fuzz check`: 42 %;
ueber 34,5 saettigt es dort). Auf dem Hauptsatz kostet das nichts, weil er keine Verdeckung traegt;
schmaler geworden ist die Reserve. **Kein Kandidat sollte `motionPxThr` weiter nach oben
schieben** — der beste der Budget-Suche haette sie fuer 21 Frames Latenz auf 166 gehoben.

**Offen:** `fuzz check` zeigt unter den Champion-Werten `gate:occluded = 0` — die Vorgabe betritt
den Verdeckungs-ZUSTAND in diesen Szenen nicht mehr, waehrend das Verdeckungs-VETO feuert.

## Historie: Prior und Temperatur

Bis 2026-09-17 fuhr der Satz mit `prior=0`, das Handy mit `4.0`: vier gruene Laeufe deckten den Pfad
nicht, auf dem `applyPrior` liegt. Mit `prior=4` und Temperatur kam 396/3/0 heraus (ohne Prior
385/14/1) — aber nicht durch die Kalibrierung: `applyPrior` rechnete auf getemperten
Wahrscheinlichkeiten, das effektive Lambda war `lambda * T` = 5,98 statt 4,0. Seitdem teilt
`priorOnTempered` die deklarierte Staerke durch T, und `prior_lambda` reitet im Modell (5,0412 bis
7,0204, je `4,0 x T` — Migrationswerte, keine gemessenen Optima). Verhaltensgleich nachgewiesen.
Zwei Stellen fragen die Staerke; `possibleFor` fragte beim Verdrahten noch den Konstruktor-Wert.

Die Temperatur wird seit 2026-09-16 gelesen. Alle sieben Modelle sind ueberkonfident (T 1,26–1,76),
`cnnConfThr = 0.85` forderte real 48 bis 70 %. `calibratedConfThr` uebersetzt die Huerde durch die
eigene Temperatur; bei echten 85 % lagen +9 Treffer und +3 Phantome. `TemperatureParityTest` haelt
drei Befunde derselben Wurzel (`invalidMass`, `PROMO_CNN_CONFIDENCE`, die Besetzt-Achse von
`calibratedConfThr`) als `@Disabled` fest; `applyPrior` liegt gruen in `PriorStrengthTest`. Keine
Zahl eicht beide Achsen gleich: `pEmpty` ist eine Klasse, `pOcc` die Summe von zwoelf.
