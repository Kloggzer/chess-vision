# Trainingsgeschwindigkeit — das Rezept, das gilt, und was eine Architektur kostet

Hardware: RX 7900 XT, 31,8 GB RAM. Stack seit `cf4cba1b` (2026-09-11): torch 2.13.0+rocm10.0.0 /
triton-windows 3.7 aus AMDs whl-next-Index (`pyproject.toml`). Der alte Stack (2.9.1+rocm7.2.1)
hatte kein Triton und konnte `torch.compile` nicht.

## 1. Das Rezept

`--batch-aug --compile-batch-aug --compile-model --fused-adamw`, `--num-workers 2`
(`BATCH_AUG_WORKERS`), `--patience 999`.

- **Alle vier Schalter bleiben per Vorgabe AUS.** `--fused-adamw` verschiebt die Parameter um
  ~2,4e-7, die Compiler runden anders (Modellausgabe bis 2,5e-2), `--batch-aug` ist float statt
  PILs uint8. Eine stille Umstellung machte neue Laeufe mit dem Archiv unvergleichbar.
- **Die Kette am selben Rezept** (s je Epoche): 30,3 (alter Stack, CPU-Aug, 8 Worker) → 23,5
  (neuer Stack) → 20,1 (`--batch-aug`) → 15,8 (`--compile-model`, 2 Worker). Auf
  `real13-mix-v6-80` gemessen: beide Compiler 17,80 s, **+ `--fused-adamw` 11,46 s**.
- **`--patience 999` gehoert ins Rezept** — die Vorgabe 7 stoppte einen Lauf bei Epoche 14 von 60,
  mitten im Cosine, ohne Schwanz zum Mitteln.
- `--compile-mode reduce-overhead` ist nicht empfohlen: Ausgabepuffer werden ueberschrieben, keine
  Seed-Validierung.
- **Qualitaet: kein messbarer Unterschied**, drei Seeds, drei Arme (eager / nur Augmentierung /
  beide Compiler), `val_visible_piece_acc` ueber die letzten zehn Epochen. Bester gepaarter Abstand
  t = −1,90 bei df = 2; einzig `aug − eager` war 3/3 negativ (Vorzeichentest p = 0,25, also nichts).
  Nach zwei Seeds sah eine Rangfolge sauber aus, Seed 44 kippte sie.

### Betrieb

- **`CC` setzen** auf `.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe` — Triton waehlt sonst
  `clang` ohne Windows-Header.
- **Je Arm eigene `TORCHINDUCTOR_CACHE_DIR` / `TRITON_CACHE_DIR`**, ein geteilter Cache faerbt die
  Zeitmessung des naechsten Arms.
- **`nn.MultiheadAttention` vergiftet auf 2.13 den HIP-Kontext** (der NAECHSTE Kernelstart stirbt
  mit `hipErrorInvalidValue`, asynchron, sieht jedes Mal nach etwas anderem aus).
  `BoardAttentionHead.forward` laeuft deshalb unter `sdpa_kernel([SDPBackend.MATH])`; ohne das war
  der ganze `boardattn:`-Zweig nicht trainierbar.
- **MobileNetV4 unter `--compile-model` stirbt reproduzierbar nach Epoche 1**
  (`hipErrorLaunchFailure`, Exit `0xC0000409`). Eager ungetestet.
- **PowerShell 5.1 + `$ErrorActionPreference='Stop'` + `2>&1 |`** macht Torchs erste
  stderr-Warnung zum Abbruch. Um den nativen Aufruf auf `Continue` setzen, `$LASTEXITCODE` pruefen.
- **Ein fertiger Lauf blockierte im Teardown** (ROCm-Windows, wie `matte`): `cli.py` verlaesst den
  Prozess mit `os._exit` und gibt den Lock von Hand zurueck. Ein Sweep haengt an den Epochen auf
  der Platte, nicht am Exit-Code.
- **Zeiten nur auf ruhigem Rechner**, zwei warme Wiederholungen je Arm, Aufwaermepochen verwerfen:
  derselbe Arm mass 13,17 / 15,71 / 19,54 s, der Lauf-zu-Lauf-Abstand war 0,8 s bei einem Effekt
  von 1,1 s.

