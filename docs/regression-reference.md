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

| Aufnahme | gefunden | verfehlt | erfunden | Desync-Episoden |
|---|---:|---:|---:|---:|
| 2026-08-07-13-52-38 | 25 | 0 | 0 | 0 |
| 2026-08-08-00-39-57 | 67 | 0 | 0 | 1 |
| 2026-08-08-11-55-19 | 15 | 0 | 0 | 0 |
| 2026-08-08-11-59-12 | 73 | 0 | 0 | 0 |
| VID_20260726_233432 | 21 | 0 | 0 | 0 |
| VID_20260727_233929 | 7 | 3 | 0 | 2 |
| VID_20260802_222203 | 3 | 0 | 0 | 5 |
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
