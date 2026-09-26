# Packs — was so heisst, wie Datensätze auf Session-Packs stehen, und was gebacken wird

## 1. Die vier `pack`-Artefakte

Vier Dinge heissen `pack`, jedes mit eigener `manifest.jsonl`. Die Namen unten gelten in Doku,
Commits und Gespräch. Gelesen wird jeder Memmap-Pack über `training/packs.py` (die eine
Leseschicht, `docs/python-architektur.md`).

| Name | Liegt in | Modul |
|---|---|---|
| **Datensatz-Pack** | `data/datasets/<name>/` | `training/pack_dataset.py` |
| **Session-Pack** | `data/packs/<session>-<size>/` | `training/pack_session.py` |
| **Kotlin-Pack** | `data/realgames/<n>/training-pack/` | `desktop/LabeledVideoPack.kt` |
| **Crop-Pool** | `data/crops/<tag>/` | `labeling.py` |

Geschrieben von `chesslab dataset build`, `chesslab session pack`, `labeled-video-pack` (Desktop)
und `chesslab slice`; gelesen von `PackedSquareDataset`, `MultiPack`/`--from-packs`,
`chesslab pack import`/`lib/corpus/packs.ts` und vom Menschen (Labeling-Lane) bzw. `dataset build`.

- **Der Crop-Pool ist der einzige mit echten Dateien** (`<label>/*.webp`, 128 px) — das Artefakt
  für den MENSCHEN. Die drei anderen sind Memmaps für das Modell.
- **Datensatz-Pack**: `path` bleibt der Crop-Pfad des Pools; der Pack ist ein *Cache neben* der
  `manifest.jsonl` (`packed_images.u8` + `packed_meta.json`). Fehlt er, bricht `_require_pack` ab.
- **Session-Pack**: `path` ist `mm://<pack>/<frame>/<square>`. Der Pack IST die Zeile; ein
  Datensatz zitiert ihn, statt die Pixel zu kopieren.
- **Kotlin-Pack**: dasselbe `mm://`-Format, ohne `-<size>`-Suffix, mit `summary.json` daneben.
  `data/realgames/` existiert nicht mehr (2026-09-22) — die Zeile beschreibt das Format.

## 2. Session-Packs: jede Aufnahme einmal, jeder Datensatz nur ein Zitat (2026-09-11)

Vorher hielten `real13-mix-v6-128`, `-80` und `-80-clahe` zusammen 73,7 GB für dieselben 841 521
Zeilen aus denselben 160 Aufnahmen. Jetzt liegen die Pixel einer Aufnahme **einmal je Größe**
unter `data/packs/<session>-<größe>/`; drei Datensatz-Varianten kosten 1 GB statt 124 GB.

### Zwei Schreibwege, weil es zwei Quellen gibt

| Aufnahme | Schreiber | Pixelquelle |
|---|---|---|
| `rg-…` mit `boards/` | `pack_session.write_session_pack` | Brett, über `crop_square` |
| `comp-…` (nur Pool) | `pack_session.write_pool_pack` | `pack_dataset.decode_crop` auf die Pool-`.webp` |

- Für ein Komposit ist der Pool die Quelle — „beide aus der Quelle schneiden“ ist eingehalten.
- **Der Pool muss benannt werden** (`--pool`): 104 von 160 Aufnahmen liegen in mehr als einem Pool,
  36 in genau zweien, mit verschiedenen Pixeln (nachgezählt 2026-09-22 über
  `data/crops/*/<klasse>/`).
- **Der Pack friert ein, was der Slice skaliert hat**: Kompositen mit `board_size` 656/672 haben
  eine Crop-Box von 90–92 px und sind bei 128 px **1,4× hochinterpoliert** — 105 152 Zeilen, 12,5 %.
  Keine neue Verschlechterung (der Monolith trug dieselben Bytes), aber wer sie aus der Quelle neu
  schneiden will, muss die Packs neu schreiben.

### Bitgleich zum Monolithen

Beide Schreiber rufen dieselben Funktionen wie der Monolith
(`test_pool_pack_pixels_are_the_decoder_the_monolithic_pack_used`). Gemessen **30 580 Zeilen über
alle 160 Aufnahmen, 0 ungleich**, dazu 20 000 Zufallszeilen je Größe vor dem Löschen der Memmaps.
`chesslab eval` desselben Laufs gegen Pack- und Monolith-Datensatz: **jedes Metrikfeld identisch**.

**`--split-file` beim Vergleich NICHT weglassen.** Ohne ihn nimmt `eval` gegen den eigenen
Datensatz des Laufs dessen `config.json["split_file"]`, gegen einen fremden dessen `split.json` —
dann vergleicht man zwei Zeilenmengen und hält den Unterschied für einen Pack-Fehler.

### So wird gebaut

```
chesslab session pack --session <rg-id> --size 128
chesslab session pack --session <comp-id> --size 128 --pool comp13-v3
chesslab dataset build <name> --sessions <ids> --from-packs --pack-size 128x128
python scripts/pack_dataset_sessions.py --dataset <spender> --size 128 [--dry-run]
```

