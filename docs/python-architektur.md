# Python: ein Besitzer je Aufnahme-Datei (2026-09-23)

`realgames.py` (2357 Zeilen) und `sessions.py` (1438) besassen beide Teile derselben Aufnahme:
Pfade, `log.jsonl` mit Stempel-Riegel, `candidate.json`, `reference.pgn`, den Export-Marker, die
Bretter. Vorbild ist die Web-App (`docs/web-architektur.md`, `lib/session-store/`) und im Kleinen
`session_store/matte.py`: **jede Datei einer Aufnahme hat EINEN Besitzer im Code.**

## Schnitt (Zeilen)

| Modul | Besitzt / tut |
|---|---|
| `session_store/names.py` | die EINZIGEN Literale der Aufnahme-Dateinamen und -Ordner (`tests/test_recording_files.py` waecht per Syntaxbaum) |
| `session_store/matte.py` | `matte.jsonl`-Historie: juengste Zeile je Frame, coverage-lose Zeile = SAM-Absage |
| `session_store/paths.py` (128) | Session-ID -> Ordner (`session_dir`, `all_sessions`), `frame_path`, `session.yaml` (`read_session_meta`, `session_profile`) |
| `session_store/log.py` (237) | `log.jsonl`: `read_log`/`_write_log` (Stempel-Riegel), `backup_log`, Export-Marker (`mark_export`, `ExportInterrupted`), `write_session` samt `unusable`-Uebertrag, `flag_frame`, `interval-check.jsonl` |
| `session_store/recording.py` (229) | `data/recordings/<name>/`: `game_dir`, `video_path`, `candidate.json`, `reference.pgn`, `ui-meta.json`, `corrections.jsonl`/`review-notes.jsonl`, `quad-fit.json` |
| `session_store/boards.py` (102) | `boards/`, `dirty/`, `mattes/`: Namen, `write_board`, `place_board`/`move_boards` |
| `realgames/confirm.py` (114) | Kandidat gegen Referenz (LCS), Bestaetigung |
| `realgames/timeline.py` (306) | Ply-Intervalle, Frame-Auswahl, `unknown_squares`, Ausbeute |
| `realgames/decode.py` (206) | Video: Drehung, Dekodieren, Frame-Stroeme, `static_quad` |
| `realgames/settle.py` (200) | Settle-Messung am Video |
| `realgames/position.py` (216) | gesetzte Stellung je Intervall aus den Brettern, `interval_moves` |
| `realgames/mesh.py` (154) | 18 Rillen-Linien (`grid_line_fracs`), Sitzungs-Mesh, `hand_seen` |
| `realgames/boards.py` (251) | Grid-Fit je Frame, Bretter gerade schneiden/ziehen |
| `realgames/chunks.py` (137) | dieselben Phasen in Prozess-Abschnitten |
| `realgames/export.py` (394) | `export_session`, `adopt_reported_dirty`, Profil, Korrektur-Buch |
| `realgames/stored.py` (93), `progress.py` (23) | `fit-stored`; die eine Fortschrittszeile |
| `sessions.py` (571) | Geometrie-Reparatur: `scan`, `autofix`, `adopt`, `fit-mesh`, `repair-mesh`, `mark-hands` |
| `session_lifecycle.py` (380) | Liste, Archiv, Restore, `reviewed`, Loeschen, Trimmen samt Crop-Pools |
| `session_boards.py` (256) | Brett-Verben: `settle-scan`, `boards`, `rewarp`, `straighten`, `park-frames` |

Abhaengigkeiten laufen abwaerts: `realgames/*`, `sessions`, `session_*` -> `session_store/*` ->
`ioutil`/`config`. `session_store` importiert weder `realgames` noch die Session-Verben
(Waechter: `tests/test_python_architektur.py`, auch fuer "`__init__.py` nur Docstring").

## Regeln

- **Umzug, nicht Neuschreiben:** Funktionskoerper verbatim (per AST gegen `HEAD` verglichen;
  einzige Aenderung `sessions.backup_log(...)` -> `backup_log(...)` in `write_session`), nur Importe
  umgebogen. Keine Re-Export-Schicht. CLI-Oberflaeche unveraendert (`tests/test_cli_surface.py`);
  die Web-App ruft nur die CLI (`platform/app/lib/chain/jobs.ts`).
- **Patch-Ziel ist der Ort, an dem der Name nachgeschlagen wird:** wer `export_session` testet,
  patcht `realgames.export.detect_rotation`, nicht `realgames.decode`. Lazy Importe lesen den
  Besitzer zur Laufzeit und brauchen nur ihn. `confirm` bindet `game_dir` in `realgames.confirm`
  UND `session_store.recording` — die Tests patchen beide.
- `scripts/check_alignment.py` (Nutzer-Verbot) liest `sessions.session_dir` und
  `sessions.missing_source_frames` — beide bleiben dort, weil `sessions.py` sie selbst benutzt.

