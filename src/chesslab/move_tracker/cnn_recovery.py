"""CNN-assisted occupancy recovery for the Move-Tracker (specs/rework/09-cnn-recovery.md).

No full-FEN resync: The CNN only provides **occupancy** per square (empty / occupied /
occluded) — piece identity is known to the tracker from the move history. This lets it
(a) find the move whose resulting occupancy best explains the observation when frame-diff
detection is stuck (structurally covers captures, castling, en passant), and
(b) periodically check whether the believed state and the board still match.

Runs entirely through the serving facade (`chesslab.serving`) — no own crop/preprocessing
logic is created here. torch stays unimported until actually observed.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import chess

from .. import config

log = logging.getLogger("chesslab.move_tracker")

_FILES = "abcdefgh"
_ALL = [f"{f}{r}" for r in range(1, 9) for f in _FILES]


@dataclass(frozen=True)
class OccupancyObservation:
    """CNN view of the board. Carries occupancy (p_occupied/empty/occluded) AND — when
    available — the full piece identity per square (`label` = predicted class,
    `conf` = top-class confidence). Occupancy is derived from identity; identity
    makes it possible to distinguish captures/promotions/"which piece moved" and to
    reliably separate shadows (identity unchanged) from real moves."""

    p_occ: dict[str, float]
    p_empty: dict[str, float]
    p_occluded: dict[str, float]
    label: dict[str, str] | None = None       # predicted class per square (e.g. 'wP','bK','empty')
    conf: dict[str, float] | None = None       # top-class confidence per square

    def occupied(self, sq: str) -> bool:
        return self.p_occ[sq] > self.p_empty[sq]

    def confident(self, thr: float) -> dict[str, bool]:
        """Squares whose occupancy statement is reliable. IMPORTANT: occluded-dominant squares
        are NEVER confident and NEVER count as occupied — a hand over the board must neither
        trigger recovery nor "occupy" squares."""
        return {sq: (max(self.p_occ[sq], self.p_empty[sq]) >= thr
                     and self.p_occluded[sq] < (1.0 - thr))
                for sq in self.p_occ}

    def label_confident(self, thr: float) -> dict[str, bool]:
        """Squares whose IDENTITY statement is reliable: top confidence ≥ thr and not
        `occluded` (hand/covering). Empty when the run provides no identity."""
        if self.label is None or self.conf is None:
            return dict.fromkeys(self.p_occ, False)
        return {sq: (self.conf[sq] >= thr and self.label[sq] != "occluded")
                for sq in self.label}


def observation_from_probs(per_square_probs: dict[str, list[float]],
                           classes: list[str]) -> OccupancyObservation:
    """Full softmax per square → occupancy + identity. Class indices ALWAYS derived from the
    `classes` list of the run config (13- and 14-class runs, never guess positions)."""
    i_empty = classes.index("empty")
    i_occl = classes.index("occluded") if "occluded" in classes else None
    p_occ: dict[str, float] = {}
    p_empty: dict[str, float] = {}
    p_occluded: dict[str, float] = {}
    label: dict[str, str] = {}
    conf: dict[str, float] = {}
    for sq, probs in per_square_probs.items():
        pe = float(probs[i_empty])
        po = float(probs[i_occl]) if i_occl is not None else 0.0
        p_empty[sq] = pe
        p_occluded[sq] = po
        p_occ[sq] = max(0.0, 1.0 - pe - po)     # sum of the 12 piece classes
        top = max(range(len(probs)), key=lambda i: probs[i])   # identity = argmax class
        label[sq] = classes[top]
        conf[sq] = float(probs[top])
    return OccupancyObservation(p_occ=p_occ, p_empty=p_empty, p_occluded=p_occluded,
                                label=label, conf=conf)


def _move_touched_squares(board: chess.Board, move: chess.Move) -> set[str]:
    """Squares physically changed by a move: from, to, + rook on castling, + captured
    pawn on en passant. (Mirrors tracker.move_touched_squares, without circular import.)"""
    sqs = {chess.square_name(move.from_square), chess.square_name(move.to_square)}
    if board.is_castling(move):
        rank = chess.square_rank(move.from_square)
        if chess.square_file(move.to_square) > chess.square_file(move.from_square):
            sqs |= {chess.square_name(chess.square(7, rank)), chess.square_name(chess.square(5, rank))}
        else:
            sqs |= {chess.square_name(chess.square(0, rank)), chess.square_name(chess.square(3, rank))}
    if board.is_en_passant(move):
        sqs.add(chess.square_name(chess.square(chess.square_file(move.to_square),
                                               chess.square_rank(move.from_square))))
    return sqs


def expected_occupancy(board: chess.Board) -> dict[str, bool]:
    """Occupancy per square as expected from the game state."""
    return {sq: board.piece_at(chess.parse_square(sq)) is not None for sq in _ALL}


def expected_labels(board: chess.Board) -> dict[str, str]:
    """Expected piece class per square according to the game state ('wP','bK','empty', …) in
    model vocabulary (uses `config.label_from_piece`)."""
    out: dict[str, str] = {}
    for sq in _ALL:
        piece = board.piece_at(chess.parse_square(sq))
        out[sq] = config.label_from_piece(piece.symbol() if piece else None)
    return out


class CnnRecovery:
    """Observes the board via CNN (occupancy) and suggests moves or conflicts.

    `observe` is the expensive step (~100–300 ms CPU) and must NEVER run under the tracker lock.
    `score_moves`/`resync_check` are pure evaluations on the observation.
    """

    def __init__(self, run_dir: Path, profile, device: str = "cpu",
                 conf_thr: float = 0.85, min_agreement: float = 0.97,
                 margin_squares: int = 1, min_confident_board: int = 32,
                 min_confident_recovery: int = 8) -> None:
        self.run_dir = Path(run_dir)
        self.profile = profile
        self.device = device
        self.conf_thr = conf_thr
        self.min_agreement = min_agreement       # best move must explain this many confident squares
        # Margin in SQUARES, not a fraction: a capture differs from a non-capture
        # at the occupancy level by exactly ONE square (only the from-square empties; the target
        # was already occupied) — a fractional margin would falsely discard captures as ambiguous.
        # margin_squares=1: strictly better is enough; 0 squares difference (promotion variants) ⇒ None.
        self.margin_squares = margin_squares
        # min_confident SPLIT (Spec 10, part 6): the whole-board match may only update the reference
        # with plenty of clear sight (otherwise re-anchor against a covered board);
        # the recovery, on the other hand, must remain operable even under partial occlusion.
        self.min_confident_board = min_confident_board
        self.min_confident_recovery = min_confident_recovery
        self._classes: list[str] | None = None   # lazy from run_spec (once, not per observe)
        if not (self.run_dir / "config.json").exists():
            raise FileNotFoundError(f"Model run not found: {self.run_dir}")

    # -- Observation (torch, expensive — never under lock) --
    def observe(self, frame, corners) -> OccupancyObservation:
        from .. import serving  # lazy: torch stays out as long as not observed

        preds = serving.predict_frame(self.run_dir, frame, corners, self.profile,
                                      device=self.device, return_probs=True)
        if self._classes is None:
            self._classes = serving.run_spec(self.run_dir).classes
        return observation_from_probs({p["square"]: p["probs"] for p in preds}, self._classes)

    # -- Pure evaluation --
    def score_moves(self, board: chess.Board,
                    obs: OccupancyObservation) -> tuple[chess.Move | None, float, float]:
        """For each legal move: push board copy → expected occupancy → agreement
        with the observation over the confident squares. (None, best, second) when nothing
        is clear enough (min_agreement / margin / too few confident squares)."""
        conf = obs.confident(self.conf_thr)
        conf_squares = [sq for sq, ok in conf.items() if ok]
        n = len(conf_squares)
        if n < self.min_confident_recovery:
            return None, 0.0, 0.0
        best_mv, best_hits, second_hits = None, -1, -1
        for mv in board.legal_moves:
            b2 = board.copy(stack=False)
            b2.push(mv)
            hits = sum(1 for sq in conf_squares
                       if obs.occupied(sq) == (b2.piece_at(chess.parse_square(sq)) is not None))
            if hits > best_hits:
                best_hits, second_hits, best_mv = hits, best_hits, mv
            elif hits > second_hits:
                second_hits = hits
        best = best_hits / n if best_hits >= 0 else 0.0
        second = second_hits / n if second_hits >= 0 else 0.0
        if best_mv is None or best < self.min_agreement \
           or (best_hits - second_hits) < self.margin_squares:
            # margin in squares: promotion variants (e7e8q vs. e7e8r) are occupancy-identical
            # (0 squares difference) → intentionally None (user hint instead of guessing).
            return None, best, second
        return best_mv, best, second

    def verify_move(self, board: chess.Board, move: chess.Move,
                    obs: OccupancyObservation) -> tuple[float, int]:
        """Pre-commit check of a concrete candidate move — LOCAL instead of whole-board:
        Only the occupancy of squares physically changed by the move counts (from becomes empty,
        to becomes occupied; + rook on castling, + captured pawn on en passant). This is exactly
        the definition of a move and is robust against shadows/occlusion on the rest of the board.

        Returns (agreement, n): fraction of touched & confident squares whose observed
        occupancy matches the position AFTER the move. Both endpoints must be confident —
        if, e.g., the target square is still covered by a hand, the move is (still) considered
        unconfirmed (agreement 0.0), and the multi-frame check waits for a clear view."""
        conf = obs.confident(self.conf_thr)
        touched = _move_touched_squares(board, move)
        b2 = board.copy(stack=False)
        b2.push(move)
        checked = [sq for sq in touched if conf.get(sq)]
        if len(checked) < 2:                      # at least FROM and TO squares must be reliable
            return 0.0, len(checked)
        hits = sum(1 for sq in checked
                   if obs.occupied(sq) == (b2.piece_at(chess.parse_square(sq)) is not None))
        return hits / len(checked), len(checked)

    # -- Identity-based evaluation (uses per-square pred_label, not just occupied/empty) --
    @staticmethod
    def _label_at(board: chess.Board, sq: str) -> str:
        piece = board.piece_at(chess.parse_square(sq))
        return config.label_from_piece(piece.symbol() if piece else None)

    def board_matches_identity(self, board: chess.Board, obs: OccupancyObservation) -> dict:
        """Does the CNN see the SAME pieces on all confident squares as believed?
        The reliable "no move / shadow" detector: a shadow changes no identity.
        {match, conflicts, n, inconclusive}. Too few confident squares → inconclusive."""
        lc = obs.label_confident(self.conf_thr)
        exp = expected_labels(board)
        checked = [sq for sq in _ALL if lc.get(sq)]
        if len(checked) < self.min_confident_board:
            return {"match": False, "conflicts": [], "n": len(checked), "inconclusive": True}
        conflicts = [sq for sq in checked if obs.label[sq] != exp[sq]]
        return {"match": not conflicts, "conflicts": conflicts,
                "n": len(checked), "inconclusive": False}

    def derive_moves_identity(self, board: chess.Board, obs: OccupancyObservation,
                              max_plies: int = 1) -> tuple[list[chess.Move], float, float]:
        """Choose the legal move SEQUENCE (1 or — with max_plies=2 — 2 half-moves) whose
        resulting identities best match the CNN observation. Single moves are preferred;
        move pairs rescue the case "reply came before commit" (blitz). The order in a
        pair is fixed by side-to-move (first the side to move, then the reply) —
        no order ambiguity. ~35×35 ≈ 1200 pair candidates are pure evaluation, not critical.

        Returns ([], best, second) when nothing is clear enough (min_agreement /
        margin_squares / too few confident squares)."""
        lc = obs.label_confident(self.conf_thr)
        conf_squares = [sq for sq, ok in lc.items() if ok]
        n = len(conf_squares)
        if n < self.min_confident_recovery:
            return [], 0.0, 0.0

        def _hits(b: chess.Board) -> int:
            return sum(1 for sq in conf_squares if obs.label[sq] == self._label_at(b, sq))

        def _pick(candidates) -> tuple[list[chess.Move], int, int]:
            best_seq, best_hits, second_hits = [], -1, -1
            for seq, b in candidates:
                h = _hits(b)
                if h > best_hits:
                    best_hits, second_hits, best_seq = h, best_hits, seq
                elif h > second_hits:
                    second_hits = h
            return best_seq, best_hits, second_hits

        singles = []
        for mv in board.legal_moves:
            b2 = board.copy(stack=False)
            b2.push(mv)
            singles.append(([mv], b2))
        seq, best_hits, second_hits = _pick(singles)
        best = best_hits / n if best_hits >= 0 else 0.0
        second = second_hits / n if second_hits >= 0 else 0.0
        if seq and best >= self.min_agreement and (best_hits - second_hits) >= self.margin_squares:
            return seq, best, second

        if max_plies >= 2:
            pairs = []
            for mv1, b2 in ((s[0][0], s[1]) for s in singles):
                for mv2 in b2.legal_moves:
                    b3 = b2.copy(stack=False)
                    b3.push(mv2)
                    pairs.append(([mv1, mv2], b3))
            pseq, p_hits, p_second = _pick(pairs)
            p_best = p_hits / n if p_hits >= 0 else 0.0
            # The pair must be unambiguous: margin against the second-best pair AND against the
            # best single move (otherwise the single move would be the more parsimonious explanation).
            if pseq and p_best >= self.min_agreement \
               and (p_hits - max(p_second, best_hits)) >= self.margin_squares:
                return pseq, p_best, max(p_second, best_hits) / n
        return [], best, second

    def derive_moves_deep(self, board: chess.Board, obs: OccupancyObservation,
                          max_plies: int = 4, beam: int = 8) -> tuple[list[chess.Move], float, float]:
        """Conflict-guided beam search over up to `max_plies` half-moves — recovery from
        DEEPER desyncs than the 2-ply full enumeration can reach (a stuck tracker while
        play continues is 3-4 half-moves behind within seconds). Only moves that touch at
        least one square where the observation contradicts the current hypothesis are
        expanded (~5-20 per state instead of ~35), so 4 plies stay a few hundred boards.

        Works on piece IDENTITY when the observation provides labels, else on occupancy.
        Acceptance mirrors `derive_moves_identity`: agreement >= min_agreement AND a
        margin of `margin_squares` hits against the second-best DISTINCT final position;
        among equal explanations the SHORTEST sequence wins (parsimony).
        Returns ([], best, second) when nothing is clear enough."""
        use_labels = getattr(obs, "label", None) is not None
        if use_labels:
            lc = obs.label_confident(self.conf_thr)
            conf_squares = [sq for sq, ok in lc.items() if ok]
            target = {sq: obs.label[sq] for sq in conf_squares}

            def _value(b: chess.Board, sq: str):
                return self._label_at(b, sq)
        else:
            conf = obs.confident(self.conf_thr)
            conf_squares = [sq for sq, ok in conf.items() if ok]
            target = {sq: obs.occupied(sq) for sq in conf_squares}

            def _value(b: chess.Board, sq: str):
                return b.piece_at(chess.parse_square(sq)) is not None
        n = len(conf_squares)
        if n < self.min_confident_recovery:
            return [], 0.0, 0.0

        def _conflicts(b: chess.Board) -> set[str]:
            return {sq for sq in conf_squares if target[sq] != _value(b, sq)}

        # Terminal candidates grouped by final position (transpositions are one hypothesis).
        finals: dict[str, tuple[int, list[chess.Move]]] = {}

        def _note(seq: list[chess.Move], b: chess.Board, n_conf: int) -> None:
            h = n - n_conf
            # Key by PLACEMENT only: the camera cannot see whose turn it is, so a longer
            # transposition to the same placement is the same hypothesis (the shortest
            # sequence wins) — not a rival that would destroy the acceptance margin.
            key = b.board_fen()
            prev = finals.get(key)
            if prev is None or h > prev[0] or (h == prev[0] and len(seq) < len(prev[1])):
                finals[key] = (h, seq)

        states = [([], board, _conflicts(board))]
        _note([], board, len(states[0][2]))
        for _ in range(max_plies):
            nxt: list[tuple[list[chess.Move], chess.Board, set[str]]] = []
            for seq, b, confl in states:
                if not confl:
                    continue                      # already fully explained → no deeper search
                for mv in b.legal_moves:
                    if not (_move_touched_squares(b, mv) & confl):
                        continue                  # touches no conflicting square → fixes nothing
                    b2 = b.copy(stack=False)
                    b2.push(mv)
                    c2 = _conflicts(b2)
                    nxt.append((seq + [mv], b2, c2))
                    _note(seq + [mv], b2, len(c2))
            if not nxt:
                break
            nxt.sort(key=lambda t: (len(t[2]), len(t[0])))
            states = nxt[:beam]

        ranked = sorted(finals.values(), key=lambda t: (-t[0], len(t[1])))
        best_hits, best_seq = ranked[0]
        second_hits = ranked[1][0] if len(ranked) > 1 else -1
        best = best_hits / n
        second = max(0.0, second_hits / n)
        if (best_seq and best >= self.min_agreement
                and (best_hits - max(second_hits, 0)) >= self.margin_squares):
            return best_seq, best, second
        return [], best, second

    def derive_move_identity(self, board: chess.Board,
                             obs: OccupancyObservation) -> tuple[chess.Move | None, float, float]:
        """1-ply wrapper around `derive_moves_identity` (pre-commit verify needs exactly one move).
        Resolves capture (target identity), "which piece" and promotion (promo piece from the
        target label). (None, best, second) when not clear enough."""
        seq, best, second = self.derive_moves_identity(board, obs, max_plies=1)
        return (seq[0] if seq else None), best, second

    def verify_move_identity(self, board: chess.Board, move: chess.Move,
                             obs: OccupancyObservation) -> tuple[float, int]:
        """Pre-commit check of a candidate move via the IDENTITY of the touched squares
        (from is vacated/empty, to carries the expected piece; + rook/en-passant). Both
        endpoints must be confident, otherwise (still) unconfirmed (0.0)."""
        lc = obs.label_confident(self.conf_thr)
        touched = _move_touched_squares(board, move)
        b2 = board.copy(stack=False)
        b2.push(move)
        checked = [sq for sq in touched if lc.get(sq)]
        if len(checked) < 2:
            return 0.0, len(checked)
        hits = sum(1 for sq in checked if obs.label[sq] == self._label_at(b2, sq))
        return hits / len(checked), len(checked)

    def resync_check(self, board: chess.Board, obs: OccupancyObservation) -> dict:
        """Diff believed vs. observed occupancy (confident squares only).

        {"match": bool, "conflicts": [squares], "move": uci|None, "agreement": float}
        — `move` only if exactly one legal move sufficiently explains the observation."""
        conf = obs.confident(self.conf_thr)
        believed = expected_occupancy(board)
        conflicts = [sq for sq in _ALL if conf.get(sq) and obs.occupied(sq) != believed[sq]]
        if not conflicts:
            return {"match": True, "conflicts": [], "move": None, "agreement": 1.0}
        mv, best, _second = self.score_moves(board, obs)
        return {"match": False, "conflicts": conflicts,
                "move": mv.uci() if mv else None, "agreement": max(best, 0.0)}


def has_occupancy_conflict(board: chess.Board, obs: OccupancyObservation,
                           conf_thr: float, conflicts) -> bool:
    """True when at least one conflict square disagrees on OCCUPANCY (expected empty vs
    observed occupied or vice versa) on the model's reliable empty axis. Identity-only
    conflicts (right occupancy, wrong piece type — the known N/B/R gap, ~40% identity
    precision) are almost always CNN error, never evidence of an illegal move."""
    if obs.label is None:
        return False
    exp = expected_labels(board)
    lc = obs.label_confident(conf_thr)
    return any(lc.get(sq) and (exp[sq] == "empty") != (obs.label[sq] == "empty")
               for sq in conflicts)


def guess_illegal_move(board: chess.Board, obs: OccupancyObservation,
                       conf_thr: float) -> str | None:
    """Among label-confident conflict squares: exactly one square X whose
    expected piece P is now observed empty, and exactly one square Y observed
    to hold P where the game state expects something else -> "X->Y" (uci-like
    string, no legality implied). Any other pattern -> None."""
    exp = expected_labels(board)
    lc = obs.label_confident(conf_thr)
    confident = {sq for sq, ok in lc.items() if ok}
    if obs.label is None or obs.conf is None:
        return None
    # Find squares where label is confidently observed AND differs from expected
    conflict = {sq for sq in confident if obs.label[sq] != exp[sq]}
    if not conflict:
        return None
    # Among conflicts: find squares observed empty where expected non-empty (source)
    # and squares observed holding a piece where expected empty (destination)
    sources = [sq for sq in conflict
               if obs.label[sq] == "empty" and exp[sq] != "empty"]
    destinations = [sq for sq in conflict
                    if obs.label[sq] != "empty" and exp[sq] == "empty"]
    if len(sources) == 1 and len(destinations) == 1:
        return f"{sources[0]}{destinations[0]}"
    return None
