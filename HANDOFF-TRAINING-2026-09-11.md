# Übergabe: Backbone-Training auf 80 px und 128 px

> Geschrieben 2026-09-11 nach der Trainings-Optimierung (Commit `37732878`).
> Der Auftrag selbst steht in **`docs/arch-training-candidates.md`** — Kandidaten A–F, Reihenfolge,
> was für alle Arme gleich sein muss. Dieses Dokument ergänzt, was seitdem dazugekommen ist.

## 1. Womit trainiert wird — `.venv`, seit der Migration

`pyproject.toml` ist auf den neuen Stack migriert (`cf4cba1b`): **torch 2.13.0+rocm10.0.0**,
torchvision 0.28.0, triton-windows 3.7.1, opencv 4.13 (unter 5 gedeckelt, siehe unten).
`tmp/compile-spike/` wird nicht mehr gebraucht und kann weg.

Geprüft vor der Migration: volle Suite 926 passed, Export bitgleich, `quantize` mit argmax parity
1.000, `doctor --gpu` 14 pass / 3 warn / 0 fail.

**Für die Compiler-Schalter brauchst du eine gesetzte `CC`** — Triton wählt sonst `clang`, dem die
Windows-Header fehlen. Zeige sie auf das mitgelieferte
`.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe`. Und gib **je Arm eigene**
`TORCHINDUCTOR_CACHE_DIR` / `TRITON_CACHE_DIR`: ein geteilter Compiler-Cache färbt die
Zeitmessung des nächsten Arms.

Offen geblieben: der Stack-A/B hat nur n = 1 (Seed 42, `train_loss` im Median 0,0021 auseinander).
`scripts/stack_ab_runs.ps1` würde 43 und 44 nachholen — gegen die jetzt gepinnte Umgebung müsste
das Skript allerdings erst auf zwei Umgebungen umgestellt werden.

## 2. Das Rezept

```
--batch-aug --compile-batch-aug --compile-model --fused-adamw
```

Worker bleiben bei 2 (`BATCH_AUG_WORKERS`); acht kaufen mit Batch-Aug nichts und kosten 2,9 GB.
Alle vier Schalter sind per Vorgabe AUS und müssen bewusst gesetzt werden — auf `.venv` sterben
die Compiler laut, und `--fused-adamw` verschiebt Parameter um 2,4e-7.

`--compile-mode reduce-overhead` (CUDA-Graphs) bringt weitere 1,14x, ist aber **nicht empfohlen**:
Ausgabepuffer werden beim nächsten Abspielen überschrieben, und es hat null Seed-Validierung.

Gemessen (gepoolt, zwei warme Wiederholungen je Arm, `real13-mix-v6-80`):

| Arm | s/Epoche |
|---|---:|
| beide Compiler ohne fused | 17,80 |
| **+ `--fused-adamw`** | **11,46** |
| + CUDA-Graphs statt fused | 12,57 |
| beide Hebel | 10,04 |

Qualität: über drei Seeds und drei Arme **kein signifikanter Unterschied** (bester Kandidat
gepaart t = −1,90, df = 2). Details in `docs/compiled-batch-aug.md`.

## 3. Die 128-px-Lücke — vor dem ersten Lauf klären

**Es gibt keinen v6-Datensatz in 128 px.** Bestand:

| Datensatz | Pack | Manifest | Splits |
|---|---:|---:|---|
| `real13-mix-v6-80` | 15,4 GB | 841 521 | `split-pin.json`, `split.json` |
| `real13-mix-v6-80-clahe` | 15,4 GB | 841 521 | dieselben, CLAHE gebacken |
| `real13-mix-v4-128` | **28,6 GB** | 610 993 | `split.json` + f0–f3, kein `split-pin` |

Der einzige gepackte 128er ist v4 — vor Schärfe- und Dunkelfilter, anderer Val, gegen v6-80 nicht
vergleichbar. Entweder einen v6-128 bauen (`dataset build --pack-size 128x128`, dann `pack`) oder
den Vergleich ausdrücklich innerhalb einer Generation führen.

