"""Lebenszyklus einer Session: auflisten, archivieren (mit Grund), zurueckholen, loeschen, kuerzen.

Archiv und Loeschen raeumen Crops und Manifest-Zeilen in JEDEM Pool mit; die Korrekturen liegen im
Ordner und gehen mit ihm. Alle Funktionen nehmen ein `paths` (Vorgabe `config.DATA`).
"""

from __future__ import annotations

import logging
import shutil
from datetime import UTC, datetime
from pathlib import Path

import yaml

from . import config
from .ioutil import append_rows, iter_jsonl, read_jsonl, stamp_of, write_rows, write_rows_guarded
from .session_store.log import _write_log
from .session_store.names import (
    corrections_path,
    log_path,
    matte_path,
    meta_path,
    unusable_cells_path,
)
from .session_store.paths import _read_meta, _safe_id, active_session_dir, all_sessions, session_dir

log = logging.getLogger("chesslab.sessions")


def _log_count(session_dir: Path) -> int:
    p = log_path(session_dir)
    if not p.exists():
        return 0
    return len(read_jsonl(p))


def _manifest_path(paths: config.Paths) -> Path:
    return paths.crop_pool / "manifest.jsonl"


def _manifest_files(paths: config.Paths) -> list[Path]:
    """Every pool's own `crops/<tag>/manifest.jsonl`, the default pool first.

    `list_sessions` reads an ingested session's crop count from its variant manifest, so archiving
    it while filtering only the default manifest left the rows behind and the count unchanged.
    """
    default = _manifest_path(paths)
    out = [default]
    if paths.crops.exists():
        out += sorted(p for p in paths.crops.glob("*/manifest.jsonl")
                      if p.is_file() and p != default)
    return out


def _crop_pools(paths: config.Paths) -> list[Path]:
    """Every crop pool: `crops/<tag>/`, the default one included.

    `_purge_crops_for_frames` has always swept all of them; `_crop_files` looked only at the
    default pool, so archiving an INGESTED session moved its directory and left every one of its
    crops in the pool — the opposite of what `archive_session` documents itself as doing.
    """
    return [p for p in sorted(paths.crops.glob("*")) if p.is_dir()]


def _crop_files(session_id: str, paths: config.Paths) -> list[Path]:
    # Crop filename = "{session_id}_{frame}_{square}.<ext>" in <pool>/<label>/. The extension is
    # NOT pinned: the store moved to WebP (`labeling.CROP_SUFFIX`) and the old PNGs outlive it in
    # the same pools, so a suffix here parks half a session and calls it done.
    return [f for root in _crop_pools(paths) for f in root.glob(f"*/{session_id}_*.*")]


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
    kept = [r for r in read_jsonl(path) if r.get("session_id") != session_id]
    # Atomar: das Manifest ist GETEILT, ein Abbruch mitten im Schreiben traefe jede Session
    # darin, nicht nur die archivierte.
    write_rows(path, kept)


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
            for f in root.glob(f"*/{session_id}_{stem}_*.*"):
                f.unlink()
                removed += 1
    return removed


def _filter_matte_frames(sdir: Path, frame_stems: set[str]) -> int:
    """Drop a trimmed frame's matte row. Keyed by frame alone — the file belongs to one session."""
    path = matte_path(sdir)
    if not path.exists() or not frame_stems:
        return 0
    stamp = stamp_of(path)
    rows = read_jsonl(path)
    kept = [r for r in rows if str(r.get("frame")) not in frame_stems]
    # Bewacht wie die sieben anderen Schreiber: der Alpha-Worker haengt an, waehrend wir filtern.
    write_rows_guarded(path, kept, stamp,
                       what=f"{path}: waehrend des Trimmens angehaengt — trim wiederholen")
    return len(rows) - len(kept)


def _filter_jsonl_frames(path: Path, session_id: str, frame_stems: set[str]) -> int:
    if not path.exists() or not frame_stems:
        return 0
    rows = read_jsonl(path)
    kept = [r for r in rows
            if not (r.get("session_id") == session_id and str(r.get("frame")) in frame_stems)]
    write_rows(path, kept)
    return len(rows) - len(kept)


