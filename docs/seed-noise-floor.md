# Was ein A/B schlagen muss (2026-08-25)

Zwei getrennte Fragen, die bis heute als eine behandelt wurden.

## 1. Ist das Training deterministisch? Ja.

Zwei Läufe, `--seed 42`, gleiches Rezept, 2 Epochen auf `real13-straight-80-v3`: **jede Metrik
bit-identisch**, bis zur letzten Stelle. Auf ROCm (RX 7900 XT), mit AMP, mit 8 Workern — und ohne
dass `torch.use_deterministic_algorithms` oder `cudnn.benchmark = False` gesetzt wären.

Der Fix, den das TODO dafür vorsah, wäre reine Rechenzeit gewesen.

**Ein echter Fehler kam trotzdem heraus:** `train.py` seedete `torch` und `numpy`, nie aber Python's
`random` — und die Augmentierung zieht von dort. Bei 8 Workern beisst das nicht, weil PyTorch in
jedem Worker `random` und `torch` selbst deterministisch seedet. Bei `--num-workers 0` schon:
gleiche Batch-Reihenfolge, andere Pixel. Das war ausgerechnet der Pfad, auf dem man
Nichtdeterminismus untersucht. Messwerkzeug: `scripts/loader_determinism.py`.

## 2. Wie weit streut der Seed?

**Korrigiert 2026-08-25 nachmittags.** Die erste Fassung dieser Seite maß die Streuung
ABGEBROCHENER Läufe: Early Stopping (`--patience 7`) beendete sie nach 13–25 von 60 Epochen, mitten
in der Hochlern-Phase — die letzte Lernrate lag noch bei 6,3e-3 bis 8,9e-3 von 1e-2, der
Cosine-Schedule hatte kaum begonnen. Das beste Ergebnis lag bei Epoche 4–8, während der
Referenzlauf `swa1e4` seins bei 45 hatte. Gemessen war also die Varianz der lauten Frühphase.

Mit `--epochs 60 --patience 60`, drei Seeds, Werte am besten Checkpoint:

| Arm | `visible_acc` | `piece_acc` |
|---|---|---|
| p2 (116 475 Crops) | 0,0080 | 0,0145 |
| p8 (424 519 Crops) | 0,0270 | 0,0589 |

Der größere Datensatz streut MEHR, nicht weniger. Eine Erklärung dafür steht aus.

## Gepaart vergleichen, wenn die Seeds geteilt sind

Die Spanne oben ist die falsche Schranke, sobald beide Arme dieselben Seeds fahren. Dann ist die
Differenz JE SEED die Beobachtung, und die Frage lautet nicht „ist der Abstand größer als die
Streuung", sondern „zeigt jeder einzelne Seed in dieselbe Richtung".

Beim p2/p8-Vergleich hätte die ungepaarte Lesart in die Irre geführt: der Median-Abstand auf
`piece_acc` ist 0,0499, die Seed-Spanne von p8 allein 0,0589 — nach dieser Schranke wäre der
Effekt „im Rauschen". Gepaart ist er es nicht:

| Metrik | Seed 42 | Seed 43 | Seed 44 |
|---|---|---|---|
| `visible_acc` | +0,0330 | +0,0052 | +0,0049 |
| `piece_acc` | +0,0990 | +0,0401 | +0,0354 |
| `occupied_board_acc` | +0,3570 | +0,2280 | +0,1271 |

Drei von drei, jede Metrik, dasselbe Vorzeichen. Der gemeinsame Seed hebt sich heraus.

## Was das für die bisherigen Vergleiche heißt

**Die Unterschiede zwischen den s2/s3-Varianten liegen im Rauschen.** Berichtet waren
`visible_piece_acc` 0,8070 (swa1e4) / 0,8083 (hn4) / 0,7969 (hnall065) — eine Spanne von 0,011
gegen eine Seed-Spanne von 0,0097 bis 0,0247 je nach Metrik. Mit einem Seed je Arm ist das nicht
unterscheidbar.

**Konkret zurückgenommen:** die Empfehlung vom 2026-08-24, `real13-ms-s3-hn4-bn80` statt
`swa1e4` aufs Gerät zu nehmen, stützte sich auf AUROC 0,908 gegen 0,870 und `conf_wrong` 0,799
gegen 0,822. Der AUROC-Abstand ist 0,038 bei einer gemessenen Seed-Spanne von **0,099**. Dafür gibt
es keine Grundlage. Beide Modelle sind gleich gut, soweit man es weiß.

Unberührt davon bleibt das Occlusion-Gate: `coverage_gate` = 0,15 für beide, gemessen mit
`realgames model-read` auf den Checkpoints selbst und damit unabhängig davon, wie sie entstanden
sind (`docs/occlusion-gate.md`).

## Drei Gründe, warum alte Zahlen nicht mit neuen vergleichbar sind

1. **Zwei Datenpfade.** `real13-ms-s2-bn80-bs256-v2` lief über den Dateiweg (210 s/Epoche), die
   übrigen über die Memmap (77–98 s). `_require_pack` verhindert den stillen Rückfall inzwischen.
2. **`val_checkpoint_score` hat seine Definition geändert** (`83db7e75`, nur noch sichtbare Zellen).
3. **Sieben Commits in `src/chesslab/training/`** seit den Referenzläufen, darunter `bb9176e3`
   (Klassengewichte aus den sichtbaren Zeilen) — das geht direkt in den Verlust ein.

Ein Lauf von gestern lässt sich deshalb heute nicht reproduzieren, und das ist kein
Determinismus-Bruch. Wer alte gegen neue Zahlen stellt, vergleicht drei Änderungen mit.

## Regel

Ein A/B braucht **drei Seeds je Arm und den Median**. Ein Effekt unter der Spanne oben ist kein
Effekt. Für Fragen mit erwartetem NULL-Effekt — `--per-position` 8 → 2, der Datensatz-Kreuztest —
gilt das erst recht: dort ist die Rauschgrenze die ganze Antwort.

    uv run python scripts/seed_noise_floor.py     # liest data/models/_noise/*
