"""Named datasets: Dedup (metadata + pHash), rotation, build — headless with temp paths."""

import json
from pathlib import Path

import cv2
import numpy as np

from chesslab import config
from chesslab import dataset_build as DB
from chesslab.training import pack_session, packs


def _write_crop(paths, label, sid, frame, square, img):
    d = paths.crop_pool / label
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
    mp = paths.crop_pool / "manifest.jsonl"
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


def test_build_dataset_filters_dedups_records_rotations(tmp_path):
    """Rotations are NO LONGER materialized (on-the-fly at train time) — the build only records
    them in dataset.yaml; the manifest holds unique base crops."""
    paths = config.Paths(root=tmp_path)
    rows = []
    # s1: 6x identisches wP auf e2 (Dedup-Kandidat) + ein wK
    rows.extend(_row(paths, "wP", "s1", f"{i:04d}", "e2", (180, 180, 180)) for i in range(6))
    rows.append(_row(paths, "wK", "s1", "0006", "e1", (90, 90, 90), color="dark"))
    # s2: andere Session (soll bei Datensatz nur-s1 NICHT auftauchen)
    rows.append(_row(paths, "wP", "s2", "0000", "e2", (180, 180, 180)))
    _global_manifest(paths, rows)

    res = DB.build_dataset("set-a", ["s1"], per_cell_cap=2, phash_enabled=False,
                           rotations=(0, 90), val_frac=0.0, test_frac=0.0, paths=paths,
                           allow_degenerate=True)
    ds = paths.datasets / "set-a"
    built = [json.loads(line) for line in (ds / "manifest.jsonl").read_text().splitlines() if line.strip()]
    # nur s1; wP auf 2 gedeckelt + wK = 3 Basis-Crops — KEINE zusaetzlichen Rotations-Zeilen
    assert all(r["session_id"] == "s1" for r in built)
    assert res["counts"]["raw"] == 7 and res["counts"]["after_dedup"] == 3 and res["counts"]["final"] == 3
    # keine rotierten Dateien materialisiert, alle Pfade zeigen auf existierende Basis-Crops
    assert not any("_r90" in r["path"] or "_r180" in r["path"] or "_r270" in r["path"] for r in built)
    assert all(Path(r["path"]).exists() for r in built)
    # rotations landen als Trainings-Aug-Empfehlung in dataset.yaml
    import yaml
    cfg = yaml.safe_load((ds / "dataset.yaml").read_text(encoding="utf-8"))
    assert cfg["rotations"] == [0, 90]
    assert (ds / "split.json").exists() and (ds / "stats.json").exists() and (ds / "dataset.yaml").exists()


def test_build_with_occluded_class(tmp_path):
    """`--classes pieces` still keeps them (14 classes, no occluded warning) — the default no longer
    does, because a hand-painted `occluded` is what the measured coverage replaces."""
    paths = config.Paths(root=tmp_path)
    rows = [_row(paths, "wP", "s1", "0000", "e2", (180, 180, 180)),
            _row(paths, "occluded", "s1", "0001", "d4", (10, 10, 10)),
            _row(paths, "occluded", "s2", "0000", "d4", (10, 10, 10))]
    _global_manifest(paths, rows)
    dropped = DB.build_dataset("occ13", ["s1", "s2"], per_cell_cap=4, phash_enabled=False,
                               rotations=(0,), val_frac=0.0, test_frac=0.0, paths=paths,
                               allow_degenerate=True)
    assert dropped["counts"]["final"] == 1, "the default is pieces13 and drops them"
    res = DB.build_dataset("occ", ["s1", "s2"], per_cell_cap=4, phash_enabled=False,
                           rotations=(0,), val_frac=0.0, test_frac=0.0, paths=paths,
                           allow_degenerate=True, class_mode="pieces")
    assert res["counts"]["final"] == 3
    stats = json.loads((paths.datasets / "occ" / "stats.json").read_text())
    assert stats["counts"]["occluded"] == 2
    # occluded is optional -> does NOT appear as "0 examples"/undersampling warning when present
    assert not any("occluded" in w for w in stats["warnings"])


