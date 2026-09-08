# Augmentierung batchen statt je Crop

**Stand 2026-09-07.** Gemessen auf `real13-mix-v4`, Rezept `p4a-80-clahe`, RX 7900 XT,
256 Crops je Schritt (= 4 Bretter).

## Der Befund

Die teuren Ops sind **overhead-gebunden, nicht rechen-gebunden**. Einzeln gemessen, je Crop:

| Op | µs/Crop | Bemerkung |
|---|---:|---|
| **GaussianBlur** (`RandomApply` p 0,3) | **270** | feuert in 30 % — wenn er feuert: **846 µs** |
| **ColorJitter** (drei Kanäle) | **171** | drei getrennte PIL-Durchgänge |
| RandomGamma | 74 | |
| ToTensor | 37 | ein voller Bilddurchgang zum Vergleich |
| RandomAffine (Jitter) | 30 | |

Der Blur ist **23× teurer als ein kompletter Bilddurchgang** — für eine 3×3-Faltung auf 19 200
Bytes. Bezahlt wird nicht die Rechnung, sondern PIL→Tensor→`conv2d`→PIL, 256-mal je Schritt.

## Was Batchen bringt

| | µs/Crop | ms/Schritt |
|---|---:|---:|
| CPU, volle Kette | 985 | 252,3 |
| CPU, ohne Photometrie/Cutout | 175 | 44,7 |
| **CPU, uint8-Ausgang (ohne ToTensor/Normalize)** | **76** | **19,5** |
| **GPU, alles gebatcht** | **14,0** | **3,57** |

Dazu schrumpft der Transfer zur GPU auf ein Viertel: **4,9 statt 19,7 MB je Schritt**, weil uint8
statt float32 über PCIe geht.

**Die Kette faellt von 985 auf 76 µs/Crop — 13× weniger CPU je Crop.** Die GPU zahlt dafür
3,57 ms auf eine Schrittzeit von 40,5 ms, also 9 %, während der Feed 233 ms je Schritt verliert.

## Was `--batch-aug` genau tut

Der Loader baut ColorJitter, Gamma, Blur und Erase **gar nicht erst** (ihre Stärken stehen auf 0,
und seit 2026-09-07 lässt `build_transform` eine Op mit Stärke 0 weg statt sie leer mitlaufen zu
lassen). Auf dem Gerät läuft dann je Batch:

1. Normalisierung zurückrechnen → `[0,1]`
2. ColorJitter (Helligkeit, Kontrast, Sättigung; Reihenfolge gewürfelt)
3. Gamma
4. Blur — 3×3-Gauß mit **eigenem Sigma je Bild**, als gruppierte Faltung, ein Aufruf für den Batch
5. Cutout
6. wieder normalisieren

**Je Bild eine eigene Ziehung, nicht je Batch.** Sonst wäre es eine andere Augmentierung als die,
die es ersetzt — `test_each_crop_draws_its_own_factor` hält das fest.

**Die Reihenfolge ist Absicht:** Cutout läuft NACH der Photometrie, weil es mit 0 füllt — dem
neutralen Wert im `[0,1]`-Raum. Liefe es davor, färbte der Kontrast die gelöschte Fläche und der
Blur schmierte sie aus. Deshalb wandert es mit auf die GPU statt im Loader zu bleiben.

## Was es NICHT ist

**Nicht bitgleich.** Dieselben Verteilungen, aber float statt PILs uint8 mit Rundung und Klemmung,
und `grid_sample`-Arithmetik statt PIL. Statistisch dasselbe Rezept, numerisch ein anderes — ein
A/B gegen `p4a-80-clahe` misst also nicht nur das Batchen.

Auch die **Reihenfolge gegenüber der Geometrie** kippt: vorher Photometrie → Affine → Flip, jetzt
Affine → Flip → Photometrie. Auf per-Pixel-Operationen ist das folgenlos, beim Blur nicht ganz
(erst weichzeichnen, dann verschieben ist nicht dasselbe wie umgekehrt).

**`--crop-norm` ist ausgeschlossen:** die Normalisierung je Crop ist nicht umkehrbar, die
Photometrie käme auf den falschen Werten an. `train` bricht dann ab.

## Was das für die Worker heißt

Der eigentliche Gewinn ist nicht Wanduhrzeit — die GPU ist mit 158 µs/Crop ohnehin der Boden —,
sondern **wie viele Prozesse man dafür laufen lassen muss**. Gemessen mit der schlanken Kette:

| Seiten | 1 Worker | 2 | 3 | 8 |
|---|---:|---:|---:|---:|
| warm | 208 µs | 197 | 212 | 224 |
| kalt (zufällig über 11,7 GB) | 488 µs | 363 | 294 | 376 |

Warm skaliert es **linear** — die 0,74 × Contention von vorher kamen von der Photometrie, nicht
vom Lesen. Kalt kostet ein Worker 280 µs reines Warten auf die Platte, und mehr Worker *verkürzen*
seine Zeit, weil sie die Latenz überlappen statt schneller zu rechnen.

Mit dem uint8-Ausgang (76 µs/Crop) reicht bei warmem Cache **ein** Worker, kalt zwei bis drei.
Statt acht. Das ist die Ressource, die zählt: `--num-workers` ist die Stellschraube, an der die
Speicher-Abstürze hingen, und zwei parallele Läufe brauchen dann 2–6 statt 16 Prozesse.

## Wo der nächste Hebel läge

Im Loader bleiben 76 µs/Crop: Memmap-Lesen ~7, `Image.fromarray` 14, Affine 30, hflip 25. Affine
und hflip sind geometrisch und über `grid_sample` genauso batchbar — dann verschwindet PIL ganz
und der Loader liest nur noch uint8 aus der Memmap.

Das kauft aber keine Wanduhrzeit mehr: der Feed liegt bereits weit unter dem GPU-Boden. Es kauft
nur noch Worker, und ab einem sind keine mehr zu sparen. Der nächste echte Engpass ist die
**I/O-Latenz bei kaltem Cache** — dagegen hilft kein Batchen, sondern dass der 11,7-GB-Pack in den
34 GB RAM warm bleibt (also: nicht zwei Packs gleichzeitig, und kein `retime` daneben).
