# Code-Inventar & Cleanup-Briefing (Stand 2026-07-04, Commits bis 92c9d32)

> Für den Cleanup-Agenten vor der GitHub-Veröffentlichung. Listet, was in den
> jüngsten Sessions entstand (behalten — atomar & getestet), was Wegwerf-Charakter
> hat, und die Lizenz-/Attributionslage.

## A. Kern-Code der letzten Sessions — BEHALTEN (getestet, in Benutzung)

### Move-Tracker v2 (specs/rework/10, Commits ae3c23e…ca00ee4)
| Datei | Inhalt |
|---|---|
| `src/chesslab/move_tracker/tracker.py` | Probabilistisches Scoring (SquareNoise, loglik_scores, loglik_pair_scores, move_prior), Viabilitäts-Filter, per-Feld-Anomalie-Patcher, Geometrie-Invalidierung (corner_jump_px), Motion-ROI, Promotion-API, CNN-Overrule |
| `src/chesslab/move_tracker/cnn_recovery.py` | 2-Ply-Suche (derive_moves_identity), min_confident-Split |
| `src/chesslab/move_tracker/app.py` | /api/promote, z_thr-Body |
| `src/chesslab/move_tracker/static/index.html` | Promotion-Dialog, z-Score-Debug |
| `src/chesslab/config.py` | TRACK_DEFAULTS (Single Source der Tracker-Parameter) |
| `src/chesslab/calibration.py` | `board_corners_from_lines` (+Helfer; **experimentell**, noch nicht im Tracker verdrahtet), Parallelogramm-Vervollständigung einer Nur-Seed-Ecke |
| `tests/test_move_tracker.py`, `tests/test_cnn_recovery.py` | auf v2 umgestellt + neue Tests |
| `tests/test_clips.py` | Clip-Regression (`pytest -m clips`, skippt ohne lokale Clips) |
| `specs/rework/10-*.md`, `specs/rework/11-*.md`, `docs/move-tracker-flow.md` | Spezifikation + Mermaid-Flowchart |

### Scan-/Synth-Pipeline (Commits 068bfb9…92c9d32)
| Datei | Inhalt |
|---|---|
| `src/chesslab/meshprep.py` | Textur-Kandidatenkette (GLB-URI-Parsing, Debug-Muster-Filter via Sättigung, Namens-Match) |
| `src/chesslab/scan_discover.py` | unwrap-Ausschluss in `_pick_texture` |
| `synth/render_board_v2.py` | Fallback-Holzmaterial für texturlose Scans |
| `synth/render_piece.py` | view_transform „Standard" (AgX entsättigte Previews) |
| `src/chesslab/cli.py` | `synth board-texture`-Importfix, `track`-Flags |
| `docs/synth-render-usage.md` | Übergabe-Doku Renders→Training |

## B. Kleine Utility-Skripte — BEHALTEN, aber Kandidaten für `scripts/`-README
Alle bewusst klein & eigenständig; kein Wegwerf-Code, aber nur gelegentlich genutzt:

- `scripts/replay_clip.py` — Video-Replay-Harness (auch von tests/test_clips.py importiert!)
- `scripts/dump_warp.py` — Marker/Warp-Diagnose (`--lines` testet die Linien-Erkennung)
- `scripts/decimate_pieces.py` — Pipeline-Outputs auf 35k Tris (+ `--smooth`, UV-Warnung)
- `scripts/reduce_video.py`, `scripts/probe_video.py` — 8K-Testclips → 1080p, Video-Check
- `scripts/wb_textures.py`, `scripts/match_texture_tone.py` — Farb-Werkzeuge (Doku im
  Header inkl. Warnung: WB bei voller Stärke überdreht)

## C. Wegwerf-Code
Sämtlicher Einmal-Debugcode der Sessions lief im Scratchpad AUSSERHALB des Repos
(check_moves, marker_rate, glb_uris, debug_lines, smooth_bp) — **im Repo liegt davon
nichts**. Was der Cleanup-Agent prüfen sollte, ist älterer Bestand (vor diesen
Sessions), insbesondere: verwaiste Web-Assets (`web/static/assets/index-*.js`
Altversionen), `docs/architecture-review/` (noch aktuell?), doppelte/legacy
Renderer (`render_chessboard.py` vs `render_board_v2.py`), `synth_frames.py`-Nutzung.

## D. Nicht committen / .gitignore (bereits eingerichtet)
`data/` (Laufzeit, Testclips, Renders), `scans/` (Scan-Originale, Backup D:\scans),
`scans_stage/`, `synth_pieces/` (regenerierbare Outputs, 264-MB-Historie war schon
einmal der Push-Killer).

## E. Lizenzen & Attribution für die GitHub-Veröffentlichung

**Es wurde nirgends fremder Quellcode kopiert** — alle Implementierungen sind eigen;
externe Projekte lieferten nur Konzepte (siehe unten). Attributionspflicht entsteht
daher primär über die **Abhängigkeiten**:

| Abhängigkeit | Lizenz | Anmerkung |
|---|---|---|
| python-chess | **GPL-3.0+** | ⚠️ prägend: Distribution des Projekts muss GPL-kompatibel sein |
| pymeshlab | **GPL-3.0** | ⚠️ dito (nur von scripts/decimate & meshprep genutzt) |
| OpenCV (opencv-python) | Apache-2.0 | |
| NumPy | BSD-3 | |
| PyTorch / torchvision | BSD-3 | ROCm-Build |
| FastAPI / Typer / PyYAML / trimesh | MIT | |
| uvicorn | BSD-3 | |
| Pillow | MIT-CMU (HPND) | |
| Open3D | MIT | |
| Blender | GPL-3.0 | nur als externes Programm aufgerufen (subprocess) — färbt NICHT auf den Code ab; Render-Outputs sind frei |

**Lizenz-Empfehlung:** Wegen python-chess (Kernabhängigkeit, GPL-3.0+) das Repo unter
**GPL-3.0** veröffentlichen — alles andere wäre bei Distribution rechtlich wackelig.

**Konzept-Zitate (keine Codeübernahme, aber fair zu nennen — z.B. im README):**
- Cucchiara et al.: HSV-Cast-Shadow-Detection (Schatten-Veto im Tracker)
- Zabih & Woodfill: Census-Transform (Struktur-Check im Schatten-Veto)
- Wölflein & Arandjelović, *chesscog* (2021): Per-Square-Pipeline, Linien-basierte
  Bretterkennung (Vorbild für Spec 11)
- Wang & Green (IVCNZ 2013), A. Poggi (*ACMR*), *LiveChess2FEN* (Quintana et al.):
  algorithmische Vorbilder für Diff-Tracking/Legalitäts-Matching (Quellen in
  specs/rework/10-move-detection-v2.md verlinkt)
- Reinhard et al. (2001): Farbtransfer (match_texture_tone.py)
- Taubin (1995): volumenerhaltende Glättung (via pymeshlab)

## F. Vorschlag Cleanup-Auftrag (für den nächsten Agenten)
1. Abschnitt C prüfen: Altbestand identifizieren, tote Pfade/doppelte Renderer klären.
2. LICENSE-Datei (GPL-3.0) + README-Attributionsabschnitt aus Abschnitt E anlegen.
3. `requirements`/`pyproject` gegen tatsächliche Imports abgleichen (ungenutzte Deps raus).
4. NICHT anfassen: alles aus Abschnitt A/B, `scans/`-Regeln (Memory), Spec-Ordner.
