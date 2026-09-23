"""Modell- und Matte-Coverage heissen `model_cov` und `matte_cov`; `cov` wird nur gelesen."""
from __future__ import annotations

from chesslab.hand_flags import session_flags


def test_the_hand_report_names_both_numbers_for_what_they_are():
    reads = [{"session_id": "s", "frame": "000100", "square": "e4", "fen_label": "wP",
              "model_cov": 0.8}]

    row = session_flags(reads, {("000100", "e4"): 0.02}, cut=0.5, visible_max=0.15)[0]

    assert row["model_cov"] == 0.8, "der Sigmoid des Modells"
    assert row["matte_cov"] == 0.02, "was SAM gemessen hat"
    assert "cov" not in row and "measured" not in row, f"mehrdeutige Schluessel uebrig: {sorted(row)}"


def test_a_model_read_written_before_the_rename_is_still_read():
    reads = [{"session_id": "s", "frame": "000100", "square": "e4", "fen_label": "wP", "cov": 0.8}]

    rows = session_flags(reads, {}, cut=0.5, visible_max=0.15)

    assert len(rows) == 1 and rows[0]["model_cov"] == 0.8


def test_the_audit_report_also_still_reads_a_read_from_before_the_rename():
    """Dasselbe Versprechen fuer den zweiten Leser derselben Datei.

    `model-reads.jsonl` liegt auf der Platte und wird nicht neu gerechnet — der Audit-Bericht
    verschweigt sonst still die zweite Meinung des Modells auf JEDER alten Aufnahme.
    """
    from chesslab.audit_flags import session_flags as audit_session_flags

    rows = [{"session_id": "s", "frame": "000100", "square": "e4", "fen_label": "wP",
             "probs": {"wB": 0.99, "wP": 0.01}, "cov": 0.8},
            {"session_id": "s", "frame": "000100", "square": "d4", "fen_label": "wB",
             "probs": {"wB": 0.99, "wP": 0.01}, "cov": 0.1}]

    flags = audit_session_flags(rows, {}, model="m", ts="t")

    assert flags and flags[0]["model_cov"] == 0.8, f"die Modellzahl fiel weg: {flags}"


AMBIGUOUS = {"cov", "measured"}


def test_no_producer_of_the_strittig_lane_writes_the_ambiguous_key():
    """Alle vier Erzeuger auf einmal, denn die Lane legt ihre Zeilen nebeneinander.

    Ein einzelner Bericht, der wieder `cov` schreibt, ist von seinem Nachbarn nicht zu
    unterscheiden — und die beiden meinten das Gegenteil voneinander.
    """
    from chesslab.audit_flags import session_flags as audit_session_flags
    from chesslab.labeling import SETTLE_LIMIT
    from chesslab.position_flags import frame_flags, timing_flags
    from chesslab.temporal_flags import candidate_flags

    start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    after = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    dev = [0.0] * 64
    dev[8] = SETTLE_LIMIT + 10
    entry = {"frame": "frames/000001.png", "fen": start, "ply": 1, "settle_dev": dev,
             "settle_seen": [1.0] * 64, "settle_left": ["a2"]}
    entries = [entry, {"frame": "frames/000002.png", "fen": after, "ply": 2}]
    rows = [
        *frame_flags(entry, {"a2": 0.02}, "s"),
        *timing_flags(entries, [{"ply": 2, "moved": ["e2"], "dev": 61.0}], {}, "s", window=1),
        *candidate_flags([{"frame": "000001", "square": "a2", "temporal_normalized": 0.5,
                           "temporal_raw": 18.0, "reference_stock": "boards",
                           "reference_peers": 5}], [entry], {}, "s", 0.4),
        *session_flags([{"session_id": "s", "frame": "000001", "square": "a2",
                         "fen_label": "wP", "model_cov": 0.8}],
                       {}, cut=0.5, visible_max=0.15),
        *audit_session_flags([{"session_id": "s", "frame": "000001", "square": "a2",
                               "fen_label": "wP", "probs": {"wB": 0.99, "wP": 0.01},
                               "model_cov": 0.8}], {}, model="m", ts="t"),
    ]

    assert len(rows) >= 5, f"ein Erzeuger lieferte nichts, der Pin waere leer: {rows}"
    for row in rows:
        assert not AMBIGUOUS & set(row), f"mehrdeutiger Schluessel in {sorted(row)}"
