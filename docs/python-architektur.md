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

## Offen

- nichts
