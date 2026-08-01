"""Session management: list, archive, restore, delete recorded training sessions.

`collect` creates a directory per session under `data/sessions/<id>` (frames + log.jsonl +
session.yaml); `slice` produces crops (`data/squares/<label>/<id>_*.png`) and manifest
lines from them. These functions keep these three locations consistent:

- **archive** removes the crops + manifest lines (session no longer counts toward the dataset)
  and moves the session directory to `data/sessions_archive/<id>`. Reversible:
  `restore` + re-slice. Corrections are preserved.
- **delete** permanently removes directory, crops, manifest and correction lines.

Headless and testable: all functions accept a `paths` object (default `config.DATA`).
"""

from __future__ import annotations

import json
import logging
import shutil
from datetime import UTC, datetime
from pathlib import Path

import yaml

from . import config

log = logging.getLogger("chesslab.sessions")


def _safe_id(session_id: str) -> str:
    if not session_id or "/" in session_id or "\\" in session_id or ".." in session_id:
        raise ValueError(f"invalid session ID: {session_id!r}")
    return session_id


def _read_meta(session_dir: Path) -> dict:
    import yaml

    p = session_dir / "session.yaml"
    if not p.exists():
        return {}
    with p.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def _log_count(session_dir: Path) -> int:
    p = session_dir / "log.jsonl"
    if not p.exists():
        return 0
    return sum(1 for line in p.read_text(encoding="utf-8").splitlines() if line.strip())


def _manifest_path(paths: config.Paths) -> Path:
    return paths.manifests / "squares.jsonl"


def _manifest_files(paths: config.Paths) -> list[Path]:
    """The default crop manifest plus every ingest-variant one (`squares__<tag>.jsonl`).

    `list_sessions` reads an ingested session's crop count from its variant manifest, so archiving
    it while filtering only the default manifest left the rows behind and the count unchanged.
    """
    out = [_manifest_path(paths)]
    if paths.manifests.exists():
        out += sorted(p for p in paths.manifests.glob("squares__*.jsonl") if p.is_file())
    return out


def _crop_pools(paths: config.Paths) -> list[Path]:
    """Every crop pool: the default one plus the ingest variants (`squares__<tag>`, `squares_aug`).

    `_purge_crops_for_frames` has always swept all of them; `_crop_files` looked only at
    `paths.squares`, so archiving an INGESTED session moved its directory and left every one of its
    crops in the pool — the opposite of what `archive_session` documents itself as doing.
    """
    return [p for p in sorted(paths.root.glob("squares*")) if p.is_dir()]


def _crop_files(session_id: str, paths: config.Paths) -> list[Path]:
    # Crop filename = "{session_id}_{frame}_{square}.png" in <pool>/<label>/
    return [f for root in _crop_pools(paths) for f in root.glob(f"*/{session_id}_*.png")]


def _crop_count_from_manifest(session_id: str, paths: config.Paths, manifest=None) -> int:
    from .manifest_cache import session_crop_count

    return session_crop_count(manifest or _manifest_path(paths), session_id)


def _variant_tag(meta: dict, session_id: str) -> str | None:
    """Variant manifest tag for ingested sessions (= ingest tag = profile name)."""
    if meta.get("mode") != "ingested":
        return None
    return meta.get("profile") or session_id.split("__", 1)[0]


def _filter_jsonl(path: Path, session_id: str) -> None:
    """Alle Zeilen dieser Session aus einer JSONL-Datei entfernen (idempotent)."""
    if not path.exists():
        return
    kept = [line for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip() and json.loads(line).get("session_id") != session_id]
    path.write_text(("\n".join(kept) + "\n") if kept else "", encoding="utf-8")


def _purge_crops(session_id: str, paths: config.Paths) -> int:
    files = _crop_files(session_id, paths)
    for f in files:
        f.unlink()
    return len(files)


def _frame_stem(entry: dict) -> str:
    return Path(str(entry.get("frame", ""))).stem


def _session_frame_path(session_dir: Path, rel: str) -> Path | None:
    if not rel:
        return None
    path = (session_dir / rel).resolve()
    root = session_dir.resolve()
    if root not in path.parents and path != root:
        return None
    return path


def _reject_dir(paths: config.Paths, session_id: str) -> Path:
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    base = paths.session_rejects / f"{session_id}__cut__{stamp}"
    out = base
    n = 1
    while out.exists():
        n += 1
        out = paths.session_rejects / f"{session_id}__cut__{stamp}_{n}"
    return out


