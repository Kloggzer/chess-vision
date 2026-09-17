"""Labels gegen ein Modell pruefen, das die Aufnahme NIE gesehen hat.

Der bisherige Audit las `model-reads.jsonl` — geschrieben von einem Modell, das auf den meisten
dieser Aufnahmen TRAINIERT hat. Eines, das seine eigenen Trainingslabels bestaetigt, ist kein
Zeuge; eines, das sie verfehlt, auch nicht. Gemessen 2026-09-17: `VID_20260726_233432` e8 las
232/234 `bR` gegen ein FEN, das `bK` sagt — der gehaltene Fold liest 232/234 `bK`. Der Fehler
lag am LESER.

`realgames model-read --out model-reads.heldout.jsonl` schreibt die ehrliche Fassung; welcher
Fold welche Aufnahme ausliess, steht in der `split`-Kopie seiner `config.json`.

Gemeldet werden nur SYSTEMATISCHE Widersprueche auf SICHTBAREN Zellen — eine Hand ueber dem Feld
macht das Modell nicht zum Zeugen, und ein einzelner Frame ist Rauschen.

    uv run python scripts/heldout_label_audit.py
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


def disagreements(session: Path, min_reads: int, min_share: float) -> list[tuple]:
    fen_of = {Path(str(r["frame"])).stem: r["fen"]
              for r in read_jsonl(session / "log.jsonl") if r.get("fen")}
    seen = judged(session)
    votes: dict[tuple[str, str], Counter] = defaultdict(Counter)
    open_cells: Counter = Counter()
    for row in read_jsonl(session / HELDOUT):
        probs = row.get("probs")
        if not probs:
            continue
        coverage = row.get("coverage")
        # `None` heisst NICHT gemessen (CLAUDE.md, "Coverage Matte Trap") — dann zaehlt die Zelle
        # weiter mit, denn eine fehlende Matte ist kein Beleg fuer eine Hand.
        if coverage is not None and float(coverage) > PIECE_VISIBLE_MAX:
            continue
        stem, square = str(row.get("frame")), str(row.get("square"))
        fen = fen_of.get(stem)
        if fen is None:
            continue
        label = at(fen, square)
        votes[(square, label)][max(probs, key=probs.get)] += 1
        if (stem, square) not in seen:
            open_cells[(square, label)] += 1

    out = []
    for (square, label), tally in votes.items():
        total = sum(tally.values())
        read, hits = tally.most_common(1)[0]
        if total >= min_reads and read != label and hits / total >= min_share:
            out.append((square, label, read, total, hits / total, open_cells[(square, label)]))
    return sorted(out, key=lambda r: -r[3])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--min-reads", type=int, default=8,
                    help="Darunter ist es Rauschen, kein Muster.")
    ap.add_argument("--min-share", type=float, default=0.7,
                    help="Darunter ist das Modell uneins — strittig, nicht falsch.")
    args = ap.parse_args()

    sessions = sorted(p for p in REC.iterdir() if (p / HELDOUT).exists())
    if not sessions:
        print(f"keine {HELDOUT} — erst `realgames model-read --out {HELDOUT}` fahren")
        return 1

    print(f"{len(sessions)} Aufnahmen mit gehaltener Lesung\n")
    print(f"{'Aufnahme':26s}{'Feld':>5}{'FEN':>7}{'liest':>7}{'Zellen':>8}{'Anteil':>8}{'offen':>7}")
    rows = 0
    for session in sessions:
        for square, label, read, total, share, open_n in disagreements(
                session, args.min_reads, args.min_share):
            rows += 1
            print(f"{session.name:26s}{square:>5}{label:>7}{read:>7}{total:>8}"
                  f"{share * 100:>7.0f}%{open_n:>7}")
    print(f"\n{rows} systematische Widersprueche. `offen` = noch ohne menschliches Urteil.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
