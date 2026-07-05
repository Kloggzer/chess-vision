"""Named datasets: Dedup (metadata + pHash), rotation, build — headless with temp paths."""

import json

import cv2
import numpy as np

from chesslab import config
from chesslab import dataset_build as DB


def _write_crop(paths, label, sid, frame, square, img):
    d = paths.squares / label
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{sid}_{frame}_{square}.png"
    cv2.imwrite(str(p), img)
    return p


def _img_top(fill):
    """Top half filled (for rotation visibility)."""
    img = np.zeros((128, 128, 3), dtype=np.uint8)
    img[:64] = fill
    return img


def _img_lr(left, right):
    """Left/right half different -> horizontal structure, distinguishable by dhash."""
    img = np.zeros((128, 128, 3), dtype=np.uint8)
    img[:, :64] = left
    img[:, 64:] = right
    return img


def _row(paths, label, sid, frame, square, fill, color="light", img=None):
    image = img if img is not None else _img_top(fill)
    p = _write_crop(paths, label, sid, frame, square, image)
    return {"path": p.as_posix(), "label": label, "session_id": sid, "frame": frame,
            "ply": int(frame), "square": square, "square_color": color,
            "fen": "x", "out_size": [128, 128]}


def _global_manifest(paths, rows):
    mp = paths.manifests / "squares.jsonl"
    mp.parent.mkdir(parents=True, exist_ok=True)
    mp.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")


def test_dedup_metadata_caps_per_cell():
    rows = [{"session_id": "s1", "square": "e2", "label": "wP", "frame": f"{i:04d}"} for i in range(10)]
    rows += [{"session_id": "s1", "square": "d2", "label": "wP", "frame": f"{i:04d}"} for i in range(3)]
    kept = DB.dedup_metadata(rows, cap=4, seed=42)
    by = {}
    for r in kept:
        by.setdefault((r["session_id"], r["square"], r["label"]), 0)
        by[(r["session_id"], r["square"], r["label"])] += 1
    assert by[("s1", "e2", "wP")] == 4      # gedeckelt
    assert by[("s1", "d2", "wP")] == 3      # unter Cap -> unverändert
    assert DB.dedup_metadata(rows, cap=4, seed=42) == kept   # deterministisch


def test_dhash_and_phash_dedup(tmp_path):
    paths = config.Paths(root=tmp_path)
    a = _row(paths, "wN", "s1", "0000", "b1", None, img=_img_lr((220, 220, 220), (30, 30, 30)))
    b = _row(paths, "wN", "s1", "0001", "b1", None, img=_img_lr((218, 218, 218), (33, 33, 33)))  # ~ a
    c = _row(paths, "wN", "s1", "0002", "g1", None, img=_img_lr((30, 30, 30), (220, 220, 220)))  # gespiegelt
    kept = DB.dedup_phash([a, b, c], hamming=6)
    paths_kept = {r["path"] for r in kept}
    assert a["path"] in paths_kept and c["path"] in paths_kept   # a behalten, c (anders) behalten
    assert b["path"] not in paths_kept                           # b als Duplikat von a verworfen
    assert len(kept) == 2


def test_build_dataset_filters_dedups_rotates(tmp_path):
    paths = config.Paths(root=tmp_path)
    rows = []
    # s1: 6x identisches wP auf e2 (Dedup-Kandidat) + ein wK
    for i in range(6):
        rows.append(_row(paths, "wP", "s1", f"{i:04d}", "e2", (180, 180, 180)))
    rows.append(_row(paths, "wK", "s1", "0006", "e1", (90, 90, 90), color="dark"))
    # s2: andere Session (soll bei Datensatz nur-s1 NICHT auftauchen)
    rows.append(_row(paths, "wP", "s2", "0000", "e2", (180, 180, 180)))
    _global_manifest(paths, rows)

    res = DB.build_dataset("set-a", ["s1"], per_cell_cap=2, phash_enabled=False,
                           rotations=(0, 90), val_frac=0.0, test_frac=0.0, paths=paths,
                           allow_degenerate=True)
    ds = paths.datasets / "set-a"
    built = [json.loads(line) for line in (ds / "manifest.jsonl").read_text().splitlines() if line.strip()]
    # nur s1; wP auf 2 gedeckelt + wK = 3 Basis-Crops; x2 Rotationen = 6 Zeilen
    assert all(r["session_id"] == "s1" for r in built)
    assert res["counts"]["raw"] == 7 and res["counts"]["after_dedup"] == 3 and res["counts"]["final"] == 6
    rots = sorted({r["rot"] for r in built})
    assert rots == [0, 90]
    # die r90-Datei existiert und ist wirklich die Rotation der Basis
    r90 = next(r for r in built if r["rot"] == 90)
    base = next(r for r in built if r["rot"] == 0 and r["square"] == r90["square"] and r["frame"] == r90["frame"])
    rimg, bimg = cv2.imread(r90["path"]), cv2.imread(base["path"])
    assert np.array_equal(rimg, cv2.rotate(bimg, cv2.ROTATE_90_CLOCKWISE))
    assert (ds / "split.json").exists() and (ds / "stats.json").exists() and (ds / "dataset.yaml").exists()


