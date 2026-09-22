# Das Klassenschema — von 2 über 14 zurück auf 13 + Coverage

Die Zahl der Klassen hat sich viermal geändert, und jedes Mal blieb die vorige Fassung irgendwo
stehen. Dieses Dokument sagt, was heute je Oberfläche gilt und woran man ein Schema erkennt.
Das *Warum* der letzten Änderung steht in `docs/occluder-plates.md`, die Messreihe dahinter
unten unter „Die fünf Trainingsrunden".

## Chronik

Nicht die Konstante in `config.py` ist die Chronik — `CLASSES` trug die 14 seit dem ersten Commit.
Was sich änderte, ist das Schema, in dem *trainiert und ausgeliefert* wurde.

| Datum | Commit | Schema | Was passierte |
|---|---|---|---|
| 2026-07-26 | `5bd0b917` | **2** (`empty`/`occupied`) | `OCCUPANCY_CLASSES` + `to_occupancy_class`. Der Tracker fragt Belegung, nicht Identität; ein winziges Modell ganz auf die eine Frage. Whole-Board-Accuracy 0,03 → 0,94. |
| 2026-07-30 | `44af3a67` | 2 | Erste Belegungsmodelle aufs Handy (`shipped`, `v4-128`, `v6-80`). |
| 2026-07-31 | `9bcbd471` | **13** (`pieces13`) | `IDENTITY_CLASSES`, abgeleitet aus `CLASSES` minus `occluded` — nie ein zweites Literal. Grund: der Crop-Pool trug null `occluded`-Zeilen, ein untrainierter 14. Logit kann ein Argmax trotzdem gewinnen. |
| 2026-08-01 | `f331c867` | 13 | `id35-80` aufs Handy — das 13-Klassen-Identitätsmodell. |
| 2026-08-09 | `28481551` | **14** (`pieces`) | `occl14-80`: die 14. Klasse existiert, funktioniert und zahlt sich (noch) nicht aus. |
| 2026-08-13 | `000fb745` | 14 | `real14-80` wird Default auf dem Handy — erstmals ist `pOccluded` überhaupt ungleich 0, und damit sind Hand-Veto, Recovery-Gate und Count-Discount zum ersten Mal scharf. |
| 2026-08-18 | `1f2df751` | **13 + Coverage** | `occluded` verlässt den Softmax und wird Regressionsziel: ein zweiter Ausgang, ein kontinuierlicher Anteil, gemessen per Alpha-Matte statt gemalt. |
| 2026-08-20 | — | 13 + Coverage | Das 2-Klassen-Schema wird **ersatzlos gelöscht**, auf beiden Seiten: `config.OCCUPANCY_CLASSES` und `to_occupancy_class` in Python, `OCCUPANCY_CLASSES` und `classesHaveIdentity` in Kotlin. `--classes` kennt nur noch `pieces13` und `pieces`. Aus dem APK fliegen sechs Modelle (`shipped`, `v4-128`, `v6-80`, `bn35/50/100-80`) plus `occl14-80`; übrig bleiben zwei. |

## Was heute gilt

### Python — 13 Klassen + ein Sigmoid

- `config.CLASSES` (14) bleibt der Kanon, aus dem `IDENTITY_CLASSES` (13) abgeleitet wird
  (`src/chesslab/config.py:18`, `:37`). Die 14 stehen dort für alte Datensätze, nicht für neue Läufe.
- **Es gibt nur noch zwei Modi**: `dataset_build.CLASS_MODES = ("pieces13", "pieces")`
  (`src/chesslab/dataset_build.py:50`). `class_list_for` wirft bei allem anderen — das
  2-Klassen-`occupancy` ist am 2026-08-20 samt `to_occupancy_class` gelöscht worden.
- `dataset build` **defaultet auf `pieces13`** (`src/chesslab/cli.py:1041`,
  `src/chesslab/dataset_build.py:427`). `collapse_labels` **verwirft** vorhandene `occluded`-Zeilen,
  statt sie einzusortieren — sie sind weder leer noch besetzt.
- `train` **defaultet auf `--head occlusion`** (`src/chesslab/cli.py:1250`), und seit 2026-08-20
  auch die Funktionssignatur (`train.py:112`) — der frühere Widerspruch zwischen CLI und
  Direktaufruf ist weg.