**Speicherwarnung:** 28,6 GB Pack auf 31,8 GB RAM. Der 80er passt komplett in den Dateicache
(gemessen: privat 5,0 GB, WorkingSet 21,7 GB); der 128er tut das nicht. Erwarte echte Platten-I/O
je Epoche — und das rührt an die Stelle, an der die Rechnerabstürze hingen
(`ask-before-heavy-compute`, `pc-crashes-are-memory-not-gpu`).

## 4. Der Val-Blocker aus `arch-training-candidates.md` ist erledigt

Das Doc nennt als blockierend, dass `2026-09-06-21-29-35` null weisse Springer trägt. **Der
v6-`split-pin.json` benutzt ihn nicht**, sondern `rg-2026-09-06-20-27-33`. Nachgezählt:

529 Bretter (389 vollständig), 33 511 Zellen, davon 31 342 sichtbar und 11 684 sichtbare Figuren.
Seltenste Klasse `wQ` mit 191 Beispielen — **volle Abdeckung über alle 13 Klassen**.

Der Vorbehalt aus dem Doc bleibt: Val und die Alternative stammen vom selben Aufnahmetag.

## 5. Wie verglichen wird — das ist heute teuer gelernt worden

- **`best` ist als Vergleichsmaß raus.** Maximum über 60 verrauschte Ziehungen, liegt
  konstruktionsbedingt 2,3–2,9 sd über dem Niveau des Laufs (gemessen im Schnitt 2,9) und der
  Aufschlag streut selbst zwischen 1,4 und 6,1 sd. Ein Lauf hatte seinen Bestwert bei **Epoche 4
  von 60**. Nimm das Mittel der letzten 10–20 Epochen.
- **Gepaart je Seed vergleichen**, nicht Mittelwerte über verschiedene Seed-Sätze. Der Seed-Effekt
  kürzt sich heraus; das spart Läufe.
- **Drei Seeds sind das Minimum.** Heute sah ein Zwei-Seed-Muster sauber aus, Seed 44 hat es
  gekippt — stärker als die beiden vorherigen zusammen.
- **Das Rauschen kommt zu 94 % aus dem Modell, zu 6 % aus dem Val.** Ein größerer Val hilft nicht;
  über Epochen mitteln schon.
- **Zeiten nur auf ruhigem Rechner.** Derselbe Arm maß 13,17 / 15,71 / 19,54 s je nachdem, was
  daneben lief. Immer zwei warme Wiederholungen, Aufwärmepochen verwerfen.

## 6. Fallen, die heute Zeit gekostet haben

- **PowerShell 5.1 + `$ErrorActionPreference='Stop'` + `2>&1 |`**: Torchs erste stderr-Warnung wird
  zum terminierenden `NativeCommandError`. Ein Sweep stirbt vor der ersten Epoche. Um den nativen
  Aufruf herum auf `Continue` setzen und über `$LASTEXITCODE` prüfen.
- **Ein Sweep darf nicht am Exit-Code hängen**, sondern an den Epochen auf der Platte.
- **MIOpens BatchNorm-Trainingskernel kompiliert auch auf ROCm 10 nicht** (fehlende
  C++-Standardbibliothek für HIPRTC, auf allen vier echten Formen nachgemessen).
  `PrimitiveBatchNorm2d` bleibt und ist der Grund, warum `--compile-model` so viel holt.
- **Keine pauschalen `Stop-Process`-Aufrufe.** Auf der Maschine liefen heute Nacht fremde
  `chesslab eval`-Prozesse. Nur eigene PIDs beenden, und immer beide (Shim + echter Interpreter).

## 7. Vor einer Migration von `pyproject.toml`

