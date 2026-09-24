"""Frische eines Eingangs: der EINE Ort, der Stempel rechnet und "noch aktuell?" beantwortet.

Gespeichert wird `ms:bytes` (`_source`, `_inputs`, `ledgers.json`); `version` ist nur ein privater
Schluessel im Prozess. Was bewusst anders misst: `docs/architektur-review-python-2026-09-23.md` H3.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

from .session_store.names import log_path, matte_path, meta_path


def version(path: Path) -> tuple[int, int] | None:
    """`(mtime_ns, Groesse)`; `None` nur, wenn die Datei FEHLT — jeder andere Lesefehler wirft."""
    try:
        st = Path(path).stat()
    except FileNotFoundError:
        return None
    return st.st_mtime_ns, st.st_size


def memo(store: dict, slot: object, files: Iterable[Path], compute: Callable[[], Any]) -> Any:
    """`compute()` einmal je Stand von `files`; der Schluessel verlaesst den Prozess nie."""
    key = tuple((str(f), version(f)) for f in files)
    hit = store.get(slot)
    if hit is not None and hit[0] == key:
        return hit[1]
    value = compute()
    store[slot] = (key, value)
    return value


def ms_stamp(ns: int | None, size: int | None) -> str | None:
    return None if ns is None or size is None else f"{ns // 1_000_000}:{size}"


def session_stamp(session_dir: Path) -> str:
    """`<Millisekunden>:<Bytes>` der `log.jsonl`; wirft, wenn sie nicht lesbar ist."""
    st = log_path(session_dir).stat()
    return ms_stamp(st.st_mtime_ns, st.st_size)


def file_stamp(path: Path) -> str | None:
    """Dieselbe Form fuer ein beliebiges Ledger; `None` heisst: die Datei gibt es nicht."""
    v = version(path)
    return None if v is None else ms_stamp(*v)


def source(session_dir: Path, model: str | None = None) -> dict:
    """Der `_source`-Kopf eines Laufs. Ohne lesbares Log lieber KEIN Stempel als ein erfundener."""
    try:
        out = {"log": session_stamp(session_dir)}
    except OSError:
        return {}
    if model is not None:
        out["model"] = Path(model).name
    return out


class Stale(RuntimeError):
    """Ein fertiger Lauf gehoert zu einer aelteren `log.jsonl` als der, die jetzt dort liegt."""


def same_log(stamped: str, current: str | None) -> bool:
    """Wie `sameLog` in `chain.ts`: Groesse exakt, Millisekunde auf 1 genau.

    Python rundet den Zeitstempel ueber ein float in SEKUNDEN ab; die Millisekunde kann um eins
    abweichen.
    """
    if current is None:
        return False
    ms, size = stamped.split(":")
    now_ms, now_size = current.split(":")
    return size == now_size and abs(int(ms) - int(now_ms)) <= 1


def _head(path: Path, key: str) -> dict:
    """Ein Stempel-Feld einer `.json`-Datei; unlesbar ist ungestempelt, kein Urteil."""
    import json

    try:
        head = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return {}
    value = head.get(key) if isinstance(head, dict) else None
    return value if isinstance(value, dict) else {}


def _stamps(path: Path) -> list[str]:
    """Jeder `_source.log`, den diese Datei traegt. `matte.jsonl` stempelt JEDE Zeile."""
    from .ioutil import read_jsonl

    if not path.is_file():
        return []
    if path.suffix == ".json":
        return [s] if (s := _head(path, "_source").get("log")) else []
    return [s for row in read_jsonl(path)
            if (s := (row.get("_source") or {}).get("log"))]


def same_file(stamped: str | None, current: str | None) -> bool:
    """`same_log`, nur dass FEHLTE-und-fehlt gleich ist."""
    return stamped == current if stamped is None or current is None else same_log(stamped, current)


def _scan_file(session_dir: Path, rel: str) -> Path | None:
    """Nur `session.yaml` und das Profil: jedes Brett-Schreiben schreibt auch das Log, und das
    prueft schon `_source` — alle Bretter je Startseite zu `stat`en kostete Sekunden."""
    if rel == meta_path(session_dir).name:
        return meta_path(session_dir)
    if rel.startswith("profile:"):
        from .calibration import profile_path

        return profile_path(rel.removeprefix("profile:"))
    return None


def inputs_moved(session_dir: Path, inputs: dict) -> str | None:
    """`matte`/`scan`, wenn sich seit dem Lauf etwas AUSSER dem Log bewegt hat; `_inputs` eines Laufs."""
    if "matte" in inputs and not same_file(inputs["matte"], file_stamp(matte_path(session_dir))):
        return "matte"
    for rel, size, ns in inputs.get("scan") or []:
        file = _scan_file(session_dir, rel)
        if file is not None and not same_file(ms_stamp(ns, size), file_stamp(file)):
            return "scan"
    return None


_MOVED = {"matte": "matte.jsonl hat sich seit dem Lauf geaendert",
          "scan": "Profil oder session.yaml haben sich seit dem Lauf geaendert"}


def check(session_dir: Path, path: Path) -> None:
    """Wirft `Stale`, wenn `path` aus einem aelteren Schnitt der Aufnahme stammt.

    Ungestempelt gilt weiter, eine unlesbare `log.jsonl` ist kein Urteil — nur ein FALSCHER
    Stempel lehnt ab.
    """
    stamps = _stamps(Path(path))
    if not stamps:
        return
    try:
        current = session_stamp(Path(session_dir))
    except OSError:
        return
    if any(not same_log(s, current) for s in stamps):
        raise Stale(f"{Path(path).name} stammt aus einem aelteren Schnitt der Aufnahme "
                    f"({sorted(set(stamps))[0]} statt {current}) — den Schritt neu rechnen")
    if Path(path).suffix == ".json" and (moved := inputs_moved(Path(session_dir), _head(Path(path), "_inputs"))):
        raise Stale(f"{Path(path).name}: {_MOVED[moved]} — den Schritt neu rechnen")
