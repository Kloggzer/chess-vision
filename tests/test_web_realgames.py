"""The review surface for a filmed game (`web/routers/realgames.py`).

What these pin down is the trap the pack exists for. The tracker's own output is not ground
truth — 55 of 91 commits in the motivating game came through `cnn_recovery` and the user
corrected three by hand — so the invariants are: an unreplayable line cannot be confirmed, a
correction cannot produce an illegal move, every write leaves a backup that is never overwritten,
and no route accepts a path.

No footage: a candidate is built as JSON in a tmp `data/` root, exactly as `test_web_corners.py`
builds a session.
"""

from __future__ import annotations

import json

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

# A Ruy Lopez opening, which replays cleanly, plus the deciders the ranking sorts on.
CLEAN = [
    ("e4", "diff"), ("e5", "cnn_occupancy"), ("Nf3", "cnn_recovery"), ("Nc6", "diff"),
    ("Bb5", "cnn_recovery"), ("a6", "diff"),
]


def _client():
    from fastapi.testclient import TestClient

    from chesslab.web.app import create_app
    return TestClient(create_app())


def _candidate(tmp_path, monkeypatch, moves=CLEAN, *, name="g", alarms=(), start_fen=None,
               confirmed=False):
    """A candidate on disk. `alarms` is the set of 1-based plies that carry one."""
    from chesslab import config

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    gdir = config.DATA.root / "realgames" / name
    (gdir / "frames").mkdir(parents=True)
    rows = []
    for i, (san, decider) in enumerate(moves):
        rows.append({"ply": i + 1, "san": san, "frame": 10 * (i + 1), "t": 1.0 * (i + 1),
                     "decider": decider,
                     "alarm": {"kind": "illegal"} if (i + 1) in alarms else None,
                     "fen_after": None})
    (gdir / "candidate.json").write_text(json.dumps({
        "name": name, "video": "testclip-raw/g.mp4", "confirmed": confirmed,
        "created_at": "2026-08-02T21:14:03Z",
        "source": {"cnn_run": "r", "obs_s": 0.3, "profile": "phone"},
        "effective_config": {}, "geometry": {"margin": 0.05}, "clock": {"fps": 30.0},
        "start_fen": start_fen, "moves": rows, "note": "", "observations": 1, "frames": 1,
    }, indent=2), encoding="utf-8")
    return gdir


def _raw(gdir):
    return (gdir / "candidate.json").read_bytes()


# --- what chess itself says -----------------------------------------------------------

def test_a_clean_line_is_legal_all_through_and_has_no_impossible_tier(tmp_path, monkeypatch):
    _candidate(tmp_path, monkeypatch)
    r = _client().get("/api/realgames/g")
    assert r.status_code == 200
    body = r.json()
    assert [p["verdict"] for p in body["plies"]] == ["legal"] * 6
    assert body["counts"]["impossible"] == 0
    assert body["first_illegal"] is None


def test_one_wrong_move_yields_exactly_one_illegal_ply_and_the_rest_unevaluated(
        tmp_path, monkeypatch):
    """The distinction is the whole value of the tier: everything after the break is downstream
    of a broken position, not forty more errors."""
    moves = [("e4", "diff"), ("e5", "diff"), ("Qh8", "cnn_recovery"),
             ("Nc6", "diff"), ("Bb5", "diff")]
    _candidate(tmp_path, monkeypatch, moves)
    body = _client().get("/api/realgames/g").json()
    verdicts = [p["verdict"] for p in body["plies"]]
    assert verdicts == ["legal", "legal", "illegal", "unevaluated", "unevaluated"]
    assert verdicts.count("illegal") == 1
    assert body["first_illegal"] == 3


def test_a_legal_line_is_not_proof_the_line_is_right(tmp_path, monkeypatch):
    """A recovery that invents a plausible legal move produces a legal game. The tier reports
    zero impossible plies and three doubtful ones anyway — which is the honest picture."""
    _candidate(tmp_path, monkeypatch, [("e4", "cnn_recovery"), ("e5", "cnn_recovery"),
                                       ("Nf3", "cnn_recovery")])
    body = _client().get("/api/realgames/g").json()
    assert body["counts"] == {"impossible": 0, "rebuilt": 3, "alarmed": 0, "rest": 0}


