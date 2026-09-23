# Datensätze aus Session-Packs — jede Aufnahme einmal, jeder Datensatz nur noch ein Zitat

**Stand 2026-09-11.** Geschrieben, weil die Platte voll läuft: `real13-mix-v6-128` (41,4 GB),
`real13-mix-v6-80` (16,2) und `real13-mix-v6-80-clahe` (16,2) halten zusammen **73,7 GB** für
**dieselben 841 521 Zeilen** aus **denselben 160 Aufnahmen** — je einmal pro Größe neu kopiert
(`packed_meta.json` aller drei: `n` 841 521).

Ein Session-Pack dreht das um. Die Pixel einer Aufnahme liegen **einmal** je Größe unter
`data/packs/<session>-<größe>/`, und ein Datensatz **zitiert** sie über `mm://`-Pfade, statt sie zu
kopieren. Eine weitere Fold-Variante, ein `--add-test`, ein zweiter Zuschnitt derselben Sessions
kostet danach Metadaten (ein paar hundert MB Manifest) statt zweistelliger Gigabyte.

---

## 1. Zwei Schreibwege, weil es zwei Quellen gibt

Der monolithische Pack hatte diese Trennung schon — `cut_plan` (`training/pack.py:177`) teilt die
Zeilen danach auf, ob die Aufnahme ein `boards/`-Verzeichnis hat (`:194`). Die Session-Packs haben
jetzt dieselbe Trennung, und das ist der Grund, warum die Bytes gleich bleiben.

| Aufnahme | hat | Schreiber | Pixelquelle |
|---|---|---|---|
| `rg-…` (22) | `data/recordings/<ts>/boards/` | `pack_session.write_session_pack` (`:24`) | Brett, über `labeling.iter_session_crops` → `crop_square` |
| `comp-…` (138) | nur Pool-Dateien | `pack_session.write_pool_pack` (`:42`) | `training.pack.decode_crop` (`pack.py:152`) auf `data/crops/<tag>/…webp` |

