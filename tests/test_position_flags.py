"""Die strittigen Zellen: was die Stellungs-Lane vorlegt, und was sie bewusst NICHT vorlegt."""

import numpy as np

from chesslab.cell_rule import PIECE_VISIBLE_MAX
from chesslab.labeling import SETTLE_LIMIT, all_squares
from chesslab.position_flags import frame_flags, timing_flags
from chesslab.realgames.position import SETTLE_CELL_PX, interval_moves

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
E4 = all_squares().index("e4")
A2 = all_squares().index("a2")


def _entry(left=(), dev=None, seen=None, **kw) -> dict:
    """Eine Log-Zeile, wie `session settle-scan` sie schreibt: Messung PLUS Urteil."""
    row = {"frame": "frames/000007.png", "fen": START, "ply": 3,
           "settle_dev": dev if dev is not None else [0.0] * 64,
           "settle_seen": seen if seen is not None else [1.0] * 64,
           "settle_left": list(left)}
    return row | kw


def _dev(square: int, value: float) -> list[float]:
    out = [0.0] * 64
    out[square] = value
    return out


def test_a_visible_cell_that_left_its_position_is_the_card():
    """Der laufende Bauer: a2 ist leer, a3 hält ihn — beide Felder sind sichtbar und weichen ab."""
    flags = frame_flags(_entry(left=["a2"], dev=_dev(A2, SETTLE_LIMIT + 10)), {"a2": 0.0}, "rg-x")

    assert [f["square"] for f in flags] == ["a2"]
    assert flags[0]["reason"] == "changed"
    assert flags[0]["fen_label"] == "wP"
    assert flags[0]["frame"] == "000007"


def test_a_covered_cell_is_never_asked():
    """Unter der Hand nimmt die Coverage die Zelle aus dem Loss, auch ohne `settle_left`."""
    flags = frame_flags(_entry(dev=_dev(E4, SETTLE_LIMIT + 10)), {"e4": PIECE_VISIBLE_MAX + 0.1}, "rg-x")

    assert flags == []


def test_a_cell_the_matte_calls_covered_is_no_card_even_when_it_left():
    """Die Matte ist juenger als `settle_left`: eine seither verdeckte Zelle wird keine Karte."""
    entry = _entry(left=["e4"], dev=_dev(E4, SETTLE_LIMIT + 10))

    assert frame_flags(entry, {"e4": PIECE_VISIBLE_MAX + 0.1}, "rg-x") == []


def test_a_covered_cell_is_no_card_even_when_it_was_never_readable():
    """Auch der `unreadable`-Zweig: was der Verlust maskiert, hat der Mensch nicht zu benennen."""
    seen = [1.0] * 64
    seen[E4] = 0.2

    assert frame_flags(_entry(left=["e4"], seen=seen), {"e4": 0.9}, "rg-x") == []


def test_unmeasured_coverage_still_asks():
    """`None` heisst UNGEMESSEN, nicht sichtbar und nicht verdeckt — die Karte bleibt."""
    entry = _entry(left=["e4"], dev=_dev(E4, SETTLE_LIMIT + 10))

    assert [f["square"] for f in frame_flags(entry, None, "rg-x")] == ["e4"]
    assert [f["square"] for f in frame_flags(entry, {}, "rg-x")] == ["e4"]


def test_a_cell_the_alpha_barely_saw_is_asked_as_unreadable():
    """Halb verdeckt heißt weder vergleichbar noch vom Loss ausgenommen — genau die Lücke."""
    seen = [1.0] * 64
    seen[E4] = 0.2

    flags = frame_flags(_entry(left=["e4"], seen=seen), {"e4": 0.1}, "rg-x")

    assert [(f["square"], f["reason"]) for f in flags] == [("e4", "unreadable")]


def test_without_a_verdict_nothing_is_strittig():
    """Ungemessen ist nicht unstrittig: ohne `settle_left` gelten die alten Frame-Tore."""
    assert frame_flags(_entry(dev=[], seen=[]), {"e4": 0.0}, "rg-x") == []
    assert frame_flags(_entry(dev=_dev(E4, 99.0)), {"e4": 0.0}, "rg-x") == []


def test_a_square_the_exporter_already_doubts_is_not_asked_twice():
    """`unknown_squares` hat seine eigene Lane; zwei Karten für dieselbe Zelle sind eine zu viel."""
    entry = _entry(left=["e4"], dev=_dev(E4, SETTLE_LIMIT + 10), unknown_squares=["e4"])

    assert frame_flags(entry, {"e4": 0.0}, "rg-x") == []


def _ref(shade: int = 90) -> np.ndarray:
    return np.full((64, SETTLE_CELL_PX, SETTLE_CELL_PX, 3), shade, np.uint8)