def test_like_supplies_the_class_list_but_an_explicit_one_wins(tmp_path):
    """`--like` overrides every policy EXCEPT the class list — that one is the reason to build a twin.

    `class_mode = pol["class_mode"] or class_mode` made the donor win unconditionally, so
    `--like <14-class donor> --classes pieces13` produced a second 14-class copy under a name that
    said otherwise, and would have been trained and compared as if it were the 13-class model.
    """
    import yaml

    paths = config.Paths(root=tmp_path)
    rows = [_row(paths, "wP", "s1", "0000", "e2", (180, 180, 180)),
            _row(paths, "wK", "s1", "0001", "e1", (90, 90, 90)),
            _row(paths, "empty", "s1", "0002", "c4", (70, 70, 70))]
    _global_manifest(paths, rows)
    DB.build_dataset("donor", ["s1"], rotations=(0,), val_frac=0.0, test_frac=0.0, paths=paths,
                     allow_degenerate=True, class_mode="pieces")

    def mode_of(name: str) -> str:
        return yaml.safe_load((paths.datasets / name / "dataset.yaml").read_text(encoding="utf-8"))["class_mode"]

    assert mode_of("donor") == "pieces"

    # No --classes: the donor supplies it, which is what makes a plain twin a twin.
    DB.build_dataset("twin", ["s1"], rotations=(0,), paths=paths, allow_degenerate=True, like="donor")
    assert mode_of("twin") == "pieces"

    # --classes given: it wins, and the rest of the donor's policy still comes along.
    DB.build_dataset("twin-13c", ["s1"], rotations=(0,), paths=paths, allow_degenerate=True,
                     like="donor", class_mode="pieces13")
    assert mode_of("twin-13c") == "pieces13", "--like swallowed an explicit --classes"


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


def test_list_datasets(tmp_path):
    paths = config.Paths(root=tmp_path)
    rows = [_row(paths, "wP", "s1", "0000", "e2", (180, 180, 180)),
            _row(paths, "wK", "s1", "0001", "e1", (90, 90, 90))]
    _global_manifest(paths, rows)
    DB.build_dataset("d1", ["s1"], rotations=(0,), val_frac=0.0, test_frac=0.0, paths=paths,
                    allow_degenerate=True)
    lst = DB.list_datasets(paths)
    assert len(lst) == 1 and lst[0]["name"] == "d1"


# --- Building from session packs ------------------------------------------------------

_PACK_CELLS = (("wP", "0000", "e2"), ("wK", "0001", "e1"), ("empty", "0002", "c4"))


def _pack(paths, name, sid, side=80, cells=_PACK_CELLS):
    """A session pack on disk: `mm://` manifest, `packed_meta.json`, an image of the right size."""
    d = paths.packs / name
    d.mkdir(parents=True, exist_ok=True)
    rows = [{"path": f"mm://{name}/{sid}_{frame}_{square}.png", "label": label,
             "session_id": sid, "frame": frame, "ply": int(frame), "square": square,
             "square_color": "light", "fen": "x", "out_size": [side, side]}
            for label, frame, square in cells]
    (d / "manifest.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n",
                                      encoding="utf-8")
    pack_session.write_meta(d, rows, side, side)
    (d / "packed_images.u8").write_bytes(bytes(len(rows) * side * side * 3))
    return rows


def _build_from_packs(paths, name, sids, **kw):
    return DB.build_dataset(name, sids, rotations=(0,), val_frac=0.0, test_frac=0.0, paths=paths,
                            phash_enabled=False, allow_degenerate=True, from_packs=True, **kw)


def test_build_from_packs_writes_packs_into_dataset_yaml(tmp_path):
    import yaml

    paths = config.Paths(root=tmp_path)
    _pack(paths, "s1-80", "s1")
    _pack(paths, "s2-80", "s2")
    res = _build_from_packs(paths, "packed", ["s1", "s2"])
    ds = paths.datasets / "packed"
    built = [json.loads(ln) for ln in (ds / "manifest.jsonl").read_text().splitlines() if ln.strip()]
    assert len(built) == 6 and all(r["path"].startswith("mm://") for r in built)
    cfg = yaml.safe_load((ds / "dataset.yaml").read_text(encoding="utf-8"))
    seen = list(dict.fromkeys(packs.pack_name_of(r["path"]) for r in built))
    assert sorted(seen) == ["s1-80", "s2-80"]
    assert cfg[packs.PACKS_KEY] == seen, "the key must list the packs in first-seen row order"
    assert cfg["source_manifest"] == [(paths.packs / p / "manifest.jsonl").as_posix()
                                      for p in ("s1-80", "s2-80")]
    assert res["packed"] is None
    for f in ("packed_images.u8", "packed_meta.json", "packed_progress.json"):
        assert not (ds / f).exists(), f"{f} was written into a pack-built dataset"


def test_build_from_packs_refuses_a_session_without_a_pack_of_that_size(tmp_path):
    import pytest

    paths = config.Paths(root=tmp_path)
    _pack(paths, "s1-80", "s1")
    with pytest.raises(ValueError, match=r"s2.*session pack"):
        _build_from_packs(paths, "packed", ["s1", "s2"])


