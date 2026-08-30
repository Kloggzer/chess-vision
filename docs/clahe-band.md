# CLAHE im Band — lokaler Kontrast nur dort, wo es Struktur gibt

> Gemessen 2026-08-29/30 auf `real13-mix-v4`, vier Arme zu 60 Epochen, gleiches Rezept, gleicher
> Seed, gleicher Split. Code: `training/torch_data.py:_Clahe` (Training),
> `core-geometry/CropClahe.kt` (Serving), `CropClaheParityTest` (die Brücke dazwischen).

## Das Ergebnis

| Arm | best | Gipfel | letzte 10 | val-Fehler | val-Genauigkeit | test-Fehler |
|---|---:|---:|---:|---:|---:|---:|
| ohne CLAHE | 0,9328 | Ep 29 | 0,9053 | 939 | 0,9718 | 810 |
| CLAHE auf allem | 0,9315 | Ep 34 | 0,9087 | 958 | 0,9712 | **1 269** |
| **CLAHE 25–40** | **0,9499** | **Ep 48** | **0,9265** | **705** | **0,9788** | **603** |
| CLAHE → median | 0,9430 | Ep 40 | 0,9197 | 797 | 0,9760 | 636 |

**Pauschal angewandt schadet CLAHE** — auf dem zurückgehaltenen Test-Satz 1 269 Fehler gegen 810.
Erst das Fenster macht daraus einen Gewinn: 25 % weniger Fehler auf val, 26 % auf test.

Nebenbei gipfelt der Band-Arm bei Epoche 48 statt 29 und verliert dadurch viel weniger zum Ende
hin (letzte zehn Epochen: 0,9265 gegen 0,9053).

## Warum ein Band und keine Schwelle

Nach Helligkeit aufgeschlüsselt (val, nur besetzte sichtbare Zellen):

| Band | ohne CLAHE | CLAHE 25–40 |
|---|---:|---:|
| sehr dunkel (< 25) | 0,7807 | **0,7455** |
| dunkel (25–40) | 0,8716 | **0,9511** |
| mittel (40–100) | 0,9597 | 0,9739 |
| hell (≥ 100) | 0,9624 | 0,9768 |

Unter 25 ist CLAHE **schlechter**: dort gibt es keine Struktur zu strecken, nur Sensorrauschen zu
verstärken. Zwischen 25 und 40 sind es **+8,0 Punkte**.

Nur auf den behandelten Zellen gerechnet — 5 175 von 33 254 sichtbaren, also 15,6 %:

| | alle behandelten | nur besetzte |
|---|---:|---:|
| CLAHE 25–40 | 0,9803 | **0,9509** |
| ohne CLAHE | 0,9505 | **0,8742** |

**+7,7 Punkte**, gemessen genau dort, wo behandelt wird.

## Was es sichtbar macht

`data/reports/clahe-zeigt.png`: dunkle Zellen mit einem schwarzen Läufer, im Rohbild eine
Silhouette. Nach CLAHE tritt die **Kerbe der Mitra** hervor — genau das Merkmal, das Läufer von
Bauer trennt, und `bB->bP` war in jedem Arm die häufigste Verwechslung.

## Die 18 „Phantome" sind keine

Der Band-Arm hat auf test 18 Phantome gegen 1 bei der Kontrolle. Nachgesehen
(`data/reports/clahe-phantome.png`): **17 davon sind dasselbe Feld** (h6, dieselbe Session,
aufeinanderfolgende Frames), und auf g6 steht eine schwarze Dame, die durch die 5 % Randzugabe in
den h6-Crop ragt. Das Label ist richtig, die Figur ist wirklich im Bild, das Modell benennt sie
korrekt — auf dem Nachbarfeld. **CLAHE hat auf keinem der 18 gefeuert** (mean 105 bzw. 64, beide
ausserhalb des Fensters): es sind exakt dieselben Pixel wie bei der Kontrolle.

## Am Gerät

Am 2026-08-30 auf einer vom Nutzer aufgebauten Stellung im dunklen Büro, dasselbe Brett, dasselbe
Licht, nur das Modell gewechselt: `p4a-80` liest 8 der 12 abweichenden Felder richtig,
`p4a-80-clahe` **11 von 12** — und alle bei 100 % statt bei 48/72/81 %. Repariert wurden a5
(Bauer → König), b8 (leer → Springer) und d8 (leer → **Dame**, vorher bei 100 % Konfidenz
übersehen). Alle drei sind dunkle Felder.

## Die offene Kopplung

Das Fenster ist auf den **Zellmittelwert in 8 bit** definiert, und der hängt an der Belichtung. Bei
+1,7 EV — dem Wert, den `BoardExposureGovernor` selbst wählt (`docs/board-exposure.md`) — fallen
64 % der besetzten Zellen aus dem Fenster. Ein absolutes Graufenster ist die falsche
Parametrisierung, sobald die Belichtung geregelt wird; es gehört an ein Perzentil oder an den
Kontrast der Zelle. Siehe `TODO.md`.
