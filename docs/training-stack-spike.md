# Training-Stack-Spike: PyTorch 2.13 / ROCm 10 / Triton (2026-09-10)

Der gepinnte Stack (`torch 2.9.1+rocm7.2.1`) kann `torch.compile` nicht: kein Triton, und die
isolierte Triton-Probe starb im AMD-Compiler (Abschnitt "Isolated Triton probe" unten).
AMD liefert inzwischen einen passenden Windows-Stack. Er ist in `tmp/compile-spike/.venv`
installiert, **`.venv` wurde nicht angefasst**, `pyproject.toml` ist unveraendert.

## Aufbau

```
uv venv tmp/compile-spike/.venv --python .venv/Scripts/python.exe
uv pip install --python tmp/compile-spike/.venv/Scripts/python.exe \
    --index https://stable.repo.amd.com/rocm/whl-next/ \
    'torch[device-gfx1100]==2.13.0+rocm10.0.0' torchvision \
    'rocm[devel,libraries,device-gfx1100]==10.0.0' 'triton-windows>=3.7,<3.8' \
    numpy pillow pyyaml python-chess opencv-python psutil typer simplejpeg pyturbojpeg
```

Die Kernel liegen im neuen Paketformat **separat**: `torch` allein installiert
`amd-torch-device-*` nicht, und ohne das stirbt jeder Kernel-Start mit `hipErrorInvalidImage`.
Das `[device-gfx1100]`-Extra ist der Unterschied. Voll aufgeloest:
`tmp/compile-spike/requirements-resolved.txt`.

Triton waehlt sonst `clang` als Host-Compiler, dem die Windows-Header fehlen; `CC` muss auf das
mitgelieferte `triton/runtime/tcc/tcc.exe` zeigen. `scripts/spike_training_stack.ps1` setzt das
und die Cache-Pfade und stellt die Umgebung danach zurueck — den Spike immer darueber starten.

## MIOpens BatchNorm ist weiter kaputt

Derselbe Fehler wie auf dem alten Stack: `MIOpenBatchNormFwdTrainSpatial.cpp` findet
`<type_traits>` nicht, HIPRTC bricht ab, `miopenStatusUnknownError`. Auf allen vier echten
Trainingsformen (256 Crops, C32/H80 bis C192/H10) gemessen. `PrimitiveBatchNorm2d` und seine
Kopplung an `torch.version.hip` bleiben also richtig — und sie sind der Grund, warum
`torch.compile` hier so viel holt: Inductor giesst die von Hand abgeleitete Arithmetik wieder in
einzelne Kernel.

## Was schneller ist

Isolierter Vorwaerts-/Rueckwaertsschritt, 240 Schritte, 256 Crops, `p4a-v6-s42`, drei
Wiederholungen (`scripts/spike_training_stack.ps1 -Mode profile`):

| | alt 2.9.1 | neu 2.13 eager | neu 2.13 kompiliert |
|---|---:|---:|---:|
| fwd+bwd | 28,7 / 28,8 ms | 15,3 / 15,5 / 16,3 ms | 8,98 / 9,17 / 9,03 ms |
| ganzer Schritt (`synchronized`) | 37,3 ms | 24,6–27,0 ms | — |

GPU-residenter Durchsatz, `benchmark_training_feed.py --gpu --channels-last`, gleicher Tag,
gleiche Argumente: **6 994 → 9 807 (eager) → 16 497 Crops/s (kompiliert)**, also 2,36x.

## Was davon im Training ankommt — wenig

Zwei Epochen, `--epoch-frac 0.05 --batch-aug --channels-last --num-workers 2`, Seed 42,
warme Epoche (`scripts/spike_training_stack.ps1 -Mode train [-CompileModel]`,
`tmp/compile-spike/train-*/metrics.jsonl`):

| | `t_train_s` | `t_val_s` | erste Epoche |
|---|---:|---:|---:|
| alt | 4,85 | 6,01 | 52,0 s |
| neu eager | 2,86 | 5,73 | 29,8 s |
| neu kompiliert | 2,58 / 2,68 | 6,89 / 6,99 | 88,0 s |

