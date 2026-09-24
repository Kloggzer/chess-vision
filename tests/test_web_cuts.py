"""`web_cuts`: what the label view serves IS the slice's crop (`docs/web-ruft-python.md` step 4)."""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import config, labeling, web_cuts, web_ops
from chesslab.calibration import warp_board_for_crops
from chesslab.session_store.boards import write_board
from conftest import make_profile, write_jsonl, write_session

BOARD = 928
FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"


def _frame(seed: int = 1, side: int = BOARD):
    return np.random.default_rng(seed).integers(0, 256, (side, side, 3), dtype=np.uint8)


def _recording(paths, rows=None, *, name="g", pad_side=0.05, image=None):
    prof = make_profile(BOARD, pad_side=pad_side)
    sdir = paths.recordings / name
    rows = rows if rows is not None else [{"frame": "frames/000110.png", "ply": 1, "fen": FEN}]
    write_session(sdir, rows, profile=prof, image=_frame() if image is None else image)
    (sdir / "candidate.json").write_text(json.dumps({"source": {"crop": {"pad_side": pad_side}}}), "utf-8")
    return sdir, prof


def _decode(b64: str):
    return cv2.imdecode(np.frombuffer(base64.b64decode(b64), np.uint8), cv2.IMREAD_COLOR)


def test_every_served_cell_is_the_slice_crop_byte_for_byte(paths):
    sdir, prof = _recording(paths)
    size = 80
    served = 0
    for crop, row in labeling.iter_session_crops(sdir, profile=prof, out_size=(size, size)):
        got = web_ops.cut_cell(str(paths.root), "g", str(row["frame"]), row["square"], size)
        assert got == web_cuts._encode(crop), f"{row['square']}: the web cut left the slice"
        served += 1
    assert served == 64


def test_a_rows_own_border_is_shifted_onto_the_profiles(paths):
    """A board written at another border shows the same field: the cut follows the row, not 12 px."""
    sdir, prof = _recording(paths)
    board = cv2.imread(str(sdir / "boards" / "000110.webp"))
    border = labeling.crop_border_px(prof)
    wide = cv2.copyMakeBorder(board, 28, 28, 28, 28, cv2.BORDER_CONSTANT, value=(0, 0, 0))
    cv2.imwrite(str(sdir / "boards" / "000110.webp"), wide, [cv2.IMWRITE_WEBP_QUALITY, 101])
    write_jsonl(sdir / "log.jsonl", [{"frame": "frames/000110.png", "ply": 1, "fen": FEN, "board": "boards/000110.webp",
                                      "board_size": BOARD, "board_border": border + 28, "board_straightened": True}])
    for square in ("a8", "e4", "h1"):
        assert web_ops.cut_cell(str(paths.root), "g", "000110", square, 64) == web_cuts._encode(
            labeling.crop_square(board, square, prof, (64, 64)))


def test_the_board_is_the_field_without_its_border(paths):
    sdir, prof = _recording(paths)
    board = cv2.imread(str(sdir / "boards" / "000110.webp"))
    b = labeling.crop_border_px(prof)
    want = cv2.resize(board[b:b + BOARD, b:b + BOARD], (464, 464), interpolation=cv2.INTER_AREA)
    assert web_ops.cut_board(str(paths.root), "g", "000110", 464) == web_cuts._encode(want)


@pytest.mark.parametrize(("row", "why"), [
    ({"frame": "frames/000110.png", "ply": 1, "fen": FEN}, "row carries no board"),
    ({"frame": "frames/000110.png", "ply": 1, "fen": FEN, "board": "boards/000110.webp", "board_size": BOARD,
      "board_border": 12, "board_straightened": True}, "is missing"),
])
def test_an_unusable_board_says_re_export_and_is_no_missing_file(paths, row, why):
    sdir, _ = _recording(paths)
    (sdir / "boards" / "000110.webp").unlink()
    write_jsonl(sdir / "log.jsonl", [row])
    with pytest.raises(web_cuts.BoardUnusable, match=why):
        web_ops.cut_cell(str(paths.root), "g", "000110", "e4", 64)


