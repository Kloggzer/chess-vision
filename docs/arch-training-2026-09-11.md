# Architektur-Training auf v6: was gemessen wurde (2026-09-11)

> Auftrag: `docs/arch-training-candidates.md`. Kosten je Brett: `docs/arch-bench-2026-09-10.md`.
> Diese Datei traegt die Genauigkeiten — das, was der Kostenbenchmark ausdruecklich NICHT beantwortet.

## Aufbau

- Datensaetze `real13-mix-v6-80` und `real13-mix-v6-128`, beide `split-pin.json`
  (Val `rg-2026-09-06-20-27-33`, volle Klassenabdeckung).
- Der 128er ist am 2026-09-11 als Zwilling des 80ers gebaut: `--like real13-mix-v6-80
  --pack-size 128x128`, alle drei Quell-Manifeste, 841 521 Crops, 41,4 GB Pack. Brett-Split
  identisch: 10 644 Trainings- und 389 Val-Bretter.
- Rezept je Arm gleich: 60 Epochen, Cosine, bs 256, lr 0,01, wd 0,01, Kopf `occlusion`,
  `--batch-aug --compile-batch-aug --compile-model --fused-adamw`, 2 Worker.
- Bewertet auf dem **Mittel der letzten 15 Epochen**, gepaart je Seed (`scripts/compare_arms.py`).

## Zwei Dinge mussten vorher repariert werden

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

## Was das Rangkriterium sein muss

`val_visible_piece_acc`. Die Brettmetrik ist ein Produkt ueber alle besetzten Felder und damit ein
Verstaerker: bei `p4a-s44` faellt `val_visible_occupied_board_acc` von 0,87 auf 0,53, waehrend
`val_visible_piece_acc` bei 0,944–0,959 stehen bleibt. `val_loss` streut ueber die Seeds um Faktor
vier (0,141 bis 0,615). Beide laufen als Beobachtung mit, entscheiden aber nichts.

Seed-Streuung der Basislinie bei 80 px: 0,9425 / 0,9587 / 0,9462 — **Spanne 0,016**, exakt das
`sd = 0,0157` der Uebergabe. Alles unter ~1,6 Punkten ist ohne Paarung nicht von Rauschen zu
trennen.

## Ergebnis 1: die Aufloesung ist der groesste Hebel

Dieselbe Basislinie, derselbe Seed, dasselbe Rezept, nur die Packgroesse anders:

| `boardattn:cellnet_p4`, s42 | `visible_piece_acc` | `occupied_board_acc` |
|---|---:|---:|
| @ 80 px | 0,9425 | 0,9724 |
| **@ 128 px** | **0,9860** | 0,9825 |

**+4,35 Punkte.** Zum Vergleich: der Brettkopf bringt korrigiert +1,4 bis +2,1
(`arch-training-candidates.md`). Auf dem Geraet kostet das 1,85–2,11x, also rund 21 statt 10–12 ms.

## Ergebnis 2: die P8-Linie ist tot, und nicht wegen der Aufloesung

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

## MobileNetV4 laeuft auf diesem Stack nicht kompiliert

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

## Der Rechner stirbt am 128er Pack

Am 2026-09-11 um 08:48 hat der Rechner waehrend `p4a-s43` (Epoche 54 von 60) hart neu gestartet:
Kernel-Power 41 plus EventLog 6008, **kein Bugcheck, kein Minidump** — dieselbe Signatur wie am
09.09. und die, die `pc-crashes-are-memory-not-gpu` beschreibt. Ein Brettmodell braucht alle 64
Zellen je Brett, also wandern je Epoche 733 798 Crops (~36 GB) durch 31,8 GB RAM. Commit war nicht
erschoepft (20 von 79,8 GB), es war Seiten-Thrashing.

Die 54 Epochen gingen dabei nicht am Absturz verloren, sondern am Aufraeumen: `sweep_arch_v6.ps1`
loeschte unvollstaendige Laeufe beim Neustart. Seitdem legt es sie nach
`<lauf>.partial-<zeitstempel>` beiseite.

## Offen: der Kopf, auf dem gewinnenden Trunk

Laeuft: `boardattn:cellnet_p4` gegen `board:cellnet_p4` (Conv-Kopf) gegen `cellnet_p4` (kein
Kopf), bei 128 px, drei Seeds. Auf dem Geraet gemessen kostet der Attention-Kopf **1,4 ms**, der
Conv-Kopf **0,1 ms** — auf einem 21-ms-Modell ist das der Unterschied, um den es hier geht.
