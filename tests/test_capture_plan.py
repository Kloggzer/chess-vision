"""Der Planer und die Posenrechnung: was ein Auftrag zusagt und was er bewusst nicht zusagt."""

from __future__ import annotations

import json

import pytest

from chesslab.capture_plan import (
    BAND_CAPACITY,
    BANDS,
    HEIGHTS,
    ORIENTATION_STEPS,
    SET_BUDGET,
    Gap,
    band_middle,
    band_of,
    band_range,
    board_spread,
    bundles,
    pose_of,
    shots,
    slug,
    square_colour,
    square_stats,
)
from conftest import load_script

COVERAGE = load_script("coverage_gaps")

#: Je Farbe drei Felder, eines in `hell`, `mittel` und `dunkel` der ZIELDOMAENE.
#: Die Farben sind die des echten Bretts — a1 dunkel, b1 hell, a3 dunkel.
def _stat(median: float, *, p5: float | None = None, p95: float | None = None):
    """Ein Feld mit Median UND Spannweite; ohne Angabe ist die Spannweite so weit, dass der Median
    allein entscheidet.
    """
    return {"color": "light", "median": median, "n": 100,
            "p5": median - 120 if p5 is None else p5,
            "p95": median + 120 if p95 is None else p95}


BRIGHT = {sq: _stat(v) for sq, v in
          {"h3": 166.0, "b1": 110.0, "e4": 54.0,          # hell
           "a1": 166.0, "a3": 110.0, "d4": 54.0}.items()}  # dunkel


def _gap(piece="wQ", colour="light", band="hell", have=0, fix="Stellung") -> Gap:
    return Gap(piece=piece, square_color=colour, band=band, have=have, fix=fix,
               corpus_in_band=1211)


def test_a_missing_brightness_is_unknown_not_dark():
    """376 640 Komposit-Zeilen haengen daran; `or 0.0` warf sie frueher ins dunkelste Band."""
    assert band_of(None) == "unbekannt"
    assert band_of(0.0) == "zu dunkel"


def test_band_middle_is_defined_for_every_band():
    """Die Auswahlregel braucht sie fuer alle fuenf — „hellstes bzw. dunkelstes" waere fuer
    `mittel` nicht entscheidbar."""
    assert [band_middle(name) for _, _, name in BANDS] == [54.0, 82.0, 110.0, 138.0, 166.0]


def test_square_colour_matches_the_board():
    assert square_colour("a1") == "dark" and square_colour("b1") == "light"
    assert square_colour("h3") == "light" and square_colour("a3") == "dark"


def test_the_slug_carries_the_band_because_the_pair_collides():
    """58 Luecken verteilen sich auf 24 Paare aus Figur und Feldfarbe — ohne Band kollidieren 22."""
    with_band = {slug(g["piece"], g["square_color"], g["band"])
                 for g in (_gap(band=n) for _, _, n in BANDS)}
    without = {slug(g["piece"], g["square_color"]) for g in (_gap(band=n) for _, _, n in BANDS)}

    assert len(with_band) == len(BANDS) and len(without) == 1


def test_a_placement_carries_the_band_it_is_measured_against():
    """Ein Feld allein sagt nichts zu: `a8` mass ueber den Korpus 6 bis 207. Erst `lo`/`hi`
    machen den Vorschlag pruefbar."""
    got = shots([_gap(band="mittel")], BRIGHT, limit=1)[0]["place"]

    assert got == [{"square": "b1", "piece": "wQ", "band": "mittel", "lo": 96, "hi": 124,
                    "seen_lo": -10.0, "seen_hi": 230.0}]


def test_a_square_that_never_reaches_the_band_loses_to_one_that_does():
    """Der Median waehlt, die Spannweite schliesst aus.

    `b1` liegt mit 110 naeher an der Mitte von `mittel` (110) als `e4` mit 54 — aber unter dieser
    Lampe kam `b1` nie in das Band. Ein Vorschlag, der nicht eintreten kann, kostet eine ganze
    Aufnahme.
    """
    # Nur die drei hellen Felder, damit die Wahl eindeutig ist: `h3` liegt 56 daneben, `e4` 20.
    stats = {
        "h3": _stat(166.0),                             # erreicht das Band, aber weit weg
        "b1": _stat(110.0, p5=140.0, p95=200.0),        # Median MITTIG, war aber nie im Band
        "e4": _stat(90.0, p5=100.0, p95=130.0),         # weiter weg, aber im Band gemessen
    }

    got = shots([_gap(band="mittel")], stats, limit=1)[0]["place"][0]

    assert got["square"] == "e4", "das Feld, dessen Spannweite das Band wirklich erreicht"
    assert (got["seen_lo"], got["seen_hi"]) == (100.0, 130.0)


