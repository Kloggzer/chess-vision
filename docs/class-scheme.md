# Das Klassenschema — 13 Klassen + Coverage, und wie der Verlust sie gewichtet

Was heute je Oberfläche gilt, woran man ein Schema erkennt, und wie Coverage und Klassengewichte
in den Verlust eingehen. Warum `occluded` ein Ausgang und keine Klasse ist:
`docs/occluder-plates.md`.

## 1. Chronik in fünf Zeilen

- **2026-07-26, 2 Klassen** (`empty`/`occupied`): der Tracker fragt Belegung, nicht Identität.
- **2026-07-31, 13** (`pieces13`): `IDENTITY_CLASSES` = `CLASSES` minus `occluded`. Der Pool trug
  null `occluded`-Zeilen, und ein untrainierter 14. Logit kann ein Argmax trotzdem gewinnen.
- **2026-08-09, 14** (`pieces`): `occl14-80` — die 14. Klasse funktioniert, zahlt sich nicht aus
  (§4).
- **2026-08-18, 13 + Coverage**: `occluded` verlässt den Softmax und wird Regressionsziel,
  gemessen per Alpha-Matte statt gemalt.
- **2026-08-20**: das 2-Klassen-Schema ist in Python und Kotlin **ersatzlos gelöscht**.

## 2. Was heute gilt

### Python — 13 Klassen + ein Sigmoid

- `config.CLASSES` (14) bleibt der Kanon, aus dem `IDENTITY_CLASSES` (13) abgeleitet wird; die 14
  stehen dort für alte Datensätze.
- **Zwei Modi**: `dataset_build.CLASS_MODES = ("pieces13", "pieces")`. `dataset build` defaultet
  auf `pieces13`; `collapse_labels` **verwirft** vorhandene `occluded`-Zeilen, statt sie
  einzusortieren. Kein Crop wird dabei umgelabelt.
- `train` defaultet auf `--head occlusion`. Das Modell gibt `len(classes) + 1` Werte aus: **13
  Softmax-Logits plus ein unabhängiges Sigmoid** für die Coverage — nicht dasselbe wie 14 Klassen.
- `PIECE_VISIBLE_MAX = 0.15`: darüber maskiert `OcclusionLoss` den Crop aus dem
  Klassifikationsterm. Dieselbe Zahl lebt in `chesslab.cell_rule.PIECE_VISIBLE_MAX` und in der
  Web-UI `PIECE_VISIBLE_MAX`.
- `export` schreibt `coverage_output: true`, wenn `head == "occlusion"`. Deklariert, nicht geraten:
  wer `classes.size` Logits von einem breiteren Graphen liest, softmaxt die Coverage in jede
  Wahrscheinlichkeit hinein.

### Web-UI — 13 malbare Klassen

`platform/app/lib/classes.ts` spiegelt Python. `LEGACY_LABEL = "occluded"` bleibt lesbar, hat aber
nichts mehr zu lesen: unter `data/recordings/*/` und `data/sessions_archive/*/` liegen 18 563
Korrekturzeilen, keine mit `occluded` (2026-09-22). `/corpus` wählt das Schema per `classScheme()`
(`platform/app/lib/corpus.ts`) aus `dataset.yaml`, sonst aus der Klassenliste.

### Handy — sieben Modelle, alle mit Coverage und gemessenem Gate

Die Leseseite: `ModelSpec.coverageOutput`, `outputWidth = classes.size + (coverageOutput ? 1 : 0)`;
`observationFromProbs` holt `pOccluded` aus der `occluded`-Klasse, aus der Extraspalte oder — gibt
es beides nicht — `0.0`. Stand 2026-09-22 (`BUNDLED_MODELS`, Werte aus den `config.json`):

| Modell | `coverage_gate` |
|---|---|
| `p4a-80-clahe` (Default) | **0,25** |
| `p4a-128` / `p4afull-128` | 0,35 |
| `p4a-80` | 0,15 |
| `p4-128` / `p4-80` / `p4full-128` | 0,05 |

Alle sieben: 13 Klassen, `coverage_output`, `pOccluded` aus der Sigmoide in Spalte 13. Der Stand
der Wahrheit für die Schwellen ist `docs/occlusion-gate.md`.

## 3. Ein Schema erkennen

Zwei Felder in der `config.json` eines Laufs reichen:

- `classes` mit 14 Einträgen inkl. `occluded` → altes 14er-Schema.
- 13 Einträge **und** `coverage_output: true` → heutiges Schema, 14 Spalten, die 14. ein Sigmoid.
- 13 Einträge **ohne** `coverage_output` → 13er-Identitätsmodell, blind für Verdeckung.
- `["empty","occupied"]` → 2er-Belegung, nur noch in Altbeständen.