## 2. `--batch-aug` — Augmentierung als EINE Batch-Operation (2026-09-07)

Die teuren Ops sind **overhead-gebunden, nicht rechengebunden**: der 3x3-Blur kostet je Crop
846 µs, wenn er feuert, ToTensor fuer einen vollen Bilddurchgang 37. Bezahlt wird
PIL→Tensor→`conv2d`→PIL, 256-mal je Schritt.

| | µs/Crop |
|---|---:|
| CPU, volle Kette | 985 |
| CPU, uint8-Ausgang (Loader mit `--batch-aug`) | **76** |
| GPU, alles gebatcht | 14,0 |

Dazu geht uint8 statt float32 ueber PCIe: **4,9 statt 19,7 MB je Schritt**.

**Was auf dem Geraet laeuft**, je Batch: Normalisierung zurueck → ColorJitter (Reihenfolge
gewuerfelt) → Gamma → Blur (eigenes Sigma je Bild, gruppierte Faltung) → Cutout → `BatchGeometry`
(Affine, Flips) → wieder normalisieren.

- **Je Bild eine eigene Ziehung**, nicht je Batch (`test_each_crop_draws_its_own_factor`).
- **Cutout nach der Photometrie**, weil es mit 0 fuellt — dem neutralen Wert im `[0,1]`-Raum.
  Davor faerbte der Kontrast die Flaeche und der Blur schmierte sie aus.
- **Geometrie hinter der Photometrie** (seit 2026-09-08). Blieb sie im Loader, kippte die
  Reihenfolge von `build_transform`; beim Blur ist das nicht folgenlos. Die gebatchte Affine ist
  bitgleich zu `torchvision`s NEAREST-Affine (`test_the_batched_affine_is_torchvisions_affine`).
- **Nicht bitgleich**: dieselben Verteilungen, aber float statt uint8 mit Rundung und Klemmung —
  statistisch dasselbe Rezept, numerisch ein anderes.
- **`--crop-norm` ist ausgeschlossen** (die Normalisierung je Crop ist nicht umkehrbar), ebenso jede
  `--input-repr` ausser `rgb`. `train` bricht ab.
- **Eine Op mit Staerke 0 ist nicht weg.** `T.ColorJitter(0,0,0)` zieht weiter Zufallszahlen und
  wendet die Identitaet an; `--aug-scale 0` holte deshalb nur 25 % statt 73 %. `build_transform`
  laesst sie seitdem weg.

### Worker und Speicher

- Mit dem uint8-Ausgang reicht warm **ein** Worker, kalt zwei bis drei — statt acht. Kalt kostet
  ein Worker ~280 µs reines Warten auf die Platte; mehr Worker ueberlappen die Latenz.
- **Acht Worker kaufen mit `--batch-aug` nichts**: 20,24 gegen 20,12 s je Epoche, aber 7,88 gegen
  5,01 GB Privatspeicher. Worker sind die Stellschraube, an der die Speicher-Abstuerze hingen.
- **Der Pack im WorkingSet ist kein Verbrauch.** Bei zwei Workern privat 5,03 GB, WorkingSet
  21,71 GB — die Differenz ist der dateibasierte Pack, verdraengbar und genau sein Zweck.
- **Seit den Session-Packs ist der Boden die Platte (2026-09-12).** Auf `real13-mix-v7-128`
  (48,1 GB Packs bei 13 GB freiem Cache) wartet der Schritt zu 68–77 % auf Daten, bei 80 px zu
  55 %. 2 gegen 4 Worker: warm 10,7 gegen 10,6 s je Epoche, dieselbe Wartezeit.
- **Die Worker-Zahl ist kein freier Schalter**: der Trainingsverlust war nicht bitgleich (0,733245
  gegen 0,741672). `scripts/worker_probe.py` faehrt die Probe, auf ruhigem Rechner.

### Kompilierte Augmentierung (`--compile-batch-aug`)

- Behaelt die eager-Zufallsziehungen (`fallback_random=True`); Tritons eigene RNG aenderte den
  Strom und lieferte bei gleichem Seed deutlich andere Bilder. Beide RNG-Zustaende gleich,
  Ausgabe weicht bis 8,83e-6 ab.
