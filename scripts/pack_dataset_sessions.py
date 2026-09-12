"""Every session of a dataset as its own pack under `data/packs/<session>-<size>/`.

The migration step from a monolithic `packed_images.u8` to `dataset build --from-packs`: the
donor dataset names both the sessions and the crop pools they came from, so each session is
routed to the writer that matches its source. Already-packed sessions are skipped, which makes
the run resumable — a pack is immutable, nothing is ever rewritten (`docs/session-packs.md`).

Usage:
    python scripts/pack_dataset_sessions.py --dataset real13-mix-v6-128 --size 128
    python scripts/pack_dataset_sessions.py --dataset real13-mix-v6-128 --size 128 --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import yaml

from chesslab import config
from chesslab.training import pack_session, packs


def pools_of(dataset_cfg: dict) -> list[str]:
    """The crop pool TAGS the donor was built from, in its own order."""
    return [Path(p).parent.name for p in dataset_cfg.get("source_manifest") or []]


def pool_index(tags: list[str], paths: config.Paths) -> dict[str, str]:
    """session_id -> pool tag, first pool that carries it wins — the donor's own precedence."""
    at: dict[str, str] = {}
    for tag in tags:
        m = paths.crops / tag / "manifest.jsonl"
        if not m.exists():
            continue
        with m.open(encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    at.setdefault(json.loads(line)["session_id"], tag)
    return at


def has_dir(session_id: str, paths: config.Paths) -> bool:
    from chesslab.sessions import session_dir

    try:
        session_dir(session_id, paths)
    except FileNotFoundError:
        return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", required=True, help="Donor dataset: names sessions and pools.")
    ap.add_argument("--size", type=int, default=packs.DEFAULT_PACK_SIDE)
    ap.add_argument("--dry-run", action="store_true", help="Only say which writer each would use.")
    ap.add_argument("--limit", type=int, default=None, help="Stop after N packs (small batches).")
    args = ap.parse_args()

    paths = config.DATA
    cfg = yaml.safe_load((paths.datasets / args.dataset / "dataset.yaml").read_text(encoding="utf-8"))
    at = pool_index(pools_of(cfg), paths)

    # A pack is immutable but NOT automatically current: `rg-2026-08-08-11-59-12-80` predates its
    # session's last slice and holds 3 333 rows the donor no longer has, with pixels up to 68 grey
    # levels off (`docs/session-packs.md` §5). Nothing in `packs.py` catches that — so say it here.
    donor_at = (paths.datasets / args.dataset / "manifest.jsonl").stat().st_mtime
    plan = []
    for sid in cfg["session_ids"]:
        have = packs.pack_dir(f"{sid}-{args.size}", paths)
        if have.exists():
            older = have.joinpath("packed_images.u8").stat().st_mtime < donor_at
            plan.append((sid, "STALE?" if older else "have", None))
        elif has_dir(sid, paths):
            plan.append((sid, "boards", None))
        elif sid in at:
            plan.append((sid, "pool", at[sid]))
        else:
            plan.append((sid, "MISSING", None))
    for sid, how, pool in plan:
        print(f"  {how:8} {pool or '':16} {sid}")
    missing = [s for s, how, _ in plan if how == "MISSING"]
    stale = [s for s, how, _ in plan if how == "STALE?"]
    todo = [(s, how, pool) for s, how, pool in plan if how in ("boards", "pool")]
    print(f"[plan] {len(plan)} sessions: {len(todo)} to write, "
          f"{sum(1 for _, h, _ in plan if h == 'have')} already packed, {len(stale)} older than "
          f"the donor's manifest, {len(missing)} without a source")
    if stale:
        print(f"[WARN] these packs predate {args.dataset} and may hold pixels from an earlier "
              f"slice — check them, and delete + re-pack by hand: {', '.join(stale)}")
    if missing:
        print(f"[FAIL] no directory and no pool row: {', '.join(missing)}")
        return 1
    if args.dry_run:
        return 0

    t0 = time.time()
    for i, (sid, how, pool) in enumerate(todo[:args.limit], 1):
        res = (pack_session.write_session_pack(sid, args.size) if how == "boards"
               else pack_session.write_pool_pack(sid, args.size, pool=pool))
        print(f"[{i}/{len(todo)}] {res['pack']}: {res['n']} crops, {res['gb']} GB, "
              f"{time.time() - t0:.0f}s total", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