Der Stackwechsel bringt die Trainingsepoche also von 4,85 auf 2,86 s (**1,70x**). `torch.compile`
legt darauf nur noch ~9 % drauf, macht die **Validierung um 20 % langsamer** (eigener Graph fuer
den Eval-Zweig) und kostet einmalig ~60 s Kompilierzeit. Die 2,36x vom residenten Benchmark
erreichen die Schleife nicht.

Ohne `--batch-aug` kippt das Bild ganz: dann haengt alles am CPU-Feed, und der ist auf dem neuen
Stack ~10 % langsamer (Summe der Transform-Stufen 720 → 789 µs/Crop, vor allem ColorJitter und
Blur). Ende zu Ende mit 6 Workern: 5 912 (alt) gegen 5 398 (neu eager) und 5 689 Crops/s
(neu kompiliert), Wartezeit auf Daten 0,91 → 4,17 → 6,06 s. Der Gewinn haengt also daran, dass
`--batch-aug` den Loader leer haelt.

## Was NICHT gezeigt ist

Der neue Stack rechnet **nicht dasselbe**. Gegen dieselben Eingabetensoren (`baseline.pt`, vom
alten Stack geschrieben) und dieselben Gewichte: Ausgaben bis 5,9e-2, Gradienten bis 2,9e-4,
BatchNorm-Puffer bis 2,3e-4, Loss bis 5,7e-7 auseinander. Reproduzierbar ueber Laeufe hinweg.
`torch.compile` weicht innerhalb des neuen Stacks noch einmal ab (Ausgabe 2,5e-2).

Die Smoke-Laeufe sind zwei bzw. drei Epochen auf 5 % der Ziehungen — ihre `visible_piece_acc`
(0,617 alt / 0,536 neu / 0,647 kompiliert) ist Rauschen und **kein Qualitaetsvergleich**. Ein
Wechsel des Stacks ist ein Wechsel der Domaene fuer jeden Lauf, der danach mit frueheren
verglichen werden soll; das braucht drei Seeds und den Median
([`seed-variance-exceeds-the-effects`](../CLAUDE.md)).

## Der volle Rezept-Lauf, Seed 42 (2026-09-10)

`p4a-v6-s42`s Rezept Feld fuer Feld (60 Epochen, `--epoch-frac 0.35`, `--split split-pin.json`,
`--weight-cap 3`, `--no-pretrained`, `--patience 60`), beide Stacks, `scripts/stack_ab_runs.ps1`:

| | Epoche | `t_data_s` | gesamt | bester `val_visible_piece_acc` | letzte 10 Epochen |
|---|---:|---:|---:|---:|---|
| alt, CPU-Aug | 30,3 s | 0,49 | 32,5 min | 0,9622 @26 | 0,9460 (0,9331–0,9534) |
| neu, CPU-Aug | 23,5 s | 0,69 | 26,1 min | 0,9574 @34 | 0,9490 (0,9438–0,9555) |
| neu, `--batch-aug` | 21,2 s | 0,29 | 24,8 min | 0,9725 @20 | 0,9271 (0,9145–0,9457) |

`train_loss` weicht ueber die 60 Epochen im Median um **0,0021** ab — die Stacks lernen dieselbe
Kurve. Ein Seed traegt das noch nicht; die Streuung eines Seed-Wechsels ist groesser als dieser
Abstand.

**Ein finished run wedgte im Teardown** — nach der letzten geschriebenen Zeile lief er noch
Minuten mit einem Kern weiter. Dieselbe ROCm-Blockade, gegen die `matte` schon mit `os._exit`
arbeitet; `cli.py` verlaesst den Trainingsprozess jetzt genauso und gibt den Lock von Hand zurueck
(atexit laeuft dabei nicht). Ein Sweep darf nicht am Exit-Code haengen, sondern an den Epochen
auf der Platte.

