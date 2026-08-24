# Die Commit-Schwelle aus einer Zielrate ableiten, statt sie zu suchen (2026-08-24)

`minAgreement`, `marginSquares`, `plyCostSquares` werden von Hand gesetzt und einzeln gesweept.
Die Regel dahinter ist aber eine Fehlerrate: ein erfundener Zug kostet viel mehr als ein
verpasster ("Phantome sind das Veto"). Die Literatur dreht das um — man gibt die tolerierte Rate
vor, und die Schwelle folgt daraus, verteilungsfrei und modellunabhängig.

**Ergebnis: geht heute nicht, und der Grund ist messbar.** Nicht das Verfahren scheitert, sondern
die Merkmale. Die von Hand getunte Konfiguration bleibt.

## Aufbau

`desktop replay` schreibt pro Commit eine `decision-conf:`-Zeile mit den Signalen, die die Engine
IN DIESEM MOMENT hatte — kein Blick in die Zukunft, also übertragbar auf live. 11 Recordings,
Modell `comp13-occ-bn-lr1e2-bs512`. Wahrheit ist `reference.pgn`, sonst das geprüfte
`candidate.json`; ein Commit im LCS ist ein Treffer, einer außerhalb eine Erfindung.
`VID_20260726_155132` fliegt raus, sein Label trägt keine Züge.

Kalibriert wird leave-one-recording-out: Schwelle auf 10 Recordings, gemessen auf dem elften.
Als Schranke die Clopper-Pearson-Obergrenze auf 90 % — die niedrigste Schwelle, deren akzeptierte
Menge nachweislich sauber genug ist.

    uv run python scripts/commit_truth.py          # tmp/calib/*.log -> commits.jsonl
    uv run python scripts/commit_calibrate.py 0.01 0.02 0.05

Das ist ein **Screening**: ein hier verworfener Commit ändert nicht, was die Engine danach
glaubte. Es beantwortet die Frage, die vorher gelten muss — gibt es überhaupt ein Signal, das
Erfindungen von Treffern trennt, und trägt eine darauf gefittete Schwelle auf neue Aufnahmen.

## Die Merkmale trennen nicht

311 Commits mit Wahrheit, davon 9 erfunden (2,9 %).

| Signal | AUC |
|---|---|
| `margin` | 0,725 |
| `bestScore` | 0,546 |
| `cnnAgreement` | **0,492** — Zufall |

Der Grund steht in den Verteilungen, nicht in der Statistik:

| Signal | entartet |
|---|---|
| `gridCoverage` | **100 %** aller Commits exakt 1,0 |
| `cnnAgreement` | **95 %** exakt 1,0 |
| `margin` | 47 % auf dem Sentinel `NO_SCORE = -1e9` |

Zwei von fünf Merkmalen tragen null Information. Das dritte ist keine Messung: `margin ≈ 1e9`
heißt "es gab keinen Zweitbesten", also markiert der höchste Konfidenzwert ausgerechnet den Fall
mit der wenigsten Evidenz — einen Kandidaten, dem niemand widersprochen hat.

## Was die Kalibrierung liefert

| Ziel | bestes Signal | Ergebnis |
|---|---|---|
| ≤ 1 % | keins | kein Schwellwert erreicht es |
| ≤ 2 % | `margin` | 82/204 gefunden, 2 Erfindungen bleiben; τ von 8,26 bis 1e9 über die Folds |
| ≤ 5 % | `margin` | 283/394, 9 Erfindungen — trivial, der Ist-Zustand ist schon 2,9 % |

Bei ≤ 2 % kostet es 122 von 204 richtigen Plies, um 7 von 9 Erfindungen zu töten. Die Handarbeit
schlägt das deutlich.

## Eine methodische Warnung, die hier teuer gewesen wäre

Ein Zwischenstand mit nur 4 Erfindungen (drei Replays fehlten noch) gab `bestScore` eine AUC von
**0,844**. Mit den vollen 9 fällt sie auf **0,546**. Dieselbe Größe, dasselbe Korpus, nur mehr
Positivfälle — die Trennung war Rauschen. Bei einstelligen Positivzahlen ist jede
Merkmals-Rangfolge unbrauchbar, und das τ, das über die Folds um Faktor 1e8 springt, sagt
dasselbe noch einmal.

## Was es bräuchte

Einen Konfidenzwert, der nicht gesättigt ist. `cnnAgreement` ist bei 95 % der Commits 1,0, weil
es zählt, wieviele Felder zustimmen — bei 64 Feldern und einem Zug, der zwei bewegt, stimmen
immer fast alle zu. Die naheliegende Ablösung ist die temperaturskalierte Emissions-Likelihood
der committeten Stellung gegen die zweitbeste (die Modelle tragen ihre Temperatur bereits im
`config.json`, T ≈ 2,04). Ist die da, läuft dieselbe Messung unverändert noch einmal.

Zu bedenken bleibt, dass die Erfindungen alle aus `cnn_recovery` kommen (9 von 9, bei 111 Commits
dieses Deciders) — und dass das Modell selbst überzeugt falsch liegt, was
`docs/emission-correlation.md` pro Klasse aufschlüsselt. Ein Konfidenzwert, der auf einem
überzeugt falschen Modell aufsetzt, erbt dessen Überzeugung.
