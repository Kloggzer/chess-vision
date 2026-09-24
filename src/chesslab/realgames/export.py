"""`export-session`: ein bestaetigter Kandidat wird zur Session, die `slice` schneiden kann."""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor
from contextlib import nullcontext
from datetime import UTC, datetime
from pathlib import Path

import cv2

from .. import config
from ..calibration import load_profile
from ..ioutil import read_jsonl, write_rows
from ..session_store.boards import move_boards, place_board
from ..session_store.log import (
    EXPORT_PROFILE,
    carry_human_verdicts,
    mark_export,
    refuse_orphaned_verdicts,
    write_session,
)
from ..session_store.names import log_path
from ..session_store.recording import (
    corrected_frames,
    game_dir,
    is_archived,
    load_candidate,
    reported_dirty,
    video_fps,
    video_path,
)
from .boards import FIT_FAILED, FIT_KEPT, FIT_SOURCE, fit_rows_to_grid, rewarp_boards
from .chunks import EXPORT_WORKERS, fit_rows_parallel, rewarp_parallel
from .decode import decode_frames, detect_rotation, disk_frames, static_quad
from .settle import measure_settle
from .timeline import known_segments, plan_rows, plan_scanned, yield_lines


def adopt_reported_dirty(name: str) -> dict:
    """Put the hands a human reported into the log NOW: marking stored rows `occluded` lets the
    matte RESCUE them, where coverage on a `clean` row would condemn them.
    """
    from ..session_store.log import _write_log, backup_log, read_log
    from ..session_store.paths import read_session_meta

    session_dir = game_dir(name)
    meta = read_session_meta(session_dir)
    wanted = reported_dirty(meta["session_id"])
    rows = read_log(session_dir)
    stamp = datetime.now(UTC).isoformat()
    changed, moves = [], []
    retracted = 0
    for row in rows:
        stem = Path(row.get("board") or row["frame"]).stem
        if not stem.isdigit():
            continue
        # Ein Widerruf nimmt nur zurueck, was eine Meldung gesetzt hat — nie ein Scan-Urteil.
        if int(stem) not in wanted and row.get("dirty_source") == "reported":
            for key in ("dirty", "dirty_reason", "dirty_source", "dirty_set_at"):
                row.pop(key, None)
            retracted += 1
        elif int(stem) in wanted and not row.get("dirty"):
            row.update(dirty=True, dirty_reason="occluded", dirty_source="reported", dirty_set_at=stamp)
        else:
            continue
        moves.append(place_board(session_dir, row))
        changed.append(stem)
    if not changed:
        return {"reported": len(wanted), "changed": 0, "set": 0, "retracted": 0, "stems": [],
                "backup": None}
    backup = backup_log(log_path(session_dir))
    _write_log(session_dir, rows)
    move_boards(moves)
    return {"reported": len(wanted), "changed": len(changed), "set": len(changed) - retracted,
            "retracted": retracted, "stems": changed, "backup": backup}


def ensure_export_profile(profile: str, candidate: dict) -> Path:
    """The profile the crops will be cut through, taken from the candidate — never invented (a
    default pad was a domain shift). `out_size` is the pool's 128; an existing profile is never
    touched.
    """
    from ..calibration import CalibrationProfile, CropParams, compute_homography, profile_path

    path = profile_path(profile)
    if path.exists():
        return path
    geom = candidate["geometry"]
    board_size = int(geom["board_size"])
    crop = (candidate.get("source") or {}).get("crop") or {}
    prof = CalibrationProfile(
        profile=profile,
        camera_index=-1,
        frame_size=(int(geom["frame_size"][0]), int(geom["frame_size"][1])),
        board_size=board_size,
        image_corners=[[float(x), float(y)] for x, y in geom["corners"]],
        homography=compute_homography(geom["corners"], board_size, geom.get("margin", 0.0)),
        white_pov=True,
        crop=CropParams(
            cell=board_size / 8.0,
            pad_side=float(crop.get("pad_side", config.CROP.pad_side)),
            out_size=(config.CROP.out_w, config.CROP.out_h),
        ),
        margin=float(geom.get("margin", 0.0)),
        source=candidate.get("video"),
    )
    print(f"[OK] calibration profile '{profile}' created from the candidate geometry ({path}).")
    return prof.save(path)