def _purge_crops_for_frames(session_id: str, frame_stems: set[str], paths: config.Paths) -> int:
    if not frame_stems:
        return 0
    removed = 0
    for root in _crop_pools(paths):
        for stem in frame_stems:
            for f in root.glob(f"*/{session_id}_{stem}_*.png"):
                f.unlink()
                removed += 1
    return removed


def _filter_jsonl_frames(path: Path, session_id: str, frame_stems: set[str]) -> int:
    if not path.exists() or not frame_stems:
        return 0
    kept: list[str] = []
    removed = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("session_id") == session_id and str(row.get("frame")) in frame_stems:
            removed += 1
            continue
        kept.append(line)
    path.write_text(("\n".join(kept) + "\n") if kept else "", encoding="utf-8")
    return removed


def list_sessions(paths: config.Paths = config.DATA) -> list[dict]:
    """Active + archived sessions with key data (frames, crops, mode, status)."""
    out: list[dict] = []
    for root, archived in ((paths.sessions, False), (paths.sessions_archive, True)):
        if not root.exists():
            continue
        for d in sorted(root.iterdir()):
            if not d.is_dir():
                continue
            meta = _read_meta(d)
            tag = _variant_tag(meta, d.name)
            if archived:
                n_crops = 0
            elif tag:
                # Ingested sessions are sliced into their variant manifest, not the default one.
                n_crops = _crop_count_from_manifest(
                    d.name, paths, manifest=paths.manifests / f"squares__{tag}.jsonl")
            else:
                n_crops = _crop_count_from_manifest(d.name, paths)
            out.append({
                "session_id": d.name,
                "archived": archived,
                "mode": meta.get("mode"),
                "profile": meta.get("profile"),
                "created_at": meta.get("created_at"),
                "variant": tag,
                "n_frames": _log_count(d),
                "n_crops": n_crops,
                "reviewed": bool(meta.get("reviewed", False)),
            })
    return out


def archive_session(session_id: str, reason: str, paths: config.Paths = config.DATA) -> dict:
    """Remove crops + manifest lines and move the directory to the archive (reversible).

    `reason` is REQUIRED and is written twice: into the archived session's own `session.yaml`,
    so it travels with the data, and into `sessions_archive/index.jsonl`, so the archive can be
    read without opening 19 directories. A session that leaves the corpus without a recorded
    reason is exactly the state this project spent a day untangling — four parked directories in
    three conventions, two of them with no explanation of why anything was parked.
    """
    sid = _safe_id(session_id)
    reason = (reason or "").strip()
    if not reason:
        raise ValueError("archiving needs a reason — it is the only record of WHY data left the corpus")
    src = paths.sessions / sid
    if not src.exists():
        raise FileNotFoundError(f"Session '{sid}' not found.")
    paths.sessions_archive.mkdir(parents=True, exist_ok=True)
    dst = paths.sessions_archive / sid
    if dst.exists():
        # Was `shutil.rmtree(dst)`. Archiving is the SAFE half of the API, and silently
        # destroying an existing archive of the same id is the one thing it must never do.
        raise FileExistsError(f"'{sid}' is already archived — remove or rename it first.")
    n_crops = _purge_crops(sid, paths)
    for manifest in _manifest_files(paths):     # default + `squares__<tag>.jsonl` (ingested)
        _filter_jsonl(manifest, sid)
    shutil.move(str(src), str(dst))
    _record_archive_reason(dst, sid, reason, n_crops, paths)
    return {"session_id": sid, "archived": True, "removed_crops": n_crops, "reason": reason}