1. Stack-A/B mit Seeds 43 und 44 nachholen (`scripts/stack_ab_runs.ps1`, Seed 42 steht).
2. Export, Quantisierung und ONNX auf dem neuen Stack durchspielen und die erzeugte `.onnx` gegen
   die alte prüfen — dieser Teil ist dort **nie gelaufen**.

## 8. Werkzeug

| Skript | wofür |
|---|---|
| `scripts/spike_training_stack.ps1` | Spike-Env korrekt starten (`-Mode profile\|feed\|train`) |
| `scripts/profile_training_kernels.py` | `--variants` (Startaufwand je Schalter), `--aug` (Augmentierung), Batch-Skalierung |
| `scripts/benchmark_batch_aug.py` | Augmentierung gegen eine Referenzfassung, inkl. RNG-Parität |
| `scripts/step_overhead_reps.ps1` | vier Schalter-Arme × zwei warme Wiederholungen |
| `scripts/aug_compile_seeds.ps1` | drei Arme × drei Seeds, volle Läufe |
| `scripts/profile_training_gpu.py` | isolierter Schritt, Stack-Parität über `--fixture` |

Docs: `docs/training-stack-spike.md` (Stack, Startaufwand, Auslastung),
`docs/compiled-batch-aug.md` (RNG-Parität, Seed-Validierung, warum `best` raus ist),
`docs/training-tuning.md` (Worker, Layout, Metriken),
`docs/val-choice-2026-09-10.md`, `docs/arch-bench-2026-09-10.md`.

## 9. Export und Quantisierung (Stand 2026-09-11)

**Export ist stackunabhängig.** `chesslab export --format onnx` liefert auf altem und neuem Stack
denselben Graphen — 216 Knoten, Opset 17, gleiche Op-Folge, Eingang `[64,3,80,80]` — und auf
gleicher Eingabe **bitgleiche Ausgaben**. Die Dateien unterscheiden sich in einem Byte, dem
`producer_version`-String. Exportiere trotzdem in eine **Kopie** des Laufs, nicht in den Lauf
hinein, solange du vergleichst.

**Quantisierung war kaputt und ist repariert** (`ebeb1d11`). `quant_pre_process` lief mit voller
symbolischer Formableitung und starb an zwei `Reshape`-Knoten, deren Zielform zur Laufzeit aus
`Shape`/`Slice`/`Concat` entsteht — einer davon in PyTorchs `nn.MultiheadAttention`, also nicht in
unserem Code. `auto_merge` und `guess_output_rank` helfen beide nicht, nur
`skip_symbolic_shape=True`, und das ist hier richtig: der Graph hat keine dynamischen Dimensionen,
die Charge ist auf 64 genagelt.

Ergebnis auf `p4a-v6-s42`: `model.qnn.onnx`, 0,5 MB, **argmax parity 1.000** auf 64
Kalibrierungs-Crops, auf beiden Stacks.

**Zwei offene Punkte, wenn du INT8 ausliefern willst:**

- `Quantized bias 'onnx::Conv_488' exceeds the range of a int32. The bias scale is too small.` —
  echte Genauigkeitsfrage an einer Faltung, ungemessen.
- Per-Kanal-Quantisierung auf den rangeins-Gewichten der LayerNorms (`Axis 1 is out-of-range …
  with rank 1`, vier Warnungen) — vermutlich folgenlos, ungeprüft.

**Die INT8-Modelle der beiden Stacks sind NICHT identisch**, obwohl der Float-Export es ist.
Plausibelster Grund: die Kalibrierungs-Vorverarbeitung laeuft ueber `torchvision` (0.24.1 gegen
0.28.0), andere Skalen, anderes INT8. Wer ein quantisiertes Modell vom neuen Stack ausliefert,
sollte das vorher gegen `scripts/score_onnx.py` messen.

**Praktisch drängt nichts davon:** `android/app/src/main/assets/cnn_model/` bündelt acht
Float-Modelle und kein einziges quantisiertes.