def list_sessions(paths: config.Paths = config.DATA) -> list[dict]:
    """Active + archived sessions with key data (frames, crops, mode, status)."""
    out: list[dict] = []
    archived_dirs = ([(d.name, d) for d in sorted(paths.sessions_archive.iterdir()) if d.is_dir()]
                     if paths.sessions_archive.exists() else [])
    for (sid, d), archived in ([(x, False) for x in all_sessions(paths)]
                               + [(x, True) for x in archived_dirs]):
            meta = _read_meta(d)
            tag = _variant_tag(meta, sid)
            # Archivieren stempelt die Meta; eine Session, die dabei nicht VERSCHOBEN wurde, ist
            # trotzdem stillgelegt und gehoert aus den Sammel-Verben heraus (2026-08-30-14-33-02
            # riss ueber sein totes Profil jeden `--all`-Lauf mit).
            retired = archived or bool(meta.get("archived_at"))
            if archived:
                n_crops = 0
            elif tag:
                # Ingested sessions are sliced into their variant manifest, not the default one.
                n_crops = _crop_count_from_manifest(
                    sid, paths, manifest=paths.crops / tag / "manifest.jsonl")
            else:
                n_crops = _crop_count_from_manifest(sid, paths)
            out.append({
                "session_id": sid,
                "archived": retired,
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
    src = active_session_dir(sid, paths)
    if not src.exists():
        raise FileNotFoundError(f"Session '{sid}' not found.")
    paths.sessions_archive.mkdir(parents=True, exist_ok=True)
    dst = paths.sessions_archive / sid
    if dst.exists():
        # Was `shutil.rmtree(dst)`. Archiving is the SAFE half of the API, and silently
        # destroying an existing archive of the same id is the one thing it must never do.
        raise FileExistsError(f"'{sid}' is already archived — remove or rename it first.")
    # Der MOVE zuerst: scheitert er (unter Windows reicht ein offener Datei-Handle), war die
    # Session sonst schon leergeraeumt und lag weiter aktiv da — mit ihren Crops im Nichts.
    shutil.move(str(src), str(dst))
    n_crops = _purge_crops(sid, paths)
    for manifest in _manifest_files(paths):     # default + `crops__<tag>.jsonl` (ingested)
        _filter_jsonl(manifest, sid)
    _record_archive_reason(dst, sid, reason, n_crops, paths)
    return {"session_id": sid, "archived": True, "removed_crops": n_crops, "reason": reason}


def _record_archive_reason(dst, sid: str, reason: str, n_crops: int, paths: config.Paths) -> None:
    """Write the reason where a human and a script will each find it."""
    stamp = datetime.now(UTC).isoformat()
    meta = meta_path(dst)
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
    # Roh angehaengt klebte die Zeile an einen abgerissenen Schwanz, und aus dem von `read_jsonl`
    # tolerierten Rest wurde Beschaedigung MITTENDRIN, auf die danach jedes Lesen wirft.
    append_rows(index, [row])


def restore_session(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """Move archived session back to the active folder (then re-slice)."""
    sid = _safe_id(session_id)
    src = paths.sessions_archive / sid
    if not src.exists():
        raise FileNotFoundError(f"Archived session '{sid}' not found.")
    dst = active_session_dir(sid, paths)
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
    # Through `session_dir`, not a hand-built path: an `rg-` id lives under `recordings/`, so
    # composing `sessions/<id>` reported every recording as "not found" — the `archive_session`
    # bug over again.
    sid = _safe_id(session_id)
    target, _archived = session_dir(sid, paths)
    import yaml

    meta = _read_meta(target)
    meta["reviewed"] = bool(reviewed)
    meta_path(target).write_text(
        yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
    return {"session_id": sid, "reviewed": bool(reviewed)}


def deletion_cost(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """What `delete_session` would destroy — counted BEFORE anything is removed.

    The corrections are the only irreplaceable part: crops and manifest rows come back from a
    re-slice, a human's verdict does not.
    """
    sid = _safe_id(session_id)
    target, _ = session_dir(sid, paths)
    frames = len(read_jsonl(log_path(target)))
    crops = sum(1 for m in _manifest_files(paths) for r in iter_jsonl(m) if r.get("session_id") == sid)
    corrections = len(read_jsonl(corrections_path(target)))
    return {"session_id": sid, "frames": frames, "crops": crops, "corrections": corrections}


def delete_session(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """Permanently remove session: directory + crops + manifest + correction lines."""
    sid = _safe_id(session_id)
    target, _ = session_dir(sid, paths)
    n_crops = _purge_crops(sid, paths)
    for manifest in _manifest_files(paths):     # default + `crops__<tag>.jsonl` (ingested)
        _filter_jsonl(manifest, sid)
    # The corrections live in the directory now, so rmtree takes them —
    # no second place to forget.
    shutil.rmtree(target)
    return {"session_id": sid, "deleted": True, "removed_crops": n_crops}


def trim_session(session_id: str, keep_frames: int, paths: config.Paths = config.DATA) -> dict:
    """Keep only the first ``keep_frames`` log entries and delete the later session tail.

    Also removes crops, manifest rows and corrections belonging to removed frames, so a
    previously sliced bad tail cannot leak into training.
    """
    sid = _safe_id(session_id)
    target, _ = session_dir(sid, paths)
    log_file = log_path(target)
    if not log_file.exists():
        raise FileNotFoundError(f"Session '{sid}' has no log.jsonl.")
    stamp = stamp_of(log_file)
    rows = read_jsonl(log_file)
    keep = max(0, min(int(keep_frames), len(rows)))
    kept, removed_rows = rows[:keep], rows[keep:]
    removed_stems = {_frame_stem(r) for r in removed_rows if _frame_stem(r)}

    reject_dir = None
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
        meta_path(reject_dir).write_text(yaml.safe_dump(meta, sort_keys=False), encoding="utf-8")
        _write_log(reject_dir, removed_rows, stamp=None)
    # Erst das bewachte Log, dann die Bilder: ein `Contested` liess sonst den Schwanz im
    # Reject-Ordner, waehrend das Log ihn weiter nannte. Der Reject-Ordner ist bis dahin nur Ablage.
    try:
        _write_log(target, kept, stamp=stamp)
    except BaseException:
        if reject_dir is not None:
            shutil.rmtree(reject_dir, ignore_errors=True)
        raise
    moved_files = 0
    for entry in removed_rows:
        rel = str(entry.get("frame") or "")
        p = _session_frame_path(target, rel)
        if p is not None and p.exists():
            dst = reject_dir / rel if reject_dir is not None else None
            if dst is not None:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(p), str(dst))
                moved_files += 1
    removed_crops = _purge_crops_for_frames(sid, removed_stems, paths)
    removed_manifest_rows = 0
    for manifest in _manifest_files(paths):      # default + every `crops__<tag>.jsonl`
        if manifest.exists():
            removed_manifest_rows += _filter_jsonl_frames(manifest, sid, removed_stems)
    # Also the session's OWN sidecars: a trimmed frame used to keep its matte row
    # forever, because nothing here knew the file existed.
    removed_corrections = _filter_jsonl_frames(corrections_path(target), sid, removed_stems)
    # Dasselbe fuer das ZWEITE menschliche Ledger: Frames heissen nach Quell-Index, ein
    # Re-Export vergibt die Stems neu — ein altes "unbrauchbar" traefe dann ein anderes Bild.
    _filter_jsonl_frames(unusable_cells_path(target), sid, removed_stems)
    removed_matte_rows = _filter_matte_frames(target, removed_stems)
    return {
        "session_id": sid,
        "kept_frames": keep,
        "removed_frames": len(removed_rows),
        "moved_files": moved_files,
        "reject_dir": None if reject_dir is None else str(reject_dir.as_posix()),
        "removed_crops": removed_crops,
        "removed_manifest_rows": removed_manifest_rows,
        "removed_corrections": removed_corrections,
        "removed_matte_rows": removed_matte_rows,
    }
