"""Re-key a session's `matte.jsonl` against its CURRENT log (pre-roll re-export, 2026-08-19).

The alpha itself survives a re-export untouched: it is a cut of the board raster at source frame N,
and the repair changed which frames are exported, never what frame N looks like — verified by
overlaying an old alpha on a re-exported board (`22-48-04/001086`, hand still under the mask). What
DOES go stale is the row's `ply` and `dirty_reason`, copied from the log at cut time. A stale `ply`
is not cosmetic: the matte review writes `bad-interval` against it.

Rows whose frame is no longer exported are left alone. They are valid alphas for their own frame
and cost nothing where they lie; a later export that picks that frame again finds them ready.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import sessions  # noqa: E402


def rekey(sid: str, sdir: Path, apply: bool) -> dict:
    matte = sdir / "matte.jsonl"
    log = sdir / "log.jsonl"
    if not matte.exists() or not log.exists():
        return {"session": sid, "skipped": "no matte.jsonl or no log.jsonl"}
    rows = {}
    for line in log.read_text(encoding="utf-8").splitlines():
        if line.strip():
            entry = json.loads(line)
            rows[Path(entry["frame"]).stem] = entry
    before = matte.stat()
    out, fixed, orphan = [], 0, 0
    for line in matte.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        entry = rows.get(row["frame"])
        if entry is None:
            orphan += 1
        elif row.get("ply") != entry["ply"] or row.get("dirty_reason") != entry.get("dirty_reason"):
            row["ply"], row["dirty_reason"] = entry["ply"], entry.get("dirty_reason")
            fixed += 1
        out.append(json.dumps(row, ensure_ascii=False))
    if apply and fixed:
        # A worker appends to this file while it runs, so the write only lands on the bytes it read.
        now = matte.stat()
        if (now.st_mtime_ns, now.st_size) != (before.st_mtime_ns, before.st_size):
            return {"session": sid, "skipped": "written while reading — run it again"}
        shutil.copy2(matte, matte.with_suffix(".jsonl.bak.preroll"))
        matte.write_text("\n".join(out) + "\n", encoding="utf-8")
    return {"session": sid, "rows": len(out), "rekeyed": fixed, "orphan": orphan}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("names", nargs="*", help="session ids; default: every rg-* recording")
    ap.add_argument("--apply", action="store_true", help="write (keeps a .bak.preroll beside it)")
    args = ap.parse_args()
    targets = ([(n, sessions.session_dir(n)[0]) for n in args.names] if args.names
               else [(s, d) for s, d in sessions.all_sessions() if s.startswith("rg-")])
    for sid, sdir in targets:
        result = rekey(sid, sdir, args.apply)
        if result.get("rekeyed") or result.get("orphan"):
            print(json.dumps(result))


if __name__ == "__main__":
    main()