- Das Modell gibt `len(classes) + 1` Werte aus: **13 Softmax-Logits plus ein unabhängiges Sigmoid**
  für die Coverage (`src/chesslab/training/occlusion.py:22`). Das ist nicht dasselbe wie 14 Klassen.
- `PIECE_VISIBLE_MAX = 0.15` (`src/chesslab/training/occlusion.py:14`): darüber maskiert
  `OcclusionLoss` den Crop aus dem Klassifikationsterm. Derselbe Wert heißt in `labeling.py`
  `MATTE_DIRTY` und in der Web-UI `PIECE_VISIBLE_MAX` — drei Namen, eine Zahl.
- `export` schreibt `coverage_output: true` in die `config.json`, wenn `head == "occlusion"`
  (`src/chesslab/training/evaluate.py:238`). Deklariert, nicht geraten: wer `classes.size` Logits von
  einem Graphen liest, der einen breiter ist, softmaxt die Coverage in jede Wahrscheinlichkeit hinein.

### Web-UI — 13 malbare Klassen, `occluded` nur noch lesend

`platform/app/lib/classes.ts` spiegelt Python: `IDENTITY_CLASSES` sind die einzigen Labels, die ein
Mensch noch schreibt. `LEGACY_LABEL = "occluded"` bleibt **lesbar** für die 31 271 Zeilen in
`corrections.jsonl`, die bis 2026-08-18 von Hand gemalt wurden, und wird als Historie gerendert.
**Nachgezaehlt 2026-09-22** (`grep -c` ueber alle `data/recordings/*/corrections.jsonl` und
`data/sessions_archive/*/corrections.jsonl`): es liegen **18 563 Korrekturzeilen** auf der Platte
und **keine einzige** mit `occluded` — die 31 271 standen in der globalen
`data/manifests/corrections.jsonl`, die es nicht mehr gibt. `LEGACY_LABEL` hat heute nichts mehr
zu lesen; der Konstante schadet das nicht, die BEGRUENDUNG traegt aber nicht mehr.
Geschrieben wird keine weitere. `/corpus` kann beide Schemata anzeigen und entscheidet per
`classScheme()` (`platform/app/lib/corpus.ts`, Zeile 69 am 2026-09-22 — Symbol zitieren, nicht Zeile) anhand von `dataset.yaml`, sonst anhand der
Klassenliste.

### Handy — sieben Modelle, alle mit Coverage und gemessenem Gate

**Hier laufen die Oberflächen auseinander, und das ist der Punkt, den vor diesem Dokument nichts
festgehalten hat.** Die Kotlin-*Leseseite* kann Coverage: `ModelSpec.coverageOutput` und
`outputWidth = classes.size + (coverageOutput ? 1 : 0)`
(`android/tracker-runtime/.../cnn/ModelSpec.kt:73`, `:79`; Default-Modell in
`CnnModelAssets.kt:37`, die Bündelliste in `:40`), und `observationFromProbs` holt `pOccluded`
entweder aus der `occluded`-Klasse, aus der Extraspalte oder — wenn es beides nicht gibt — aus
`0.0` (`android/core-cnn/.../cnn/Observations.kt:34`).

**Nachgezogen, Stand 2026-09-14:** im APK liegen ACHT `p4*`-Modelle, Default `p4a-80-clahe`, und
**alle acht** deklarieren `coverage_output` — 13 Klassen-Logits plus eine unabhaengige
Coverage-Sigmoide in Spalte 13. `real14-80` und `id35-80` sind seit 2026-08-30 raus; der Absatz
darunter beschreibt den Zustand, der dazu gefuehrt hat.

**Nachgezaehlt 2026-09-22** (`ls android/app/src/main/assets/cnn_model/` und `BUNDLED_MODELS` in
`CnnModelAssets.kt`): es sind **SIEBEN**, nicht acht. Und die Schwelle fehlt nicht mehr — jedes
der sieben traegt ein gemessenes `coverage_gate` in seiner `config.json` (Werte aus den Dateien
gelesen), `ModelSpecTest` ist deshalb gruen. Der Stand der Wahrheit ist `docs/occlusion-gate.md`.

