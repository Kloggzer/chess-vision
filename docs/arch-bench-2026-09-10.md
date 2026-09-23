# Architektur-Benchmark: was ein Brett auf dem SM8650 kostet (2026-09-10)

Gemessen wurde **Rechenzeit je Brett**, nichts sonst — untrainierte Graphen, Zufallsgewichte,
Zufalls-Eingabe. Genauigkeit kommt in dieser Messung nirgends vor, und keine der Zahlen sagt etwas
darüber aus, ob eine Architektur die Figuren besser trifft.

- Gerät: Poco F7 Pro (`zorn`), SM8650, Android 16, am Netz, 99 %, 28–32 °C.
- Graphen: ein Export-Skript (geloescht 2026-09-23, Git-Historie), jeder Trunk als `boardattn:<trunk>` — dieselbe Hülle
  wie das ausgelieferte Modell, Eingang `(64, 3, 80, 80)`, Ausgang 14 (13 Klassen + Coverage).
- Lauf: `am start … --es only arch --ei rounds 60`, zwei Durchgänge, Median je Durchgang.
- Rohprotokolle: `data/tmp/arch-bench/logs/`.

## Der Anker

Das **ausgelieferte** `p4a-80-clahe` misst 11,56 / 11,93 ms, das untrainierte BoardNet P4 mit
Zufallsgewichten 11,85 / 12,52 ms. 2,5 % auseinander — Zufallsgewichte kosten dasselbe wie
trainierte, die ganze Messung steht damit auf dem Boden der Produktion.

## FP32 / XNNPACK, 4 Threads (der Pfad, der ausgeliefert wird)

| Arch | MMAC/Crop | Params | ONNX | ms/Brett (D1 / D2) | gegen P4 |
|---|---|---|---|---|---|
| p4a-80-clahe (ausgeliefert) | 2,4 | 0,36 M | 1,4 MB | 11,56 / 11,93 | 1,0x |
| BoardNet P4 | 2,4 | 0,36 M | 1,4 MB | 11,85 / 12,52 | 1,0x |
| BoardNet P4-wide | 3,4 | 0,42 M | 1,7 MB | 13,58 / 13,51 | 1,1x |
| MV4 Conv Small 1.0 | 27,4 | 2,9 M | 11,7 MB | 65,73 / 72,47 | 5,7x |
| MV4 Conv Medium | 121,6 | 8,9 M | 35,4 MB | 247,24 / 262,56 | 21x |
| RepViT M1.1 | 180,2 | 8,1 M | 21,0 MB | 569,08 / 595,99 | 49x |
| RepViT M1.5 | 305,9 | 14,0 M | 33,5 MB | 1008,58 / 1017,61 | 84x |

## Zweite Runde: die billigen Trunks und die MV4-Breiten

`cellnet_p8` rechnet den Stem 8x statt 4x herunter und ist damit **billiger als p4**, nicht teurer.

| Arch | MMAC/Crop | Params | ms/Brett @4T (D1 / D2) |
|---|---|---|---|
| BoardNet P8 | 1,0 | 0,35 M | 7,37 / 7,01 |
| BoardNet P8-wide | 1,7 | 0,42 M | 8,35 / 7,87 |
| p4a-80-clahe (ausgeliefert) | 2,4 | 0,36 M | 10,28 / 10,24 |
| BoardNet P4 | 2,4 | 0,36 M | 11,47 / 10,25 |
| MV4 Small 0.35 | 7,0 | 1,07 M | 27,37 / 25,50 |
| MV4 Small 0.50 | 9,6 | 1,41 M | 33,04 / 29,63 |
| MV4 Small 1.0 | 27,4 | 2,94 M | 67,93 / 68,27 |

## Threads sind der zweite Hebel, und er wirkt nur auf die grossen Graphen

Alle Werte 60 Runden, D1 / D2. `SessionTuning.THREADS` steht auf 4.