def test_start_fen_is_honoured(tmp_path, monkeypatch):
    _candidate(tmp_path, monkeypatch, [("Kb2", "diff")],
               start_fen="8/8/8/8/8/8/8/K6k w - - 0 1")
    body = _client().get("/api/realgames/g").json()
    assert body["plies"][0]["verdict"] == "legal"


# --- the ranking ----------------------------------------------------------------------

def test_the_worklist_is_impossible_then_rebuilt_then_alarmed_then_rest(tmp_path, monkeypatch):
    # Ply 4 is `Qh8`: d8-h8 runs through the king on e8, so it is illegal — unlike `Qh4`, which
    # after e4 e5 Nf3 is a perfectly legal (if bad) move, and made this test wrong once already.
    moves = [("e4", "diff"), ("e5", "cnn_occupancy"), ("Nf3", "cnn_recovery"),
             ("Qh8", "diff"), ("Bb5", "diff")]
    _candidate(tmp_path, monkeypatch, moves, alarms={2})
    body = _client().get("/api/realgames/g").json()
    tiers = {p["ply"]: p["tier"] for p in body["plies"]}
    assert tiers == {1: "rest", 2: "alarmed", 3: "rebuilt", 4: "impossible", 5: "rest"}
    assert body["order"] == [4, 3, 2, 1, 5]


def test_a_ply_that_is_both_illegal_and_a_recovery_appears_once(tmp_path, monkeypatch):
    _candidate(tmp_path, monkeypatch, [("e4", "diff"), ("Qh8", "cnn_recovery")])
    body = _client().get("/api/realgames/g").json()
    assert body["order"].count(2) == 1
    assert [p["tier"] for p in body["plies"]] == ["rest", "impossible"]


def test_the_decider_is_reported_as_prose_not_as_a_key(tmp_path, monkeypatch):
    """`cnn_occupancy` is the DIFF path confirmed by the CNN. A tally over the bare keys was
    misread on 2026-07-27 as "the diff path commits nothing itself" for exactly this reason."""
    _candidate(tmp_path, monkeypatch, [("e4", "cnn_occupancy")])
    row = _client().get("/api/realgames/g").json()["plies"][0]
    assert "diff" in row["reason"] and row["reason"] != "cnn_occupancy"


def test_the_alarm_tier_is_labelled_as_polled(tmp_path, monkeypatch):
    """No decision row on either platform carries an alarm flag; this one was observed by the
    harness that drove the replay. The artefact has to say so."""
    _candidate(tmp_path, monkeypatch)
    assert _client().get("/api/realgames/g").json()["alarm_is_polled"] is True


# --- legal moves and edits ------------------------------------------------------------

def test_legal_returns_exactly_the_positions_legal_moves(tmp_path, monkeypatch):
    import chess

    _candidate(tmp_path, monkeypatch)
    body = _client().get("/api/realgames/g/legal/3").json()
    board = chess.Board()
    for uci in ("e2e4", "e7e5"):
        board.push_uci(uci)
    assert sorted(m["uci"] for m in body["moves"]) == sorted(m.uci() for m in board.legal_moves)
    assert body["fen"] == board.fen()


def test_an_illegal_correction_is_refused_and_the_file_is_untouched(tmp_path, monkeypatch):
    gdir = _candidate(tmp_path, monkeypatch)
    before = _raw(gdir)
    r = _client().post("/api/realgames/g/move",
                       json={"op": "replace", "ply": 3, "uci": "a1a8"})
    assert r.status_code == 400
    assert "not legal" in r.json()["detail"]
    assert _raw(gdir) == before


def test_replacing_a_move_repairs_the_tail(tmp_path, monkeypatch):
    """The server re-runs the replay on every edit, so the reviewer sees at once whether the fix
    put the rest of the game back."""
    moves = [("e4", "diff"), ("e5", "diff"), ("Qh8", "cnn_recovery"), ("Nc6", "diff")]
    _candidate(tmp_path, monkeypatch, moves)
    body = _client().post("/api/realgames/g/move",
                          json={"op": "replace", "ply": 3, "uci": "g1f3"}).json()
    assert [p["san"] for p in body["plies"]] == ["e4", "e5", "Nf3", "Nc6"]
    assert [p["verdict"] for p in body["plies"]] == ["legal"] * 4
    assert body["plies"][2]["decider"] == "human"


