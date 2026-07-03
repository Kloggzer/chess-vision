"""Stufe 3 (Teil 1) — Aufnahme.

Schreibt Rohframe + FEN je bestätigter Stellung in ein Session-Log. **Kein Slicing hier**
(das macht `labeling.slice_session` reproduzierbar). Zwei Modi teilen sich die
`SessionWriter`-Logik: `collect pgn` (PGN-Replay) und `collect live` (freies Spiel).

`SessionWriter` ist headless testbar; die Aufnahme-Loops brauchen Kamera + Display und
laufen auf dem Rig.
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
    load_profile,
    make_tracker,
    open_camera,
    square_center,
    warp_board,
    warp_from_corners,
)
from .state import GameState, castling_rook_squares, en_passant_captured_square, pgn_positions


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def generate_session_id() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


class SessionWriter:
    """Verwaltet ein Session-Verzeichnis: Frames, log.jsonl, session.yaml + konsistentes undo."""

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
        # frisches Log
        self.log_path.write_text("", encoding="utf-8")
        self._write_session_yaml()

    def _write_session_yaml(self) -> None:
        import yaml

        meta = {
            "session_id": self.session_id,
            "profile": self.profile,
            "mode": self.mode,
            "created_at": self.created_at,
            "camera_index": int(self.camera_index),
            "frame_size": [self.frame_size[0], self.frame_size[1]],
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
            # Brett-Ecken (a8,h8,h1,a1) in Frame-Pixeln, zur Aufnahmezeit live verifiziert.
            # `slice` warpt daraus exakt dieselbe Geometrie (statt neu zu detektieren).
            entry["corners"] = [[float(x), float(y)] for x, y in corners]
        if labels is not None:
            # Explizite Per-Feld-Labels (Inference/Active-Learning): `slice` nutzt diese statt
            # der FEN-Ableitung. Erlaubt Klassen wie `occluded`, die es in der FEN nicht gibt.
            entry["labels"] = {str(k): str(v) for k, v in labels.items()}
        self.entries.append(entry)
        with self.log_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        self._frame_idx += 1
        return rel

    def undo(self) -> dict | None:
        """Letzte Aufnahme zurücknehmen: Frame-Datei + Log-Zeile konsistent entfernen."""
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


# --- Interaktive Loops (Kamera + Display, laufen auf dem Rig) --------------------------

def _resolve_session_dir(session: str | None) -> tuple[str, Path]:
    sid = session or generate_session_id()
    return sid, config.DATA.sessions / sid


def collect_pgn(pgn: str, profile: str, camera: int, every: int = 1,
                session: str | None = None, notes: str = "",
                ui: bool = False, target: int = config.UI_TARGET_PER_CLASS) -> int:
    try:
        prof = load_profile(profile)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    start = GameState()
    positions = [{"ply": 0, "san": None, "fen": start.fen()}] + pgn_positions(pgn, every=every)
    if len(positions) <= 1:
        print(f"[WARN] '{pgn}' enthielt keine Züge — nur die Startstellung ist verfügbar. "
              "Prüfe den --pgn-Pfad/-Inhalt (z.B. games/test.pgn).")
    return _replay_capture(positions, prof, profile, camera, mode="pgn", source_pgn=str(pgn),
                           session=session, notes=notes, ui=ui, target=target, title="chesslab collect (pgn)")


def collect_play(strategy: str, max_plies: int, seed: int, stockfish_path: str | None,
                 start_fen: str | None, profile: str, camera: int,
                 session: str | None = None, ui: bool = False,
                 target: int = config.UI_TARGET_PER_CLASS,
                 sets: int = 1, count: int = 20,
                 passes: int = 1, pieces: str = "special", together: bool = False,
                 offset: int = 0, auto_offset: bool = False) -> int:
    """Eine Engine spielt die Zugfolge (random/stockfish) ODER der Coverage-Generator baut
    dichte Setups (coverage); du stellst sie physisch nach und fotografierst."""
    from .state import random_game_positions, stockfish_game_positions

    try:
        prof = load_profile(profile)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    # coverage: keine Partie, sondern dichte Aufbauten aus der aktuellen Klassenabdeckung.
    if strategy == "coverage":
        from .collect_ui import coverage_from_sessions, coverage_plan

        cov = coverage_from_sessions(config.DATA.sessions)
        inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
        steps = coverage_plan(cov["light"], cov["dark"], target, count, inventory=inventory)
        if not steps:
            print(f"[OK] Alle Klassen erreichen bereits das Ziel ({target}/Klasse) — nichts "
                  "zu generieren. `chesslab stats` prüfen oder --target erhöhen.")
            return 0
        gained = sum(s["gains"] for s in steps)
        print(f"[OK] Coverage-Plan: {len(steps)} dichte Aufbauten, ~{gained} Ziel-Crops je Frame "
              f"(Inventar ×{sets}). Stelle jeden Aufbau nach, fotografiere (gern mehrere Frames "
              "mit wechselndem Licht), dann `n` für den nächsten.")
        positions = steps
        return _replay_capture(positions, prof, profile, camera, mode="play", source_pgn=None,
                               session=session, notes=f"coverage target={target} sets={sets}",
                               ui=ui, target=target, title="chesslab collect (play:coverage)")

    # sweep: Figurenreihe wandert Rang für Rang übers Brett (systematische Feld×Klasse-Abdeckung).
    if strategy == "sweep":
        from .collect_ui import auto_sweep_offset, sweep_plan

        off = auto_sweep_offset(config.DATA.sessions) if auto_offset else int(offset)
        inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
        steps = sweep_plan(pieces=pieces, passes=max(1, passes), inventory=inventory,
                           together=together, offset=off)
        if not steps:
            print(f"[FAIL] Sweep leer — pieces={pieces!r} (special|pawn|all) / Inventar prüfen.")
            return 1
        mode_txt = "beide Farben gleichzeitig" if together else "Weiß, dann Schwarz"
        print(f"[OK] Sweep-Plan: {len(steps)} Aufbauten ({pieces}, offset={off}, {passes} Pass(es), "
              f"{mode_txt}). Stelle jede Reihe nach, fotografiere, dann `n` für die nächste.")
        return _replay_capture(steps, prof, profile, camera, mode="play", source_pgn=None,
                               session=session,
                               notes=f"sweep offset={off} pieces={pieces} passes={passes} together={together}",
                               ui=ui, target=target, title="chesslab collect (play:sweep)")

    try:
        if strategy == "stockfish":
            if not stockfish_path:
                print("[FAIL] --stockfish-path <binary> nötig für strategy=stockfish.")
                return 1
            steps = stockfish_game_positions(stockfish_path, max_plies=max_plies, start_fen=start_fen)
        else:
            steps = random_game_positions(max_plies=max_plies, seed=seed, start_fen=start_fen)
    except Exception as e:  # noqa: BLE001
        print(f"[FAIL] Engine-Partie fehlgeschlagen: {e}")
        return 1

    start = GameState(start_fen) if start_fen else GameState()
    positions = [{"ply": start.ply(), "san": None, "fen": start.fen()}] + steps
    print(f"[OK] {strategy}-Partie generiert: {len(steps)} Halbzüge.")
    return _replay_capture(positions, prof, profile, camera, mode="play", source_pgn=None,
                           session=session, notes=f"engine:{strategy} seed={seed}", ui=ui, target=target,
                           title=f"chesslab collect (play:{strategy})")


def _replay_capture(positions: list[dict], prof, profile: str, camera: int, *,
                    mode: str, source_pgn: str | None, session: str | None, notes: str,
                    ui: bool, target: int, title: str) -> int:
    """Gemeinsamer Aufnahme-Loop für PGN- und Engine-Modus: Pfeil-Overlay, Tasten, Capture."""
    import cv2

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Kamera {camera} konnte nicht geöffnet werden.")
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

    print("WICHTIG: zuerst das Kamerafenster anklicken, damit Tasten ankommen.")
    print("Space=capture  n/Enter=nächste Stellung  s=skip  u=undo" + ("  g=FEN kopieren" if ui else "") + "  q=quit")
    cv2.namedWindow(title, cv2.WINDOW_NORMAL)
    tracker = make_tracker(prof)   # Live-Ansicht wie beim Slicing: aus Profil geseedeter Marker-Tracker
    last_corners = None            # zuletzt angezeigte Brett-Ecken -> werden beim Capture mitgespeichert
    i = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                print("[FAIL] kein Frame gelesen.")
                return 1
            corners = board_corners_for_frame(frame, prof, tracker)
            if corners is not None:
                last_corners = corners
            warped = warp_from_corners(frame, prof, last_corners) if last_corners is not None else warp_board(frame, prof)
            view = draw_board_grid(warped, prof)
            # Den gewollten nächsten Zug als Pfeil aufs Brett zeichnen.
            if i + 1 < len(positions):
                try:
                    b = chess.Board(positions[i]["fen"])
                    mv = b.parse_san(positions[i + 1]["san"])
                    c0 = square_center(chess.square_name(mv.from_square), prof)
                    c1 = square_center(chess.square_name(mv.to_square), prof)
                    cv2.arrowedLine(view, c0, c1, (0, 0, 255), 3, cv2.LINE_AA, tipLength=0.25)
                    cv2.circle(view, c0, 10, (0, 200, 255), 2, cv2.LINE_AA)
                    # Bei Rochade auch den Turm anzeigen (zweiter Pfeil, orange).
                    rook = castling_rook_squares(b, mv)
                    if rook is not None:
                        r0 = square_center(chess.square_name(rook[0]), prof)
                        r1 = square_center(chess.square_name(rook[1]), prof)
                        cv2.arrowedLine(view, r0, r1, (0, 165, 255), 3, cv2.LINE_AA, tipLength=0.25)
                        cv2.circle(view, r0, 10, (0, 215, 255), 2, cv2.LINE_AA)
                    # Bei en passant das zu entfernende Bauernfeld mit rotem X markieren.
                    ep = en_passant_captured_square(b, mv)
                    if ep is not None:
                        e = square_center(chess.square_name(ep), prof)
                        d = 16
                        cv2.line(view, (e[0] - d, e[1] - d), (e[0] + d, e[1] + d), (0, 0, 255), 3, cv2.LINE_AA)
                        cv2.line(view, (e[0] - d, e[1] + d), (e[0] + d, e[1] - d), (0, 0, 255), 3, cv2.LINE_AA)
                except Exception:  # noqa: BLE001 - Pfeil ist optional
                    pass
            nxt = positions[i + 1]["san"] if i + 1 < len(positions) else "Ende"
            for j, txt in enumerate([
                f"Stellung {i + 1}/{len(positions)}  ply={positions[i]['ply']}",
                f"naechster Zug: {nxt}",
                f"Aufnahmen: {writer.count}",
            ]):
                cv2.putText(view, txt, (10, 22 + 22 * j), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                            (0, 255, 255), 1, cv2.LINE_AA)
            cv2.imshow(title, view)
            key = cv2.waitKey(20) & 0xFF
            if key == 255:
                continue  # keine Taste
            if key == ord("q"):
                break
            elif key == ord(" "):
                writer.capture(frame, positions[i]["ply"], positions[i]["fen"], positions[i]["san"],
                               corners=last_corners)
                if dash:
                    dash.update()
                print(f"  Foto {writer.count} (Stellung {i + 1}/{len(positions)}, ply {positions[i]['ply']})")
            elif key in (ord("n"), 13, 10):  # n oder Enter
                if i + 1 < len(positions):
                    i += 1
                    nxt = positions[i + 1]["san"] if i + 1 < len(positions) else "Ende"
                    print(f"  -> Stellung {i + 1}/{len(positions)} | nächster Zug: {nxt}")
                else:
                    print("  bereits letzte Stellung.")
            elif key == ord("s"):
                if i + 1 < len(positions):
                    i += 1
                    print(f"  übersprungen -> Stellung {i + 1}/{len(positions)}")
                else:
                    print("  bereits letzte Stellung.")
            elif key == ord("u"):
                removed = writer.undo()
                if dash:
                    dash.update()
                print("  letzte Aufnahme zurückgenommen." if removed else "  nichts zurückzunehmen.")
            elif key == ord("g") and dash is not None:
                fen = dash.recommended_fen()
                if fen:
                    print(("  kopiert: " if copy_fn(fen) else "  Empfehlung: ") + fen)
    finally:
        writer.close()
        if dash:
            dash.close()
        cap.release()
        cv2.destroyAllWindows()
    print(f"[OK] Session {sid}: {writer.count} Aufnahmen -> {sdir}")
    return 0


def collect_live(start_fen: str | None, profile: str, camera: int,
                 session: str | None = None, notes: str = "",
                 ui: bool = False, target: int = config.UI_TARGET_PER_CLASS) -> int:
    """Terminal-getriebener Loop: Zug eintippen -> validieren -> Frame aufnehmen.

    Befehle: <SAN/UCI> = Zug + Aufnahme, `cap` = Extra-Frame, `undo`, `fen <FEN>`, `done`.
    """
    import cv2

    try:
        prof = load_profile(profile)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Kamera {camera} konnte nicht geöffnet werden.")
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

    tracker = make_tracker(prof)   # Brett-Ecken pro Aufnahme aus den Markern (geseedet, Hold-last)

    def grab():
        ok, frame = cap.read()
        return frame if ok else None

    print("Befehle: <SAN/UCI> | cap | undo | fen <FEN>" + (" | rec" if ui else "") + " | done")

    def handle(line: str) -> bool:
        """Eine Eingabezeile verarbeiten. Rückgabe False -> Loop beenden."""
        line = line.strip()
        if not line:
            return True
        if line == "done":
            return False
        if line == "rec" and dash is not None:
            fen = dash.recommended_fen()
            print("  " + (("kopiert: " if copy_fn(fen) else "Empfehlung: ") + fen) if fen
                  else "  alle Klassen ausreichend abgedeckt")
            return True
        if line == "cap":
            f = grab()
            if f is not None:
                corners = board_corners_for_frame(f, prof, tracker)
                writer.capture(f, gs.ply(), gs.fen(), None, corners=corners)
                if dash:
                    dash.update()
                print(f"  Aufnahme {writer.count}" + ("" if corners else "  [WARN: keine Marker -> ohne Geometrie]"))
            return True
        if line == "undo":
            try:
                gs.undo()
                writer.undo()
                if dash:
                    dash.update()
                print("  zurückgenommen")
            except IndexError:
                print("  nichts zurückzunehmen")
            return True
        if line.startswith("fen "):
            try:
                gs.set_fen(line[4:].strip())
            except ValueError as e:
                print(f"  ungültige FEN: {e}")
            return True
        try:
            try:
                gs.push_san(line)
            except ValueError:
                gs.push_uci(line)
        except ValueError:
            print("  illegaler/ungültiger Zug — erneut versuchen.")
            return True
        f = grab()
        if f is not None:
            writer.capture(f, gs.ply(), gs.fen(), line)
            if dash:
                dash.update()
            print(f"  Aufnahme {writer.count}")
        return True

    try:
        if dash is None:
            # Kein Fenster -> einfacher blockierender Eingabe-Loop.
            while True:
                print(f"FEN: {gs.fen()}")
                try:
                    if not handle(input("> ")):
                        break
                except EOFError:
                    break
        else:
            # Mit Dashboard: stdin in einem Thread lesen, damit der Hauptthread das
            # OpenCV-Fenster fortlaufend pumpt (sonst friert es zwischen Eingaben ein).
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
            print("> Eingabe im Terminal; das Dashboard-Fenster bleibt aktiv (g dort = FEN kopieren).")
            while True:
                if (cv2.waitKey(50) & 0xFF) == ord("g"):
                    fen = dash.recommended_fen()
                    if fen:
                        print("  " + ("kopiert: " if copy_fn(fen) else "Empfehlung: ") + fen)
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
    print(f"[OK] Session {sid}: {writer.count} Aufnahmen -> {sdir}")
    return 0