def test_without_any_reachable_square_the_median_still_decides():
    """Sonst faende der Auftrag gar kein Feld — ein Vorschlag ist besser als keiner."""
    stats = {sq: _stat(s["median"], p5=250.0, p95=255.0) for sq, s in BRIGHT.items()}

    got = shots([_gap(band="mittel")], stats, limit=1)[0]["place"][0]

    assert got["square"] == "b1", "b1 liegt mit 110 genau auf der Bandmitte"


def test_the_field_is_the_one_nearest_the_band_middle_not_the_brightest():
    """Fuer `hell` ist es das hellste, fuer `mittel` gerade nicht — dieselbe Regel."""
    hell = shots([_gap(band="hell")], BRIGHT, limit=1)[0]["place"][0]["square"]
    mitte = shots([_gap(band="mittel")], BRIGHT, limit=1)[0]["place"][0]["square"]

    assert hell == "h3" and mitte == "b1"


# --- Die Buendelung: zwei Grenzen, Figurenkasten und Lampe ---


def test_one_shot_carries_many_pieces_because_the_board_holds_them():
    """Der ganze Punkt: sechs Luecken sind EINE Aufnahme, nicht sechs."""
    gaps = [_gap(piece=p, colour="light", band="mittel") for p in ("wQ", "wK", "bQ")]
    gaps += [_gap(piece=p, colour="dark", band="mittel") for p in ("bK", "wR", "bR")]

    got = shots(gaps, BRIGHT, limit=9)

    assert len(got) == 1 and len(got[0]["place"]) == len(gaps)


def test_two_gaps_for_the_same_piece_need_two_shots():
    """Es gibt nur eine schwarze Dame — `bQ` fehlt in fuenf Baendern, also fuenf Aufnahmen."""
    gaps = [_gap(piece="bQ", band="mittel"), _gap(piece="bQ", band="mittel")]

    assert [len(g) for g in bundles(gaps, spread=255)] == [1, 1]


def test_eight_pawn_gaps_still_fit_one_shot():
    """`SET_BUDGET` ist der Kasten, nicht eine runde Zahl: acht Bauern liegen darin."""
    gaps = [_gap(piece="wP", band="mittel") for _ in range(SET_BUDGET["P"])]

    assert [len(g) for g in bundles(gaps, spread=255)] == [len(gaps)]


def test_bands_further_apart_than_the_board_spans_cannot_share_a_shot():
    """Eine Lampe verschiebt alle Felder zusammen. Die Zieldomaene spannt von `dunkel` (54) bis
    `hell` (166) genau 112 — gemessen ist die Brettspanne 112, also passen alle fuenf Gruppen in
    EIN Bild. Ein Grauwert weniger, und die Raender trennen sich."""
    gaps = [_gap(piece="wQ", band="dunkel"), _gap(piece="wK", band="hell")]

    assert [len(g) for g in bundles(gaps, spread=111)] == [1, 1]
    assert [len(g) for g in bundles(gaps, spread=112)] == [2]


def test_a_band_never_gets_more_pieces_than_squares_fall_into_it():
    """Gemessen ueber 15 235 volle Bretter: in `hell` liegen auf dunklen Feldern p90 ZWEI Zellen
    gleichzeitig. Ein Auftrag ueber vier davon wurde nie gruen, weil er es nicht werden konnte."""
    gaps = [_gap(piece=p, colour="dark", band="hell") for p in ("wQ", "wK", "bQ", "bK")]

    got = bundles(gaps, spread=255)

    assert [len(g) for g in got] == [BAND_CAPACITY[("dark", "hell")], 2]


def test_the_capacity_is_per_band_and_colour_not_global():
    """Auf hellen Feldern traegt dieselbe Gruppe 14 — die Grenze ist die Feldfarbe, nicht das Band."""
    gaps = [_gap(piece=p, colour="light", band="hell") for p in ("wQ", "wK", "bQ", "bK")]

    assert [len(g) for g in bundles(gaps, spread=255)] == [4]


def test_the_edges_are_measured_but_never_ordered():
    """`zu dunkel` und `zu hell` entstehen durch Schatten und Spotlight — als Beifang. Der Planer
    kennt sie, `coverage_gaps.gaps` laeuft aber nur ueber `BANDS`."""
    assert band_of(20.0) == "zu dunkel" and band_of(200.0) == "zu hell"
    assert band_range("zu dunkel") == (0, 40) and band_range("zu hell") == (180, 256)
    assert "zu dunkel" not in [n for _, _, n in BANDS]


def test_the_target_domain_is_five_equal_groups():
    """Gleich breit und nicht nach Quantilen: Quantilgrenzen verschoeben sich mit jedem Datensatz
    und machten alte Lueckenzahlen unvergleichbar."""
    widths = {hi - lo for lo, hi, _ in BANDS}

    assert widths == {28} and BANDS[0][0] == 40 and BANDS[-1][1] == 180


