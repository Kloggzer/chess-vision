"""Der Planer und die Posenrechnung: was ein Auftrag zusagt und was er bewusst nicht zusagt."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

from chesslab.capture_plan import (
    BANDS,
    HEIGHTS,
    ORIENTATION_STEPS,
    Gap,
    band_middle,
    band_of,
    pose_of,
    shots,
    slug,
    square_brightness,
    square_colour,
)

_spec = importlib.util.spec_from_file_location(
    "coverage_gaps", Path(__file__).resolve().parents[1] / "scripts" / "coverage_gaps.py")
COVERAGE = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(COVERAGE)

#: Je Farbe drei Felder: eines im Band `sehr hell`, eines in `mittel`, eines in `dunkel`.
#: Die Farben sind die des echten Bretts — a1 dunkel, b1 hell, a3 dunkel.
BRIGHT = {"h3": 215.0, "b1": 100.0, "e4": 40.0,          # hell
          "a1": 210.0, "a3": 105.0, "d4": 35.0}          # dunkel


def _gap(piece="wQ", colour="light", band="sehr hell", have=0, fix="Stellung") -> Gap:
    return Gap(piece=piece, square_color=colour, band=band, have=have, fix=fix,
               corpus_in_band=1211)


def test_a_missing_brightness_is_unknown_not_dark():
    """376 640 Komposit-Zeilen haengen daran; `or 0.0` warf sie frueher ins dunkelste Band."""
    assert band_of(None) == "unbekannt"
    assert band_of(0.0) == "sehr dunkel"


def test_band_middle_is_defined_for_every_band():
    """Die Auswahlregel braucht sie fuer alle fuenf — „hellstes bzw. dunkelstes" waere fuer
    `mittel` nicht entscheidbar."""
    assert [band_middle(name) for _, _, name in BANDS] == [20.0, 60.0, 105.0, 155.0, 218.0]


def test_square_colour_matches_the_board():
    assert square_colour("a1") == "dark" and square_colour("b1") == "light"
    assert square_colour("h3") == "light" and square_colour("a3") == "dark"


def test_the_slug_carries_the_band_because_the_pair_collides():
    """58 Luecken verteilen sich auf 24 Paare aus Figur und Feldfarbe — ohne Band kollidieren 22."""
    with_band = {slug(g["piece"], g["square_color"], g["band"])
                 for g in (_gap(band=n) for _, _, n in BANDS)}
    without = {slug(g["piece"], g["square_color"]) for g in (_gap(band=n) for _, _, n in BANDS)}

    assert len(with_band) == len(BANDS) and len(without) == 1


def test_a_position_gap_names_a_field_and_promises_no_band():
    got = shots([_gap(band="mittel")], BRIGHT, limit=1)[0]

    assert got["place"] == [{"square": "b1", "piece": "wQ"}]
    assert got["light"] is None and got["reference_square"] == "b1"


def test_a_light_gap_leaves_the_board_empty_and_names_the_target_band():
    got = shots([_gap(band="hell", fix="Licht")], BRIGHT, limit=1)[0]

    assert got["place"] == [] and got["light"] == "hell"
    # Bandmitte 155: b1 (100) liegt naeher als h3 (215). Das Referenzfeld ist auch hier das
    # der Mitte naechste, nicht das hellste — sonst waere die Regel zwei Regeln.
    assert got["reference_square"] == "b1"


def test_the_field_is_the_one_nearest_the_band_middle_not_the_brightest():
    """Fuer `sehr hell` ist es das hellste, fuer `mittel` gerade nicht — dieselbe Regel."""
    hell = shots([_gap(band="sehr hell")], BRIGHT, limit=1)[0]["reference_square"]
    mitte = shots([_gap(band="mittel")], BRIGHT, limit=1)[0]["reference_square"]

    assert hell == "h3" and mitte == "b1"


def test_every_height_appears_across_the_shots():
    """Der Korpus kennt genau eine Hoehe; ein Plan, der nur eine vorschlaegt, aendert das nie."""
    got = shots([_gap(band=n) for _, _, n in BANDS] * 2, BRIGHT, limit=6)

    assert {s["height"] for s in got} == set(HEIGHTS)
    assert {s["orientations"] for s in got} == {ORIENTATION_STEPS}


def test_limit_cuts_without_reordering():
    gaps = [_gap(piece=p) for p in ("wQ", "wK", "bQ")]

    assert [s["closes"][0]["piece"] for s in shots(gaps, BRIGHT, limit=2)] == ["wQ", "wK"]


def test_square_brightness_ignores_rows_without_the_column(tmp_path):
    """Ein Komposit ohne `brightness` darf das Feld nicht dunkel faerben."""
    p = tmp_path / "manifest.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in [
        {"square": "h3", "brightness": 200.0}, {"square": "h3", "brightness": 210.0},
        {"square": "h3"}, {"square": "a1", "brightness": 20.0}]), encoding="utf-8")

    assert square_brightness(p) == {"h3": 205.0, "a1": 20.0}


def test_a_square_quad_is_straight_down():
    assert pose_of([[0, 0], [100, 0], [100, 100], [0, 100]])["foreshorten"] == 1.0


def test_a_shorter_back_edge_reads_below_one():
    """Die Reihenfolge ist `[a8, h8, h1, a1]` — der Test beweist die Zuordnung, nicht das Vorzeichen."""
    got = pose_of([[10, 0], [90, 0], [100, 100], [0, 100]])

    assert got["foreshorten"] == 0.8 and got["edge_px"] == pytest.approx(95.2, abs=0.1)


# --- Die Achsen: drei verschiedene Verbunde, und was „unbekannt" wirklich heisst ---


def _dataset(tmp_path, rows: list[dict]) -> str:
    d = tmp_path / "datasets" / "ds"
    d.mkdir(parents=True)
    (d / "manifest.jsonl").write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")
    return "ds"


def _recording(tmp_path, name: str, *, capture: dict | None = None, log: list[dict] = ()) -> None:
    rec = tmp_path / "recordings" / name
    rec.mkdir(parents=True)
    if capture is not None:
        sess = rec / "files" / "sessions" / "s1"
        sess.mkdir(parents=True)
        (sess / "capture.json").write_text(json.dumps(capture), encoding="utf-8")
    if log:
        (rec / "log.jsonl").write_text("\n".join(json.dumps(r) for r in log), encoding="utf-8")


@pytest.fixture
def axes(tmp_path, monkeypatch):
    """`coverage_gaps` ist ein Skript, kein Paket — geladen wie in `test_episode_eval`."""
    from chesslab import config

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr(COVERAGE, "REC", tmp_path / "recordings")
    return COVERAGE.axes


def test_axes_a_recording_without_capture_json_is_unknown_not_normal(axes, tmp_path):
    _recording(tmp_path, "2026-01-01")
    name = _dataset(tmp_path, [{"session_id": "rg-2026-01-01", "frame": "0", "ply": 1}])

    assert axes(name)["height"] == {"unbekannt": 1}


def test_axes_a_composite_without_a_folder_is_unknown_and_silent(axes, tmp_path, recwarn):
    name = _dataset(tmp_path, [{"session_id": "comp-x", "frame": "0"}] * 3)

    got = axes(name)

    assert got["height"] == {"unbekannt": 3} and got["orientation_deg"] == {"unbekannt": 3}
    assert not recwarn.list


def test_axes_two_recordings_with_different_heights_give_two_entries(axes, tmp_path):
    _recording(tmp_path, "a", capture={"height": "tief", "steps": []})
    _recording(tmp_path, "b", capture={"height": "hoch", "steps": []})
    name = _dataset(tmp_path, [{"session_id": "rg-a", "frame": "0"},
                               {"session_id": "rg-b", "frame": "0"},
                               {"session_id": "rg-b", "frame": "1"}])

    assert axes(name)["height"] == {"hoch": 2, "tief": 1}


def test_axes_orientation_joins_over_ply_not_over_the_frame_name(axes, tmp_path):
    """Der Verbund ist 1:n — ein Ply steht fuer viele Frames (gemessen Median 16)."""
    _recording(tmp_path, "a", capture={"height": "normal", "steps": [
        {"ply": 1, "orientation_deg": 0}, {"ply": 2, "orientation_deg": 45}]})
    rows = [{"session_id": "rg-a", "frame": f"{i}", "ply": 1} for i in range(2)]
    rows += [{"session_id": "rg-a", "frame": "9", "ply": 2}, {"session_id": "rg-a", "frame": "9"}]
    name = _dataset(tmp_path, rows)

    got = axes(name)

    assert got["orientation_deg"] == {"0": 2, "45": 1, "unbekannt": 1}
    assert got["height"] == {"normal": 4}


def test_axes_a_row_with_corners_gets_a_bucket_and_one_without_does_not(axes, tmp_path):
    _recording(tmp_path, "a", log=[
        {"frame": "frames/000117.png", "corners": [[0, 0], [100, 0], [100, 100], [0, 100]]}])
    name = _dataset(tmp_path, [{"session_id": "rg-a", "frame": "000117"},
                               {"session_id": "rg-a", "frame": "000200"}])

    got = axes(name)

    assert got["foreshorten"] == {"1.00-1.05": 1, "unbekannt": 1}
    assert got["edge_px"] == {"100-200": 1, "unbekannt": 1}


def test_axes_counts_a_different_denominator_than_the_gaps(axes, tmp_path):
    """`gaps` zaehlt nur sichtbare Figurenzellen, `axes` jede Zeile — nie gegeneinander rechnen."""
    rows = [{"session_id": "comp-x", "frame": "0", "label": "empty", "square_color": "light"},
            {"session_id": "comp-x", "frame": "0", "label": "wQ", "square_color": "light",
             "brightness": 215.0}]
    name = _dataset(tmp_path, rows)

    assert axes(name)["rows_counted"] == 2
    assert sum(g["have"] for g in COVERAGE.gaps(COVERAGE.tally(name))) == 1