**Warum die Kompositen den Dateiweg nehmen und das kein Rückschritt ist.** `data/sessions/` ist
leer, das Archiv trägt nur `rg-`-Sessions, und ein Komposit hat kein Brett — die Pool-Datei IST
seine Quelle. `CLAUDE.md` §0.1 („beide AUS DER QUELLE schneiden") ist damit eingehalten, nicht
verletzt: für ein Komposit ist der Pool die Quelle.

**Der Pool muss benannt werden.** Von den 90 Kompositen aus `comp13-v3` liegen **54 auch in
`comp13-v4`**, mit verschiedenen Pixeln (die übrigen 48 der 138 kommen aus `turntable-clean`). `--pool` ist deshalb Pflicht statt geraten; das
Migrationsskript nimmt die Pools, die die `dataset.yaml` des Spender-Datensatzes unter
`source_manifest` nennt.

**Was der Pack einfriert.** Die 128-px-Pooldatei trägt schon, was der Slice skaliert hat: die
Kompositen mit `board_size` 656/672 haben eine Crop-Box von 90–92 px und sind bei 128 px **1,4×
hochinterpoliert** — 105 152 Zeilen, 12,5 % des Datensatzes (`docs/plan-98/00-plan.md` §1.4).
Der Pack schreibt das fest. Das ist **keine neue** Verschlechterung (der Monolith trug exakt
dieselben Bytes), aber wer diese Zeilen je aus der Quelle neu schneiden will
(`pack.pack_from_source`, seit dem Brett-Umbau ohne Aufrufer), muss die betroffenen Packs neu
schreiben — ein Pack ist unveränderlich.

---

## 2. Der Bitgleichheits-Beweis

Anforderung: eine Manifest-Zeile muss aus dem Pack **exakt dieselben Bytes** liefern wie aus
`data/datasets/real13-mix-v6-128/packed_images.u8`. Sonst sind Modelle von vor und nach der
Umstellung nicht vergleichbar.

**Konstruktiv.** Beide Schreiber rufen dieselben Funktionen wie der Monolith:
`decode_crop` (`pack.py:152`) ist aus `_decode_chunk` herausgezogen und wird von beiden benutzt;
der Brettweg geht durch `crop_square`, wie `_cut_session` (`pack.py:127`). Ein Test hält das fest
(`tests/test_session_pack.py::test_pool_pack_pixels_are_the_decoder_the_monolithic_pack_used`).

**Gemessen**, Zeile für Zeile gegen den 41-GB-Monolithen:

| Prüfung | Zeilen | ungleich |
|---|---:|---:|
| Vollständige Packs, 3 Aufnahmen (1 `rg`, 1 `comp13-v3`, 1 `turntable-clean`) | 1 984 | **0** |
| Vollständige Packs, 2 Kompositen `board_size` 672 (die 1,4×-Gruppe) | 18 880 | **0** |
| Stichprobe über **alle 160** Aufnahmen, 24 Zeilen je Aufnahme | 3 840 | **0** |
| `rg`, über die ganze Aufnahme gestreut (8 Zellen je 8. Bild, Deckel 200/Aufnahme) | 3 316 | **0** |
| Dasselbe bei **80 px** gegen `real13-mix-v6-80`, alle 160 Aufnahmen | 2 560 | **0** |
| **Summe** | **30 580** | **0** |

Maximale Kanaldifferenz über alle verglichenen Zeilen: **0**.

**Gegenprobe über die Metrik, nicht nur über die Bytes.** Derselbe Lauf
(`data/models/_arch128v6/rot-s42`) gegen dieselben drei Aufnahmen, einmal aus dem Pack-Datensatz
und einmal aus dem Monolithen:

```
chesslab dataset build packtest --sessions <3 ids> --from-packs --pack-size 128x128 --allow-degenerate
chesslab eval --run data/models/_arch128v6/rot-s42 --dataset packtest --split all
chesslab eval --run data/models/_arch128v6/rot-s42 --dataset real13-mix-v6-128 --split all --sessions <3 ids>
```

`eval_all__packtest.json` und `eval_all.json` sind in **jedem** Metrikfeld identisch. Der
Pack-Datensatz hat dabei **kein eigenes Memmap** — sein Verzeichnis enthält nur `manifest.jsonl`,
`split.json`, `stats.json`, `dataset.yaml`.

**Und dasselbe am ganzen Korpus.** `real13-mix-v6-128p` ist der `--like`-Zwilling aus allen 160
Packs; sein Test-Split ist zeilengleich zum Spender (128 744 Zeilen, dieselben 8 Aufnahmen).

```
chesslab eval --run data/models/_arch128v6/rot-s42 --dataset real13-mix-v6-128p --split test --split-file split.json
chesslab eval --run data/models/_arch128v6/rot-s42 --dataset real13-mix-v6-128  --split test --split-file split.json
```

`square_acc` 0,9468436804 auf beiden Seiten, und **jedes** Feld der beiden JSONs ist gleich —
`board_acc`, `per_session`, `recall`, alles. Der Datensatz misst 314 MB gegen 41,4 GB.

**`--split-file` hier NICHT weglassen.** Ohne ihn nimmt `eval` gegen den EIGENEN Datensatz des
Laufs dessen `config.json["split_file"]` (hier `split-pin.json`, ein anderer Val/Test) und gegen
einen fremden Datensatz dessen `split.json` — dann vergleicht man zwei verschiedene Zeilenmengen
und hält den Unterschied für einen Pack-Fehler (`training/evaluate.py:94`).

**Was NICHT bewiesen ist.** Bei 80 px ist nur die Stichprobe gefahren, kein vollständiger Pack.
Und die Prüfung sagt nichts über Zeilen, die der Pool nach dem Bau des Monolithen bekommen hätte —
ein Re-Slice macht jeden Pack ungültig, genau wie er einen Monolithen ungültig macht.

---

## 3. So wird ab jetzt gebaut

```
# 1. je Aufnahme einmal, je Größe einmal
chesslab session pack --session rg-2026-09-06-21-29-35 --size 128
chesslab session pack --session "comp-VID_20260731_222043-03" --size 128 --pool comp13-v3

# 2. der Datensatz zitiert nur noch
chesslab dataset build real13-mix-v7-128 --sessions <ids> --from-packs --pack-size 128x128
```

`--pack-size` wählt bei `--from-packs` **welcher** Pack je Aufnahme genommen wird (Vorgabe 80×80),
nicht eine Skalierung — skaliert wird beim Packen, einmal. `dataset.yaml` trägt danach `packs:`;
`train` und `eval` lesen das über `training.pack.resolve_dataset_packs` (`pack.py:427`) und öffnen
die Packs statt eines Dataset-Memmaps. Ein Pack ist **unveränderlich**: ein zweiter Lauf auf
dasselbe Verzeichnis wird abgewiesen.

Für einen ganzen Datensatz macht das Skript die Zuordnung selbst — Verzeichnis oder Pool — und
überspringt, was schon liegt (also wiederaufnehmbar):

```
python scripts/pack_dataset_sessions.py --dataset real13-mix-v6-128 --size 128 --dry-run
python scripts/pack_dataset_sessions.py --dataset real13-mix-v6-128 --size 128
```

**Gemessen am ganzen Korpus**, EIN Prozess: 151 Packs in **1 795 s**, zusammen mit den neun
vorher geschriebenen **160 Packs, 841 749 Zeilen, 41,4 GB in gut 30 Minuten** (~2,5 ms/Crop). Der
Brettweg ist der schnellere (eine 44 830-Zeilen-Aufnahme in 24 s), der Pool-Weg zahlt je Aufnahme
~5 s fürs erneute Parsen des Pool-Manifests. Der Lauf ist wiederaufnehmbar, also ruhig in Stücken.

---

## 4. Die Migration ist gefahren (2026-09-11)

Beide v6-Datensätze hängen auf Packs, ihre Memmaps sind weg: **57,5 GB frei**.

| Datensatz | vorher | jetzt | Memmap |
|---|---:|---:|---|
| `real13-mix-v6-128` | 41,4 GB | 617 MB | gelöscht |
| `real13-mix-v6-80` | 16,2 GB | 616 MB | gelöscht |
| `real13-mix-v6-80-clahe` | 16,2 GB | 16,2 GB | **bleibt** — siehe unten |
| `data/packs/` | — | 55 GB | 320 Packs (160 × 128, 160 × 80) |

**Nachgemessen 2026-09-22** (`du -sm` auf die Verzeichnisse, `ls data/packs | wc -l`): die
v6-Verzeichnisse messen **916 bzw. 915 MB**, weil `manifest.jsonl.mono` und `.before-prune`
danebenliegen geblieben sind — kein Memmap ist zurück. **`-80-clahe` trägt seine Memmap NICHT
mehr: 317 MB, kein `packed_images.u8`**; es ist weiterhin Monolith im Sinne der `path`-Spalte
(`data/crops/default/…`), aber ohne Pack. `data/packs/` hält **323 Packs (162 × 128, 161 × 80),
69,2 GB**. Die Manifeste der beiden umgehängten Sätze tragen nach einem Prune **841 270** bzw.
**841 271** Zeilen; die 841 521 stehen noch in `manifest.jsonl.mono`/`.before-prune`.

**Umgehängt, nicht neu gebaut.** Ein Zwilling über `--like … --from-packs` ist der Weg für einen
NEUEN Datensatz, aber für einen bestehenden ist er falsch: der Brettweg schneidet live und der
Pool war ein Schnappschuss, also trug der Zwilling **228 Zeilen mehr** als der Monolith (alle in
`rg-2026-09-06-20-27-33`, 94 Frames, kein einziges abweichendes Label). Ein Datensatz mit anderen
Zeilen macht jeden alten Lauf unvergleichbar. Stattdessen wurde in den vorhandenen Manifesten
**nur die Spalte `path`** auf `mm://` gedreht — `label`, `coverage`, `fen`, `ts` stehen Zeile für
Zeile unverändert, `split.json`/`split-pin.json` gelten weiter, jede `config.json` bleibt gültig.
Das Original liegt daneben als `manifest.jsonl.mono` / `dataset.yaml.mono`.

Die drei Bedingungen, und zwar VOR dem Löschen:

1. **Vollständig** — jede der 841 521 Zeilen hat eine Pack-Entsprechung über
   `(session_id, frame, square)`, 0 fehlend, in beiden Größen.
2. **Gleichwertig** — 20 000 zufällige Zeilen des echten Datensatzes, Memmap gegen Pack, je Größe:
   **0 ungleich, größte Kanaldifferenz 0.** Dazu die 30 580 Zeilen aus §2.
3. **Der Konsument liest wirklich die Packs** — `chesslab eval` des fertigen Laufs
   `_arch128v6/rot-s42` bzw. `_arch80v6/rot-s42` gegen den umgehängten Datensatz, gepinnter
   Test-Split: **jede Metrik, jeder Klassen-Recall und beide Per-Session-Blöcke identisch** zum
   Monolithen davor (128: `visible_piece_acc` 0,9840309079, 80: 0,9751019532). `load_packed`
   weist Pack-Datensätze ausdrücklich ab, die Pixel kamen also nicht aus einem Rest-Memmap.
   Eine Epoche `chesslab train` läuft ebenfalls darauf durch.

**`real13-mix-v6-80-clahe` bleibt vorerst ein Monolith.** `pack_bake.bake_pack`
(`training/pack_bake.py:45`) backt CLAHE in das Memmap **eines Datensatzes** und lehnt einen
Datensatz ohne eigenen Pack ab — seit der Umstellung hat also keiner der beiden Spender mehr
einen. Ein gebackener SESSION-Pack (`<sid>-80-clahe`) wäre die Fortsetzung, braucht aber eine
Auswahl in `_pack_manifests` (`dataset_build.py:369`): die findet einen Pack heute nur über
(Session, Größe) und könnte roh und gebacken nicht auseinanderhalten. Bis dahin steht der
`-clahe`-Datensatz unangetastet, oder CLAHE rechnet im Loader (`docs/pack-bake.md`: 7 % Loader-CPU).

**So sieht ein neuer Datensatz ab jetzt aus** — die Packs liegen schon, es kostet nur noch sein
Manifest:

```
chesslab dataset build real13-mix-v7-128 --sessions <ids> --from-packs --pack-size 128x128
```

Drei solche Varianten waren vorher 124 GB und sind jetzt 1 GB.

## 5. Ein Pack ist unveränderlich, aber NICHT automatisch aktuell

Beim 80-px-Durchlauf lag schon ein Pack: `data/packs/rg-2026-08-08-11-59-12-80`, geschrieben am
**2026-09-05**, also vor `real13-mix-v6-80` (2026-09-10). Er trägt **50 310 Zeilen, wo der Datensatz
46 977 hat**, und seine Pixel weichen ab — über 60 gemeinsame Zeilen im Mittel 1,56 Graustufen,
im Maximum **68**. Zwischen beiden Zeitpunkten hat diese Aufnahme einen neuen Schnitt bekommen.

Das ist die eine echte Gefahr dieser Umstellung: `--from-packs` hätte diesen Pack **still**
genommen, und eine von 160 Aufnahmen wäre aus einer anderen Epoche gekommen. Den Monolithen hütet
`_rewritten_since_pack` (`pack.py:395`); einen Pack hütet **nichts**.

Dieser Pack liegt seit 2026-09-11 unter `data/_parked/_parked-rg-2026-08-08-11-59-12-80-stale-20260911-220718` — geparkt, nicht gelöscht, und der Lauf hat ihn frisch neu geschrieben.

Regeln daraus:

- **Nach jedem Re-Slice einer Aufnahme deren Packs wegwerfen und neu schreiben** — dieselbe Regel
  wie „Nach jedem Re-Slice neu packen" (`CLAUDE.md`, „Data & Splits"), nur je Aufnahme statt je
  Datensatz. Ein Pack ist unveränderlich, also gibt es keinen Mittelweg.
