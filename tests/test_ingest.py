"""Ingestion of external datasets (chesslab.ingest + adapters), headless.

Proves the full chain WITHOUT real download: synthetic board image + known corners + FEN →
synthetic session → existing `slice_session` → 64 correctly labeled crops, and — via color-coded
squares — the correct **orientation** (a1 bottom-left, h8 top-right).
"""

from __future__ import annotations

import json

import numpy as np
import pytest

from chesslab import config
from chesslab import ingest as ig
from chesslab.ingest_adapters import chesscog, chessred

# --- reine Helfer ------------------------------------------------------------------------

def test_fen_from_squares_places_pieces_on_correct_ranks():
    fen = ig.fen_from_squares({"e1": "K", "e8": "k", "e4": "P", "a1": "R"})
    assert fen.split()[0] == "4k3/8/8/8/4P3/8/8/R3K3"
    assert fen.endswith(" w - - 0 1")


def test_to_full_fen_completes_placement_only():
    assert ig.to_full_fen("8/8/8/8/8/8/8/8") == "8/8/8/8/8/8/8/8 w - - 0 1"
    full = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    assert ig.to_full_fen(full) == full


def test_chessred_category_to_letter():
    assert chessred.category_to_letter("white-pawn") == "P"
    assert chessred.category_to_letter("black-knight") == "n"
    assert chessred.category_to_letter("empty") is None


def test_chessred_named_corners_to_order_white_view():
    # top_left→a8, top_right→h8, bottom_right→h1, bottom_left→a1
    c = {"top_left": [1, 2], "top_right": [3, 4], "bottom_right": [5, 6], "bottom_left": [7, 8]}
    assert chessred.named_corners_to_order(c) == [[1, 2], [3, 4], [5, 6], [7, 8]]


def test_chessred_adapter_parses_real_schema(tmp_path):
    """Tiny annotations.json mirroring the verified ChessReD structure → iter_items."""
    ann = {
        "images": [{"id": 0, "path": "images/0/G000_IMG000.jpg", "game_id": 0}],
        "annotations": {
            "pieces": [
                {"image_id": 0, "category_id": 5, "chessboard_position": "e1"},   # white-king
                {"image_id": 0, "category_id": 11, "chessboard_position": "e8"},  # black-king
                {"image_id": 0, "category_id": 12, "chessboard_position": "a1"},  # empty -> skipped
            ],
            "corners": [{"image_id": 0, "corners": {
                "top_left": [10, 20], "top_right": [30, 20],
                "bottom_right": [30, 40], "bottom_left": [10, 40]}}],
        },
        "categories": [
            {"id": 5, "name": "white-king"}, {"id": 11, "name": "black-king"}, {"id": 12, "name": "empty"}],
        "splits": {"chessred2k": {"train": [], "val": [], "test": []}},
    }
    (tmp_path / "annotations.json").write_text(json.dumps(ann), encoding="utf-8")
    items = list(chessred.iter_items(tmp_path))
    assert len(items) == 1
    it = items[0]
    assert it.corners == [[10, 20], [30, 20], [30, 40], [10, 40]]    # [a8,h8,h1,a1]
    assert it.group == "chessred-0"
    assert it.image_path.as_posix().endswith("images/0/G000_IMG000.jpg")
    assert it.fen.split()[0] == "4k3/8/8/8/8/8/8/4K3"               # only kings, empty skipped


def test_chesscog_corner_ordering_white_and_black_pov():
    # geometric square: TL,TR,BR,BL = [a8,h8,h1,a1] with white at bottom
    sq = [[0, 0], [10, 0], [10, 10], [0, 10]]
    assert chesscog.order_corners(sq, white_turn=True) == [[0, 0], [10, 0], [10, 10], [0, 10]]
    # Black at bottom -> rotated 180°
    assert chesscog.order_corners(sq, white_turn=False) == [[10, 10], [0, 10], [0, 0], [10, 0]]
    # unsorted input still gets correctly ordered to [TL,TR,BR,BL]
    shuffled = [[10, 10], [0, 0], [0, 10], [10, 0]]
    assert chesscog.order_corners(shuffled, white_turn=True) == [[0, 0], [10, 0], [10, 10], [0, 10]]


# --- End-to-End: synthetisches Brett -> Session -> slice ---------------------------------

def _synthetic_board(bs: int) -> np.ndarray:
    """8×8 board, each square uniquely colored by (col,row): after slicing this allows
    checking that a square crop truly originates from the correct image region (orientation)."""
    import cv2  # noqa: F401  (nur sicherstellen, dass cv2 da ist)

    cell = bs // 8
    img = np.zeros((bs, bs, 3), dtype=np.uint8)
    for col in range(8):
        for row in range(8):
            color = (col * 30 + 10, row * 30 + 10, 100)   # BGR, eindeutig je (col,row)
            img[row * cell:(row + 1) * cell, col * cell:(col + 1) * cell] = color
    return img