## Warum die GPU bei 40 % steht: 2 611 Aufrufe je Schritt

Der `Utilization Percentage`-Zaehler misst richtig (43 41 42 41 42 … Mittel 39,9 %), und der Feed
ist nicht schuld: die Epoche faehrt 9 689 Crops/s, der residente Benchmark 9 807. Es ist das
Modell.

`torch.profiler` beantwortet das hier NICHT: ROCm-Windows liefert ihm keine Geraete-Aktivitaet,
der Chrome-Trace traegt nur CPU-Zeilen, und die "Self CUDA"-Spalte ist Zuschreibung —
`aten::result_type`, eine reine Metadaten-Operation, bekam darin 36 ms. Stattdessen waechst
`scripts/profile_training_kernels.py` die Batch-Groesse: mehr Arbeit je Kernel bei gleicher
Kernel-Zahl.

| Bretter | Crops | ms/Schritt | Crops/s |
|---:|---:|---:|---:|
| 1 | 64 | 14,04 | 4 559 |
| 2 | 128 | 15,25 | 8 391 |
| 4 | 256 | 20,07 | 12 754 |
| 8 | 512 | 32,74 | 15 637 |
| 16 | 1024 | 46,17 | 22 178 |

Die Arbeit verdoppelt sich von 1 auf 2 Bretter, die Schrittzeit steigt um 8,6 %. Die Gerade:
**11,9 ms feste Kosten je Schritt + 33,5 µs je Crop** (Vorhersage fuer 256 Crops 20,5 ms, gemessen
20,07). Bei der Trainings-Batchgroesse sind also 59 % des Schritts Startaufwand — 2 611
aten-Aufrufe zu 4,6 µs. Die Liste ist Metadaten und Kopien (`empty_strided` 211x, `to` 186x,
`as_strided` 177x, `copy_` 160x, `mul` 149x); die 11 `PrimitiveBatchNorm2d` stecken mittendrin,
jede ersetzt einen fusionierten Kernel durch Cast, `var_mean`, `rsqrt` und drei Broadcasts.

`torch.compile` ist der Gegenbeweis: 2 611 → **860** Aufrufe, feste Kosten 11,9 → **5,3 ms**, und
die Rechnung je Crop bleibt stehen (33,5 → 32,0 µs). Die GPU langweilt sich, weil sie wartet.

Verworfen und der Vollstaendigkeit halber notiert: die 127 `.item()` je Schritt aus AdamW sehen
nach Synchronisation aus, sind aber CPU-Lesezugriffe — PyTorch hostet `step` bewusst auf der CPU,
solange `fused`/`capturable` aus sind (`torch/optim/adam.py`).

## Was der Engpass aus den Schaltern macht

Mit `--batch-aug` faellt `t_data_s` auf 0,26 s, und damit kippt die Bewertung von
`--compile-model`: im CPU-Aug-Lauf brachte es 9 %, hier 1,27x. Sechs Epochen je Zeile:

| | `t_train_s` | Prozess-Privatspeicher |
|---|---:|---:|
| 8 Worker | 20,24 s | 7,88 GB |
| 2 Worker | 20,12 s | 5,01 GB |
| 2 Worker + `--compile-model` | **15,83 s** | — |
| 4 Worker + `--compile-model` | 15,91 s | — |

**Acht Worker kaufen mit Batch-Aug nichts** und kosten 2,9 GB. Vom Ruecklauf des freien Speichers
(16,8 GB) sind 7,9 GB Privatspeicher, der Rest ist der 16,2-GB-Pack im Dateicache — verdraengbar,
kein Verbrauch.

Die Kette am selben Rezept: 30,3 s (alt, CPU-Aug, 8 Worker) → 23,5 (neuer Stack) → 20,1
(`--batch-aug`) → **15,8 s** (`--compile-model`, 2 Worker). **1,92x** bei 2,9 GB weniger.

## Der Startaufwand, Variante fuer Variante (2026-09-10)

