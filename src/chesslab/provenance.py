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