"""Per-row geometry a REPAIR step owns, which the exporter must never write back over.

`chesslab session scan|autofix` re-fits each frame's quad against the board's own grid and
records the verdict; the exporter only ever knew the candidate's single median quad. Measured on
the two exported sessions (2026-08-09): the repair had turned 1 quad into 11 and 7, moving corners
by up to 16 px — about a seventh of a cell, well past the 4 % criterion — and a plain re-export
silently put the median back. Since re-running the export is now the way to pick up a planner fix,
it has to be non-destructive, so these keys are carried over per frame from the log on disk.
"""
REPAIRED_KEYS = ("corners", "corners_source", "corners_prev", "corners_set_at", "align_worst_px")


def carry_repaired_geometry(session_dir: Path, rows: list[dict]) -> int:
    """Copy the repair's per-frame geometry onto freshly planned rows. Returns rows carried."""
    log = log_path(session_dir)
    if not log.is_file():
        return 0
    old = {Path(r["frame"]).stem: r for r in read_jsonl(log)}
    carried = 0
    for row in rows:
        previous = old.get(Path(row["frame"]).stem)
        if previous is None:
            continue
        # Repair evidence is a re-fitted quad OR a measured offset (`scan` does not set
        # `corners_source`). A pristine row carries neither and lets a re-measured candidate
        # through.
        if previous.get("corners_source") == "realgame-export" and previous.get("align_worst_px") is None:
            continue
        for key in REPAIRED_KEYS:
            if key in previous:
                row[key] = previous[key]
        carried += 1
    return carried


def export_session(
    name: str,
    *,
    quiet_margin_s: float = 1.0,
    every: int = 3,
    per_position: int | None = 8,
    dirty_per_position: int = 8,
    dirty: bool = True,
    measure: bool = True,
    fit: bool = True,
    report_only: bool = False,
    workers: int = EXPORT_WORKERS,
    no_scan: bool = False,
    drop_verdicts: bool = False,
) -> dict:
    """A confirmed candidate is cut into its own `data/recordings/<name>/`, and reports its worth."""
    with (ProcessPoolExecutor(max_workers=workers) if workers > 1 and not report_only
          else nullcontext(None)) as executor:
        return _export_session(name, quiet_margin_s=quiet_margin_s, every=every,
                               per_position=per_position, dirty_per_position=dirty_per_position,
                               dirty=dirty, measure=measure, fit=fit, report_only=report_only,
                               no_scan=no_scan, workers=workers, executor=executor,
                               drop_verdicts=drop_verdicts)


def ensure_scan(name: str, *, rotate, extra=(), read_only: bool = False,
                progress: bool = True) -> list[dict]:
    """Der Frame-Scan, notfalls frisch: ohne ihn lassen die Margin-Fenster 23 % Haende durch, also
    bricht hier ab, was scheitert. `read_only` fuer `--report-only`.
    """
    from .. import framescan

    stale = framescan.scan_is_stale(name, extra=extra)
    if stale is None:
        return framescan.read_scan(name)
    if read_only:
        raise ValueError(f"{name}: der Bericht braucht einen gueltigen Frame-Scan ({stale}). "
                         f"`chesslab realgames scan-video {name}` — ein Bericht erzeugt keinen.")
    print(f"  kein gueltiger Frame-Scan ({stale}) — wird jetzt gemessen, vor der Auswahl")
    try:
        res = framescan.scan_video(name, rotate=rotate, extra=extra, resume=False,
                                   progress=progress)
    except (OSError, ValueError, KeyError, RuntimeError) as e:
        raise ValueError(
            f"{name}: der Frame-Scan ist gescheitert ({type(e).__name__}: {e}). Der Export bricht "
            f"ab, statt auf die Margin-Fenster zurueckzufallen — die lassen 23 % Haende durch. "
            f"Mit `--no-scan` laesst sich der alte Weg ausdruecklich erzwingen."
        ) from e
    print(f"  {res['frames']} Frames gemessen, {res['hands']} mit einer Hand")
    return framescan.read_scan(name)