| Arch / EP | 4 Threads | 6 Threads | 8 Threads |
|---|---|---|---|
| p4a-80-clahe FP32 | 10,28 / 10,24 | 11,37 / 8,23 | — |
| BoardNet P8 FP32 | 7,37 / 7,01 | 9,68 / 6,62 | 10,37 / 6,42 |
| MV4 Small 0.50 FP32 | 33,04 / 29,63 | **15,54 / 13,89** | 22,08 / 21,40 |
| MV4 Small 1.0 FP32 | 67,93 / 68,27 | **37,97 / 36,10** | 34,85 / 40,39 |
| MV4 Small 1.0 INT8/CPU | 95,7 / 51,9 (20 R.) | **28,11 / 22,56** | 39,69 / 44,23 |
| MV4 Small 1.0 INT8/NNAPI | 622 / 630 (20 R.) | 329 / 348 | 350 / 357 |

- **6 ist die richtige Zahl, nicht 4 und nicht 8.** Der SM8650 hat sechs grosse Kerne
  (1×X4 + 5×A720); der Kommentar an `SessionTuning.THREADS` begruendet die 4 selbst mit „die
  grossen Kerne" und zaehlt dabei falsch. Bei 8 kommen die beiden A520 dazu und ziehen den Batch
  auf die langsamste Spur.
- **Fuer den ausgelieferten Graphen ist es egal.** 10,2 bei 4 gegen 11,4 / 8,2 bei 6 — die beiden
  Durchgaenge liegen um die 4-Thread-Zahl herum. Der Hebel greift erst ab MV4-Groesse.

## Dritte Runde: p8 bei 128 px

128 px ist die native Crop-Box des echten Exports (`board_size` 928, Zelle 116, `pad_side` 0,05
→ 127,6 px), dort wird nichts resampelt. Patch 8 laesst davon eine 16x16-Karte je Zelle uebrig.

**Cross-Run-Vergleiche sind hier wertlos** — derselbe ausgelieferte Graph misst 3,87 ms in einem
Lauf, der nur kleine Modelle enthaelt, und 11,48 ms im WIEDERHOLUNGSLAUF, dem nur ein
`mv4-small` beiliegt. Ein schwerer Graph verschiebt den Zustand des SoC fuer den ganzen Lauf.
Deshalb steht hier das **Verhaeltnis zum Anker im selben Lauf**, nicht die Millisekunde.

| Arch @ Groesse | MMAC/Crop | leicht (D1/D2) | mit mv4-small (D1/D2) | x Anker |
|---|---:|---|---|---:|
| BoardNet P8-wide @ 80 | 1,7 | 2,94 / 3,04 | 8,43 / 9,43 | 0,77 / 0,76 |
| BoardNet P8 @ 80 | 1,0 | 3,56 / 3,34 | 7,80 / 7,85 | 0,90 / 0,68 |
| p4a-80-clahe (Anker) | 2,4 | 3,87 / 3,86 | 11,48 / 11,56 | 1,00 |
| **BoardNet P8 @ 128** | **2,1** | **4,15 / 4,02** | **11,20 / 11,75** | **1,06 / 0,97** |
| BoardNet P8-wide @ 128 | 3,3 | 5,31 / 5,28 | 14,48 / 14,11 | 1,37 / 1,24 |
| BoardNet P4 @ 128 | 5,6 | 8,60 / 7,74 | 21,53 / 21,04 | 2,11 / 1,85 |
| MV4 Small 1.0 @ 80 | 27,4 | — | 71,65 / 72,63 | 6,2 |

- **P8 bei 128 px kostet so viel wie das ausgelieferte Modell bei 80** (Faktor 0,97–1,06) und
  sieht dabei 1,6x so viele Eingangspixel. Das ist der interessanteste Kandidat der ganzen Messung.
- **P8-wide ist bei 80 px schneller als P8**, obwohl es 1,6x rechnet: seine Kanalbreiten
  (32/64/96/160/192/256) sind SIMD-freundliche Vielfache, p8s (24/48/64/96/128/192) sind es nicht.
- Der Messaufbau selbst ist der Grund fuer die Streuung zwischen Laeufen: `archBench` faehrt jedes
  Modell am Stueck durch, statt die Modelle je Runde abzuwechseln. Wer Millisekunden ueber Laeufe
  hinweg vergleichen will, muss das erst umbauen.

## Vierte Runde: was die 128-px-Kandidaten kosten (2026-09-11)

Ein Lauf, 4 Threads, 60 Runden, beide Durchgaenge. Anker ist das ausgelieferte 80-px-Modell.