## training/ (2026-09-23)

`train.py` (1521 Zeilen) trug Rezept, Futterweg, Schleife, Checkpoint-Wahl, Metriken, Temperatur
und den GPU-Riegel in EINER Funktion; der Pack-Zugriff lag ueber `pack.py`, `packs.py`,
`pack_bake.py` und `torch_data.py` verteilt, Manifest/Split/`config.json` hatten je zwei bis drei
Leser. Schnitt nach Aufgabe:

| Modul | Besitzt / tut |
|---|---|
| `train.py` (245) | `run_train`: Vorbedingungen, Seeds, `recipe = dict(locals())`, Reihenfolge der Schritte — sonst nichts |
| `train_recipe.py` (439) | Rezept: `aug_policy`, `batch_photometric`, `build_run_model`, `warm_start`, `loss_weights`, `build_criterion`, `build_optimizer`, `run_config` (die `config.json`), `Refused` |
| `train_feed.py` (461) | Futterweg: `data_files`/`read_data`, `train_size`, `training_rows`, `build_datasets`, `train_feed` (Worker, Sampler, Loader), `_device_batches` |
| `train_loop.py` (270) | Schleife: `train_epoch`, `run_epochs`, `state.pt` (`_save_state`/`_load_state`), `resume_progress`, SWA |
| `checkpoint.py` (42) | Checkpoint-Wahl: `_checkpoint_rank`, `Progress`, `keep_checkpoints` |
| `epoch_metrics.py` (156) | Metriken/Diagnostik einer Epoche: `score_epoch`, `occlusion_diagnostics`, `epoch_record` (`metrics.jsonl`) |
| `temperature.py` (80) | `fit_temperature`, `calibrate_run`, `_record_temperature` |
| `train_lock.py` (135) | `heavy*.lock`, den auch der Autopilot liest |
| `packs.py` (574) | **Pack-Zugriff, die EINE Leseschicht:** Session- und Datensatz-Pack, `open_dataset_pack` (train, eval, gradcam), `load_packed`, `open_packed_rows`, Memmap/pread-Leser, Zeile -> Position (`_pack_index`), eingebackene Transformation (`cfg_for_pack`, `skip_baked`) |
| `pack_dataset.py` (360), `pack_session.py` (166), `pack_bake.py` (100) | nur SCHREIBEN: Datensatz-Pack, Session-Pack (`write_meta`), gebackener Pack |

Zusammengefuehrt: `cell_rule.coverage_of`/`brightness_of` (vorher `torch_data` und `train`, dazu
inline in `classification_eligible`); `dataset.load_manifest`/`load_split` (vorher auch in
`training/data.py`, dort mit anderer Meldung); `data.dataset_paths`/`unnamed_pin` (Pfade und Pin-
Riegel aus `train`, `run_eval` und dem geloeschten `run_data_paths`); `data.read_run_config` (evaluate, quantize,
Warmstart); `pack_dataset._pack_chunk` dekodiert ueber `decode_crop` statt einer Kopie davon.

- **Rezept als ein Wert:** `run_train` haelt seine Argumente als `recipe`; die Schritte lesen
  daraus, was `run_train` nicht veraendert, und bekommen Abgeleitetes (`rot90`, Worker) explizit.
- **Bitgleich festgehalten:** `tests/test_train_characterization.py` faehrt `run_train` auf der CPU
  in vier Szenarien (Datei-Loader, Monolith-Pack mit SWA/Hard-Negatives, Session-Packs im
  Brettmodus, Focal mit `--batch-aug`) und vergleicht `config.json`, `metrics.jsonl` (ohne Wanduhr)
  und Gewichte mit Digests vom Stand vor dem Umbau. Gegenprobe: anderer Seed -> rot.
- **Abhaengigkeiten:** `packs` importiert keinen Schreiber und kein torch; kein Schritt importiert
  `train` (Waechter: `tests/test_python_architektur.py`).

## Offen

- `synth/measure_noise.py` importierte `training.pack._manifest_digest` und ist mit umgebogen.
- `occluded_model.run_config`/`model_classes` lesen die `config.json` weiter selbst: ein Import aus
  `training` zoege ueber `training/__init__.py` torch nach.
- `--swa` mit `--batch-aug` starb im Charakterisierungslauf in `update_bn` (uint8-Batch ohne
  Photometrie) — unveraendert gelassen, darum faehrt kein Szenario beides.
- SonarCloud-Umfang (`tests/test_sonar_scope.py`) steht nach dem Umbau bei ~45 990 von 46 000.
- Andere `docs/` (`packs.md`, `training-speed.md`, ...) nennen noch `training/pack.py` und
  `train.py`-Stellen; der Auftrag erlaubte nur diese Datei.
