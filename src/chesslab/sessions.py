"""Session management: list, archive, restore, delete recorded training sessions.

`collect` creates a directory per session under `data/sessions/<id>` (frames + log.jsonl +
session.yaml); `slice` produces crops (`data/squares/<label>/<id>_*.png`) and manifest
lines from them. These functions keep these three locations consistent:

- **archive** removes the crops + manifest lines (session no longer counts toward the dataset)
  and moves the session directory to `data/sessions_archive/<id>`. Reversible:
  `restore` + re-slice. Corrections are preserved.
- **delete** permanently removes directory, crops, manifest and correction lines.
- **geometry repair** (`scan_alignment`, `autofix_corners`, `adopt_corners`, `flag_frame`)
  rewrites the `corners` and `unusable` fields in `log.jsonl`, which `labeling.slice_session`
  reads to warp every crop.

Headless and testable: all functions accept a `paths` object (default `config.DATA`).
"""

from __future__ import annotations

import json
import logging
import os
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


# ---------------------------------------------------------------------------
# Geometry repair: reading and rewriting a session's `corners` / `unusable`
#
# `labeling.slice_session` warps every crop through the `corners` of its log row, so these
# fields decide whether a crop sits on its square or straddles the groove. Two rules run
# through everything below, and both exist because breaking them does damage:
#
#   - a frame already inside tolerance is NEVER touched — inside the noise band the fit
#     chases measurement noise and makes it worse;
#   - a correction that does not improve its own frame is discarded (`alignment.improve_quad`
#     enforces this itself and returns None).
#
# Every write backs up `log.jsonl` first and records HOW the geometry got there
# (`corners_source`), because analysis later has to be able to tell computed geometry from
# measured geometry.
#
# This lived in the web router until the web UI was retired. It is the machinery that fixed
# the corpus-wide geometry error in `docs/data-pipeline.md` §12 — the one that had been
# holding the empty-crop margin for months — and it had no CLI.
# ---------------------------------------------------------------------------


class NothingToDo(ValueError):
    """The request is well formed, but nothing would change.

    Distinct from a plain `ValueError` because the two deserve different answers: a bad scope is
    a mistake, while "every row already has corners" is a no-op the caller may well have meant.
    The web router maps this to 409 and everything else to 400.
    """


def session_dir(session_id: str) -> tuple[Path, bool]:
    """`(directory, archived)` for an active or archived session."""
    safe_sid = _safe_id(session_id)
    active = config.DATA.sessions / safe_sid
    if active.exists():
        return active, False
    archived = config.DATA.sessions_archive / safe_sid
    if archived.exists():
        return archived, True
    raise FileNotFoundError(f"Session '{safe_sid}' not found.")


def read_log(sdir: Path) -> list[dict]:
    """Every row of `log.jsonl`, in order."""
    log_path = sdir / "log.jsonl"
    if not log_path.exists():
        raise FileNotFoundError(f"Session '{sdir.name}' has no log.jsonl.")
    rows = [json.loads(line) for line in log_path.read_text(encoding="utf-8").splitlines()
            if line.strip()]
    if not rows:
        raise FileNotFoundError(f"Session '{sdir.name}' has no captured frames.")
    return rows


def log_entry(session_id: str, idx: int) -> tuple[Path, bool, list[dict], int, dict]:
    """One row of a session's log, with the index CLAMPED into range."""
    sdir, archived = session_dir(session_id)
    rows = read_log(sdir)
    clamped = max(0, min(idx, len(rows) - 1))
    return sdir, archived, rows, clamped, rows[clamped]


def frame_path(sdir: Path, entry: dict) -> Path:
    """The image a log row points at, refusing anything outside the session directory."""
    rel = str(entry.get("frame") or "")
    if not rel:
        raise FileNotFoundError("Log entry has no frame path.")
    path = (sdir / rel).resolve()
    root = sdir.resolve()
    if root not in path.parents and path != root:
        raise ValueError("Invalid frame path in session log.")
    if not path.exists():
        raise FileNotFoundError(f"Frame '{rel}' not found.")
    return path