def test_delete_and_insert_renumber_the_plies(tmp_path, monkeypatch):
    _candidate(tmp_path, monkeypatch)
    body = _client().post("/api/realgames/g/move", json={"op": "delete", "ply": 6}).json()
    assert [p["ply"] for p in body["plies"]] == [1, 2, 3, 4, 5]
    body = _client().post("/api/realgames/g/move",
                          json={"op": "insert", "ply": 6, "uci": "a7a6"}).json()
    assert [p["san"] for p in body["plies"]] == ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]


def test_an_unknown_operation_is_refused(tmp_path, monkeypatch):
    gdir = _candidate(tmp_path, monkeypatch)
    before = _raw(gdir)
    r = _client().post("/api/realgames/g/move", json={"op": "annotate", "ply": 1, "uci": "e2e4"})
    assert r.status_code == 400
    assert _raw(gdir) == before


# --- accept-rest ----------------------------------------------------------------------

def test_accept_rest_changes_no_move_and_empties_only_the_quiet_tier(tmp_path, monkeypatch):
    gdir = _candidate(tmp_path, monkeypatch)
    before = json.loads(_raw(gdir))["moves"]
    body = _client().post("/api/realgames/g/accept-rest").json()
    assert json.loads(_raw(gdir))["moves"] == before
    # The two recoveries are still open; the four quiet plies are gone from the worklist.
    assert body["order"] == [3, 5]


# --- confirm --------------------------------------------------------------------------

def test_confirm_is_refused_while_any_ply_is_illegal(tmp_path, monkeypatch):
    gdir = _candidate(tmp_path, monkeypatch,
                      [("e4", "diff"), ("e5", "diff"), ("Qh8", "cnn_recovery")])
    r = _client().post("/api/realgames/g/confirm", json={"confirmed": True})
    assert r.status_code == 400
    assert "does not replay" in r.json()["detail"]
    assert json.loads(_raw(gdir))["confirmed"] is False


def test_confirm_marks_the_file_and_can_be_taken_back(tmp_path, monkeypatch):
    gdir = _candidate(tmp_path, monkeypatch)
    assert _client().post("/api/realgames/g/confirm", json={"confirmed": True}).status_code == 200
    on_disk = json.loads(_raw(gdir))
    assert on_disk["confirmed"] is True and on_disk["confirmed_at"]
    _client().post("/api/realgames/g/confirm", json={"confirmed": False})
    on_disk = json.loads(_raw(gdir))
    assert on_disk["confirmed"] is False and "confirmed_at" not in on_disk


def test_editing_a_confirmed_candidate_withdraws_the_confirmation(tmp_path, monkeypatch):
    """The confirmed list was a different list. Leaving the flag standing would let a human's
    approval carry over to a game they never saw."""
    gdir = _candidate(tmp_path, monkeypatch, confirmed=True)
    _client().post("/api/realgames/g/move", json={"op": "delete", "ply": 6})
    assert json.loads(_raw(gdir))["confirmed"] is False


# --- writes, backups, and paths -------------------------------------------------------

def test_every_write_leaves_a_backup_and_never_overwrites_one(tmp_path, monkeypatch):
    """`data/` is gitignored and unrecoverable. A reviewer who deletes ten moves by mistake has
    otherwise spent an hour — and two writes in the same second must not collapse into one."""
    gdir = _candidate(tmp_path, monkeypatch)
    first = json.loads(_raw(gdir))
    _client().post("/api/realgames/g/move", json={"op": "delete", "ply": 6})
    _client().post("/api/realgames/g/move", json={"op": "delete", "ply": 5})
    backups = sorted(gdir.glob("candidate.json.bak.*"))
    assert len(backups) == 2, [b.name for b in backups]
    assert any(b.name.endswith(("-1", "-2")) for b in backups), [b.name for b in backups]
    assert json.loads(backups[0].read_text(encoding="utf-8"))["moves"] == first["moves"]


def test_no_temp_file_survives_a_write(tmp_path, monkeypatch):
    gdir = _candidate(tmp_path, monkeypatch)
    _client().post("/api/realgames/g/accept-rest")
    assert not list(gdir.glob("*.tmp"))


@pytest.mark.parametrize("bad", ["..", "../secrets", "..\\secrets", "a/b", "a\\b", "",
                                 "sub/../../elsewhere"])