def correction_ledger(name: str, prefer: set[int], rows: list[dict],
                      scan: list[dict], candidate: dict, rejected=()) -> dict:
    """Welche korrigierten Bilder der Neuplan uebernimmt, und warum die anderen nicht: gezaehlt
    gegen die ENDGUELTIGEN Zeilen, denn `prefer` verspricht nichts.
    """
    kept = {int(Path(r["frame"]).stem): r for r in rows}
    measured = {int(r["idx"]) for r in scan}
    spans = [(s["start"], s["end"]) for s in known_segments(candidate)]
    out = []
    for idx in sorted(prefer):
        row = kept.get(idx)
        if row is not None:
            out.append({"idx": idx, "kept": True, "dirty_reason": row.get("dirty_reason")})
            continue
        if idx in rejected:
            why = "Brett verworfen (zu dunkel oder unscharf)"
        elif idx not in measured:
            why = "nicht gemessen"
        elif not any(lo <= idx < hi for lo, hi in spans):
            why = "ausserhalb jedes Ply-Intervalls"
        else:
            why = "von der Auswahl nicht gezogen"
        out.append({"idx": idx, "kept": False, "why": why})
    path = config.DATA.reports / f"export-corrections-{name}.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    write_rows(path, out)
    from collections import Counter

    lost = [r for r in out if not r["kept"]]
    return {"kept": len(out) - len(lost), "lost": len(lost), "path": path,
            "why": Counter(r["why"] for r in lost)}


