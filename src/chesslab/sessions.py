"""Geometrie-Reparatur einer Session: `scan`, `autofix`, `adopt`, `fit-mesh`, `repair-mesh`,
`mark-hands` — sie schreiben `corners`, `grid_lines` und `dirty` bewacht in `log.jsonl`.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from statistics import median

from . import config
from .session_store.log import _write_log, backup_log, read_log
from .session_store.names import log_path
from .session_store.paths import all_sessions, frame_path, session_dir, session_profile

# A frame inside tolerance is NEVER touched (the fit would chase noise), and a correction that does
# not improve its own frame is discarded. Every write backs up the log and records `corners_source`.


class NothingToDo(ValueError):
    """The request is well formed, but nothing would change: a no-op the caller may have meant, not
    a mistake. The web router maps this to 409, everything else to 400.
    """


def write_corner_rows(sdir: Path, rows: list[dict], indices: list[int], quad, *,
                      source: str, from_index: int | None) -> dict:
    """Write `quad` into the given rows and record HOW it got there: `corners_source` (`hand`,
    `adopted`, `auto-corrected`; absent = detected), `corners_from`, `corners_set_at`.
    """
    log_file = log_path(sdir)
    backup = backup_log(log_file)
    stamp = datetime.now(UTC).isoformat()
    for i in indices:
        # Keep what is replaced: the before/after view compares against it.
        if rows[i].get("corners"):
            rows[i]["corners_prev"] = rows[i]["corners"]
        # Die Ausrichtung beschreibt EINEN Quad; der neue ist ungemessen, sonst laese jeder die Zahl
        # des ERSETZTEN als die dieser Zeile.
        rows[i].pop("align_worst_px", None)
        rows[i]["corners"] = [[float(x), float(y)] for x, y in quad]
        rows[i]["corners_source"] = source
        rows[i]["corners_set_at"] = stamp
        if from_index is not None:
            rows[i]["corners_from"] = int(from_index)
        else:
            rows[i].pop("corners_from", None)
    _write_log(sdir, rows)
    return {"ok": True, "changed": len(indices), "indices": indices, "backup": backup,
            "corners_source": source, "from_index": from_index,
            "corners": [[float(x), float(y)] for x, y in quad]}


def corner_targets(rows: list[dict], scope: str, index: int, overwrite: bool) -> list[int]:
    """Which rows a write applies to: `frame`, `missing` or `all`. Rows WITH corners only under
    `overwrite`, so the good rows of a mixed session stay measured.
    """
    if scope == "frame":
        candidates = [index]
    elif scope == "missing":
        candidates = [i for i, r in enumerate(rows) if not r.get("corners")]
    elif scope == "all":
        candidates = list(range(len(rows)))
    else:
        raise ValueError(f"Unknown scope {scope!r} (frame | missing | all).")
    if not candidates:
        raise NothingToDo("Every row in this session already has corners — nothing to "
                          "repair. Use scope=all with overwrite=true to replace them.")
    targets = [i for i in candidates if overwrite or not rows[i].get("corners")]
    if not targets:
        blocked = [i for i in candidates if rows[i].get("corners")]
        raise NothingToDo(f"Rows {blocked} already have corners — nothing to write. "
                          "Send overwrite=true (CLI: --overwrite) to replace measured "
                          "geometry.")
    return targets


ADOPT_TOL_PX = 2.0


"""ArUco centres of a tripod-static board scatter well under a pixel."""


def adopt_candidate(rows: list[dict]) -> dict | None:
    """The quad the MOST other rows agree with (within [ADOPT_TOL_PX]), earliest wins a tie: a
    single bumped frame cannot become the template.
    """
    have = [(i, r["corners"]) for i, r in enumerate(rows)
            if r.get("corners") and len(r["corners"]) == 4]
    if not have:
        return None

    def close(a, b) -> bool:
        return all(abs(float(pa[k]) - float(pb[k])) <= ADOPT_TOL_PX
                   for pa, pb in zip(a, b, strict=True) for k in (0, 1))

    counts = [(sum(1 for _j, q in have if close(c, q)), -i, i, c) for i, c in have]
    n_same, _neg, idx, quad = max(counts)
    return {"from_index": idx, "corners": quad, "n_same": n_same,
            "source_row_source": rows[idx].get("corners_source", "detected")}


def autofix_one(sdir: Path, entry: dict):
    """`(corrected quad or None, offset before, offset after)` for one row."""
    import cv2

    from .alignment import improve_quad

    if not entry.get("corners"):
        return None, float("nan"), float("nan")
    frame = cv2.imread(str(frame_path(sdir, entry)))
    if frame is None:
        return None, float("nan"), float("nan")
    return improve_quad(frame, entry["corners"], session_profile(sdir, allow_standin=False))


def scan_alignment(session_id: str) -> dict:
    """Measure every frame's worst square offset once into `align_worst_px`: 40 s for a 534-frame
    session, and every reader sees the same number.
    """
    import cv2

    from .alignment import worst_offset

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = session_profile(sdir, allow_standin=False)
    measured = 0
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    # Erst raeumen, dann messen: eine diesmal unmessbare Zeile behielt sonst die Zahl des VORIGEN
    # Laufs.
    for r in rows:
        r.pop("align_worst_px", None)
    for r in rows:
        if not r.get("corners"):
            continue
        frame = cv2.imread(str(frame_path(sdir, r)))
        if frame is None:
            continue
        w = worst_offset(frame, r["corners"], prof)
        if w == w:
            r["align_worst_px"] = round(float(w), 2)
            measured += 1
    backup = backup_log(log_path(sdir))
    _write_log(sdir, rows)
    vals = sorted(r["align_worst_px"] for r in rows if r.get("align_worst_px") is not None)
    return {"session_id": session_id, "measured": measured, "of": len(rows),
            "median": vals[len(vals) // 2] if vals else None,
            "max": vals[-1] if vals else None, "backup": backup}


#: Measured frames a carried mesh is the median of; a single marginal fit cannot drag it.
MESH_CARRY_WINDOW = 5


def _carried_mesh(window: list[dict]) -> dict | None:
    """The per-coefficient median of the measured meshes in `window`, at their COMMON stage: a
    carried mesh never claims a curvature measured on one frame alone.
    """
    if not window:
        return None
    keys = set(window[0]).intersection(*(set(m) for m in window))
    if not {"x", "y"} <= keys:
        return None
    return {k: [round(median([m[k][i] for m in window]), 5) for i in range(9)]
            for k in ("x", "y", "tx", "ty", "cx", "cy") if k in keys}


#: How far one measured line may sit from the session's median before it counts as a mis-lock
#: rather than real movement, as a fraction of ONE cell.
MESH_LINE_TOLERANCE = 0.04


#: What each coefficient can move a line by (|t-0.5| <= 0.5, its square <= 0.25); otherwise the
#: curvature would be judged against a straight-offset tolerance.
MESH_TERM_WEIGHT = {"x": 1.0, "y": 1.0, "tx": 0.5, "ty": 0.5, "cx": 0.25, "cy": 0.25}


def _repair_mesh_outliers(rows: list[dict]) -> tuple[int, bool]:
    """Pull single mis-located grid lines back onto the session's median. -> (repaired, static)

    On the back rank the tall pieces ARE the edge: the 8/7 line scattered 4x wider and stretched
    rank 7 by 14 %. `mesh_from_lines` only checks monotony, so a plausible wrong line passes
    every gate."""
    meshes = [r["grid_lines"] for r in rows if r.get("grid_lines_source") == "measured"]
    if len(meshes) < 3:
        return 0, False
    tol = MESH_LINE_TOLERANCE / 8.0
    # Per key over the meshes that CARRY it: demanding `cx` everywhere drops the term that scatters
    # most.
    have = {k: [m for m in meshes if k in m] for k in MESH_TERM_WEIGHT}
    med = {k: [median([m[k][i] for m in ms]) for i in range(9)]
           for k, ms in have.items() if len(ms) >= 3}
    if {"x", "y"} - set(med):
        return 0, False
    # Trust the median only where that ONE line holds still; per line, not per frame. A moved rig
    # makes every deviation large, and then the own measurement is better.
    stable = {(k, i) for k in med for i in range(9)
              if median([abs(m[k][i] - med[k][i]) for m in have[k]]) * MESH_TERM_WEIGHT[k] <= tol}
    # A sliding board leaves the tilts trivially stable, so only the LINES license a repair.
    if not any(k in ("x", "y") for k, _ in stable):
        return 0, False

    def off_lines(lines: dict) -> list[tuple[str, int]]:
        return [(k, i) for k, i in stable if k in lines
                if abs(lines[k][i] - med[k][i]) * MESH_TERM_WEIGHT[k] > tol]

    todo = [r for r in rows
            if r.get("grid_lines_source") == "measured" and off_lines(r["grid_lines"])]
    for r in todo:
        for k, i in off_lines(r["grid_lines"]):
            r["grid_lines"][k][i] = round(med[k][i], 5)
        r["grid_lines_source"] = "repaired"
    return len(todo), True


def _fill_mesh_gaps(rows: list[dict]) -> int:
    """Give every row without a measured mesh the one its stable neighbours carry, backwards too.
    Gemessen heisst nicht sauber: 234 von 475 Luecken haetten sonst einen Handframe geerbt.
    """
    from .realgames.mesh import hand_seen

    measured = [i for i, r in enumerate(rows) if r.get("grid_lines") and not hand_seen(r)]
    if not measured:
        return 0
    carried = 0
    for i, row in enumerate(rows):
        if row.get("grid_lines") or not row.get("corners"):
            continue
        before = [j for j in measured if j < i][-MESH_CARRY_WINDOW:]
        near = before or measured[:MESH_CARRY_WINDOW]
        mesh = _carried_mesh([rows[j]["grid_lines"] for j in near])
        if mesh is None:
            continue
        row["grid_lines"] = mesh
        row["grid_lines_source"] = "carried"
        carried += 1
    return carried


def missing_source_frames(sdir: Path, rows: list[dict]) -> str | None:
    """Why a step that measures the SOURCE picture cannot run here, or None: a parked session keeps
    only its boards and would report "0 of 2 608 measured".
    """
    want = [r for r in rows if r.get("frame")]
    if want and not any((sdir / r["frame"]).is_file() for r in want[:8]):
        return (f"no source frames in {sdir / 'frames'} — this step fits against the raw picture, "
                f"not the board. Restore them from `data/_parked/frames/{sdir.name}`, or re-run "
                f"`chesslab realgames export-session`, which re-measures all of it from the video.")
    return None


def fit_mesh_session(session_id: str) -> dict:
    """Measure every frame's 18 grid lines into `grid_lines`, through the profile the slice uses.
    Without them a slice bakes the lens' barrel into the crops. Hand-covered frames borrow a
    neighbour's mesh.
    """
    import cv2

    from .labeling import _profile_for_session, read_session_meta
    from .realgames.mesh import grid_line_fracs

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    # The SLICE's profile: fractions through another margin describe a warp nobody cuts.
    prof = _profile_for_session(read_session_meta(sdir), None)
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    measured, stages = 0, {"curved": 0, "tilted": 0}
    for r in rows:
        r.pop("grid_lines", None)
        r.pop("grid_lines_source", None)
        if not r.get("corners"):
            continue
        try:
            frame = cv2.imread(str(frame_path(sdir, r)))
        except (FileNotFoundError, ValueError):
            continue
        if frame is None:
            continue
        mesh = grid_line_fracs(frame, r["corners"], prof.board_size, prof)
        if mesh is None:
            continue
        r["grid_lines"] = mesh
        r["grid_lines_source"] = "measured"
        measured += 1
        stages["curved" if "cx" in mesh else "tilted"] += 1
    repaired, static = _repair_mesh_outliers(rows)
    carried = _fill_mesh_gaps(rows)
    backup = backup_log(log_path(sdir))
    _write_log(sdir, rows)
    return {"session_id": session_id, "measured": measured, "carried": carried,
            "repaired": repaired, "static_rig": static, "of": len(rows), **stages,
            "backup": backup}


def mark_hands_session(session_id: str) -> dict:
    """Set `dirty` where the board's own grooves say a hand lies on them. The exporter's `dirty` is
    a time window, not a sensor (424 of 2 228 frames showed an unflagged hand). Only ever ADDS.
    """
    import cv2

    from .calibration import crop_border_px, warp_padded
    from .grid_occlusion import hand_squares, missing_edges
    from .imgops import skin_patch
    from .labeling import _profile_for_session, read_session_meta
    from .session_store.boards import move_boards, place_board

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = _profile_for_session(read_session_meta(sdir), None)
    pad = crop_border_px(prof)
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    seen = added = 0
    moves = []
    for r in rows:
        r.pop("hand_squares", None)
        if not r.get("corners"):
            continue
        try:
            frame = cv2.imread(str(frame_path(sdir, r)))
        except (FileNotFoundError, ValueError):
            continue
        if frame is None:
            continue
        padded = warp_padded(frame, prof, r["corners"], pad)
        gray = cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY)
        squares = hand_squares(missing_edges(gray, prof.board_size, pad, white_pov=prof.white_pov))
        if squares:
            # The cells the read accuses, so relabeling can offer them instead of all 64.
            r["hand_squares"] = sorted(squares)
        elif not skin_patch(padded[pad:pad + prof.board_size, pad:pad + prof.board_size],
                            prof.board_size / 8.0, prof.crop.pad_side):
            continue
        seen += 1
        added += not r.get("dirty")
        r["dirty"] = True
        moves.append(place_board(sdir, r))
    backup = backup_log(log_path(sdir))
    _write_log(sdir, rows)
    move_boards(moves)
    return {"session_id": session_id, "hands": seen, "newly_dirty": added, "of": len(rows),
            "backup": backup}


def mark_hands_all(paths: config.Paths = config.DATA, on_done=None) -> list[dict]:
    """`mark_hands_session` over every session with a log — minutes long, so it reports per session."""
    out = []
    for sid, sdir in all_sessions(paths):
        if not log_path(sdir).is_file():
            continue
        try:
            r = mark_hands_session(sid)
        except (FileNotFoundError, ValueError, KeyError) as e:
            r = {"session_id": sid, "error": f"{type(e).__name__}: {e}"}
        out.append(r)
        if on_done is not None:
            on_done(r)
    return out


def repair_mesh_session(session_id: str) -> dict:
    """Only the outlier repair over the lines a session ALREADY stores: parked sessions, the ones
    most in need, have no frames to re-measure.
    """
    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    for r in rows:                       # logs written before the source was recorded
        if r.get("grid_lines") and not r.get("grid_lines_source"):
            r["grid_lines_source"] = "measured"
    if not any(r.get("grid_lines") for r in rows):
        return {"session_id": session_id, "error": "no grid_lines stored — run fit-mesh first"}
    repaired, static = _repair_mesh_outliers(rows)
    backup = backup_log(log_path(sdir)) if repaired else None
    if repaired:
        _write_log(sdir, rows)
    return {"session_id": session_id, "repaired": repaired, "static_rig": static,
            "of": len(rows), "backup": backup}


def repair_mesh_all(paths: config.Paths = config.DATA, on_done=None) -> list[dict]:
    out = []
    for sid, sdir in all_sessions(paths):
        if not log_path(sdir).is_file():
            continue
        try:
            r = repair_mesh_session(sid)
        except (FileNotFoundError, ValueError, KeyError) as e:
            r = {"session_id": sid, "error": str(e)}
        out.append(r)
        if on_done:
            on_done(r)
    return out


def fit_mesh_all(paths: config.Paths = config.DATA, on_done=None) -> list[dict]:
    """`fit_mesh_session` over every active session with a log; `on_done` reports per session."""
    out = []
    for sid, sdir in all_sessions(paths):
        if not log_path(sdir).is_file():
            continue
        try:
            r = fit_mesh_session(sid)
        except (FileNotFoundError, ValueError, KeyError) as e:
            r = {"session_id": sid, "error": f"{type(e).__name__}: {e}"}
        out.append(r)
        if on_done is not None:
            on_done(r)
    return out


def autofix_corners(session_id: str, max_off: float = 9.0) -> dict:
    """Re-fit every frame whose worst square is further than `max_off` px off, marking changed rows
    `corners_source: "auto-corrected"`.
    """
    import cv2

    from .alignment import worst_offset

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = session_profile(sdir, allow_standin=False)
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    targets = []
    for i, r in enumerate(rows):
        if not r.get("corners"):
            continue
        frame = cv2.imread(str(frame_path(sdir, r)))
        if frame is None:
            continue
        w = worst_offset(frame, r["corners"], prof)
        if w == w and w > max_off:
            targets.append(i)
    changed, refused, gains = [], 0, []
    for i in targets:
        quad, before, after = autofix_one(sdir, rows[i])
        if quad is None:
            refused += 1
            continue
        rows[i]["corners_prev"] = rows[i]["corners"]
        rows[i]["corners"] = quad
        rows[i]["corners_source"] = "auto-corrected"
        # `after` ist an DIESEM Frame gegen den neuen Quad gemessen; sonst behielte die Zeile die
        # Zahl, die den Fix ausloeste.
        rows[i]["align_worst_px"] = round(float(after), 2)
        changed.append(i)
        gains.append((round(before, 1), round(after, 1)))
    # ONE shape whatever happened: callers trust the keys to be there.
    backup = None
    if changed:
        backup = backup_log(log_path(sdir))
        stamp = datetime.now(UTC).isoformat()
        for i in changed:
            rows[i]["corners_set_at"] = stamp
        _write_log(sdir, rows)
    return {"session_id": session_id, "checked": len(rows), "over_threshold": len(targets),
            "changed": len(changed), "refused": refused, "indices": changed,
            "gains": gains, "backup": backup, "max_off": max_off}


def adopt_corners(session_id: str, from_index: int | None = None, scope: str = "missing",
                  overwrite: bool = False) -> dict:
    """Copy a quad detected in this session into the rows that have none (one frame lost a marker);
    the rows say `adopted` and name their source row.
    """
    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    if from_index is None:
        cand = adopt_candidate(rows)
        if cand is None:
            raise ValueError("No row in this session has corners — there is nothing to adopt. "
                             "Place the box by hand instead.")
        src_idx, quad = cand["from_index"], cand["corners"]
    else:
        src_idx = int(from_index)
        if src_idx < 0 or src_idx >= len(rows):
            raise ValueError(f"Index {src_idx} out of range (0-{len(rows) - 1}).")
        quad = rows[src_idx].get("corners")
        if not quad:
            raise ValueError(f"Row {src_idx} has no corners to adopt.")
    targets = [i for i in corner_targets(rows, scope, src_idx, overwrite) if i != src_idx]
    if not targets:
        raise NothingToDo("Only the source row itself would change — nothing to do.")
    res = write_corner_rows(sdir, rows, targets, quad, source="adopted", from_index=src_idx)
    res.update(session_id=session_id, scope=scope)
    return res
