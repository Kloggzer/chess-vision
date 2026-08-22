# Hand-Gate — SAM 3 auf den eigenen Aufbau destilliert

Der billige Zeuge vor der Auswahl: liegt eine Hand auf diesem Brett, und auf welchen Feldern.
Code: `chesslab/hand_gate.py`, CLI `chesslab occluders gate-train` / `gate-scan`. Wer die Frames
auswählt: `docs/frame-scan.md`. Wer die Alpha schneidet: `docs/session-mattes.md`.

> **Das ist ein INGEST-Werkzeug, kein Tracker-Modell.** Auf dem Handy bleibt die Coverage dort, wo
> sie hingehört: als zusätzlicher Ausgang am Figuren-CNN, pro Feld (`training/occlusion.py`,
> `docs/class-scheme.md`). Nichts hiervon geht ins APK.

## Warum überhaupt ein Schüler

Der Frame-Scan entscheidet mit drei billigen Sensoren, ob ein Frame sauber ist — und SAM 3 sieht
erst danach, was schon ausgewählt wurde. Der saubere Bestand wurde nie gegen den schärfsten Zeugen
gehalten. Seit jedes Frame eine Alpha hat, lässt sich das messen, und es fällt eindeutig aus:

Auf den 91 `clean`-Frames, auf denen SAM etwas findet (korpusweit, 2026-08-22):

| Sensor | was er dort sagt |
|---|---|
| RT-DETR `person` | Median **0,134**, max 0,199 — auf den SAM-freien Frames Median 0,128, p99 0,198 |
| `skin_patch` | **0 von 91** |
| Rillen | **0 von 91** |
| SAM 3 | `person` 0,58–0,86 |

Die Verteilungen von RT-DETR sind deckungsgleich. Die Schwelle zu senken hilft nicht, sie tauscht
nur ein Problem gegen ein größeres:

| person ≥ | fängt echte | verwirft saubere |
|---|---|---|
| 0,20 (heute) | 0/91 | 0 % |
| 0,15 | 33/91 | 29,9 % |
| 0,10 | 67/91 | 83,3 % |

Der Occlusion-Kopf des Figuren-CNN taugt dafür ebenfalls nicht: gemessen am 2026-08-22 verpasst er
bei seiner besten Schwelle **34 von 59** Fällen, und als Torwächter wäre er zirkulär — das auf dem
Korpus trainierte Modell entschiede, was in den Korpus kommt.

## Der Lehrer

SAMs Urteil je Brett, `gate_label`: **Hand**, wenn ein Konzept feuert UND die Maske mehr als
`GATE_AREA_MIN = 0,25` Felder bedeckt; **frei**, wenn kein Konzept feuert und die Fläche 0 ist;
dazwischen **unklar** und kein Lehrer. Über den Korpus: 6.343 Hand, 4.642 frei, 125 unklar.

Ein Konzept ohne Fläche ist eine verworfene Box, Fläche ohne Konzept ein Maskenrand — deshalb
müssen beide zusammenkommen. Für das Ja/Nein reicht übrigens `person` allein: es feuert auf 6.327
der 6.340 Hand-Frames (0,2 % Ausreißer), mit `hand` zusammen praktisch auf allen.

## Der Schüler

Ein Backbone, zwei Köpfe, 65 Spalten: **das Veto**, dann **64 Coverage-Werte**.

- **Kein Decoder und keine Pixelmaske.** `coverage_of` reduziert SAMs Maske ohnehin auf 64 Zahlen,
  und die sind das Produkt: `matte.jsonl` speichert sie, das Manifest liest sie, `PIECE_VISIBLE_MAX`
  schneidet daran.
- **Die 64 Werte hängen an ihrem eigenen Bildausschnitt**, nicht an einem global gepoolten Vektor:
  die Feature-Karte wird auf 8×8 gepoolt, ein 1×1-Conv macht daraus einen Wert je Feld.
- **Der Brettrand wird abgeschnitten**, bevor der Kopf das Bild sieht. 12 px auf 952 sind ein
  Viertel Feld Versatz, und dann sagt jede Zelle etwas über ihre Nachbarin.
- **Bildzeile 0 ist Reihe 8**, `all_squares()` beginnt bei a1 — dazwischen liegt genau ein Kippen
  (`grid_to_squares`). Ein Fehler dort verschiebt jede Zahl um bis zu sieben Reihen und fiele nie
  auf, weil die Werte plausibel blieben.
- **Keine Rotation, keine Spiegelung, kein Versatz** in der Augmentierung. Die Kamera steht fest,
  das Ziel sind 64 Werte auf festen Feldern, und 8 px sind schon ein Fünftel Feld. Variiert wird
  nur das Licht.

## Die Prüfung

