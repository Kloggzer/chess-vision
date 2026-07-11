"""Find (and optionally delete) synthetic sessions that leaked into data/sessions.

Headless clip-replay / test runs used to construct a MoveTracker with the default
`auto_record=True`, which auto-wrote real capture sessions into `config.DATA.sessions` under
ephemeral profiles. Those are never real captures and pollute the dataset. The leak itself is
fixed in `scripts/replay_clip.py` (auto_record forced off); this script removes the sessions
already on disk.

A session is considered synthetic when EITHER:
  * its profile starts with ``__`` (e.g. ``__clip_replay_<pid>_<ns>``, ``__d_<pid>``), OR
  * its profile is ``phone`` AND its frame_size is exactly 400x400 (pre-warped rendered board;
    a real camera is never a 400x400 square).

Real recordings (phone at real resolutions like 1080x1920), ingested variant sessions
(``pretrain-synth__synth-NNN``, mode ``ingested``) and ``default`` capture sessions are kept.

Usage:
    uv run python scripts/purge_synthetic_sessions.py           # dry-run: list matches only
    uv run python scripts/purge_synthetic_sessions.py --apply   # delete the matched sessions
"""

from __future__ import annotations

import argparse
import sys

from chesslab import config
from chesslab import sessions as sessions_mod


def _frame_size(meta: dict) -> tuple[int, int] | None:
    fs = meta.get("frame_size")
    if isinstance(fs, (list, tuple)) and len(fs) == 2:
        try:
            return int(fs[0]), int(fs[1])
        except (TypeError, ValueError):
            return None
    return None


def _synthetic_reason(meta: dict) -> str | None:
    """Return a human-readable reason if this session looks synthetic, else None."""
    profile = str(meta.get("profile") or "")
    if profile.startswith("__"):
        return f"profile={profile}"
    if profile == "phone" and _frame_size(meta) == (400, 400):
        return "phone @ 400x400 (pre-warped render)"
    return None


def find_synthetic(paths: config.Paths) -> list[tuple[str, str, int]]:
    """List (session_id, reason, n_crops) for every synthetic session under paths.sessions."""
    out: list[tuple[str, str, int]] = []
    root = paths.sessions
    if not root.exists():
        return out
    for d in sorted(root.iterdir()):
        if not d.is_dir():
            continue
        meta = sessions_mod._read_meta(d)
        reason = _synthetic_reason(meta)
        if reason is None:
            continue
        n_crops = len(sessions_mod._crop_files(d.name, paths))
        out.append((d.name, reason, n_crops))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true",
                    help="Actually delete the matched sessions (default: dry-run listing only).")
    a = ap.parse_args()

    paths = config.DATA
    matches = find_synthetic(paths)
    if not matches:
        print("No synthetic sessions found under", paths.sessions)
        return 0

    total_crops = sum(n for _, _, n in matches)
    for sid, reason, n_crops in matches:
        crops = f"  ({n_crops} crops)" if n_crops else ""
        print(f"  {sid}  —  {reason}{crops}")
    print(f"\n{len(matches)} synthetic session(s), {total_crops} crop(s) total.")

    if not a.apply:
        print("\nDry-run only. Re-run with --apply to delete them.")
        return 0

    print("\nDeleting (directory + crops + manifest + correction lines) ...")
    for sid, _reason, _n in matches:
        res = sessions_mod.delete_session(sid, paths)
        print(f"  deleted {sid}  (removed {res['removed_crops']} crops)")
    print(f"\nDone. Removed {len(matches)} synthetic session(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
