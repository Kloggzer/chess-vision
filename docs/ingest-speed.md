# Wie schnell der Composite-Ingest liest und schreibt

Gemessen 2026-08-23 auf `data/footage/turntable/VID_20260823_120426.mp4` (3840x2160, h264, 4219
Frames, 30 fps), Stride 8, 150 genutzte Frames je Lauf, RX 7900 XT. Anlass: ein Lauf ueber neun
Clips brauchte 7 min 15 s allein fuer den ersten, obwohl `composite_frame` nur 250 ms je Brett
kostet.

## Lesen

| Weg | ms je genutztem Frame |
|---|---|
| `cap.set(POS_FRAMES, i)` + `cap.read()` — der alte Code | 235 |
| sequenziell `cap.read()` ueber alles | 232 |
| **`cap.grab()` ueberspringen, `retrieve()` nur fuer den genutzten** | **39** |
| ffmpeg-Pipe, Software-Decode + `select` | 28 |
| ffmpeg-Pipe, `d3d11va`, Auswahl vor dem Download | 31 |
| ffmpeg-Pipe, `dxva2`, Auswahl vor dem Download | 67 |

Die Zeit steckte weder im Suchen (springen und sequenziell lesen sind gleich teuer) noch im Codec,
sondern in `retrieve`: jeder Frame wurde nach BGR umgerechnet, auch die sieben von acht, die der
Stride wegwirft. Bei 4K sind das 25 MB je Frame.

**Hardware-Decode hilft hier nicht.** Der Decoder auf der GPU ist schnell, aber jeder fertige Frame
muss zurueck in den Hauptspeicher, und dieser Rueckweg kostet mehr, als die vielen CPU-Kerne beim
Dekodieren einsparen. Der reine Decodier-Durchsatz sagt dasselbe: `-f null` erreicht in Software
9,36x Echtzeit, mit `d3d11va` 4,78x. Deshalb liest `composite.read_forward` mit OpenCV vorwaerts
und nicht ueber eine ffmpeg-Pipe — die 11 ms Unterschied verschwinden ohnehin hinter der Rechnung,
weil das Lesen in einem eigenen Thread laeuft.

## Schreiben

64 Crops (128x128 WebP, Qualitaet 95) auf die Platte:

| Threads | ms |
|---|---|
| seriell | 185 |
| 4 | 52 |
| **8** | **33** |
| 16 | 36 |

`cv2.imwrite` gibt das GIL frei, deshalb traegt ein Thread-Pool. Ueber 8 Threads hinaus bringt es
nichts mehr. Die Aufträge laufen mit vier Brettern Rueckstau (`build_from_video`): mehr puffern
hiesse, 60k Crops eines Clips im Speicher zu halten (~3 GB), weniger liesse die Rechnung warten.

## Die Kacheln

Der Profiler (20 Bretter, 4K, 273 ms je Brett) fand die Arbeit nicht dort, wo sie vermutet wurde:

| Posten | ms je Brett | Anteil |
|---|---|---|
| `imread` — die Occluder-Kachel von der Platte | 88 | 32 % |
| `over` — die Kachel ins Bild blenden | 60 | 22 % |
| `warpAffine` — Kachel drehen und skalieren | 22 | 8 % |
| `nonzero` — den Alpha-Kasten in `read_tile` suchen | 19 | 7 % |
| 64 Crops schneiden (`crops_for_frame`, zweimal) | 27 | 10 % |

Eine Kachel kostet 89 ms von der Platte — mehr als das Brett, auf das sie soll. Alle 1440 im
Speicher zu halten geht nicht: im Mittel 13 MB je Stueck, zusammen **18,7 GB**. Deshalb laedt
`tile_stream` sie im Voraus, waehrend das vorige Brett noch rechnet. Gemessen auf einem 4K-Clip
ueber 519 Bretter:

| Lader | ms je Brett |
|---|---|
| 1 | 130 |
| 4 | 120 |
| **8** | **117** |

Mehr Vorlauf hilft nicht: 12 Bretter statt 6 waren auf 4K gleichauf und auf 1080p 20 % langsamer —
die Lader nehmen der Rechnung dann Kerne weg. Die Auswahl zieht aus einem EIGENEN Zufallsstrang
(`seed + 1`), sonst wuerde das Vorausziehen die Posen verschieben, die `place` aus dem Hauptstrang
nimmt.

`over` blendet in uint8 durch OpenCV statt in float32 durch numpy: 16,6 ms je Kachel gegen 4,6.
Es rundet anders — gemessen ueber 12 Kacheln: hoechstens **1 Grauwert** Unterschied, im Mittel
0,024. Damit faellt auch das float32-Vollbild weg, das je Frame 31,6 MB belegte.

## Was danach der Boden ist

Je Brett auf 4K: 117 ms, davon der groesste Teil `place` + `over` + das Schneiden der 64 Crops.
Lesen (39 ms), Kachelladen (88 ms) und Schreiben (33 ms) laufen daneben und zaehlen nicht mehr mit.
Ein 4K-Clip mit 519 Brettern: 107 s vorher, 61 s jetzt.