| Graph | MMAC/Crop | ms/Brett (D1 / D2) | x Anker |
|---|---:|---|---:|
| `p4a-80-clahe` (ausgeliefert, 80 px) | 2,4 | 4,27 / 4,90 | 1,0 |
| `boardattn:cellnet_p4` @ 128 | 5,6 | 7,96 / 7,49 | **1,7** |
| `boardattn:mnv4_conv_small_035` @ 128 | 15,8 | 17,73 / 18,00 | **3,9** |
| `boardattn:mnv4_conv_small_050` @ 128 | 21,5 | 22,31 / 23,93 | **5,0** |

Der Sprung von 80 auf 128 px kostet beim CellNet also **1,7x**, und er bringt gemessen +4,4 Punkte
(Abschnitt „Architektur-Training auf v6“ unten). MV4-035 bei derselben Auflaufloesung kostet **2,3x so viel
wie das CellNet** — die alten v4-128-Zahlen gaben ihm +0,0065 Vorsprung bei einem Seed, also
innerhalb der Streuung. Fuer 10 ms mehr je Brett muesste er deutlich mehr liefern.

## INT8, 20 Runden (weniger belastbar)

Quantisiert wurden nur `Conv`/`Gemm`/`MatMul`, vorzeichenlos je Tensor: XNNPACK baut den
`qu8`-Softmax des Aufmerksamkeitskopfs nicht, und der NNAPI-Provider lehnt signierte und
kanalweise Gewichte ab.

| Arch | INT8/CPU (D1 / D2) | INT8/NNAPI (D1 / D2) |
|---|---|---|
| BoardNet P4 | 9,02 / 8,46 | 149 / 186 |
| BoardNet P4-wide | 10,30 / 19,15 | 153 / 147 |
| MV4 Conv Small 1.0 | 95,74 / 51,85 | 622 / 630 |
| MV4 Conv Medium | 274 / 305 | 1935 / 1922 |
| RepViT M1.1 | 915 / 384 | Sitzung baut nicht |
| RepViT M1.5 | 647 / 647 | Sitzung baut nicht |

## Was daraus folgt

- **Es gibt in diesem Build keine NPU.** Das `onnxruntime-android-qnn`-AAR ist raus (gemessen 227
  gegen 97 ms, `gradle/libs.versions.toml`); der einzige verbleibende NPU-nahe Weg ist NNAPI, und
  der ist hier **15–17x langsamer als die CPU** und baut für RepViT gar keine Sitzung. Ein
  Vergleich „alle als INT8 auf derselben NPU" ist auf diesem Stapel nicht durchführbar.
- **INT8 kauft auf dem kleinen Modell fast nichts** (11,9 → 8,5 ms), weil BoardNet P4 mit 2,4
  MMAC/Crop ohnehin nicht rechengebunden ist.
- **Die Zeit skaliert mit MMAC/Crop, nicht mit der Eleganz der Architektur.** RepViT und MV4 sind
  für EIN 224er Bild entworfen; hier laufen sie 64x auf 80 px, und ihr Stem wirft dabei genau die
  Auflösung weg, die eine Figur ausmacht.
- **BoardNet P5 gibt es nicht.** `CELLNET_PRESETS` kennt `p4`, `p4w`, `p8`, `p8w`; als „größeres
  BoardNet" steht hier `p4w`, das 1,4x rechnet und 1,1x kostet.
- **MV4 Small 1.0 geht unter 50 ms** — aber nicht durch die Architektur, sondern durch Threads:
  6 statt 4 machen 68 zu 37 ms, INT8 auf der CPU 23–28 ms. Ob die Breite 1.0 den Typ-Gap schliesst,
  sagt keine dieser Zahlen.
- **`cellnet_p8` ist das billigste Gemessene** (7,0 ms, 1,0 MMAC/Crop) — und genau deshalb
  verdaechtig: Patch 8 laesst bei 80 px Eingang eine 10x10-Karte je Zelle uebrig, wo p4 20x20 hat.
  Wer p8 waehlt, kauft 30 % Zeit fuer eine Aufloesung, die diesem Projekt beim Figurentyp gerade
  fehlt. Das entscheidet ein Training, nicht dieser Benchmark.

## Messvorbehalt