| Modell | Klassen | `coverage_output` | `coverage_gate` (2026-09-22) | `pOccluded` kommt aus |
|---|---|---|---|---|
| `p4a-80-clahe` (Default) | 13 | ja | **0,25** | Sigmoide Spalte 13 |
| `p4a-128` / `p4afull-128` | 13 | ja | **0,35** | Sigmoide Spalte 13 |
| `p4a-80` | 13 | ja | **0,15** | Sigmoide Spalte 13 |
| `p4-128` / `p4-80` / `p4full-128` | 13 | ja | **0,05** | Sigmoide Spalte 13 |

Die Bruecke ist gebaut und die Schwelle steht. *Der Satz von 2026-09-14 — „keines der acht traegt
ein gemessenes `coverage_gate`, alle erben 0,5, `ModelSpecTest` laeuft rot" — gilt nicht mehr.*

*Historisch, der Zustand vor dem Umstieg:*

Die Bruchstelle ist der **Export**, nicht die Leseseite: `comp13-occ-bn-lr1e2-bs512` unter
`data/models/` trägt `"head": "occlusion"`, wurde aber nie als ONNX mit `coverage_output`
exportiert und ins APK gelegt (die neun weiteren Occlusion-Läufe liegen in `data/_delete/models/`,
zusammengefasst in `docs/retired-runs.md`). Beide Enden können es, die Brücke fehlt. Der Weg
dahin: einen Occlusion-Lauf mit `chesslab export` ausgeben und `model.onnx` + `config.json` unter
`android/app/src/main/assets/cnn_model/<name>/` einhängen; die Vertragstests dafür stehen bereits
(`OnnxSquareClassifierContractTest.refusesAGraphNarrowerThanTheDeclaredCoverageWidth`) — sie
feuern nur nie, weil kein solches Modell gebündelt ist.

Solange kein Occlusion-Kopf exportiert und gebündelt ist, gilt der Eintrag in `CLAUDE.md` weiter:
das Hand-Veto muss sich auf den **modellfreien** Arm (`gridOccluded`) verlassen. Und die offene
Klage aus `TODO.md` — `real14-80` ist bei `occluded` zu aggressiv — beschreibt genau die Klasse,
die Python inzwischen abgeschafft hat.

## Der Korpus-Zensus, der die 13 erzwang (`specs/29`, 2026-07-31)

`data/manifests/squares.jsonl`, alle Zeilen:

`empty 42 848 · wP 3 055 · bP 2 982 · bR 807 · wR 716 · wB 694 · bB 670 · bN 561 · wN 511 ·
wK 441 · bK 441 · bQ 378 · wQ 360` — **null `occluded`**.

Aufgenommen wurde nur bei freiem Brett, also gab es die Klasse im Pool nicht. Ein 14-Klassen-Lauf
hätte eine Klasse ohne ein einziges Trainingsbeispiel getragen, deren Logit ein Argmax auf
ungewöhnlicher Eingabe trotzdem gewinnen kann — und ungewöhnliche Eingabe unter einer Hand ist genau
der Fall, um den es geht. Daher die Zeile 2026-07-31 oben.

## Die fünf Trainingsrunden (`specs/53` Phase 04, 2026-08-09, über Nacht)

Vorlauf: der Nutzer labelte 2 114 `occluded`-Zellen (473 auf 003957, 1 641 auf 115912; 3 199
Rohzeilen, last-line-wins). Beide Sessions neu geschnitten — damit existierte `occluded` erstmals im
Crop-Pool. Path A, gegen den Champion `occ-v10bn35-13c-hn` **im selben Lauf** gemessen.

| # | Trainingskorpus | occluded | Misses | Phantome | Margin p99.9/max |
|---|---|---|---:|---:|---|
| 1 | donor + rg (50 % rg), 14c, **from scratch** | 2 114 | — | — | `val_acc` 0,08 — unbrauchbar |
| 2 | donor + rg (50 % rg), 14c, Warmstart, lr 1e-3 / 3e-4 | 2 114 | 0 / 0 | **133 / 105** | 0,64 / 0,52 |
| 3 | donor + rg (50 % rg), **13c-Kontrolle** | verworfen | **165** | 0 | 0,39 |
| 4 | donor + rg **auf 5,3 % gedeckelt** | 2 114 | 1 | **2** | 0,155 |
| 5 | donor + **nur die `occluded`-Zeilen** (1,8 %) | 2 114 | 8 | **0** | **0,028 / 0,087** |
| — | Champion `occ-v10bn35-13c-hn` (Referenz, gleicher Lauf) | — | 3 | 0 | 0,065 / 0,328 |

