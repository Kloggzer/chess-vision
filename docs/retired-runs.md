# Ausgemusterte Läufe — was sie gemessen haben

`data/models/` trug am 2026-08-20 **111 Läufe**. Zehn davon beantworten noch eine Frage, die sonst
nichts beantwortet (ONNX-Export als Deploy-Herkunft, plus der Champion als Rezept). Die übrigen 101
sind hier zusammengefasst und dann gelöscht worden — das ist der Zweck dieser Seite: eine Seite
statt 101 Verzeichnisse.

## Warum sie gehen konnten

| Gruppe | n | Grund |
|---|---:|---|
| p/d/s-Sweep | 40 | nie ausgewertet; nachträglich aus `metrics.jsonl` gezogen und in `docs/sampling.md` festgehalten |
| 14-Klassen-Schema | 27 | `occluded` als Klasse ist aufgegeben — gemessen schlechter, siehe `docs/occluder-plates.md` |
| 13c/combined, ohne Export | 13 | kein ONNX, nirgends zitiert; Zahlen unten |
| lrsweep | 12 | Fazit steht in `CLAUDE.md` („die Lernrate ist der kritische Faktor") |
| comp13-occ auf `comp13-occ-80-v1` | 9 | der Datensatz leckte (val/test = eine Stellung, die auch im Train stand); die Zahlen sind ungültig, `docs/class-scheme.md` und `comp13-occ-80-v2` |

## Die bewerteten unter ihnen

Alles, was ein `eval_test.json` trug. Gemessen auf dem jeweils genannten Datensatz — die Zeilen sind
untereinander **nicht** vergleichbar, verschiedene Testsplits.

| Lauf | Kl. | Datensatz | square_acc | board_acc |
|---|---:|---|---:|---:|
| `xval-f0-bn80` | 14 | `xval-80` | 0.9005 | 0.0681 |
| `xval-f0-bn80-webp` | 14 | `xval-128-80` | 0.8997 | 0.0520 |
| `xval-f3-bn80` | 14 | `xval-80` | 0.8288 | 0.0844 |
| `xval-f1-bn80` | 14 | `xval-80` | 0.8246 | 0.1168 |
| `xval-f2-bn80` | 14 | `xval-80` | 0.8145 | 0.1556 |
| `xval-f3-bn80-webp` | 14 | `xval-128-80` | 0.8110 | 0.0874 |
| `sess7-s44` | 14 | `xval-128g-80` | 0.8031 | 0.1594 |
| `xval-f1-bn80-webp` | 14 | `xval-128-80` | 0.7884 | 0.1450 |
| `sess7-s42` | 14 | `xval-128g-80` | 0.7745 | 0.1636 |
| `sess7x-s42` | 14 | `xval-128g-80` | 0.7704 | 0.1561 |
| `sess7x-s44` | 14 | `xval-128g-80` | 0.7677 | 0.1782 |
| `xval-f2-bn80-webp` | 14 | `xval-128-80` | 0.7576 | 0.1404 |
| `xval-f2-bn80-seed43` | 14 | `xval-80` | 0.7500 | 0.1312 |
| `sess7x-s43` | 14 | `xval-128g-80` | 0.7455 | 0.1580 |
| `sess7-s43` | 14 | `xval-128g-80` | 0.7042 | 0.1421 |
Der Boden ist überall derselbe: `board_acc` zwischen 0,05 und 0,18 bei `square_acc` um 0,75–0,90.
Alle 64 Felder gleichzeitig richtig zu haben war nie in Reichweite dieser Generation.

## Was stehen blieb

`id35-80-before-hn-20260812`, `id35-80-hn{1,2,3}-turntable`, `real13-ms-s{2,3}-*-bn80`,
`real14-ms-s{2,3}-*-bn80`, `turntable-13bn-80-v2` — jeder mit ONNX, also die Herkunft dessen, was
im APK liegt. Dazu `comp13-occ-bn-lr1e2-bs512` als Rezept für den Retrain auf `comp13-occ-80-v2`.
