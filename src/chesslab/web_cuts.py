"""The label view's pixels — cell, board, alpha, interval median and the phone's stored frames — cut
the way the slice cuts them (`labeling.crop_square`). `docs/web-ruft-python.md` step 4.
"""

from __future__ import annotations

import base64
import json
import math
import os
import threading
from collections import OrderedDict
from contextlib import contextmanager
from pathlib import Path

import cv2
import numpy as np

from . import config, locks
from .calibration import (
    CalibrationProfile,
    CropParams,
    crop_border_px,
    mesh_from_lines,
    smooth_mesh_curvature,
    warp_board_for_crops,
)
from .imgops import resize_keep_aspect
from .ioutil import read_jsonl
from .labeling import crop_square
from .matte import FIXED_SUFFIX
from .session_store.matte import measured_coverage
from .session_store.names import log_path, matte_path, mattes_dir
from .session_store.recording import QUAD_FIT_NAME, candidate_path, game_dir
from .web_ops import Missing

#: JPEG q92, not WebP: cv2 encodes a 128 px cell in 0.04 ms against 1.3 (720 px board: 1.1 against
#: 39) for 4.3 KB against 2.7 — sixty cells a page, the encoder is the page's latency.
CUT_QUALITY = 92
#: Capped by BYTES: a fixed count held 50 to 600 MB depending on resolution, next to a training run.
RASTER_BYTES_MAX = 256 * 1024 * 1024
CELL_BYTES_MAX = 96 * 1024 * 1024
#: Under the web worker's 20 s deadline: the route must see the lock's refusal, not a dead worker.
PEN_LOCK_SECONDS = 15.0
#: A hand crossing a few of the interval's frames cannot outvote the resting board.
MEDIAN_SAMPLES = 5
#: What every pack of the phone's stored sessions cuts with (`manifestRow`, LabeledVideoPack.kt).
STORED_BOARD = 928
STORED_PAD = 0.05


class BoardUnusable(RuntimeError):
    """The row names no board, the board is gone, or nobody pulled it straight — re-export, not 404."""


class _Lru:
    def __init__(self, max_bytes: int):
        self.max_bytes, self.used, self.items = max_bytes, 0, OrderedDict()
        self.lock = threading.Lock()

    def get(self, key):
        with self.lock:
            hit = self.items.get(key)
            if hit is not None:
                self.items.move_to_end(key)
            return hit

    def put(self, key, value, size: int):
        with self.lock:
            old = self.items.pop(key, None)
            self.used -= 0 if old is None else old[1]
            self.items[key] = (value, size)
            self.used += size
            while self.used > self.max_bytes and len(self.items) > 1:
                _, (_, dropped) = self.items.popitem(last=False)
                self.used -= dropped
            return value


_rasters = _Lru(RASTER_BYTES_MAX)
_cells = _Lru(CELL_BYTES_MAX)
_parsed: dict[Path, tuple[tuple, object]] = {}
_flights: dict[tuple, threading.Lock] = {}
_flights_lock = threading.Lock()


@contextmanager
def _flight(key):
    """One decode or parse per input: a cold page asks for the same board and log from every cut thread."""
    with _flights_lock:
        lock = _flights.setdefault(key, threading.Lock())
    try:
        with lock:
            yield
    finally:
        with _flights_lock:
            _flights.pop(key, None)


def _stamp(path: Path) -> tuple[int, int, int]:
    """The inode too: `os.replace` gives a rewrite a new one even inside one mtime tick."""
    st = os.stat(path)
    return st.st_mtime_ns, st.st_size, st.st_ino


def _parsed_once(path: Path, parse):
    key = _stamp(path)
    hit = _parsed.get(path)
    if hit is not None and hit[0] == key:
        return hit[1]
    with _flight((path, key)):
        hit = _parsed.get(path)
        if hit is not None and hit[0] == key:
            return hit[1]
        value = parse(path)
        _parsed[path] = (key, value)
        return value


