"""`cov` hiess in zwei Nachbarberichten das Gegenteil — beide liest dieselbe Strittig-Lane.

`hand_flags` schrieb den MODELL-Sigmoid als `cov`, `position_flags` die SAM-Matte. Nur eine Seite
trug einen Doc-Kommentar, und der beschrieb die Nachbardatei. `audit_flags` taufte dieselbe
Modellzahl ein drittes Mal um. Seit 2026-09-16 heisst die Modellzahl ueberall `model_cov` und die
Matte `matte_cov`; `cov` wird nur noch GELESEN, fuer Dateien, die schon auf der Platte liegen.
"""
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
