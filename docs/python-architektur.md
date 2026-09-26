# Python: ein Besitzer je Aufnahme-Datei (2026-09-23)

`realgames.py` (2357 Zeilen) und `sessions.py` (1438) besassen beide Teile derselben Aufnahme:
Pfade, `log.jsonl` mit Stempel-Riegel, `candidate.json`, `reference.pgn`, den Export-Marker, die
Bretter. Vorbild ist die Web-App (`docs/web-architektur.md`, `lib/session-store/`) und im Kleinen
`session_store/matte.py`: **jede Datei einer Aufnahme hat EINEN Besitzer im Code.**

## Schnitt

| Modul | Besitzt / tut |
|---|---|
| `session_store/names.py` | die EINZIGEN Literale der Aufnahme-Dateinamen und -Ordner (`tests/test_recording_files.py` waecht per Syntaxbaum) |
| `session_store/matte.py` | `matte.jsonl`-Historie: juengste Zeile je Frame, coverage-lose Zeile = SAM-Absage |
| `session_store/paths.py` | Session-ID -> Ordner (`session_dir`, `all_sessions`), `frame_path`, `session.yaml` (`read_session_meta`, `session_profile`) |
| `session_store/log.py` | `log.jsonl`: `read_log` (mit Stempel, fuer Schreiber; leeres Log wirft) und `read_log_rows` (nur Leser, leer = `[]`), `_write_log` (Stempel-Riegel); beide verweigern unter `.export-running`, `backup_log`, Export-Marker (`mark_export`, `ExportInterrupted`), `write_session` samt `unusable`-Uebertrag, `flag_frame`, `interval-check.jsonl` |
| `session_store/recording.py` | `data/recordings/<name>/`: `game_dir`, `video_path`, `candidate.json`, `reference.pgn`, `ui-meta.json`, `corrections.jsonl`/`review-notes.jsonl`, `quad-fit.json` |
| `session_store/boards.py` | `boards/`, `dirty/`, `mattes/`: Namen, `write_board`, `place_board`/`move_boards` |
| `realgames/confirm.py` | Kandidat gegen Referenz (LCS), Bestaetigung |
| `realgames/timeline.py` | Ply-Intervalle, Frame-Auswahl, `unknown_squares`, Ausbeute |
| `realgames/decode.py` | Video: Drehung, Dekodieren, Frame-Stroeme, `static_quad` |
| `realgames/settle.py` | Settle-Messung am Video |
| `realgames/position.py` | gesetzte Stellung je Intervall aus den Brettern, `interval_moves` |
| `realgames/mesh.py` | 18 Rillen-Linien (`grid_line_fracs`), Sitzungs-Mesh, `hand_seen` |
| `realgames/boards.py` | Grid-Fit je Frame, Bretter gerade schneiden/ziehen |
| `realgames/chunks.py` | dieselben Phasen in Prozess-Abschnitten |
| `realgames/export.py` | `export_session`, `adopt_reported_dirty`, Profil, Korrektur-Buch |
| `realgames/stored.py`, `progress.py` | `fit-stored`; die eine Fortschrittszeile |
| `sessions.py` | Geometrie-Reparatur: `scan`, `autofix`, `adopt`, `fit-mesh`, `repair-mesh`, `mark-hands` |
| `session_lifecycle.py` | Liste, Archiv, Restore, `reviewed`, Loeschen, Trimmen samt Crop-Pools |
| `session_boards.py` | Brett-Verben: `settle-scan`, `boards`, `rewarp`, `straighten`, `park-frames` |

Abhaengigkeiten laufen abwaerts: `realgames/*`, `sessions`, `session_*` -> `session_store/*` ->
`ioutil`/`config`. `session_store` importiert weder `realgames` noch die Session-Verben
(Waechter: `tests/test_python_architektur.py`, auch fuer "`__init__.py` nur Docstring").

## Regeln

- **Umzug, nicht Neuschreiben:** Funktionskoerper verbatim (per AST gegen `HEAD` verglichen;
  einzige Aenderung `sessions.backup_log(...)` -> `backup_log(...)` in `write_session`), nur Importe
  umgebogen. Keine Re-Export-Schicht. CLI-Oberflaeche unveraendert (`tests/test_cli_surface.py`);
  die Web-App ruft Jobs ueber die CLI, Fachregeln ueber den Worker (`docs/web-ruft-python.md`).
- **Patch-Ziel ist der Ort, an dem der Name nachgeschlagen wird:** wer `export_session` testet,
  patcht `realgames.export.detect_rotation`, nicht `realgames.decode`. Lazy Importe lesen den
  Besitzer zur Laufzeit und brauchen nur ihn. `confirm` bindet `game_dir` in `realgames.confirm`
  UND `session_store.recording` — die Tests patchen beide.

## training/ (2026-09-23)

`train.py` (1521 Zeilen) trug Rezept, Futterweg, Schleife, Checkpoint-Wahl, Metriken, Temperatur
und den GPU-Riegel in EINER Funktion; der Pack-Zugriff lag ueber `pack.py`, `packs.py`,
`pack_bake.py` und `torch_data.py` verteilt, Manifest/Split/`config.json` hatten je zwei bis drei
Leser. Schnitt nach Aufgabe:

