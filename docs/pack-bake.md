# Den festen Teil der Kette in die Memmap backen

**Stand 2026-09-07.** Gemessen auf `real13-mix-v4` (610 993 Crops, 80×80), Rezept
`p4a-80-clahe`, ein Kern.

## Was überhaupt backbar ist

`build_transform` (`training/torch_data.py`) legt die Kette in dieser Reihenfolge:

| Stufe | µs/Crop | Anteil | fest? |
|---|---:|---:|---|
| memmap → `np.array` | 6,5 | 0,5 % | — |
| `Image.fromarray` | 14,4 | 1 % | — |
| `Resize(80,80)` | 7,4 | 0,5 % | **ja** (auf Packgröße ein No-op) |
| **CLAHE** | **102,3** | **7 %** | **ja** |
| `ColorJitter` | 376,2 | 27 % | nein |
| `RandomGamma` | 141,2 | 10 % | nein |
| `GaussianBlur` (p 0,3) | 396,1 | 28 % | nein |
| `RandomAffine` | 29,7 | 2 % | nein |
| `RandomHorizontalFlip` | 25,3 | 2 % | nein |
| `ToTensor` | 76,2 | 5 % | nein |
| `RandomErasing` | 86,2 | 6 % | nein |
| `Normalize` | 140,3 | 10 % | nein |
| **Summe** | **1402** | | |

Nur `Resize` und CLAHE stehen VOR dem ersten Würfel und sind je Crop deterministisch. Alles
darunter zieht je Epoche eine neue Zufallszahl — es einzubacken hieße, dem Modell 60 Epochen lang
dieselbe Verzerrung zu zeigen, also die Augmentation abzuschaffen.

**Die Größe ist die Bedingung.** CLAHE läuft NACH dem Resize, damit die Kacheln immer
`out_size / tile` groß sind. Der gebackene Pack ist deshalb nur dann derselbe Operator, wenn er
schon in der Trainingsgröße liegt — `real13-mix-v4` ist es (80×80), ein Resize davor machte daraus
ein anderes CLAHE. `pack_bake.skip_baked` bricht ab, statt das still zu tun.

## Was es bringt

Trainings-Kette 1402 → 1300 µs/Crop, also **7 %** weniger Loader-CPU. Die Val-Kette gewinnt mehr:
ohne CLAHE greift wieder der Zero-PIL-Schnellpfad (`_EvalRgbTransform`), 279 → 174 µs, **38 %**.

Ob das in Wanduhr-Zeit ankommt, hängt daran, ob der Loader der Engpass ist. `p4a80-clahe2-s42`
brauchte **198 s je Epoche fürs Training** bei ~428 000 Trainings-Crops: 600 s Loader-CPU, auf 8
Workern ≈ 75 s — unter den 198 s, der Lauf ist also GPU-gebunden. Der Gewinn ist damit die obere
Schranke von ~6 s je Epoche, über vier Folds à 60 Epochen **höchstens ~25 min**.

**Der große Posten ist die Augmentation**, nicht CLAHE: `ColorJitter` und `GaussianBlur` sind
zusammen 772 µs, 55 % der Kette. Wer wirklich Zeit will, greift dort an — als Batch-Operation auf
der GPU, oder indem der Blur seine 30 % Trefferquote billiger einlöst. Das ist ein Rezeptwechsel
und gehört gemessen, nicht nebenbei gemacht.

## Wie es benutzt wird

```
chesslab dataset bake real13-mix-v4 real13-mix-v4-clahe --model data/models/p4a-80-clahe
```

Der neue Datensatz trägt dieselben Zeilen, dieselbe `split.json` und dieselben `split-f*.json` —
sonst vergleicht ein Lauf auf ihm nichts mehr mit einem Lauf auf dem Original.

Das Training braucht **kein Flag**: `train` liest `packed_meta.json["baked"]` und lässt CLAHE aus
dem Loader. Es schreibt die Werte trotzdem in `config.json`, denn **das Serving sieht rohe
Kamerabilder und muss den Operator selbst rechnen** — ein Lauf mit `clahe_clip: 0` in der Config
würde auf dem Gerät ohne CLAHE inferieren und wäre ein anderes Modell als das trainierte.

`skip_baked` bricht ab statt still zu rechnen, wenn:

- der Pack gebacken ist und der Lauf ohne CLAHE trainieren will (die Pixel tragen ihn trotzdem),
- die CLAHE-Werte des Packs nicht denen des Laufs entsprechen,
- `--input-size` nicht der Packgröße entspricht.

## CLAHE auf der GPU nachzubauen lohnt nicht (gemessen 2026-09-07, Modul geloescht 2026-09-15)

`training/clahe_gpu.py` war ein Nachbau von `cv::CLAHE` als Batch-Operation. Er traf cv2 auf
**einer** Graustufe im Kern und auf **80 von 256** im ganzen Operator: bei `clipLimit` 2,0 kippt
ein Rundungsfehler die LUT der Kachel. Das Geraet rechnet ohnehin `Imgproc.createCLAHE`, und
gebacken wird im Pack — es gab nie einen Aufrufer. Das Modul ist geloescht; wer es wieder
anfangen will, faengt bei dieser Messung an.