- Statische Shapes (symbolische verlangten einen fehlenden Host-C++-Compiler), Recompile-Limit
  voruebergehend 32 fuer vier Brett-Batchgroessen x sechs Jitter-Reihenfolgen.
- Isoliert 3,9 → 0,92 ms je Batch, in der Schleife aber nur 1,06x allein, 16 % auf
  `--compile-model` — die Augmentierung ist 3 ms eines 20-ms-Schritts, sie wiegt erst schwer, wenn
  der Modellschritt faellt.

## 3. Warum `torch.compile` hier so viel holt: der Schritt ist startgebunden

**MIOpens BatchNorm ist kaputt** (`MIOpenBatchNormFwdTrainSpatial.cpp` findet `<type_traits>`
nicht, HIPRTC bricht ab, `miopenStatusUnknownError`) — auf beiden Stacks. `PrimitiveBatchNorm2d`
und seine Kopplung an `torch.version.hip` bleiben also richtig; jede ersetzt einen fusionierten
Kernel durch Cast, `var_mean`, `rsqrt` und drei Broadcasts. Inductor giesst das wieder zusammen.

- Eager 2 611 aten-Aufrufe je Schritt, kompiliert 860. Die Gerade ueber die Batchgroesse ergab
  11,9 ms fest + 33,5 µs je Crop eager, kompiliert 5,3 ms fest bei unveraenderter Rechnung je Crop:
  bei 256 Crops ist der Schritt zu **59 % Startaufwand**. **Die Ziffern sind nicht gesichert** —
  `profile_training_kernels` mass in fester Reihenfolge ohne Wiederholung; die Nachrechnung steht
  in `docs/offene-entscheidungen.md`. Startgebunden bleibt der Schritt.
- Der GPU-Auslastungszaehler (~40 % eager) folgt dem Arbeitsanteil und ist **keine
  Effizienzzahl**. `torch.profiler` hilft auf ROCm-Windows nicht: keine Geraete-Aktivitaet, die
  "Self CUDA"-Spalte ist Zuschreibung.
- **`--fused-adamw` entfernt eine echte Synchronisation je Schritt**: `GradScaler._maybe_opt_step`
  liest `found_inf.item()` von einem Geraete-Tensor. Mit `fused=True` reicht `GradScaler.step`
  `grad_scale`/`found_inf` als Geraete-Tensoren durch und geht daran vorbei. Die 127 `.item()` aus
  AdamW sind dagegen CPU-Lesezugriffe. Die Modell-Mathematik bleibt bitgleich.
- **Was fused bringt, haengt am Engpass**: isoliert 1,75x, in der Schleife mit ungekompilierter
  Augmentierung 1,07x, mit beiden Compilern 17,80 → 11,46 s (1,55x). Auf dem alten Stack 1,12x.

| resident, 256 Crops | ms/Schritt | aten/Schritt |
|---|---:|---:|
| eager | 20,76 | 2 611 |
| fused AdamW | 11,85 | 2 214 |
| `torch.compile` | 11,76 | 860 |
| `torch.compile` + fused | 8,61 | 463 |

- **`--channels-last`**: auf `p4a-v6-s42` bitgleich (12 Vergleiche), 7 900 → 8 205 Crops/s,
  Vorgabe aus.

## 4. Export und INT8 auf dem Stack

- `chesslab export --format onnx` liefert auf 2.13 **dasselbe Modell** wie auf 2.9.1: 216 Knoten,
  Opset 17, Ausgabe bitgleich; die Dateien unterscheiden sich im `producer_version`-String.
- **INT8**, falls je ausgeliefert: `quant_pre_process` braucht `skip_symbolic_shape=True`
  (`ebeb1d11`); offen sind ein int32-Bias-Ueberlauf an `onnx::Conv_488`, und die INT8-Modelle
  beider Stacks sind trotz bitgleichem Float-Export nicht identisch. Ausgeliefert werden nur
  Float-Modelle.

## 5. Was eine Architektur auf dem Geraet kostet (SM8650, 2026-09-10/11)