13 + Coverage und 14 Klassen sind **beide 14 Spalten breit**; nur `coverage_output` unterscheidet
sie (`ModelSpecTest`).

## 4. Warum die 14. Klasse nicht ausgeliefert wurde (2026-08-09)

Fünf Trainingsrunden, gegen den Champion im selben Lauf. Befunde:

- **Ein 14-Klassen-Kopf trainiert nicht from scratch** (15 Epochen, `val_acc` 0,08); `--resume`
  vom Champion ist Pflicht.
- **Die Phantome kamen aus Domänen-Dominanz, nicht aus der neuen Klasse.** Zwei neue Sessions
  stellten 50 % der Trainingszeilen. Derselbe Korpus bei 13 Klassen: 165 Misses, null Phantome;
  bei 14: 105–133 Phantome. Auf 5,3 % gedeckelt: 2; nur die `occluded`-Zeilen (1,8 %): null.
- **Regel:** eine neue Session ist eine **Ergänzung**, nie die Masse (`--source-manifest` mit
  per-cell-Vorabdeckel). Das Modell ging trotzdem nicht aufs Handy — der dichte Arm wurde auf
  beiden Videos schlechter.

## 5. Coverage im Verlust

### Die Falle: fehlende Coverage heißt nicht „frei“

`training/torch_data.py` (`coverage_of`) liest eine fehlende `coverage` als 0,0. Ein Crop aus einer
nie gematteten Session trainiert also als freies Feld. Wer gemattete und ungemattete Sessions in
**einen** Occlusion-Lauf mischt, bringt dem Kopf bei, dass es Hände nicht gibt.

### Ab wann das Modell die Figur nicht mehr liest (gemessen 2026-09-16)

Die 0,15 ist gegen den **Rillen-Sensor** geeicht, nicht gegen das Bild. `augval-eager-s42`
(80 px) gegen `real13-mix-v6-80`, val + test nach dem eigenen `split-pin.json`, 84 608 Zellen,
Figurengenauigkeit auf besetzten Feldern je Coverage-Band:

| Coverage | Zellen | `piece_acc` | normiert |
|---|---:|---:|---:|
| 0,00–0,02 | 31 929 | 0,9296 | 1,000 |
| 0,02–0,15 | 106–147 je Band | 0,84–0,87 | 0,90–0,93 |
| **0,15–0,25** | 163 | **0,7423** | 0,799 |
| **0,25–0,40** | 273 | **0,6667** | 0,717 |
| **0,40–0,60** | 302 | **0,3113** | 0,335 |
| 0,60–0,80 | 262 | 0,0382 | 0,041 |
| 0,80–1,00 | 1 195 | 0,0075 | 0,008 |

- **Die harte Kante bei 0,15 wirft Signal weg** — dort liest das Modell noch 74 %.
- **Ab etwa 0,6 liegt es systematisch falsch**, unter Zufall. Dort gehört eine Null hin.
- Vorbehalte: das Modell wurde MIT der 0,15-Maske trainiert (rechts davon reine Generalisierung);
  die Bänder 0,02–0,15 sind dünn und nicht monoton; `PackedBoardDataset` verwirft unvollständige
  Bretter und damit bevorzugt verdeckte. **Immer val UND test messen** und den Split des Laufs
  nehmen — nur-val ergab eine zu optimistische Grundlinie (0,973).

### `--coverage-weight soft`

```
w(c) = 1 − (3s² − 2s³),   s = min((c + 0,01) / 0,60,  1)
```

`COVERAGE_ZERO_AT` und `COVERAGE_SHIFT` in `training/occlusion.py`. Die Kurve liegt unter jedem
Band mit genug Zellen und innerhalb des Intervalls der zwei dünnen
(`tests/test_coverage_weight.py`).
Der Linksversatz bricht die Waagerechte der S-Kurve bei c = 0, wo die Messung schon fällt; die
Stauchung auf 0,6 hält sie unter der Messung (ungestaucht gäbe sie bei 0,5 halbes Gewicht, wo das
Modell auf 33 % steht).

- **Verworfen: `zero_at = 0,46`** (unter jedem Punktschätzer). Es nimmt auch unter 0,15 Gewicht weg
  und liegt insgesamt unter `hard` (0,99x) — optimiert gegen einen Messpunkt aus 106 Zellen.
  Entscheidung A (Nutzer, 2026-09-16): 1,01x Masse, gezielt **10 354 teilverdeckte Zellen** mehr.
