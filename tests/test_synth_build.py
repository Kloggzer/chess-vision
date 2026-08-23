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


def _fake_render(root, i: int, color: tuple[int, int, int], fen: str = _FEN) -> None:
    img = np.full((160, 160, 3), color, dtype=np.uint8)
    cv2.imwrite(str(root / f"{i:06d}.jpg"), img)
    (root / f"{i:06d}.json").write_text(
        json.dumps({"fen": fen, "corners": _CORNERS}), encoding="utf-8")


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
    assert not (tmp_path / "data" / "crops" / "fused-t").exists()
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

    # Guard: `dataset pack` darf ein fused Dataset NIE ueberschreiben (mm:// hat keine Dateien —
    # ein Re-Pack wuerde die Pixel mit Muell ersetzen).
    import pytest

    from chesslab.training.pack import pack_dataset
    with pytest.raises(ValueError, match="fused"):
        pack_dataset("fused-t", paths)

    # PackedSquareDataset traegt mm://-Rows (Trainings-Vertrag) und __getstate__ droppt rows.
    from chesslab.training.torch_data import PackedSquareDataset, build_transform
    tds = PackedSquareDataset(rows, config.CLASSES, build_transform((w, h), train=False), packed)
    x, y = tds[0]
    assert x.shape[0] == 3 and 0 <= y < len(config.CLASSES)
    state = tds.__getstate__()
    assert state["rows"] is None and state["_mm"] is None and len(state["idx"]) == n


def test_fused_build_shard_dirs_no_stem_collision(tmp_path):
    """`synth render --shards N` restarts filenames at 000000 per shard — shard subdirs MUST
    yield distinct sessions/frame keys, otherwise one shard's labels get another shard's pixels
    (the P0 label-corruption bug)."""
    paths = config.Paths(root=tmp_path / "data")
    paths.sessions.mkdir(parents=True, exist_ok=True)
    renders = tmp_path / "renders"
    fen_full, fen_empty = _FEN, "8/8/8/8/8/8/8/8"
    for k, (color, fen) in enumerate([((0, 0, 200), fen_full),      # shard-0: red-ish, start pos
                                      ((0, 200, 0), fen_empty)]):   # shard-1: green, EMPTY board
        sd = renders / f"shard-{k}"
        sd.mkdir(parents=True)
        for i in range(2):
            _fake_render(sd, i, color, fen)                          # SAME stems in both shards

    res = build_synth_dataset("fused-sh", renders, board_size=160, per_cell_cap=10**9,
                              val_frac=0.0, test_frac=0.0, workers=2,
                              allow_degenerate=True, paths=paths)
    assert res["counts"]["final"] == 4 * 64                          # all 4 frames survived

    ds = paths.datasets / "fused-sh"
    rows = [json.loads(line) for line in (ds / "manifest.jsonl").read_text().splitlines() if line.strip()]
    assert len({r["path"] for r in rows}) == len(rows), "mm:// paths must be unique across shards"
    assert len({r["session_id"] for r in rows}) == 2, "each shard gets its own session(s)"

    # Pixel-Label-Kopplung: eine wP-Zeile (nur shard-0/FEN voll) muss ROTE Pixel tragen,
    # eine empty-Zeile aus shard-1 GRUENE — nicht vertauscht.
    packed = load_packed("fused-sh", paths)
    path, (n, h, w), p2i = packed
    mm = np.memmap(path, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    wp = next(r for r in rows if r["label"] == "wP")
    m = np.array(mm[p2i[wp["path"]]]).reshape(-1, 3).mean(axis=0)    # RGB
    assert m[0] > m[1], f"wP crop must come from the red shard-0 frame, got RGB means {m}"
    s1_empty = next(r for r in rows if r["label"] == "empty" and "shard-1" in r["session_id"])
    m = np.array(mm[p2i[s1_empty["path"]]]).reshape(-1, 3).mean(axis=0)
    assert m[1] > m[0], f"shard-1 crop must be green, got RGB means {m}"