def _record_archive_reason(dst, sid: str, reason: str, n_crops: int, paths: config.Paths) -> None:
    """Write the reason where a human and a script will each find it."""
    stamp = datetime.now(UTC).isoformat()
    meta = dst / "session.yaml"
    if meta.exists():
        try:
            data = yaml.safe_load(meta.read_text(encoding="utf-8")) or {}
            data["archived_at"] = stamp
            data["archived_reason"] = reason
            meta.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")
        except (OSError, yaml.YAMLError) as e:                     # noqa: PERF203 - one file
            log.warning("could not stamp the reason into %s: %r", meta, e)
    index = paths.sessions_archive / "index.jsonl"
    row = {"session_id": sid, "archived_at": stamp, "reason": reason, "removed_crops": n_crops}
    with index.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def restore_session(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """Move archived session back to the active folder (then re-slice)."""
    sid = _safe_id(session_id)
    src = paths.sessions_archive / sid
    if not src.exists():
        raise FileNotFoundError(f"Archived session '{sid}' not found.")
    dst = paths.sessions / sid
    if dst.exists():
        raise FileExistsError(f"Active session '{sid}' already exists.")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return {"session_id": sid, "archived": False}


def set_session_reviewed(session_id: str, reviewed: bool,
                         paths: config.Paths = config.DATA) -> dict:
    """Persist the per-session ``reviewed`` flag in session.yaml (active or archived).

    "Reviewed" is a lightweight per-session marker so the UI can hide sessions the user has
    already looked at and show only NEW ones. It lives in session.yaml (absent == not reviewed).
    """
    sid = _safe_id(session_id)
    active, archived = paths.sessions / sid, paths.sessions_archive / sid
    target = active if active.exists() else archived
    if not target.exists():
        raise FileNotFoundError(f"Session '{sid}' not found.")
    import yaml

    meta = _read_meta(target)
    meta["reviewed"] = bool(reviewed)
    (target / "session.yaml").write_text(
        yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
    return {"session_id": sid, "reviewed": bool(reviewed)}


def delete_session(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """Permanently remove session: directory + crops + manifest + correction lines."""
    sid = _safe_id(session_id)
    active, archived = paths.sessions / sid, paths.sessions_archive / sid
    target = active if active.exists() else archived
    if not target.exists():
        raise FileNotFoundError(f"Session '{sid}' not found.")
    n_crops = _purge_crops(sid, paths)
    for manifest in _manifest_files(paths):     # default + `squares__<tag>.jsonl` (ingested)
        _filter_jsonl(manifest, sid)
    _filter_jsonl(paths.corrections, sid)
    shutil.rmtree(target)
    return {"session_id": sid, "deleted": True, "removed_crops": n_crops}


def trim_session(session_id: str, keep_frames: int, paths: config.Paths = config.DATA) -> dict:
    """Keep only the first ``keep_frames`` log entries and delete the later session tail.

    Also removes crops, manifest rows and corrections belonging to removed frames, so a
    previously sliced bad tail cannot leak into training.
    """
    sid = _safe_id(session_id)
    active, archived = paths.sessions / sid, paths.sessions_archive / sid
    target = active if active.exists() else archived
    if not target.exists():
        raise FileNotFoundError(f"Session '{sid}' not found.")
    log_path = target / "log.jsonl"
    if not log_path.exists():
        raise FileNotFoundError(f"Session '{sid}' has no log.jsonl.")
    rows = [json.loads(line) for line in log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    keep = max(0, min(int(keep_frames), len(rows)))
    kept, removed_rows = rows[:keep], rows[keep:]
    removed_stems = {_frame_stem(r) for r in removed_rows if _frame_stem(r)}

    reject_dir = None
    moved_files = 0
    if removed_rows:
        reject_dir = _reject_dir(paths, sid)
        (reject_dir / "frames").mkdir(parents=True, exist_ok=True)
        meta = _read_meta(target)
        meta.update({
            "session_id": reject_dir.name,
            "source_session_id": sid,
            "mode": "rejected-tail",
            "cut_kept_frames": keep,
            "created_at": datetime.now(UTC).isoformat(),
        })
        import yaml
        (reject_dir / "session.yaml").write_text(yaml.safe_dump(meta, sort_keys=False), encoding="utf-8")
    for entry in removed_rows:
        rel = str(entry.get("frame") or "")
        p = _session_frame_path(target, rel)
        if p is not None and p.exists():
            dst = reject_dir / rel if reject_dir is not None else None
            if dst is not None:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(p), str(dst))
                moved_files += 1
    if reject_dir is not None:
        (reject_dir / "log.jsonl").write_text(
            "\n".join(json.dumps(r, ensure_ascii=False) for r in removed_rows) + "\n",
            encoding="utf-8",
        )

    log_path.write_text(
        ("\n".join(json.dumps(r, ensure_ascii=False) for r in kept) + "\n") if kept else "",
        encoding="utf-8",
    )
    removed_crops = _purge_crops_for_frames(sid, removed_stems, paths)
    removed_manifest_rows = 0
    if paths.manifests.exists():
        for manifest in paths.manifests.glob("squares*.jsonl"):
            removed_manifest_rows += _filter_jsonl_frames(manifest, sid, removed_stems)
    removed_corrections = _filter_jsonl_frames(paths.corrections, sid, removed_stems)
    return {
        "session_id": sid,
        "kept_frames": keep,
        "removed_frames": len(removed_rows),
        "moved_files": moved_files,
        "reject_dir": None if reject_dir is None else str(reject_dir.as_posix()),
        "removed_crops": removed_crops,
        "removed_manifest_rows": removed_manifest_rows,
        "removed_corrections": removed_corrections,
    }
