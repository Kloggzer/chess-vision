"""Shared builders for the Python suites: profile, session on disk, script loader, JSONL rows.
`write_session` writes the board store by default; `boards=False` is the pre-store fallback."""

from __future__ import annotations

import importlib.util
import json
import sys
from dataclasses import replace
from pathlib import Path

import cv2
import numpy as np
import pytest
import yaml

from chesslab import config
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

ROOT = Path(__file__).resolve().parents[1]
START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

#: The quad the labeling suites cut: a 128-px board inside a 320x240 frame.
SMALL_CORNERS = [[20, 20], [300, 20], [300, 220], [20, 220]]


def load_script(name: str, folder: str = "scripts", *, alias: str | None = None):
    """Load `<folder>/<name>.py` as a module without making the folder a package."""
    spec = importlib.util.spec_from_file_location(alias or f"_script_{name}",
                                                  ROOT / folder / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_jsonl(path: Path, rows) -> Path:
    """One JSON object per line, parents created; the raw shape a recording carries."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    return path


def identity_corners(board_size: int) -> list[list[float]]:
    """The playing field filling the whole raster, in `a8, h8, h1, a1` order."""
    return [[0, 0], [board_size, 0], [board_size, board_size], [0, board_size]]


def make_profile(board_size: int = 800, *, corners=None, homography=None, margin: float = 0.0,
                 cell=None, pad_side=None, out_size=None, **kw) -> CalibrationProfile:
    """A profile whose homography is derived from its own corners and margin.

    Hand-built profiles drift there: the two are independent arguments, and a quad that does not
    match its matrix cuts every square at an offset no assertion names.
    """
    corners = identity_corners(board_size) if corners is None else corners
    overrides = {"cell": cell, "pad_side": pad_side, "out_size": out_size}
    crop = replace(CropParams.default(board_size),
                   **{k: v for k, v in overrides.items() if v is not None})
    kw.setdefault("profile", "test")
    kw.setdefault("camera_index", 0)
    kw.setdefault("frame_size", (board_size, board_size))
    kw.setdefault("white_pov", True)
    return CalibrationProfile(
        board_size=board_size, image_corners=corners, crop=crop, margin=margin,
        homography=homography or compute_homography(corners, board_size, margin), **kw)


def write_session(session_dir: Path, rows: list[dict], *, profile: CalibrationProfile,
                  image, boards: bool = True, session_id: str = "s1",
                  meta: dict | None = None) -> Path:
    """Write `session.yaml`, `log.jsonl` and the raster each row is cut from.

    With `boards` the rows get the four `board*` keys and NO `frames/` file is written, so a
    slice that silently fell back to the frame path would fail to find one.
    """
    from chesslab.realgames import write_board

    session_dir.mkdir(parents=True, exist_ok=True)
    for row in rows:
        stem = Path(row["frame"]).stem
        corners = row.get("corners") or profile.image_corners
        if boards:
            row.setdefault("board_straightened", True)
            row.update({k: v for k, v in
                        write_board(session_dir, stem, image, corners, profile).items()
                        if k not in row})
        else:
            (session_dir / "frames").mkdir(exist_ok=True)
            cv2.imwrite(str(session_dir / "frames" / f"{stem}.png"), image)
    write_jsonl(session_dir / "log.jsonl", rows)
    (session_dir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": session_id, "profile": profile.profile, "mode": "track",
                        **(meta or {})}), encoding="utf-8")
    return session_dir


@pytest.fixture
def paths(tmp_path, monkeypatch) -> config.Paths:
    """`config.DATA` rooted at `tmp_path` itself."""
    p = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", p)
    return p


@pytest.fixture
def data_root(tmp_path, monkeypatch) -> Path:
    """`config.DATA` rooted at `tmp_path / "data"`, with its reports folder in place."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.reports.mkdir(parents=True)
    return config.DATA.root


@pytest.fixture
def small_profile() -> CalibrationProfile:
    """The 128-px board the `slice_session` suites cut: 16-px cells, 32-px crops."""
    return make_profile(128, corners=SMALL_CORNERS, frame_size=(320, 240), profile="p",
                        camera_index=-1, cell=16.0, pad_side=0.05, out_size=(32, 32))


def slice_small(session, **kw):
    """Slice a `slice_fixture` session into 32-px crops beside it."""
    from chesslab.labeling import slice_session

    sdir, prof, root = session
    return slice_session(sdir, profile=prof, manifest_path=root / "m.jsonl",
                         squares_root=root / "squares", out_size=(32, 32), **kw)


@pytest.fixture
def slice_fixture(tmp_path, monkeypatch, small_profile):
    """Build one small session under a patched `config.DATA` and hand back `(dir, profile, root)`."""
    def build(rows, *, boards: bool = True, session_id: str = "s1", shade: int = 128):
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
        sdir = config.DATA.sessions / session_id
        write_session(sdir, rows, profile=small_profile, session_id=session_id, boards=boards,
                      image=np.full((240, 320, 3), shade, np.uint8))
        return sdir, small_profile, tmp_path
    return build
