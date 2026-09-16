"""Wo die Matte blind war, die Rillen aber etwas sehen — korpusweit, ohne neuronales Netz.

Zwei unabhaengige Sensoren beurteilen dieselbe Frage. SAM 3 schneidet die Hand aus (`matte.jsonl`,
`concepts`), der Rillen-Sensor misst verdeckte Gitterlinien (`grid_occlusion`, derselbe Code, der
auf dem Telefon laeuft). Wo SAM NICHTS findet und die Rillen doch Felder melden, ist die Matte
ausgefallen — und die betroffenen Zellen zaehlen als sichtbar, obwohl sie es nicht sind.

    uv run python scripts/matte_audit.py [--limit 0] [--out data/reports/matte-audit.jsonl]
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import cv2

from chesslab.grid_occlusion import hand_squares, missing_edges


def board_path(rec: Path, frame: str) -> Path | None:
    for sub in ("dirty", "boards"):
        p = rec / sub / f"{frame}.webp"
        if p.exists():
            return p
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--recordings", default="data/recordings")
    ap.add_argument("--reason", default="occluded", help="Nur Matten mit diesem `dirty_reason`.")
    ap.add_argument("--limit", type=int, default=0, help="Frames je Session (0 = alle).")
    ap.add_argument("--out", default="data/reports/matte-audit.jsonl")
    args = ap.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    found = checked = noboard = 0
    # TODO: `open("w")` KUERZT den veroeffentlichten Bericht sofort beim Start; ein abgebrochener
    # Lauf liess ihn halb da, und `matte_audit_montage.py` liest ihn mit `json.loads` je Zeile.
    tmp = out.with_name(out.name + ".tmp")
    with tmp.open("w", encoding="utf-8") as sink:
        for rec in sorted(Path(args.recordings).iterdir()):
            mj = rec / "matte.jsonl"
            if mj.is_dir() or not mj.exists():
                continue
            rows = [json.loads(x) for x in mj.read_text(encoding="utf-8").splitlines() if x.strip()]
            blind = [r for r in rows if r.get("dirty_reason") == args.reason
                     and not (r.get("concepts") or {}) and not (r.get("cells_over_half") or 0)]
            if args.limit:
                blind = blind[:args.limit]
            hits = 0
            for r in blind:
                p = board_path(rec, r["frame"])
                # TODO: ungezaehlt uebersprungen — `checked` sank dadurch stumm, und `von
                # {len(blind)}` eine Zeile tiefer nannte weiter die volle Zahl.
                if p is None:
                    noboard += 1
                    continue
                gray = cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2GRAY)
                squares = sorted(hand_squares(missing_edges(gray, board_size=gray.shape[0], pad=0)))
                checked += 1
                if squares:
                    hits += 1
                    found += 1
                    sink.write(json.dumps({"session": rec.name, "frame": r["frame"],
                                           "ply": r.get("ply"), "squares": squares}) + "\n")
            if blind:
                print(f"  {rec.name:26s} {hits:4d} von {len(blind):4d} blinden Matten "
                      f"melden Rillen-Felder", flush=True)
    os.replace(tmp, out)
    if not checked:
        # TODO: "0 von 0" las sich wie ein Ergebnis. Nichts gemessen ist kein Befund.
        print(f"\nkeine blinde Matte geprueft (ohne Brett: {noboard}) — nichts gemessen -> {out}")
        return 1
    print(f"\n{found} von {checked} blinden Matten werden vom Rillen-Sensor widersprochen"
          + (f" ({noboard} ohne Brett uebersprungen)" if noboard else "") + f" -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
