"""Tests for scan_discover + meshprep — pure Python, NO Blender / GPU needed."""

import json

from chesslab.scan_discover import (
    _pick_texture,
    assess_report,
    discover_scans,
    load_report,
    normalize_name,
)


class TestNormalizeName:
    def test_WQ_normalizes_to_wQ(self):
        assert normalize_name("WQ") == "wQ"

    def test_wq_normalizes_to_wQ(self):
        assert normalize_name("wq") == "wQ"

    def test_BK_normalizes_to_bK(self):
        assert normalize_name("BK") == "bK"

    def test_bk_normalizes_to_bK(self):
        assert normalize_name("bk") == "bK"

    def test_single_char_P_gets_w_prefix(self):
        assert normalize_name("P") == "wP"

    def test_single_char_n_gets_w_prefix(self):
        assert normalize_name("n") == "wN"


class TestDiscoverScans:
    def test_WQ_folder_becomes_wQ(self, tmp_path):
        """scans/WQ/WQ.glb → ScanItem(name='wQ')."""
        d = tmp_path / "WQ"
        d.mkdir()
        (d / "WQ.glb").write_text("fake")
        (d / "WQ_diffuse.png").write_text("tex")
        items, warnings = discover_scans(tmp_path)
        assert len(items) == 1
        assert items[0].name == "wQ"
        assert items[0].obj.name == "WQ.glb"
        assert items[0].tex is not None

    def test_wq_folder_becomes_wQ(self, tmp_path):
        d = tmp_path / "wq"
        d.mkdir()
        (d / "wq.glb").write_text("fake")
        items, _ = discover_scans(tmp_path)
        assert len(items) == 1
        assert items[0].name == "wQ"

    def test_lowercase_matches(self, tmp_path):
        """bN folder matches (lowercase piece letter)."""
        d = tmp_path / "bN"
        d.mkdir()
        (d / "bN.glb").write_text("fake")
        items, _ = discover_scans(tmp_path)
        assert len(items) == 1
        assert items[0].name == "bN"

    def test_uppercase_match_keeps(self, tmp_path):
        """bP folder matches (uppercase piece letter)."""
        d = tmp_path / "bP"
        d.mkdir()
        (d / "bP.obj").write_text("fake")
        (d / "texture.png").write_text("tex")
        items, _ = discover_scans(tmp_path)
        assert len(items) == 1
        assert items[0].name == "bP"

    def test_no_prefix_gets_w_prefix(self, tmp_path):
        """P folder (no color) → wP."""
        d = tmp_path / "P"
        d.mkdir()
        (d / "P.obj").write_text("fake")
        (d / "diffuse.png").write_text("tex")
        items, _ = discover_scans(tmp_path)
        assert len(items) == 1
        assert items[0].name == "wP"

    def test_glb_preferred_over_obj(self, tmp_path):
        """When both .glb and .obj exist, prefer .glb."""
        d = tmp_path / "wK"
        d.mkdir()
        (d / "wK.glb").write_text("glb")
        (d / "wK.obj").write_text("obj")
        (d / "tex.png").write_text("tex")
        items, _ = discover_scans(tmp_path)
        assert len(items) == 1
        assert items[0].obj.suffix == ".glb"

    def test_obj_with_texture_found(self, tmp_path):
        d = tmp_path / "wR"
        d.mkdir()
        (d / "wR.obj").write_text("obj")
        (d / "wR_diffuse.png").write_text("tex")
        items, _ = discover_scans(tmp_path)
        assert len(items) == 1
        assert items[0].tex is not None
        assert items[0].tex.name == "wR_diffuse.png"

    def test_non_piece_name_warns(self, tmp_path):
        d = tmp_path / "not_a_piece"
        d.mkdir()
        (d / "mesh.glb").write_text("fake")
        items, warnings = discover_scans(tmp_path)
        assert len(warnings) > 0
        assert any("not a piece name" in w for w in warnings)

    def test_missing_directory_warns(self, tmp_path):
        items, warnings = discover_scans(tmp_path / "nonexistent")
        assert items == []
        assert len(warnings) > 0

    def test_sort_order(self, tmp_path):
        """Items returned sorted by folder name."""
        for name in ["bK", "wR", "wP", "wQ"]:
            d = tmp_path / name
            d.mkdir()
            (d / f"{name}.glb").write_text("fake")
            (d / f"{name}_diffuse.png").write_text("tex")
        items, _ = discover_scans(tmp_path)
        names = [i.name for i in items]
        assert names == sorted(names)