def test_an_eacces_on_the_board_is_not_a_missing_board(paths, monkeypatch):
    sdir, _ = _recording(paths)
    real = os.stat

    def stat(p, *a, **k):
        if str(p).endswith("000110.webp"):
            raise PermissionError(13, "EACCES", str(p))
        return real(p, *a, **k)

    monkeypatch.setattr(web_cuts.os, "stat", stat)
    with pytest.raises(PermissionError):
        web_ops.cut_cell(str(paths.root), "g", "000110", "e4", 64)


@pytest.mark.parametrize("victim", ["log.jsonl", "candidate.json"])
def test_an_eacces_on_log_or_candidate_raises_instead_of_falling_back(paths, monkeypatch, victim):
    _recording(paths)
    real = os.stat

    def stat(p, *a, **k):
        if str(p).endswith(victim):
            raise PermissionError(13, "EACCES", str(p))
        return real(p, *a, **k)

    monkeypatch.setattr(web_cuts.os, "stat", stat)
    with pytest.raises(PermissionError):
        web_ops.cut_board(str(paths.root), "g", "000110", 128)


def test_a_rewrite_inside_one_mtime_tick_is_still_seen(paths):
    """The atomic writer replaces the file: same mtime and size, new inode."""
    sdir, _ = _recording(paths)
    board = sdir / "boards" / "000110.webp"

    def replace(grey: int) -> None:
        tmp = board.with_suffix(".tmp")
        tmp.write_bytes(cv2.imencode(".webp", np.full((952, 952, 3), grey, np.uint8),
                                     [cv2.IMWRITE_WEBP_QUALITY, 101])[1].tobytes())
        os.replace(tmp, board)
        os.utime(board, ns=(0, 1_700_000_000_000_000_000))

    replace(10)
    first = board.stat()
    assert _decode(web_ops.cut_cell(str(paths.root), "g", "000110", "e4", 64)).mean() < 20
    replace(200)
    assert (board.stat().st_size, board.stat().st_mtime_ns) == (first.st_size, first.st_mtime_ns)
    assert _decode(web_ops.cut_cell(str(paths.root), "g", "000110", "e4", 64)).mean() > 180


def test_the_median_spreads_over_the_whole_interval(paths):
    rows = [{"frame": f"frames/{100 + i:06d}.png", "ply": 1, "fen": FEN} for i in range(14)]
    sdir, prof = _recording(paths, rows)
    for i, row in enumerate(rows):
        grey = np.full((BOARD, BOARD, 3), 250 if i >= 7 else 10, np.uint8)
        write_board(sdir, Path(row["frame"]).stem, grey, prof.image_corners, prof)
    assert _decode(web_ops.cut_cell(str(paths.root), "g", "000100", "e4", 8, median=True)).mean() > 128


def test_the_matte_prefers_the_correction_and_a_missing_one_is_not_found(paths):
    sdir, _ = _recording(paths)
    with pytest.raises(FileNotFoundError):
        web_ops.cut_matte(str(paths.root), "g", "000110", 128)
    mattes = sdir / "mattes"
    mattes.mkdir()
    cv2.imwrite(str(mattes / "000110.webp"), np.full((952, 952), 200, np.uint8))
    assert abs(_decode(web_ops.cut_matte(str(paths.root), "g", "000110", 128)).mean() - 200) < 3
    cv2.imwrite(str(mattes / "000110.fixed.webp"), np.zeros((952, 952), np.uint8))
    assert _decode(web_ops.cut_matte(str(paths.root), "g", "000110", 128)).mean() < 3


def test_a_corrupt_line_mid_log_is_named(paths):
    sdir, _ = _recording(paths)
    (sdir / "log.jsonl").write_text('{"frame": "fra\n{"frame": "frames/000110.png"}\n', "utf-8")
    with pytest.raises(ValueError, match="beschaedigte Zeile"):
        web_ops.cut_cell(str(paths.root), "g", "000110", "e4", 64)


# --- the phone's stored sessions ----------------------------------------------------------------

