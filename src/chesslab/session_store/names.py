"""Die Namen der Dateien einer Aufnahme — die EINE Stelle, an der sie woertlich stehen.

Wer den Namen selbst schreibt, baut sich eine zweite Tuer an den Schutzregeln des Stores vorbei;
`tests/test_recording_files.py` wacht darueber wie `lib/recording-files.test.ts` in der Web-App.
"""

from __future__ import annotations

from pathlib import Path

LOG_FILE = "log.jsonl"
META_FILE = "session.yaml"
CANDIDATE_FILE = "candidate.json"
REFERENCE_FILE = "reference.pgn"
MATTE_FILE = "matte.jsonl"
READS_FILE = "model-reads.jsonl"
UNUSABLE_CELLS_FILE = "unusable-cells.jsonl"
CORRECTIONS_FILE = "corrections.jsonl"
REVIEWED_FILE = "reviewed.jsonl"

#: Per session, one row per ply: did the move that opened this interval show up on the board?
INTERVAL_FILE = "interval-check.jsonl"

#: The session's working picture, rectified and straightened (`boards.write_board`).
BOARD_DIR = "boards"

#: The dirty pile lives apart so `boards/` is literally the p8 stock — readers follow
#: `row["board"]`, so a second directory costs them nothing (`docs/frame-scan.md`).
DIRTY_DIR = "dirty"

#: SAM 3's alpha per frame, in the BOARD's raster — so it follows the board through everything.
MATTE_DIR = "mattes"


def log_path(sdir: Path) -> Path:
    return Path(sdir) / LOG_FILE


def meta_path(sdir: Path) -> Path:
    return Path(sdir) / META_FILE


def matte_path(sdir: Path) -> Path:
    return Path(sdir) / MATTE_FILE


def reads_path(sdir: Path) -> Path:
    return Path(sdir) / READS_FILE


def corrections_path(sdir: Path) -> Path:
    return Path(sdir) / CORRECTIONS_FILE


def unusable_cells_path(sdir: Path) -> Path:
    return Path(sdir) / UNUSABLE_CELLS_FILE


def interval_path(sdir: Path) -> Path:
    return Path(sdir) / INTERVAL_FILE


def boards_dir(sdir: Path) -> Path:
    return Path(sdir) / BOARD_DIR


def mattes_dir(sdir: Path) -> Path:
    return Path(sdir) / MATTE_DIR