Bei 20 Runden streuten die Mediane zwischen den Durchgängen bis 2x, in beide Richtungen, bei
gleicher Temperatur — das ist die Kernwahl des Schedulers, nicht Drosselung. Mit 60 Runden und
langem Aufwärmen liegen die Durchgänge innerhalb von 10 %. Die INT8-Tabelle stammt noch aus dem
20-Runden-Lauf und trägt diesen Vorbehalt.

## Architektur-Training auf v6: was gemessen wurde (2026-09-11)

> Kosten je Brett: oben.
> Diese Datei traegt die Genauigkeiten — das, was der Kostenbenchmark ausdruecklich NICHT beantwortet.

### Aufbau

- Datensaetze `real13-mix-v6-80` und `real13-mix-v6-128`, beide `split-pin.json`
  (Val `rg-2026-09-06-20-27-33`, volle Klassenabdeckung).
- Der 128er ist am 2026-09-11 als Zwilling des 80ers gebaut: `--like real13-mix-v6-80
  --pack-size 128x128`, alle drei Quell-Manifeste, 841 521 Crops, 41,4 GB Pack. Brett-Split
  identisch: 10 644 Trainings- und 389 Val-Bretter.
- Rezept je Arm gleich: 60 Epochen, Cosine, bs 256, lr 0,01, wd 0,01, Kopf `occlusion`,
  `--batch-aug --compile-batch-aug --compile-model --fused-adamw`, 2 Worker.
- Bewertet auf dem **Mittel der letzten 15 Epochen**, gepaart je Seed (`scripts/compare_arms.py`).

### Zwei Dinge mussten vorher repariert werden

**`nn.MultiheadAttention` ist auf torch 2.13.0+rocm10.0.0 kaputt.** Der Standard-SDPA-Kernel
vergiftet den HIP-Kontext; der NAECHSTE Kernelstart stirbt mit `hipErrorInvalidValue`. Weil der
Fehler asynchron kommt, tauchte er mal in Inductors Benchmarker auf, mal in
`multi_head_attention_forward`, mal in einem harmlosen `LayerNorm` danach — und sah dreimal nach
einem anderen Problem aus. Isoliert: `F.linear` OK, `F.scaled_dot_product_attention` OK,
`nn.MultiheadAttention` FAIL, dasselbe unter `SDPBackend.MATH` OK. `BoardAttentionHead.forward`
laeuft seitdem unter `sdpa_kernel([SDPBackend.MATH])`. **Ohne das war der gesamte
`boardattn:`-Zweig auf dem neuen Stack nicht trainierbar, die ausgelieferte Architektur
eingeschlossen.**

**Early Stopping macht den Vergleich kaputt.** Mit der Vorgabe `patience 7` stoppte `p4a-s42` bei
Epoche 14 — mitten im Cosine, bei hoher Lernrate, ohne Schwanz zum Mitteln, waehrend der
Referenzlauf 54 Epochen schaffte. Ausloeser ist das verrauschte Val-Signal selbst. Alle Arme
laufen deshalb mit `--patience 999` volle 60 Epochen.

### Was das Rangkriterium sein muss

`val_visible_piece_acc`. Die Brettmetrik ist ein Produkt ueber alle besetzten Felder und damit ein
Verstaerker: bei `p4a-s44` faellt `val_visible_occupied_board_acc` von 0,87 auf 0,53, waehrend
`val_visible_piece_acc` bei 0,944–0,959 stehen bleibt. `val_loss` streut ueber die Seeds um Faktor
vier (0,141 bis 0,615). Beide laufen als Beobachtung mit, entscheiden aber nichts.

Seed-Streuung der Basislinie bei 80 px: 0,9425 / 0,9587 / 0,9462 — **Spanne 0,016**, exakt das
`sd = 0,0157` der Uebergabe. Alles unter ~1,6 Punkten ist ohne Paarung nicht von Rauschen zu
trennen.

### Ergebnis 1: die Aufloesung ist der groesste Hebel

Dieselbe Basislinie, derselbe Seed, dasselbe Rezept, nur die Packgroesse anders:

| `boardattn:cellnet_p4`, s42 | `visible_piece_acc` | `occupied_board_acc` |
|---|---:|---:|
| @ 80 px | 0,9425 | 0,9724 |
| **@ 128 px** | **0,9860** | 0,9825 |

**+4,35 Punkte.** Zum Vergleich: der Brettkopf bringt korrigiert +1,4 bis +2,1
(Kandidatenliste vom 2026-09-10). Auf dem Geraet kostet das 1,85–2,11x, also rund 21 statt 10–12 ms.

