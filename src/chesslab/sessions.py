"""Session management: list, archive, restore, delete recorded training sessions.

A session lives in ONE directory and carries everything that is only about it: `session.yaml`,
`log.jsonl`, `boards/`, `dirty/`, `mattes/`, `matte.jsonl`, `corrections.jsonl`. An `rg-` id is a
recording (`data/recordings/<id without the prefix>`), anything else a `collect`/`ingest` session
under `data/sessions/`; `session_dir` is the one place that knows. `slice` derives the crops
(`data/crops/<tag>/<label>/<id>_*.webp`) and that pool's own `manifest.jsonl` from it.

- **archive** removes the crops + manifest lines and moves the directory to
  `data/sessions_archive/<id>`. Reversible: `restore` + re-slice.
- **delete** removes the directory and the manifest lines. The corrections go with the directory —
  there is no second place to forget them.
- **geometry repair** (`scan_alignment`, `autofix_corners`, `adopt_corners`, `flag_frame`)
  rewrites `corners` and `unusable` in `log.jsonl`, which `labeling.slice_session` reads.

Headless and testable: all functions accept a `paths` object (default `config.DATA`).
"""

from __future__ import annotations

import json
import logging
import shutil
from datetime import UTC, datetime
from pathlib import Path
from statistics import median

import yaml

