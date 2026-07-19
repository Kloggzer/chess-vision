"""Stage 3 (Part 1) — Capture.

Writes raw frame + FEN per confirmed position to a session log. **No slicing here**
(`labeling.slice_session` does that reproducibly). Two modes share the
`SessionWriter` logic: `collect pgn` (PGN replay) and `collect live` (free play).

`SessionWriter` is headless-testable; the capture loops need camera + display and
run on the rig.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import chess

from . import config
from .calibration import (
    board_corners_for_frame,
    draw_board_grid,
    ensure_profile,
    make_tracker,
    square_center,
    warp_board,
    warp_from_corners,
)
from .camera import open_camera
from .state import GameState, castling_rook_squares, en_passant_captured_square, pgn_positions


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def generate_session_id() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


class SessionWriter:
    """Manages a session directory: frames, log.jsonl, session.yaml + consistent undo."""

    def __init__(
        self,
        session_dir: Path,
        *,
        session_id: str,
        profile: str,
        mode: str,
        camera_index: int,
        frame_size: tuple[int, int],
        source_pgn: str | None = None,
        notes: str = "",
    ) -> None:
        self.dir = Path(session_dir)
        self.frames_dir = self.dir / "frames"
        self.log_path = self.dir / "log.jsonl"
        self.frames_dir.mkdir(parents=True, exist_ok=True)
        self.session_id = session_id
        self.profile = profile
        self.mode = mode
        self.camera_index = camera_index
        self.frame_size = (int(frame_size[0]), int(frame_size[1]))
        self.source_pgn = source_pgn
        self.notes = notes
        self.created_at = _now_iso()
        self.entries: list[dict] = []
        self._frame_idx = 0
        # fresh log
        self.log_path.write_text("", encoding="utf-8")
        self._write_session_yaml()

    def _write_session_yaml(self) -> None:
        import yaml

        from . import lens

        # Record the LENS state these frames were captured under, so a dataset that mixes
        # pre- and post-undistortion sessions stays queryable (absent on old sessions =
        # raw frames). The frames on disk are never remapped again on replay.
        undistorted, lens_calib_id = lens.profile_lens_state(self.camera_index)
        meta = {
            "session_id": self.session_id,
            "profile": self.profile,
            "mode": self.mode,
            "created_at": self.created_at,
            "camera_index": int(self.camera_index),
            "frame_size": [self.frame_size[0], self.frame_size[1]],
            "undistorted": bool(undistorted),
            "lens_calib_id": lens_calib_id,
            "notes": self.notes,
        }
        if self.mode == "pgn" and self.source_pgn:
            meta["source_pgn"] = self.source_pgn
        with (self.dir / "session.yaml").open("w", encoding="utf-8") as fh:
            yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)

    def capture(self, frame, ply: int, fen: str, move_san: str | None = None,
                corners: list[list[float]] | None = None,
                labels: dict[str, str] | None = None) -> str:
        import cv2

        rel = f"frames/{self._frame_idx:04d}.png"
        cv2.imwrite(str(self.dir / rel), frame)
        entry = {"frame": rel, "ply": ply, "fen": fen, "ts": _now_iso(), "move_san": move_san}
        if corners is not None:
            # Board corners (a8,h8,h1,a1) in frame pixels, verified live at capture time.
            # `slice` warps the exact same geometry from these (instead of re-detecting).
            entry["corners"] = [[float(x), float(y)] for x, y in corners]
        if labels is not None:
            # Explicit per-square labels (Inference/Active-Learning): `slice` uses these instead
            # of FEN derivation. Allows classes like `occluded` that don't exist in FEN.
            entry["labels"] = {str(k): str(v) for k, v in labels.items()}
        self.entries.append(entry)
        with self.log_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        self._frame_idx += 1
        return rel

    def undo(self) -> dict | None:
        """Undo last capture: consistently remove frame file + log line."""
        if not self.entries:
            return None
        last = self.entries.pop()
        fp = self.dir / last["frame"]
        if fp.exists():
            fp.unlink()
        with self.log_path.open("w", encoding="utf-8") as fh:
            for e in self.entries:
                fh.write(json.dumps(e, ensure_ascii=False) + "\n")
        self._frame_idx = max(0, self._frame_idx - 1)
        return last

    @property
    def count(self) -> int:
        return len(self.entries)

    def close(self, notes: str | None = None) -> None:
        if notes is not None:
            self.notes = notes
        self._write_session_yaml()


# --- Interactive Loops (camera + display, run on the rig) --------------------------

def _resolve_session_dir(session: str | None) -> tuple[str, Path]:
    sid = session or generate_session_id()
    return sid, config.DATA.sessions / sid


def collect_pgn(pgn: str, profile: str, camera: int, every: int = 1,
                session: str | None = None, notes: str = "",
                ui: bool = False, target: int = config.UI_TARGET_PER_CLASS) -> int:
    try:
        prof = ensure_profile(profile, camera)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    start = GameState()
    positions = [{"ply": 0, "san": None, "fen": start.fen()}] + pgn_positions(pgn, every=every)
    if len(positions) <= 1:
        print(f"[WARN] '{pgn}' contains no moves — only the starting position is available. "
              "Check the --pgn path/content (e.g. games/test.pgn).")
    return _replay_capture(positions, prof, profile, camera, mode="pgn", source_pgn=str(pgn),
                           session=session, notes=notes, ui=ui, target=target, title="chesslab collect (pgn)")


def collect_play(strategy: str, max_plies: int, seed: int, stockfish_path: str | None,
                 start_fen: str | None, profile: str, camera: int,
                 session: str | None = None, ui: bool = False,
                 target: int = config.UI_TARGET_PER_CLASS,
                 sets: int = 1, count: int = 20,
                 passes: int = 1, pieces: str = "special", together: bool = False,
                 offset: int = 0, auto_offset: bool = False) -> int:
    """An engine plays the move sequence (random/stockfish) OR the coverage generator builds
    dense setups (coverage); you physically set them up and photograph."""
    from .state import random_game_positions, stockfish_game_positions

    try:
        prof = ensure_profile(profile, camera)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    # coverage: not a game, but dense setups from the current class coverage.
    if strategy == "coverage":
        from .collect_ui import coverage_from_sessions, coverage_plan

        cov = coverage_from_sessions(config.DATA.sessions)
        inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
        steps = coverage_plan(cov["light"], cov["dark"], target, count, inventory=inventory)
        if not steps:
            print(f"[OK] All classes already reach the target ({target}/class) — nothing "
                  "to generate. Check `chesslab stats` or raise --target.")
            return 0
        gained = sum(s["gains"] for s in steps)
        print(f"[OK] Coverage plan: {len(steps)} dense setups, ~{gained} target crops per frame "
              f"(inventory ×{sets}). Set up each arrangement, photograph (feel free to take multiple frames "
              "with varying lighting), then `n` for the next.")
        positions = steps
        return _replay_capture(positions, prof, profile, camera, mode="play", source_pgn=None,
                               session=session, notes=f"coverage target={target} sets={sets}",
                               ui=ui, target=target, title="chesslab collect (play:coverage)")

    # sweep: a piece row walks rank by rank across the board (systematic square×class coverage).
    if strategy == "sweep":
        from .collect_ui import auto_sweep_offset, sweep_plan

        off = auto_sweep_offset(config.DATA.sessions) if auto_offset else int(offset)
        inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
        steps = sweep_plan(pieces=pieces, passes=max(1, passes), inventory=inventory,
                           together=together, offset=off)
        if not steps:
            print(f"[FAIL] Sweep empty — pieces={pieces!r} (special|pawn|all) / check inventory.")
            return 1
        mode_txt = "both colors simultaneously" if together else "White, then Black"
        print(f"[OK] Sweep plan: {len(steps)} setups ({pieces}, offset={off}, {passes} pass(es), "
              f"{mode_txt}). Set up each row, photograph, then `n` for the next.")
        return _replay_capture(steps, prof, profile, camera, mode="play", source_pgn=None,
                               session=session,
                               notes=f"sweep offset={off} pieces={pieces} passes={passes} together={together}",
                               ui=ui, target=target, title="chesslab collect (play:sweep)")

    try:
        if strategy == "stockfish":
            if not stockfish_path:
                print("[FAIL] --stockfish-path <binary> required for strategy=stockfish.")
                return 1
            steps = stockfish_game_positions(stockfish_path, max_plies=max_plies, start_fen=start_fen)
        else:
            steps = random_game_positions(max_plies=max_plies, seed=seed, start_fen=start_fen)
    except Exception as e:  # noqa: BLE001
        print(f"[FAIL] Engine game failed: {e}")
        return 1

    start = GameState(start_fen) if start_fen else GameState()
    positions = [{"ply": start.ply(), "san": None, "fen": start.fen()}] + steps
    print(f"[OK] {strategy} game generated: {len(steps)} half-moves.")
    return _replay_capture(positions, prof, profile, camera, mode="play", source_pgn=None,
                           session=session, notes=f"engine:{strategy} seed={seed}", ui=ui, target=target,
                           title=f"chesslab collect (play:{strategy})")


def _replay_capture(positions: list[dict], prof, profile: str, camera: int, *,
                    mode: str, source_pgn: str | None, session: str | None, notes: str,
                    ui: bool, target: int, title: str) -> int:
    """Shared capture loop for PGN and engine mode: arrow overlay, keys, capture."""
    import cv2

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Camera {camera} could not be opened.")
        return 1

    sid, sdir = _resolve_session_dir(session)
    writer = SessionWriter(sdir, session_id=sid, profile=profile, mode=mode, camera_index=camera,
                           frame_size=prof.frame_size, source_pgn=source_pgn, notes=notes)

    dash = None
    copy_fn = None
    if ui:
        from .collect_ui import CollectDashboard, copy_to_clipboard

        copy_fn = copy_to_clipboard
        dash = CollectDashboard(config.DATA.sessions, target_per_class=target, mode_label=mode, session_id=sid)
        dash.update()

    print("IMPORTANT: first click the camera window so key presses register.")
    print("Space=capture  n/Enter=next position  s=skip  u=undo" + ("  g=copy FEN" if ui else "") + "  q=quit")
    cv2.namedWindow(title, cv2.WINDOW_NORMAL)
    tracker = make_tracker(prof)   # Live view like slicing: marker tracker seeded from profile
    last_corners = None            # last displayed board corners -> saved with capture
    i = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                print("[FAIL] no frame read.")
                return 1
            corners = board_corners_for_frame(frame, prof, tracker)
            if corners is not None:
                last_corners = corners
            warped = warp_from_corners(frame, prof, last_corners) if last_corners is not None else warp_board(frame, prof)
            view = draw_board_grid(warped, prof)
            # Draw the intended next move as an arrow on the board.
            if i + 1 < len(positions):
                try:
                    b = chess.Board(positions[i]["fen"])
                    mv = b.parse_san(positions[i + 1]["san"])
                    c0 = square_center(chess.square_name(mv.from_square), prof)
                    c1 = square_center(chess.square_name(mv.to_square), prof)
                    cv2.arrowedLine(view, c0, c1, (0, 0, 255), 3, cv2.LINE_AA, tipLength=0.25)
                    cv2.circle(view, c0, 10, (0, 200, 255), 2, cv2.LINE_AA)
                    # For castling also show the rook (second arrow, orange).
                    rook = castling_rook_squares(b, mv)
                    if rook is not None:
                        r0 = square_center(chess.square_name(rook[0]), prof)
                        r1 = square_center(chess.square_name(rook[1]), prof)
                        cv2.arrowedLine(view, r0, r1, (0, 165, 255), 3, cv2.LINE_AA, tipLength=0.25)
                        cv2.circle(view, r0, 10, (0, 215, 255), 2, cv2.LINE_AA)
                    # For en passant mark the captured pawn square with red X.
                    ep = en_passant_captured_square(b, mv)
                    if ep is not None:
                        e = square_center(chess.square_name(ep), prof)
                        d = 16
                        cv2.line(view, (e[0] - d, e[1] - d), (e[0] + d, e[1] + d), (0, 0, 255), 3, cv2.LINE_AA)
                        cv2.line(view, (e[0] - d, e[1] + d), (e[0] + d, e[1] - d), (0, 0, 255), 3, cv2.LINE_AA)
                except Exception:  # noqa: BLE001 - arrow is optional
                    pass
            nxt = positions[i + 1]["san"] if i + 1 < len(positions) else "End"
            for j, txt in enumerate([
                f"Position {i + 1}/{len(positions)}  ply={positions[i]['ply']}",
                f"next move: {nxt}",
                f"Captures: {writer.count}",
            ]):
                cv2.putText(view, txt, (10, 22 + 22 * j), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                            (0, 255, 255), 1, cv2.LINE_AA)
            cv2.imshow(title, view)
            key = cv2.waitKey(20) & 0xFF
            if key == 255:
                continue  # no key pressed
            if key == ord("q"):
                break
            elif key == ord(" "):
                writer.capture(frame, positions[i]["ply"], positions[i]["fen"], positions[i]["san"],
                               corners=last_corners)
                if dash:
                    dash.update()
                print(f"  Photo {writer.count} (Position {i + 1}/{len(positions)}, ply {positions[i]['ply']})")
            elif key in (ord("n"), 13, 10):  # n or Enter
                if i + 1 < len(positions):
                    i += 1
                    nxt = positions[i + 1]["san"] if i + 1 < len(positions) else "End"
                    print(f"  -> Position {i + 1}/{len(positions)} | next move: {nxt}")
                else:
                    print("  already last position.")
            elif key == ord("s"):
                if i + 1 < len(positions):
                    i += 1
                    print(f"  skipped -> Position {i + 1}/{len(positions)}")
                else:
                    print("  already last position.")
            elif key == ord("u"):
                removed = writer.undo()
                if dash:
                    dash.update()
                print("  last capture undone." if removed else "  nothing to undo.")
            elif key == ord("g") and dash is not None:
                fen = dash.recommended_fen()
                if fen:
                    print(("  copied: " if copy_fn(fen) else "  Recommendation: ") + fen)
    finally:
        writer.close()
        if dash:
            dash.close()
        cap.release()
        cv2.destroyAllWindows()
    print(f"[OK] Session {sid}: {writer.count} captures -> {sdir}")
    return 0


def collect_live(start_fen: str | None, profile: str, camera: int,
                 session: str | None = None, notes: str = "",
                 ui: bool = False, target: int = config.UI_TARGET_PER_CLASS) -> int:
    """Terminal-driven loop: type move -> validate -> capture frame.

    Commands: <SAN/UCI> = move + capture, `cap` = extra frame, `undo`, `fen <FEN>`, `done`.
    """
    import cv2

    try:
        prof = ensure_profile(profile, camera)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Camera {camera} could not be opened.")
        return 1

    gs = GameState(start_fen) if start_fen else GameState()
    sid, sdir = _resolve_session_dir(session)
    writer = SessionWriter(sdir, session_id=sid, profile=profile, mode="live", camera_index=camera,
                           frame_size=prof.frame_size, notes=notes)

    dash = None
    copy_fn = None
    if ui:
        from .collect_ui import CollectDashboard, copy_to_clipboard

        copy_fn = copy_to_clipboard
        dash = CollectDashboard(config.DATA.sessions, target_per_class=target, mode_label="live", session_id=sid)
        dash.update()

    tracker = make_tracker(prof)   # Board corners per capture from markers (seeded, hold-last)

    def grab():
        ok, frame = cap.read()
        return frame if ok else None

    print("Commands: <SAN/UCI> | cap | undo | fen <FEN>" + (" | rec" if ui else "") + " | done")

    def handle(line: str) -> bool:
        """Process one input line. Returns False -> exit loop."""
        line = line.strip()
        if not line:
            return True
        if line == "done":
            return False
        if line == "rec" and dash is not None:
            fen = dash.recommended_fen()
            print("  " + (("copied: " if copy_fn(fen) else "Recommendation: ") + fen) if fen
                  else "  all classes sufficiently covered")
            return True
        if line == "cap":
            f = grab()
            if f is not None:
                corners = board_corners_for_frame(f, prof, tracker)
                writer.capture(f, gs.ply(), gs.fen(), None, corners=corners)
                if dash:
                    dash.update()
                print(f"  Capture {writer.count}" + ("" if corners else "  [WARN: no markers -> without geometry]"))
            return True
        if line == "undo":
            try:
                gs.undo()
                writer.undo()
                if dash:
                    dash.update()
                print("  undone")
            except IndexError:
                print("  nothing to undo")
            return True
        if line.startswith("fen "):
            try:
                gs.set_fen(line[4:].strip())
            except ValueError as e:
                print(f"  invalid FEN: {e}")
            return True
        try:
            try:
                gs.push_san(line)
            except ValueError:
                gs.push_uci(line)
        except ValueError:
            print("  illegal/invalid move — try again.")
            return True
        f = grab()
        if f is not None:
            writer.capture(f, gs.ply(), gs.fen(), line)
            if dash:
                dash.update()
            print(f"  Capture {writer.count}")
        return True

    try:
        if dash is None:
            # No window -> simple blocking input loop.
            while True:
                print(f"FEN: {gs.fen()}")
                try:
                    if not handle(input("> ")):
                        break
                except EOFError:
                    break
        else:
            # With dashboard: read stdin in a thread so the main thread can continuously
            # pump the OpenCV window (otherwise it freezes between inputs).
            import queue
            import threading

            inbox: queue.Queue = queue.Queue()

            def _reader() -> None:
                try:
                    for raw in sys.stdin:
                        inbox.put(raw)
                except Exception:  # noqa: BLE001
                    pass
                inbox.put(None)

            threading.Thread(target=_reader, daemon=True).start()
            print(f"FEN: {gs.fen()}")
            print("> Input in terminal; the dashboard window stays active (g there = copy FEN).")
            while True:
                if (cv2.waitKey(50) & 0xFF) == ord("g"):
                    fen = dash.recommended_fen()
                    if fen:
                        print("  " + ("copied: " if copy_fn(fen) else "Recommendation: ") + fen)
                try:
                    line = inbox.get_nowait()
                except queue.Empty:
                    continue
                if line is None or not handle(line):
                    break
                print(f"FEN: {gs.fen()}")
    finally:
        writer.close()
        if dash:
            dash.close()
        cap.release()
    print(f"[OK] Session {sid}: {writer.count} captures -> {sdir}")
    return 0
