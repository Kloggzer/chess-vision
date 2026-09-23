"""Konsolidierung Runde 2: EIN Leser fuer `matte.jsonl` (Punkt 28) statt vier Kopien."""
from __future__ import annotations

from collections import Counter

import pytest

from chesslab import hand_flags, labeling, matte, temporal_matte
from chesslab.hand_gate import gate_rows
from conftest import write_jsonl

HISTORY = [
    {"frame": "000001", "coverage": {"a1": 0.5}},
    {"frame": "000001", "skipped": "zone too big"},                     # Absage gewinnt
    {"frame": "000002", "skipped": "zone too big"},
    {"frame": "000002", "coverage": {"b2": 0.25}},                      # Messung nach Absage
    {"frame": "000003", "coverage": {"a1": 0.75, "h8": 0.5}},
    {"frame": "000003", "coverage": {"a1": 0.0}},                       # ganze Zeile ersetzt
    {"frame": "000004", "coverage": {}},                                # leere Messung zaehlt
    {"frame": "000005", "coverage": {"c3": 0.5}, "source": "temporal"},
    {"frame": "000006", "coverage": {"d4": 0.5}, "source": "upsert"},
]
EXPECTED = {"000002": {"b2": 0.25}, "000003": {"a1": 0.0}, "000004": {},
            "000005": {"c3": 0.5}, "000006": {"d4": 0.5}}


@pytest.fixture
def rec(tmp_path):
    write_jsonl(tmp_path / "matte.jsonl", HISTORY)
    return tmp_path


def test_read_matte_keeps_the_newest_row_per_frame(rec):
    assert labeling.read_matte(rec) == EXPECTED
    assert labeling.read_matte(rec / "leer") == {}


def test_sam_matte_is_read_matte_without_the_sensor_rows(rec):
    want = {k: v for k, v in EXPECTED.items() if k not in ("000005", "000006")}
    assert temporal_matte.sam_matte(rec) == want
    assert temporal_matte.sam_matte(rec / "leer") == {}


def test_hand_flags_cells_are_the_newest_row_not_a_cell_merge(rec):
    """Rot auf dem alten Stand: `h8` aus der UEBERHOLTEN Zeile von 000003 ueberlebte, weil die
    Kopie je Zelle drueberschrieb statt je Frame zu ersetzen — ein Zellen-Merge zweier Zeilen."""
    want = {(frame, sq): v for frame, cells in EXPECTED.items() for sq, v in cells.items()}
    assert hand_flags.measured_coverage(rec) == want
    assert hand_flags.measured_coverage(rec / "leer") == {}


def test_a_row_without_frame_is_loud_in_every_reader(tmp_path):
    """Schaden statt Luecke — 0 von 10 490 Zeilen auf der Platte betroffen."""
    write_jsonl(tmp_path / "matte.jsonl", [{"coverage": {"a1": 0.5}},
                                           {"frame": "000001", "coverage": {"a1": 0.0}}])
    for reader in (labeling.read_matte, temporal_matte.sam_matte, hand_flags.measured_coverage):
        with pytest.raises(ValueError, match="ohne `frame`"):
            reader(tmp_path)


def test_effective_and_measured_rows_follow_the_history(rec):
    rows = [dict(r) for r in HISTORY]
    assert {f: r.get("coverage") for f, r in matte.effective_rows(rows).items()} == {
        "000001": None, **EXPECTED}
    assert {f: r["coverage"] for f, r in matte.measured_coverage(rows).items()} == EXPECTED
    assert temporal_matte.matted_frames(rows) == set(EXPECTED)


def test_clean_frames_treats_any_matte_row_as_not_clean(tmp_path):
    write_jsonl(tmp_path / "log.jsonl", [{"frame": f"frames/{i:06d}.png"} for i in (1, 2, 7)])
    write_jsonl(tmp_path / "matte.jsonl", [{"frame": "000001", "skipped": "zone too big"},
                                           {"frame": "000002", "coverage": {}}])
    assert labeling.clean_frames(tmp_path) == {"000007"}


def test_gate_rows_reads_the_effective_row(paths):
    sdir = paths.recordings / "g"
    write_jsonl(sdir / "log.jsonl", [{"frame": "frames/000001.png", "board": "boards/000001.webp"},
                                     {"frame": "frames/000002.png", "board": "boards/000002.webp"}])
    (sdir / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    write_jsonl(sdir / "matte.jsonl", [
        {"frame": "000001", "coverage": {"a1": 0.9}},
        {"frame": "000001", "skipped": "zone too big"},
        {"frame": "000002", "skipped": "zone too big"},
        {"frame": "000002", "coverage": {"a1": 0.9}}])
    skipped = Counter()
    rows = gate_rows(unclear=True, skipped=skipped)
    assert [r["stem"] for r in rows] == ["000002"]
    assert skipped["not_measured"] == 1


def test_one_store_serves_every_reader():
    from chesslab.session_store import matte as matte_store

    assert labeling.read_matte is matte_store.read_matte
    assert matte.effective_rows is matte_store.effective_rows
    assert matte.measured_coverage is matte_store.measured_coverage


# --- Manifest und Split eines LAUFS: gradcam und quantize --------------------------------------

class _Stop(Exception):
    pass


def _capture(monkeypatch) -> list:
    seen: list = []

    def manifest(p):
        seen.append(p)
        return []

    def split(p):
        seen.append(p)
        raise _Stop

    monkeypatch.setattr("chesslab.dataset.load_manifest", manifest)
    monkeypatch.setattr("chesslab.dataset.load_split", split)
    return seen


RUN_CASES = [({"dataset": "d", "split_file": "split-f1.json"}, ("datasets/d/manifest.jsonl",
                                                               "datasets/d/split-f1.json")),
             ({"dataset": "d"}, ("datasets/d/manifest.jsonl", "datasets/d/split.json")),
             ({}, ("crops/default/manifest.jsonl", "reports/split.json"))]


def _rel(paths, seen):
    return tuple(p.relative_to(paths.root).as_posix() for p in seen)


@pytest.mark.parametrize(("extra", "want"), RUN_CASES)
def test_gradcam_reads_the_runs_own_manifest_and_split(paths, monkeypatch, extra, want):
    torch = pytest.importorskip("torch")
    from chesslab.training import gradcam

    cfg = {"classes": ["empty", "wP"], "out_size": [16, 16], "pad_side": 0.05, **extra}
    monkeypatch.setattr("chesslab.training.evaluate.load_run",
                        lambda _d: (torch.nn.Identity(), cfg))
    seen = _capture(monkeypatch)
    with pytest.raises(_Stop):
        gradcam.reliance_for_run(paths.root, split="test", per_class=1)
    assert _rel(paths, seen) == want


@pytest.mark.parametrize(("extra", "want"), RUN_CASES)
def test_quantize_calibrates_on_the_runs_own_manifest_and_split(paths, monkeypatch, extra, want):
    from chesslab.training.quantize import _calibration_rows

    with pytest.raises(FileNotFoundError, match="manifest/split missing"):
        _calibration_rows(extra, 8)
    for rel in want:
        (paths.root / rel).parent.mkdir(parents=True, exist_ok=True)
        (paths.root / rel).write_text("{}", encoding="utf-8")
    seen = _capture(monkeypatch)
    with pytest.raises(_Stop):
        _calibration_rows(extra, 8)
    assert _rel(paths, seen) == want
