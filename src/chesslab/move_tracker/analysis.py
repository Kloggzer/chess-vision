"""Optional Stockfish analysis for the move-tracker web view: an evaluation (win-chance) bar
and the top recommended moves for the CURRENT reconstructed position.

Runs a single persistent UCI engine on a background thread. It polls the tracker's current FEN
(via a provider callback), and whenever the position changes it re-analyses a FRESH board built
from that FEN — never the tracker's live board object, so there is no shared-mutation race. The
latest result is exposed thread-safely via `get()`. If no engine is found the feature disables
itself cleanly (the UI just hides the bar)."""

from __future__ import annotations

import logging
import math
import threading
import time

log = logging.getLogger("chesslab.move_tracker.analysis")


def win_chance_white(cp: int) -> float:
    """White win-expectancy (0..100 %) from a centipawn score, Lichess' logistic mapping."""
    return 50.0 + 50.0 * (2.0 / (1.0 + math.exp(-0.00368208 * cp)) - 1.0)


class StockfishAnalyzer:
    """Persistent background engine that keeps an up-to-date analysis of the current position.

    fen_provider() must return the current FEN string (or None when the tracker isn't running).
    `multipv` best lines are reported; `movetime_s` bounds per-position latency."""

    def __init__(self, fen_provider, engine_path: str, multipv: int = 3,
                 movetime_s: float = 0.4, threads: int = 2, hash_mb: int = 64) -> None:
        self._fen_provider = fen_provider
        self._engine_path = engine_path
        self._multipv = multipv
        self._movetime_s = movetime_s
        self._threads = threads
        self._hash_mb = hash_mb
        self._engine = None
        self._lock = threading.Lock()
        self._result: dict | None = None      # latest analysis (see _analyse)
        self._running = False
        self._failed = False
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._running or self._failed:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._thread is not None and self._thread.is_alive():
            self._thread.join(timeout=2)
        with self._lock:
            eng, self._engine = self._engine, None
        if eng is not None:
            try:
                eng.quit()
            except Exception:  # noqa: BLE001
                pass

    def get(self) -> dict | None:
        with self._lock:
            return None if self._result is None else dict(self._result)

    def _ensure_engine(self):
        if self._engine is not None:
            return self._engine
        import chess.engine
        self._engine = chess.engine.SimpleEngine.popen_uci(self._engine_path)
        try:
            self._engine.configure({"Threads": self._threads, "Hash": self._hash_mb})
        except Exception:  # noqa: BLE001 — options are best-effort
            pass
        return self._engine

    def _analyse(self, fen: str) -> dict:
        import chess.engine
        board = chess.Board(fen)                       # fresh board — no shared mutation
        result = {"fen": fen, "game_over": board.is_game_over(),
                  "turn": "white" if board.turn == chess.WHITE else "black"}
        if board.is_game_over():
            result.update(cp=None, mate=None, win_white=None, lines=[], depth=0)
            return result
        eng = self._ensure_engine()
        infos = eng.analyse(board, chess.engine.Limit(time=self._movetime_s),
                            multipv=self._multipv)
        lines = []
        for pv in infos:
            score = pv["score"].white()
            mv = pv["pv"][0] if pv.get("pv") else None
            lines.append({
                "uci": mv.uci() if mv else None,
                "san": board.san(mv) if mv else None,
                "cp": score.score(),                    # None if mate
                "mate": score.mate(),                   # None if not mate
            })
        best = lines[0] if lines else {"cp": 0, "mate": None}
        cp, mate = best.get("cp"), best.get("mate")
        if mate is not None:
            win_white = 100.0 if mate > 0 else 0.0
        elif cp is not None:
            win_white = win_chance_white(cp)
        else:
            win_white = 50.0
        result.update(cp=cp, mate=mate, win_white=round(win_white, 1),
                      lines=lines, depth=infos[0].get("depth") if infos else 0)
        return result

    def _loop(self) -> None:
        last_fen = None
        try:
            while self._running:
                fen = None
                try:
                    fen = self._fen_provider()
                except Exception:  # noqa: BLE001 — torn read while the board mutates; retry
                    fen = None
                if not fen or fen == last_fen:
                    time.sleep(0.2)
                    continue
                try:
                    res = self._analyse(fen)
                    last_fen = fen
                    with self._lock:
                        self._result = res
                except Exception as e:  # noqa: BLE001 — one bad analysis shouldn't kill the loop
                    log.warning("stockfish analysis failed: %s", e)
                    # Engine may be wedged → drop it so the next tick relaunches.
                    with self._lock:
                        eng, self._engine = self._engine, None
                    if eng is not None:
                        try:
                            eng.quit()
                        except Exception:  # noqa: BLE001
                            pass
                    time.sleep(0.5)
        finally:
            with self._lock:
                eng, self._engine = self._engine, None
            if eng is not None:
                try:
                    eng.quit()
                except Exception:  # noqa: BLE001
                    pass