| Modul | Besitzt / tut |
|---|---|
| `train.py` | `run_train`: Vorbedingungen, Seeds, `recipe = dict(locals())`, Reihenfolge der Schritte — sonst nichts |
| `train_recipe.py` | Rezept: `aug_policy`, `batch_photometric`, `build_run_model`, `warm_start`, `loss_weights`, `build_criterion`, `build_optimizer`, `run_config` (die `config.json`), `Refused` |
| `train_feed.py` | Futterweg: `data_files`/`read_data`, `train_size`, `training_rows`, `build_datasets`, `train_feed` (Worker, Sampler, Loader), `_device_batches` |
| `train_loop.py` | Schleife: `train_epoch`, `run_epochs`, `state.pt` (`_save_state`/`_load_state`), `resume_progress`, SWA |
| `checkpoint.py` | Checkpoint-Wahl: `_checkpoint_rank`, `Progress`, `keep_checkpoints` |
| `epoch_metrics.py` | Metriken/Diagnostik einer Epoche: `score_epoch`, `occlusion_diagnostics`, `epoch_record` (`metrics.jsonl`) |
| `temperature.py` | `fit_temperature`, `calibrate_run`, `_record_temperature` |
| `train_lock.py` | `heavy*.lock`, den auch der Autopilot liest |
| `packs.py` | **Pack-Zugriff, die EINE Leseschicht:** Session- und Datensatz-Pack, `open_dataset_pack` (train, eval, gradcam), `load_packed`, `open_packed_rows`, Memmap/pread-Leser, Zeile -> Position (`_pack_index`), eingebackene Transformation (`cfg_for_pack`, `skip_baked`) |
| `pack_dataset.py`, `pack_session.py`, `pack_bake.py` | nur SCHREIBEN: Datensatz-Pack, Session-Pack (`write_meta`), gebackener Pack |

Zusammengefuehrt: `cell_rule.coverage_of`/`brightness_of` (vorher `torch_data` und `train`, dazu
inline in `classification_eligible`); `dataset.load_manifest`/`load_split` (vorher auch in
`training/data.py`, dort mit anderer Meldung); `data.dataset_paths`/`unnamed_pin` (Pfade und Pin-
Riegel aus `train`, `run_eval` und dem geloeschten `run_data_paths`); `runs.read_run_config` (torch-frei; evaluate, quantize,
Warmstart, serving, retime, bake, Temperatur, occluded_model); `pack_dataset._pack_chunk` dekodiert ueber `decode_crop` statt einer Kopie davon.
Ausserhalb von `training/` (2026-09-26): `sessions.sweep` (statt `fit_mesh_all`/`repair_mesh_all`/
`mark_hands_all`); in `matte` `_recut_start` (Kopf der drei Recuts), `coverage_fields` (vorher sechs
Kopien von `cells_over_half`) und `_crossed`; `dataset.write_dataset_files` (Manifest/Split/Stats fuer
klassischen und Synth-Bau); `matte_publish` als einziger Weg, ein Alpha zu veroeffentlichen
(`docs/session-mattes.md` §3); `temporal_matte._proposals` als gemeinsamer Vorspann von `adopt`
und `upsert`.

- **Profil einer Aufnahme: EIN Weg** (2026-09-26), `session_store.paths.session_profile`.
  Messende/schreibende Aufrufer rufen `allow_standin=False` (`--profile` als `override=`);
  leeres oder profilloses `session.yaml` wirft `FileNotFoundError` statt `KeyError`/`TypeError`,
  ein fehlendes auch unter `override`. Die `session temporal-*`-Befehle und
  `sensor_audit` melden das als `[ERR]`. Seit 2026-09-26 ruft auch kein Skript mehr
  `labeling._profile_for_session`.

- **Rezept als ein Wert:** `run_train` haelt seine Argumente als `recipe`; die Schritte lesen
  daraus, was `run_train` nicht veraendert, und bekommen Abgeleitetes (`rot90`, Worker) explizit.
- **Bitgleich festgehalten:** `tests/test_train_characterization.py` faehrt `run_train` auf der CPU
  in vier Szenarien (Datei-Loader, Monolith-Pack mit SWA/Hard-Negatives, Session-Packs im
  Brettmodus, Focal mit `--batch-aug`) und vergleicht `config.json`, `metrics.jsonl` (ohne Wanduhr)
  und Gewichte mit Digests vom Stand vor dem Umbau. Gegenprobe: anderer Seed -> rot.
- **Abhaengigkeiten:** `packs` importiert keinen Schreiber und kein torch; kein Schritt importiert
  `train` (Waechter: `tests/test_python_architektur.py`).

## Offen

- `--swa` mit `--batch-aug` starb im Charakterisierungslauf in `update_bn` (uint8-Batch ohne
  Photometrie) — unveraendert gelassen, darum faehrt kein Szenario beides.
- SonarCloud-Umfang: `tests/test_sonar_scope.py` haelt ihn unter 46 000 ncloc (Sonar lehnt ab
  50 000 ab); nach dem Umbau stand er knapp darunter.
