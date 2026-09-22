"""Woher ein fertiger Kettenlauf stammt — der Stempel, den `platform/app/lib/chain.ts` nachrechnet.

Die Kette schloss ihre Sprossen auf DATEIEXISTENZ: ein Reads-Lauf von vor dem letzten Re-Export
hielt sie so fest zu wie ein frischer, derselbe Riss wie bei der driftenden `coverage`.
"""

from __future__ import annotations

from pathlib import Path


def session_stamp(session_dir: Path) -> str:
    """`<Millisekunden>:<Bytes>` der `log.jsonl` — die Form, auf die `lib/session.ts` schon cacht."""
    st = (session_dir / "log.jsonl").stat()
    return f"{st.st_mtime_ns // 1_000_000}:{st.st_size}"


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
    """Wie `sameLog` in `platform/app/lib/chain.ts`: Groesse exakt, Millisekunde auf 1 genau.

    Python rundet denselben Zeitstempel ueber ein float in SEKUNDEN ab, die Millisekunde kann
    also um eins danebenliegen; ein Neuschreiben bewegt sie um mehr, und die Groesse faengt den Rest.
    """
    if current is None:
        return False
    ms, size = stamped.split(":")
    now_ms, now_size = current.split(":")
    return size == now_size and abs(int(ms) - int(now_ms)) <= 1


def _stamps(path: Path) -> list[str]:
    """Jeder `_source.log`, den diese Datei traegt. `matte.jsonl` stempelt JEDE Zeile."""
    from .ioutil import read_jsonl

    if not path.is_file():
        return []
    if path.suffix == ".json":
        import json

        try:
            head = json.loads(path.read_text(encoding="utf-8-sig"))
        except (OSError, ValueError):
            return []
        head = head if isinstance(head, dict) else {}
        return [s] if (s := (head.get("_source") or {}).get("log")) else []
    return [s for row in read_jsonl(path)
            if (s := (row.get("_source") or {}).get("log"))]


def check(session_dir: Path, path: Path) -> None:
    """Wirft `Stale`, wenn `path` aus einem aelteren Schnitt der Aufnahme stammt.

    Ungestempelt gilt weiter (alles auf der Platte ist es), und eine unlesbare `log.jsonl` ist
    kein Urteil — wie `stillCurrent` in `platform/app/lib/chain.ts` lehnt nur ein FALSCHER ab.
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