`scripts/profile_training_kernels.py --variants`, residente Eingabe, 256 Crops, 40 Schritte. Der
Paritaetsvergleich prueft Ausgabe und Gradienten, also die MODELL-Mathematik — die
Parameter-Aktualisierung des fusionierten AdamW weicht davon unabhaengig um ~2,4e-7 ab.

| Variante | ms/Schritt | Crops/s | aten/Schritt | Modell-Mathematik |
|---|---:|---:|---:|---|
| eager | 20,76 | 12 329 | 2 611 | — |
| fused AdamW | 11,85 | 21 603 | 2 214 | **bitgleich** |
| `torch.compile` | 11,76 | 21 765 | 860 | weicht ab (2,5e-2) |
| + `mode="reduce-overhead"` | 10,27 | 24 920 | 611 | weicht ab |
| `torch.compile` + fused | **8,61** | **29 747** | 463 | weicht ab |

**Es gibt doch eine Synchronisation je Schritt, und sie ist teuer.** Nicht in AdamW — dessen 127
`.item()` lesen CPU-Tensoren — sondern in `GradScaler._maybe_opt_step`:
`sum(v.item() for v in found_inf_per_device.values())` liest einen CUDA-Tensor und leert damit die
Warteschlange, bevor der naechste Schritt gefuellt werden kann. Mit `fused=True` setzt
`GradScaler.step` `optimizer.grad_scale`/`found_inf` als Geraete-Tensoren und ruft `step()` direkt,
also ganz an `_maybe_opt_step` vorbei (`torch/amp/grad_scaler.py:371` gegen `:443-469`). Die
frueher hier notierte Aussage "keine Synchronisation, rein startgebunden" war deshalb unvollstaendig.

**Auf dem gepinnten Stack lohnt es kaum**: 30,75 → 27,51 ms (1,12x) statt 1,75x. Dort ist die
GPU-Arbeit selbst der Engpass; erst wenn sie halbiert ist, wird die Synchronisation sichtbar.

## Und was davon in der Schleife ankommt

Sechs Epochen, neuer Stack, `--batch-aug --num-workers 2`:

| | `t_train_s` | resident |
|---|---:|---:|
| ohne Schalter | 20,12 s | 20,76 ms |
| `--fused-adamw` | 18,77 s | 11,85 ms |
| `--compile-model` | 15,83 s | 11,76 ms |
| beide | **15,70 s** | 8,61 ms |

Die residenten Faktoren uebertragen sich NICHT: fused holt isoliert 1,75x und in der Schleife
1,07x, und auf `--compile-model` legt es nichts mehr drauf. Der Grund steht in derselben Zeile —
die Epoche laeuft mit 16,9 ms je Schritt, der Modellschritt kostet aber nur 8,6. Die restlichen
~8 ms sind die Augmentierung auf dem Geraet, der Host-Kopiervorgang und der Vorablade-Stream, und
davon ist NICHTS kompiliert. **Der naechste Hebel ist `BatchGeometry`/die Photometrie, nicht mehr
das Modell.**

## Speicher: der Pack liegt im Arbeitsspeicher, so ist er gemeint

Waehrend eines Laufs mit zwei Workern gemessen: **privat 5,03 GB, WorkingSet 21,71 GB.** Die
Differenz von 16,7 GB ist der dateibasierte 16,2-GB-Pack, dessen Seiten im WorkingSet der
Prozesse liegen — `\Memory\Cache Bytes` meldet dafuer 0,00 GB, weil zugeordnete Dateiseiten dort
nicht gezaehlt werden. Das ist kein Verbrauch: die Seiten sind verdraengbar und genau der Zweck
des Packs (`pack.py` — eine Million Dateioeffnungen werden zu Slice-Zugriffen). Was wirklich
kostet, ist der Privatspeicher, und der haengt an der Worker-Zahl: 7,88 GB bei acht, 5,01 bei
zwei, bei gleicher Geschwindigkeit.

## Empfehlung