- **Vorgabe bleibt `hard`**, bitgleich zur alten Regel. `soft` ist eine Rezept-Änderung, ein Lauf
  damit ist mit dem Archiv nicht vergleichbar.
- **Die Metrik wandert NICHT mit**: `cell_rule.classification_eligible`, `val_visible_piece_acc` und
  `CHECKPOINT_WEIGHTS` bleiben auf der harten 0,15, sonst wird jeder Arm auf seiner eigenen
  Zellmenge benotet.
- **Dunkelheit bleibt ein harter Ausschluss**; gewichtet wird nur die Verdeckung.
- `config.json` nennt unter `soft` keine `visible_max`-Kante, die der Lauf nie hatte.

### Die Coverage-Drift (gemessen 2026-09-16)

Die gespeicherte `coverage` ist ein Schnappschuss vom Matten. Ein Re-Export (`fit-stored`,
Straightening, `carry_repaired_geometry`) verschiebt die Ecken; `crop_square` schneidet danach mit
den neuen, die Zahl bleibt stehen.

- **13 von 24 Aufnahmen** trugen eine nicht mehr reproduzierbare Coverage; 0,10 % der Zellen
  überquerten `PIECE_VISIBLE_MAX`, fast alle auf der **Grundreihe** und als Totalkipper
  0,000 → 1,000 — eine Hand im Bild, die mit dem Label der Figur im Verlust bleibt.
- `chesslab occluders recut-coverage --all` rechnet aus den Alphas neu, mit heutiger Geometrie.
  **SAM läuft nicht**, Minuten für den Korpus. `alpha: fixed`-Zeilen (menschliche Zahlen) und
  Zeilen ohne Coverage (SAMs Absagen) bleiben unangetastet. **Nach jedem Re-Export fällig**; bei
  `soft` geht die Drift in jedes Gewicht ein, nicht nur an der Schwelle.
- `scripts/audit_disk_damage.py` zählt die Drift, ohne etwas anzufassen.

## 6. Klassengewichte: dieselbe Zellmenge wie der Verlust (seit 2026-09-22)

`train.visible_class_counts` zählt über `cell_rule.classification_eligible` — genau die Zellmenge,
die `OcclusionLoss` gewichtet (Coverage **und** `brightness >= cell_rule.CELL_DARK_MIN`). Vorher zählte
`train.py` nur die Coverage (`tests/test_bug_hunt_20260922f_gewichte.py` war ohne den Fix rot).

- **Warum aus den sichtbaren Zeilen:** Verdeckung trifft Weiß 11–15 %, Schwarz 2–6 % (gespielt wird
  von Weiß); Gewichte aus allen Zeilen lagen bis zu 8 % daneben.
- **Was die Dunkelmaske dazu beiträgt**, auf `real13-mix-v7-128` und dem reparierten `-80`:
  1,83 % weitere Zeilen, größter Einzelfehler **+2,80 % (bN)**, alle schwarzen Klassen vorher
  unterbewertet, Spreizung 11,58x → 11,43x. Schwarz auf dunklem Feld ist zu 6,70 % dunkel, Weiß
  auf dunklem 1,49 %; dunkle Felder 3,96 % gegen helle 0,61 %, ferne Bretthälfte 3,15 % gegen
  1,39 %.
- **Der Bruch:** ab 2026-09-22 sind `effective_class_weights` eines `--head occlusion`-Laufs auf
  einem Satz MIT `brightness`-Spalte nicht mehr mit dem Archiv vergleichbar. Alte Packs ohne die
  Spalte rechnen unverändert (jede Zelle gilt als hell).
- **`brightness` fehlte in einer Slice-Generation**: `real13-mix-v7-80` trug die Spalte für alle 138
  Kompositen nicht (376 640 Zeilen, 38,5 %) und ist seit 2026-09-22 repariert;
  `real13-mix-v6-80-clahe` fehlte sie zu 44,8 % (2026-09-21). Ein fehlendes `brightness` gilt als
  255 — ungemessen, nicht dunkel. Wer es mit `or 0.0` liest, wirft die Kompositen geschlossen ins
  dunkelste Band.
- **Der ausgelieferte Champion `p4a-80-clahe`** sitzt auf dem alten Gewichtsstand und einem Satz,
  dessen Dunkelmaske zu 44,8 % wirkungslos war. Gegen einen neuen Lauf gestellt vergleicht man zwei
  Rezepte, nicht zwei Modelle.
- Sechs Auswerter unter `scripts/` zählen seit `f7e3d85d` über `classification_eligible`;
  `mine_hard_coverage.py` bleibt bewusst auf `coverage`.
