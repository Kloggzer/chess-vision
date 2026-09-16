"""Der Bericht meldet den ganzen dirty-Stapel, der Standardlauf arbeitet `occluded` zuerst ab.

Das ist eine Reihenfolge und kein Widerspruch — entschieden 2026-09-16, nachdem der Korpus
gezaehlt war: 3 366 Frames gemattet, 21 offen im Standard-Stapel und 117 im uebrigen, und beide
Zahlen auf EINER Aufnahme. Falsch war nur, beides als eine Zahl zu melden; das trennt
`missing`/`missing_other` seit 2026-09-15. Diese Datei haelt die Trennung fest.
"""
from __future__ import annotations

from chesslab.matte import ALPHA_REASON, dirty_pile


def _row(stem: str, reason: str | None, **extra) -> dict:
    return {"frame": f"frames/{stem}.png", "board": f"dirty/{stem}.webp",
            "dirty": True, "dirty_reason": reason, **extra}


ROWS = [
    _row("000010", "occluded"),
    _row("000020", "changed"),
    _row("000030", "stale"),
    _row("000040", "occluded"),
    {"frame": "frames/000050.png", "board": "boards/000050.webp"},
    _row("000060", "changed", unusable=True),
]


def test_the_pile_is_every_dirty_frame_with_a_board_and_no_unusable_flag():
    assert dirty_pile(ROWS, "all") == {"000010", "000020", "000030", "000040"}


def test_a_named_reason_narrows_the_pile():
    assert dirty_pile(ROWS, "changed") == {"000020"}


def test_the_default_run_leaves_half_the_reported_gap_untouched():
    # Was `occluders status` meldet, minus was ein Standardlauf anfasst.
    never = dirty_pile(ROWS, "all") - dirty_pile(ROWS, ALPHA_REASON)
    assert never == {"000020", "000030"}, (
        "diese Menge erreicht nur `--reason all`; wird sie leer, hat jemand die Vorgabe "
        "geaendert, und der Bericht muss es mitbekommen")


def _rows_on_disk(tmp_path):
    import json

    sdir = tmp_path / "s"
    (sdir / "boards").mkdir(parents=True)
    rows = [
        {"frame": "frames/000010.png", "board": "dirty/000010.webp", "dirty": True,
         "dirty_reason": "occluded"},
        {"frame": "frames/000020.png", "board": "dirty/000020.webp", "dirty": True,
         "dirty_reason": "changed"},
        {"frame": "frames/000030.png", "board": "dirty/000030.webp", "dirty": True,
         "dirty_reason": "stale"},
    ]
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "matte.jsonl").write_text("", encoding="utf-8")
    return sdir


def test_the_report_separates_what_a_standard_run_can_close(tmp_path, monkeypatch):
    """Sonst meldet `occluders status` ewig eine Luecke, die kein Standardlauf schliesst.

    Der Worker mattet per Vorgabe `occluded`; `changed` und `stale` erreicht nur `--reason all`.
    Beides als eine Zahl zu melden hiess: die Aufnahme sieht unfertig aus und bleibt es.
    """
    from chesslab import matte as matte_mod

    sdir = _rows_on_disk(tmp_path)
    monkeypatch.setattr(matte_mod, "game_dir", lambda name: sdir, raising=False)
    monkeypatch.setattr("chesslab.realgames.game_dir", lambda name: sdir)

    res = matte_mod.matte_status("s")

    assert res["missing"] == ["000010"], "der Standardstapel"
    assert res["missing_other"] == ["000020", "000030"], "nur mit --reason all erreichbar"