Der Stackwechsel ist die Sache wert, und `--compile-model` ist es AUCH — aber nur zusammen mit
`--batch-aug`, sonst misst man die CPU. `--fused-adamw` lohnt daneben nicht mehr; es steht als
Schalter da, weil es die einzige Beschleunigung ist, die die Modell-Mathematik bitgleich laesst.
`--num-workers 2` statt 8 ist gratis: gleiche Zeit, 2,9 GB weniger.

Was fuer eine Migration von `pyproject.toml` noch fehlt: die Seeds 43 und 44 auf beiden Stacks
(Paar 42 steht), und fuer den Batch-Aug-Kandidaten drei Seeds gegen denselben Val.
Das Seed-Skript dazu ist 2026-09-23 geloescht; Seed 42 steht (0,9521 @50, letzte zehn Epochen
0,9388).

## Export und Quantisierung auf dem neuen Stack (2026-09-11)

`chesslab export --format onnx` laeuft dort und liefert **dasselbe Modell**. Gegen `p4a-v6-s42`,
beide Exporte in Kopien statt in den Lauf hinein:

| | alt (2.9.1) | neu (2.13.0) |
|---|---|---|
| Knoten | 216 | 216 |
| Opset | 17 | 17 |
| Op-Folge | \<gleich\> | \<gleich\> |
| Eingang | `[64,3,80,80]` | `[64,3,80,80]` |
| Ausgabe auf gleicher Eingabe | **bitgleich, max \|diff\| = 0,0** | |

Die Dateien unterscheiden sich in **einem Byte**: dem `producer_version`-String. `doctor --gpu`
bleibt gruen, weil die Pruefung auf `"+rocm" in torch.__version__` sieht und `torch.version.hip`
gesetzt ist; `model.py`s `_BN_KERNEL_OK` verhaelt sich unveraendert.

`chesslab quantize` **scheitert auf BEIDEN Staecken identisch** — `symbolic_shape_infer.py:1677
_infer_Reshape`, `assert is_literal(shape_rank)`, bei gleichem `onnx 1.22.0` und verschiedenem
`onnxruntime` (1.27.0 gegen 1.30.0). Das ist ein bestehender Defekt am dynamischen `Reshape` der
Brett-Huelle (`evaluate.py:401`, `boardnet.py:97`), **kein Migrationsschaden**.

### Was eine Migration noch braucht

- Der gepinnte Marker in `pyproject.toml:24-29` trifft Python 3.12/win32 **auch im Spike-Env**:
  ein `uv sync` gegen die unveraenderte Datei ersetzt torch 2.13 wieder durch die 2.9.1-Wheels.
- Im Spike-Env fehlt `chesslab` selbst (kein dist-info) — alles laeuft ueber `PYTHONPATH=src`.
- Ebenfalls nicht dort: `transformers`, `open3d`, `pymeshlab`, `trimesh`. Keines davon liegt auf
  dem Export- oder Quantisierungspfad (`transformers` haengt an `matte.py`, SAM-3).
- Der Stack-A/B hat weiter n = 1 (Seed 42), `scripts/stack_ab_runs.ps1` holt 43 und 44 nach.
- `torch.onnx.export(..., dynamo=False)` in `evaluate.py:418` ist auf 2.13 der Legacy-Pfad und
  warnt; er funktioniert und liefert das oben verglichene Ergebnis. `dynamic_axes` gilt nur dort
  — produktiv ist es bewusst nicht gesetzt.

## Training loader and metrics (2026-09-10)

CPU augmentation remains unchanged. `--epoch-frac` still controls sampler draws.
The training loader defaults to its existing worker count; validation now uses
`--eval-workers 2`, independently. Both use `--prefetch-factor 2` (formerly 4).
For example, add `--num-workers 10 --eval-workers 2 --prefetch-factor 2` to an
existing recipe to allocate more processes to training while retaining fewer
processes overall than the former 8+8 configuration. Measure throughput before
increasing further; this is not a measured optimum.

`t_data_s` measures wall time waiting for the training iterator, including its
first batch. It is part of `t_train_s`, not an additional duration. Use it to
check whether more workers actually improve data delivery.