from . import config
from .ioutil import append_rows, read_jsonl, stamp_of, write_rows, write_rows_guarded

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
    path = sdir / "matte.jsonl"
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
    (target / "session.yaml").write_text(
        yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
    return {"session_id": sid, "reviewed": bool(reviewed)}


def deletion_cost(session_id: str, paths: config.Paths = config.DATA) -> dict:
    """What `delete_session` would destroy — counted BEFORE anything is removed.

    The corrections are the only irreplaceable part: crops and manifest rows come back from a
    re-slice, a human's verdict does not.
    """
    sid = _safe_id(session_id)
    target, _ = session_dir(sid, paths)
    log = target / "log.jsonl"
    frames = len(read_jsonl(log))
    crops = sum(1 for m in _manifest_files(paths) if m.exists() for line in
                m.read_text(encoding="utf-8").splitlines() if f'"session_id": "{sid}"' in line)
    own = target / "corrections.jsonl"
    corrections = len(read_jsonl(own))
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
    log_path = target / "log.jsonl"
    if not log_path.exists():
        raise FileNotFoundError(f"Session '{sid}' has no log.jsonl.")
    stamp = stamp_of(log_path)
    rows = read_jsonl(log_path)
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
        (reject_dir / "session.yaml").write_text(yaml.safe_dump(meta, sort_keys=False), encoding="utf-8")
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
    removed_corrections = _filter_jsonl_frames(target / "corrections.jsonl", sid, removed_stems)
    # Dasselbe fuer das ZWEITE menschliche Ledger: Frames heissen nach Quell-Index, ein
    # Re-Export vergibt die Stems neu — ein altes "unbrauchbar" traefe dann ein anderes Bild.
    _filter_jsonl_frames(target / "unusable-cells.jsonl", sid, removed_stems)
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


def all_sessions(paths: config.Paths | None = None) -> list[tuple[str, Path]]:
    """`(session_id, directory)` for everything that has a `log.jsonl`, recordings first.

    The inverse of `session_dir`: a recording lives in `recordings/<ts>` and answers to `rg-<ts>`,
    a `collect`/`ingest` session is its own name under `sessions/`. Enumerating only one root is
    how `slice --all` came to see none of the 43 recordings.
    """
    paths = paths or config.DATA
    out = [(f"rg-{d.name}", d) for d in sorted(paths.recordings.iterdir())
           if d.is_dir() and (d / "log.jsonl").exists()] if paths.recordings.exists() else []
    if paths.sessions.exists():
        out += [(d.name, d) for d in sorted(paths.sessions.iterdir())
                if d.is_dir() and (d / "log.jsonl").exists()]
    return out


def active_session_dir(session_id: str, paths: config.Paths) -> Path:
    """Wo eine Session aktiv liegt — ob sie dort schon existiert, sagt das nicht.

    Eine Aufnahme (`rg-`) gehoert unter `recordings/` ohne den Praefix, alles andere unter
    `sessions/`. Wer den Ort selbst zusammensetzt, findet Aufnahmen nicht: `archive_session` tat
    genau das und meldete jede Aufnahme als "not found", waehrend `all_sessions` sie einsammelte
    und `slice --all` ihre Zeilen schnitt (2026-08-30).
    """
    sid = _safe_id(session_id)
    return paths.recordings / sid[3:] if sid.startswith("rg-") else paths.sessions / sid


def session_dir(session_id: str, paths: config.Paths | None = None) -> tuple[Path, bool]:
    """`(directory, archived)` for an active or archived session.

    An `rg-` id is a recording and lives in `recordings/<id without the prefix>`; everything else
    is a `collect`/`ingest` session under `sessions/`. The id is the join key in every manifest,
    so it keeps the prefix the directory dropped.
    """
    # Resolved at CALL time, not bound as a default: the module-level `config.DATA` is what the
    # tests monkeypatch, and a default argument would freeze the pre-patch object at import.
    paths = paths or config.DATA
    safe_sid = _safe_id(session_id)
    active = active_session_dir(safe_sid, paths)
    if active.exists():
        return active, False
    archived = paths.sessions_archive / safe_sid
    if archived.exists():
        return archived, True
    raise FileNotFoundError(f"Session '{safe_sid}' not found.")


class LogRows(list):
    """Die Zeilen von `log.jsonl` samt dem Stempel, unter dem sie gelesen wurden."""

    stamp: tuple[int, int] | None = None


#: Liegt waehrend des Brett-Schreibens da. Ein Export ueberschreibt `boards/` an Ort und Stelle,
#: schreibt `log.jsonl` aber erst zum Schluss — stirbt er dazwischen, beschreiben die Ecken im
#: alten Log nicht mehr die Pixel auf der Platte, und niemand kann das spaeter noch sehen.
EXPORT_MARKER = ".export-running"


class ExportInterrupted(ValueError):
    """Log und Bretter stammen aus zwei Generationen; kein Folgeschritt darf darauf arbeiten."""


def export_interrupted(session_dir: Path) -> bool:
    """Steht ein abgebrochener Export im Weg? Dann sind Log und Bretter nicht dasselbe Alter."""
    return (session_dir / EXPORT_MARKER).is_file()


def refuse_interrupted_export(sdir: Path) -> None:
    """Der eine Pruefpunkt: beide `read_log` rufen ihn, nur die Marker-Setzer lesen daran vorbei."""
    sdir = Path(sdir)
    if export_interrupted(sdir):
        raise ExportInterrupted(
            f"{sdir.name}: an export was interrupted ({EXPORT_MARKER}) — boards and log are from "
            "two generations. Re-run `realgames export-session` or `session rewarp` first.")


def read_log(sdir: Path, *, under_export: bool = False) -> LogRows:
    """Every row of `log.jsonl`, in order — carrying the stamp `_write_log` presents back.

    `under_export=True` only for the steps that set and clear `EXPORT_MARKER` themselves, and for
    a human verdict (`flag_frame`), which the running export carries over (`HUMAN_KEYS`)."""
    if not under_export:
        refuse_interrupted_export(sdir)
    log_path = sdir / "log.jsonl"
    if not log_path.exists():
        raise FileNotFoundError(f"Session '{sdir.name}' has no log.jsonl.")
    stamp = stamp_of(log_path)
    rows = LogRows(read_jsonl(log_path))
    if not rows:
        raise FileNotFoundError(f"Session '{sdir.name}' has no captured frames.")
    rows.stamp = stamp
    return rows



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


def session_profile(sdir: Path, *, allow_standin: bool = True):
    """The calibration profile a session was captured against, or a neutral stand-in.

    The stand-in matters: a session whose profile file is gone must still be reviewable, and a
    board-sized identity quad makes the geometry maths well defined without pretending to be a
    measurement. `allow_standin=False` is for the callers that MEASURE or MUTATE geometry — dort
    ist der Ersatz keine Ansicht, sondern eine erfundene Kamera, und die Zahl landet im Log.
    """
    from . import calibration

    meta_path = sdir / "session.yaml"
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    profile_name = (meta or {}).get("profile")
    if profile_name:
        try:
            return calibration.load_profile(profile_name)
        except FileNotFoundError:
            if not allow_standin:
                raise
    elif not allow_standin:
        raise FileNotFoundError(f"{sdir.name}: session.yaml nennt kein Profil — Geometrie laesst "
                                "sich hier nicht messen")
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


def write_interval_checks(sdir: Path, checks: list[dict]) -> None:
    # war ungestagt. `position_flags.interval_flags` liest jede Zeile mit blankem
    # `json.loads` und nahm bei einer halben Datei den Report ALLER Aufnahmen mit, nicht nur diese.
    from .realgames import INTERVAL_FILE

    write_rows(sdir / INTERVAL_FILE, checks)


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


_FROM_ROWS = object()


def _write_log(sdir: Path, rows: list[dict], *, stamp=_FROM_ROWS) -> None:
    """Atomic replace, and only over the log the rows were read from (`read_log`'s stamp).

    A long run wrote its minutes-old snapshot back over a human `unusable` set meanwhile; now that
    is `Contested`. A checkpointing caller keeps writing: the rows take the stamp they left behind.
    """
    log_path = sdir / "log.jsonl"
    if stamp is _FROM_ROWS:
        if not isinstance(rows, LogRows):
            raise TypeError("_write_log needs the stamp of the read: pass read_log rows or stamp=")
        stamp = rows.stamp
    write_rows_guarded(log_path, rows, stamp, default=str,
                       what=f"{log_path}: waehrend des Laufs geschrieben (ein Urteil?) — "
                            "Lauf wiederholen, nichts ueberschrieben")
    if isinstance(rows, LogRows):
        rows.stamp = stamp_of(log_path)


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
        # Die Ausrichtung beschreibt EINEN Quad. Der neue ist hier nirgends gemessen worden, also
        # bleibt keine Zahl stehen — sonst liest jeder Leser (Badge, `median`, `REPAIRED_KEYS`)
        # die Messung des ERSETZTEN Quads als die dieser Zeile.
        rows[i].pop("align_worst_px", None)
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



def autofix_one(sdir: Path, entry: dict):
    """`(corrected quad or None, offset before, offset after)` for one row."""
    import cv2

    from .alignment import improve_quad

    if not entry.get("corners"):
        return None, float("nan"), float("nan")
    frame = cv2.imread(str(frame_path(sdir, entry)))
    if frame is None:
        return None, float("nan"), float("nan")
    return improve_quad(frame, entry["corners"], session_profile(sdir, allow_standin=False))


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
    prof = session_profile(sdir, allow_standin=False)
    measured = 0
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    # Erst raeumen, dann messen: eine Zeile, die diesmal nicht messbar ist (Hand auf den Rillen,
    # Bild unlesbar), behielt sonst die Zahl des VORIGEN Laufs — und `median`/`max` mischten sie
    # unter die frischen, waehrend `measured` nur die frischen zaehlte.
    for r in rows:
        r.pop("align_worst_px", None)
    for r in rows:
        if not r.get("corners"):
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


#: Measured frames a carried mesh is the median of. One neighbour can itself be a marginal fit;
#: the median of a few costs nothing and cannot be dragged off by a single one.
MESH_CARRY_WINDOW = 5


def _carried_mesh(window: list[dict]) -> dict | None:
    """The per-coefficient median of the measured meshes in `window`, at their COMMON stage.

    A frame whose grid a hand covers gets the geometry of the frames around it — the camera is
    not rebuilt mid-session — but only where every one of them agrees a stage exists, so a
    carried mesh never claims a curvature that was measured on one frame alone.
    """
    if not window:
        return None
    keys = set(window[0]).intersection(*(set(m) for m in window))
    if not {"x", "y"} <= keys:
        return None
    return {k: [round(median([m[k][i] for m in window]), 5) for i in range(9)]
            for k in ("x", "y", "tx", "ty", "cx", "cy") if k in keys}


#: How far one measured line may sit from the session's median before it counts as a mis-lock
#: rather than real movement, as a fraction of ONE cell.
MESH_LINE_TOLERANCE = 0.04
#: What each coefficient of `pos(t) = x + tx*(t-0.5) + cx*(t-0.5)^2` can actually move a line by:
#: |t-0.5| <= 0.5 and its square <= 0.25. Without this the curvature — the term that scatters most —
#: would be judged against a tolerance meant for a straight offset.
MESH_TERM_WEIGHT = {"x": 1.0, "y": 1.0, "tx": 0.5, "ty": 0.5, "cx": 0.25, "cy": 0.25}


def _repair_mesh_outliers(rows: list[dict]) -> tuple[int, bool]:
    """Pull single mis-located grid lines back onto the session's own median. -> (repaired, static)

    `grid_line_fracs` puts a line where it finds an edge, and on the back rank the tall pieces ARE
    the edge. Measured on the 4K turntable clip (2026-08-17): the 8/7 boundary scattered four times
    wider than any other line and stretched rank 7 by 14 %, while the median over 40 frames landed
    every cell within 2 % of an eighth. Nothing downstream notices, because `mesh_from_lines` only
    checks that the lines rise — a plausible line in the wrong place passes every gate.
    """
    meshes = [r["grid_lines"] for r in rows if r.get("grid_lines_source") == "measured"]
    if len(meshes) < 3:
        return 0, False
    tol = MESH_LINE_TOLERANCE / 8.0
    # Per key over the meshes that CARRY it: a session mixes curved with merely tilted frames, and
    # demanding every mesh have `cx` drops the very term that scatters most.
    have = {k: [m for m in meshes if k in m] for k in MESH_TERM_WEIGHT}
    med = {k: [median([m[k][i] for m in ms]) for i in range(9)]
           for k, ms in have.items() if len(ms) >= 3}
    if {"x", "y"} - set(med):
        return 0, False
    # Trust the median only where that ONE line actually holds still: a rig that moved makes every
    # line's typical deviation large, and then its own measurement is the better answer. Judged per
    # line, not per frame — with 9 lines over 6 terms nearly every frame is off somewhere.
    stable = {(k, i) for k in med for i in range(9)
              if median([abs(m[k][i] - med[k][i]) for m in have[k]]) * MESH_TERM_WEIGHT[k] <= tol}
    # "The rig held still" is a statement about the LINES, not the tilts — those stay trivially
    # stable while the whole board slides, and would license a repair against a meaningless median.
    if not any(k in ("x", "y") for k, _ in stable):
        return 0, False

    def off_lines(lines: dict) -> list[tuple[str, int]]:
        return [(k, i) for k, i in stable if k in lines
                if abs(lines[k][i] - med[k][i]) * MESH_TERM_WEIGHT[k] > tol]

    todo = [r for r in rows
            if r.get("grid_lines_source") == "measured" and off_lines(r["grid_lines"])]
    for r in todo:
        for k, i in off_lines(r["grid_lines"]):
            r["grid_lines"][k][i] = round(med[k][i], 5)
        r["grid_lines_source"] = "repaired"
    return len(todo), True


def _fill_mesh_gaps(rows: list[dict]) -> int:
    """Give every row without a measured mesh the one its stable neighbours carry.

    Backwards for the rows before the first measurement: "the frames before" is the normal case,
    but a session that opens with a hand over the board has none, and the camera is the same one.
    Gemessen heisst nicht sauber: 234 von 475 Luecken haetten sonst einen Handframe unter ihren
    fuenf Gebern geerbt, 28 davon als Mehrheit (2026-09-21, 13 Logs).
    """
    from .realgames import hand_seen

    measured = [i for i, r in enumerate(rows) if r.get("grid_lines") and not hand_seen(r)]
    if not measured:
        return 0
    carried = 0
    for i, row in enumerate(rows):
        if row.get("grid_lines") or not row.get("corners"):
            continue
        before = [j for j in measured if j < i][-MESH_CARRY_WINDOW:]
        near = before or measured[:MESH_CARRY_WINDOW]
        mesh = _carried_mesh([rows[j]["grid_lines"] for j in near])
        if mesh is None:
            continue
        row["grid_lines"] = mesh
        row["grid_lines_source"] = "carried"
        carried += 1
    return carried


def missing_source_frames(sdir: Path, rows: list[dict]) -> str | None:
    """Why a step that measures the SOURCE picture cannot run here, or None.

    `scan`, `autofix`, `fit-mesh` and `mark-hands` all fit against the raw frame, and a parked
    session only keeps its boards. Without this they skip every row and report "0 of 2 608
    measured" — a session that looks empty rather than one whose frames are elsewhere.
    """
    want = [r for r in rows if r.get("frame")]
    if want and not any((sdir / r["frame"]).is_file() for r in want[:8]):
        return (f"no source frames in {sdir / 'frames'} — this step fits against the raw picture, "
                f"not the board. Restore them from `data/_parked/frames/{sdir.name}`, or re-run "
                f"`chesslab realgames export-session`, which re-measures all of it from the video.")
    return None


def park_frames_session(session_id: str) -> dict:
    """Move the source frames of every boarded row to `data/_parked/frames/<session>/`.

    The decode is scratch: 3.3 MB per frame against the board's 115 KB, and the session tree stood
    at 82 GB for 12.7 GB of video. Parked, not deleted, and only where the board is actually on
    disk — a frame whose fit failed keeps its source. The video regenerates either.
    """
    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    dest = config.DATA.root / "_parked" / "frames" / session_id
    moved, freed = 0, 0
    for r in rows:
        board = r.get("board")
        frame = sdir / r["frame"] if r.get("frame") else None
        if not board or not (sdir / board).is_file() or frame is None or not frame.is_file():
            continue
        dest.mkdir(parents=True, exist_ok=True)
        freed += frame.stat().st_size
        frame.replace(dest / frame.name)
        moved += 1
    return {"session_id": session_id, "moved": moved, "of": len(rows),
            "freed_mb": round(freed / 1024**2, 1), "parked_to": str(dest)}


def next_touches_of(ply: object, by_ply: dict) -> list[str]:
    """The squares the NEXT ply moves — from the intervals' own FENs, so castling needs no case."""
    from .realgames import changed_squares

    if not isinstance(ply, int):
        return []
    later = [p for p in by_ply if isinstance(p, int) and p > ply]
    if not later:
        return []
    return changed_squares(by_ply[ply][0].get("fen"), by_ply[min(later)][0].get("fen"))


def settle_scan_session(session_id: str) -> dict:
    """Score every cell against its own ply interval's settled board — measure only, drop nothing.

    A hand is not the whole danger: during a move something HAPPENS on the board, and a square that
    already holds the piece the next move puts there still carries the old FEN's label. The
    exporter's `unknown_squares` covers only the next move's footprint; this covers any cell whose
    pixels stopped matching the position they are labelled with.
    """
    from collections import defaultdict
    from concurrent.futures import ProcessPoolExecutor

    from .labeling import _profile_for_session, read_matte, read_session_meta, usable_board
    from .realgames import (
        POOL_WORKERS,
        SETTLE_MIN_FRAMES,
        interval_moves,
        settle_for_ply,
    )

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = _profile_for_session(read_session_meta(sdir), None)
    for r in rows:
        for key in ("settle_dev", "settle_seen", "settle_left"):
            r.pop(key, None)

    by_ply: dict[object, list[dict]] = defaultdict(list)
    # `usable_board`, nicht nur "Datei da": `settle_for_ply` schneidet mit `crop_square` unter der
    # Skala des PROFILS, ein Brett in einer anderen tastet es an ganz anderen Stellen ab — und die
    # Zahl landet als `settle_dev` im Log und steuert die Strittig-Lane.
    for r in rows:
        if usable_board(r, prof) and (sdir / r["board"]).is_file():
            by_ply[r.get("ply")].append(r)
    matte = read_matte(sdir)
    plies = [ply for ply, rs in by_ply.items() if len(rs) >= SETTLE_MIN_FRAMES]
    # NUR die gemessenen Stems: ein `.get(stem, {})` gab jedem Frame einen Schluessel, womit
    # `settle_for_ply`s `unmeasured` per Konstruktion leer war und ein nie gemattetes Hand-Brett
    # als "gemessen, nichts verdeckt" in die gesetzte Stellung einging.
    jobs = [(sdir, by_ply[ply], prof,
             {stem: matte[stem] for r in by_ply[ply]
              if (stem := Path(r["frame"]).stem) in matte},
             next_touches_of(ply, by_ply))
            for ply in plies]
    short = sum(len(rs) for rs in by_ply.values() if len(rs) < SETTLE_MIN_FRAMES)

    if len(jobs) > 1:
        with ProcessPoolExecutor(max_workers=POOL_WORKERS) as pool:
            parts = list(pool.map(settle_for_ply, jobs))
    else:
        parts = [settle_for_ply(j) for j in jobs]
    scored = {stem: got for part in parts for stem, got in (part.get("scores") or {}).items()}
    refs = {int(ply): part["ref"] for ply, part in zip(plies, parts, strict=True)
            if part.get("ref") is not None and ply is not None}

    for r in rows:
        got = scored.get(Path(r["frame"]).stem)
        if got is not None:
            r["settle_dev"], r["settle_seen"] = got["dev"], got["seen"]
            if got["left"]:
                r["settle_left"] = got["left"]
    fens = {int(ply): by_ply[ply][0]["fen"] for ply in plies if ply is not None}
    checks = interval_moves(refs, fens)
    write_interval_checks(sdir, checks)
    backup = backup_log(sdir / "log.jsonl")
    _write_log(sdir, rows)
    return {"session_id": session_id, "scored": len(scored), "of": len(rows),
            "plies": len(jobs), "too_short": short, "backup": backup,
            "left": sum(len(g["left"]) for g in scored.values()),
            "intervals": len(checks), "unseen": sum(1 for c in checks if not c["seen"])}


def write_boards_session(session_id: str) -> dict:
    """Cut every row's stored board from its frame, under the row's CURRENT quad.

    The export writes these as it fits (`realgames.fit_rows_to_grid`); this is the retrofit for
    the sessions that predate the store, and the repair for any step that moves a quad afterwards
    (`autofix`, `adopt`) — a board warped with a quad the log no longer holds is a crop cut wrong.
    """
    from concurrent.futures import ProcessPoolExecutor

    from .labeling import _profile_for_session, read_session_meta
    from .realgames import (
        BOARD_KEYS,
        POOL_MIN_ROWS,
        POOL_WORKERS,
        PROGRESS_EVERY,
        board_from_frame,
        mark_export,
        straighten_boards,
    )

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir, under_export=True)
    prof = _profile_for_session(read_session_meta(sdir), None)
    # The pop below is unconditional, so without this the verb clears every pointer and then writes
    # none back: a parked session loses its store in the log while the boards sit on disk, and the
    # slice error that follows names THIS command as the repair.
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    todo = [r for r in rows if r.get("corners") and r.get("frame")]
    # Only the rows this run rewrites: popping over ALL of them left a corner-less row without its
    # `board` while the webp stayed on disk, and every reader downstream is log-driven.
    # Aufgehoben VOR dem Pop: eine Zeile, deren Brett sich nicht neu schneiden laesst, bekommt
    # ihren alten Zeiger zurueck. Ohne das liegt das `.webp` da und kein log-getriebener Leser
    # findet es je wieder — die Zeile sieht aus wie eine ohne Brett.
    kept = [{k: r[k] for k in BOARD_KEYS if k in r} for r in todo]
    for r in todo:
        for key in BOARD_KEYS:
            r.pop(key, None)
    jobs = [(sdir, r["frame"], r["corners"], prof, bool(r.get("dirty"))) for r in todo]
    if len(jobs) >= POOL_MIN_ROWS:
        with ProcessPoolExecutor(max_workers=POOL_WORKERS) as pool:
            made = list(pool.map(board_from_frame, jobs, chunksize=4))
    else:
        made = [board_from_frame(j) for j in jobs]
    written = 0
    for r, keys, old in zip(todo, made, kept, strict=True):
        if keys is None:
            r.update(old)
            continue
        r.update(keys)
        written += 1
        if written % PROGRESS_EVERY == 0:
            print(f"  {written}/{len(jobs)} frames", flush=True)
    missing = len(jobs) - written
    # A fresh warp is bowed again, so the store's one straightening has to follow the rewrite —
    # otherwise this repair would quietly hand the cutters a board nobody pulls straight any more.
    # Der Flag ist laut `straighten_boards` das EINZIGE zwischen einem abgebrochenen Lauf und
    # einem zweimal gezogenen Store — also muss er unterwegs auf die Platte, nicht erst am Ende.
    backup = backup_log(sdir / "log.jsonl")
    # `mattes=False`: die Bretter sind frisch (gebogen) aus den Frames geschnitten, die Matten
    # daneben liegen vom vorigen Lauf schon gerade — sie ein zweites Mal zu ziehen verschiebt sie.
    with mark_export(sdir):
        pulled = straighten_boards(sdir, rows, checkpoint=lambda: _write_log(sdir, rows),
                                   mattes=False)
        _write_log(sdir, rows)
    return {"session_id": session_id, "written": written, "of": len(rows),
            "missing": missing, "backup": backup, "straightened": pulled["straightened"]}


