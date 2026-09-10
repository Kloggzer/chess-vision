# Trainingskandidaten aus dem Kostenbenchmark (2026-09-10)

Der Benchmark (`docs/arch-bench-2026-09-10.md`) sagt nur, was etwas KOSTET. Ob eine Architektur
die Figuren besser trifft, sagt nur ein Training. Diese Liste hält fest, welche Arme das wert
sind, in welcher Reihenfolge, und was vorher stimmen muss.

## Blockierend: erst der Val-Satz, dann irgendein Vergleich

`2026-09-06-21-29-35` trägt **null weisse Springer**, 12 schwarze Damen und 73 % `empty`.
`macro_recall` — und über ihn `score`, das Checkpoint-Kriterium — ist damit auf vier von 13
Klassen Rauschen. Jeder Lauf-Vergleich darunter ist unbelastbar, egal wie sauber er sonst ist
(`docs/val-choice-2026-09-10.md`).

Empfehlung aus dem Doc: `2026-09-06-20-27-33`, notfalls zusammen mit `20-57-45` (709 Bretter,
≥ 117 je Klasse) — mit dem dort genannten Vorbehalt, dass beide vom selben Aufnahmetag stammen
und ein Val aus einem Tag einen Aufbau misst, nicht die Bandbreite.

**Ohne diesen Schritt keine Kandidaten starten.**

## Die Basislinie muss mitlaufen

`p4a-80-clahe` ist die Messlatte, aber seine gemeldeten Zahlen stammen von einem anderen
Datensatz und einem anderen Val. Das Rezept muss auf demselben Datensatz und demselben Val neu
laufen, sonst gibt es nichts, wogegen verglichen wird.

## Kandidaten, nach Kosten geordnet

Alle als `boardattn:<trunk>`, Kopf `occlusion`, 13 Klassen + Coverage. Der Faktor ist das im
selben Lauf gemessene Verhältnis zum ausgelieferten Modell.

| # | Arm | Größe | MMAC/Crop | x Anker | Was die Frage ist |
|---|---|---:|---:|---:|---|
| A | `cellnet_p8` | 128 | 2,1 | **1,0** | Schlägt Auflösung den gröberen Stem? Gleicher Preis, 1,6x Pixel. |
| B | `cellnet_p8` | 80 | 1,0 | 0,7–0,9 | Was kostet Patch 8 an Genauigkeit bei heutiger Größe? |
| C | `cellnet_p8w` | 128 | 3,3 | 1,2–1,4 | Nächste Sprosse, falls A knapp scheitert. Breitere Kanäle, gleicher Stride. |
| D | `cellnet_p4` | 128 | 5,6 | 1,9–2,1 | Kontrolle: einfach mehr Pixel. Trennt „Auflösung fehlt" von „Kapazität fehlt". |
| E | `mobilenetv4_conv_small_050` | 80 | 9,6 | ~3 | Schlägt ein echtes Mobile-Backbone das handgeschriebene CellNet überhaupt? |
| F | `mobilenetv4_conv_small` | 80 | 27,4 | 6,2 | Nur wenn E etwas gewinnt. Braucht 6 Threads oder INT8, um unter 50 ms zu bleiben. |

**Nicht auf der Liste, auf Messung verworfen:** MV4 Conv Medium (21x), RepViT M1.1 (49x),
RepViT M1.5 (84x). Eine Sekunde je Brett ist keine Option, und keine dieser Zahlen hängt an einer
Stellschraube, die man noch drehen könnte.

## Reihenfolge

1. **Sieb, ein Seed je Arm:** A, B, D. Das ist die eigentliche Frage — Auflösung gegen Stride
   gegen Kapazität, innerhalb einer Familie, deren Kosten alle im Budget liegen.
2. **Bestätigung, drei Seeds, Median:** Basislinie + die zwei besten aus Schritt 1. Ein
   Seed-Wechsel bewegt die Metrik um mehr als die erwarteten Effekte — ein Einzellauf entscheidet
   hier nichts.
3. **Nur bei Bedarf:** C, wenn A knapp verliert; E, wenn die ganze BoardNet-Familie festhängt.

18 Läufe für alles wäre Verschwendung; Schritt 1 sind drei.

## Was für alle Arme gleich sein muss

- **Ein Datensatz, ein Val, eine Augmentierung.** Quervergleiche über
  `chesslab eval --dataset <gemeinsamer>`, bewertet auf `val_visible_piece_acc` — Arme mit
  verschieden geschnittenem Val sind auf `piece_acc` nicht vergleichbar.
- **Für die 128er Arme braucht es einen 128er Pack** (`dataset build --pack-size 128x128`), aus
  der Quelle geschnitten, nicht aus dem 128er Pool hochskaliert. Nach jedem Re-Slice neu packen.
- **FixRes:** die Auflösung, die ausgeliefert werden soll, muss in `--scales` trainiert sein.
- **CLAHE in den Pack backen** (`dataset bake`), nicht in den Loader.
- **Nur gemattete Sessions** für den Occlusion-Kopf — ungemattete Crops kommen als
  `coverage = 0.0` durch und lehren den Kopf, dass es keine Hände gibt.
- `--batch-aug`, `--num-workers 2`.

## Was der Benchmark NICHT beantwortet

Ob Patch 8 die Figurentypen noch auseinanderhält. Bei 80 px lässt er eine 10x10-Karte je Zelle
übrig, wo p4 20x20 hat; bei 128 px sind es 16x16. Genau an dieser Auflösung hängt der Typ-Gap,
und deshalb ist Arm A und nicht Arm B der Kandidat, auf den es ankommt.