def _cell_color(col: int, row: int) -> tuple[int, int, int]:
    return (col * 30 + 10, row * 30 + 10, 100)


def test_ingest_end_to_end_labels_and_orientation(tmp_path):
    import cv2

    paths = config.Paths(root=tmp_path)
    bs = 256
    img = _synthetic_board(bs)
    img_path = tmp_path / "board0.png"
    cv2.imwrite(str(img_path), img)

    # Ecken [a8,h8,h1,a1] = Bildecken (top-left, top-right, bottom-right, bottom-left)
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
    item = ig.ImportItem(image_path=img_path, corners=corners, fen=fen, group="g0")

    sids = ig.synthesize_sessions([item], tag="t", profile_name="t", paths=paths)
    assert sids == ["t__g0"]
    prof = ig.ingestion_profile("t", bs)
    res = ig.slice_imported(sids, profile=prof, variant_tag="t", paths=paths)
    assert res["crops"] == 64

    manifest_path = paths.manifests / "squares__t.jsonl"
    rows = [json.loads(line) for line in manifest_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(rows) == 64
    by_sq = {r["square"]: r for r in rows}
    # Labels aus der FEN korrekt zugeordnet
    assert by_sq["a1"]["label"] == "wR"
    assert by_sq["e1"]["label"] == "wK"
    assert by_sq["a8"]["label"] == "bR"
    assert by_sq["e8"]["label"] == "bK"
    assert by_sq["a2"]["label"] == "wP"
    assert by_sq["e7"]["label"] == "bP"
    assert by_sq["e4"]["label"] == "empty"

    # Orientierung: a1 = (col0,row7) unten-links, h8 = (col7,row0) oben-rechts.
    def center_color(square: str) -> np.ndarray:
        crop = cv2.imread(by_sq[square]["path"])
        h, w = crop.shape[:2]
        return crop[h // 2, w // 2].astype(int)

    assert np.allclose(center_color("a1"), _cell_color(0, 7), atol=25)
    assert np.allclose(center_color("h8"), _cell_color(7, 0), atol=25)
    assert np.allclose(center_color("a8"), _cell_color(0, 0), atol=25)
    assert np.allclose(center_color("h1"), _cell_color(7, 7), atol=25)


def test_run_ingest_with_chesscog_fixture(tmp_path):
    """run_ingest via the chesscog adapter (fake <id>.png/.json), without build_dataset."""
    import cv2

    paths = config.Paths(root=tmp_path)
    src = tmp_path / "chesscog_raw" / "train"
    src.mkdir(parents=True)
    bs = 256
    for i in range(2):
        cv2.imwrite(str(src / f"{i:04d}.png"), _synthetic_board(bs))
        (src / f"{i:04d}.json").write_text(json.dumps({
            "corners": [[0, 0], [bs, 0], [bs, bs], [0, bs]],
            "fen": "8/8/8/8/4P3/8/8/4K2k",
            "white_turn": True,
        }), encoding="utf-8")

    summary = ig.run_ingest("chesscog", tmp_path / "chesscog_raw", tag="pretrain-chesscog",
                            board_size=bs, build=False, paths=paths)
    assert summary["items"] == 2
    assert summary["sessions"] == 1                 # group = chesscog-train
    assert summary["crops"] == 128                  # 2 Frames * 64
    manifest_path = paths.manifests / "squares__pretrain-chesscog.jsonl"
    rows = [json.loads(line) for line in manifest_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    labels = {r["label"] for r in rows}
    assert "wP" in labels and "wK" in labels and "bK" in labels and "empty" in labels


def test_run_ingest_unknown_adapter_raises(tmp_path):
    with pytest.raises(ValueError):
        ig.run_ingest("nope", tmp_path, tag="x", paths=config.Paths(root=tmp_path))

def test_profile_for_session_reconstructs_legacy_ingest(tmp_path, monkeypatch):
    """Legacy ingested sessions (profile never saved) must still be sliceable."""
    import pytest

    from chesslab import config
    from chesslab.labeling import _profile_for_session

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))

    meta = {"profile": "pretrain-x", "mode": "ingested"}
    prof = _profile_for_session(meta, None)
    assert prof.profile == "pretrain-x" and prof.board_size == 900 and prof.margin == 0.0

    # non-ingested sessions still raise on a missing profile
    with pytest.raises(FileNotFoundError):
        _profile_for_session({"profile": "gone", "mode": "pgn"}, None)