def rewarp_boards_session(session_id: str) -> dict:
    """Rebuild a store FROM ITS VIDEO, straight, in one resample — the good retrofit.

    `straighten_boards_session` is the other one: it works on boards whose frames are gone and pays
    a second resample for it. Where the video still exists this is strictly better (+57 % Laplacian
    energy in the finished crop, measured 2026-08-21), because the optics and the mesh fold into
    the same map the warp already builds.
    """
    from .calibration import LensModel
    from .labeling import _profile_for_session, read_session_meta
    from .realgames import (
        detect_rotation,
        game_dir,
        mark_export,
        rewarp_boards,
        stream_frames,
        video_path,
    )

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir, under_export=True)
    name = session_id[3:] if session_id.startswith("rg-") else session_id
    candidate = game_dir(name) / "candidate.json"
    if not candidate.is_file():
        raise NothingToDo(f"{session_id}: no candidate.json — nothing says how it was warped")
    video = video_path(name)
    todo = [r for r in rows if r.get("corners") and r.get("frame")]
    wanted = {int(Path(r["frame"]).stem) for r in todo}
    rotate = detect_rotation(video, json.loads(candidate.read_text(encoding="utf-8")), wanted)
    prof = _profile_for_session(read_session_meta(sdir), None)
    # `lens.json` beside the recording, if `:desktop undistort` ever wrote one. No recording carries
    # it today and none needs to — a blind A/B could not tell the corrected boards apart — but the
    # optics fold into the same map for free, so a receipt that IS there is honoured.
    receipt = game_dir(name) / "lens.json"
    lens = LensModel.from_receipt(
        json.loads(receipt.read_text(encoding="utf-8")) if receipt.is_file() else None)
    backup = backup_log(sdir / "log.jsonl")
    # Von hier bis zum Log-Schreiben sind die Bretter neu und das Log alt; der Marker ist das
    # Einzige, was das danach noch sieht (`straighten_boards_session` liest ihn).
    with mark_export(sdir):
        done = rewarp_boards(sdir, todo, prof, frames=stream_frames(video, todo, rotate), lens=lens)
        _write_log(sdir, rows)
    return {"session_id": session_id, "of": len(rows), "backup": backup,
            "lens": lens is not None, **done}


