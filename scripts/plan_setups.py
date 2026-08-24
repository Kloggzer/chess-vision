"""Welche Aufstellung fehlt dem Korpus — als FEN, Brettbild und fertiger Ingest-Befehl.

Nicht die Zahl der Crops entscheidet, sondern wie viele VERSCHIEDENE (Figur, Feld)-Kombinationen
der Datensatz kennt: `wK` hat 6 640 Crops, aber nur zehn Felder — 201 Aufnahmen je Situation.
Und die Feldfarbe ist schief verteilt (`wK` 28 von 33 auf dunkel), was genau die Verwechslungen
erzeugt, die die Konfusionsmatrix zeigt.

Das Skript zaehlt die vorhandene Abdeckung, gewichtet nach Seltenheit und stellt daraus Bretter
zusammen, die MOEGLICHST viel Neues zeigen — im Rahmen dessen, was ein echtes Figurenset hergibt.
"""

from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

FILES = "abcdefgh"
#: Ein normales Set, je Farbe. Der Engpass sind K und Q — davon gibt es genau eines.
INVENTORY = {"K": 1, "Q": 1, "R": 2, "B": 2, "N": 2, "P": 8}
#: Die Klassen, um die es geht. Bauern und leere Felder sind reichlich vorhanden.
RARE = ("K", "Q", "B", "N", "R")


def square_color(sq: str) -> str:
    return "dark" if (FILES.index(sq[0]) + int(sq[1])) % 2 == 0 else "light"


def squares() -> list[str]:
    return [f"{f}{r}" for r in range(1, 9) for f in FILES]


def coverage(manifest: Path) -> collections.Counter:
    """Wie oft kennt der Korpus (Klasse, Feld) als EIGENE Situation — nicht als Crop."""
    seen: set[tuple[str, str, str]] = set()
    for line in manifest.open(encoding="utf-8"):
        r = json.loads(line)
        seen.add((r["label"], r["square"], r["session_id"]))
    return collections.Counter((lab, sq) for lab, sq, _ in seen)


def need(cov: collections.Counter, cls: str, sq: str) -> float:
    """Je weniger bekannt, desto hoeher — plus Aufschlag fuer die untervertretene Feldfarbe."""
    have = cov[(cls, sq)]
    same = [cov[(cls, s)] for s in squares() if square_color(s) == square_color(sq)]
    other = [cov[(cls, s)] for s in squares() if square_color(s) != square_color(sq)]
    # Die Feldfarbe, auf der die Klasse selten steht, ist die, auf der sie versagt.
    tilt = 1.0 + (sum(other) - sum(same)) / max(1.0, sum(other) + sum(same))
    centre = 1.25 if sq[1] in "3456" else 1.0        # Reihe 4/5 liegt bei 12 % Trefferquote
    return centre * tilt / (1.0 + have)


def build(cov: collections.Counter, n_boards: int, max_pieces: int = 16,
          colors=("w", "b")) -> list[dict]:
    """Gierig: je Brett das Feld nehmen, das aktuell am meisten fehlt."""
    plan = []
    for _ in range(n_boards):
        left = {(c, p): INVENTORY[p] for c in colors for p in INVENTORY}
        used: dict[str, tuple[str, str]] = {}
        wants = [(need(cov, c + p, sq), c, p, sq)
                 for c in colors for p in RARE for sq in squares()]
        wants.sort(reverse=True)
        for _score, c, p, sq in wants:
            if len(used) >= max_pieces:
                break
            if sq in used or left[(c, p)] <= 0:
                continue
            used[sq] = (c, p)
            left[(c, p)] -= 1
            cov[(c + p, sq)] += 1                    # im Plan schon als abgedeckt fuehren
        plan.append(used)
    return plan


def to_fen(used: dict[str, tuple[str, str]]) -> str:
    rows = []
    for rank in range(8, 0, -1):
        row, gap = "", 0
        for f in FILES:
            hit = used.get(f"{f}{rank}")
            if hit is None:
                gap += 1
                continue
            if gap:
                row += str(gap)
                gap = 0
            c, p = hit
            row += p.upper() if c == "w" else p.lower()
        if gap:
            row += str(gap)
        rows.append(row or "8")
    return "/".join(rows)