class TestPickTexture:
    def test_diffuse_preferred(self, tmp_path):
        d = tmp_path
        (d / "000.jpg").write_text("photo" * 100)
        (d / "mesh_u0_v0_diffuse.png").write_text("tex" * 50)
        result = _pick_texture(d)
        assert result is not None
        assert "diffuse" in result.name

    def test_photos_skipped(self, tmp_path):
        d = tmp_path
        (d / "000.jpg").write_text("photo" * 100)
        (d / "001.jpg").write_text("bigger" * 1000)
        result = _pick_texture(d)
        assert result is None  # only numbered photos → no texture found


class TestAssessReport:
    def test_ok_report(self):
        report = {
            "verts": 5000,
            "boundary_edges": 100,
            "nonmanifold_edges": 50,
            "height_ratio": 2.0,
            "center_component_frac": 0.95,
        }
        level, msgs = assess_report(report)
        assert level == "ok"
        assert msgs == []

    def test_warn_verts_too_few(self):
        report = {"verts": 500}
        level, msgs = assess_report(report)
        assert level == "warn"
        assert any("vertices" in m for m in msgs)

    def test_warn_boundary_edges_high(self):
        report = {"verts": 5000, "boundary_edges": 500, "nonmanifold_edges": 10}
        level, msgs = assess_report(report)
        assert level == "warn"
        assert any("open edges" in m for m in msgs)

    def test_warn_nonmanifold_edges_high(self):
        report = {"verts": 5000, "boundary_edges": 10, "nonmanifold_edges": 600}
        level, msgs = assess_report(report)
        assert level == "warn"
        assert any("non-manifold" in m for m in msgs)

    def test_warn_height_ratio_outside(self):
        for hr in [0.5, 5.0]:
            report = {"verts": 5000, "height_ratio": hr}
            level, msgs = assess_report(report)
            assert level == "warn", f"should warn for height_ratio={hr}"
            assert any("height_ratio" in m for m in msgs)

    def test_warn_center_component_frac_low(self):
        report = {
            "verts": 5000,
            "center_component_frac": 0.3,
            "boundary_edges": 10,
            "nonmanifold_edges": 10,
            "height_ratio": 2.0,
        }
        level, msgs = assess_report(report)
        assert level == "warn"
        assert any("center_component_frac" in m for m in msgs)

    def test_boundary_edges_exactly_at_threshold_not_warn(self):
        report = {"verts": 5000, "boundary_edges": 300}
        level, _ = assess_report(report)
        assert level == "ok"

    def test_boundary_edges_just_above_warns(self):
        report = {"verts": 5000, "boundary_edges": 301}
        level, _ = assess_report(report)
        assert level == "warn"

    def test_center_component_frac_exactly_at_threshold(self):
        report = {
            "verts": 5000,
            "center_component_frac": 0.5,
            "boundary_edges": 10,
            "nonmanifold_edges": 10,
            "height_ratio": 2.0,
        }
        level, _ = assess_report(report)
        assert level == "ok"


class TestLoadReport:
    def test_existing_report(self, tmp_path):
        data = {"piece": "wP", "verts": 5000}
        (tmp_path / "wP_report.json").write_text(json.dumps(data), encoding="utf-8")
        result = load_report(tmp_path, "wP")
        assert result == data

    def test_missing_report(self, tmp_path):
        result = load_report(tmp_path, "nonexistent")
        assert result is None