### Metrics schema 2

Occlusion runs retain losses, visible piece accuracy, visible occupancy accuracy,
visible board accuracy, visible occupancy board accuracy, coverage MAE and
precision/recall, confidence on errors and confidence AUROC, learning rate and
timing. Unmasked identity/board metrics and redundant aggregates are omitted.
Full standalone evaluation remains available. Historical JSONL files are unchanged.
Board validation loss now counts crops in both numerator and denominator; old
board losses were inflated by 64. Do not compare old and new loss values directly.

`best.pt` selects the actual epoch with highest visible piece accuracy, with
visible occupancy and confidence AUROC as tie breakers. `best_piece.pt` retains
the first epoch reaching that accuracy. Early stopping follows this ordering,
without averaging scores across different checkpoints. Resume state is written
after checkpoint selection and patience updates.

New runs require a fresh output directory. `--continue` requires a compatible
checkpoint policy; old state files cannot be continued under the new policy.
Use a new output directory for the changed recipe. Existing artifacts are never
rewritten to migrate their metrics or checkpoint scores.

These changes address memory use, reporting and checkpoint selection. They do
not establish that BatchNorm causes the observed validation fluctuations, nor
do they change normalization or promise a higher accuracy ceiling.

### Throughput measurements

On the packed `real13-mix-v6-80` training boards, warm-cache feed throughput was:

| workers | old CPU path | optimized CPU path | worker private memory |
|---:|---:|---:|---:|
| 4 | 6,239 | 6,941 crops/s | 2.4 GiB |
| 8 | 9,202 | 10,578 crops/s | 4.6 GiB |
| 12 | 11,179 | 13,094 crops/s | 6.9 GiB |

The fast path keeps torchvision's operation order, values and random-number
consumption. It removes temporary CPU tensors and repeated normalization
constants; tests compare pixel/tensor output and both RNG states.

An isolated GPU step processed about 8,450 crops/s, with a per-step `loss.item()`
synchronization still present in the benchmark. This is a baseline for that
implementation, not a hardware compute ceiling. With eight workers and
overlapped host-to-device copies the measured pipeline reached about 7,819
crops/s, with only 0.035 s of data wait over the measured window. This means
the loader was no longer the dominant limit in this warm-cache measurement;
the benefit of twelve workers for the full training loop is not established. The training loop now
prefetches the next pinned batch on a separate CUDA stream and accumulates the
loss on-device, removing a per-batch synchronization from the hot path.

### GPU layout experiment

On RX 7900 XT, PyTorch 2.9.1 / ROCm 7.2.1, `boardattn:cellnet_p4`,
80-pixel inputs and 256 crops per step, the optional `--channels-last` flag
improved a warm, 120-step end-to-end benchmark from 7,900 crops/s (8 workers)
to 8,205 (8 workers) or 8,256 (6 workers). Six workers used about 3.4 GiB
private memory versus 4.6 GiB with eight. These short measurements exclude
validation, startup and checkpoint writing; they are not full-epoch forecasts.
The resident-input benchmark improved from 8,553 to 9,030 crops/s.

The flag changes tensor storage, preserving the CPU augmentation recipe.
For the saved p4a-v6-s42 model, 12 comparisons (1–4 boards, three seeds each)
produced exactly equal outputs, losses, parameter gradients and BatchNorm
buffers. This validates the measured model and stack, not every architecture.
The default remains off. Try `--channels-last --num-workers 6` with this recipe.

GPU event measurements placed forward/loss near 4.4 ms, backward near 20 ms,
and optimizer/scaler near 1.2 ms. Native BatchNorm was faster but changed
outputs/gradients; it was not adopted. Graph replay and convolution autotuning
did not improve the isolated forward/backward test. Fused AdamW changed
parameters slightly and saved too little total step time to adopt here.
Reproduce the isolated comparisons with `scripts/profile_training_gpu.py
--experiments`; use `scripts/benchmark_training_feed.py --gpu --channels-last`
for the complete feed comparison.