def straighten_boards_session(session_id: str) -> dict:
    """Pull an EXISTING store straight, from the boards themselves — no frames, no re-decode.

    The retrofit for every session written before the store carried its own straightening. It
    needs nothing but `boards/` and the rows' `grid_lines`, which is the point: the source frames
    are deliberately gone. Idempotent through `board_straightened`, so running it twice cannot
    correct twice.
    """
    from .realgames import mark_export, straighten_boards

    sdir, _archived = session_dir(session_id)
    # Der Marker heisst: Bretter neu, Log alt. Dann fehlt `board_straightened` auf Brettern, die
    # schon gerade auf der Platte liegen — und dieser Aufruf zoege sie ein zweites Mal (16 px auf
    # 400). `session rewarp` schneidet sie aus dem Video neu und raeumt den Marker mit auf.
    if export_interrupted(sdir):
        raise NothingToDo(
            f"{session_id}: an export was interrupted ({EXPORT_MARKER}) — the boards may already "
            f"be straight while the log does not say so. Re-run the export or `session rewarp`.")
    rows = read_log(sdir)
    backup = backup_log(sdir / "log.jsonl")
    # Backed up FIRST and rewritten as it goes: the boards are being overwritten in place, and a
    # run that dies with the flags unwritten would leave a later run to correct them twice.
    with mark_export(sdir):
        done = straighten_boards(sdir, rows, checkpoint=lambda: _write_log(sdir, rows))
        _write_log(sdir, rows)
    return {"session_id": session_id, "of": len(rows), "backup": backup, **done}