Drei Befunde, gemessen:

1. **Ein 14-Klassen-Kopf trainiert nicht from scratch** in 15 Epochen (`val_acc` 0,08). `--resume`
   vom Champion ist Pflicht; der Resume-Pfad behandelt den Klassenzahl-Wechsel by design
   (276 Tensoren übernommen, 2 übersprungen).
2. **Die Ursache ist Domänen-Dominanz, nicht die neue Klasse.** Die zwei exportierten Sessions
   stellten 63 354 von 127 162 Trainingszeilen — **50 %**, jede 2–3× größer als die größte
   Donor-Session. Runde 3 isoliert die Variable: derselbe Korpus macht bei 13 Klassen 165 Misses und
   **null** Phantome, bei 14 Klassen 105–133 Phantome. Deckeln auf 5,3 % → 2 Phantome; nur die
   `occluded`-Zeilen (1,8 %) → **null**, mit der besten Margin, die hier je gemessen wurde.
   Eine Geometrie-Hypothese wurde zuerst geprüft und **widerlegt**: `session scan` liest nach
   `autofix` 3,16 / 2,97 px Median, innerhalb des 3,0–5,8-px-Bandes des guten Korpus.
3. **`pOccluded` lebte.** Mit `occl14-80` druckt das Ledger auf rec-20260807 **772×** ein
   `occl=` ungleich null — zum ersten Mal hatten die fünf Sicherungen überhaupt einen Sensor.

**Regel daraus:** eine neue Session ist eine **Ergänzung**, nie die Masse; `--source-manifest` mit
per-cell-Vorabdeckel ist das Werkzeug. Und: das Modell **ging nicht aufs Handy** — das Kriterium war
25/0/0 auf rec-20260807 unter dichter Auswertung, und der dichte Arm wurde auf beiden Videos
schlechter (rec-20260807 14/11/6 → 17/8/12; 115912 229 Plies/0 erfunden → 106). Die specs/52-These
(„ein Sensor für ‚da ist eine Hand im Bild' würde genau die Reads sperren, die das ruhige Video
brechen") ist damit **in dieser Form widerlegt** — die Sicherungen feuern, die Phantome kommen
trotzdem.

## Ein Schema erkennen

Zwei Felder in der `config.json` eines Laufs reichen:

- `classes` mit 14 Einträgen inkl. `occluded` → altes 14er-Schema, `occluded` ist eine Klasse.
- `classes` mit 13 Einträgen **und** `coverage_output: true` → heutiges Schema, der Graph ist 14
  Spalten breit, die 14. ist ein Sigmoid.
- `classes` mit 13 Einträgen **ohne** `coverage_output` → 13er-Identitätsmodell, blind für Verdeckung.
- `classes` = `["empty","occupied"]` → 2er-Belegung. Nur noch in Altbeständen: seit 2026-08-20
  kann dieses Schema nicht mehr gebaut werden, und kein Modell im APK trägt es.

13 + Coverage und 14 Klassen sind **beide 14 Spalten breit**. Die Spaltenzahl unterscheidet sie
nicht; nur `coverage_output` tut es (`ModelSpecTest.kt:185`).

## Die Falle: Coverage 0.0 heißt nicht „frei"

`torch_data.py:422` liest `row.get("coverage", 0.0)`. Ein Crop aus einer Session, die nie gemattet
wurde, trainiert also als Coverage 0,0 — ununterscheidbar von einem tatsächlich freien Feld. Wer
gemattete und ungemattete Sessions in **einen** Occlusion-Lauf mischt, bringt dem Kopf bei, dass es
Hände nicht gibt. Coverage ist nur für gemattete Sessions eine Messung; überall sonst ist sie ein
Default.
