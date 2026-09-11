# Plan 98+: Eingangsauflösung und Crop-Pfad

> Geschrieben 2026-09-11. **Nur gelesen und gerechnet — kein Training, kein Build, kein Pack
> gestartet.** Alle Zahlen unten sind entweder aus dem Repo gemessen (Datei + Zeile genannt) oder
> aus gemessenen Ankern gerechnet (Formel genannt). Was ich nicht belegen konnte, steht in §8.
>
> Zielmarke laut Nutzer: **deutlich über 98 %, und robust** — über Seeds UND über Aufnahmen.
> Ausgangspunkt: `boardattn:cellnet_p4` @ 128 px, Seed 42, `val_visible_piece_acc` **0,9860**
> (`data/models/_arch128v6-frac1/p4a-s42/metrics.jsonl`, Mittel der letzten 15 von 60 Epochen).

---

## 1. Die Kernfrage zuerst: wo liegt die Auflösungsgrenze physisch?

### 1.1 Die Kette, und wo die Auflösung entschieden wird

```
Marker-Quad in log.jsonl                    → mittlere Kantenlänge / 8 / 1,09 = Feld-px/Quadrat AM SENSOR
  │  calibration.warp_padded (:993, cv2.remap INTER_CUBIC :1011)
  ▼
Brett-Raster board_size = 928               → Zelle = 928/8 = 116 px   (calibration.py:302)
  │  calibration.square_to_crop_box (:290, :309-312): cell*(1+2*pad_side), pad_side 0,05
  ▼
Crop-Box 127,6 px                           → Faktor 1,000 auf 128
  │  labeling.crop_square (:158) → imgops.resize_keep_aspect (:22, INTER_AREA beim Verkleinern)
  ▼
Pack-Zeile bei --pack-size                  (training/pack.py:127 `_cut_session` schneidet aus dem BRETT)
```

Das `1,09` ist kein Schätzer: `compute_homography` (`calibration.py:566`, dst-Punkte `:578`) legt
die geloggten Ecken **außerhalb** des Spielfelds ab — `desktop.yaml` trägt `margin: 0.045` auf
allen vier Ecken, also spannt das Marker-Quad `board_size × 1,09`. Wer `mittlere Kante / 8` als
px/Feld liest (so wie `docs/data-pipeline.md` §11.2), liest 9 % zu hoch.

### 1.2 Gemessen: Quellpixel je Feld, je Aufnahme

Median über jede 5. Zeile der `log.jsonl` aller 22 echten Aufnahmen in `real13-mix-v6-80`
(`data/datasets/real13-mix-v6-80/dataset.yaml`). `Feld px/Q` = mittlere Marker-Kante / 8 / 1,09.

| Aufnahme | Quelle | Feld px/Q | Warp 116 / Feld | Quellpixel in der Crop-Box (×1,1) |
|---|---|---:|---:|---:|
| VID_20260824_153751 | 3840×2160 | **201,5** | 0,58 | **222** |
| VID_20260824_154327 | 3840×2160 | **201,5** | 0,58 | **222** |
| 2026-08-15-23-01-43 | 2560×1440 | 114,7 | 1,01 | 126 |
| 2026-08-16-20-19-54 | 2560×1440 | 114,2 | 1,02 | 126 |
| 2026-08-16-20-41-33 | 2560×1440 | 113,7 | 1,02 | 125 |
| 2026-08-13-19-34-23 | 2560×1440 | 113,3 | 1,02 | 125 |
| 2026-08-13-12-46-24 | 2560×1440 | 113,1 | 1,03 | 124 |
| 2026-08-14-14-32-33 | 2560×1440 | 113,0 | 1,03 | 124 |
| 2026-08-24-22-43-46 | 2560×1440 | 111,2 | 1,04 | 122 |
| **2026-09-06-20-27-33 (VAL)** | 2560×1440 | **109,0** | **1,06** | **120** |
| 2026-09-06-20-57-45 | 2560×1440 | 109,0 | 1,06 | 120 |
| 2026-09-06-21-12-56 | 2560×1440 | 108,9 | 1,06 | 120 |
| 2026-08-30-16-20-19 | 2560×1440 | 108,9 | 1,07 | 120 |
| 2026-09-06-21-29-35 | 2560×1440 | 108,7 | 1,07 | 120 |
| VID_20260802_222741 | 1920×1080 | 106,7 | 1,09 | 117 |
| VID_20260802_222203 | 1920×1080 | 105,7 | 1,10 | 116 |
| **2026-08-08-11-55-19 (TEST)** | 1920×1080 | **105,1** | **1,10** | **116** |
| 2026-08-08-11-59-12 | 1920×1080 | 105,1 | 1,10 | 116 |
| **2026-08-08-00-39-57 (TEST)** | 1920×1080 | **105,0** | **1,10** | **116** |
| 2026-08-07-13-52-38 | 1920×1080 | 104,9 | 1,11 | 115 |
| VID_20260727_233929 | 1920×1080 | 92,7 | 1,25 | 102 |
| VID_20260726_233432 | 1920×1080 | 88,4 | 1,31 | **97** |

**Das ist die Antwort auf die entscheidende Frage.** Eine 128-px-Crop-Zeile enthält bei
20 von 22 Aufnahmen **97 bis 126 echte Quellpixel**. Ab 128 px wird interpoliert, nicht gewonnen —
mit genau zwei Ausnahmen, den beiden 4K-Aufnahmen (222 Quellpixel), und die liegen **beide im
Train-Split** (`split-pin.json`), nie im Val und nie im Test.