def fit_mesh_session(session_id: str) -> dict:
    """Measure every frame's 18 grid lines once and store them as `grid_lines`.

    The quad says WHERE the board is, the mesh says where its cells are — without it a slice cuts
    at the nominal eighth and bakes the lens' barrel into the crops. Measured through the profile
    the slice uses, so the fractions describe the warp it actually cuts in. A frame whose grid a
    hand covers takes its neighbours' mesh (`_fill_mesh_gaps`) and says so.
    """
    import cv2

    from .labeling import _profile_for_session, read_session_meta
    from .realgames import grid_line_fracs

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    # The SLICE's profile, not this module's review stand-in: fractions measured through another
    # margin describe a warp nobody cuts.
    prof = _profile_for_session(read_session_meta(sdir), None)
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    measured, stages = 0, {"curved": 0, "tilted": 0}
    for r in rows:
        r.pop("grid_lines", None)
        r.pop("grid_lines_source", None)
        if not r.get("corners"):
            continue
        try:
            frame = cv2.imread(str(frame_path(sdir, r)))
        except (FileNotFoundError, ValueError):
            continue
        if frame is None:
            continue
        mesh = grid_line_fracs(frame, r["corners"], prof.board_size, prof)
        if mesh is None:
            continue
        r["grid_lines"] = mesh
        r["grid_lines_source"] = "measured"
        measured += 1
        stages["curved" if "cx" in mesh else "tilted"] += 1
    repaired, static = _repair_mesh_outliers(rows)
    carried = _fill_mesh_gaps(rows)
    backup = backup_log(sdir / "log.jsonl")
    _write_log(sdir, rows)
    return {"session_id": session_id, "measured": measured, "carried": carried,
            "repaired": repaired, "static_rig": static, "of": len(rows), **stages,
            "backup": backup}


