"""Fused synth build (synth_build.py): renders -> memmap direct, no crop PNGs, no phash."""

from __future__ import annotations

import json

import cv2
import numpy as np

from chesslab import config
from chesslab.synth_build import build_synth_dataset
from chesslab.training.pack import load_packed

# Ein Brett, dessen Warp trivial ist: das Brett fuellt das Bild von (16,16) bis (144,144).
_CORNERS = [[16.0, 16.0], [144.0, 16.0], [144.0, 144.0], [16.0, 16.0 + 128.0]]
_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"


def _fake_render(root, i: int, color: tuple[int, int, int]) -> None:
    img = np.full((160, 160, 3), color, dtype=np.uint8)
    cv2.imwrite(str(root / f"{i:06d}.jpg"), img)
    (root / f"{i:06d}.json").write_text(
        json.dumps({"fen": _FEN, "corners": _CORNERS}), encoding="utf-8")


def test_fused_build_packs_without_crop_pngs(tmp_path):
    paths = config.Paths(root=tmp_path / "data")
    paths.sessions.mkdir(parents=True, exist_ok=True)
    renders = tmp_path / "renders"
    renders.mkdir()
    for i in range(4):
        _fake_render(renders, i, (40 + 30 * i, 90, 160))

    res = build_synth_dataset("fused-t", renders, board_size=160, per_cell_cap=10**9,
                              val_frac=0.0, test_frac=0.0, workers=2,
                              allow_degenerate=True, paths=paths)
    assert res["counts"]["final"] == 4 * 64

    ds = paths.datasets / "fused-t"
    # KEINE Crop-PNGs irgendwo — nur Manifest + Memmap + Metadaten.
    assert not list(ds.rglob("*.png"))
    assert not (tmp_path / "data" / "squares__fused-t").exists()
    rows = [json.loads(line) for line in (ds / "manifest.jsonl").read_text().splitlines() if line.strip()]
    assert all(r["path"].startswith("mm://") for r in rows)

    # Labels stimmen mit der FEN ueberein (Grundstellung: e2=wP, e8=bK-Reihe etc.).
    by = {(r["frame"], r["square"]): r["label"] for r in rows}
    assert by[("000000", "e2")] == "wP" and by[("000000", "e8")] == "bK"
    assert by[("000001", "d4")] == "empty" and by[("000001", "a1")] == "wR"

    # load_packed akzeptiert den Pack (Digest passt) und die Pixel sind nicht leer/schwarz.
    packed = load_packed("fused-t", paths)
    assert packed is not None
    path, (n, h, w), path2idx = packed
    assert n == len(rows)
    mm = np.memmap(path, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    empty_row = next(r for r in rows if r["label"] == "empty")
    crop = np.array(mm[path2idx[empty_row["path"]]])
    # Quelle war (B,G,R)=(40..130, 90, 160) -> RGB-Kanalreihenfolge im Pack: R>G>B.
    means = crop.reshape(-1, 3).mean(axis=0)
    assert means[0] > means[1] > means[2], f"expected RGB ordering from BGR source, got {means}"
