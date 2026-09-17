"""Labels gegen ein Modell pruefen, das die Aufnahme NIE gesehen hat — je Feld UND Ply-Fenster.

Der bisherige Audit las `model-reads.jsonl` — geschrieben von einem Modell, das auf den meisten
dieser Aufnahmen TRAINIERT hat. Eines, das seine eigenen Trainingslabels bestaetigt, ist kein
Zeuge; eines, das sie verfehlt, auch nicht (`VID_20260726_233432` e8: 232/234 `bR` gegen ein FEN,
das `bK` sagt — der gehaltene Fold liest 232/234 `bK`).

**Je FENSTER, nicht je Partie.** Ein Feld traegt ueber 99 Plies mehrere Figuren nacheinander; ueber
alles gemittelt verschwindet ein Fehler, der nur zwischen zwei Zuegen sitzt. `2026-09-06-21-29-35`
c2 stimmt in vier von fuenf Fenstern und liegt im fuenften 256 von 263 Mal daneben.

**Ein einzelner Zeuge irrt sich in 6 von 10 Faellen** (gemessen 2026-09-17 auf den sieben
Aufnahmen, die zwei Folds ausliessen). `--second` prueft gegen `model-reads.heldout2.jsonl` und
nennt je Fund, ob der zweite Fold zustimmt.

    uv run python scripts/heldout_label_audit.py --second
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from pathlib import Path

import chess

from chesslab.ioutil import read_jsonl
from chesslab.training.occlusion import PIECE_VISIBLE_MAX

REC = Path("data/recordings")
HELDOUT = "model-reads.heldout.jsonl"
SECOND = "model-reads.heldout2.jsonl"

_BOARDS: dict[str, chess.Board] = {}


def at(fen: str, square: str) -> str:
    board = _BOARDS.get(fen) or _BOARDS.setdefault(fen, chess.Board(fen))
    piece = board.piece_at(chess.parse_square(square))
    if piece is None:
        return "empty"
    return ("w" if piece.color else "b") + piece.symbol().upper()


def judged(session: Path) -> set[tuple[str, str]]:
    """Was ein Mensch schon entschieden hat — das braucht keinen Audit mehr."""
    out: set[tuple[str, str]] = set()
    for name in ("reviewed.jsonl", "corrections.jsonl"):
        for row in read_jsonl(session / name):
            out.add((str(row["frame"]), str(row["square"])))
    return out


class Session:
    """Die Aufnahme, so weit der Audit sie braucht: Ply und FEN je Frame."""

    def __init__(self, session: Path) -> None:
        rows = [r for r in read_jsonl(session / "log.jsonl") if r.get("fen")]
        self.dir = session
        self.fen = {Path(str(r["frame"])).stem: r["fen"] for r in rows}
        self.ply = {Path(str(r["frame"])).stem: int(r["ply"]) for r in rows}
        self.judged = judged(session)

    def windows(self, square: str) -> dict[int, tuple[int, int, str]]:
        """Ply -> (Fensterbeginn, Fensterende, Figur). Ein Fenster ist konstante FEN-Aussage."""
        per_ply = {}
        for stem, ply in self.ply.items():
            per_ply.setdefault(ply, at(self.fen[stem], square))
        out: dict[int, tuple[int, int, str]] = {}
        run: list[int] = []
        label = None
        for ply in sorted(per_ply):
            if per_ply[ply] != label:
                for p in run:
                    out[p] = (run[0], run[-1], label)  # type: ignore[assignment]
                run, label = [], per_ply[ply]
            run.append(ply)
        for p in run:
            out[p] = (run[0], run[-1], label)  # type: ignore[assignment]
        return out


def reads(session: Session, source: str) -> dict[tuple[str, int, int, str], Counter]:
    """Je (Feld, Fenster, Figur) die Lesungen des Modells — nur SICHTBARE Zellen."""
    cache: dict[str, dict[int, tuple[int, int, str]]] = {}
    votes: dict[tuple[str, int, int, str], Counter] = defaultdict(Counter)
    for row in read_jsonl(session.dir / source):
        probs = row.get("probs")
        if not probs:
            continue
        coverage = row.get("coverage")
        # `None` heisst NICHT gemessen (CLAUDE.md, "Coverage Matte Trap") — die Zelle zaehlt mit,
        # denn eine fehlende Matte ist kein Beleg fuer eine Hand.
        if coverage is not None and float(coverage) > PIECE_VISIBLE_MAX:
            continue
        stem, square = str(row.get("frame")), str(row.get("square"))
        ply = session.ply.get(stem)
        if ply is None:
            continue
        window = cache.setdefault(square, session.windows(square)).get(ply)
        if window is None:
            continue
        start, end, label = window
        votes[(square, start, end, label)][max(probs, key=probs.get)] += 1
    return votes


def open_cells(session: Session, source: str) -> Counter:
    """Wie viele Zellen eines Fensters noch KEIN menschliches Urteil tragen."""
    cache: dict[str, dict[int, tuple[int, int, str]]] = {}
    out: Counter = Counter()
    for row in read_jsonl(session.dir / source):
        if not row.get("probs"):
            continue
        stem, square = str(row.get("frame")), str(row.get("square"))
        ply = session.ply.get(stem)
        if ply is None or (stem, square) in session.judged:
            continue
        window = cache.setdefault(square, session.windows(square)).get(ply)
        if window is not None:
            out[(square, window[0], window[1], window[2])] += 1
    return out


def findings(session: Session, source: str, min_reads: int, min_share: float) -> list[tuple]:
    votes = reads(session, source)
    still_open = open_cells(session, source)
    out = []
    for key, tally in votes.items():
        total = sum(tally.values())
        read, hits = tally.most_common(1)[0]
        if total >= min_reads and read != key[3] and hits / total >= min_share:
            out.append((*key, read, total, hits / total, still_open[key]))
    return sorted(out, key=lambda r: -r[6])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--min-reads", type=int, default=8,
                    help="Darunter ist es Rauschen, kein Muster.")
    ap.add_argument("--min-share", type=float, default=0.7,
                    help="Darunter ist das Modell uneins — strittig, nicht falsch.")
    ap.add_argument("--second", action="store_true",
                    help=f"Gegen {SECOND} gegenpruefen, wo es sie gibt.")
    args = ap.parse_args()

    sessions = sorted(p for p in REC.iterdir() if (p / HELDOUT).exists())
    if not sessions:
        print(f"keine {HELDOUT} — erst `realgames model-read --out {HELDOUT}` fahren")
        return 1

    with_second = sum(1 for s in sessions if (s / SECOND).exists())
    note = f", davon {with_second} mit zweitem Zeugen" if args.second else ""
    print(f"{len(sessions)} Aufnahmen mit gehaltener Lesung{note}\n")
    header = f"{'Aufnahme':26s}{'Feld':>5}{'Ply':>10}{'FEN':>7}{'liest':>7}{'Zellen':>7}{'Anteil':>8}{'offen':>7}"
    print(header + ("  zweiter Zeuge" if args.second else ""))

    total = confirmed = 0
    for session_dir in sessions:
        session = Session(session_dir)
        second_votes = reads(session, SECOND) if args.second and (session_dir / SECOND).exists() else None
        for square, start, end, label, read, n, share, still_open in findings(
                session, HELDOUT, args.min_reads, args.min_share):
            total += 1
            verdict = ""
            if second_votes is not None:
                tally = second_votes.get((square, start, end, label))
                if not tally:
                    verdict = "  — keine Lesung"
                else:
                    agree = tally.get(label, 0) / sum(tally.values())
                    top = tally.most_common(1)[0][0]
                    if top == read:
                        verdict = f"  BESTAETIGT ({read}, FEN nur {agree * 100:.0f} %)"
                        confirmed += 1
                    else:
                        verdict = f"  widerlegt (liest {top}, FEN {agree * 100:.0f} %)"
            print(f"{session_dir.name:26s}{square:>5}{f'{start}-{end}':>10}{label:>7}{read:>7}"
                  f"{n:>7}{share * 100:>7.0f}%{still_open:>7}{verdict}")
    print(f"\n{total} Fenster mit systematischem Widerspruch."
          + (f" {confirmed} davon vom zweiten Fold bestaetigt." if args.second else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
