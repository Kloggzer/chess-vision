"""Real-game review router: /api/realgames*

The human is not entering a game. They are REVIEWING one the tracker already played to the end,
and the tracker was guessing for most of it — 55 of 91 commits in the game that motivated this
came through `cnn_recovery`, which is defined as "position was LOST — rebuilt by the CNN, not
detected". So the reviewer's job is to find the wrong ones and this router's job is to say where
to look, then refuse to call the result ground truth until a human says so.

Two things are load-bearing and both are borrowed from `routers/sessions.py` rather than
reinvented. Every name goes through `sessions._safe_id` and is re-checked for containment after
`resolve()`: the app has NO authentication anywhere (`config.DEFAULT_WEB_HOST` binding to
localhost is the only protection) and `app.py` already mounts the whole `data/` tree at `/img`,
so this is not defence in depth, it is the defence. And every write backs the file up first,
never overwriting an earlier backup — `data/` is gitignored and unrecoverable, and a reviewer who
deletes ten moves by mistake has otherwise spent an hour.

The board is drawn by `chess.svg` on the server, exactly as `/api/sessions/{sid}/board/{idx}`
already does. There is no chess library in the frontend and this router is not the reason to add
one.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import FileResponse, Response

router = APIRouter()

_CACHE = {"Cache-Control": "private, max-age=300"}

#: Worklist tiers, most doubtful first. A ply gets exactly ONE — the first that matches — so a
#: move that is both illegal and a recovery is reviewed once rather than twice.
TIERS = ("impossible", "rebuilt", "alarmed", "rest")

#: What each `decider` actually means, in the reviewer's language. The bare keys mislead: a tally
#: over them was misread on 2026-07-27 as "the diff path commits nothing itself" because
#: `cnn_occupancy` is in fact the DIFF path confirmed by the CNN, not a CNN detection.
DECIDER_PROSE = {
    "cnn_recovery": "position was lost and rebuilt by the CNN — not detected",
    "cnn_occupancy": "found by the pixel diff, confirmed by the CNN",
    "cnn_pair": "two moves confirmed together by the CNN",
    "cnn_overrule": "the CNN overruled the pixel diff",
    "diff": "found by the pixel diff alone",
    "diff_after_verify": "found by the pixel diff, verified before commit",
}


# --- resolution and safety ------------------------------------------------------------

def _root() -> Path:
    from ... import config
    return config.DATA.root / "realgames"


def _game_dir(name: str) -> Path:
    """`data/realgames/<name>/`, or 404. The client sends an IDENTIFIER, never a path."""
    from ... import sessions as sessions_mod

    try:
        safe = sessions_mod._safe_id(name)
    except ValueError as e:
        raise HTTPException(400, str(e))
    root = _root().resolve()
    path = (root / safe).resolve()
    # Re-checked after `resolve()`, the way `_frame_path` does: `_safe_id` rejects the obvious
    # spellings, and a symlink under the root is not one of them.
    if root not in path.parents:
        raise HTTPException(400, f"Invalid candidate name: {name!r}")
    if not (path / "candidate.json").exists():
        raise HTTPException(404, f"No candidate '{safe}'.")
    return path


def _read(name: str) -> tuple[Path, dict]:
    path = _game_dir(name)
    return path, json.loads((path / "candidate.json").read_text(encoding="utf-8"))


def _backup(path: Path) -> str:
    """Copy `candidate.json` aside before rewriting. A backup is NEVER overwritten."""
    import shutil
    from datetime import datetime

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = path.with_name(f"{path.name}.bak.{stamp}")
    n = 1
    while dest.exists():
        dest = path.with_name(f"{path.name}.bak.{stamp}-{n}")
        n += 1
    shutil.copy2(path, dest)
    return dest.name


def _write(gdir: Path, candidate: dict) -> str:
    path = gdir / "candidate.json"
    backup = _backup(path)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)
    return backup


# --- what chess itself can say --------------------------------------------------------

def _replay(candidate: dict) -> list[dict]:
    """Per-ply verdict from replaying the line with `python-chess`.

    Where it breaks it is a CERTAIN error, not a suspicion: a legal-move check has no false
    positives. Everything after the first break is `unevaluated` rather than `illegal`, because
    it is downstream of a broken position — reporting forty more errors for one wrong move is how
    a reviewer stops reading the list.

    What this does NOT prove: a line can replay perfectly and still be wrong. A recovery that
    invents a plausible legal move produces a legal game. Legality is a certain detector of some
    errors and no detector at all of the rest, which is why it is one tier of four.
    """
    import chess

    board = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    out: list[dict] = []
    broken = False
    for i, m in enumerate(candidate.get("moves") or []):
        row = {"ply": i + 1, "san": m.get("san"), "decider": m.get("decider"),
               "alarm": m.get("alarm"), "frame": m.get("frame"), "t": m.get("t"),
               "reason": DECIDER_PROSE.get(m.get("decider"), m.get("decider") or "unrecorded")}
        if broken:
            out.append({**row, "verdict": "unevaluated", "uci": None, "fen_before": None})
            continue
        row["fen_before"] = board.fen()
        try:
            move = board.parse_san(m.get("san") or "")
        except ValueError:
            broken = True
            out.append({**row, "verdict": "illegal", "uci": None})
            continue
        row["uci"] = move.uci()
        board.push(move)
        out.append({**row, "verdict": "legal"})
    return out


def _tier(row: dict, first_illegal: int | None) -> str:
    if first_illegal is not None and row["ply"] == first_illegal:
        return "impossible"
    if row["decider"] == "cnn_recovery":
        return "rebuilt"
    if row["alarm"] is not None:
        return "alarmed"
    return "rest"


def _worklist(rows: list[dict], reviewed: set[int]) -> dict:
    """Tiers, counts, and the order the reviewer is sent through them."""
    first_illegal = next((r["ply"] for r in rows if r["verdict"] == "illegal"), None)
    for r in rows:
        r["tier"] = _tier(r, first_illegal)
        r["reviewed"] = r["ply"] in reviewed
    order = [r["ply"] for t in TIERS for r in rows if r["tier"] == t and not r["reviewed"]]
    counts = {t: sum(1 for r in rows if r["tier"] == t) for t in TIERS}
    return {"order": order, "counts": counts, "first_illegal": first_illegal}


def _state(name: str) -> dict:
    gdir, candidate = _read(name)
    rows = _replay(candidate)
    work = _worklist(rows, set(candidate.get("reviewed_plies") or []))
    return {"dir": gdir, "candidate": candidate, "plies": rows, **work}


# --- read routes ----------------------------------------------------------------------

@router.get("/api/realgames")
def realgames_list():
    root = _root()
    out = []
    for path in sorted(root.glob("*/candidate.json")) if root.exists() else []:
        try:
            cand = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        rows = _replay(cand)
        work = _worklist(rows, set(cand.get("reviewed_plies") or []))
        out.append({"name": path.parent.name, "moves": len(cand.get("moves") or []),
                    "confirmed": bool(cand.get("confirmed")), "counts": work["counts"],
                    "open": len(work["order"]), "created_at": cand.get("created_at"),
                    "video": cand.get("video")})
    return {"games": out}


@router.get("/api/realgames/{name}")
def realgame(name: str):
    st = _state(name)
    cand = st["candidate"]
    return {
        "name": cand.get("name") or name,
        "confirmed": bool(cand.get("confirmed")),
        # Named for what it is. NO decision row on either platform carries an alarm flag — this
        # field exists only because the candidate came from a replay we drove frame by frame and
        # polled `status()` at the commit. It is an observation that pass made.
        "alarm_is_polled": True,
        "start_fen": cand.get("start_fen"),
        "geometry": cand.get("geometry"), "clock": cand.get("clock"),
        "source": cand.get("source"), "note": cand.get("note"),
        "plies": st["plies"], "order": st["order"], "counts": st["counts"],
        "first_illegal": st["first_illegal"],
    }


@router.get("/api/realgames/{name}/board/{ply}")
def realgame_board(name: str, ply: int):
    """The position AFTER `ply` (0 = the start position), with the move arrowed."""
    import chess
    import chess.svg

    st = _state(name)
    rows = st["plies"]
    if ply < 0 or ply > len(rows):
        raise HTTPException(404, f"Ply {ply} is outside 0..{len(rows)}.")
    board = chess.Board(st["candidate"].get("start_fen") or chess.STARTING_FEN)
    last = None
    for row in rows[:ply]:
        if row["verdict"] != "legal":
            break
        last = chess.Move.from_uci(row["uci"])
        board.push(last)
    svg = chess.svg.board(board, size=560, lastmove=last,
                          check=board.king(board.turn) if board.is_check() else None)
    return Response(svg, media_type="image/svg+xml", headers=_CACHE)


@router.get("/api/realgames/{name}/frame/{ply}")
def realgame_frame(name: str, ply: int, offset: int = Query(0)):
    """A JPEG written during the ingest pass. **Nothing here decodes the video.**

    h.264 seeking by frame index is approximate, so a route that sought would hand the reviewer a
    NEARBY frame while claiming it is the one — worse than showing nothing.
    """
    st = _state(name)
    rows = st["plies"]
    if not 1 <= ply <= len(rows):
        raise HTTPException(404, f"Ply {ply} is outside 1..{len(rows)}.")
    frame = rows[ply - 1]["frame"]
    if frame is None:
        raise HTTPException(404, f"Ply {ply} has no recorded frame index.")
    path = st["dir"] / "frames" / f"{int(frame) + int(offset):06d}.jpg"
    if not path.exists():
        raise HTTPException(404, f"No picture at offset {offset} of ply {ply}.")
    return FileResponse(path, headers=_CACHE)


@router.get("/api/realgames/{name}/legal/{ply}")
def realgame_legal(name: str, ply: int):
    """The legal moves in the position the confirmed prefix produced at `ply`.

    A correction is picked from this list rather than typed. An illegal correction is then
    unrepresentable, which is both what a chess UI does anyway and the only way to keep the
    reviewer from replacing one broken line with another.
    """
    import chess

    st = _state(name)
    rows = st["plies"]
    if not 1 <= ply <= len(rows) + 1:
        raise HTTPException(404, f"Ply {ply} is outside 1..{len(rows) + 1}.")
    board = chess.Board(st["candidate"].get("start_fen") or chess.STARTING_FEN)
    for row in rows[:ply - 1]:
        if row["verdict"] != "legal":
            raise HTTPException(400, f"Ply {row['ply']} does not replay, so the position at ply "
                                     f"{ply} is unknown. Fix ply {row['ply']} first.")
        board.push(chess.Move.from_uci(row["uci"]))
    moves = sorted(({"uci": m.uci(), "san": board.san(m)} for m in board.legal_moves),
                   key=lambda m: m["san"])
    return {"ply": ply, "fen": board.fen(), "moves": moves}


# --- write routes ---------------------------------------------------------------------

def _san_at(candidate: dict, rows: list[dict], ply: int, uci: str) -> str:
    """`uci` rendered as SAN in the position at `ply`, or 400 if it is not legal there."""
    import chess

    board = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    for row in rows[:ply - 1]:
        if row["verdict"] != "legal":
            raise HTTPException(400, f"Ply {row['ply']} does not replay; fix it first.")
        board.push(chess.Move.from_uci(row["uci"]))
    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        raise HTTPException(400, f"{uci!r} is not a UCI move.")
    if move not in board.legal_moves:
        raise HTTPException(400, f"{uci} is not legal at ply {ply}.")
    return board.san(move)


@router.post("/api/realgames/{name}/move")
def realgame_move(name: str, op: str = Body(..., embed=True), ply: int = Body(..., embed=True),
                  uci: str | None = Body(None, embed=True)):
    """Replace, delete, or insert before `ply`. Nothing else — this is not a PGN editor."""
    st = _state(name)
    cand, rows = st["candidate"], st["plies"]
    moves = list(cand.get("moves") or [])
    if op not in ("replace", "delete", "insert"):
        raise HTTPException(400, f"Unknown operation {op!r} (replace, delete, insert).")
    upper = len(moves) + 1 if op == "insert" else len(moves)
    if not 1 <= ply <= max(upper, 1):
        raise HTTPException(400, f"Ply {ply} is outside 1..{upper}.")
    if op == "delete":
        removed = moves.pop(ply - 1)
        detail = f"deleted {removed.get('san')}"
    else:
        if not uci:
            raise HTTPException(400, f"{op} needs a `uci`.")
        san = _san_at(cand, rows, ply, uci)
        # A hand-set move keeps the picture and the timing of the ply it replaces — those are
        # facts about the video — but its decider becomes `human`, so nothing downstream can
        # mistake a correction for something the tracker found.
        base = moves[ply - 1] if op == "replace" and ply <= len(moves) else {}
        entry = {"ply": ply, "san": san, "frame": base.get("frame"), "t": base.get("t"),
                 "decider": "human", "alarm": None, "fen_after": None}
        if op == "replace":
            moves[ply - 1] = entry
            detail = f"ply {ply} -> {san}"
        else:
            moves.insert(ply - 1, entry)
            detail = f"inserted {san} at ply {ply}"
    for i, m in enumerate(moves):
        m["ply"] = i + 1
    cand["moves"] = moves
    # Everything from the edit on is a different game than the reviewer looked at, so its review
    # state is void. Keeping it would let an "accepted" flag survive the move it was about.
    cand["reviewed_plies"] = sorted(p for p in (cand.get("reviewed_plies") or []) if p < ply)
    # An edit cannot leave a confirmation standing: the confirmed list was a different list.
    cand["confirmed"] = False
    cand.pop("confirmed_at", None)
    backup = _write(st["dir"], cand)
    return {"ok": True, "detail": detail, "backup": backup, **realgame(name)}


@router.post("/api/realgames/{name}/accept-rest")
def realgame_accept_rest(name: str):
    """Mark every `rest` ply reviewed, in one action.

    This is the requirement that keeps the tool from being a form: on a clean game the reviewer
    steps through the handful of doubtful moves and clicks once. It changes NO move.
    """
    st = _state(name)
    cand = st["candidate"]
    reviewed = set(cand.get("reviewed_plies") or [])
    reviewed |= {r["ply"] for r in st["plies"] if r["tier"] == "rest"}
    # `reviewed_plies` is the ONLY key this route touches; `moves` is not read, copied or
    # rewritten here, so accepting the quiet moves can never alter one of them.
    cand["reviewed_plies"] = sorted(reviewed)
    backup = _write(st["dir"], cand)
    return {"ok": True, "backup": backup, **realgame(name)}


@router.post("/api/realgames/{name}/confirm")
def realgame_confirm(name: str, confirmed: bool = Body(..., embed=True)):
    """The only writer of `confirmed` in the codebase.

    Refused while any ply is illegal: a line that does not replay is not a ground truth and there
    is no reading of "confirm" under which one should get through. Un-confirming is allowed and
    has to be — a reviewer who confirmed too fast needs a way back that is not deleting the
    candidate and re-running the replay.
    """
    from datetime import UTC, datetime

    st = _state(name)
    cand = st["candidate"]
    if confirmed and st["first_illegal"] is not None:
        raise HTTPException(
            400, f"Ply {st['first_illegal']} ({st['plies'][st['first_illegal'] - 1]['san']}) does "
                 f"not replay from the start position. Fix it before confirming — an unreplayable "
                 f"line cannot be ground truth.")
    cand["confirmed"] = bool(confirmed)
    if confirmed:
        cand["confirmed_at"] = datetime.now(UTC).isoformat(timespec="seconds").replace(
            "+00:00", "Z")
    else:
        cand.pop("confirmed_at", None)
    backup = _write(st["dir"], cand)
    return {"ok": True, "backup": backup, **realgame(name)}