Zweite Konsequenz, die sonst untergeht: **der Export hebt 1080p bereits um 9–31 % hoch.**
`board_size` 928 ist an der 4K-Kamera geeicht, nicht an der Aufnahme. Für `VID_20260726_233432`
erfindet der Warp schon heute ein Viertel jeder Kante.

### 1.3 Gegenprobe am Bild, nicht nur an der Geometrie

Je Gruppe 120 zufällige 128-px-Crops aus dem Pool, Grauwert. Zwei Maße:
**Rückbau-RMS** = Crop auf S verkleinern (INTER_AREA) und auf 128 zurück (INTER_CUBIC), RMS gegen
das Original; **Bandgrenze** = die Crop-Größe, unterhalb derer 99,99 % der AC-Energie des
radialen Leistungsspektrums (Hann-Fenster) liegt.

| Gruppe | RMS @64 | @80 | @96 | @112 | Bandgrenze (99,99 %) |
|---|---:|---:|---:|---:|---:|
| 4K VID_20260824_153751 | 10,66 | 9,11 | 7,14 | 5,78 | **78 px** |
| 4K VID_20260824_154327 | 10,13 | 8,43 | 6,59 | 5,34 | **78 px** |
| 1080p TEST 2026-08-08-11-55-19 | 11,80 | 9,11 | 6,71 | 5,37 | 64 px |
| 1440p 2026-09-06-21-29-35 | 7,10 | 5,44 | 3,86 | 2,99 | 62 px |
| 1080p TEST 2026-08-08-00-39-57 | 10,17 | 7,79 | 5,69 | 4,51 | 58 px |
| 1440p 2026-08-30-16-20-19 | 8,22 | 6,57 | 4,77 | 3,79 | 56 px |
| **1440p VAL 2026-09-06-20-27-33** | 7,06 | 5,39 | 3,92 | 3,07 | **52 px** |
| comp1280 VID_20260823_120426 | 4,90 | 3,56 | 2,45 | 1,91 | 42 px |
| 1080p VID_20260726_233432 | 4,09 | 3,15 | 2,15 | 1,61 | 40 px |
| 1440p 2026-08-16-20-19-54 | 3,04 | 2,41 | 1,71 | 1,31 | 38 px |
| comp672 2026-08-09 20-48-50 | 3,25 | 2,57 | 1,83 | 1,55 | 38 px |
| 1080p VID_20260802_222741 | 2,63 | 2,05 | 1,43 | 1,06 | 36 px |
| comp656 VID_20260812_112853 | 1,94 | 1,63 | 1,12 | 0,90 | **36 px** |
| comp1280 VID_20260825_233206 | 3,96 | 2,99 | 2,01 | 1,58 | 34 px |

Die beiden Maße sagen dasselbe, aus zwei Richtungen:

- Der Rückbau-RMS **fällt von 96 auf 112 noch um ein Viertel** — zwischen 96 und 128 px steht
  also noch echter Inhalt, auch auf dem Val. Der Schritt 80 → 128 war kein Artefakt.
- Die Bandgrenze rangiert exakt nach Quellauflösung: 4K 78 px, die realen Handyaufnahmen 36–64,
  die niedrig aufgelösten Kompositen 36–38. **Kein reales Material trägt Struktur, die ein
  160-px-Crop noch zusätzlich abbilden könnte.**
- Der 99,99-%-Wert ist eine Energie-Aussage und liegt konstruktionsbedingt unter der sichtbaren
  Bandgrenze (Figurenkanten sind wenig Energie und viel Information) — darum wird er hier nur als
  **Rangfolge** benutzt, nicht als absolute Schwelle.

### 1.4 Die Kompositen sind das schwächste Glied im Crop-Pfad

45 % des Datensatzes sind Kompositen (376 640 von 841 521 Zeilen, ausgezählt über
`data/datasets/real13-mix-v6-80/manifest.jsonl`). Ihre Crop-Box folgt
`measured_board_size` (`realgames.py:1928`), und die steht je Clip in `composite.json`:

| `board_size` | Zelle | Box | Zeilen in v6 | bei Pack 128 |
|---:|---:|---:|---:|---|
| 656 (`VID_20260812_112853`) | 82 | 90 px | 43 392 | **1,42× HOCH** |
| 672 (`2026-08-09 20-48-50`) | 84 | 92 px | 61 760 | **1,39× HOCH** |
| 1216 (`VID_20260731_222320`) | 152 | 167 px | 6 912 | 0,77 runter |
| 1264 (`VID_20260731_092133`) | 158 | 174 px | 24 896 | 0,74 runter |
| 1280 (zehn Clips) | 160 | 176 px | 239 680 | 0,73 runter |