def test_a_name_that_is_a_path_is_refused_by_the_resolver(tmp_path, monkeypatch, bad):
    """The app has no authentication anywhere and already serves the whole `data/` tree at
    `/img`, so this resolver is not defence in depth — it is the defence.

    Asserted on `_game_dir` and not over HTTP on purpose: an HTTP client collapses `..` in a
    path before the request is sent (`GET /api/realgames/..` arrives as `GET /api`), so a
    route-level test would pass without the check existing at all. The percent-encoded forms,
    which do survive to the router, are covered below.
    """
    from fastapi import HTTPException

    from chesslab.web.routers.realgames import _game_dir

    _candidate(tmp_path, monkeypatch)
    with pytest.raises(HTTPException) as e:
        _game_dir(bad)
    assert e.value.status_code == 400


def test_a_percent_encoded_traversal_does_not_reach_the_filesystem(tmp_path, monkeypatch):
    """`%2e%2e%2f` survives client-side normalisation, so it is the form that actually arrives."""
    _candidate(tmp_path, monkeypatch)
    c = _client()
    for path in ("%2e%2e%2fsecrets", "%2e%2e", "a%2fb", "a%5cb"):
        r = c.get(f"/api/realgames/{path}")
        assert r.status_code in (400, 404), (path, r.status_code)


def test_a_symlinked_name_inside_the_root_cannot_escape_it(tmp_path, monkeypatch):
    """`_safe_id` rejects the obvious spellings; a symlink is not one of them, which is why
    containment is re-checked after `resolve()`."""
    from fastapi import HTTPException

    from chesslab import config
    from chesslab.web.routers.realgames import _game_dir

    _candidate(tmp_path, monkeypatch)
    outside = tmp_path / "outside"
    (outside / "frames").mkdir(parents=True)
    (outside / "candidate.json").write_text("{}", encoding="utf-8")
    link = config.DATA.root / "realgames" / "sneaky"
    try:
        link.symlink_to(outside, target_is_directory=True)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks need developer mode or admin on Windows")
    with pytest.raises(HTTPException) as e:
        _game_dir("sneaky")
    assert e.value.status_code == 400


def test_an_unknown_candidate_is_a_404_not_a_crash(tmp_path, monkeypatch):
    _candidate(tmp_path, monkeypatch)
    assert _client().get("/api/realgames/nope").status_code == 404


# --- pictures and boards --------------------------------------------------------------

def test_a_frame_is_served_from_disk_and_a_missing_one_is_a_404(tmp_path, monkeypatch):
    import numpy as np

    gdir = _candidate(tmp_path, monkeypatch)
    cv2 = pytest.importorskip("cv2")
    cv2.imwrite(str(gdir / "frames" / "000030.jpg"), np.zeros((8, 8, 3), np.uint8))
    c = _client()
    assert c.get("/api/realgames/g/frame/3").status_code == 200
    assert c.get("/api/realgames/g/frame/3?offset=1").status_code == 404
    assert c.get("/api/realgames/g/frame/99").status_code == 404


def test_the_board_is_an_svg_the_server_drew(tmp_path, monkeypatch):
    """There is no chess library in the frontend and this is not the reason to add one."""
    _candidate(tmp_path, monkeypatch)
    r = _client().get("/api/realgames/g/board/2")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/svg+xml")
    assert "<svg" in r.text


def test_a_candidate_with_no_moves_is_readable_and_not_confirmable(tmp_path, monkeypatch):
    """The first real game produced exactly this: 9576 frames, zero commits. The review surface
    has to survive it and say so, rather than 500 — an empty candidate is a MEASUREMENT (the
    tracker committed nothing at the shipped defaults), not a corrupt file."""
    gdir = _candidate(tmp_path, monkeypatch, [])
    body = _client().get("/api/realgames/g").json()
    assert body["plies"] == [] and body["order"] == []
    assert body["first_illegal"] is None
    assert _client().get("/api/realgames/g/board/0").status_code == 200
    assert _client().get("/api/realgames/g/frame/1").status_code == 404
    assert _client().post("/api/realgames/g/accept-rest").status_code == 200
    # Nothing illegal, so `confirm` does not refuse — but there is nothing to export either.
    assert _client().post("/api/realgames/g/confirm", json={"confirmed": True}).status_code == 200
    assert json.loads(_raw(gdir))["moves"] == []


def test_the_listing_reports_what_is_still_open(tmp_path, monkeypatch):
    _candidate(tmp_path, monkeypatch)
    games = _client().get("/api/realgames").json()["games"]
    assert len(games) == 1
    assert games[0]["name"] == "g" and games[0]["moves"] == 6
    assert games[0]["confirmed"] is False and games[0]["open"] == 6
