"""`stream_admission`: welche Bretter und Zellen des Labeln-Stroms ein Urteil ins Training tragen.

Die Faelle standen als `reachesPool`/`visible` in `platform/app/lib/label/lanes.ts` — eine TS-Kopie
der Slice-Regel, die `carried` nicht kannte und die Helligkeit gar nicht (`docs/web-ruft-python.md`).
"""
from __future__ import annotations

import json

import pytest

from chesslab import chain_state, config, stream_admission
from chesslab.labeling import frame_dirty
from chesslab.session_store import recording
from conftest import write_jsonl

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@pytest.mark.parametrize(("entry", "cover", "dirty"), [
    ({}, {}, False),                                                        # settled: immer
    ({"dirty": True, "dirty_reason": "occluded"}, {"h6": 0.9}, False),     # von der Matte gerettet
    ({"dirty": True, "dirty_reason": "occluded"}, {}, True),               # ohne Matte nicht
    ({"dirty": True, "dirty_reason": "stale"}, {"h6": 0.9}, True),         # nur `occluded` rettet ganz
    ({"dirty": True, "dirty_reason": "stale", "settle_dev": [1.0]}, {"h6": 0.9}, False),  # zellweise
    ({"dirty": True, "dirty_reason": "stale", "settle_dev": [1.0]}, {}, True),
    ({"grid_lines_source": "carried"}, {}, True),                          # geliehenes Mesh ist Hand
    ({}, {"e4": 0.4}, True),                                                # verdeckt, ohne Messung
    ({"settle_dev": [1.0]}, {"e4": 0.4}, False),
])
def test_frame_dirty(entry, cover, dirty):
    assert frame_dirty(entry, cover) is dirty


@pytest.fixture
def game(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    chain_state._CACHE.clear()
    stream_admission._DONE.clear()
    gdir = recording.game_dir("g")
    gdir.mkdir(parents=True)
    write_jsonl(gdir / "log.jsonl", [
        {"frame": "000001.png", "fen": FEN, "ply": 0},
        {"frame": "000002.png", "fen": FEN, "ply": 0, "dirty": True, "dirty_reason": "stale"},
        {"frame": "000003.png", "fen": FEN, "ply": 0, "dirty": True, "unusable": True},
    ])
    return gdir


def _reads(gdir, cells):
    lines = [{"_model": "runs/m"}] + [{"session_id": "rg-g", "frame": f, "square": s, "bright": b}
                                      for f, s, b in cells]
    (gdir / "model-reads.jsonl").write_text("".join(json.dumps(r) + "\n" for r in lines), encoding="utf-8")


def test_a_dark_visible_cell_is_outside_the_loss(game):
    _reads(game, [("000001", "e2", 12.0), ("000001", "d2", 80.0), ("000001", "c2", None)])
    got = stream_admission.admission(game)
    assert got["ineligible"] == {"000001": ["e2"]}
    assert got["blocked"] == ["000002"], "unusable steht in keiner Lane, dirty ohne Matte erreicht den Slice nicht"


def test_covered_cells_count_even_where_no_model_read(game):
    write_jsonl(game / "matte.jsonl", [{"frame": "000001", "coverage": {"e5": 0.82, "h1": 0.02}},
                                       {"frame": "000002", "skipped": "zone too big"}])
    assert stream_admission.admission(game)["ineligible"] == {"000001": ["e5"]}


def test_the_answer_follows_the_files(game):
    assert stream_admission.admission(game)["ineligible"] == {}
    _reads(game, [("000001", "a1", 3.0)])
    assert stream_admission.admission(game)["ineligible"] == {"000001": ["a1"]}


def _row(frame, square, bright, **extra):
    return {"session_id": "rg-g", "frame": frame, "square": square, "fen_label": "wR", "dirty_reason": None,
            "cov": 0.01, "bright": bright, "probs": {"wR": 1.0}, **extra}


READS = [{"_model": r"data\models\m", "_classes": ["empty", "wR"]}] + [
    _row(f"{f:06d}", sq, b) for f in (1, 2, 3) for sq, b in (("a1", 80.9), ("b1", 12.0), ("c1", None), ("d1", 30))
] + [{"session_id": "rg-g", "frame": "000004", "square": "e5", "fen_label": "wR", "dirty_reason": "stale",
      "model_cov": 0.2, "bright": 3.5, "probs": {}}]


def _write(gdir, text: str, *, bom: bool = False) -> None:
    (gdir / "model-reads.jsonl").write_bytes((b"\xef\xbb\xbf" if bom else b"") + text.encode("utf-8"))


def _lines(rows, sep="\n") -> str:
    return "".join(json.dumps(r) + sep for r in rows)


@pytest.mark.parametrize("variant", ["lf", "crlf", "bom"])
def test_the_fast_path_reads_what_iter_jsonl_reads(game, monkeypatch, variant):
    _write(game, _lines(READS, "\r\n" if variant == "crlf" else "\n"), bom=variant == "bom")
    write_jsonl(game / "matte.jsonl", [{"frame": "000002", "coverage": {"a1": 0.9, "b1": 0.0}}])
    assert stream_admission._fast_reads((game / "model-reads.jsonl").read_bytes()) is not None
    fast = stream_admission._admission(game)
    monkeypatch.setattr(stream_admission, "_fast_reads", lambda data: None)
    assert stream_admission._admission(game) == fast
    assert fast["ineligible"] == {"000001": ["b1"], "000002": ["a1", "b1"], "000003": ["b1"], "000004": ["e5"]}


@pytest.mark.parametrize("text", [
    _lines(READS)[:-5],                                                            # halbe letzte Zeile
    _lines(READS[:2]) + "\n" + _lines(READS[2:]),                                  # Leerzeile
    _lines(READS[:3]) + json.dumps(READS[3])[:-8] + "\n" + _lines(READS[4:]),      # kaputt mittendrin
    _lines(READS[:3] + [READS[0]] + READS[3:]),                                    # Kopf mittendrin
    _lines([*READS, _row("000009", "a1", 1.0, dirty_reason='a"b')]),               # Escape im Wert
    _lines([*READS, {"frame": "000009", "session_id": "rg-g", "square": "a1", "bright": 1.0}]),  # andere Reihenfolge
    _lines([*READS, _row("000009", "a1", float("nan"))]),                           # NaN
    _lines([{"_model": "m", "frame": "000009", "square": "a1"}, *READS[1:]]),      # Kopf mit Feld
])
def test_an_unknown_line_shape_takes_the_json_path(text):
    assert stream_admission._fast_reads(text.encode("utf-8")) is None


def test_unchanged_reads_are_not_parsed_again(game, monkeypatch):
    """Warm antwortet der Strom aus `_DONE`; eine geaenderte Lesarten-Datei rechnet neu."""
    _write(game, _lines(READS))
    calls = []
    real = stream_admission.read_cells
    monkeypatch.setattr(stream_admission, "read_cells", lambda path: calls.append(path) or real(path))
    first = stream_admission.admission(game)
    assert stream_admission.admission(game) is first
    assert len(calls) == 1
    _write(game, _lines(READS[:-1]))
    assert stream_admission.admission(game)["ineligible"].get("000004") is None
    assert len(calls) == 2
