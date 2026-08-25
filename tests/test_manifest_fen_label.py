"""Jede Abweichung zwischen `fen` und `label` braucht eine Korrektur, die sie erklaert.

Eine Manifest-Zeile traegt zwei Wahrheiten: `fen` ist die Stellung des Ply, `label` die Klasse
der Zelle — und eine menschliche Korrektur ueberschreibt NUR das Label. Sie duerfen also
auseinandergehen, aber nie unbegruendet.

Warum das ein Test ist: am 2026-08-25 hat eine Auswertung gegen `fen` verglichen statt gegen
`label` und daraus 304 angeblich falsch gelabelte Frames abgeleitet. Auf denselben Frames stimmte
das Modell zu 98 % mit dem Label ueberein — sie waren besser gelabelt als der Schnitt. Der Test
haelt fest, welche der beiden Spalten die Wahrheit ist, und faengt zugleich den echten Defekt:
eine Abweichung, die KEINE Korrektur erklaert, ist ein verlorener Ueberschreibvorgang.
"""

import json

import pytest

from chesslab.config import DATA


def _board(fen: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for ri, row in enumerate(fen.split()[0].split("/")):
        col = 0
        for ch in row:
            if ch.isdigit():
                for _ in range(int(ch)):
                    out[f"{'abcdefgh'[col]}{8 - ri}"] = "empty"
                    col += 1
            else:
                out[f"{'abcdefgh'[col]}{8 - ri}"] = ("w" if ch.isupper() else "b") + ch.upper()
                col += 1
    return out


def _datasets():
    root = DATA.root / "datasets"
    return sorted(p for p in root.glob("*/manifest.jsonl")) if root.is_dir() else []


@pytest.mark.parametrize("path", _datasets(), ids=lambda p: p.parent.name)
def test_every_fen_label_divergence_has_a_correction(path):
    from chesslab.labeling import load_corrections

    human: dict = {}
    rec = DATA.recordings
    if rec.is_dir():
        for d in rec.iterdir():
            if (d / "corrections.jsonl").is_file():
                load_corrections(d / "corrections.jsonl", human)

    cache: dict[str, dict[str, str]] = {}
    unexplained = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        if not r.get("fen") or not r.get("square"):
            continue
        board = cache.get(r["fen"])
        if board is None:
            board = cache[r["fen"]] = _board(r["fen"])
        if board.get(r["square"]) == r["label"]:
            continue
        if (r["session_id"], r["frame"], r["square"]) in human:
            continue
        unexplained.append(f"{r['session_id']} {r['frame']} {r['square']}: "
                           f"fen={board.get(r['square'])} label={r['label']}")
    assert not unexplained, (
        f"{path.parent.name}: {len(unexplained)} Zellen weichen von ihrer FEN ab, ohne dass eine "
        f"Korrektur das erklaert — {unexplained[:3]}")