Poco F7 Pro, XNNPACK FP32, `boardattn:<trunk>`, Eingang `(64, 3, 80, 80)`, 60 Runden. Nur
Rechenzeit — untrainierte Graphen kosten dasselbe wie trainierte (2,5 % auseinander).

| Trunk | MMAC/Crop | ms/Brett @4 Threads |
|---|---:|---:|
| BoardNet P8 | 1,0 | 7,0–7,4 |
| BoardNet P4 (ausgeliefert, `p4a-80-clahe`) | 2,4 | 10–12 |
| BoardNet P4-wide | 3,4 | 13,5 |
| MV4 Conv Small 0.35 / 0.50 / 1.0 | 7,0 / 9,6 / 27,4 | 25–27 / 30–33 / 66–72 |
| MV4 Conv Medium | 121,6 | 247–263 |
| RepViT M1.1 / M1.5 | 180 / 306 | 569–596 / 1009–1018 |

- **Die Zeit skaliert mit MMAC/Crop**, nicht mit der Eleganz der Architektur. RepViT und MV4 sind
  fuer EIN 224er Bild entworfen; hier laufen sie 64x auf 80 px.
- **Millisekunden sind ueber Laeufe nicht vergleichbar**: derselbe Graph mass 3,87 ms in einem
  Lauf mit kleinen Modellen und 11,48 ms neben einem `mv4-small` (`archBench` faehrt jedes Modell
  am Stueck). Es zaehlt das **Verhaeltnis zum Anker im selben Lauf**.
- **128 px kostet** (x ausgeliefertes 80-px-Modell): `cellnet_p4` 1,7x (5,6 MMAC), `mv4_035` 3,9x,
  `mv4_050` 5,0x, `cellnet_p8` ~1,0x.
- **Threads**: 6 statt 4 halbiert MV4 Small (68 → 37 ms), weil der SM8650 sechs grosse Kerne hat;
  bei 8 ziehen die A520 den Batch herunter. Fuer den ausgelieferten Graphen egal
  (`SessionTuning.THREADS` = 4).
- **INT8 kauft auf dem kleinen Modell fast nichts** (11,9 → 8,5 ms). Eine NPU gibt es nicht: das
  QNN-AAR ist raus (227 gegen 97 ms), NNAPI ist 15–17x langsamer als die CPU.
- Messvorbehalt: bei 20 Runden streuen Mediane zwischen Durchgaengen bis 2x, bei 60 Runden mit
  Aufwaermen innerhalb 10 %.

### Was die Kosten auf v6 kaufen (2026-09-11)

60 Epochen, `split-pin.json`, bewertet auf dem Mittel der letzten 15 Epochen, gepaart je Seed.

- **Aufloesung ist der groesste Hebel**: `boardattn:cellnet_p4` @ 80 px 0,9425, @ 128 px
  **0,9860** (s42), +4,35 Punkte fuer 1,7–2,1x Geraetezeit. Bestaetigt ueber sechs Seeds in der
  Abnahme (`docs/evaluation.md`).
- **Die P8-Linie ist tot**: gepaart −0,0804 bei 80 px (3 Seeds, gleiches Vorzeichen), −0,1315 bei
  128 px — und P8 wird durch mehr Pixel **schlechter** (0,8886 → 0,8545). Der Patchify-8-Stem
  wirft Information weg, die kein Eingangspixel zurueckbringt.
- **MV4-035 @ 128** kostet 2,3x das CellNet; die einzige Evidenz fuer ihn ist ein Einzel-Seed-
  Vorsprung von +0,0065, innerhalb der Streuung.
- Kopf auf dem Geraet: Attention-Kopf **1,4 ms**, Conv-Kopf **0,1 ms**.
- **Der 128er Pack bringt den Rechner zum Absturz** (Kernel-Power 41, kein Bugcheck): ein
  Brettmodell zieht je Epoche ~36 GB Crops durch 31,8 GB RAM, Seiten-Thrashing.
  `sweep_arch_v6.ps1` legt unvollstaendige Laeufe seitdem als `<lauf>.partial-<ts>` beiseite
  statt sie zu loeschen.