def mark_hands_session(session_id: str) -> dict:
    """Set `dirty` where the board's own grooves say a hand lies on them.

    The exporter's `dirty` is a +/-1 s window around a reviewed commit, not a sensor: measured
    2026-08-16 over 2 228 frames, 424 of them show a plain hand and carry no flag. This is the
    model-free witness (`grid_occlusion`, mirror of `GridOcclusion.kt`) and it only ever ADDS —
    a commit window stays dirty whether or not the grooves survived it.
    """
    import cv2

    from .calibration import crop_border_px, warp_padded
    from .grid_occlusion import hand_squares, missing_edges
    from .imgops import skin_patch
    from .labeling import _profile_for_session, read_session_meta
    from .realgames import move_boards, place_board

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = _profile_for_session(read_session_meta(sdir), None)
    pad = crop_border_px(prof)
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    seen = added = 0
    moves = []
    for r in rows:
        r.pop("hand_squares", None)
        if not r.get("corners"):
            continue
        try:
            frame = cv2.imread(str(frame_path(sdir, r)))
        except (FileNotFoundError, ValueError):
            continue
        if frame is None:
            continue
        padded = warp_padded(frame, prof, r["corners"], pad)
        gray = cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY)
        squares = hand_squares(missing_edges(gray, prof.board_size, pad, white_pov=prof.white_pov))
        if squares:
            # The cells the read accuses, so relabeling can offer them instead of all 64.
            r["hand_squares"] = sorted(squares)
        elif not skin_patch(padded[pad:pad + prof.board_size, pad:pad + prof.board_size],
                            prof.board_size / 8.0, prof.crop.pad_side):
            continue
        seen += 1
        added += not r.get("dirty")
        r["dirty"] = True
        moves.append(place_board(sdir, r))
    backup = backup_log(sdir / "log.jsonl")
    _write_log(sdir, rows)
    move_boards(moves)
    return {"session_id": session_id, "hands": seen, "newly_dirty": added, "of": len(rows),
            "backup": backup}