def test_build_with_occluded_class(tmp_path):
    """Dataset with occluded rows builds/splits cleanly (14 classes, no occluded warning)."""
    paths = config.Paths(root=tmp_path)
    rows = [_row(paths, "wP", "s1", "0000", "e2", (180, 180, 180)),
            _row(paths, "occluded", "s1", "0001", "d4", (10, 10, 10)),
            _row(paths, "occluded", "s2", "0000", "d4", (10, 10, 10))]
    _global_manifest(paths, rows)
    res = DB.build_dataset("occ", ["s1", "s2"], per_cell_cap=4, phash_enabled=False,
                           rotations=(0,), val_frac=0.0, test_frac=0.0, paths=paths,
                           allow_degenerate=True)
    assert res["counts"]["final"] == 3
    stats = json.loads((paths.datasets / "occ" / "stats.json").read_text())
    assert stats["counts"]["occluded"] == 2
    # occluded is optional -> does NOT appear as "0 examples"/undersampling warning when present
    assert not any("occluded" in w for w in stats["warnings"])


def test_build_dataset_raises_on_degenerate(tmp_path):
    """Degenerate data -> ValueError; allow_degenerate=True -> ok."""
    paths = config.Paths(root=tmp_path)
    rows = [
        _row(paths, "wQ", "s1", "0000", "d1", (180, 180, 180)),
        _row(paths, "wQ", "s1", "0001", "e1", (180, 180, 180)),
        _row(paths, "wK", "s2", "0000", "e1", (90, 90, 90)),
        _row(paths, "empty", "s2", "0000", "c4", (70, 70, 70)),
    ]
    _global_manifest(paths, rows)

    import pytest
    with pytest.raises(ValueError, match="wQ"):
        DB.build_dataset("solo", ["s1", "s2"], rotations=(0,), val_frac=0.5, test_frac=0.5,
                         paths=paths, allow_degenerate=False)
    assert not (paths.datasets / "solo").exists()   # kein halbfertiger Zombie-Datensatz

    # with allow_degenerate it goes through and documents the errors in the split
    res = DB.build_dataset("solo-ok", ["s1", "s2"], rotations=(0,), val_frac=0.5, test_frac=0.5,
                          paths=paths, allow_degenerate=True)
    assert res["counts"]["final"] == 4
    split = json.loads((paths.datasets / "solo-ok" / "split.json").read_text(encoding="utf-8"))
    assert any("wQ" in e for e in split["degenerate_errors"])


def test_list_get_delete_dataset(tmp_path):
    paths = config.Paths(root=tmp_path)
    rows = [_row(paths, "wP", "s1", "0000", "e2", (180, 180, 180)),
            _row(paths, "wK", "s1", "0001", "e1", (90, 90, 90))]
    _global_manifest(paths, rows)
    DB.build_dataset("d1", ["s1"], rotations=(0,), val_frac=0.0, test_frac=0.0, paths=paths,
                    allow_degenerate=True)
    lst = DB.list_datasets(paths)
    assert len(lst) == 1 and lst[0]["name"] == "d1"
    got = DB.get_dataset("d1", paths)
    assert got["config"]["session_ids"] == ["s1"]
    DB.delete_dataset("d1", paths)
    assert DB.list_datasets(paths) == []
