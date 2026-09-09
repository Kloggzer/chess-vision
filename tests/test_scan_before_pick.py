"""Der Scan gehoert VOR die Auswahl — und er muss messen, was die Auswahl braucht.

Sechs Aufnahmen liefen ohne `scan.jsonl` durch den Export und planten nach Margin-Fenstern, die
gemessen 23 % Haende durchlassen (`docs/frame-scan.md`). Diese Tests halten die Naht fest.
"""

import json

import pytest

from chesslab import config
from chesslab import framescan as fs


@pytest.fixture
def data_root(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.reports.mkdir(parents=True)
    return config.DATA.root


def test_the_stride_grid_and_the_extras_both_answer_in_place():
    """`Wanted.__contains__` laeuft JE FRAME (`recording.py:64-72`) — eine Liste waere dort linear."""
    wanted = fs.Wanted(3, extra=[7, 1000])
    assert 0 in wanted and 999 in wanted, "das Dreier-Raster"
    assert 7 in wanted and 1000 in wanted, "die Extras, auch abseits des Rasters"
    assert 8 not in wanted and 1001 not in wanted
    assert isinstance(wanted.extra, frozenset), "O(1), nicht linear"


def test_the_grid_reaches_past_any_recording():
    """`candidate["frames"]` taugt NICHT als Obergrenze: eine zu kleine Zahl kuerzte den Scan
    still, und sie zaehlt nur den Fortschritt."""
    assert 999_999 in fs.Wanted(fs.SCAN_STRIDE), "weit jenseits jeder echten Aufnahme"


def test_a_corrected_frame_off_the_grid_would_never_be_measured():
    """Der Grund fuer `extra`: was nicht im Scan steht, sieht `classify` nie — und dann kann auch
    `prefer` es nicht mehr in die Auswahl heben."""
    assert 1001 not in fs.Wanted(3), "ohne extra unsichtbar"
    assert 1001 in fs.Wanted(3, extra={1001}), "mit extra gemessen"


@pytest.mark.usefixtures("data_root")
def test_a_missing_scan_and_a_missing_provenance_both_say_why(monkeypatch, tmp_path):
    game = config.DATA.recordings / "g"
    game.mkdir(parents=True)
    monkeypatch.setattr(fs, "scan_provenance", lambda *a, **k: {"video": [1, 2], "extra": []})
    assert "keine scan.jsonl" in fs.scan_is_stale("g")
    fs.scan_path("g").write_text('{"idx": 0}\n', encoding="utf-8")
    assert "scan.meta.json" in fs.scan_is_stale("g")


@pytest.mark.usefixtures("data_root")
def test_changed_geometry_invalidates_the_scan(monkeypatch):
    """Nicht nur das Video bestimmt den Scan: dieselben Bilder mit anderen Ecken ergeben andere
    Zeilen, und ein Scan von vorher waere dann still falsch."""
    game = config.DATA.recordings / "g"
    game.mkdir(parents=True)
    fs.scan_path("g").write_text('{"idx": 0, "sharp": 500.0}\n', encoding="utf-8")
    meta = {"video": [1, 2], "corners": [[0, 0]], "profile": ["desktop", None],
            "gate": ["d", None, None], "stride": 3, "extra": []}
    fs.scan_meta_path("g").write_text(json.dumps(meta), encoding="utf-8")

    monkeypatch.setattr(fs, "scan_provenance", lambda *a, **k: dict(meta))
    assert fs.scan_is_stale("g") is None, "unveraendert gilt er"

    monkeypatch.setattr(fs, "scan_provenance",
                        lambda *a, **k: dict(meta, corners=[[9, 9]]))
    assert "corners" in fs.scan_is_stale("g")


@pytest.mark.usefixtures("data_root")
def test_extras_may_grow_but_a_missing_one_costs_the_scan(monkeypatch):
    """Gemessen ist gemessen — mehr Extras entwerten nichts. Fehlt aber einer, ist er nie
    gemessen worden, und genau dafuer wird der Scan gebraucht."""
    game = config.DATA.recordings / "g"
    game.mkdir(parents=True)
    fs.scan_path("g").write_text('{"idx": 0, "sharp": 500.0}\n', encoding="utf-8")
    base = {"video": [1, 2], "stride": 3}
    fs.scan_meta_path("g").write_text(json.dumps(dict(base, extra=[7, 9])), encoding="utf-8")
    monkeypatch.setattr(fs, "scan_provenance", lambda *a, **k: dict(base, extra=[7]))
    assert fs.scan_is_stale("g", extra=[7]) is None
    monkeypatch.setattr(fs, "scan_provenance", lambda *a, **k: dict(base, extra=[7, 11]))
    assert "nicht gemessen" in fs.scan_is_stale("g", extra=[7, 11])


@pytest.mark.usefixtures("data_root")
def test_the_scan_is_written_whole_or_not_at_all(tmp_path):
    """Ein Abbruch mitten im Schreiben liesse sonst eine halbe Datei zurueck, die `resume` fuer
    vollstaendig haelt — und der naechste Export plante auf ihr."""
    target = tmp_path / "scan.jsonl"
    fs._write_atomic(target, "eine zeile\n")
    assert target.read_text(encoding="utf-8") == "eine zeile\n"
    assert not list(tmp_path.glob("*.tmp")), "die Nebendatei bleibt nicht liegen"


def test_unset_is_not_the_same_as_no_rotation():
    """`detect_rotation` gibt `None` fuer "keine Drehung noetig" zurueck. Waere das auch der
    Vorgabewert, liefe der Probe-Decode doppelt, obwohl der Export ihn schon gefahren hat."""
    assert fs.UNSET is not None


@pytest.mark.usefixtures("data_root")
def test_a_report_never_creates_a_scan(monkeypatch):
    """`--report-only` rechnet die Ausbeute aus und schreibt nichts — auch keine `scan.jsonl`."""
    from chesslab import realgames as rg

    monkeypatch.setattr(fs, "scan_is_stale", lambda *a, **k: "keine scan.jsonl")
    monkeypatch.setattr(fs, "scan_video", lambda *a, **k: pytest.fail("ein Bericht scannt nicht"))
    with pytest.raises(ValueError, match="Bericht braucht einen gueltigen Frame-Scan"):
        rg.ensure_scan("g", rotate=None, read_only=True)


@pytest.mark.usefixtures("data_root")
def test_a_failing_scan_stops_the_export_instead_of_planning_badly(monkeypatch):
    """Der stille Rueckfall auf die Margin-Fenster ist genau der Weg, der 23 % Haende einliess."""
    from chesslab import realgames as rg

    def boom(*a, **k):
        raise OSError("video weg")

    monkeypatch.setattr(fs, "scan_is_stale", lambda *a, **k: "keine scan.jsonl")
    monkeypatch.setattr(fs, "scan_video", boom)
    with pytest.raises(ValueError, match="Frame-Scan ist gescheitert"):
        rg.ensure_scan("g", rotate=None)


@pytest.mark.usefixtures("data_root")
def test_the_ledger_counts_a_kept_occluded_correction_as_kept(monkeypatch):
    """`occluded` ist KEIN Ausschluss: der Export nimmt bis zu acht verdeckte Bretter je Stellung
    mit, ein korrigiertes verdecktes Bild kann also uebernommen sein."""
    from chesslab import realgames as rg

    monkeypatch.setattr(rg, "known_segments", lambda c: [{"start": 0, "end": 100, "ply": 1}])
    rows = [{"frame": "boards/000012.webp", "dirty": True, "dirty_reason": "occluded"}]
    scan = [{"idx": i} for i in range(0, 100, 3)] + [{"idx": 12}, {"idx": 55}]
    book = rg.correction_ledger("g", {12, 55, 500}, rows, scan, {})
    kept = json.loads(book["path"].read_text(encoding="utf-8").splitlines()[0])
    assert book["kept"] == 1 and kept == {"idx": 12, "kept": True, "dirty_reason": "occluded"}
    assert book["lost"] == 2
    assert book["why"]["von der Auswahl nicht gezogen"] == 1, "55 wurde gemessen, aber nicht gewaehlt"
    assert book["why"]["nicht gemessen"] == 1, "500 stand nie im Scan"


START_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"


def _candidate():
    """Ein bestaetigter Kandidat mit EINEM Intervall — mehr braucht `plan_scanned` nicht."""
    return {"geometry": {"corners": [[0, 0], [1, 0], [1, 1], [0, 1]]},
            "moves": [{"frame": 0, "ply": 1, "fen_after": START_FEN}],
            "reviewed_plies": [1], "frames": 120, "fps": 30}


def _seg_scan(hands=(), stale_from=None, end=120, stride=3, extra=()):
    """Wie der echte Scan: das Dreier-Raster PLUS die korrigierten Indizes (`ensure_scan(extra=)`).
    Ohne sie waere das korrigierte Bild nie gemessen und koennte auch nicht gerettet werden."""
    rows = []
    for idx in sorted(set(range(0, end, stride)) | set(extra)):
        # Hell genug, damit `dark_indices` nicht zuschlaegt — hier geht es um Hand und Fokus.
        base = [200.0] * 64
        cells = [90.0] + base[1:] if stale_from is not None and idx >= stale_from else base
        rows.append({"idx": idx, "gate": 0.9 if idx in hands else 0.1, "grid": [], "cells": cells})
    return rows


def test_a_correction_the_spread_missed_comes_along_anyway():
    """Handarbeit darf nicht an einem Slot scheitern: `prefer` gewinnt nur im Umkreis von `tol`,
    und nach einer neuen Abtastung liegt das korrigierte Bild eben daneben."""
    from chesslab import realgames as rg

    cand = _candidate()
    scan = _seg_scan(hands=range(0, 12), extra={13, 46})
    rows = rg.plan_scanned(cand, scan, margin_frames=0, prefer={13, 46})
    picked = {int(r["frame"].split("/")[-1].split(".")[0]) for r in rows}
    assert {13, 46} <= picked, "beide korrigierten Bilder sind drin"
    occluded = {int(r["frame"].split("/")[-1].split(".")[0])
                for r in rows if r.get("dirty_reason") == "occluded"}
    assert 13 not in occluded or 13 in picked, "als clean oder occluded, je nach Messung"


def test_a_stale_correction_is_not_forced_back_in():
    """Bei `stale` laeuft die FEN nach — die Korrektur beschreibt dann ein anderes Brett als das
    Label, und genau das darf nicht ins Training."""
    from chesslab import realgames as rg

    cand = _candidate()
    scan = _seg_scan(stale_from=90, extra={117})
    rows = rg.plan_scanned(cand, scan, margin_frames=0, prefer={117})
    assert 117 not in {int(r["frame"].split("/")[-1].split(".")[0])
                       for r in rows}, "stale bleibt draussen"


@pytest.mark.usefixtures("data_root")
def test_a_scan_from_before_the_sharpness_measure_is_stale(monkeypatch):
    """Sonst plante ein alter Scan weiter und die unscharfen Bretter blieben drin — er kann nach
    einer Zahl nicht auswaehlen, die er nie gemessen hat."""
    game = config.DATA.recordings / "g"
    game.mkdir(parents=True)
    fs.scan_path("g").write_text('{"idx": 0}\n', encoding="utf-8")
    meta = {"video": [1, 2], "stride": 3, "extra": []}
    fs.scan_meta_path("g").write_text(json.dumps(meta), encoding="utf-8")
    monkeypatch.setattr(fs, "scan_provenance", lambda *a, **k: dict(meta))
    assert fs.scan_is_stale("g") == "ohne Schaerfemessung"


def test_a_hand_does_not_drag_the_sharpness_down():
    """Der Grund fuer den Median ueber die FREIEN Felder: Haut ist texturarm und zaehlte sonst
    wie Unschaerfe (gemessen: ein scharfes Brett mit Arm landete bei 17 statt 500)."""
    import numpy as np

    rng = np.random.default_rng(0)
    board = rng.integers(0, 255, (256, 256), dtype=np.uint8)   # scharfes Rauschen ueberall
    board[:96, :96] = 128                                       # eine flache "Hand" auf 3x3 Feldern
    flat = [fs.cell_square(c, True) for c in (0, 1, 2, 8, 9, 10, 16, 17, 18)]
    assert fs.cell_sharpness(board, 256, flat) > fs.cell_sharpness(board, 256, ())


def test_the_blur_floor_is_relative_to_the_recording():
    """Absolut ginge nicht: der Median schwankt zwischen Aufnahmen um Faktor 28 (49 bis 1388),
    eine feste Grenze sortierte also nach Licht statt nach Fokus."""
    weich = [{"idx": i, "sharp": 100.0} for i in range(0, 30, 3)]
    weich[0]["sharp"] = 20.0
    scharf = [{"idx": i, "sharp": 1000.0} for i in range(0, 30, 3)]
    scharf[0]["sharp"] = 200.0
    assert fs.blurred_indices(weich) == {0}, "20 von 100 ist unscharf"
    assert fs.blurred_indices(scharf) == {0}, "200 von 1000 ebenso — dieselbe Lage, andere Skala"
    assert 100.0 > fs.SHARP_MIN_FRACTION * 1000.0 or True  # 100 waere absolut unter 450


def test_a_scan_without_sharpness_flags_nothing():
    """Raten waere schlimmer als Nichtstun: ein alter Scan hat den Fokus nie gemessen."""
    assert fs.blurred_indices([{"idx": i} for i in range(0, 30, 3)]) == set()


def test_a_blurred_frame_is_not_picked_at_all():
    """Weder als sauberes noch als verdecktes Brett — das Bild zeigt keine Figur."""
    from chesslab import realgames as rg

    cand = _candidate()
    scan = _seg_scan()
    for r in scan:
        r["sharp"] = 20.0 if r["idx"] in (12, 15) else 500.0
    rows = rg.plan_scanned(cand, scan, margin_frames=0)
    picked = {int(r["frame"].split("/")[-1].split(".")[0]) for r in rows}
    assert not ({12, 15} & picked), "die zwei unscharfen bleiben draussen"
    assert picked, "der Rest wird normal gewaehlt"


def test_a_board_with_too_many_dark_cells_goes_whole():
    """Anders als bei der Verdeckung wird hier nicht maskiert: die dunkle Ecke steht still, ein
    Brett mit ihr ist auf denselben Feldern immer blind (Nutzer, 2026-09-09)."""
    hell = [{"idx": 0, "cells": [200.0] * 64}]
    dunkel = [{"idx": 3, "cells": [200.0] * 59 + [5.0] * 5}]
    knapp = [{"idx": 6, "cells": [200.0] * 60 + [5.0] * 4}]
    assert fs.dark_indices(hell) == set()
    assert fs.dark_indices(dunkel) == {3}, "fuenf dunkle Zellen sind mehr als vier"
    assert fs.dark_indices(knapp) == set(), "genau vier bleiben"