def mark_hands_all(paths: config.Paths = config.DATA, on_done=None) -> list[dict]:
    """`mark_hands_session` over every session with a log — minutes long, so it reports per session."""
    out = []
    for sid, sdir in all_sessions(paths):
        if not (sdir / "log.jsonl").is_file():
            continue
        try:
            r = mark_hands_session(sid)
        except (FileNotFoundError, ValueError, KeyError) as e:
            r = {"session_id": sid, "error": f"{type(e).__name__}: {e}"}
        out.append(r)
        if on_done is not None:
            on_done(r)
    return out


def repair_mesh_session(session_id: str) -> dict:
    """Run only the outlier repair over the lines a session ALREADY stores — no source frames.

    Re-measuring needs `frames/`, and a parked session keeps only its boards, so the sessions most
    in need of the fix are exactly the ones `fit_mesh_session` can no longer touch.
    """
    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    for r in rows:                       # logs written before the source was recorded
        if r.get("grid_lines") and not r.get("grid_lines_source"):
            r["grid_lines_source"] = "measured"
    if not any(r.get("grid_lines") for r in rows):
        return {"session_id": session_id, "error": "no grid_lines stored — run fit-mesh first"}
    repaired, static = _repair_mesh_outliers(rows)
    backup = backup_log(sdir / "log.jsonl") if repaired else None
    if repaired:
        _write_log(sdir, rows)
    return {"session_id": session_id, "repaired": repaired, "static_rig": static,
            "of": len(rows), "backup": backup}


