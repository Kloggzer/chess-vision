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

## 2. Wie weit streut der Seed? Weiter als die Effekte.

Dreimal das s2-Rezept (`--resume comp13-ms-s1-pretrain-bn80`, 60 Epochen, bs 256, lr 0,01, cosine,
BatchNorm, `--head occlusion`), nur der Seed wechselt. Werte am BESTEN Checkpoint, nicht in der
letzten Epoche:

| Metrik | Seed 42 | Seed 43 | Seed 44 | Spanne | relativ |
|---|---|---|---|---|---|
| `val_visible_acc` | 0,8879 | 0,8783 | 0,8873 | **0,0097** | 1,1 % |
| `val_checkpoint_score` | 0,8716 | 0,8537 | 0,8607 | 0,0180 | 2,1 % |
| `val_piece_acc` | 0,6778 | 0,6531 | 0,6772 | 0,0247 | 3,7 % |
| `val_macro_recall` | 0,5530 | 0,5507 | 0,5851 | 0,0344 | 6,1 % |
| `val_occupied_board_acc` | 0,5667 | 0,4951 | 0,5755 | 0,0804 | 14,7 % |
| `val_conf_auroc` | 0,9222 | 0,8588 | 0,8229 | **0,0994** | 11,4 % |

Auch die Länge streut: Early Stopping nach **25 / 13 / 14** Epochen, bester Checkpoint bei
Epoche **8 / 4 / 6**.

`val_visible_acc` ist die stabilste Größe und zugleich die, auf der die Checkpoint-Auswahl seit
`83db7e75` beruht — das passt zusammen. `val_conf_auroc` ist die unbrauchbarste: ihre Spanne ist
so groß wie der Abstand zwischen „gut" und „mäßig".

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