def session_profile(sdir: Path):
    """The calibration profile a session was captured against, or a neutral stand-in.

    The stand-in matters: a session whose profile file is gone must still be reviewable, and a
    board-sized identity quad makes the geometry maths well defined without pretending to be a
    measurement.
    """
    from . import calibration

    meta_path = sdir / "session.yaml"
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    profile_name = (meta or {}).get("profile")
    if profile_name:
        try:
            return calibration.load_profile(profile_name)
        except FileNotFoundError:
            pass
    side = float(config.DEFAULT_BOARD_SIZE)
    corners = [[0.0, 0.0], [side, 0.0], [side, side], [0.0, side]]
    return calibration.CalibrationProfile(
        profile=profile_name or "review",
        camera_index=-1,
        frame_size=(0, 0),
        board_size=config.DEFAULT_BOARD_SIZE,
        image_corners=corners,
        homography=calibration.compute_homography(corners, config.DEFAULT_BOARD_SIZE),
        white_pov=True,
        crop=calibration.CropParams.default(config.DEFAULT_BOARD_SIZE),
    )


def backup_log(log_path: Path) -> str:
    """Copy `log.jsonl` aside before rewriting it.

    `data/` is gitignored and unrecoverable; the project rule is park, never delete — so a
    backup is never overwritten either.
    """
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = log_path.with_name(f"{log_path.name}.bak.{stamp}")
    n = 1
    while dest.exists():
        dest = log_path.with_name(f"{log_path.name}.bak.{stamp}-{n}")
        n += 1
    shutil.copy2(log_path, dest)
    return dest.name


def _write_log(sdir: Path, rows: list[dict]) -> None:
    """Atomic replace: a crash mid-write must never leave a truncated log."""
    log_path = sdir / "log.jsonl"
    tmp = log_path.with_suffix(".jsonl.tmp")
    tmp.write_text("".join(json.dumps(r, ensure_ascii=False, default=str) + "\n" for r in rows),
                   encoding="utf-8")
    os.replace(tmp, log_path)


def write_corner_rows(sdir: Path, rows: list[dict], indices: list[int], quad, *,
                      source: str, from_index: int | None) -> dict:
    """Write `quad` into the given rows and record HOW it got there.

    Provenance is the point: `corners_source` says `hand`, `adopted` or `auto-corrected`
    (absent = detected by the capture pipeline, which is what every original row is),
    `corners_from` names the row the quad came from, `corners_set_at` when. Analysis later has
    to be able to exclude computed geometry, and this session corpus already had one
    unanswerable question of exactly this kind (which camera took it) because nobody wrote it
    down.
    """
    log_path = sdir / "log.jsonl"
    backup = backup_log(log_path)
    stamp = datetime.now(UTC).isoformat()
    for i in indices:
        # Keep what is being replaced: it is what a before/after view compares against, and
        # without it the previous geometry only survives in a backup file nobody reads.
        if rows[i].get("corners"):
            rows[i]["corners_prev"] = rows[i]["corners"]
        rows[i]["corners"] = [[float(x), float(y)] for x, y in quad]
        rows[i]["corners_source"] = source
        rows[i]["corners_set_at"] = stamp
        if from_index is not None:
            rows[i]["corners_from"] = int(from_index)
        else:
            rows[i].pop("corners_from", None)
    _write_log(sdir, rows)
    return {"ok": True, "changed": len(indices), "indices": indices, "backup": backup,
            "corners_source": source, "from_index": from_index,
            "corners": [[float(x), float(y)] for x, y in quad]}


