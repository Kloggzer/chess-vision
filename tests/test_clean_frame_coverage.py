"""Ein sauberer Frame traegt gemessene `coverage` 0.0; SAMs Absage bleibt ungemessen."""

from __future__ import annotations

from pathlib import Path

from chesslab.ioutil import write_rows
from chesslab.labeling import clean_frames, read_matte


def _session(tmp_path: Path, matte: list[dict], log: list[dict]) -> Path:
    write_rows(tmp_path / "matte.jsonl", matte)
    write_rows(tmp_path / "log.jsonl", log)
    return tmp_path


def test_read_matte_drops_a_row_without_coverage(tmp_path):
    """SAMs Absage bleibt draussen — das ist bestehendes Verhalten und muss so bleiben."""
    d = _session(tmp_path, [{"frame": "000001", "coverage": {"a1": 0.4}},
                            {"frame": "000002"}], [])
    assert read_matte(d) == {"000001": {"a1": 0.4}}


def test_clean_frames_names_the_measured_empty_ones(tmp_path):
    """Ohne `dirty_reason` und ohne Matte-Zeile: der Hand-Gate hat nichts gefunden."""
    d = _session(tmp_path, [{"frame": "000002", "coverage": {"a1": 0.4}}],
                 [{"frame": "frames/000001.png"},
                  {"frame": "frames/000002.png", "dirty_reason": "occluded"},
                  {"frame": "frames/000003.png"}])
    assert clean_frames(d) == {"000001", "000003"}


def test_a_refused_frame_is_not_clean(tmp_path):
    """Eine Zeile OHNE `coverage` ist SAMs Absage. Sie darf nie als sauber durchgehen — genau
    diese Bretter sind die verdecktesten des Korpus."""
    d = _session(tmp_path, [{"frame": "000001"}],
                 [{"frame": "frames/000001.png", "dirty_reason": "occluded"}])
    assert clean_frames(d) == set()


def test_a_dirty_frame_without_any_matte_row_is_not_clean(tmp_path):
    """`dirty_reason` heisst: da war etwas. Ohne Messung bleibt es ungemessen."""
    d = _session(tmp_path, [], [{"frame": "frames/000001.png", "dirty_reason": "changed"}])
    assert clean_frames(d) == set()


def test_clean_frames_is_empty_without_a_log(tmp_path):
    assert clean_frames(tmp_path) == set()


def test_unmeasured_is_now_almost_empty():
    """`classification_eligible` liest `None` weiter ueber `or 0.0` als sichtbar — und das ist
    nach dem Datenfix fast folgenlos: 64 von 1 337 936 Pack-Zellen bleiben ungemessen, in v7 und
    test-v1 keine einzige. Umstellen hiesse `coverage_of` mitziehen, das
    `test_null_reads_the_same_everywhere` bewusst gleich haelt. Der Test haelt die ENTSCHEIDUNG
    fest, damit sie nicht aus Versehen kippt."""
    from chesslab.training.occlusion import classification_eligible

    assert classification_eligible({"coverage": 0.0}) is True
    assert classification_eligible({"coverage": 0.9}) is False
    assert classification_eligible({"coverage": None}) is True
