"""Session packs must check the manifest digest `packs.write_meta` writes."""
from __future__ import annotations

import json

import pytest

from chesslab import config
from chesslab.training import packs as packs_mod
from conftest import write_jsonl

CROP = 8


def _pack(paths: config.Paths, name: str, n: int):
    d = packs_mod.pack_dir(name, paths)
    d.mkdir(parents=True)
    rows = [{"path": f"mm://{name}/f{i:03d}/e4.png", "label": "empty",
             "out_size": [CROP, CROP], "session_id": name} for i in range(n)]
    write_jsonl(d / "manifest.jsonl", rows)
    packs_mod.write_meta(d, rows, CROP, CROP)
    with open(d / "packed_images.u8", "wb") as fh:
        fh.truncate(n * CROP * CROP * 3)
    return d, rows


def test_a_pack_whose_manifest_moved_on_is_refused(tmp_path):
    """Same paths, same count, different labels: the pixels stay, the labels do not, and the
    digest is the only thing that can say so."""
    paths = config.Paths(root=tmp_path)
    d, rows = _pack(paths, "a-80", 3)
    rows[1]["label"] = "wK"
    write_jsonl(d / "manifest.jsonl", rows)

    with pytest.raises(ValueError, match="digest"):
        packs_mod.read_pack("a-80", paths)


def test_list_packs_skips_a_pack_that_no_longer_matches_its_manifest(tmp_path):
    paths = config.Paths(root=tmp_path)
    _pack(paths, "good-80", 2)
    d, rows = _pack(paths, "stale-80", 2)
    (d / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows + [dict(rows[0], path="mm://stale-80/f9/e4.png")]),
        encoding="utf-8")

    assert [p.name for p in packs_mod.list_packs(paths)] == ["good-80"]
