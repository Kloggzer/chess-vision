"""Collect router: /api/collect/*, /api/camera/collect.mjpg"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException

from ..camera import CAMERA, BoardTracker, mjpeg
from ..state import COLLECT
from ..util import (
    _NONE_FRAME_LIMIT,
    _camera_error_frame,
    _capture_frame_corners,
    _collect_state,
    _draw_move_arrow,
    _draw_target_pieces,
)

router = APIRouter()
log = logging.getLogger("chesslab.web")


@router.post("/api/collect/start")
def collect_start(strategy: str = Body("random"), max_plies: int = Body(40), seed: int = Body(42),
                  stockfish_path: str = Body(None), start_fen: str = Body(None),
                  profile: str = Body("default"), camera: int = Body(0),
                  sets: int = Body(1), count: int = Body(20), passes: int = Body(1),
                  pieces: str = Body("special"), together: bool = Body(False),
                  offset: int = Body(0), auto_offset: bool = Body(False),
                  target: int = Body(200)):
    from ... import config
    from ...calibration import ensure_profile
    from ...collect import SessionWriter, generate_session_id
    from ...state import (
        GameState,
        random_game_positions,
        stockfish_game_positions,
    )

    try:
        prof = ensure_profile(profile, camera)
    except FileNotFoundError as e:
        raise HTTPException(400, str(e))

    show_target = False
    # coverage: no game, instead dense setups targeting the rarest classes. Each
    # entry is a FRESH full arrangement (no single move) -> show the whole position as name.
    if strategy == "coverage":
        from ...collect_ui import coverage_from_sessions, coverage_plan

        cov = coverage_from_sessions(config.DATA.sessions)
        inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
        positions = coverage_plan(cov["light"], cov["dark"], target, count, inventory=inventory)
        if not positions:
            raise HTTPException(400, f"All classes already reach the target ({target}/class) "
                                     "— nothing to generate. Increase the target in the field or "
                                     "choose a game engine.")
        show_target = True
    elif strategy == "sweep":
        # Systematic sweep: one piece row moves rank by rank across the board (one per line).
        # `offset` shifts the line→piece assignment (constant per session); `auto`
        # counts previous sweep sessions and takes the next offset -> each piece appears on
        # different lines across multiple sessions (against position overfitting).
        from ...collect_ui import auto_sweep_offset, sweep_plan

        sweep_offset = auto_sweep_offset(config.DATA.sessions) if auto_offset else int(offset)
        inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
        positions = sweep_plan(pieces=pieces, passes=max(1, passes), inventory=inventory,
                               together=together, offset=sweep_offset)
        if not positions:
            raise HTTPException(400, "Sweep empty — check inventory/pieces (special|pawn|all).")
        show_target = True
    else:
        engine_path = None
        if strategy == "stockfish":
            # The path is a backend concern: prefer the bundled binary under
            # tools/stockfish/, otherwise CHESSLAB_STOCKFISH or PATH. The frontend doesn't need to know it.
            engine_path = stockfish_path or config.find_stockfish()
            if not engine_path:
                raise HTTPException(400, "No chess engine found. Place a Stockfish binary "
                                         "under tools/stockfish/ (or set CHESSLAB_STOCKFISH) "
                                         "— or choose the 'random' engine.")
        try:
            if strategy == "stockfish":
                steps = stockfish_game_positions(engine_path, max_plies=max_plies, start_fen=start_fen)
            else:
                steps = random_game_positions(max_plies=max_plies, seed=seed, start_fen=start_fen)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, f"Game generation failed: {e}")

        start = GameState(start_fen) if start_fen else GameState()
        positions = [{"ply": start.ply(), "san": None, "fen": start.fen()}] + steps

    sid = generate_session_id()
    CAMERA.ensure(camera)
    notes = (f"web:sweep offset={sweep_offset!s} pieces={pieces} together={together}"
             if strategy == "sweep" else f"web:{strategy}")
    writer = SessionWriter(config.DATA.sessions / sid, session_id=sid, profile=profile, mode="play",
                           camera_index=camera, frame_size=prof.frame_size, notes=notes)
    COLLECT.update(writer=writer, positions=positions, i=0, profile=prof,
                   camera=camera, board=BoardTracker(prof), show_target=show_target)
    return _collect_state()


@router.get("/api/collect/state")
def collect_state():
    return _collect_state()


@router.post("/api/collect/shoot")
def collect_shoot():
    # One click: photograph the current position AND advance. Saved immediately.
    c = COLLECT.snapshot()
    w = c["writer"]
    if w is None:
        raise HTTPException(400, "no active capture session.")
    pos, i = c["positions"], c["i"]
    if i >= len(pos):
        return _collect_state()
    # Preview runs over the stream; saved image comes from (if capture source is set) the
    # high-resolution snapshot with corners re-detected on IT — otherwise live frame + stream corners.
    # (Camera I/O deliberately WITHOUT lock — locks only protect state access.)
    f, corners = _capture_frame_corners(c["profile"], c["board"])
    if f is None:
        raise HTTPException(400, "no frame from camera.")
    w.capture(f, pos[i]["ply"], pos[i]["fen"], pos[i]["san"], corners=corners)
    COLLECT.mutate(lambda d: d.update(i=d["i"] + 1))
    return _collect_state()


@router.post("/api/collect/skip")
def collect_skip():
    COLLECT.mutate(lambda d: d.update(i=d["i"] + 1) if d["i"] < len(d["positions"]) else None)
    return _collect_state()


@router.post("/api/collect/undo")
def collect_undo():
    w = COLLECT.get("writer")
    if w is not None:
        w.undo()
        COLLECT.mutate(lambda d: d.update(i=max(0, d["i"] - 1)))
    return _collect_state()


@router.post("/api/collect/finish")
def collect_finish():
    from ... import labeling as labeling_mod

    w = COLLECT.get("writer")
    if w is None:
        return {"ok": True, "captures": 0}
    w.close()
    n, sid = w.count, w.session_id
    COLLECT.update(writer=None, positions=[], i=0, profile=None)
    # Release the camera: nothing needs it after finishing — a lingering capture
    # (esp. network sources with FFmpeg reader threads) blocks Ctrl+C shutdown.
    CAMERA.release()
    # Automate the mechanical step: slice the just-finished session immediately,
    # so the crops are available in the datasets tab right away.
    sliced, sliced_error = 0, None
    if n > 0:
        try:
            labeling_mod.run_slice(session=sid)
            from ... import config
            from ...manifest_cache import session_crop_count
            sliced = session_crop_count(config.DATA.manifests / "squares.jsonl", sid)
        except Exception as e:  # noqa: BLE001 — convenience step, but the error must be visible (H2)
            log.exception("Auto-slice after collect-finish failed (session %s)", sid)
            sliced_error = f"Auto-slice failed: {e}"
    resp = {"ok": True, "captures": n, "session": sid, "sliced": sliced}
    if sliced_error:
        resp["sliced_error"] = sliced_error
    return resp


@router.get("/api/camera/collect.mjpg")
def camera_collect():
    import cv2

    from ...calibration import draw_board_grid
    from ...serve import SHUTDOWN

    def frames():
        none_count = 0
        try:
          while not SHUTDOWN.is_set():   # ends the stream cleanly on server shutdown
            f = CAMERA.read()
            c = COLLECT.snapshot()   # exactly ONE snapshot per frame (H1)
            prof, board, pos, i = c["profile"], c["board"], c["positions"], c["i"]
            show_target = c.get("show_target")
            if f is None:
                none_count += 1
                yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                if none_count >= _NONE_FRAME_LIMIT:
                    none_count = 0
                continue
            none_count = 0
            if prof is None or board is None:
                img = f.copy()
                cv2.putText(img, "no active capture — press Start", (10, 28),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
            else:
                warped, _ = board.process(f)   # Corners/warp from the shared BoardTracker
                if warped is None:
                    img = f.copy()
                    cv2.putText(img, "Box from profile — waiting for markers...", (10, 28),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                else:
                    img = draw_board_grid(warped, prof)
                    if show_target and 0 <= i < len(pos):
                        # coverage: entire target position as piece names for reconstruction
                        _draw_target_pieces(img, prof, pos[i]["fen"])
                    elif 0 < i < len(pos):   # Game mode: move leading to the current position
                        _draw_move_arrow(img, prof, pos[i - 1]["fen"], pos[i]["san"])
            yield img
        finally:
            log.info("Stream ended: collect")

    return mjpeg(frames())
