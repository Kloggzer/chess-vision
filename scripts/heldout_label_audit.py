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
from dataclasses import dataclass
from pathlib import Path

import chess

from chesslab.ioutil import read_jsonl
from chesslab.labeling import read_matte as coverage_of
from chesslab.training.occlusion import PIECE_VISIBLE_MAX

REC = Path("data/recordings")
HELDOUT = "model-reads.heldout.jsonl"
SECOND = "model-reads.heldout2.jsonl"

_BOARDS: dict[str, chess.Board] = {}
_STEPS: dict[int, dict[int, list]] = {}


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
        self.coverage = coverage_of(session)
        self._fens: dict[int, str] | None = None

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


@dataclass(frozen=True)
class Station:
    """Eine Station einer Figur: dieses Feld, von diesem bis zu jenem Ply."""

    square: str
    first: int
    last: int


def _pieces(fen: str) -> dict[str, str]:
    board = _BOARDS.get(fen) or _BOARDS.setdefault(fen, chess.Board(fen))
    return {chess.square_name(sq): ("w" if p.color else "b") + p.symbol().upper()
            for sq, p in board.piece_map().items()}


def moves_between(before: str, after: str) -> list[tuple[str, str, str]]:
    """(Figur, von, nach) aus dem UNTERSCHIED zweier Stellungen. Bei einer Schlagung ist die GEHENDE
    Figur gesucht, sonst endet die Spur bei der geschlagenen.
    """
    a, b = _pieces(before), _pieces(after)
    left = {sq: what for sq, what in a.items() if b.get(sq) != what}
    arrived = {sq: what for sq, what in b.items() if a.get(sq) != what}
    out = []
    for to_sq, what in arrived.items():
        for from_sq, gone in left.items():
            if gone == what and from_sq != to_sq:
                out.append((what, from_sq, to_sq))
                left.pop(from_sq)
                break
    return out


def trace_path(fens: dict[int, str], at_ply: int, square: str) -> list[Station]:
    """Alle Stationen DER Figur, die zum Ply `at_ply` auf `square` steht: die Schwelle je Fenster
    findet nur den Anfang einer Kette.
    """
    plies = sorted(fens)
    if at_ply not in fens:
        return []
    # Gemerkt je Stellungsfolge: die Zuege aendern sich nicht.
    key = id(fens)
    steps = _STEPS.get(key)
    if steps is None:
        steps = {now: moves_between(fens[prev], fens[now])
                 for prev, now in zip(plies, plies[1:], strict=False)}
        _STEPS[key] = steps

    here, out = square, []
    start = plies[0]
    # Rueckwaerts bis zum ersten Ply, vorwaerts bis zum letzten — eine Figur hat beide Enden.
    for ply in [p for p in plies if p <= at_ply][::-1]:
        for _what, from_sq, to_sq in steps.get(ply, ()):
            if to_sq == here:
                out.append(Station(here, ply, 0))
                here, start = from_sq, plies[0]
                break
    out.append(Station(here, start, 0))
    out.reverse()

    here = square
    for ply in [p for p in plies if p > at_ply]:
        for _what, from_sq, to_sq in steps.get(ply, ()):
            if from_sq == here:
                out.append(Station(to_sq, ply, 0))
                here = to_sq
                break

    fixed = []
    for i, station in enumerate(out):
        last = out[i + 1].first - 1 if i + 1 < len(out) else plies[-1]
        fixed.append(Station(station.square, station.first, last))
    return fixed


def inventory_gap(fen_counts: dict[str, int], read_counts: dict[str, int]) -> dict[str, int]:
    """Figuren, die das BRETT zeigt und der Mitschnitt nicht mehr fuehrt. Die Gegenrichtung ist kein
    Befund: fehlende Figuren stehen meist unter einer Hand.
    """
    return {what: n - fen_counts.get(what, 0)
            for what, n in read_counts.items() if n > fen_counts.get(what, 0)}


def station_disagrees(shares: dict[str, float], label: str, min_share: float) -> bool:
    """Widerspricht diese Station? Die Spur SENKT die Schwelle, sie schafft sie nicht ab."""
    if not shares:
        return False
    top = max(shares, key=lambda k: shares[k])
    return top != label and shares[top] >= min_share


def covered(cov: dict[str, dict[str, float]], stem: str, square: str) -> bool:
    """Liegt eine Hand darauf? Ohne Messung lautet die Antwort NEIN."""
    return float((cov.get(stem) or {}).get(square, 0.0)) > PIECE_VISIBLE_MAX


def reads(session: Session, source: str) -> dict[tuple[str, int, int, str], Counter]:
    """Je (Feld, Fenster, Figur) die Lesungen des Modells — nur SICHTBARE Zellen."""
    cache: dict[str, dict[int, tuple[int, int, str]]] = {}
    votes: dict[tuple[str, int, int, str], Counter] = defaultdict(Counter)
    for row in read_jsonl(session.dir / source):
        probs = row.get("probs")
        if not probs:
            continue
        stem, square = str(row.get("frame")), str(row.get("square"))
        # Die Coverage steht in `matte.jsonl`, NICHT in der Lesung: dort war sie immer `None`, und
        # der Filter griff nie.
        if covered(session.coverage, stem, square):
            continue
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