def draw(used: dict[str, tuple[str, str]]) -> str:
    out = []
    for rank in range(8, 0, -1):
        cells = []
        for f in FILES:
            hit = used.get(f"{f}{rank}")
            if hit is None:
                cells.append(".." if square_color(f"{f}{rank}") == "light" else "##")
            else:
                c, p = hit
                cells.append((p.upper() if c == "w" else p.lower()) + ("^" if c == "w" else "v"))
        out.append(f"{rank} " + " ".join(cells))
    out.append("  " + "  ".join(FILES))
    return "\n".join(out)


def write_html(out: Path, cards, occluders: str) -> None:
    """Alle Bretter als SVG in EINER Seite — zum Offenlassen, waehrend du aufstellst."""
    import chess
    import chess.svg

    css = (
        "body{font-family:system-ui;background:#14161a;color:#e6e6e6;margin:24px}"
        ".b{display:inline-block;vertical-align:top;margin:0 22px 30px 0}"
        "code{background:#232730;padding:2px 6px;border-radius:4px;font-size:12px}"
        "h2{margin:6px 0 2px;font-size:15px}p{margin:4px 0;font-size:13px;color:#9aa4b2}"
        "pre{background:#232730;padding:8px;border-radius:6px;font-size:11px;"
        "white-space:pre-wrap;max-width:360px}"
    )
    parts = ["<meta charset='utf-8'><title>Aufstellungen</title>",
             f"<style>{css}</style>",
             "<h1>Aufstellungen fuer die seltenen Klassen</h1>"]
    for i, fen, used, gain in cards:
        board = chess.Board(fen + " w - - 0 1")
        # Die belegten Felder markieren — dorthin muss die Figur wirklich.
        marks = chess.SquareSet(chess.parse_square(sq) for sq in used)
        svg = chess.svg.board(board, size=340, squares=marks, coordinates=True)
        bs = chr(92)                      # Zeilenfortsetzung, ohne Escape-Ebenen zu stapeln
        nl = chr(10)
        cmd = nl.join([
            f".venv/Scripts/chesslab.exe occluders composite {bs}",
            f"  --video &lt;clip.mp4&gt; {bs}",
            f'  --fen "{fen}" {bs}',
            f"  --occluders {occluders} --tag comp13-v3",
        ])
        parts.append(
            f"<div class='b'>{svg}<h2>Aufstellung {i}</h2>"
            f"<p>{len(used)} Figuren, {gain} auf neuen (Figur,Feld)</p>"
            f"<p><code>{fen}</code></p><pre>{cmd}</pre></div>")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(parts), encoding="utf-8")

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--boards", type=int, default=5, help="Wie viele Aufstellungen planen.")
    ap.add_argument("--manifest", default="data/crops/default/manifest.jsonl")
    ap.add_argument("--occluders", default="data/occluders")
    ap.add_argument("--out", default="data/reports/setup-plan.html",
                    help="HTML mit Brettbildern. ASCII bleibt auf der Konsole.")
    ap.add_argument("--max-pieces", type=int, default=16,
                    help="Figuren je Brett. Weniger = naeher an einer echten Partie; die "
                         "Nachbarn blenden ueber `pad_side` in jeden Crop mit hinein.")
    a = ap.parse_args()

    cov = coverage(Path(a.manifest))
    print("Abdeckung HEUTE — verschiedene Felder je Klasse (nicht Crops):")
    for c in ("w", "b"):
        for p in RARE:
            cls = c + p
            sq = [s for s in squares() if cov[(cls, s)]]
            dark = sum(1 for s in sq if square_color(s) == "dark")
            print(f"   {cls}: {len(sq):2d} Felder  (dunkel {dark}, hell {len(sq) - dark})")

    plan = build(collections.Counter(cov), a.boards, a.max_pieces)
    cards = []
    for i, used in enumerate(plan, 1):
        fen = to_fen(used)
        gain = sum(1 for sq, (c, p) in used.items() if not cov[(c + p, sq)])
        print(f"\n{'=' * 62}\nAUFSTELLUNG {i}   {len(used)} Figuren, davon {gain} auf NEUEN (Figur,Feld)")
        print(draw(used))
        print(f"\nFEN: {fen}")
        print("Ingest nach dem Filmen:")
        print("  .venv/Scripts/chesslab.exe occluders composite --video <clip.mp4> \\")
        print(f'    --fen "{fen}" --occluders {a.occluders} --tag comp13-v3')
        cards.append((i, fen, used, gain))

    write_html(Path(a.out), cards, a.occluders)
    print()
    print(f"[OK] Brettbilder -> {a.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