def _rows(log: Path) -> list[dict]:
    try:
        return read_jsonl(log)
    except ValueError as exc:
        raise ValueError(f"{log}: beschaedigte Zeile mittendrin — {exc}") from None


def _raster(path: Path):
    key = (path, _stamp(path))
    hit = _rasters.get(key)
    if hit is not None:
        return hit[0]
    with _flight(key):
        hit = _rasters.get(key)
        if hit is not None:
            return hit[0]
        image = cv2.imdecode(np.frombuffer(path.read_bytes(), np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError(f"{path}: not a decodable image")
        return _rasters.put(key, image, image.nbytes)


def _encode(image) -> str:
    ok, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, CUT_QUALITY])
    if not ok:
        raise ValueError("jpeg encode failed")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _profile(board_size: int, pad_side: float, margin: float = 0.0) -> CalibrationProfile:
    return CalibrationProfile(
        profile="web", camera_index=-1, frame_size=(0, 0), board_size=int(board_size),
        image_corners=[], homography=[], white_pov=True, margin=margin,
        crop=CropParams(cell=board_size / 8.0, pad_side=float(pad_side), out_size=(0, 0)))


def _cell(board, prof: CalibrationProfile, border: int, square: str, size: int):
    """`crop_square` on a board whose border is the ROW's, not `crop_border_px`'s: shifted onto it."""
    shift = int(border) - crop_border_px(prof)
    if shift > 0:
        board = board[shift:, shift:]
    elif shift < 0:
        board = cv2.copyMakeBorder(board, -shift, 0, -shift, 0, cv2.BORDER_CONSTANT, value=(0, 0, 0))
    return crop_square(board, square, prof, (size, size))


def _field(board, board_size: int, border: int, size: int):
    return resize_keep_aspect(board[border:border + board_size, border:border + board_size], (size, size))


# --- exported recordings ------------------------------------------------------------------------

class _Session:
    def __init__(self, key: tuple, rows: list[dict], pad_side: float):
        self.key, self.pad_side = key, pad_side
        self.rows: dict[str, dict] = {}
        self.plies: dict[int, list[str]] = {}
        for row in rows:
            stem = Path(str(row["frame"])).stem
            self.rows[stem] = row
            self.plies.setdefault(row.get("ply"), []).append(stem)


def _session(name: str) -> tuple[Path, _Session]:
    """Both files in the key: `pad_side` lives only in `candidate.json`, the corners only in the log."""
    sdir = game_dir(name)
    log, cand = log_path(sdir), candidate_path(name)
    key = (_stamp(log), _stamp(cand))
    hit = _parsed.get(sdir)
    if hit is None or hit[0] != key:
        with _flight((sdir, key)):
            hit = _parsed.get(sdir)
            if hit is None or hit[0] != key:
                crop = (json.loads(cand.read_text(encoding="utf-8")).get("source") or {}).get("crop") or {}
                hit = (key, _Session((sdir, key), _rows(log), crop.get("pad_side", config.CROP.pad_side)))
                _parsed[sdir] = hit
    return sdir, hit[1]


def _row(session: _Session, name: str, stem: str) -> dict:
    row = session.rows.get(stem)
    if row is None:
        raise Missing(f"no frame {stem} in the log of {name}")
    return row


def _alpha(path: Path, name: str, stem: str):
    try:
        return _grey(path)
    except FileNotFoundError:
        raise _no_alpha(name, stem) from None


def _no_alpha(name: str, stem: str) -> FileNotFoundError:
    """Only a frame SAM never measured has no alpha to ask for; a measured one lost its file (500)."""
    rows = measured_coverage(read_jsonl(matte_path(game_dir(name))))
    if any(Path(str(f)).stem == stem and not r.get("skipped") for f, r in rows.items()):
        return FileNotFoundError(f"{name}/{stem}: matte.jsonl measured this frame, its alpha is gone")
    return Missing(f"{name}/{stem}: no alpha")


