# Das Klassenschema — von 2 über 14 zurück auf 13 + Coverage

Die Zahl der Klassen hat sich viermal geändert, und jedes Mal blieb die vorige Fassung irgendwo
stehen. Dieses Dokument sagt, was heute je Oberfläche gilt und woran man ein Schema erkennt.
Das *Warum* der letzten Änderung steht in `docs/occluder-plates.md`, die Messreihe dahinter in
`specs/53-cnn-headroom/04-the-fourteenth-class-pays-or-it-does-not-ship.md`.

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
Geschrieben wird keine weitere. `/corpus` kann beide Schemata anzeigen und entscheidet per
`classScheme()` (`platform/app/lib/corpus.ts:67`) anhand von `dataset.yaml`, sonst anhand der
Klassenliste.

### Handy — zwei Modelle, beide ohne Coverage

**Hier laufen die Oberflächen auseinander, und das ist der Punkt, den vor diesem Dokument nichts
festgehalten hat.** Die Kotlin-*Leseseite* kann Coverage: `ModelSpec.coverageOutput` und
`outputWidth = classes.size + (coverageOutput ? 1 : 0)`
(`android/tracker-runtime/.../cnn/ModelSpec.kt:73`, `:79`; Default-Modell in
`CnnModelAssets.kt:37`, die Bündelliste in `:40`), und `observationFromProbs` holt `pOccluded`
entweder aus der `occluded`-Klasse, aus der Extraspalte oder — wenn es beides nicht gibt — aus
`0.0` (`android/core-cnn/.../cnn/Observations.kt:34`).

Die *Gewichte* sind noch nicht nachgezogen: **kein einziges** Asset unter
`android/app/src/main/assets/cnn_model/*/config.json` deklariert `coverage_output`. Der Default
`real14-80` ist ein echtes 14-Klassen-Softmax mit `occluded` auf Index 13. Seit dem 2026-08-20
liegen nur noch diese beiden im APK — die sechs 2-Klassen-Modelle und `occl14-80` sind raus:

| Modell | Klassen | `coverage_output` | `pOccluded` kommt aus |
|---|---|---|---|
| `real14-80` (Default) | 14 | nein | Softmax-Klasse 13 |
| `id35-80` | 13 | nein | `0.0` — blind |

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