def test_build_from_packs_ignores_a_pack_of_another_size(tmp_path):
    import yaml

    paths = config.Paths(root=tmp_path)
    _pack(paths, "s1-96", "s1", side=96)
    _pack(paths, "s1-80", "s1", side=80)
    _build_from_packs(paths, "packed", ["s1"], pack_size=(80, 80))
    cfg = yaml.safe_load((paths.datasets / "packed" / "dataset.yaml").read_text(encoding="utf-8"))
    assert cfg[packs.PACKS_KEY] == ["s1-80"]


def test_like_inherits_from_packs(tmp_path):
    import yaml

    paths = config.Paths(root=tmp_path)
    _pack(paths, "s1-80", "s1")
    _build_from_packs(paths, "donor", ["s1"])
    DB.build_dataset("twin", ["s1"], rotations=(0,), paths=paths, allow_degenerate=True,
                     like="donor")
    cfg = yaml.safe_load((paths.datasets / "twin" / "dataset.yaml").read_text(encoding="utf-8"))
    assert cfg[packs.PACKS_KEY] == ["s1-80"], "--like did not carry from_packs over"


def test_from_packs_survives_a_like_on_a_classic_donor(tmp_path):
    """The migration case: same rows and split as the memmap donor, but stored as packs."""
    import yaml

    paths = config.Paths(root=tmp_path)
    _pack(paths, "s1-80", "s1")
    classic = paths.datasets / "donor"
    classic.mkdir(parents=True)
    (classic / "dataset.yaml").write_text(yaml.safe_dump(
        {"session_ids": ["s1"], "class_mode": "pieces13", "rotations": [0],
         "dedup": {"per_cell_cap": 0, "phash_enabled": False, "phash_hamming": 6},
         "split": {"val_frac": 0.0, "test_frac": 0.0, "max_empty_ratio": None,
                   "max_class_ratio": None, "seed": 42}}), encoding="utf-8")
    (classic / "split.json").write_text(json.dumps({"splits": {"train": ["s1"]}}),
                                        encoding="utf-8")

    DB.build_dataset("twin", ["s1"], rotations=(0,), paths=paths, allow_degenerate=True,
                     like="donor", from_packs=True)

    cfg = yaml.safe_load((paths.datasets / "twin" / "dataset.yaml").read_text(encoding="utf-8"))
    assert cfg[packs.PACKS_KEY] == ["s1-80"], "--like overrode an explicit --from-packs"
    assert not (paths.datasets / "twin" / "packed_images.u8").exists()


def test_build_from_packs_refuses_two_packs_of_one_session_at_one_size(tmp_path):
    """`import_pack` legt einen Kotlin-Pack unter `<sid>` ab, `session pack` unter `<sid>-<W>`.

    Liegen beide in derselben Groesse, entschied bisher die Verzeichnis-SORTIERUNG, welche Pixel
    der Datensatz zitiert — und nichts sagte es.
    """
    import pytest

    paths = config.Paths(root=tmp_path)
    _pack(paths, "s1", "s1")
    _pack(paths, "s1-80", "s1")
    with pytest.raises(ValueError, match="s1"):
        _build_from_packs(paths, "packed", ["s1"])


def test_build_writes_manifest_and_stats_the_way_their_readers_expect(tmp_path):
    from chesslab import dataset as dataset_mod
    from chesslab.ioutil import rows_text

    paths = config.Paths(root=tmp_path)
    rows = [_row(paths, "wP", "s1", f"{i:04d}", "e2", (40 * i, 180, 180)) for i in range(3)]
    rows.append(_row(paths, "wK", "s2", "0000", "e1", (90, 90, 90), color="dark"))
    _global_manifest(paths, rows)

    DB.build_dataset("set-f", ["s1", "s2"], phash_enabled=False, rotations=(0,), val_frac=0.0,
                     test_frac=0.0, paths=paths, allow_degenerate=True)

    ds = paths.datasets / "set-f"
    text = (ds / "manifest.jsonl").read_text(encoding="utf-8")
    built = [json.loads(line) for line in text.splitlines()]
    assert text == rows_text(built)
    stats = json.loads((ds / "stats.json").read_text(encoding="utf-8"))
    assert stats == dataset_mod.compute_stats(built, classes=DB.class_list_for("pieces13"))
    split = json.loads((ds / "split.json").read_text(encoding="utf-8"))
    assert set(split["splits"]["train"]) == {"s1", "s2"} and "degenerate_errors" in split
