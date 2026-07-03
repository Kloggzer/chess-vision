"""Tests für die pure Logik hinter `chesslab synth prepare` (kein bpy, kein Blender)."""

from pathlib import Path

from chesslab.synth_prepare import (
    ScanItem,
    assess_report,
    build_isolate_cmd,
    discover_scans,
    load_report,
)


def _scan_dir(tmp_path, name, obj=True, textures=("t.jpg",)):
    d = tmp_path / name
    d.mkdir()
    if obj:
        (d / "mesh.obj").write_text("o x\n", encoding="utf-8")
    for i, t in enumerate(textures):
        (d / t).write_bytes(b"x" * (100 + i * 100))   # spätere Dateien größer
    return d


def test_discover_scans_happy_path(tmp_path):
    _scan_dir(tmp_path, "P")
    _scan_dir(tmp_path, "wN", textures=("small.png", "big.jpg"))
    items, warnings = discover_scans(tmp_path)
    assert [i.name for i in items] == ["P", "wN"]
    assert items[1].tex.name == "big.jpg"           # größte Textur gewinnt
    assert warnings == []


def test_discover_scans_skips_incomplete_and_flags_bad_names(tmp_path):
    _scan_dir(tmp_path, "Q", obj=False)             # keine .obj -> übersprungen
    _scan_dir(tmp_path, "koenig")                    # kein Figurenname -> Warnung, aber dabei
    items, warnings = discover_scans(tmp_path)
    assert [i.name for i in items] == ["koenig"]
    assert any("Q" in w and "übersprungen" in w for w in warnings)
    assert any("koenig" in w and "Figurenname" in w for w in warnings)


def test_discover_scans_missing_root(tmp_path):
    items, warnings = discover_scans(tmp_path / "nope")
    assert items == [] and len(warnings) == 1


def test_build_isolate_cmd_argv(tmp_path):
    item = ScanItem(name="P", obj=tmp_path / "P" / "mesh.obj", tex=tmp_path / "P" / "t.jpg")
    cmd = build_isolate_cmd("blender.exe", Path("synth/isolate_piece.py"), item,
                            tmp_path / "out", target_tris=20000, smooth_iters=10)
    assert cmd[0] == "blender.exe" and cmd[1] == "--background"
    assert "--" in cmd
    tail = cmd[cmd.index("--") + 1:]
    assert tail[0].endswith("mesh.obj") and tail[1].endswith("t.jpg")
    assert tail[2].endswith("P.obj") and tail[3].endswith("P_preview.png")
    assert tail[tail.index("--target-tris") + 1] == "20000"
    assert tail[tail.index("--smooth-iters") + 1] == "10"


def _good_report(**over):
    r = {"piece": "P", "verts": 15000, "tris_before": 2_000_000, "tris_after": 19000,
         "decimated": True, "target_tris": 20000, "boundary_edges": 12,
         "nonmanifold_edges": 3, "dims": [1.0, 1.0, 2.2], "height_ratio": 2.2,
         "pattern_margin": 6.5, "piece_vertex_frac": 0.24}
    r.update(over)
    return r


def test_assess_report_ok():
    level, msgs = assess_report(_good_report())
    assert level == "ok" and msgs == []


def test_assess_report_flags_holes_and_orientation():
    level, msgs = assess_report(_good_report(boundary_edges=900, height_ratio=0.4))
    assert level == "warn"
    assert any("offene Kanten" in m for m in msgs)
    assert any("height_ratio" in m for m in msgs)


def test_assess_report_flags_overweight_and_thin():
    level, msgs = assess_report(_good_report(tris_after=80000, verts=500))
    assert level == "warn"
    assert any("über Ziel" in m for m in msgs)
    assert any("Vertices übrig" in m for m in msgs)


def test_assess_report_flags_small_pattern_margin():
    """Figur größer als Drehteller: kaum mitdrehendes Muster sichtbar → Warnung."""
    level, msgs = assess_report(_good_report(pattern_margin=1.2))
    assert level == "warn"
    assert any("Muster" in m and "Scheibe" in m for m in msgs)


def test_assess_report_pattern_margin_missing_is_ok():
    """Alte Reports ohne das Feld (vor diesem Feature) lösen keine Warnung aus."""
    r = _good_report()
    del r["pattern_margin"]
    level, _ = assess_report(r)
    assert level == "ok"


def test_load_report_roundtrip(tmp_path):
    import json
    (tmp_path / "P_report.json").write_text(json.dumps(_good_report()), encoding="utf-8")
    assert load_report(tmp_path, "P")["piece"] == "P"
    assert load_report(tmp_path, "N") is None
