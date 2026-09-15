# Die vier `pack`-Artefakte (Stand 2026-09-15)

Vier verschiedene Dinge heissen `pack`, jedes mit einer eigenen `manifest.jsonl`. Zwei davon
trennt **ein Buchstabe im Modulnamen** (`training/pack.py` gegen `training/packs.py`). Dieses
Dokument gibt jedem einen eindeutigen Namen und sagt, woran man sie auf der Platte unterscheidet.

Die Module werden **nicht** umbenannt — das rippelt durch jeden Import und kauft wenig. Die Namen
unten sind die, die in Doku, Commit-Nachrichten und Gespraech gelten.

| Name | Liegt in | Schreibt | Liest | Modul |
|---|---|---|---|---|
| **Datensatz-Pack** | `data/datasets/<name>/` | `chesslab dataset build` (ohne `--no-pack`) | `PackedSquareDataset` | `training/pack.py` |
| **Session-Pack** | `data/packs/<session>-<size>/` | `chesslab session pack` | `MultiPack`, `--from-packs` | `training/packs.py`, `training/pack_session.py` |
| **Kotlin-Pack** | `data/realgames/<n>/training-pack/` | `labeled-video-pack` (Desktop, Kotlin) | `chesslab pack import`, `platform/app/lib/packs.ts` | `desktop/LabeledVideoPack.kt` |
| **Crop-Pool** | `data/crops/<tag>/` | `chesslab slice` | der Mensch (Labeling-Lane), `dataset build` | `labeling.py` |

## Woran man sie auseinanderhaelt

**Der Crop-Pool ist der einzige mit echten Dateien.** `<label>/*.webp` je Crop, 128 px, und seine
`manifest.jsonl` traegt in `path` einen Dateipfad. Er ist das Artefakt fuer den MENSCHEN; alle
anderen drei sind Memmaps fuer das Modell (`docs/data-pipeline.md` 3.1, `CLAUDE.md` 0.1).

**Die drei Memmap-Packs erkennt man am `path`-Feld ihrer Zeilen:**

- **Datensatz-Pack** — `path` ist weiterhin der Crop-Pfad des Pools. Der Pack ist ein *Cache
  neben* der `manifest.jsonl` des Datensatzes (`packed_images.u8` + `packed_meta.json`, dessen
  `paths` den Pfad auf den Zeilenindex abbildet). Ohne ihn faellt das Training auf den
  Datei-Loader zurueck — seit 2026-08-24 bricht `_require_pack` stattdessen ab.
- **Session-Pack** — `path` ist `mm://<pack>/<frame>/<square>`. Der Pack IST die Zeile, nicht ihr
  Cache; ein Datensatz zitiert ihn, statt die Pixel zu kopieren (`docs/session-packs.md`).
- **Kotlin-Pack** — dasselbe `mm://`-Format, aber ohne `-<size>`-Suffix im Namen und mit einer
  `summary.json` daneben, die kein Python-Pack hat. `chesslab pack import` verschiebt ihn unter
  `data/packs/` und laesst den Namen stehen, den seine Zeilen nennen.

Ein Verzeichnis unter `data/realgames/<n>/` heisst kanonisch `training-pack/`; Varianten
(`training-pack-fast`, `-safe-dense`, …) liegen daneben und werden nie aufsummiert
(`platform/app/lib/packs.ts`).

## Die Falle, die daraus schon entstanden ist

`training/packs.py` importiert `_manifest_digest` aus `training/pack.py`. Wer die beiden
verwechselt, sucht die Session-Pack-Logik im Datensatz-Modul und findet dort eine Funktion
desselben Namens, die auf einer anderen `manifest.jsonl` rechnet.

Und: **ein Pack ist unveraenderlich, aber nicht automatisch aktuell.** Ein Session-Pack vom
2026-09-05 trug 3 333 Zeilen zu viel und Pixel bis 68 Graustufen daneben. Nach einem Re-Slice die
Packs der Aufnahme wegwerfen — nichts huetet das.
