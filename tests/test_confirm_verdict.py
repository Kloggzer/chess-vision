"""Die Bestaetigung aus der Web-App laeuft seit 2026-09-23 durch Python (`docs/web-ruft-python.md`):
dieselben Riegel wie `lib/session-store/recordings.ts` sie hatte, jetzt an EINER Stelle."""
from __future__ import annotations

import json
import os

import pytest

from chesslab import config
from chesslab.realgames import confirm as rg_confirm
from chesslab.session_store import recording as store_rec

# BOM und CRLF: wer normalisiert statt die rohen Bytes zu hashen, rechnet hier etwas anderes.
PGN = b'\xef\xbb\xbf[Event "W2"]\r\n\r\n1. e4 e5 *\r\n'
PGN_MD5 = "5c6da1fbf57ec1d48056dff3958c2080"
MOVES = [{"ply": i + 1, "san": s, "frame": 10 * (i + 1)} for i, s in enumerate(("e4", "e5", "Nf3"))]


@pytest.fixture
def game(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    gdir = store_rec.game_dir("g")
    gdir.mkdir(parents=True)
    (gdir / "candidate.json").write_text(json.dumps({"name": "g", "margin": 0.0, "moves": MOVES}, indent=2),
                                         encoding="utf-8")
    return gdir


def _doc(gdir) -> dict:
    return json.loads((gdir / "candidate.json").read_text(encoding="utf-8"))


def test_an_illegal_mainline_is_a_problem_not_a_shorter_reference(game):
    (game / "reference.pgn").write_text('[Event "c"]\n\n1. e4 d5 2. Nc3 Nf6 3. d4 d5 *\n', encoding="utf-8")
    ref = store_rec.parse_reference((game / "reference.pgn").read_text(encoding="utf-8"))
    assert ref.sans is None and "d5" in ref.problem
    # `read_reference` gab die ersten fuenf Zuege zurueck, und `confirm --yes` urteilte gegen sie.
    with pytest.raises(ValueError, match="d5"):
        store_rec.read_reference("g")


def test_a_continuation_game_is_counted_not_read(game):
    text = ('[Event "c"]\n\n1. d4 d5 2. e4 *\n\n[Event "c"]\n[SetUp "1"]\n'
            '[FEN "rnbqkbnr/ppp1pppp/8/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2"]\n\n2... e5 3. Nf3 *\n')
    assert store_rec.parse_reference(text) == store_rec.Reference(["d4", "d5", "e4"], None, 1)


def test_an_unlistable_games_dir_is_not_an_outside_reference(game, monkeypatch):
    games = game / "files" / "games"
    games.mkdir(parents=True)
    (game / "reference.pgn").write_bytes(PGN)
    (games / "a.pgn").write_bytes(PGN)
    real_scandir, real_listdir = os.scandir, os.listdir

    def denied(real):
        def call(path=".", *a):
            if os.fspath(path).endswith("games"):
                raise PermissionError(13, "EACCES", os.fspath(path))
            return real(path, *a)
        return call

    monkeypatch.setattr(os, "scandir", denied(real_scandir))
    monkeypatch.setattr(os, "listdir", denied(real_listdir))
    # `glob` schluckte den Fehler: das Handy-PGN galt als menschliche Referenz, `--yes` lief durch.
    with pytest.raises(PermissionError):
        store_rec.reference_is_the_phones_own("g")
    with pytest.raises(PermissionError):
        store_rec.reference_origin("g")


def test_an_unreadable_reference_is_not_none(game, monkeypatch):
    (game / "reference.pgn").write_bytes(PGN)
    real = type(game).read_bytes

    def denied(self):
        if self.name == "reference.pgn":
            raise PermissionError(13, "EACCES", str(self))
        return real(self)

    monkeypatch.setattr(type(game), "read_bytes", denied)
    with pytest.raises(PermissionError):
        store_rec.reference_origin("g")


def test_origin_none_phone_outside(game):
    assert store_rec.reference_origin("g") == "none"
    (game / "reference.pgn").write_bytes(PGN)
    assert store_rec.reference_origin("g") == "outside"
    games = game / "files" / "games"
    games.mkdir(parents=True)
    (games / "rec.json").write_bytes(PGN)
    assert store_rec.reference_origin("g") == "outside"
    (games / "a.pgn").write_bytes(PGN)
    assert store_rec.reference_origin("g") == "phone"


def test_confirm_kept_stamps_the_raw_bytes_and_keeps_untouched_keys(game):
    (game / "reference.pgn").write_bytes(PGN)
    assert rg_confirm.confirm_kept("g", [2]) == [1, 2, 3]
    doc = _doc(game)
    assert doc["confirmed_reference"] == {"md5": PGN_MD5, "at": doc["confirmed_at"]}
    assert '"margin": 0.0' in (game / "candidate.json").read_text(encoding="utf-8")


def test_kept_may_only_decide_unmatched_plies(game):
    (game / "reference.pgn").write_text("1. e4 e5 *\n", encoding="utf-8")
    assert rg_confirm.confirm_kept("g", []) == [1, 2]
    assert rg_confirm.confirm_kept("g", [0, 2]) == [1, 2, 3]


def test_without_a_reference_the_keeps_are_the_verdict(game):
    assert rg_confirm.confirm_kept("g", [0, 2]) == [1, 3]
    assert _doc(game)["confirmed_reference"]["md5"] is None


def test_a_struck_ply_stays_struck(game):
    (game / "reference.pgn").write_text("1. e4 e5 2. Nf3 *\n", encoding="utf-8")
    assert rg_confirm.confirm_kept("g", [], [2]) == [1, 3]
    assert rg_confirm.confirm_kept("g", []) == [1, 3]
    assert _doc(game)["struck_plies"] == [2]


def test_a_reference_replaced_during_the_review_refuses(game):
    (game / "reference.pgn").write_text("1. d4 d5 *\n", encoding="utf-8")
    with pytest.raises(store_rec.ReferenceMoved, match="Referenz wurde waehrend der Pruefung ersetzt"):
        rg_confirm.confirm_kept("g", [], shown_reference=PGN_MD5)
    assert "confirmed" not in _doc(game)


def test_a_reference_that_appeared_after_a_page_without_one_refuses(game):
    (game / "reference.pgn").write_bytes(PGN)
    with pytest.raises(store_rec.ReferenceMoved):
        rg_confirm.confirm_kept("g", [], shown_reference=None)
    (game / "reference.pgn").unlink()
    assert rg_confirm.confirm_kept("g", [], shown_reference=None) == []


def test_a_foreign_write_between_read_and_write_is_not_overrun(game, monkeypatch):
    (game / "reference.pgn").write_text("1. e4 e5 2. Nf3 *\n", encoding="utf-8")
    real = store_rec.load_candidate
    calls = {"n": 0}

    def load_then_foreign(name):
        doc = real(name)
        calls["n"] += 1
        if calls["n"] == 1:
            (game / "candidate.json").write_text(json.dumps({**doc, "note": "von aussen"}), encoding="utf-8")
        return doc

    monkeypatch.setattr(store_rec, "load_candidate", load_then_foreign)
    monkeypatch.setattr(rg_confirm, "load_candidate", load_then_foreign)
    with pytest.raises(store_rec.VerdictContested):
        rg_confirm.confirm_kept("g", [0])
    assert _doc(game)["note"] == "von aussen"
    assert "confirmed" not in _doc(game)


def test_confirming_against_the_phones_own_pgn_by_hand_is_allowed(game):
    """Die Seite zeigt den Chip; verweigert wird nur das unbesehene `--yes`."""
    (game / "reference.pgn").write_bytes(PGN)
    (game / "files" / "games").mkdir(parents=True)
    (game / "files" / "games" / "a.pgn").write_bytes(PGN)
    assert rg_confirm.confirm_kept("g", []) == [1, 2]
