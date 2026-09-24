"""Was ein Urteil im Labeln-Strom ins Training traegt: Bretter, die der Slice nur mit Korrektur
schneidet (`labeling.frame_dirty`), und Zellen, die der Verlust nie lernt
(`cell_rule.classification_eligible` — verdeckt ODER zu dunkel). Gebuendelt: `web_ops.admission`."""

from __future__ import annotations

from pathlib import Path

from .cell_rule import classification_eligible
from .chain_state import parsed
from .ioutil import iter_jsonl, mtime_size, read_jsonl
from .session_store.matte import measured_coverage
from .session_store.names import log_path, matte_path, reads_path


def _stems(value: object) -> str:
    return Path(str(value)).stem


def _cover(path: Path) -> dict[str, dict[str, float]]:
    return {frame: row["coverage"] for frame, row in measured_coverage(read_jsonl(path)).items()}


def read_cells(path: Path) -> dict[str, list[tuple[str, object]]]:
    stems: dict[str, list[tuple[str, object]]] = {}
    if not path.exists():
        return stems
    for r in iter_jsonl(path):
        if r.get("frame") is not None and r.get("square"):
            stems.setdefault(str(r["frame"]), []).append((r["square"], r.get("bright")))
    return stems


_DONE: dict[tuple[str, str], tuple[tuple, object]] = {}


def _key(path: Path) -> tuple[int, int] | None:
    try:
        return mtime_size(path)
    except FileNotFoundError:
        return None


def _cached(session_dir: Path, part: str, files, compute):
    key = tuple(_key(f(session_dir)) for f in files)
    hit = _DONE.get((str(session_dir), part))
    if hit is not None and hit[0] == key:
        return hit[1]
    value = compute(session_dir)
    _DONE[(str(session_dir), part)] = (key, value)
    return value


def admission(session_dir: Path) -> dict:
    """`blocked`: Stems, deren FEN-Urteil der Slice verwirft; `ineligible`: Stem -> Felder ausserhalb
    des Klassenverlusts. Ohne Messung (keine Matte, keine Lesart) gilt eine Zelle als sichtbar."""
    # Getrennt gecacht: ein Brett-Urteil schreibt nur das Log, die Lesarten (bis 20 MB) bleiben geparst.
    return {"blocked": _cached(session_dir, "blocked", (log_path, matte_path), _blocked),
            "ineligible": _cached(session_dir, "ineligible", (matte_path, reads_path), _ineligible)}


def _blocked(session_dir: Path) -> list[str]:
    from .labeling import frame_dirty  # zieht cv2: erst bei der ersten Aufnahme

    cover = parsed(matte_path(session_dir), "cover", _cover)
    return sorted({_stems(r["frame"]) for r in iter_jsonl(log_path(session_dir))
                   if r.get("frame") and not r.get("unusable")
                   and frame_dirty(r, cover.get(_stems(r["frame"]), {}))})


def _ineligible(session_dir: Path) -> dict[str, list[str]]:
    cover = parsed(matte_path(session_dir), "cover", _cover)
    # `bright` der Modell-Lesarten ist gemessen wie die `brightness` des Slice, je Zelle JEDES Bretts.
    out: dict[str, set[str]] = {}
    eligible: dict[tuple, bool] = {}  # je (Coverage, Helligkeit) EIN Aufruf der Regel, nicht je Zelle
    reads = read_cells(reads_path(session_dir))
    for stem, cells in reads.items():
        covs = cover.get(stem, {})
        for sq, bright in cells:
            key = (covs.get(sq), bright)
            ok = eligible.get(key)
            if ok is None:
                ok = eligible[key] = classification_eligible({"coverage": key[0], "brightness": bright})
            if not ok:
                out.setdefault(stem, set()).add(sq)
    for stem, covs in cover.items():
        if stem not in reads:
            for sq, cov in covs.items():
                if not classification_eligible({"coverage": cov, "brightness": None}):
                    out.setdefault(stem, set()).add(sq)
    return {stem: sorted(sqs) for stem, sqs in sorted(out.items())}