def _leaves(rel: Path) -> bool:
    """`anchor`, not `is_absolute`: on Windows a rooted path without drive, or `C:x`, is not absolute
    and still leaves the folder."""
    return bool(rel.anchor) or ".." in rel.parts


def _board_of(sdir: Path, name: str, stem: str, row: dict | None) -> Path:
    if not row or not row.get("board") or not row.get("board_size"):
        raise BoardUnusable(f"{name}/{stem}: row carries no board — re-export the recording")
    rel = Path(row["board"])
    if _leaves(rel):
        raise ValueError(f"{name}/{stem}: board path {row['board']!r} leaves the recording")
    file = sdir / rel
    # Only a missing file means re-export; an EACCES would send the human into one for nothing.
    try:
        os.stat(file)
    except FileNotFoundError:
        raise BoardUnusable(f"{name}/{stem}: board {row['board']} is missing — re-export the recording") from None
    # The store is where the bow comes out, once; cutting an unstraightened board puts it back.
    if not row.get("board_straightened"):
        raise BoardUnusable(f"{name}/{stem}: board is not straightened — run `chesslab session straighten`")
    return file


def _unexported(name: str) -> bool:
    """Only a bundle with NO `log.jsonl` falls through to the phone's JPEGs; an EACCES raises."""
    try:
        os.stat(log_path(game_dir(name)))
    except FileNotFoundError:
        return True
    return False


def _session_cell(name: str, stem: str, square: str, size: int):
    sdir, session = _session(name)
    row = _row(session, name, stem)
    board = _board_of(sdir, name, stem, row)
    key = (session.key, stem, square, size, _stamp(board))
    hit = _cells.get(key)
    if hit is not None:
        return hit[0]
    out = _encode(_row_cell(session, row, board, square, size))
    return _cells.put(key, out, len(out))