def corner_targets(rows: list[dict], scope: str, index: int, overwrite: bool) -> list[int]:
    """Which rows a write applies to — always an explicit, countable set.

    `frame` = this row only, `missing` = every row without corners, `all` = every row. A row
    that ALREADY has corners is only touched with `overwrite`, because a session like
    20260730-131607 has 7 good rows and 1 bad one and the 7 must stay measured.
    """
    if scope == "frame":
        candidates = [index]
    elif scope == "missing":
        candidates = [i for i, r in enumerate(rows) if not r.get("corners")]
    elif scope == "all":
        candidates = list(range(len(rows)))
    else:
        raise ValueError(f"Unknown scope {scope!r} (frame | missing | all).")
    if not candidates:
        raise NothingToDo("Every row in this session already has corners — nothing to "
                          "repair. Use scope=all with overwrite=true to replace them.")
    targets = [i for i in candidates if overwrite or not rows[i].get("corners")]
    if not targets:
        blocked = [i for i in candidates if rows[i].get("corners")]
        raise NothingToDo(f"Rows {blocked} already have corners — nothing to write. "
                          "Send overwrite=true (CLI: --overwrite) to replace measured "
                          "geometry.")
    return targets


ADOPT_TOL_PX = 2.0
"""ArUco centres of a tripod-static board scatter well under a pixel."""


def adopt_candidate(rows: list[dict]) -> dict | None:
    """The quad to adopt: the one the MOST other rows agree with, earliest row wins a tie.

    Most-agreed rather than nearest, so a single outlier row — a board that got bumped in one
    frame — cannot become the template for a whole session. `n_same` has to mean something, so
    agreement is within [ADOPT_TOL_PX] rather than exact: equality would split rows that differ
    by 0.05 px.
    """
    have = [(i, r["corners"]) for i, r in enumerate(rows)
            if r.get("corners") and len(r["corners"]) == 4]
    if not have:
        return None

    def close(a, b) -> bool:
        return all(abs(float(pa[k]) - float(pb[k])) <= ADOPT_TOL_PX
                   for pa, pb in zip(a, b, strict=True) for k in (0, 1))

    counts = [(sum(1 for _j, q in have if close(c, q)), -i, i, c) for i, c in have]
    n_same, _neg, idx, quad = max(counts)
    return {"from_index": idx, "corners": quad, "n_same": n_same,
            "source_row_source": rows[idx].get("corners_source", "detected")}


def geometry_version(sdir: Path) -> int:
    """A token that changes whenever the session's geometry could have changed."""
    try:
        return (sdir / "log.jsonl").stat().st_mtime_ns
    except OSError:
        return 0


def autofix_one(sdir: Path, entry: dict):
    """`(corrected quad or None, offset before, offset after)` for one row."""
    import cv2

    from .alignment import improve_quad

    if not entry.get("corners"):
        return None, float("nan"), float("nan")
    frame = cv2.imread(str(frame_path(sdir, entry)))
    if frame is None:
        return None, float("nan"), float("nan")
    return improve_quad(frame, entry["corners"], session_profile(sdir))