- `scripts/pack_dataset_sessions.py` meldet jeden vorhandenen Pack, der **älter als das Manifest
  des Spender-Datensatzes** ist, als `STALE?` und löscht nichts. Das ist eine Heuristik über
  Zeitstempel, kein Beweis — sie fängt den bekannten Fall und ersetzt keinen Vergleich.

---

## 6. Offene Punkte

- **`--phash` kann nicht.** `dedup_phash` öffnet den Zeilenpfad als Datei; bei `mm://` geht das
  nicht. Vorgabe ist ohnehin aus (`config.DedupDefaults`), aber ein `--phash` mit `--from-packs`
  ist heute ein Fehler, der nicht als solcher gemeldet wird.
- **Das Skript liest das Pool-Manifest je Aufnahme neu** (344 128 Zeilen, ~5 s × 90 Kompositen).
  Für einen einmaligen Lauf in Ordnung, für eine Schleife nicht.
- **`pack_from_source` hat weiter keinen Aufrufer.** Wer die 1,4×-Zeilen aus der Quelle schneiden
  will, muss das VOR dem Packen tun — danach steht es im Pack fest.

## Nachtrag aus CLAUDE.md (2026-09-23)

Nachgezaehlt 2026-09-22 ueber `data/crops/*/<klasse>/`: 104 von 160 Aufnahmen liegen in mehr als
einem Pool, 36 davon in genau zweien. Die v6-Verzeichnisse messen 916/915 MB statt 617/616, weil
`manifest.jsonl.mono` und `.before-prune` daneben liegen; `-80-clahe` bleibt Monolith
(`manifest.jsonl` zeigt auf `data/crops/default/`). Ein Pack vom 2026-09-05 trug 3 333 Zeilen zu
viel und Pixel bis 68 Graustufen daneben.