def _median(name: str, stem: str, square: str, size: int) -> str:
    sdir, session = _session(name)
    row = _row(session, name, stem)
    stems = session.plies.get(row.get("ply"), [stem])
    n = len(stems)
    take = min(MEDIAN_SAMPLES, n)
    # Evenly over the WHOLE interval: its front is where the hand is still withdrawing. Half UP, not
    # `round`: banker's rounding turned 6.5 into 6 and the 14-frame interval's median dark.
    at = [math.floor(i * (n - 1) / (take - 1) + 0.5) for i in range(take)] if take > 1 else [0]
    picked = [stems[i] for i in dict.fromkeys(at)]
    stack = [_row_cell(session, session.rows.get(s), _board_of(sdir, name, s, session.rows.get(s)), square, size)
             for s in picked]
    return _encode(np.sort(np.stack(stack), axis=0)[len(stack) // 2])


def _row_cell(session: _Session, row: dict, board: Path, square: str, size: int):
    prof = _profile(row["board_size"], session.pad_side)
    return _cell(_raster(board), prof, row.get("board_border", 0), square, size)


def _session_board(name: str, stem: str, size: int, alpha: bool = False) -> str:
    sdir, session = _session(name)
    row = _row(session, name, stem)
    file = _board_of(sdir, name, stem, row)
    if alpha:
        # The matte IS the board's raster, pulled straight with it: the same field cut overlays it.
        fixed = mattes_dir(sdir) / f"{stem}{FIXED_SUFFIX}"
        file = fixed if fixed.exists() else mattes_dir(sdir) / f"{stem}.webp"
    try:
        raster = _raster(file)
    except FileNotFoundError:
        if not alpha:
            raise
        raise _no_alpha(name, stem) from None
    return _encode(_field(raster, int(row["board_size"]), int(row.get("board_border", 0)), size))


# --- the phone's stored sessions (`files/sessions/<id>/`) ---------------------------------------

def _stored_rows(log: Path) -> dict[str, dict]:
    # `selectStoredRows` drops a dirty row before it is ever packed, so nobody may be asked about it.
    return {Path(r["frame"]).stem: r for r in _rows(log) if r.get("dirty") is not True}


def _stored_find(name: str, stem: str) -> tuple[Path, dict]:
    root = game_dir(name) / "files" / "sessions"
    try:
        dirs = sorted((d for d in root.iterdir() if d.is_dir()), key=lambda d: d.name, reverse=True)
    except FileNotFoundError:
        dirs = []
    for sdir in dirs:
        try:
            rows = _parsed_once(log_path(sdir), _stored_rows)
        except FileNotFoundError:
            continue
        if stem in rows:
            return sdir, rows[stem]
    raise Missing(f"no stored frame {stem} in {name}")


def _stored_quad(sdir: Path, row: dict):
    """The fitted PLAYING FIELD at the sidecar's margin when it carries this frame, else the logged
    marker quad at its outset; the fit's mesh rides along, curvature healed."""
    fit_file = sdir / QUAD_FIT_NAME
    try:
        fit = _parsed_once(fit_file, lambda p: json.loads(p.read_text(encoding="utf-8")))
    except FileNotFoundError:
        fit = None
    frame = ((fit or {}).get("frames") or {}).get(Path(row["frame"]).stem)
    if not frame:
        return row["corners"], config.DEFAULT_MARKER_MARGIN, None, None
    mesh = smooth_mesh_curvature(mesh_from_lines(frame.get("grid_lines")))
    return frame["corners"], float(fit["margin"]), mesh, _stamp(fit_file)


def _stored_board(name: str, stem: str):
    sdir, row = _stored_find(name, stem)
    rel = Path(row["frame"])
    if _leaves(rel):
        raise ValueError(f"{name}/{stem}: frame path {row['frame']!r} leaves the session")
    frame_file = sdir / rel
    corners, margin, mesh, fit_stamp = _stored_quad(sdir, row)
    prof = _profile(STORED_BOARD, STORED_PAD, margin)
    # The quad in the key: a re-pulled log moves the corners of a frame whose JPEG stayed the same.
    key = ("stored", frame_file, _stamp(frame_file), fit_stamp, json.dumps(corners), margin)
    hit = _rasters.get(key)
    if hit is None:
        with _flight(key):
            hit = _rasters.get(key)
            if hit is None:
                warped = warp_board_for_crops(_raster(frame_file), prof, corners, mesh=mesh)
                hit = (_rasters.put(key, warped, warped.nbytes), 0)
    return hit[0], prof


# --- ops ------------------------------------------------------------------------------------------

def cut_cell(name: str, stem: str, square: str, size: int, median: bool = False) -> str:
    """One square as the CNN sees it, base64 JPEG; `median` its clean interval median."""
    if _unexported(name):
        board, prof = _stored_board(name, stem)
        return _encode(crop_square(board, square, prof, (size, size)))
    return _median(name, stem, square, size) if median else _session_cell(name, stem, square, size)


def cut_board(name: str, stem: str, size: int) -> str:
    """The rectified playing field, a8 top left — the drilldown's canvas."""
    if _unexported(name):
        board, prof = _stored_board(name, stem)
        return _encode(_field(board, STORED_BOARD, crop_border_px(prof), size))
    return _session_board(name, stem, size)


def cut_matte(name: str, stem: str, size: int) -> str:
    """The frame's alpha, aligned with `cut_board` of the same size; the correction when there is one."""
    if _unexported(name):
        raise Missing(f"{name}: never exported, no alpha")
    return _session_board(name, stem, size, alpha=True)


# --- the pen: `mattes/<stem>.fixed.webp`, pixels only (coverage waits for `occluders recut`) ------

#: Red raises the alpha, cyan lowers it — the channels `components/alpha-pen.tsx` strokes (BGRA here).
_UP, _DOWN, _HIT = 2, 1, 128


def _stroked(alpha, strokes, board_size: int, border: int):
    """Every alpha pixel asks where it sits on the straightened board and reads the mask there — the
    direction a warp runs in, so no stroke leaves a hole."""
    (h, w), (mh, mw) = alpha.shape, strokes.shape[:2]
    i = np.floor((np.arange(w) + 0.5 - border) / board_size * mw).astype(np.int64)
    j = np.floor((np.arange(h) + 0.5 - border) / board_size * mh).astype(np.int64)
    inside = ((j >= 0) & (j < mh))[:, None] & ((i >= 0) & (i < mw))[None, :]
    s = strokes[np.clip(j, 0, mh - 1)[:, None], np.clip(i, 0, mw - 1)[None, :]]
    hit = inside & (s[..., 3] >= _HIT)
    up = hit & (s[..., _UP] >= _HIT)
    out = alpha.copy()
    out[up] = 255
    out[hit & ~up & (s[..., _DOWN] >= _HIT)] = 0
    return out


def _write_alpha(file: Path, alpha) -> None:
    # Lossless: a lossy re-encode would smear the very edge the human just drew by hand.
    ok, buf = cv2.imencode(".webp", alpha, [cv2.IMWRITE_WEBP_QUALITY, 101])
    if not ok:
        raise ValueError(f"{file}: webp encode failed")
    tmp = file.with_name(f"{file.name}.{os.getpid()}.tmp")
    try:
        tmp.write_bytes(buf.tobytes())
        os.replace(tmp, file)
    finally:
        tmp.unlink(missing_ok=True)


def _grey(path: Path):
    image = cv2.imdecode(np.frombuffer(path.read_bytes(), np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError(f"{path}: not a decodable image")
    return image


def pen_stroke(name: str, stem: str, mask: str) -> None:
    """The strokes (base64 PNG, RGBA, in `/api/matte` coordinates) on top of the CORRECTION when there is
    one — the pen sends only the new stroke after a reset."""
    if _unexported(name):
        raise Missing(f"{name}: never exported, no alpha")
    sdir, session = _session(name)
    row = _row(session, name, stem)
    if not row.get("board") or not row.get("board_size"):
        raise BoardUnusable(f"frame {stem} carries no stored board")
    strokes = cv2.imdecode(np.frombuffer(base64.b64decode(mask), np.uint8), cv2.IMREAD_UNCHANGED)
    if strokes is None:
        raise ValueError("mask is not an image")
    if strokes.ndim == 2 or strokes.shape[2] != 4:
        strokes = cv2.cvtColor(strokes, cv2.COLOR_GRAY2BGRA if strokes.ndim == 2 else cv2.COLOR_BGR2BGRA)
    fixed = mattes_dir(sdir) / f"{stem}{FIXED_SUFFIX}"
    # `recut_fixed` re-checks the pixels it read under this lock; held for one small read and write.
    with locks.matte_ledger(sdir, "pen", timeout=PEN_LOCK_SECONDS):
        alpha = _alpha(fixed if fixed.exists() else mattes_dir(sdir) / f"{stem}.webp", name, stem)
        _write_alpha(fixed, _stroked(alpha, strokes, int(row["board_size"]), int(row.get("board_border", 0))))


def pen_clear(name: str, stem: str) -> None:
    """Nothing there: an empty alpha of SAM's size beside SAM's cut, the same way as a stroke."""
    sdir = game_dir(name)
    with locks.matte_ledger(sdir, "pen", timeout=PEN_LOCK_SECONDS):
        alpha = _alpha(mattes_dir(sdir) / f"{stem}.webp", name, stem)
        _write_alpha(mattes_dir(sdir) / f"{stem}{FIXED_SUFFIX}", np.zeros_like(alpha))


def pen_restore(name: str, stem: str) -> None:
    """Back to SAM: the correction goes, SAM's cut beside it counts again."""
    sdir = game_dir(name)
    with locks.matte_ledger(sdir, "pen", timeout=PEN_LOCK_SECONDS):
        (mattes_dir(sdir) / f"{stem}{FIXED_SUFFIX}").unlink(missing_ok=True)
