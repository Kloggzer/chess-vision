# Referenzstand des Regressionssatzes — 2026-09-21

Die Zahlen, gegen die ein neuer Lauf sich rechtfertigt. Wer sie ersetzt, schreibt Datum, Commit und
Bedingungen dazu — ein Referenzstand ohne die ist keiner.

> Der Stand vom 2026-09-14 (385/14/1, 6 Alarme) galt **vor** der Champion-Beförderung `29b7dbc6`
> und vor `priorOnTempered`. Er steht in der Git-Historie dieser Datei; hier stehen nur die Zahlen,
> die heute gelten.

## Wie er entstanden ist

    .\scripts\replay-regression.ps1 -Tag baseline-an

Baum nach `29b7dbc6` (sechs beförderte Vorgaben: `motionThr 0.219`, `motionPxThr 34.544`,
`motionMargin 0.0274`, `motionHoldS 0.1592`, `commitHoldS 0.0632`, `maxChanged 5`). Der Prior kommt
aus der `config.json` des Modells (`prior_lambda`, 5,04–7,02 je Modell), **nicht** aus `prior=` —
das Banner sagt deshalb seit `4570206c` `prior=modell` statt `prior=0.0`. Modell `p4a-80-clahe`.
Logs: `tmp/batch/baseline-an/`.

## Der Stand

Seit `4ffe21f5` (2026-09-22) mit `cleanCommitsOnly` als Vorgabe (`tmp/batch/cleanonly-v1-promote`).
Die Summe blieb 396/3/0/8, `ALARM latched` fiel 7 -> 6; vier Aufnahmen verschoben je eine
Desync-Episode und hoben sich auf (`00-39-57` 1 -> 0, `727_233929` 2 -> 1, `11-55-19` 0 -> 1,
`802_222203` 5 -> 6). Jede davon ist ein echter Effekt, siehe den Kontrolllauf unten.

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

## Der Lauf ist reproduzierbar — gemessen, nicht angenommen

Ein zweiter Lauf DERSELBEN Konfiguration (`abl-kontrolle`, 2026-09-21) liefert **+0/+0/+0/+0**
gegen diese Tabelle. Ein Unterschied von einer einzigen Desync-Episode ist damit ein echter
Effekt und kein Rauschen — das ist die Auflösung, mit der die Wachen-Ablation arbeitet
(`docs/wachen-ablation-2026-09-21.md`).

## Zwei Spalten, die man leicht falsch liest

- **Die Alarmspalte des Skripts zählt `ALARM latched`-ZEILEN**, also abgelehnte Entscheidungen
  unter einem stehenden Latch — nicht Episoden. Der Champion sah darin mit 7 gegen 5 schlechter
  aus, während seine Desync-Episoden von 15 auf 8 fielen. `scripts/compare_regression.py` stellt
  beide nebeneinander; die Spalte im Skript bleibt, weil jede zitierte Zahl an ihr hängt.
- **`11-59-12` zählt Nachlauf hinter der Referenz als „invented"** — eine Eigenheit der Aufnahme,
  keine Erfindung der Engine.

## Was dieser Satz NICHT messen kann

24 verdeckte Frames auf 11 001 (0,2 %). Alle drei Hand- und Verdeckungswachen
(`baselineOcclusion`, `gridHandGate`, und der Formfilter hinter `modelHandGate`) lassen sich abschalten, ohne dass sich eine
Ziffer bewegt. Wer an ihnen arbeitet, misst hier nichts — `docs/wachen-ablation-2026-09-21.md`.

## Der zweite Teil: `-Satz v2` (handreiches Material, 2026-09-21/22)

Die zwei Partien vom 2026-09-19 tragen 875 verdeckte Frames auf 988 — hier ist die Hand-Achse
messbar. Referenz nach Anker-Fix (`9cc951a3`) und `cleanCommitsOnly`:

| Konfiguration | `15-50-28` (87 Zuege) | `16-26-22` (59 Zuege) |
|---|---|---|
| vor beiden Fixes | 17/70/6 | 0/59/0 |
| nur Anker-Fix | 17/70/6 | 55/4/0 |
| **Anker-Fix + `cleanCommitsOnly`** | **87/0/0** | **55/4/0** |

Die vier Fehlenden auf `16-26-22` sind die letzten vier Halbzuege (`Qxc8`, `Rxc8+`, `Ne8`,
`Rxe8#`), der bekannte Reorder-Fall. Commit-Verzug (`scripts/commit_lag.py`, `retime`-Referenz
1,00 in beiden): 72 Plies bei Median 0,33 s / p90 1,20 s ohne den Knopf, 142 Plies bei 0,33 s /
1,14 s mit ihm — die gewonnenen Zuege kommen mit derselben Verzugsverteilung an.


## Historie: Prior und Temperatur (aus CLAUDE.md verschoben, 2026-09-23)

Bis 2026-09-17 fuhr der Regressionssatz mit `prior=0`, das Handy mit `4.0` — vier gruene Laeufe
deckten den Pfad nicht, auf dem `applyPrior` liegt. Gemessen auf `prior=4`:

| Lauf | found | missed | invented | Alarm-ZEILEN |
|---|---|---|---|---|
| Referenz, prior 0, ohne Temperatur | 385 | 14 | 1 | 6 |
| prior 4, OHNE Temperatur | 394 | 5 | 4 | 8 |
| prior 4, MIT Temperatur | 396 | 3 | 0 | 5 |

Die letzte Spalte zaehlt `ALARM latched`-ZEILEN, nicht Episoden. Der Gewinn der dritten Zeile kam
nicht von der Kalibrierung: `applyPrior` rechnete auf getemperten Wahrscheinlichkeiten, das
effektive Lambda war `lambda * T` = 5,98 statt 4,0. `priorOnTempered` teilt die deklarierte
Staerke seitdem durch T, und `prior_lambda` reitet im Modell (`config.json`, 5,0412 bis 7,0204,
je `4,0 x T` — Migrationswerte, keine gemessenen Optima). Verhaltensgleich nachgewiesen: 396/3/0/171
bei 5. Beim Verdrahten fragte `possibleFor` weiter den Konstruktor-Wert, weshalb der erste
Bestaetigungslauf exakt auf der Referenz blieb.

Die Temperatur wird seit 2026-09-16 gelesen. Alle sieben Modelle sind ueberkonfident (T 1,26–1,76),
`cnnConfThr = 0.85` forderte je Modell real 48 bis 70 %. `calibratedConfThr` uebersetzt die Huerde
durch die eigene Temperatur; bei echten 85 % lagen +9 Treffer und +3 Phantome.
`TemperatureParityTest` haelt drei Befunde derselben Wurzel (`invalidMass`, `PROMO_CNN_CONFIDENCE`,
die Besetzt-Achse von `calibratedConfThr`) als `@Disabled` fest; `applyPrior` liegt als drei gruene
Tests in `PriorStrengthTest`. Keine Zahl eicht beide Achsen gleich: `pEmpty` ist eine Klasse,
`pOcc` die Summe von zwoelf.
