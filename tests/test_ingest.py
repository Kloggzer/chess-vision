"""Ingestion of corner-annotated datasets (chesslab.ingest + adapters), headless.

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

# --- reine Helfer ------------------------------------------------------------------------

def test_to_full_fen_completes_placement_only():
    assert ig.to_full_fen("8/8/8/8/8/8/8/8") == "8/8/8/8/8/8/8/8 w - - 0 1"
    full = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    assert ig.to_full_fen(full) == full


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

    manifest_path = paths.crops / "t" / "manifest.jsonl"
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


def test_run_ingest_unknown_adapter_raises(tmp_path):
    with pytest.raises(ValueError, match="synthetic"):
        ig.run_ingest("nope", tmp_path, tag="x", paths=config.Paths(root=tmp_path))


def test_run_ingest_profiles_every_major_stage(tmp_path, monkeypatch):
    import cv2

    from chesslab.work_audit import WorkAudit, activate, deactivate

    source = tmp_path / "source"
    source.mkdir()
    bs = 128
    cv2.imwrite(str(source / "000000.png"), _synthetic_board(bs))
    (source / "000000.json").write_text(json.dumps({
        "fen": "8/8/8/8/8/8/8/8",
        "corners": [[0, 0], [bs, 0], [bs, bs], [0, bs]],
    }), encoding="utf-8")
    paths = config.Paths(root=tmp_path / "data")
    monkeypatch.setattr(config, "DATA", paths)
    audit = WorkAudit()
    token = activate(audit)
    try:
        result = ig.run_ingest("synthetic", source, tag="profiled", board_size=bs,
                               build=False, paths=paths)
    finally:
        deactivate(token)

    assert result["crops"] == 64
    operations = audit.report()["operations"]
    assert {
        "adapter scans", "ingest session synthesis", "ingest slicing", "slice image decodes",
        "slice board crop batches", "FEN label expansions", "WebP crop batches",
        "WebP encoding CPU", "full manifest rewrites",
    } <= operations.keys()
