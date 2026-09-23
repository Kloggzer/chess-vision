"""Tests for scan_discover + meshprep — pure Python, NO Blender / GPU needed."""


from chesslab.scan_discover import (
    _pick_texture,
    assess_report,
    discover_scans,
    parse_piece_name,
)


class TestParsePieceName:
    def test_plain_piece_is_v1(self):
        assert parse_piece_name("wP") == ("wP", "v1")

    def test_no_prefix_gets_white_and_v1(self):
        assert parse_piece_name("P") == ("wP", "v1")

    def test_numeric_suffix_is_variant(self):
        assert parse_piece_name("wP2") == ("wP", "v2")

    def test_label_suffix_is_variant(self):
        assert parse_piece_name("wP_glass") == ("wP", "glass")
        assert parse_piece_name("bN-old") == ("bN", "old")

    def test_case_insensitive_canonical(self):
        assert parse_piece_name("WQ") == ("wQ", "v1")

    def test_non_piece_is_none(self):
        assert parse_piece_name("not_a_piece") is None

    def test_discover_scans_carries_variant(self, tmp_path):
        for folder in ("wP", "wP2", "bP"):
            d = tmp_path / folder
            d.mkdir()
            (d / f"{folder}.glb").write_text("fake")
            (d / "diffuse.png").write_text("tex")
        items, _ = discover_scans(tmp_path)
        got = {(i.name, i.variant) for i in items}
        assert got == {("wP", "v1"), ("wP", "v2"), ("bP", "v1")}


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


class TestVerbatimImport:
    def test_obj_copied_unchanged(self, tmp_path):
        from chesslab.meshprep import prepare_scan
        from chesslab.scan_discover import ScanItem

        scan = tmp_path / "scan"
        scan.mkdir()
        obj = scan / "m.obj"
        obj.write_text("# header\nmtllib old.mtl\no thing\n"
                       "v 0.0 1.0 2.0\nvn 0 0 1\nusemtl foo\nf 1//1 1//1 1//1\n")
        tex = scan / "t.png"
        tex.write_bytes(b"PNGDATA")
        item = ScanItem(name="wP", obj=obj, tex=tex, variant="v2")

        rep = prepare_scan(item, tmp_path / "out", make_preview=False)

        pdir = tmp_path / "out" / "wP"
        text = (pdir / "v2.obj").read_text()
        assert rep["verbatim"] is True and rep["variant"] == "v2"
        assert "v 0.0 1.0 2.0" in text and "f 1//1 1//1 1//1" in text  # geometry intact
        assert "mtllib v2.mtl" in text and "usemtl piece" in text
        assert "old.mtl" not in text
        assert (pdir / "v2.png").read_bytes() == b"PNGDATA"
        assert (pdir / "v2.mtl").read_text().strip().endswith("map_Kd v2.png")


class TestNextVariant:
    def test_first_slot_is_v1(self, tmp_path):
        from chesslab.scan_discover import next_variant
        assert next_variant(tmp_path) == "v1"

    def test_skips_existing(self, tmp_path):
        from chesslab.scan_discover import next_variant
        (tmp_path / "v1.obj").write_text("x")
        (tmp_path / "v2.obj").write_text("x")
        assert next_variant(tmp_path) == "v3"

    def test_bare_vs_explicit(self):
        from chesslab.scan_discover import is_bare_piece
        assert is_bare_piece("wP") and is_bare_piece("P")
        assert not is_bare_piece("wP2") and not is_bare_piece("wP_glass")


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
