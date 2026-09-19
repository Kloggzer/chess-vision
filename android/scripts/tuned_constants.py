"""Leitet die Herkunftsliste der Engine-Zahlen aus `TrackerConfig.kt` ab.

Exakt ist nur, OB eine Zahl eine Herkunftsnotiz traegt — was die Notiz wert ist, entscheidet
kein Regex. Darum drei Klassen: UNGEPRUEFT (keine Notiz am Feld), PLATZHALTER (die Notiz nennt
sich selbst ungemessen), NOTIERT (eine Notiz ist da). STRUCTURAL sind Groessen und Schalter, die
gar keine Schwelle sind. Regenerieren: `uv run python android/scripts/tuned_constants.py`.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "android/core-engine/src/main/kotlin/com/chesslab/engine/api/TrackerConfig.kt"
LIST = ROOT / "android/config/tuned-constants.txt"

FIELD = re.compile(r"\s+val (\w+): ([\w?<>]+) = (.+?),?$")
PLACEHOLDER = re.compile(r"unmeasured|placeholder|Platzhalter|Experiment|ungemessen", re.I)
#: Groessen und Schalter, die keine Schwelle sind — sie messen nichts, sie legen etwas fest.
STRUCTURAL = {"boardSize", "settleFramesOverride", "avgFramesOverride", "confirmFramesOverride",
              "observerIntervalS"}


def classify(source: str) -> list[tuple[str, str, str]]:
    lines = source.splitlines()
    out = []
    for i, line in enumerate(lines):
        m = FIELD.match(line)
        if not m or m.group(2) not in ("Double", "Int", "Double?", "Int?"):
            continue
        name, value = m.group(1), m.group(3).rstrip(",")
        note, j = [], i - 1
        while j >= 0 and lines[j].strip().startswith(("//", "*", "/*")):
            note.append(lines[j].strip().lstrip("/*").strip())
            j -= 1
        text = " ".join(reversed(note))
        if name in STRUCTURAL:
            kind = "STRUCTURAL"
        elif PLACEHOLDER.search(text):
            kind = "PLATZHALTER"
        elif text:
            kind = "NOTIERT"
        else:
            kind = "UNGEPRUEFT"
        out.append((kind, name, value))
    return sorted(out, key=lambda r: (r[0], r[1]))


def render(rows: list[tuple[str, str, str]]) -> str:
    head = ("# Herkunft jeder Engine-Zahl. Abgeleitet, nicht gepflegt:\n"
            "#   uv run python android/scripts/tuned_constants.py\n"
            "# UNGEPRUEFT darf nur SCHRUMPFEN (tests/test_tuned_constants.py). Wer eine Zahl\n"
            "# misst, schreibt die Messung an ihr Feld und regeneriert diese Datei.\n")
    return head + "".join(f"{k} {n} = {v}\n" for k, n, v in rows)


if __name__ == "__main__":
    rows = classify(SOURCE.read_text(encoding="utf-8"))
    LIST.write_text(render(rows), encoding="utf-8", newline="\n")
    counts = {k: sum(1 for r in rows if r[0] == k) for k in sorted({r[0] for r in rows})}
    print(f"{len(rows)} Zahlen: " + ", ".join(f"{k}={v}" for k, v in counts.items()))
    sys.exit(0)
