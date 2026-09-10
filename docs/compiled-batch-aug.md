# Compiled batch augmentation

On the isolated PyTorch 2.13 / ROCm 10 / Triton 3.7 stack, add
`--batch-aug --compile-batch-aug` to compile augmentation independently of the
model. `scripts/spike_training_stack.ps1 -Mode train -CompileBatchAug -Out <fresh-dir>`
also exposes the option. The pinned PyTorch 2.9 environment is not migrated.

The compiler retains eager random draws (`fallback_random=True`). Ordinary
Triton random generation changes the GPU RNG stream and produced substantially
different images at the same seed; it is not the training option's default.
Compiled arithmetic still rounds differently. The user accepted these small
numerical differences; no improvement or degradation in accuracy is claimed.

The uncompiled path caches immutable normalization/luminance tensors on the
device and avoids duplicate grayscale reductions. It also preserves the old CPU
factor-before-permutation RNG order. Against the pre-refactor implementation,
18 CPU/GPU cases (1, 64, 256 crops; three seeds) matched outputs and both RNG
states exactly. The corresponding compiled test covered 24 board cases
(64/128/192/256 crops, six seeds): both RNG states matched; the maximum output
difference was 8.83e-6 in normalized float values.

Isolated augmentation, 256 crops at 80x80, three 100-step windows after warmup:
the old path took about 3.9 ms, cached eager about 3.1 ms, and compiled eager-RNG
about 0.92 ms per batch. These are augmentation timings, not full training
speedups. Reproduce with `scripts/benchmark_batch_aug.py --reference <old-module.py>
--output <report.json> --compile --preserve-rng-only`.

Compilation uses static crop shapes because symbolic shapes requested an absent
host C++ compiler on this Windows installation. The invocation temporarily raises
the recompilation limit to 32 for the four board batch sizes and six jitter
orders; the model compiler's settings are restored afterwards. New shapes/orders
incur first-use compilation cost. The default remains eager.

## Was in der Trainingsschleife ankommt (2026-09-10)

Isolierte 4,2x sind nicht 4,2x je Epoche: die Augmentierung ist 3 ms eines
20-ms-Schritts. Gemessen auf `real13-mix-v6-80`, `--batch-aug --num-workers 2`,
zwei Wiederholungen je Arm, Aufwaermepochen verworfen:

| Arm | warme Epochen (s) | Median | gegen eager |
|---|---|---:|---:|
| eager | 18,25–19,37 | 18,64 | — |
| `--compile-batch-aug` | 17,41–17,75 | 17,57 | 1,06x |
| beide Compiler | 12,68–13,35 | 13,17 | 1,42x |

Die Verteilungen von eager und Aug-kompiliert ueberlappen nicht — der Effekt ist
echt, aber klein. **Er haengt daran, was daneben laeuft:** allein bringt die
kompilierte Augmentierung 5,7 %, auf `--compile-model` gelegt 16 % (15,8 → 13,2 s).
Sobald der Modellschritt von ~20 auf ~8,6 ms faellt, wiegen die 3 ms schwerer.
Zwei Wiederholungen je Arm sind Pflicht: der Abstand zwischen zwei Laeufen
desselben Arms betrug 0,8 s, der Effekt selbst 1,1 s.

Dynamo meldet beim Kompilieren, es ignoriere den `functools.lru_cache` auf
`_grey_weights` und trace die Funktion direkt. Hier folgenlos — sie liefert eine
Konstante je (device, dtype), die als Konstante in den Graphen faellt, und ein
dtype-Wechsel loest ohnehin ein Recompile aus.

Die Mehrseed-Qualitaetsvalidierung laeuft ueber `scripts/aug_compile_seeds.ps1`:
drei Arme (eager, nur Augmentierung, beide) gegen Seeds 42/43/44 auf demselben
`split-pin.json`, je 60 Epochen auf frischen Verzeichnissen.

## Drei Seeds, drei Arme — kein messbarer Qualitaetsunterschied (2026-09-10)

Risiko 6 der Uebergabe, beantwortet. `scripts/aug_compile_seeds.ps1`, neun Laeufe a 60 Epochen,
`split-pin.json`, `val_visible_piece_acc` gemittelt ueber die letzten zehn Epochen (`best` ist als
Vergleichsmass unbrauchbar, siehe unten):

| Arm | s42 | s43 | s44 | Mittel | sd |
|---|---:|---:|---:|---:|---:|
| eager | 0,9271 | 0,9428 | 0,9673 | 0,9457 | 0,0203 |
| `--compile-batch-aug` | 0,9106 | 0,9380 | 0,9244 | 0,9243 | 0,0137 |
| beide Compiler | 0,9341 | 0,9535 | 0,9240 | 0,9372 | 0,0150 |

Gepaart, damit der Seed-Effekt herausfaellt:

| | s42 | s43 | s44 | Mittel | sd | t (df=2) |
|---|---:|---:|---:|---:|---:|---:|
| aug − eager | −0,0165 | −0,0049 | −0,0429 | −0,0214 | 0,0195 | −1,90 |
| both − eager | +0,0070 | +0,0107 | −0,0434 | −0,0085 | 0,0307 | −0,49 |

**Nichts davon ist signifikant** (p ≈ 0,20 im besten Fall). Die Seed-Streuung innerhalb eines Arms
ist so gross wie jeder gemessene Abstand. Nach zwei Seeds sah `both > eager > aug` sauber aus —
Seed 44 hat es gekippt, und zwar staerker als die beiden vorherigen zusammen. Das ist der
Lehrbuchfall aus `seed-variance-exceeds-the-effects`.

Stehen bleibt genau ein Hinweis: `aug − eager` ist 3 von 3 negativ. Als Vorzeichentest p = 0,25,
also nichts — aber es ist die einzige Richtung, die konsistent blieb, und sie betrifft den Arm,
der allein nur 1,06x bringt.

## Warum `best` hier nicht verglichen wird

`best` ist das Maximum ueber 60 verrauschte Ziehungen und liegt deshalb **konstruktionsbedingt**
ueber dem Niveau des Laufs — der Erwartungswert des Maximums von 60 normalverteilten Ziehungen
liegt 2,3–2,9 sd ueber dem Mittel, gemessen wurden im Schnitt 2,9. Der Aufschlag kuerzt sich beim
Vergleich aber NICHT heraus, weil er selbst streut: zwischen 1,4 und 6,1 sd.

Zwei Faelle aus dem Sweep: `eager-s44` hat das ruhigste Val (sd 0,0040) und trotzdem den groessten
Ausschlag (6,1 sd, 0,9900) — eine Ausreisser-Epoche, keine Eigenschaft des Arms. Und `aug-s42` hat
seinen Bestwert bei **Epoche 4** von 60, mitten im Cosine-Abstieg; 56 weitere Epochen schlugen ihn
nie. `best.pt` waere dort ein Vier-Epochen-Modell.

Das Rauschen kommt NICHT vom Val-Satz: er traegt 11 684 sichtbare Figurenzellen, die
Stichproben-sd liegt bei 0,0024 gegen eine gemessene Epochenstreuung von 0,0095 — 6 % der Varianz.
Die restlichen 94 % sind das Modell selbst. Ein groesserer Val brechte 0,0095 auf 0,0092; der
Hebel ist die Zeitachse (Fenster-Mittel, SWA), nicht die Datenmenge.
