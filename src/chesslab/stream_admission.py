"""Was ein Urteil im Labeln-Strom ins Training traegt: Bretter, die der Slice nur mit Korrektur
schneidet (`labeling.frame_dirty`), und Zellen, die der Verlust nie lernt
(`cell_rule.classification_eligible` — verdeckt ODER zu dunkel). Gebuendelt: `web_ops.admission`."""

from __future__ import annotations

import codecs
import json
import re
from collections.abc import Sequence
from itertools import groupby
from operator import itemgetter
from pathlib import Path
from typing import NamedTuple

from .cell_rule import classification_eligible
from .chain_state import parsed
from .ioutil import iter_jsonl, mtime_size, read_jsonl
from .session_store.matte import measured_coverage
from .session_store.names import log_path, matte_path, reads_path


def _stems(value: object) -> str:
    return Path(str(value)).stem


def _cover(path: Path) -> dict[str, dict[str, float]]:
    return {frame: row["coverage"] for frame, row in measured_coverage(read_jsonl(path)).items()}


# Die Zeilenform, die `occluded_model.read_session` schreibt; nur Zahlen oder `null` vor `bright`.
_ROW = re.compile(
    rb'\n\{"session_id": "[^"\x5c\n]*", "frame": "([^"\x5c\n]*)", "square": "([^"\x5c\n]+)", '
    rb'"fen_label": "[^"\x5c\n]*", "dirty_reason": (?:null|"[^"\x5c\n]*"), '
    rb'(?:"[a-z_]+": [-0-9.eE+nul]*, )*"bright": (null|-?[0-9][0-9.eE+-]*)[,}]')


class Reads(NamedTuple):
    """Je Stem seine `(frame, square, bright)`-Zeilen; `squares`/`numbers` uebersetzen die Rohform des
    Schnellwegs (Bytes) — der langsame Weg liefert schon `str`/Zahl und laesst sie leer."""

    stems: list[tuple[str, Sequence[tuple[object, object, object]]]]
    squares: dict
    numbers: dict


def _fast_reads(data: bytes) -> Reads | None:
    """`None`, sobald eine Zeile nicht die bekannte Form hat — dann entscheidet `iter_jsonl`."""
    data = data.removeprefix(codecs.BOM_UTF8)
    lines = data.count(b"\n")
    if not data.endswith(b"\n") or data.count(b"}\n") + data.count(b"}\r\n") != lines:
        return None
    first = data[:data.index(b"\n")]
    header = first.startswith(b'{"_')
    if header and ((row := json.loads(first)).get("frame") is not None and row.get("square")):
        return None
    rows = _ROW.findall(b"\n" + data)
    if len(rows) != lines - header or b'\n{"_' in data:
        return None
    numbers: dict[bytes, float | None] = {b"null": None}
    try:
        for token in {b for _f, _s, b in rows}.difference(numbers):
            numbers[token] = float(token)
    except ValueError:
        return None
    squares = {sq: sq.decode() for sq in {s for _f, s, _b in rows}}
    stems, start = [], 0
    for f, group in groupby(rows, itemgetter(0)):
        end = start + sum(1 for _ in group)
        stems.append((f.decode(), rows[start:end]))
        start = end
    return Reads(stems, squares, numbers)


def read_cells(path: Path) -> Reads:
    """Die Lesarten eines Laufs. Kalt liegen ~150 MB auf der Platte: `iter_jsonl` braucht dafuer
    ~2,5 s, das Muster ~0,6 s (`docs/web-ruft-python.md`, Latenz)."""
    try:
        fast = _fast_reads(path.read_bytes())
    except FileNotFoundError:
        return Reads([], {}, {})
    if fast is not None:
        return fast
    stems: dict[str, list[tuple[object, object, object]]] = {}
    for r in iter_jsonl(path):
        if r.get("frame") is not None and r.get("square"):
            stems.setdefault(str(r["frame"]), []).append((r["frame"], r["square"], r.get("bright")))
    return Reads(list(stems.items()), {}, {})


_DONE: dict[str, tuple[tuple, dict]] = {}


def _key(path: Path) -> tuple[int, int] | None:
    try:
        return mtime_size(path)
    except FileNotFoundError:
        return None


def admission(session_dir: Path) -> dict:
    """`blocked`: Stems, deren FEN-Urteil der Slice verwirft; `ineligible`: Stem -> Felder ausserhalb
    des Klassenverlusts. Ohne Messung (keine Matte, keine Lesart) gilt eine Zelle als sichtbar."""
    key = tuple(_key(p(session_dir)) for p in (log_path, matte_path, reads_path))
    hit = _DONE.get(str(session_dir))
    if hit is not None and hit[0] == key:
        return hit[1]
    value = _admission(session_dir)
    _DONE[str(session_dir)] = (key, value)
    return value


def _admission(session_dir: Path) -> dict:
    from .labeling import frame_dirty  # zieht cv2: erst bei der ersten Aufnahme

    cover = parsed(matte_path(session_dir), "cover", _cover)
    blocked = sorted({_stems(r["frame"]) for r in iter_jsonl(log_path(session_dir))
                      if r.get("frame") and not r.get("unusable")
                      and frame_dirty(r, cover.get(_stems(r["frame"]), {}))})
    # `bright` der Modell-Lesarten ist gemessen wie die `brightness` des Slice, je Zelle JEDES Bretts.
    reads = read_cells(reads_path(session_dir))
    squares, numbers = reads.squares, reads.numbers
    out: dict[str, set[str]] = {}
    eligible: dict[tuple, bool] = {}  # je (Coverage, Helligkeit) EIN Aufruf der Regel, nicht je Zelle
    read: set[str] = set()
    for stem, cells in reads.stems:
        read.add(stem)
        covs = cover.get(stem, {})
        for _frame, raw_sq, raw in cells:
            sq = squares.get(raw_sq, raw_sq)
            key = (covs.get(sq), raw)
            ok = eligible.get(key)
            if ok is None:
                ok = eligible[key] = classification_eligible({"coverage": key[0], "brightness": numbers.get(raw, raw)})
            if not ok:
                out.setdefault(stem, set()).add(sq)
    for stem, covs in cover.items():
        if stem not in read:
            for sq, cov in covs.items():
                if not classification_eligible({"coverage": cov, "brightness": None}):
                    out.setdefault(stem, set()).add(sq)
    return {"blocked": blocked, "ineligible": {stem: sorted(sqs) for stem, sqs in sorted(out.items())}}
