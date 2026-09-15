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