def repair_mesh_all(paths: config.Paths = config.DATA, on_done=None) -> list[dict]:
    """`repair_mesh_session` over every active session that has a log."""
    out = []
    for sid, sdir in all_sessions(paths):
        if not (sdir / "log.jsonl").is_file():
            continue
        try:
            r = repair_mesh_session(sid)
        except (FileNotFoundError, ValueError, KeyError) as e:
            r = {"session_id": sid, "error": str(e)}
        out.append(r)
        if on_done:
            on_done(r)
    return out


def fit_mesh_all(paths: config.Paths = config.DATA, on_done=None) -> list[dict]:
    """`fit_mesh_session` over every active session that has a log — the sweep, one at a time.

    `on_done` is called per finished session, because a corpus-wide sweep runs for many minutes
    and a caller that only speaks at the end cannot say where it stands or what failed.
    """
    out = []
    for sid, sdir in all_sessions(paths):
        if not (sdir / "log.jsonl").is_file():
            continue
        try:
            r = fit_mesh_session(sid)
        except (FileNotFoundError, ValueError, KeyError) as e:
            r = {"session_id": sid, "error": f"{type(e).__name__}: {e}"}
        out.append(r)
        if on_done is not None:
            on_done(r)
    return out

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
    prof = session_profile(sdir, allow_standin=False)
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
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
        # `after` ist an DIESEM Frame gegen den neuen Quad gemessen — dieselbe Groesse, die
        # `fit_rows_to_grid` schreibt. Ohne sie behielt die Zeile die Zahl, die den Fix ausloeste.
        rows[i]["align_worst_px"] = round(float(after), 2)
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
        src_idx = int(from_index)
        if src_idx < 0 or src_idx >= len(rows):
            raise ValueError(f"Index {src_idx} out of range (0-{len(rows) - 1}).")
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
    # Ein Urteil, keine Ableitung aus den Brettern: der laufende Export traegt es hinueber.
    rows = read_log(sdir, under_export=True)
    if idx < 0 or idx >= len(rows):
        raise ValueError(f"Index {idx} out of range (0-{len(rows) - 1}).")
    rows[idx]["unusable"] = bool(unusable)
    # Gesichert wie jede andere Schreibfunktion dieses Abschnitts: es ist ein
    # Lesen-Aendern-Schreiben des GANZEN Logs, und eine dabei verlorene Zeile ist sonst weg.
    backup = backup_log(sdir / "log.jsonl")
    _write_log(sdir, rows)
    return {"session_id": session_id, "index": idx, "unusable": bool(unusable), "backup": backup}