SAM ist Lehrer UND Prüfer: gemessen wird auf **ganzen zurückgehaltenen Sessions**, nie auf einem
Frame-Sample derselben Beleuchtung — sonst misst man, ob der Kopf das Brett wiedererkennt.

Für das Veto zählt der **Recall**, nicht die Balance: ein Fehlalarm kostet ein Brett von zwölf
Kandidaten, eine verpasste Hand einen Frame im Trainingssatz. `pick_threshold` nimmt deshalb die
höchste Schwelle, die den geforderten Recall noch hält.

## Was das Training auf dieser Maschine kostet

Gemessen am 2026-08-22 auf der 7900 XT, Trainingsschritt (vorwärts + rückwärts) in bf16 und NHWC:

| Backbone | px | ms/Brett | VRAM | vortrainiert |
|---|---|---|---|---|
| `mobilenetv4_conv_small_035` | 448 | 2,39 | 1,5 GB | **nein** |
| `mobilenetv3_small_100` | 448 | 3,16 | 2,2 GB | ja |
| `mobilenetv4_conv_small` | 448 | 3,69 | 2,8 GB | ja |
| `mobilenetv4_conv_small` | 640 | 7,13 | 3,8 GB | ja |
| `efficientnet_b0` | 448 | 13,75 | 10,2 GB | ja |
| `efficientnet_b0` | 640 | 27,89 | 13,9 GB | ja |

**EfficientNet-B0 kostet bei gleicher Auflösung das 5,8-Fache an Zeit und das 7-Fache an VRAM.**
Der schmalste MobileNetV4 ist der schnellste — aber timm liefert für `_035` **keine Gewichte**, und
bei 8 344 Brettern ist ein vortrainierter Start mehr wert als der Faktor 3 in der Schrittzeit.

`_035` ist trotzdem der richtige Default für den ZELL-Klassifikator: der läuft 64× je Frame auf dem
Handy, wo `Session-ms = 26,9 + 2,731 × MMAC/Crop` gilt und der Knick bei 9,8 MMAC/Crop liegt.
EfficientNet-B0 wären dort ~50 MMAC je 80er Crop — fünffach über dem Knick. Hier läuft der Kopf
einmal je Brett auf einer Desktop-GPU, also gilt keine dieser Schranken.

### Die vier Fallen im Trainingscode

Ohne sie brachte ein 640er Lauf in **20 Minuten keine einzige Epoche** zustande:

- **`MIOPEN_FIND_MODE=FAST`.** ROCm sucht auf Windows sonst für jede neue Conv-Form erschöpfend
  nach Kerneln. Das war der stille Killer, nicht das Modell. Die CLI setzt es jetzt selbst.
- **bf16 und `channels_last`.** Der Lauf war fp32/NCHW und belegte bei Batch 24 auf 640 px 17 GB.
- **Kein `float(loss)` je Batch.** Das synchronisiert die GPU an jedem Schritt; der Verlust wird
  jetzt auf dem Gerät summiert und einmal je Epoche gelesen.
- **`persistent_workers`.** Windows startet die Loader sonst je Epoche neu, jeder importiert torch.

## Was der Schüler kann

`mobilenetv4_conv_small` @ 640 px, 20 Epochen, gegen **vier komplett zurückgehaltene Sessions**
(2 641 Bretter, davon 1 647 mit Hand; 2026-08-22):

| | |
|---|---|
| Veto bei Recall **1,0000** | Schwelle 0,60 — **5** von 994 sauberen Brettern fälschlich verworfen |
| Felder über `PIECE_VISIBLE_MAX` | Recall **0,9852**, Präzision **0,9810** (22 015 Zellen) |
| Coverage-MAE | **0,0042** |
| Tempo | **2,1 ms je Brett** gegen SAMs 2,76 s — Faktor 1 300 |

Zum Vergleich: der ausgelieferte Occlusion-Kopf des Zell-Klassifikators liegt bei `occ_mae`
0,0162, also viermal daneben — und als Torwächter verpasst er 34 von 59 Fällen.

### Woran die Präzision hing

Nicht am Backbone, sondern an zwei geometrischen Fehlern, die beide plausible Zahlen auf falschen
Feldern erzeugt hätten:

| Entwurf | Zell-Recall | Präzision | MAE |
|---|---|---|---|
| 320 px, global gepoolter Kopf, Rand drin | 0,9198 | 0,9312 | 0,0186 |
| **640 px, 8×8-Kopf, Rand abgeschnitten** | **0,9852** | **0,9810** | **0,0042** |

### Die beste Epoche, nicht die letzte

Gemessen auf diesem Lauf: Epoche 4 lag bei MAE 0,0065, Epoche 8 wieder bei 0,0085 — die Mitte des
Kosinus-Zeitplans ist ein Tal. Der Lauf speichert deshalb die Epoche mit dem besten F1 über die
Felder (`gate_score`) und legt die letzte als `last.pt` daneben.