**105 152 Zeilen — 12,5 % des ganzen Datensatzes — sind bei 128 px zu 1,4× interpoliert.**
Und sie zahlen zusätzlich einen Umweg: `pack.cut_plan` (`training/pack.py:168`) schickt nur
Zeilen mit `boards/`-Verzeichnis auf den Brettweg; alles andere geht über `_decode_chunk`
(`:152`) aus der **128-px-Pooldatei**. `pack_from_source` (`:193`), das genau dafür geschrieben
wurde, **hat im ganzen Repo keinen Aufrufer mehr** (`grep -rn pack_from_source src/ scripts/`).
`docs/data-pipeline.md` §3.1 („Umgesetzt 2026-08-23") beschreibt damit einen Weg, der seit dem
Brett-Umbau nicht mehr läuft; die dort gemessenen **1,27× / 1,34× Schärfe** liegen wieder auf
der Straße.

### 1.5 Brächte ein größeres `board_size` beim Export mehr echte Information?

**Nein — außer für die zwei 4K-Aufnahmen.** `board_size` 928 warpt 1440p bereits 1,01–1,07× und
1080p 1,09–1,31× **über** die Sensorauflösung (§1.2). Ein `board_size` 1024 oder 1600 würde dort
nur den Interpolationsfaktor erhöhen. Für die 4K-Aufnahmen verliert der Export dagegen heute
42 % linear (0,58), und das ist unumkehrbar — deren 222 Quellpixel je Crop-Box sind der einzige
Ort im Korpus, wo mehr als 128 px überhaupt etwas zu holen hätte.

Weil Val und Test **beide** 1440p/1080p sind, kann ein größeres `board_size` die Zielmetrik
bestenfalls über besseres Trainingsmaterial erreichen — nie direkt. Und es ist teuer: neuer
Export, neuer Slice, neuer Datensatz, neuer Pack (`docs/data-pipeline.md` §5.9, §12.4).

---

## 2. Was daraus für die Auflösungsvarianten folgt

| Eingang | Verhältnis zur Crop-Box (127,6) | Val (120 Quellpx) | Test (116) | 4K (222) | Urteil |
|---|---|---|---|---|---|
| 80 px | 0,63 | schneidet | schneidet | schneidet stark | belegt schlechter (−4,4) |
| **96 px** | 0,75 | schneidet leicht | schneidet leicht | schneidet | **ungemessen, Hauptkandidat** |
| **112 px** | 0,88 | fast vollständig | fast vollständig | schneidet | **ungemessen, Hauptkandidat** |
| 128 px | 1,00 | vollständig | vollständig (+10 % erfunden) | schneidet | 0,9860 gemessen |
| 160 px | 1,25 | **reine Interpolation** | reine Interpolation | knapp unter der Grenze | **abzulehnen** |

Ein 160-px-Pack wäre 64,6 GB (841 521 × 3 × 160²) auf 31,8 GB RAM und kostete auf dem Gerät
10,8 ms/Brett (§4) — für Pixel, die `cv2.resize` erfindet. **Nicht bauen.**

### 2.1 `--scales` ist für den gewinnenden Trunk gesperrt

`training/train.py:592`:

```python
board_mode = backbone.startswith(("board:", "boardattn:"))
if board_mode and (scales or head != "occlusion"):
    print("[FAIL] board:-Backbones brauchen --head occlusion und vertragen kein --scales: ...")
```

Der Grund steht daneben und ist echt: der Multi-Scale-Zweig (`train.py:1207-1213`) interpoliert
`x` als `(B,3,S,S)`, der Brett-Batch trägt aber eine Zellachse. **FixRes über `--scales` ist mit
`boardattn:cellnet_p4` heute nicht ausführbar**, und `training/evaluate.py:305-313` weigert sich
zu Recht, ein Modell ohne `scales` bei fremder `--infer-size` zu bewerten. Der Umbau ist klein
(flach machen, interpolieren, zurückformen), aber er ist Code und gehört bewusst entschieden —
er steht als E5 im Plan, nicht als Voraussetzung.

### 2.2 Es geht auch ohne neuen Datensatz

`--input-size` (`cli.py:1689`, `train.py:557`) skaliert im Loader (`torch_data.py:223`,
`T.Resize`, PIL-Bilinear mit Antialias). **Aus dem vorhandenen 128er Pack lässt sich jeder
kleinere Eingang trainieren, ohne einen einzigen Byte neu zu packen.** Das ist der Hebel, mit dem
96 und 112 px sofort messbar sind — der Preis ist, dass jede Epoche weiter 41,4 GB von der Platte
liest (siehe E1 gegen E1b).

---

## 3. Robustheit: was die Auflösungsfrage absichern muss

Das ist kein Anhang. Ein Ergebnis auf `rg-2026-09-06-20-27-33` allein ist genau der Glücksgriff,
den der Nutzer nicht will — `docs/val-choice-2026-09-10.md` sagt es selbst: Val und Alternative
stammen vom **selben Aufnahmetag**.

**Drei Achsen, alle drei Pflicht:**

1. **Seeds.** Streuung bei 80 px gemessen 0,9425 / 0,9587 / 0,9462, sd 0,0157
   (`docs/arch-training-2026-09-11.md`). Bei 128 px läuft **ein** Seed, der zweite ist am
   2026-09-11 08:48 bei Epoche 54 mit dem Rechner gestorben. **Die Seed-Streuung bei 128 px ist
   unbekannt** und muss zuerst gemessen werden — sie könnte kleiner sein (weniger Mehrdeutigkeit
   im Eingang) oder gleich. Drei Seeds, gepaart, Mittel der letzten 15 Epochen
   (`scripts/compare_arms.py`).
2. **Aufnahmen.** Der unangetastete Test-Split (`rg-2026-08-08-00-39-57`, `rg-2026-08-08-11-55-19`)
   und die Session-Folds (`scripts/fold_per_session.py`). `chesslab eval` hat eine
   **Je-Session-Tabelle** eingebaut und nimmt `--sessions` (`cli.py:2008`) — eine Auswertung des
   vorhandenen 128er Checkpoints gegen den Test-Split kostet **kein Training** und ist der erste
   Schritt überhaupt (E0).
3. **Auflösungsklasse.** Der Gewinn muss in 1080p **und** 1440p auftreten. Physikalisch ist die
   Erwartung günstig: Val (120 Quellpixel) und Test (116) liegen nur 3 % auseinander, der
   Auflösungsgewinn darf dort nicht auseinanderlaufen. Die 4K-Klasse ist im Val/Test gar nicht
   vertreten und darf deshalb **nie** als Beleg zitiert werden. Zeilenanteile im Datensatz:

   | Klasse | Zeilen | Anteil |
   |---|---:|---:|
   | echt 1440p | 206 045 | 24,5 % |
   | echt 1080p | 186 910 | 22,2 % |
   | echt 4K | 71 926 | 8,5 % |
   | Komposit ≥ 1216 (scharf) | 271 488 | 32,3 % |
   | Komposit 656/672 (1,4× hoch) | 105 152 | 12,5 % |

**Abnahmekriterium für jeden Arm unten:** gewonnen hat er erst, wenn er (a) über 3 Seeds gepaart
positiv ist, (b) auf beiden Test-Sessions positiv ist, und (c) **je Auflösungsklasse** kein
Vorzeichenwechsel auftritt. Ein Arm, der nur auf 1440p gewinnt, wird nicht ausgeliefert.

---

## 4. Was eine Variante auf dem Gerät kostet

MMAC/Crop für `cellnet_p4` analytisch ausgezählt (`model.py:262` `CELLNET_PRESETS`
`((32,64,64,128,128,192), 4)`, `_dw_pw` `:270`, Strides `(2,1,2,1,2)` `:289`), auf den Anker
5,6 MMAC @ 128 px des Benchmarks normiert. Die Millisekunden folgen der Geraden durch die vier
gemessenen Punkte der vierten Runde (`docs/arch-bench-2026-09-10.md`):

```
ms/Brett = 2,28 + 0,975 × MMAC/Crop        (Fit über 2,4→4,59 | 5,6→7,73 | 15,8→17,87 | 21,5→23,12)
```

| Eingang | MMAC/Crop | ms/Brett (Modell) | gemessen | Pack (841 521 Zeilen) | s/Epoche (frac 1,0) |
|---|---:|---:|---|---:|---:|
| 80 px | 2,13 | 4,4 | **4,27 / 4,90** | 16,2 GB | **24,5 + 2,6** |
| 96 px | 3,15 | **5,3** | — | 23,3 GB | ~35 + 2,7 |
| 112 px | 4,21 | **6,4** | — | 31,7 GB | ~46 + 2,7 |
| 128 px | 5,60 | 7,7 | **7,96 / 7,49** | 41,4 GB | **60,5 + 2,7** |
| 160 px | 8,75 | 10,8 | — | 64,6 GB | ~93 + 2,7 |
| 128 px, `p4w` | 8,00 | 10,1 | — | 41,4 GB | — |

Epochenzeit-Gerade aus den beiden gemessenen Läufen
(`_arch80v6-frac1/p4a-s42`: 24,5 s Train-Median; `_arch128v6-frac1/p4a-s42`: 60,5 s):
`s = 2,35 + 10,65 × MMAC`. **`--epoch-frac 0,35` drittelt das** — der 128er Arm fällt damit von
63 min auf **~24 min je Lauf**, und genau dieses Rezept ist bei 128 px noch nie gelaufen.

**Speicher, und der ist der eigentliche Risikoposten.** Der 128er Pack (41,4 GB) passt nicht in
31,8 GB RAM; der Rechner ist deswegen am 2026-09-11 um 08:48 mitten in `p4a-s43` neu gestartet
(`docs/arch-training-2026-09-11.md`, „Der Rechner stirbt am 128er Pack"). **Ein 96er Pack
(23,3 GB) passt**, ein 112er (31,7 GB) liegt auf der Kante. Das ist ein eigenständiges Argument
für 96/112, unabhängig von der Genauigkeit: es macht den Sweep überhaupt erst durchführbar.

---

## 5. Die Experimente, priorisiert

Reihenfolge ist Absicht: E0 kostet nichts, E1 macht den Rest bezahlbar, E2/E3 beantworten die
Auflösungsfrage, E4/E6 sind der Crop-Pfad, E5/E7/E8 sind die teuren Optionen.

---

### E0 — Der 128er Checkpoint gegen Test und je Session (KEIN Training)

**Hypothese.** Der +4,4-Punkte-Gewinn aus 128 px ist kein Val-Effekt: er tritt auf beiden
1080p-Test-Sessions und in beiden Auflösungsklassen gleich auf.

```bash
uv run chesslab eval --run data/models/_arch128v6-frac1/p4a-s42 --split test --boards-only
uv run chesslab eval --run data/models/_arch80v6-frac1/p4a-s42  --split test --boards-only
uv run chesslab eval --run data/models/_arch80v6/p4a-s42        --split test --boards-only
# und je Auflösungsklasse, auf Sessions, die das Modell im Training sah (Warnung ist erwartet):
uv run chesslab eval --run data/models/_arch128v6-frac1/p4a-s42 --split train --boards-only \
    --sessions rg-VID_20260824_154327,rg-VID_20260726_233432,rg-2026-08-16-20-19-54
```

**Erwarteter Effekt.** Auf dem Test-Split derselbe Abstand wie auf dem Val, ±1 Punkt
(Val 120 gegen Test 116 Quellpixel je Crop-Box — 3 % Unterschied).
**Kosten.** Minuten, nur Inferenz, ein Prozess. **Muss vor E1 laufen.**
**Widerlegt durch.** Ein Abstand, der auf Test deutlich kleiner ist als auf Val, oder der
zwischen den beiden Test-Sessions das Vorzeichen wechselt. Dann ist der 128er Gewinn ein
Eigenschaft dieses einen Aufbaus und die ganze Achse ist neu zu bewerten.
**Vorbehalt.** Die Train-Sessions-Zahlen sind keine Generalisierung, sie beantworten nur
„trägt die Klasse das Signal überhaupt".

---

### E1 — 96 px und 112 px aus dem VORHANDENEN 128er Pack (`--input-size`)

**Hypothese.** Die Auflösungskurve sättigt zwischen 96 und 128 px. 112 px erreicht 128 px
innerhalb der Seed-Streuung; 96 px liegt dazwischen.

```bash
# je Seed 42/43/44, Arme 96 und 112; Referenz ist der vorhandene 128er Lauf
uv run chesslab train --dataset real13-mix-v6-128 --split-file split-pin.json \
  --backbone boardattn:cellnet_p4 --head occlusion --input-size 96x96 \
  --epochs 60 --batch-size 256 --lr 0.01 --weight-decay 0.01 --patience 999 \
  --batch-aug --compile-batch-aug --compile-model --fused-adamw --num-workers 2 \
  --seed 42 --out data/models/_res96/p4a-s42
# dito --input-size 112x112 --out data/models/_res112/p4a-s42
uv run python scripts/compare_arms.py --root data/models/_res112 --tail 15
```

**Erwarteter Effekt.** 112 px: −0,0 bis −0,3 Punkte gegen 128 px (Rückbau-RMS fällt von 96 auf
112 noch um 22 %, von 112 auf 128 physikalisch kaum noch etwas). 96 px: −0,5 bis −1,5 Punkte.
**Kosten.** 6 Läufe. Bei `epoch_frac 1,0` liest jeder weiter 41,4 GB je Epoche → Laufzeit liegt
näher an den 63 min des 128er Laufs als an der Rechenzeit; **rechne mit ~40–55 min je Lauf, also
4–5,5 h gesamt**. Gerät: 5,3 bzw. 6,4 ms/Brett gegen 7,7.
**Widerlegt durch.** 112 px liegt mehr als eine Seed-Streuung (1,6 Punkte) unter 128 px. Dann
trägt der Eingang zwischen 112 und 128 px doch Information, die mein Spektrum nicht sieht — und
dann ist auch 160 px wieder eine Frage (aber siehe §1.2: die Quellpixel sind dann trotzdem nicht
da, der Gewinn wäre ein Netz-Effekt, kein Informationsgewinn).
**Nicht belegt.** Ob der zusätzliche PIL-Resize je Crop (`torch_data.py:223`) die 2 Worker
sättigt. `t_data_s` im ersten Lauf beobachten; steigt es über `t_train_s`/3, ist E1b Pflicht.

---

### E1b — Dedizierte 96er/112er Packs (wenn E1 den Feed sättigt oder der Rechner wackelt)

**Hypothese.** Ein Pack in Zielgröße halbiert die Platten-I/O und bringt den Datensatz zurück in
den Dateicache — das ist derselbe Hebel, an dem die Abstürze hängen.

```bash
uv run chesslab dataset build real13-mix-v6-96  --like real13-mix-v6-80 --pack-size 96x96
uv run chesslab dataset build real13-mix-v6-112 --like real13-mix-v6-80 --pack-size 112x112
```

**Erwarteter Effekt auf die Genauigkeit: null bis leicht positiv.** Der Pack schneidet echte
Aufnahmen direkt aus dem Brett (`pack.py:141-147`, `crop_square(board, square, profile, wh)`) —
**ein** Resample statt zwei. Für die 464 881 realen Zeilen ist das ein echter Schärfegewinn
gegenüber `--input-size` aus dem 128er Pack; für die 376 640 Kompositen ändert es nichts, die
kommen so oder so aus der Pooldatei (§1.4).
**Kosten.** Der v6-128-Build lief laut Verzeichniszeiten (`data/datasets/real13-mix-v6-128/`)
in ~6 Minuten Pixelpass. 96er Pack 23,3 GB, 112er 31,7 GB Platte.
**Widerlegt durch.** Kein messbarer Zeitgewinn je Epoche und keine Verschiebung der Genauigkeit.
**Vorbehalt.** `--like` erbt die Sessionliste, **nicht** den gepinnten Split — `split-pin.json`
muss wie beim 128er daneben gelegt werden, sonst ist der Vergleich wertlos.

---

### E2 — 128 px unter dem HAUSREZEPT (`--epoch-frac 0.35 --weight-cap 3.0`)

**Hypothese.** Der beste bekannte 128er Wert (0,9860) läuft unter dem *schlechteren* der beiden
Rezepte. Bei 80 px bringt das Hausrezept +1,23 Punkte (0,9548 gegen 0,9425, derselbe Seed,
`_arch80v6/p4a-s42` gegen `_arch80v6-frac1/p4a-s42`). Trägt das auf 128 px, steht die Marke bei
**~0,995**.

```bash
uv run chesslab train --dataset real13-mix-v6-128 --split-file split-pin.json \
  --backbone boardattn:cellnet_p4 --head occlusion \
  --epochs 60 --batch-size 256 --lr 0.01 --weight-decay 0.01 --patience 999 \
  --epoch-frac 0.35 --weight-cap 3.0 \
  --batch-aug --compile-batch-aug --compile-model --fused-adamw --num-workers 2 \
  --seed 42 --out data/models/_res128haus/p4a-s42          # dito s43, s44
```

**Erwarteter Effekt.** +0,5 bis +1,2 Punkte gegen 0,9860. Die Unsicherheit ist echt: bei 80 px
war noch viel Fehler übrig, den die Klassengewichtung heben konnte; bei 0,986 ist der
Kopfraum klein und der Effekt kann sich verkleinern.
**Kosten.** Der billigste Arm im ganzen Plan: `epoch_frac 0,35` drittelt die Trainingszeit,
**~24 min je Lauf**, 3 Seeds ≈ 1,2 h. Gerätekosten unverändert 7,7 ms/Brett.
**Widerlegt durch.** Gepaart über 3 Seeds kein positiver Effekt. Dann ist das Hausrezept ein
80-px-Effekt (Gewichtung gleicht aus, was Auflösung sonst nicht hergibt) und fällt weg.
**Achtung — zwei Variablen.** `_arch80v6` gegen `_arch80v6-frac1` unterscheidet sich in
`epoch_frac` UND `weight_cap` (ich habe beide `config.json` verglichen; Augmentierung, Split,
lr, wd, Batch sind identisch, nur `num_workers`/`prefetch` weichen ab und sind für die Güte
irrelevant). Wer wissen will, welcher der beiden Schalter es war, braucht einen dritten Arm.

---

### E3 — Die Auflösungskurve gegen die Robustheitsachsen

**Hypothese.** Die Rangfolge 96 < 112 ≈ 128 hält auf beiden Test-Sessions und in beiden
Auflösungsklassen.

```bash
uv run chesslab eval --run <bester Arm> --split test --boards-only
uv run python scripts/fold_per_session.py --dataset real13-mix-v6-128 --folds data/models/_folds128
```

**Erwarteter Effekt.** Kein Vorzeichenwechsel. Der Auflösungsgewinn ist eine Aussage über
Quellpixel, und Val (120) und Test (116) unterscheiden sich um 3 %.
**Kosten.** Die Eval-Läufe kosten Minuten. **Die Folds kosten ein Vielfaches:**
`fold_per_session.py` setzt einen Ordner trainierter Folds voraus (`--folds`), und es gibt
heute keine für v6-128. Vier Folds × 24 min (Hausrezept) ≈ 1,6 h — **nur** machen, wenn E0 und
E2 gelaufen sind und ein Kandidat feststeht.
**Widerlegt durch.** Ein Fold, in dem der höher aufgelöste Arm verliert. Dann hängt der Gewinn
an der Session-Auswahl und nicht an der Auflösung.
**Vorbehalt.** Val und Test decken **keine** 4K-Klasse ab. Eine Aussage „hält über alle
Kameraklassen" ist mit dem heutigen Split nicht erreichbar; dafür müsste eine der beiden
4K-Aufnahmen aus dem Train in einen Fold als Holdout.

---

### E4 — Den Kompositen-Weg reparieren (`pack_from_source` wieder anschließen)

**Hypothese.** 105 152 Zeilen (12,5 %) sind bei 128 px zu 1,4× interpoliert, und alle 376 640
Kompositen zahlen einen zweiten Resample, weil `pack_from_source` (`training/pack.py:193`) seit
dem Brett-Umbau keinen Aufrufer mehr hat. Die 2026-08-23 gemessenen **1,27×/1,34× Schärfe**
(`docs/data-pipeline.md` §3.1) sind wieder zu holen.

Der Eingriff ist klein: in `pack_dataset` (`:275`) `cut_plan` um einen dritten Topf erweitern —
Zeilen, deren `split_group` in `composite.read_provenance(pool)` steht, gehen an
`pack_from_source` statt an `_decode_chunk`. Danach neuer Pack unter neuem Namen.

**Erwarteter Effekt.** Auf `val_visible_piece_acc` **unbekannt, vermutlich klein** — der Val ist
eine reale 1440p-Aufnahme, kein Komposit. Der Gewinn liegt im Trainingsmaterial: 12,5 % der
Zeilen bekommen echte statt erfundener Pixel. Ich veranschlage **0 bis +0,5 Punkte** und sage
ausdrücklich, dass das der unsicherste Posten im Plan ist.
**Kosten.** Codeänderung plus ein Pack-Lauf. Der Quellweg war 2,80× langsamer als der Dateiweg
bei wenigen Crops aus 4K-Videos und 0,51× bei vielen Crops aus kleinen Videos (§3.1) — für die
zehn 1280er Clips ist mit deutlich mehr Packzeit zu rechnen.
**Widerlegt durch.** Gepaart über 3 Seeds kein Effekt. Dann ist die Kompositenschärfe für das
Ergebnis egal und der Dateiweg bleibt — aber `docs/data-pipeline.md` §3.1 muss trotzdem
korrigiert werden, weil es heute etwas behauptet, das nicht läuft.
**Billigere Vorstufe:** die beiden niedrig aufgelösten Clips (`VID_20260812_112853`,
`2026-08-09 20-48-50`, zusammen 105 152 Zeilen) **weglassen** und gegen den vollen Satz messen.
Das ist ein reiner Build und beantwortet, ob erfundene Pixel überhaupt schaden.

---

### E5 — `--scales` für Brett-Backbones freischalten (FixRes)

**Hypothese.** Multi-Scale-Training (96/112/128) macht die Auslieferungsauflösung frei wählbar
und robuster gegen ein abweichendes `measuredBoardSize` auf dem Gerät.

Codeänderung in `train.py:1207-1213`: `x` von `(B,64,3,S,S)` auf `(B·64,3,S,S)` flach machen,
interpolieren, zurückformen; die Sperre `:592` entsprechend lockern. `evaluate.py:305-313`
funktioniert danach von selbst.

**Erwarteter Effekt auf den Val: 0 bis leicht negativ.** FixRes-Literatur und
`docs/data-pipeline.md` §11.5 sagen dasselbe: Multi-Scale kauft **Wahlfreiheit**, nicht Spitze.
Der Wert liegt woanders — heute ist `infer_size` an eine einzige Größe genagelt, und eine
ungetrainierte Größe **versagt lautlos** (80 px kostete `occ-v4-f3e20` 133 Misses gegen 19 bei
96 px).
**Kosten.** Code + 3 Seeds (~1,2 h unter Hausrezept). Auf dem Gerät kostet es nichts —
ausgeliefert wird eine Größe.
**Widerlegt durch.** Mehr als 0,5 Punkte Verlust gegen den Einzelgrößen-Arm. Dann ist die
Wahlfreiheit zu teuer.
**Reihenfolge:** erst nach E1. Wenn 112 ≈ 128 gilt, ist der Punkt ohnehin halb erledigt.

---

### E6 — `pad_side`: was im Crop steht, statt wie groß er ist

**Hypothese.** Bei fester Ausgabegröße ist `pad_side` ein direkter Umrechnungskurs zwischen
Kontext und Pixeln auf der Figur: 0,05 → die Zelle belegt 116 der 128 px, 0,0 → sie belegt alle
128 (+10 % linear auf der Figur, dafür 5,8 px Kontextring weniger je Seite).

`data/crops/pad0/` existiert bereits — 347 454 Zeilen, `pad_side: 0.0`, geschnitten am
2026-08-28, also **vor** dem Schärfe- und Dunkelfilter und ohne Kompositen. Ein v6-äquivalenter
Vergleich braucht einen frischen Slice in einen Variantenpool.

**Erwarteter Effekt.** Unklar im Vorzeichen, Betrag klein (< 1 Punkt). Gegen `pad0` spricht die
Projektregel zu umgekippten Figuren (Memory `fallen-piece-labeling-policy`) und die Tatsache,
dass 3D-Figuren über die Feldkante ragen — genau dafür gibt es `pad_up`.
**Kosten.** Slice des Variantenpools + Build + Pack + 3 Seeds.
**Widerlegt durch.** Jedes Ergebnis innerhalb der Seed-Streuung — dann ist die Achse tot.
**Nachrangig.** `pad_side` ändern heißt: der Pool ändert sich, der Mensch sieht andere Crops,
und das Modell muss seine Pads deklarieren (`specs/45`, `docs/data-pipeline.md` §11.4). Das ist
viel Reibung für einen Effekt, dessen Vorzeichen niemand kennt.

---

### E7 — Die 4K-Aufnahmen bei ihrer eigenen Auflösung exportieren

**Hypothese.** `VID_20260824_153751/154327` tragen 222 Quellpixel je Crop-Box und werden vom
Export auf 128 zusammengedrückt (Faktor 0,58, `cv2.remap` mit `INTER_CUBIC` ohne Vorfilter,
`calibration.py:1011` — bei 0,58× ist das unterabgetastet). Bei `board_size` 1600 stünde ihr
Detail vollständig zur Verfügung; erst der Pack würde es sauber mit `INTER_AREA`
(`imgops.py:22`) auf Zielgröße bringen.

**Erwarteter Effekt auf Val/Test: nahe null.** Val und Test sind 1440p/1080p; diese beiden
Aufnahmen sind reines Trainingsmaterial (8,5 % der Zeilen). Der Nutzen wäre besseres
Trainingsmaterial, nicht eine bessere Messung.
**Kosten.** Re-Export beider Aufnahmen (nach `docs/export-decode.md` ~28 s je Aufnahme für den
Durchlauf, plus Slice, Build, Pack — und die Regel „neuer Zuschnitt = neuer Datensatzname").
Achtung: ein zweiter Export derselben Session startet auf den gefitteten Ecken des ersten und ist
**nicht** als A/B gegen den ersten zu stellen.
**Widerlegt durch.** Kein Effekt über 3 Seeds. Sehr wahrscheinlich.
**Niedrigste Priorität** — steht hier, weil es die einzige Stelle im Korpus ist, an der der
Export nachweislich echte Information wegwirft, und weil das dokumentiert gehört.

---

### E8 — 160 px

**Nicht durchführen.** §1.2 und §1.3: kein Val-, Test- oder reales Trainingsmaterial trägt
Struktur oberhalb von ~128 px Abtastung. 64,6 GB Pack auf 31,8 GB RAM, 10,8 ms/Brett, und der
Inhalt käme aus `cv2.resize`. Falls E1 wider Erwarten zeigt, dass 112 px deutlich unter 128 px
liegt, ist das ein Grund, die Netzkapazität zu prüfen — nicht die Auflösung weiter zu erhöhen.

---

## 6. Empfohlene Reihenfolge und Gesamtkosten

| # | Was | Läufe | Wanduhr | Gerät (ms/Brett) |
|---|---|---:|---:|---|
| E0 | Eval 128er gegen Test + je Session | 0 | Minuten | — |
| E2 | 128 px + Hausrezept, 3 Seeds | 3 | ~1,2 h | 7,7 |
| E1 | 96 / 112 px aus dem 128er Pack, 3 Seeds | 6 | 4–5,5 h | 5,3 / 6,4 |
| E1b | 96er/112er Pack, falls der Feed sättigt | 0 | ~15 min Build | — |
| E3 | Folds + Test für den Sieger | 4 | ~1,6 h | — |
| E4 | Kompositen aus der Quelle packen | 3 | Code + Pack + 1,2 h | unverändert |
| E5 | `--scales` für Brett-Backbones | 3 | Code + 1,2 h | unverändert |
| E6 | `pad_side` 0 | 3 | Slice+Build+1,2 h | unverändert |
| E7 | 4K bei `board_size` 1600 | 3 | Export+Build+1,2 h | unverändert |
| E8 | 160 px | — | — | **nicht bauen** |

**Ein Lauf nach dem anderen.** Der Rechner ist heute zweimal am Speicherdruck gestorben
(Memory `pc-crashes-are-memory-not-gpu`, `ask-before-heavy-compute`); der 128er Pack allein
belegt 41,4 GB gegen 31,8 GB RAM.

---

## 7. Wie weit trägt diese Achse — ehrliche Obergrenze

**Die Auflösungsachse ist bei 128 px praktisch ausgereizt.** Sie hat +4,4 Punkte geliefert
(0,9425 → 0,9860), und §1.2 sagt, warum danach Schluss ist: 20 von 22 Aufnahmen haben 97–126
Quellpixel je Crop-Box, 128 px greift sie vollständig ab. Was auf dieser Achse noch offen ist:

- **E2** (128 + Hausrezept) — kein Auflösungs-, sondern ein Rezeptposten, aber er läuft auf dem
  128er Material und ist der größte einzelne Kandidat: **+0,5 bis +1,2 Punkte**, Marke ~0,995.
- **E1** kann nichts hinzugewinnen, aber **Gerätebudget freispielen**: wenn 112 px gleichzieht,
  kostet das Modell 6,4 statt 7,7 ms/Brett bei gleicher Güte.
- **E4** repariert einen echten Informationsverlust in 12,5 % der Zeilen — Betrag unbekannt.

**99 %+ wird diese Achse allein nicht tragen.** Bei 11 684 sichtbaren Figurenzellen im Val
(HANDOFF-TRAINING-2026-09-11.md §4) sind 0,9860 = 164 Fehler, 0,990 = 117, 0,995 = 58. Die
Sampling-sd des Val ist 0,0024 — der Unterschied zwischen 0,990 und 0,995 ist messbar, aber nur
gepaart über Seeds. Der Rest muss von den anderen Achsen kommen (Kapazität, Kopf, Labels,
Klassenbalance); auf meiner Achse ist nach E2 das Pixelbudget aufgebraucht.

---

## 8. Was ich NICHT belegen konnte

1. **Die Seed-Streuung bei 128 px.** Es existiert genau **ein** vollständiger 128er Lauf
   (`_arch128v6-frac1/p4a-s42`, 60 Epochen); `p4a-s43` steht bei 14 Epochen, der Rechner ist
   gestorben. Alle Punktprognosen oben benutzen die **80-px**-Streuung (sd 0,0157) als Proxy.
   Sie könnte bei 128 px kleiner sein. Das ist die größte Unsicherheit im ganzen Papier.
2. **Der Effekt von 96 und 112 px.** Vollständig ungemessen. Die APK bündelt ein `p4a-96`
   (`android/app/src/main/assets/cnn_model/p4a-96/config.json`, Datensatz `real13-mix-v4-96`),
   aber zu diesem Lauf existiert in `data/models/` **keine `metrics.jsonl`** und
   `real13-mix-v4-96` hat nicht einmal einen Pack. Es gibt also keinen Altwert zum Anlehnen.
3. **Ob der Hausrezept-Gewinn auf 128 px trägt.** Bei 80 px sind es +1,23 Punkte, ein Seed.
   Bei 128 px nie gelaufen.
4. **Welcher der beiden Hausrezept-Schalter wirkt** (`--epoch-frac 0.35` oder `--weight-cap 3.0`).
   Die beiden vorhandenen 80-px-Arme unterscheiden sich in beiden.
5. **Der Betrag von E4.** Dass die Kompositen den Dateiweg nehmen und `pack_from_source` keinen
   Aufrufer hat, ist belegt. Was das an Genauigkeit kostet, ist es nicht — die 1,27×/1,34×
   Schärfe aus `docs/data-pipeline.md` §3.1 sind eine Bildmessung, keine Modellmessung.
6. **Das Vorzeichen von `pad_side`.** Kein Lauf auf `data/crops/pad0/` (347 454 Zeilen,
   2026-08-28) ist in `data/models/` auffindbar, und kein `docs/` nennt ein Ergebnis.
7. **Die 4K-Klasse als Robustheitsachse.** Beide 4K-Aufnahmen liegen im Train-Split; ein
   sauberer Holdout auf dieser Kameraklasse existiert nicht.
8. **`scripts/sweep_warp_resolution.py`** (das Werkzeug, das die `board_size`-Frage direkt
   beantworten sollte) schneidet Crops aus `session frames` neu. Die gibt es seit dem
   Brett-Umbau 2026-08-17 nicht mehr, und es zielt auf die alten Zwei-Klassen-Occupancy-Modelle.
   **Ich habe es nicht ausgeführt und halte es für tot**; das ist eine Lesart des Quelltexts,
   keine Messung.
9. **Nebenbefund, geprüft, aber nicht meine Achse:** `data/datasets/real13-mix-v6-80/split-pin.json`
   trägt einen `counts`-Block `{train: 332638, val: 132109, test: 128744}`, der zur
   **ungepinnten** `split.json` gehört (132 109 = die drei Val-Sessions von dort:
   72 808 + 46 977 + 12 324). Die gepinnte Val-Session hat 33 511 Zeilen. Die `splits`-Listen
   sind korrekt, nur die Zählung daneben ist geerbt. Wer aus `split-pin.json` Zellzahlen liest,
   liest die falschen.