CORNERS = [[20, 20], [180, 20], [180, 100], [20, 100]]
FIELD = [[27, 24], [173, 23], [174, 97], [26, 96]]
TILTED = {"x": [0.001, 0.126, 0.251, 0.376, 0.5, 0.625, 0.75, 0.874, 0.999],
          "y": [0.002, 0.127, 0.25, 0.375, 0.501, 0.624, 0.749, 0.875, 1.001],
          "tx": [-0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015, 0.02],
          "ty": [0.018, 0.013, 0.009, 0.004, 0, -0.005, -0.009, -0.014, -0.019]}


def _stored(paths, rows, fit=None, sid="20260808-220912"):
    sdir = paths.recordings / "phone" / "files" / "sessions" / sid
    (sdir / "frames").mkdir(parents=True)
    for r in rows:
        cv2.imwrite(str(sdir / r["frame"]), _frame(3, 200)[:120])
    write_jsonl(sdir / "log.jsonl", rows)
    if fit is not None:
        (sdir / "quad-fit.json").write_text(json.dumps(fit), "utf-8")
    return sdir


def _row(n, **extra):
    return {"frame": f"frames/{n:04d}.jpg", "ply": n + 2, "fen": FEN, "corners": CORNERS, **extra}


def _want(sdir, stem, corners, margin, mesh=None, square="e4", size=48):
    prof = web_cuts._profile(web_cuts.STORED_BOARD, web_cuts.STORED_PAD, margin)
    frame = cv2.imread(str(sdir / "frames" / f"{stem}.jpg"))
    return web_cuts._encode(labeling.crop_square(warp_board_for_crops(frame, prof, corners, mesh=mesh),
                                                 square, prof, (size, size)))


def test_a_fitted_frame_is_cut_at_the_sidecar_field_an_unfitted_one_at_the_marker_quad(paths):
    from chesslab.calibration import mesh_from_lines

    fit = {"margin": 0, "frames": {"0000": {"corners": FIELD, "align_worst_px": 2.7, "grid_lines": TILTED}},
           "failed": ["0001"]}
    sdir = _stored(paths, [_row(0), _row(1)], fit)
    root = str(paths.root)
    assert web_ops.cut_cell(root, "phone", "0000", "e4", 48) == _want(sdir, "0000", FIELD, 0, mesh_from_lines(TILTED))
    assert web_ops.cut_cell(root, "phone", "0001", "e4", 48) == _want(sdir, "0001", CORNERS, config.DEFAULT_MARKER_MARGIN)
    assert web_ops.cut_cell(root, "phone", "0000", "e4", 48) != _want(sdir, "0000", CORNERS, config.DEFAULT_MARKER_MARGIN)


def test_a_dirty_stored_row_is_never_served_and_an_unknown_stem_is_not_found(paths):
    _stored(paths, [_row(0), _row(1, dirty=True)])
    web_ops.cut_board(str(paths.root), "phone", "0000", 128)
    for stem in ("0001", "0009"):
        with pytest.raises(FileNotFoundError, match=f"no stored frame {stem}"):
            web_ops.cut_cell(str(paths.root), "phone", stem, "e4", 48)


def test_a_bundle_with_a_log_never_falls_back_to_its_phone_frames(paths):
    _stored(paths, [_row(0)])
    (paths.recordings / "phone" / "log.jsonl").write_text("", "utf-8")
    with pytest.raises(FileNotFoundError, match="candidate"):
        web_ops.cut_board(str(paths.root), "phone", "0000", 128)


def test_an_eacces_on_the_sessions_folder_is_no_bundle_without_sessions(paths, monkeypatch):
    _stored(paths, [_row(0)])
    real = Path.iterdir

    def iterdir(self):
        if self.name == "sessions":
            raise PermissionError(13, "EACCES", str(self))
        return real(self)

    monkeypatch.setattr(Path, "iterdir", iterdir)
    with pytest.raises(PermissionError):
        web_ops.cut_board(str(paths.root), "phone", "0000", 128)


# --- the pen ----------------------------------------------------------------------------------------

def _mask(side: int, hits: dict[tuple[int, int], str]) -> str:
    """RGBA as the browser sends it: red raises, cyan lowers."""
    rgba = np.zeros((side, side, 4), np.uint8)
    for (x, y), kind in hits.items():
        rgba[y, x] = (255, 0, 0, 255) if kind == "up" else (0, 255, 255, 255)
    return base64.b64encode(cv2.imencode(".png", cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))[1].tobytes()).decode()