def fens_by_ply(session: Session) -> dict[int, str]:
    """Dasselbe Objekt je Aufnahme — `trace_path` merkt sich die Zuege daran."""
    if getattr(session, "_fens", None) is not None:
        return session._fens
    out: dict[int, str] = {}
    for stem, ply in session.ply.items():
        out.setdefault(ply, session.fen[stem])
    session._fens = out
    return out


def shares_at(votes: dict, square: str, first: int, last: int) -> tuple[dict[str, float], str, int]:
    """Die Lesungen auf einer STATION — sie kann mehrere Fenster schneiden."""
    tally: Counter = Counter()
    label = ""
    for key, counted in votes.items():
        if key[0] != square or key[2] < first or key[1] > last:
            continue
        tally.update(counted)
        label = key[3]
    total = sum(tally.values())
    if not total:
        return {}, label, 0
    return {k: v / total for k, v in tally.items()}, label, total


def follow(session: Session, votes: dict, square: str, ply: int,
           min_share: float) -> list[tuple[str, int, int, str, str, int, float]]:
    """Stufe 2: die SPUR der Figur, Station fuer Station, mit gesenkter Schwelle."""
    out = []
    for station in trace_path(fens_by_ply(session), ply, square):
        shares, label, total = shares_at(votes, station.square, station.first, station.last)
        if total and station_disagrees(shares, label, min_share):
            top = max(shares, key=lambda k: shares[k])
            out.append((station.square, station.first, station.last, label, top, total, shares[top]))
    return out


def phantom_reads(votes: dict, min_reads: int, min_share: float) -> dict[int, dict[str, int]]:
    """Je Ply die Figuren auf einem BELEGTEN Fenster, nur Fenster ueber der Schwelle — jede Mehrheit
    zu zaehlen schlug fast ueberall an.
    """
    out: dict[int, dict[str, int]] = {}
    for (_square, first, last, label), counted in votes.items():
        total = sum(counted.values())
        top, hits = counted.most_common(1)[0]
        if top in ("empty", label) or total < min_reads or hits / total < min_share:
            continue
        for ply in range(first, last + 1):
            per = out.setdefault(ply, {})
            per[top] = per.get(top, 0) + 1
    return out


def inventory(session: Session, votes: dict, min_reads: int, min_share: float) -> dict[str, int]:
    """Stufe 3: Figuren, die das Brett zeigt und der Mitschnitt nicht mehr fuehrt; gemeldet wird das
    GROESSTE Defizit je Ply.
    """
    per_ply = phantom_reads(votes, min_reads, min_share)
    worst: dict[str, int] = {}
    for ply, fen in fens_by_ply(session).items():
        seen = per_ply.get(ply)
        if not seen:
            continue
        for what, n in inventory_gap(dict(Counter(_pieces(fen).values())), seen).items():
            worst[what] = max(worst.get(what, 0), n)
    return worst


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--min-reads", type=int, default=8,
                    help="Darunter ist es Rauschen, kein Muster.")
    ap.add_argument("--min-share", type=float, default=0.7,
                    help="Darunter ist das Modell uneins — strittig, nicht falsch.")
    ap.add_argument("--follow-share", type=float, default=0.55,
                    help="Schwelle auf der SPUR einer auffaelligen Figur — niedriger, weil der "
                         "Fund schon steht und nur sein Ende gesucht wird.")
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

    total = confirmed = traced = missing = 0
    for session_dir in sessions:
        session = Session(session_dir)
        first_votes = reads(session, HELDOUT)
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
            for st_sq, st_a, st_b, st_lab, st_read, st_n, st_share in follow(
                    session, first_votes, square, start, args.follow_share):
                if (st_sq, st_a, st_b) == (square, start, end):
                    continue
                traced += 1
                print(f"{'  -> Spur':26s}{st_sq:>5}{f'{st_a}-{st_b}':>10}{st_lab:>7}{st_read:>7}"
                      f"{st_n:>7}{st_share * 100:>7.0f}%{'':>7}")
        gap = inventory(session, first_votes, args.min_reads, args.min_share)
        if gap:
            names = ", ".join(f"{what} x{n}" for what, n in sorted(gap.items()))
            print(f"{'  !! Bestand':26s}das Brett zeigt {names}, "
                  f"die Zugfolge fuehrt sie nicht mehr")
            missing += 1
    print(f"\n{total} Fenster mit systematischem Widerspruch, {traced} weitere ueber die Spur, "
          f"{missing} Aufnahmen mit einer Figur zu wenig im Mitschnitt."
          + (f" {confirmed} Fenster vom zweiten Fold bestaetigt." if args.second else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