### Ergebnis 2: die P8-Linie ist tot, und nicht wegen der Aufloesung

| `val_visible_piece_acc` | s42 | s43 | s44 | gepaart gegen p4a |
|---|---:|---:|---:|---:|
| `boardattn:cellnet_p4` @ 80 | 0,9425 | 0,9587 | 0,9462 | — |
| `boardattn:cellnet_p8` @ 80 | 0,8886 | 0,8588 | 0,8588 | **−0,0804** |
| `boardattn:cellnet_p4` @ 128 | 0,9860 | — | — | — |
| `boardattn:cellnet_p8` @ 128 | 0,8545 | — | — | **−0,1315** |

Bei 80 px drei Seeds, alle mit demselben Vorzeichen. Bei 128 px ein Seed, aber mit dem Achtfachen
der Streuung Abstand — und **P8 wird durch mehr Pixel schlechter** (0,8886 → 0,8545), waehrend die
Basislinie daran +4,4 gewinnt. Der Patchify-8-Stem wirft Information weg, die kein Eingangspixel
zurueckbringt. Die 30 % Zeitgewinn aus `arch-bench-2026-09-10.md` sind nicht zu haben.

Die beiden restlichen p8-Seeds bei 128 px wurden gestrichen: zwei weitere Laeufe fuer die
Bestaetigung einer 13-Punkte-Niederlage sind schlechter angelegt als die Kopffrage auf dem Trunk,
der gewinnt.

### MobileNetV4 laeuft auf diesem Stack nicht kompiliert

`boardattn:mobilenetv4_conv_small_035` @ 128 px stirbt **reproduzierbar nach Epoche 1**, zweimal
an derselben Stelle:

    AcceleratorError: CUDA error: unspecified launch failure  (hipErrorLaunchFailure)
    Exit 0xC0000409 (STATUS_STACK_BUFFER_OVERRUN)

Das ist weder der Rechnerabsturz vom selben Tag noch der MHA-Fehler oben (`hipErrorInvalidValue`),
sondern ein GPU-seitiger Kernel-Fehlstart. Der Aufmerksamkeitskopf ist unschuldig — er laeuft in
`p4a` und `p4c` 60 Epochen durch. Uebrig bleibt der MobileNetV4-Trunk unter `--compile-model`.
Ungetestet: derselbe Arm eager.

**Praktisch draengt es nicht.** Gemessen kostet MV4-035 bei 128 px 17,9 ms je Brett gegen 7,7 ms
des CellNet (`docs/arch-bench-2026-09-10.md`, vierte Runde), und die einzige Evidenz fuer ihn ist
ein Einzel-Seed-Vorsprung von +0,0065 auf `real13-mix-v4-128` — innerhalb der Streuung von 0,0157.

### Der Rechner stirbt am 128er Pack

Am 2026-09-11 um 08:48 hat der Rechner waehrend `p4a-s43` (Epoche 54 von 60) hart neu gestartet:
Kernel-Power 41 plus EventLog 6008, **kein Bugcheck, kein Minidump** — dieselbe Signatur wie am
09.09. und die, die `pc-crashes-are-memory-not-gpu` beschreibt. Ein Brettmodell braucht alle 64
Zellen je Brett, also wandern je Epoche 733 798 Crops (~36 GB) durch 31,8 GB RAM. Commit war nicht
erschoepft (20 von 79,8 GB), es war Seiten-Thrashing.

Die 54 Epochen gingen dabei nicht am Absturz verloren, sondern am Aufraeumen: `sweep_arch_v6.ps1`
loeschte unvollstaendige Laeufe beim Neustart. Seitdem legt es sie nach
`<lauf>.partial-<zeitstempel>` beiseite.

### Offen: der Kopf, auf dem gewinnenden Trunk

Laeuft: `boardattn:cellnet_p4` gegen `board:cellnet_p4` (Conv-Kopf) gegen `cellnet_p4` (kein
Kopf), bei 128 px, drei Seeds. Auf dem Geraet gemessen kostet der Attention-Kopf **1,4 ms**, der
Conv-Kopf **0,1 ms** — auf einem 21-ms-Modell ist das der Unterschied, um den es hier geht.