def test_board_spread_is_the_gradient_not_the_absolute_level():
    assert board_spread({"a1": 45.0, "h8": 157.0}) == 112.0
    assert board_spread({}) == 0.0


def test_no_two_pieces_land_on_the_same_square():
    """Ohne die Sperre stuenden zwoelf Figuren auf demselben `a8` — der Plan waere unbaubar."""
    gaps = [_gap(piece=p, band="mittel") for p in ("wQ", "wK", "bQ", "bK", "wR", "bR")]

    place = shots(gaps, BRIGHT, limit=1)[0]["place"]

    assert len({p["square"] for p in place}) == len(place)


def test_a_gap_without_a_free_square_is_dropped_not_stacked():
    """Drei helle Felder kennt BRIGHT; die vierte helle Luecke hat keines mehr."""
    gaps = [_gap(piece=p, colour="light", band="mittel") for p in ("wQ", "wK", "bQ", "bK")]

    assert len(shots(gaps, BRIGHT, limit=1)[0]["place"]) == 3


def test_closes_names_only_the_gaps_that_were_actually_placed():
    """Sonst meldet der Plan eine Luecke als geschlossen, fuer die keine Figur steht — und die
    CLI zaehlt sie mit. Die verworfene muss in die NAECHSTE Aufnahme."""
    gaps = [_gap(piece=p, colour="light", band="mittel") for p in ("wQ", "wK", "bQ", "bK")]

    got = shots(gaps, BRIGHT, limit=9)

    assert [len(s["place"]) for s in got] == [len(s["closes"]) for s in got]
    placed = [p["piece"] for s in got for p in s["place"]]
    assert sorted(placed) == ["bK", "bQ", "wK", "wQ"], "die vierte Luecke ist verlorengegangen"


def test_a_shot_that_can_place_nothing_is_not_emitted_at_all():
    """`id='01-'` und „0 Figuren, Baender " bestand die Schema-Pruefung klaglos."""
    only_light = {sq: v for sq, v in BRIGHT.items() if square_colour(sq) == "light"}

    got = shots([_gap(colour="dark", band="mittel")], only_light, limit=9)

    assert got == []


def test_every_height_appears_across_the_shots():
    """Der Korpus kennt genau eine Hoehe; ein Plan, der nur eine vorschlaegt, aendert das nie."""
    got = shots([_gap(piece="wQ", band=n) for _, _, n in BANDS] * 3, BRIGHT, limit=6)

    assert {s["height"] for s in got} == set(HEIGHTS)
    assert {s["orientations"] for s in got} == {ORIENTATION_STEPS}


def test_limit_cuts_bundles_without_reordering():
    """`limit` schneidet AUFNAHMEN ab, nicht Luecken — sonst faellt die Haelfte eines Buendels weg."""
    gaps = [_gap(piece="wQ", band="mittel") for _ in range(3)]

    got = shots(gaps, BRIGHT, limit=2)

    assert len(got) == 2 and [len(s["closes"]) for s in got] == [1, 1]


def test_band_range_and_middle_agree():
    assert band_range("mittel") == (96, 124) and band_middle("mittel") == 110.0


def test_shots_refuses_an_unmeasured_board():
    """Ohne `brightness` waere jedes Feld geraten — lieber laut als ein erfundener Plan."""
    with pytest.raises(ValueError, match="backfill_brightness"):
        shots([_gap()], {}, limit=1)


def test_a_row_without_the_column_does_not_darken_the_square(tmp_path):
    """Ein Komposit ohne `brightness` darf das Feld nicht dunkel faerben."""
    p = tmp_path / "manifest.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in [
        {"square": "h3", "brightness": 200.0}, {"square": "h3", "brightness": 210.0},
        {"square": "h3"}, {"square": "a1", "brightness": 20.0}]), encoding="utf-8")

    assert {sq: st["median"] for sq, st in square_stats(p).items()} == {"h3": 205.0, "a1": 20.0}


def test_square_stats_carry_the_spread_not_just_the_median(tmp_path):
    """Der Median waehlt das Feld, die Spannweite sagt, ob das Band dort je erreicht wurde."""
    p = tmp_path / "manifest.jsonl"
    rows = [{"square": "h3", "brightness": float(v)} for v in range(0, 200, 2)]
    p.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")

    got = square_stats(p)["h3"]

    assert got["color"] == "light" and got["n"] == len(rows)
    assert got["p5"] == 10.0 and got["median"] == 99.0 and got["p95"] == 190.0


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
             "brightness": 166.0}]
    name = _dataset(tmp_path, rows)

    assert axes(name)["rows_counted"] == 2
    assert sum(g["have"] for g in COVERAGE.gaps(COVERAGE.tally(name))) == 1