def _export_session(name: str, *, quiet_margin_s: float, every: int, per_position: int | None,
                    dirty_per_position: int, dirty: bool, measure: bool, fit: bool,
                    report_only: bool, no_scan: bool, workers: int, executor,
                    drop_verdicts: bool = False) -> dict:
    """One export, sharing its worker processes across settle, grid fit and board encoding."""

    if is_archived(name):
        raise ValueError(
            f"{name}: archived in the UI — un-archive it there if it belongs in the corpus")
    candidate = load_candidate(name)
    if not candidate.get("confirmed"):
        raise ValueError(f"{name}: not confirmed — run `chesslab realgames confirm {name}` first")
    margin_frames = int(round(quiet_margin_s * video_fps(candidate)))
    settle = None
    rotation = None
    if not report_only:
        # Detected ONCE, before the settle pass: without the rotation a phone decode sat below
        # SETTLE_MIN_DELTA and the measurement silently returned nothing.
        ensure_export_profile(EXPORT_PROFILE, candidate)
        rotation = detect_rotation(
            video_path(name), candidate, {int(m["frame"]) for m in candidate["moves"]}
        )
        if rotation is not None:
            names = {cv2.ROTATE_90_CLOCKWISE: "90° cw", cv2.ROTATE_90_COUNTERCLOCKWISE: "90° ccw", cv2.ROTATE_180: "180°"}
            print(f"  decode rotation: {names[rotation]} (cv2 and the candidate geometry disagree on orientation)")
    if measure and not report_only:
        settle = measure_settle(video_path(name), candidate, load_profile(EXPORT_PROFILE),
                                rotate=rotation, workers=workers, executor=executor)
        found = sum(len(v) for v in settle.values())
        print(f"  settle measured for {found} squares over {len(settle)} plies")
    # VOR dem Scan, damit korrigierte Frames als `extra` mitgemessen werden, auch neben dem
    # Dreier-Raster.
    prefer = corrected_frames(name)
    reported = reported_dirty(f"rg-{name}")
    scan = [] if no_scan else ensure_scan(name, rotate=rotation, extra=prefer | reported,
                                          read_only=report_only)
    if scan:
        rows = plan_scanned(candidate, scan, margin_frames=margin_frames, settle=settle,
                            per_position=per_position or 8, dirty_per_position=dirty_per_position,
                            prefer=prefer, reported=reported, dirty=dirty,
                            white_pov=load_profile(EXPORT_PROFILE).white_pov)
        print(f"  {len(scan)} measured frames, {len(prefer)} of them already corrected, "
              f"{len(reported)} reported dirty by hand — "
              f"picking on data instead of on a {quiet_margin_s}s margin")
        if prefer:
            from .. import framescan as _fs

            rejected = _fs.blurred_indices(scan) | _fs.dark_indices(scan)
            book = correction_ledger(name, prefer, rows, scan, candidate, rejected=rejected)
            why = ", ".join(f"{n}x {w}" for w, n in book["why"].most_common()) or "—"
            print(f"  Korrekturen: {book['kept']} uebernommen, {book['lost']} nicht ({why}) "
                  f"-> {book['path']}")
    else:
        print(f"[WARN] {name}: --no-scan — planning on the margin windows, which admitted "
              f"23 % hands. This is the explicitly chosen path, not a fallback.")
        rows = plan_rows(candidate, margin_frames=margin_frames, every=every, dirty=dirty,
                         settle=settle, per_position=per_position)
    if not rows:
        # `confirmed: true` with EMPTY `reviewed_plies` is reachable (confirmed before the PGN
        # existed); blaming the margin sent the user hunting a timing problem.
        if not (candidate.get("reviewed_plies") or ()):
            raise ValueError(
                f"{name}: confirmed, but not one ply is reviewed — re-run the confirmation "
                f"(its {len(candidate['moves'])} moves have nothing vouching for them)")
        raise ValueError(f"{name}: no reviewed interval survives a {quiet_margin_s}s margin")
    session_dir = game_dir(name)
    if not report_only and not drop_verdicts and log_path(session_dir).is_file():
        # Frueh, solange `boards/` unberuehrt ist; `write_session` prueft zum Schluss erneut.
        refuse_orphaned_verdicts(carry_human_verdicts(read_jsonl(log_path(session_dir)),
                                                      [dict(r) for r in rows]), False)
    if not report_only:
        # Von hier bis zum Log-Schreiben sind die Bretter neu und das Log alt; ohne Marker sieht das
        # niemand.
        with mark_export(session_dir):
            # Frames hit the disk only for an UNDISTORTED set or `--no-fit`; everything else goes
            # video -> board.
            on_disk = (session_dir / "frames" / "lens.json").is_file() or not fit
            if on_disk:
                arrived = decode_frames(
                    video_path(name),
                    {int(Path(r["frame"]).stem) for r in rows},
                    session_dir / "frames",
                    rotate=rotation,
                )
                rows = [r for r in rows if int(Path(r["frame"]).stem) in arrived]
            if (session_dir / "frames" / "lens.json").is_file():
                # Undistorting MOVES the board, so re-measure on the frames there and carry no old
                # geometry.
                quad = static_quad(sorted((session_dir / "frames").glob("[0-9]*.png")),
                                   load_profile(EXPORT_PROFILE))
                for row in rows:
                    row["corners"] = quad
                    row["corners_source"] = "undistorted-remeasure"
                print("  geometry re-measured on the UNDISTORTED frames (the raw-frame repair is void)")
            else:
                carried = carry_repaired_geometry(session_dir, rows)
                if carried:
                    print(f"  kept the repaired geometry of {carried} frames (`session scan|autofix`)")
            if fit:
                # Last, so the fit refines the best quad this export knows. PNG sets cannot be split
                # by walks; only the video path goes to workers.
                if on_disk:
                    stats = fit_rows_to_grid(rows, load_profile(EXPORT_PROFILE),
                                             frames=disk_frames(session_dir, rows))
                else:
                    stats = fit_rows_parallel(rows, EXPORT_PROFILE, video=video_path(name),
                                              rotate=rotation, workers=workers, executor=executor)
                # A row past the end of a truncated recording has no picture.
                rows = stats["arrived"]
                print(f"  grid fit over {len(rows)} frames: {stats[FIT_SOURCE]} re-fitted, "
                      f"{stats[FIT_KEPT]} already on the grid, {stats[FIT_FAILED]} unreadable — "
                      f"align_worst_px median {stats['median']}, max {stats['max']}, "
                      f"mesh on {stats['mesh']}, hands on {stats['hands']}")
                # A SECOND pass: a board can only be warped straight once the mesh is final. Warping
                # first costs 57 % of the crop's detail.
                if on_disk:
                    made = rewarp_boards(session_dir, rows, load_profile(EXPORT_PROFILE),
                                         frames=disk_frames(session_dir, rows))
                else:
                    made, rows = rewarp_parallel(session_dir, rows, EXPORT_PROFILE,
                                                 video=video_path(name), rotate=rotation, lens=None,
                                                 workers=workers, executor=executor)
                print(f"  boards warped straight: {made['rewarped']}, "
                      f"{made['no_mesh']} left bowed for want of any mesh")
            write_session(session_dir, name, candidate, rows, drop_verdicts=drop_verdicts)
        # Hinter dem Marker: waehrend des Exports gemeldete Haende liefen dort ins
        # `ExportInterrupted`.
        adopted = adopt_reported_dirty(name)
        if adopted["changed"]:
            print(f"  adopt-dirty: {adopted['set']} gemeldet, {adopted['retracted']} widerrufen "
                  f"(waehrend des Exports)")
    for line in yield_lines(rows):
        print(line)
    return {
        "session_dir": session_dir,
        "rows": rows,
        "margin_frames": margin_frames,
        "segments": len(known_segments(candidate)),
        "report_only": report_only,
    }