`--pack-size` wählt bei `--from-packs`, **welcher** Pack genommen wird (Vorgabe 80×80), skaliert
nicht. `dataset.yaml` trägt danach `packs:`, `train`/`eval` lesen sie über
`resolve_dataset_packs`. Das Skript ist wiederaufnehmbar; der ganze Korpus (160 Packs, 41,4 GB)
dauert gut 30 Minuten in EINEM Prozess, ~2,5 ms/Crop.

### Die Migration: umgehängt, nicht neu gebaut

Ein `--like … --from-packs`-Zwilling ist der Weg für einen NEUEN Datensatz. Für einen bestehenden
ist er falsch: der Brettweg schneidet live, der Pool war ein Schnappschuss, und der Zwilling trug
**228 Zeilen mehr** — jeder alte Lauf wäre unvergleichbar. Deshalb wurde in den v6-Manifesten
**nur die Spalte `path`** auf `mm://` gedreht; Zeilen, Splits und jede `config.json` gelten weiter.

Stand 2026-09-22: die v6-Verzeichnisse messen 916/915 MB, weil `manifest.jsonl.mono` und
`.before-prune` daneben liegen — kein Memmap ist zurück. **`real13-mix-v6-80-clahe` ist Monolith
nach der `path`-Spalte** (`data/crops/default/…`), trägt aber kein `packed_images.u8` mehr.
`data/packs/` hält 323 Packs (162 × 128, 161 × 80), 69,2 GB.

## 3. Ein Pack ist unveränderlich, aber NICHT automatisch aktuell

Ein Session-Pack vom 2026-09-05 trug **3 333 Zeilen zu viel** und Pixel bis **68 Graustufen**
daneben — die Aufnahme war dazwischen neu geschnitten worden, und `--from-packs` hätte ihn still
genommen. (Geparkt unter `data/_parked/`, frisch neu geschrieben.)

- **Nach jedem Re-Slice einer Aufnahme deren Packs wegwerfen und neu schreiben**
  (`chesslab session pack --replace`). Ein Pack ist unveränderlich, einen Mittelweg gibt es nicht.
- Gehütet wird seit 2026-09-20 über `_rewritten_since_pack` (`training/packs.py`): `(mtime, size)`
  jedes Crops gegen `crop_fingerprint` aus `packed_meta`. **Blind** bei `mm://`-Zeilen (keine Datei)
  und bei Altpacks ohne Fingerabdruck.
- `scripts/pack_dataset_sessions.py` meldet Packs, die älter sind als das Spender-Manifest, als
  `STALE?` und löscht nichts — eine Zeitstempel-Heuristik, kein Beweis.

### Offen

- **`--phash` mit `--from-packs`** ist ein ungemeldeter Fehler: `dedup_phash` öffnet den Zeilenpfad
  als Datei.
- **Ein gebackener Session-Pack** (`<sid>-80-clahe`) bräuchte eine Auswahl in `_pack_manifests`
  (`dataset_build.py`), die roh und gebacken unterscheidet; `bake_pack` backt nur einen
  Datensatz-Pack.

## 4. CLAHE in den Pack backen (`chesslab dataset bake`, 2026-09-07)

Nur `Resize` und CLAHE stehen VOR dem ersten Würfel und sind je Crop deterministisch; alles
dahinter einzubacken hieße, 60 Epochen lang dieselbe Verzerrung zu zeigen.

- **Die Größe ist die Bedingung.** CLAHE läuft nach dem Resize (Kacheln `out_size / tile`), also
  ist der gebackene Pack nur in der Trainingsgröße derselbe Operator.
- **Bringt wenig**: Trainings-Kette 1402 → 1300 µs/Crop (7 %), Val-Kette 279 → 174 µs (38 %, weil
  ohne CLAHE der Zero-PIL-Schnellpfad greift). Der große Posten waren ColorJitter und Blur (55 %) —
  gelöst durch `--batch-aug` (`docs/training-speed.md`).
- **Kein Flag nötig**: `train` liest `packed_meta.json["baked"]` und lässt CLAHE aus dem Loader,
  schreibt die Werte aber weiter in `config.json` — **das Serving sieht rohe Kamerabilder und muss
  den Operator selbst rechnen.**
- `pack_bake.skip_baked` bricht ab statt still zu rechnen, wenn der Pack gebacken ist und der Lauf
  ohne CLAHE will, wenn die CLAHE-Werte abweichen, oder wenn `--input-size` nicht der Packgröße
  entspricht.
- Der gebackene Datensatz trägt dieselben Zeilen und dieselben `split*.json` wie das Original.

```
chesslab dataset bake <quelle> <quelle>-clahe --model data/models/p4a-80-clahe
```

**CLAHE auf der GPU nachzubauen lohnt nicht** (gemessen 2026-09-07): der Nachbau traf `cv::CLAHE`
auf 80 von 256 Graustufen (bei `clipLimit` 2,0 kippt ein Rundungsfehler die LUT der Kachel). Das
Gerät rechnet `Imgproc.createCLAHE`, gebacken wird im Pack; das Modul ist gelöscht.