def scan_alignment(session_id: str) -> dict:
    """Measure every frame's worst square offset once and store it as `align_worst_px`.

    Stored rather than computed on demand because measuring one frame costs a warp plus two
    Sobel passes — fine for a single review step, 40 s for a 534-frame session. Written into
    `log.jsonl` so the count, any badge and any later analysis all read the same number, and so
    a session carries its own geometry verdict.
    """
    import cv2

    from .alignment import worst_offset

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = session_profile(sdir)
    measured = 0
    for r in rows:
        if not r.get("corners"):
            r.pop("align_worst_px", None)
            continue
        frame = cv2.imread(str(frame_path(sdir, r)))
        if frame is None:
            continue
        w = worst_offset(frame, r["corners"], prof)
        if w == w:
            r["align_worst_px"] = round(float(w), 2)
            measured += 1
    backup = backup_log(sdir / "log.jsonl")
    _write_log(sdir, rows)
    vals = sorted(r["align_worst_px"] for r in rows if r.get("align_worst_px") is not None)
    return {"session_id": session_id, "measured": measured, "of": len(rows),
            "median": vals[len(vals) // 2] if vals else None,
            "max": vals[-1] if vals else None, "backup": backup}


def autofix_corners(session_id: str, max_off: float = 9.0) -> dict:
    """Re-fit every frame whose worst square sits further than `max_off` px off the grid.

    Frames already within tolerance are NOT touched, and a correction that does not improve its
    own frame is discarded — see this section's header for why both matter. Changed rows are
    marked `corners_source: "auto-corrected"` so measured and computed stay distinguishable.
    """
    import cv2

    from .alignment import worst_offset

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = session_profile(sdir)
    targets = []
    for i, r in enumerate(rows):
        if not r.get("corners"):
            continue
        frame = cv2.imread(str(frame_path(sdir, r)))
        if frame is None:
            continue
        w = worst_offset(frame, r["corners"], prof)
        if w == w and w > max_off:
            targets.append(i)
    changed, refused, gains = [], 0, []
    for i in targets:
        quad, before, after = autofix_one(sdir, rows[i])
        if quad is None:
            refused += 1
            continue
        rows[i]["corners_prev"] = rows[i]["corners"]
        rows[i]["corners"] = quad
        rows[i]["corners_source"] = "auto-corrected"
        changed.append(i)
        gains.append((round(before, 1), round(after, 1)))
    # ONE shape, whatever happened. The router version returned a shorter dict when nothing
    # changed, which no caller noticed because the UI read it defensively — and which broke the
    # first CLI call that trusted the keys to be there.
    backup = None
    if changed:
        backup = backup_log(sdir / "log.jsonl")
        stamp = datetime.now(UTC).isoformat()
        for i in changed:
            rows[i]["corners_set_at"] = stamp
        _write_log(sdir, rows)
    return {"session_id": session_id, "checked": len(rows), "over_threshold": len(targets),
            "changed": len(changed), "refused": refused, "indices": changed,
            "gains": gains, "backup": backup, "max_off": max_off}


def adopt_corners(session_id: str, from_index: int | None = None, scope: str = "missing",
                  overwrite: bool = False) -> dict:
    """Copy a quad that WAS detected in this session into the rows that have none.

    The common repair: one frame in a static sweep lost a marker while the other seven kept it.
    No clicking, and the geometry stays measured — but the rows say `adopted`, not `detected`,
    and name the row it came from.
    """
    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    if from_index is None:
        cand = adopt_candidate(rows)
        if cand is None:
            raise ValueError("No row in this session has corners — there is nothing to adopt. "
                             "Place the box by hand instead.")
        src_idx, quad = cand["from_index"], cand["corners"]
    else:
        src_idx = max(0, min(int(from_index), len(rows) - 1))
        quad = rows[src_idx].get("corners")
        if not quad:
            raise ValueError(f"Row {src_idx} has no corners to adopt.")
    targets = [i for i in corner_targets(rows, scope, src_idx, overwrite) if i != src_idx]
    if not targets:
        raise NothingToDo("Only the source row itself would change — nothing to do.")
    res = write_corner_rows(sdir, rows, targets, quad, source="adopted", from_index=src_idx)
    res.update(session_id=session_id, scope=scope)
    return res


def flag_frame(session_id: str, idx: int, unusable: bool) -> dict:
    """Set or clear the `unusable` flag on one frame; `slice` skips flagged frames.

    A REVIEW action: this is a read-modify-write of the whole log, so doing it while the same
    session is actively being recorded could drop a concurrently appended line.
    """
    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    if idx < 0 or idx >= len(rows):
        raise ValueError(f"Index {idx} out of range (0-{len(rows) - 1}).")
    rows[idx]["unusable"] = bool(unusable)
    _write_log(sdir, rows)
    return {"session_id": session_id, "index": idx, "unusable": bool(unusable)}
