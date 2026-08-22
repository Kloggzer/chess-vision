"""`hand_flags.session_flags` — was dem Menschen vorgelegt wird und was nicht."""
from __future__ import annotations

import json

from chesslab.hand_flags import measured_coverage, session_flags


def read(square: str, cov: float | None, frame: str = "000100") -> dict:
    row = {"session_id": "rg-x", "frame": frame, "square": square, "fen_label": "empty"}
    return row if cov is None else {**row, "cov": cov}


def test_only_cells_the_model_calls_covered_and_the_matte_calls_clear():
    reads = [read("a1", 0.9), read("b1", 0.9), read("c1", 0.1), read("d1", None)]
    measured = {("000100", "a1"): 0.0, ("000100", "b1"): 0.8, ("000100", "c1"): 0.0}
    got = session_flags(reads, measured, cut=0.3, visible_max=0.15)
    assert [r["square"] for r in got] == ["a1"]     # b1 misst die Matte, c1 sieht das Modell frei
    assert got[0]["matted"] is True and got[0]["measured"] == 0.0


def test_a_frame_the_matte_never_saw_is_flagged_not_assumed_clear():
    """Ein fehlender Matte-Eintrag ist keine Freigabe — genau der Frame gehoert vorgelegt."""
    got = session_flags([read("a1", 0.9)], {}, cut=0.3, visible_max=0.15)
    assert got[0]["matted"] is False and got[0]["measured"] is None


def test_a_run_without_the_occlusion_head_contributes_nothing():
    assert session_flags([read("a1", None)], {}, cut=0.3, visible_max=0.15) == []


def test_measured_coverage_reads_every_frame_of_the_matte(tmp_path):
    (tmp_path / "matte.jsonl").write_text(
        json.dumps({"frame": "000100", "coverage": {"a1": 0.5, "b1": 0.0}}) + "\n"
        + json.dumps({"frame": "000200", "coverage": {"a1": 0.25}}) + "\n", encoding="utf-8")
    assert measured_coverage(tmp_path) == {("000100", "a1"): 0.5, ("000100", "b1"): 0.0,
                                           ("000200", "a1"): 0.25}
    assert measured_coverage(tmp_path / "leer") == {}