### Isolated Triton probe

`triton-windows==3.5.1.post24` was installed with `uv pip --target` into
`tmp/triton-probe`; the pinned training environment was not modified. With
`PYTHONPATH` pointing there, `CC` pointing to its bundled
`triton/runtime/tcc/tcc.exe`, and `ROCM_HOME` pointing to the existing
`.venv/Lib/site-packages/_rocm_sdk_devel`, Triton detected HIP/gfx1100.
A compiled elementwise smoke test passed with exactly equal output.

The actual model probe (`scripts/profile_training_gpu.py --compile-test`)
failed in Triton's AMD compilation pass with `PassManager::run failed`.
There is consequently no measured compiled-model speedup or quality result on
this stack. A newer matched stack (PyTorch 2.13 / ROCm 10 / Triton 3.7) does
compile the model; it is installed beside this one and measured in
`docs/training-stack-spike.md`. Nothing on the pinned stack changed.

## Betrieb auf `.venv` nach der Migration (2026-09-11, aus der Trainings-Uebergabe)

`pyproject.toml` ist seit `cf4cba1b` auf torch 2.13.0+rocm10.0.0 / triton-windows 3.7 migriert;
`tmp/compile-spike/` wird nicht mehr gebraucht. Vor der Migration geprueft: volle Suite gruen,
Export bitgleich, `quantize` argmax parity 1.000.

- **`CC` setzen** fuer die Compiler-Schalter: Triton waehlt sonst `clang` ohne Windows-Header.
  Auf `.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe` zeigen.
- **Je Arm eigene `TORCHINDUCTOR_CACHE_DIR` / `TRITON_CACHE_DIR`** — ein geteilter Cache faerbt
  die Zeitmessung des naechsten Arms.
- **`--compile-model` mit `boardattn:`** starb an `nn.MultiheadAttention` (HIP-Kontext vergiftet);
  behoben in `BoardAttentionHead.forward` ueber `sdpa_kernel([SDPBackend.MATH])`.
- **`--patience 999` gehoert ins Rezept** — die Vorgabe 7 stoppte einen Lauf bei Epoche 14 von 60.
- **PowerShell 5.1 + `$ErrorActionPreference='Stop'` + `2>&1 |`** macht Torchs erste
  stderr-Warnung zum Abbruch. Um den nativen Aufruf auf `Continue` setzen, `$LASTEXITCODE` pruefen.
- Gemessen je Epoche auf `real13-mix-v6-80`: beide Compiler 17,80 s, **+ `--fused-adamw` 11,46 s**,
  + CUDA-Graphs statt fused 12,57 s, beide 10,04 s. `--compile-mode reduce-overhead` ist nicht
  empfohlen (Ausgabepuffer werden ueberschrieben, keine Seed-Validierung).
- **INT8**, falls je ausgeliefert: `quant_pre_process` braucht `skip_symbolic_shape=True`
  (`ebeb1d11`); offen sind ein int32-Bias-Ueberlauf an `onnx::Conv_488` und die INT8-Modelle
  beider Stacks sind trotz bitgleichem Float-Export nicht identisch (Kalibrier-Vorverarbeitung
  ueber torchvision). Ausgeliefert werden heute nur Float-Modelle.

## Stand 2026-09-23

Der Spike-Stack ist seit `cf4cba1b` (2026-09-11) die Hauptumgebung: `pyproject.toml` pinnt torch
2.13 / ROCm 10 aus AMDs whl-next-Index plus `triton-windows`. "Der gepinnte Stack kann
`torch.compile` nicht" oben gilt nur fuer den alten 2.9.1-Stack. `--batch-aug`,
`--compile-batch-aug`, `--compile-model` und `--fused-adamw` bleiben trotzdem per Vorgabe AUS:
`--fused-adamw` verschiebt die Parameter um ~2e-7 und die Compiler runden anders, eine stille
Umstellung machte neue Laeufe mit dem Archiv unvergleichbar.