def test_the_commit_window_proves_itself_on_the_squares_the_move_touched():
    """Ein Commit an der falschen Stelle hängt einen FEN an Pixel, die ihn nie gezeigt haben —
    und danach stimmt jedes Frame des Intervalls mit einer Referenz überein, die schon falsch ist."""
    after = _ref()
    after[all_squares().index("e2"), :SETTLE_CELL_PX // 2] = 220
    fens = {1: START, 2: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"}

    seen = interval_moves({1: _ref(), 2: after}, fens)
    blind = interval_moves({1: _ref(), 2: _ref()}, fens)

    assert [(c["ply"], c["seen"]) for c in seen] == [(2, True)]
    assert seen[0]["moved"] == ["e2", "e4"]
    assert [(c["ply"], c["seen"]) for c in blind] == [(2, False)]


# --- Zug-Zeitpunkt: die bewegten Felder rund um die Ply-Grenze -------------------------

AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"


def _ply(ply: int, frame: str, fen: str) -> dict:
    return {"frame": f"frames/{frame}.png", "fen": fen, "ply": ply}


def _timing_entries() -> list[dict]:
    """Zwei Plies zu je vier Frames, dazwischen der Zug e2-e4."""
    return ([_ply(1, f"00000{i}", START) for i in range(1, 5)]
            + [_ply(2, f"00000{i}", AFTER_E4) for i in range(5, 9)])


def test_only_the_squares_the_move_touched_become_timing_cards():
    """Der Kern: 62 Felder sind unberuehrt, e2 und e4 haengen am Zeitpunkt."""
    flags = timing_flags(_timing_entries(), [{"ply": 2, "moved": ["e2", "e4"], "dev": 61.0,
                                              "seen": True}], {}, "s", window=1)

    assert {f["square"] for f in flags} == {"e2", "e4"}
    assert {f["reason"] for f in flags} == {"timing"}


def test_the_window_reaches_across_the_boundary_in_both_directions():
    """Zu spaet festgeschrieben faellt in den Vorgaenger, zu frueh in den Ply selbst."""
    flags = timing_flags(_timing_entries(), [{"ply": 2, "moved": ["e2"], "dev": 61.0}],
                         {}, "s", window=2)

    assert sorted({f["frame"] for f in flags}) == ["000003", "000004", "000005", "000006"]


def test_the_card_carries_the_label_of_its_own_frame_not_of_the_move():
    """Dasselbe Feld heisst vor und nach der Grenze verschieden - genau das ist die Frage."""
    flags = timing_flags(_timing_entries(), [{"ply": 2, "moved": ["e4"], "dev": 61.0}],
                         {}, "s", window=1)

    assert {f["frame"]: f["fen_label"] for f in flags} == {"000004": "empty", "000005": "wP"}


def test_a_covered_square_is_not_asked_the_loss_already_ignores_it():
    matte = {"000004": {"e4": PIECE_VISIBLE_MAX + 0.1}}

    flags = timing_flags(_timing_entries(), [{"ply": 2, "moved": ["e4"], "dev": 61.0}],
                         matte, "s", window=1)

    assert [f["frame"] for f in flags] == ["000005"]


def test_a_ply_without_a_move_has_no_timing_question():
    flags = timing_flags(_timing_entries(), [{"ply": 2, "moved": [], "dev": 0.0}],
                         {}, "s", window=2)

    assert flags == []


def test_an_unusable_frame_never_becomes_a_card():
    entries = _timing_entries()
    entries[3]["unusable"] = True

    flags = timing_flags(entries, [{"ply": 2, "moved": ["e4"], "dev": 61.0}], {}, "s", window=1)

    assert [f["frame"] for f in flags] == ["000003", "000005"]


# --- Ungemessene Aufnahmen: null Flags heisst nicht "nichts strittig" -------------------


def _measured_session(tmp_path, monkeypatch, entries):
    from chesslab import config, temporal_flags
    from chesslab import position_flags as mod

    rec = tmp_path / "recordings" / "test"
    rec.mkdir(parents=True)
    (rec / "log.jsonl").write_text("", encoding="utf-8")
    (rec / "session.yaml").write_text("", encoding="utf-8")
    (rec / "matte.jsonl").write_text("", encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr(mod, "read_session_meta", lambda _: {"session_id": "rg-test"})
    monkeypatch.setattr(mod, "read_matte", lambda _: {})
    monkeypatch.setattr(mod, "read_log_rows", lambda _: entries)
    monkeypatch.setattr(temporal_flags, "load_flags", lambda *_a: ([], False))
    return mod.position_flags()


def test_a_session_settle_scan_never_touched_is_named_as_unmeasured(tmp_path, monkeypatch):
    """Ohne `settle_dev` faellt jede Zelle durch — der Bericht sah aus wie "nichts strittig"."""
    entry = {"frame": "frames/000007.png", "fen": START, "ply": 3}

    result = _measured_session(tmp_path, monkeypatch, [entry])

    assert result["flags"] == 0
    assert result["unmeasured"] == ["rg-test"]


def test_a_scanned_session_without_disputes_is_not_called_unmeasured(tmp_path, monkeypatch):
    result = _measured_session(tmp_path, monkeypatch, [_entry()])

    assert result["flags"] == 0
    assert result["unmeasured"] == []


def test_the_report_header_carries_the_unmeasured_sessions(tmp_path, monkeypatch):
    """Die Kopfzeile ist, was der TS-Leser sieht — die Rueckgabe bleibt im Prozess."""
    import json

    entry = {"frame": "frames/000007.png", "fen": START, "ply": 3}

    result = _measured_session(tmp_path, monkeypatch, [entry])

    header = json.loads(result["path"].read_text(encoding="utf-8").splitlines()[0])
    assert header["_unmeasured"] == ["rg-test"]