def _pen_session(paths, board_size: int, border: int, side: int, fill: int = 90):
    sdir = paths.recordings / "g"
    write_jsonl(sdir / "log.jsonl", [{"frame": "frames/000110.png", "ply": 1, "fen": FEN, "board": "boards/000110.webp",
                                      "board_size": board_size, "board_border": border, "board_straightened": True}])
    (sdir / "candidate.json").write_text("{}", "utf-8")
    (sdir / "mattes").mkdir()
    cv2.imwrite(str(sdir / "mattes" / "000110.webp"), np.full((side, side), fill, np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 101])
    return sdir / "mattes"


def _fixed(mattes: Path):
    return cv2.imread(str(mattes / "000110.fixed.webp"), cv2.IMREAD_GRAYSCALE)


def test_a_stroke_raises_an_eraser_drops_the_rest_stays_sams(paths):
    mattes = _pen_session(paths, 8, 0, 8)
    web_ops.pen(str(paths.root), "g", "000110", "stroke", _mask(8, {(2, 3): "up", (5, 1): "down"}))
    out = _fixed(mattes)
    assert (out[3, 2], out[1, 5], out[0, 0]) == (255, 0, 90)


def test_the_mask_is_read_through_the_rows_own_scale_and_border(paths):
    """Board 16 px inside a 4 px border, mask 8 px: mask pixel (2,3) is alpha (8..9, 10..11)."""
    mattes = _pen_session(paths, 16, 4, 24, fill=10)
    web_ops.pen(str(paths.root), "g", "000110", "stroke", _mask(8, {(2, 3): "up"}))
    out = _fixed(mattes)
    assert out[10, 8] == out[11, 9] == 255
    assert out[10, 10] == out[10, 7] == out[3, 2] == 10


def test_a_second_stroke_builds_on_the_correction_and_clear_restore_round_trip(paths):
    mattes = _pen_session(paths, 8, 0, 8, fill=200)
    root = str(paths.root)
    web_ops.pen(root, "g", "000110", "stroke", _mask(8, {(x, y): "down" for x in range(8) for y in range(8)}))
    web_ops.pen(root, "g", "000110", "stroke", _mask(8, {(0, 0): "up"}))
    out = _fixed(mattes)
    assert (out[0, 0], out[7, 7]) == (255, 0), "the eraser was lost, SAM's alpha came back"
    web_ops.pen(root, "g", "000110", "clear")
    assert _fixed(mattes).shape == (8, 8) and _fixed(mattes).max() == 0
    web_ops.pen(root, "g", "000110", "restore")
    assert not (mattes / "000110.fixed.webp").exists() and (mattes / "000110.webp").exists()
    assert not list(mattes.glob("*.tmp"))


def test_the_pen_refuses_a_frame_without_a_board_and_an_unknown_action(paths):
    _pen_session(paths, 8, 0, 8)
    with pytest.raises(web_cuts.BoardUnusable, match="carries no stored board"):
        web_ops.pen(str(paths.root), "g", "000999", "stroke", _mask(8, {}))
    with pytest.raises(ValueError, match="unknown pen action"):
        web_ops.pen(str(paths.root), "g", "000110", "paint")


def test_matte_frames_is_the_effective_row_per_frame_and_a_refusal_carries_no_coverage(paths):
    sdir = paths.recordings / "g"
    assert web_ops.matte_frames(str(paths.root), "g") == {}
    write_jsonl(sdir / "matte.jsonl", [
        {"frame": "000100", "ply": 1, "coverage": {"e4": 0.9}, "concepts": {"hand": 1}},
        {"frame": "000100", "ply": 1, "coverage": {"e4": 0.2}, "alpha": "fixed", "source": "x"},
        {"frame": "000200", "ply": 2, "skipped": "zone too big", "coverage": None},
    ])
    assert web_ops.matte_frames(str(paths.root), "g") == {
        "000100": {"ply": 1, "coverage": {"e4": 0.2}, "alpha": "fixed"},
        "000200": {"ply": 2, "skipped": "zone too big"},
    }
