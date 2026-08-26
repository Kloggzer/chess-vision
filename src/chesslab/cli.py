"""Typer entrypoint. One CLI `chesslab`; each stage adds its own subcommands."""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Annotated

import typer

from . import calibration as calibration_mod
from . import composite as composite_mod
from . import config, locks
from . import dataset as dataset_mod
from . import doctor as doctor_mod
from . import hand_flags as hand_flags_mod
from . import labeling as labeling_mod

app = typer.Typer(
    name="chesslab",
    help="Build an auto-labeled chess-piece dataset and train a per-square model.",
    no_args_is_help=True,
    add_completion=False,
)

calibrate_app = typer.Typer(help="Stage 1 — Calibrate camera/board geometry.", no_args_is_help=True)
app.add_typer(calibrate_app, name="calibrate")

session_app = typer.Typer(
    help="Recorded sessions: geometry repair, frame flagging, lifecycle.",
    no_args_is_help=True)
app.add_typer(session_app, name="session")

realgames_app = typer.Typer(
    help="Real games recorded by the tracker: confirm a candidate against the game that was played.",
    no_args_is_help=True)
app.add_typer(realgames_app, name="realgames")

dataset_app = typer.Typer(help="Stage 4 — Dataset consistency.", no_args_is_help=True)
app.add_typer(dataset_app, name="dataset")

occluders_app = typer.Typer(help="Occluders — hands and arms cut free for 2.5D compositing.",
                            no_args_is_help=True)
app.add_typer(occluders_app, name="occluders")


synth_app = typer.Typer(help="Synthetic data pipeline (Blender renderer).", no_args_is_help=True)
app.add_typer(synth_app, name="synth")

perf_app = typer.Typer(
    help="Semantic performance audits: repeated work, bytes, ranges and call paths.",
    no_args_is_help=True,
)
app.add_typer(perf_app, name="perf")


@app.callback()
def _root(
    ctx: typer.Context,
    work_audit: Annotated[
        Path | None,
        typer.Option("--work-audit", help="Write a semantic avoidable-work JSON report."),
    ] = None,
) -> None:
    """chesslab — staged tool; each stage adds subcommands. See `chesslab --help`."""
    if work_audit is None:
        return
    from .work_audit import WorkAudit, activate, deactivate

    audit = WorkAudit(command=" ".join(sys.argv[1:]))
    token = activate(audit)

    def finish() -> None:
        deactivate(token)
        path = audit.write_json(work_audit)
        print(audit.format_text())
        print(f"[OK] Work audit: {path}")

    ctx.call_on_close(finish)


@perf_app.command("fuzz")
def perf_fuzz(
    seed: int = typer.Option(847291, "--seed", help="Deterministic workload seed."),
    frames: int = typer.Option(500, "--frames", min=1),
    board_revisions: int = typer.Option(2, "--board-revisions", min=1),
    json_out: Annotated[
        Path | None, typer.Option("--json", help="Optional JSON report path.")
    ] = None,
) -> None:
    """Run the deterministic profiler self-test with changing frame/board revisions."""
    from .work_audit import run_fuzzy

    try:
        audit = run_fuzzy(seed=seed, frames=frames, board_revisions=board_revisions)
    except ValueError as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1) from None
    print(audit.format_text())
    if json_out is not None:
        print(f"[OK] Work audit: {audit.write_json(json_out)}")


@app.command()
def doctor(
    gpu: bool = typer.Option(False, "--gpu", help="Also run ROCm/PyTorch GPU validation (required before training)."),
    json_out: bool = typer.Option(False, "--json", help="Also output machine-readable JSON report."),
) -> None:
    """Pre-flight: validate Python, app deps and optional GPU (ROCm)."""
    code = doctor_mod.run(gpu=gpu, json_out=json_out)
    raise typer.Exit(code)


@calibrate_app.command("list")
def calibrate_list() -> None:
    """List existing calibration profiles."""
    raise typer.Exit(calibration_mod.calibrate_list())


@calibrate_app.command("markers")
def calibrate_markers(
    out: str = typer.Option("data/calibration/markers.png", "--out", help="Target PNG of the marker sheet."),
    dict_name: str = typer.Option("DICT_4X4_50", "--dict", help="ArUco-Dictionary."),
    marker_px: int = typer.Option(300, "--marker-px"),
) -> None:
    """Generate printable ArUco marker sheet (glue onto a8/h8/h1/a1)."""
    try:
        p = calibration_mod.generate_markers(out, dict_name=dict_name, marker_px=marker_px)
    except ValueError as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1) from None
    print(f"[OK] Marker sheet: {p} — print out, cut out, glue one marker centered on each "
          "corner a8/h8/h1/a1.")



# `session` — everything that edits a recorded session before it is sliced.
#
# `slice` warps every crop through the `corners` of its log row, so these commands decide where
# the 64 crops of a frame actually get cut. They lived only in the web UI until 2026-08-07, which
# is why `docs/data-pipeline.md` §12 — the corpus-wide geometry repair that moved the empty-crop
# margin 5.5x — reads as a browser session rather than a command.
#
# Placing corners BY HAND is deliberately absent: it needs an image to click on, and it comes
# back with the new web UI. `adopt` covers the common case (one frame of a static sweep lost a
# marker while the others kept it) and `autofix` the next one.


@session_app.command("list")
def session_list() -> None:
    """Active and archived sessions: frames, crops, mode, review state."""
    from . import sessions as sessions_mod

    rows = sessions_mod.list_sessions()
    if not rows:
        print("No sessions.")
        return
    print(f"{'session':24} {'frames':>7} {'crops':>7}  {'mode':10} {'state'}")
    for r in rows:
        state = "archived" if r["archived"] else ("reviewed" if r["reviewed"] else "-")
        variant = f" [{r['variant']}]" if r.get("variant") else ""
        print(f"{r['session_id']:24} {r['n_frames']:>7} {r['n_crops']:>7}  "
              f"{str(r['mode'] or '-'):10} {state}{variant}")


@session_app.command("scan")
def session_scan(
    session: str = typer.Argument(..., help="Session ID."),
) -> None:
    """Measure every frame's worst square offset and store it as `align_worst_px`.

    The verdict is absolute, not self-referential: it fits the board's own nine grid lines per
    axis and reports how far the worst square edge sits from its groove. Run this before
    `autofix` to see whether a session needs repairing at all.
    """
    from . import sessions as sessions_mod

    r = _session_call(sessions_mod.scan_alignment, session)
    med, mx = r["median"], r["max"]
    print(f"[OK] {r['measured']}/{r['of']} frames measured — "
          f"median {med if med is not None else '-'} px, max {mx if mx is not None else '-'} px")
    print(f"     backup: {r['backup']}")


@session_app.command("autofix")
def session_autofix(
    session: str = typer.Argument(..., help="Session ID."),
    max_off: float = typer.Option(9.0, "--max-off",
                                  help="Only re-fit frames worse than this, in rectified px."),
) -> None:
    """Pull every badly aligned frame's quad back onto the board's own grid.

    Two rules keep this from doing harm. A frame already within `--max-off` is NOT touched:
    inside the noise band the fit chases measurement noise and makes it worse. And a correction
    that does not improve its own frame is discarded rather than written. Repaired rows are
    marked `corners_source: auto-corrected`, so measured and computed geometry stay
    distinguishable afterwards.
    """
    from . import sessions as sessions_mod

    r = _session_call(sessions_mod.autofix_corners, session, max_off)
    print(f"[OK] {r['checked']} frames checked, {r['over_threshold']} over {r['max_off']} px, "
          f"{r['changed']} corrected, {r['refused']} refused")
    for i, (before, after) in zip(r.get("indices", []), r.get("gains", []), strict=True):
        print(f"     frame {i}: {before} → {after} px")
    if r["backup"]:
        print(f"     backup: {r['backup']}")


@session_app.command("settle-scan")
def session_settle_scan(
    session: str = typer.Argument(None, help="Session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session with a log, one by one."),
) -> None:
    """Score every cell against its own ply interval's settled board, as `settle_dev`.

    Within one interval the position stands still, so the pixel median over its boards IS that
    position. A cell that departs from it is occluded, mid-move, or already holds what the next
    move puts there while the FEN still says otherwise. Measures only — nothing is dropped here;
    the threshold is set from the distribution this writes.
    """
    from . import sessions as sessions_mod

    ids = _target_sessions(session, all_sessions)
    failed = 0
    for sid in ids:
        r = _session_call(sessions_mod.settle_scan_session, sid)
        if r.get("error"):
            print(f"[FAIL] {sid}: {r['error']}", flush=True)
            failed += 1
            continue
        short = f", {r['too_short']} in zu kurzen Intervallen" if r["too_short"] else ""
        blind = f", {r['unseen']} ohne sichtbaren Zug" if r.get("unseen") else ""
        print(f"[OK] {sid}: {r['scored']}/{r['of']} Frames bewertet über {r['plies']} Intervalle"
              f"{short} — {r['intervals']} Plies geprüft{blind}, backup {r['backup']}", flush=True)
    if failed:
        raise typer.Exit(1)


@session_app.command("boards")
def session_boards(
    session: str = typer.Argument(None, help="Session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session with a log, one by one."),
) -> None:
    """Write every row's rectified board (`boards/NNNNNN.webp`) from its frame.

    The board is what `slice` cuts and what the label view shows — one raster instead of two
    independent cuts of the same frame, at 115 KB against the source frame's 3.3 MB. The export
    writes it as it fits; this retrofits a session that predates the store, and repairs one whose
    quad a later `autofix` or `adopt` moved.
    """
    from . import sessions as sessions_mod

    ids = _target_sessions(session, all_sessions)
    failed = 0
    for sid in ids:
        r = _session_call(sessions_mod.write_boards_session, sid)
        if r.get("error"):
            print(f"[FAIL] {sid}: {r['error']}", flush=True)
            failed += 1
            continue
        missing = f", {r['missing']} without a readable frame" if r["missing"] else ""
        print(f"[OK] {sid}: {r['written']}/{r['of']} boards{missing}, {r['straightened']} "
              f"geradegezogen — backup {r['backup']}", flush=True)
    if failed:
        raise typer.Exit(1)


@session_app.command("rewarp")
def session_rewarp(
    session: str = typer.Argument(None, help="Session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session with a log, one by one."),
) -> None:
    """Rebuild a store from its VIDEO — straight, in one resample. The good retrofit.

    `session straighten` is the other one: it pulls boards whose frames are gone and pays a second
    resample for it. Where the video exists this is strictly better, because mesh and optics fold
    into the map the warp already builds (+57 % Laplacian energy in the finished crop, 2026-08-21).
    """
    from . import sessions as sessions_mod

    ids = _target_sessions(session, all_sessions)
    failed = 0
    for sid in ids:
        r = _session_call(sessions_mod.rewarp_boards_session, sid)
        if r.get("error"):
            print(f"[FAIL] {sid}: {r['error']}", flush=True)
            failed += 1
            continue
        optics = ", Optik aus lens.json" if r.get("lens") else ""
        print(f"[OK] {sid}: {r['rewarped']}/{r['of']} neu gewarpt, {r['no_mesh']} ohne Mesh, "
              f"{r['no_frame']} ohne Bild{optics} — backup {r['backup']}", flush=True)
    if failed:
        raise typer.Exit(1)


@session_app.command("straighten")
def session_straighten(
    session: str = typer.Argument(None, help="Session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session with a log, one by one."),
) -> None:
    """Pull an existing board store straight — the retrofit for sessions written before it was.

    The store is where the barrel comes out, once, so that every cut afterwards is a plain
    rectangle. A frame whose own grid a hand covered borrows its clean neighbours' mesh; measured
    2026-08-21, that is worth 1.2 px against 1.0 for a frame's own and 16 px for none at all.
    Idempotent: a board that already says `board_straightened` is left alone.
    """
    from . import sessions as sessions_mod

    ids = _target_sessions(session, all_sessions)
    failed = 0
    for sid in ids:
        r = _session_call(sessions_mod.straighten_boards_session, sid)
        if r.get("error"):
            print(f"[FAIL] {sid}: {r['error']}", flush=True)
            failed += 1
            continue
        print(f"[OK] {sid}: {r['straightened']}/{r['of']} geradegezogen, {r['already']} schon, "
              f"{r['no_mesh']} ohne Mesh, {r['no_board']} ohne Brett — backup {r['backup']}",
              flush=True)
    if failed:
        raise typer.Exit(1)


@session_app.command("delete")
def session_delete(
    session_id: str = typer.Argument(..., help="Session ID under data/sessions/."),
    yes: bool = typer.Option(False, "--yes", help="Delete without asking."),
    dry_run: bool = typer.Option(False, "--dry-run",
                                 help="Print what would go, as JSON, and delete nothing."),
) -> None:
    """Remove a session for good: directory, crops, manifest rows and its corrections.

    `archive` is the reversible door and stays the default answer. This one exists for what
    archiving would only hoard — an empty export, a session with no readable board.
    """
    import json as json_mod

    from . import sessions as sessions_mod

    counts = _session_call(sessions_mod.deletion_cost, session_id)
    if dry_run:
        # The UI shows THIS, then runs the same command without the flag — one count, one truth.
        print(json_mod.dumps(counts))
        raise typer.Exit(0)
    print(f"[--] {session_id}: {counts['frames']} Zeilen, {counts['crops']} Crops, "
          f"{counts['corrections']} Korrekturen")
    if counts["corrections"] and not yes:
        print("[FAIL] die Korrekturen sind Handarbeit — mit --yes bestaetigen, wenn das so gemeint ist")
        raise typer.Exit(1)
    if not yes and not typer.confirm(f"  {session_id} endgueltig loeschen?", default=False):
        print("[--] nichts geloescht")
        raise typer.Exit(0)
    res = _session_call(sessions_mod.delete_session, session_id)
    print(f"[OK] {res['session_id']} geloescht ({res['removed_crops']} Crops mit)")


@session_app.command("park-frames")
def session_park_frames(
    session: str = typer.Argument(None, help="Session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session with a log."),
) -> None:
    """Move the source frames of boarded rows to `data/_parked/frames/`.

    The board carries the picture at a thirtieth of the size, so the decode is scratch that the
    video regenerates. Parked and not deleted: a frame is data, and only the user says otherwise.
    """
    from . import sessions as sessions_mod

    ids = _target_sessions(session, all_sessions)
    total = 0.0
    for sid in ids:
        r = _session_call(sessions_mod.park_frames_session, sid)
        if r.get("error"):
            print(f"[FAIL] {sid}: {r['error']}", flush=True)
            continue
        total += r["freed_mb"]
        print(f"[OK] {sid}: {r['moved']}/{r['of']} frames parked, {r['freed_mb']} MB -> {r['parked_to']}", flush=True)
    if all_sessions:
        print(f"[OK] {total / 1024:.1f} GB parked over {len(ids)} sessions")


@session_app.command("fit-mesh")
def session_fit_mesh(
    session: str = typer.Argument(None, help="Session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session with a log, one by one."),
    repair_only: bool = typer.Option(
        False, "--repair-only",
        help="Skip measuring; only pull outlier lines back onto the session's median. Works "
             "without source frames, so a parked session can still be fixed."),
) -> None:
    """Measure every frame's 18 grid lines and store them as `grid_lines` for `slice`.

    The quad places the board, the mesh places its cells: without it every crop is cut at the
    nominal eighth and the lens' barrel goes straight into the training set. One warp plus the
    line fit per frame (~0.05 s measured), stored once instead of re-measured per slice.
    """
    from . import sessions as sessions_mod

    if not (session or all_sessions):
        print("[FAIL] specify a session ID or --all.")
        raise typer.Exit(1)
    if repair_only:
        def said(r: dict) -> None:
            if r.get("error"):
                print(f"[FAIL] {r['session_id']}: {r['error']}", flush=True)
            else:
                print(f"[OK] {r['session_id']}: {r['repaired']}/{r['of']} frames repaired "
                      f"(static rig: {r['static_rig']}) — backup {r['backup']}", flush=True)

        rows = (sessions_mod.repair_mesh_all(on_done=said) if all_sessions
                else [_session_call(sessions_mod.repair_mesh_session, session)])
        if not all_sessions:
            said(rows[0])
        ok = [r for r in rows if not r.get("error")]
        print(f"[OK] {sum(r['repaired'] for r in ok)} frames repaired over {len(ok)} sessions.")
        return

    def say(r: dict) -> None:
        if r.get("error"):
            print(f"[FAIL] {r['session_id']}: {r['error']}", flush=True)
            return
        print(f"[OK] {r['session_id']}: {r['measured']}/{r['of']} frames meshed "
              f"({r['curved']} curved, {r['tilted']} tilted), {r['carried']} carried from their "
              f"neighbours — backup {r['backup']}", flush=True)

    if not all_sessions:
        say(_session_call(sessions_mod.fit_mesh_session, session))
        return
    rows = sessions_mod.fit_mesh_all(on_done=say)
    done = [r for r in rows if not r.get("error")]
    print(f"[OK] {sum(r['measured'] for r in done)} frames meshed and "
          f"{sum(r['carried'] for r in done)} carried over {len(done)} sessions, "
          f"{len(rows) - len(done)} failed")

@session_app.command("mark-hands")
def session_mark_hands(
    session: str = typer.Argument(None, help="Session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session with a log, one by one."),
) -> None:
    """Read the board's grooves per frame and mark the frames a hand lies on as `dirty`.

    The exporter only calls a frame dirty inside a 1 s window around a reviewed commit, so a hand
    that adjusts a piece or crosses the board goes unflagged and its crops reach training under
    the FEN label. This is the model-free read; it only ever adds the flag, never clears it.
    """
    from . import sessions as sessions_mod

    if not (session or all_sessions):
        print("[FAIL] specify a session ID or --all.")
        raise typer.Exit(1)

    def say(r: dict) -> None:
        if r.get("error"):
            print(f"[FAIL] {r['session_id']}: {r['error']}", flush=True)
            return
        print(f"[OK] {r['session_id']}: hands on {r['hands']}/{r['of']} frames, "
              f"{r['newly_dirty']} newly dirty — backup {r['backup']}", flush=True)

    if not all_sessions:
        say(_session_call(sessions_mod.mark_hands_session, session))
        return
    rows = sessions_mod.mark_hands_all(on_done=say)
    done = [r for r in rows if not r.get("error")]
    print(f"[OK] {sum(r['newly_dirty'] for r in done)} frames newly dirty over {len(done)} "
          f"sessions, {len(rows) - len(done)} failed")


@session_app.command("adopt")
def session_adopt(
    session: str = typer.Argument(..., help="Session ID."),
    from_index: int = typer.Option(None, "--from",
                                   help="Row to copy the quad from (default: the most agreed one)."),
    scope: str = typer.Option("missing", "--scope", help="missing | all | frame"),
    overwrite: bool = typer.Option(False, "--overwrite",
                                   help="Replace corners that were already measured."),
) -> None:
    """Copy a quad that WAS detected in this session into the rows that have none.

    The default source is the quad the most other rows agree with, not the nearest one — a
    single bumped frame must not become the template for a whole session. Written rows say
    `adopted` and name the row it came from.
    """
    from . import sessions as sessions_mod

    r = _session_call(sessions_mod.adopt_corners, session, from_index, scope, overwrite)
    print(f"[OK] {r['changed']} rows adopted the quad from row {r['from_index']} "
          f"(scope={r['scope']})")
    print(f"     backup: {r['backup']}")


@session_app.command("flag")
def session_flag(
    session: str = typer.Argument(..., help="Session ID."),
    index: int = typer.Argument(..., help="Frame index in log.jsonl."),
    usable: bool = typer.Option(False, "--usable/--unusable",
                                help="Clear the flag instead of setting it."),
) -> None:
    """Mark one frame unusable (or usable again). `slice` skips flagged frames."""
    from . import sessions as sessions_mod

    r = _session_call(sessions_mod.flag_frame, session, index, not usable)
    print(f"[OK] {r['session_id']} frame {r['index']}: "
          f"unusable={'yes' if r['unusable'] else 'no'}")


@session_app.command("review")
def session_review(
    session: str = typer.Argument(..., help="Session ID."),
    undo: bool = typer.Option(False, "--undo", help="Mark it unreviewed again."),
) -> None:
    """Mark a session as reviewed — the flag `session list` shows.

    It had no writer outside the web UI, and a field that is read but cannot be set is worse
    than no field: `list` would have shown "-" forever with no way to change it.
    """
    from . import sessions as sessions_mod

    _session_call(sessions_mod.set_session_reviewed, session, not undo)
    print(f"[OK] {session}: reviewed={'no' if undo else 'yes'}")


@realgames_app.command("confirm")
def realgames_confirm(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    yes: bool = typer.Option(False, "--yes",
                             help="Unprompted: keep every matched ply, drop every unmatched one."),
) -> None:
    """Check a candidate's move list against its `reference.pgn` and record the human's verdict.

    The tracker cannot vouch for its own move list — the Kotlin writer stamps `confirmed: false`
    — and every crop label downstream rests on it. The LCS does the mechanical part; the human
    only decides the candidate-only plies, each printed with the review PNG that shows the
    board at that frame.
    """
    from . import realgames as realgames_mod

    def ask(move: dict) -> bool:
        return typer.confirm(f"  keep candidate ply {move['ply']} {move['san']}?", default=False)

    try:
        r = realgames_mod.confirm(name, yes=yes, ask=None if yes else ask)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e
    print(f"[OK] {r['path']} — confirmed, {len(r['reviewed'])} reviewed plies "
          f"({len(r['kept'])} unmatched kept)")


@realgames_app.command("scan-video")
def realgames_scan_video(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    stride: int = typer.Option(0, "--stride", help="Scan every Nth frame (0 = the measured 3)."),
    rescan: bool = typer.Option(False, "--rescan", help="Redo a scan that is already on disk."),
    gate: str = typer.Option("", "--gate", help="Welcher Hand-Gate unter data/models/ misst."),
) -> None:
    """Measure every Nth frame of the recording before anything is picked from it.

    The old export planned first and flagged afterwards, so a flagged slot simply went missing:
    20 % of positions kept their 8 clean boards. Measuring first takes that to 93 %, because the
    clean frames were always there — they were sorted wrong (`docs/frame-scan.md`).
    """
    from . import framescan

    try:
        r = framescan.scan_video(name, stride=stride or framescan.SCAN_STRIDE, resume=not rescan,
                                 tag=gate)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e
    if r.get("resumed"):
        print(f"[--] {r['frames']} frames already scanned -> {r['path']} (--rescan to redo)")
        return
    print(f"[OK] {r['frames']} frames measured, {r['hands']} with a hand -> {r['path']}")


@realgames_app.command("export-session")
def realgames_export_session(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    quiet_margin_s: float = typer.Option(1.0, "--quiet-margin-s",
                                         help="Declared hand margin around each commit."),
    dirty: bool = typer.Option(True, "--dirty/--no-dirty",
                               help="Also export the commit windows, flagged `dirty: true`."),
    every: int = typer.Option(3, "--every", help="Sample every Nth source frame of a HAND window."),
    per_position: int = typer.Option(8, "--per-position",
                                     help="Clean boards per position (0 = fall back to --every). "
                                          "The corpus is short of positions, not of frames."),
    dirty_per_position: int = typer.Option(8, "--dirty-per-position",
                                          help="Boards per position for the dirty pile, "
                                               "withdrawal after the commit first."),
    fit: bool = typer.Option(True, "--fit/--no-fit",
                             help="Fit every written frame's quad to the board's own grid."),
    report_only: bool = typer.Option(False, "--report-only",
                                     help="Compute the yield table, write nothing."),
) -> None:
    """Cut a CONFIRMED candidate into its own folder `data/recordings/<name>/` for `chesslab slice`.

    The night-light domain and every occlusion window exist only in the recorded videos, and
    nothing extracted them. A reviewed ply's `fen_after` is the known position from its commit
    to the next one; the margin cuts the hand out of that interval, and `--dirty` keeps those
    cut-out windows as flagged rows for the occluded-class work (specs/53-02/03).

    Every written frame is fitted to the board's own grid on the way out (`--no-fit` to skip),
    so an export lands where `session scan` + `autofix` used to have to drag it afterwards.
    """
    from . import realgames as realgames_mod

    try:
        r = realgames_mod.export_session(name, quiet_margin_s=quiet_margin_s, every=every,
                                         per_position=per_position or None,
                                         dirty_per_position=dirty_per_position,
                                         dirty=dirty, fit=fit, report_only=report_only)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e
    where = "report only, nothing written" if r["report_only"] else str(r["session_dir"])
    print(f"[OK] {len(r['rows'])} rows over {r['segments']} reviewed intervals "
          f"(margin {r['margin_frames']} frames) — {where}")


@realgames_app.command("fit-stored")
def realgames_fit_stored(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_bundles: bool = typer.Option(False, "--all",
                                     help="Every bundle with a stored session, one after the other."),
) -> None:
    """Re-fit an Android Stored session's logged quad and write `files/sessions/<id>/quad-fit.json`.

    The recorder logs the raw MARKER quad and everything downstream assumes one constant outset
    for it, while the best one varies per session — measured 2026-08-15 at up to 14 px, an eighth
    of a cell, in the crops that go into training AND into labelling. The board's own grid says
    where the playing field really is; this writes that as the field quad (margin 0) the pack and
    the review viewer prefer. A frame the fit cannot read is listed in `failed`, never patched.
    """
    from . import realgames as realgames_mod

    if bool(name) == all_bundles:
        print("[ERR] name or --all, not both")
        raise typer.Exit(1)
    try:
        done = realgames_mod.fit_stored_all() if all_bundles else realgames_mod.fit_stored(name)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e
    failed = sum(len(d["failed"]) for d in done)
    print(f"[OK] {len(done)} stored session(s), {sum(d['fitted'] for d in done)} frames fitted, "
          f"{failed} left to their logged quad")


@realgames_app.command("model-read")
def realgames_model_read(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
    model: str = typer.Option(..., "--model", help="Run dir of a model that did NOT train on "
                                                   "this session (refused if it did)."),
    device: str = typer.Option("cpu", "--device", help="cpu | cuda."),
    weights: str | None = typer.Option(None, "--weights",
                                       help="Checkpoint inside the run instead of its default: "
                                            "swa.pt, best_piece.pt. A run holds several and the "
                                            "training picks no winner among them."),
) -> None:
    """Read every square of a session with a model into `model-reads.jsonl`.

    This is what `propose-occluded` produced as a side effect while hunting occlusion. SAM 3
    measures occlusion now, so the reads travel alone — and over EVERY board, not just the
    dirty ones, because a wrong piece on a clean board is what the p8 stock trains on.
    """
    from pathlib import Path as _Path

    from . import occluded_model

    try:
        res = occluded_model.read_session(name, _Path(model), device=device, weights=weights)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e
    print(f"[OK] {res['cells']} Zellen aus {res['boards']} Brettern "
          f"({_Path(res['model']).name}) -> {res['path']}")


@realgames_app.command("adopt-dirty")
def realgames_adopt_dirty(
    name: str = typer.Argument(None, help="Recording name under data/recordings/."),
    all_recordings: bool = typer.Option(False, "--all", help="Every recording with a log."),
) -> None:
    """Take the hands a human reported into `log.jsonl` — the matte can start without a re-export.

    A reported frame only reaches the pile through `export-session` otherwise, which re-plans the
    whole recording. This marks the stored rows `occluded`, which is also what makes the coming
    matte RESCUE them: measured coverage on a row still classed `clean` condemns it instead.
    """
    from . import realgames as rg_mod

    names = [p.name for p in sorted(config.DATA.recordings.glob("*")) if (p / "log.jsonl").exists()]
    if not (bool(name) ^ all_recordings):
        print("[ERR] name or --all, not both")
        raise typer.Exit(1)
    total = 0
    for target in (names if all_recordings else [name]):
        try:
            res = rg_mod.adopt_reported_dirty(target)
        except (FileNotFoundError, ValueError, KeyError) as e:
            print(f"[ERR] {target}: {e}")
            continue
        total += res["changed"]
        if res["changed"]:
            print(f"[OK] {target}: {res['changed']} von {res['reported']} gemeldeten Frames "
                  f"auf `occluded` gesetzt (Backup {res['backup']})")
    print(f"[OK] {total} Frames warten jetzt auf die Matte — `chesslab occluders alpha-worker`")


@realgames_app.command("audit-corrections")
def realgames_audit_corrections() -> None:
    """Check the correction ledger against the rules of chess — the audit that PROVES.

    `audit-flags` asks a model and skips every cell a human ruled on, so a wrong correction is
    invisible to it by construction. This one applies the ledger to each frame's FEN and reports
    the boards that then break a rule no occlusion can explain (two kings, nine pawns, 33 pieces).
    """
    from . import label_audit

    r = label_audit.audit_corrections()
    path = label_audit.write_report(r["rows"], config.DATA.reports / "correction-violations.jsonl")
    print(f"[OK] {r['frames']} frames break a rule after their corrections "
          f"({r['cells']} correction cells of {r['corrections_total']}) -> {path}")
    for rule, n in sorted(r["per_rule"].items(), key=lambda kv: -kv[1]):
        print(f"  {rule:28} {n}")
    for sid, n in sorted(r["per_session"].items(), key=lambda kv: -kv[1]):
        print(f"  {sid:34} {n} frames")


@realgames_app.command("hand-flags")
def realgames_hand_flags(
    cut: float = typer.Option(hand_flags_mod.DEFAULT_CUT, "--cut",
                              help="Ab dieser Coverage-Vorhersage legt der Occlusion-Kopf eine "
                                   "Verdeckung vor. Tief, weil ein verpasster Handframe 64 Labels "
                                   "verdirbt und ein Fehlalarm einen Blick kostet."),
) -> None:
    """Wo das Modell eine Hand sieht und die Matte keine — die Vorlage der `Hand?`-Lane.

    Braucht `model-reads.jsonl` aus einem Lauf MIT Occlusion-Kopf (`realgames model-read`);
    ein Lauf ohne den Kopf schreibt kein `cov` und wird uebersprungen statt geraten.
    """
    r = hand_flags_mod.hand_flags(cut=cut)
    print(f"[OK] {r['flags']} Zellen in {r['frames']} Frames -> {r['path']}")
    for sid, n in sorted(r["per_session"].items(), key=lambda kv: -kv[1]):
        print(f"  {sid:34} {n}")
    if r["without_coverage"]:
        print(f"  ! ohne `cov` uebersprungen ({len(r['without_coverage'])}): "
              f"{', '.join(r['without_coverage'][:6])} — `model-read` dort neu laufen lassen, "
              f"mit einem Lauf MIT Occlusion-Kopf")


@realgames_app.command("position-flags")
def realgames_position_flags() -> None:
    """Zellen, deren Bild von der Stellung ihres Intervalls abweicht — die Vorlage der Lane.

    Braucht `settle_dev` aus `chesslab session settle-scan`; ohne Messung ist eine Zelle nicht
    unstrittig, sondern ungemessen, und sie wird uebersprungen statt geraten.
    """
    from . import position_flags as position_flags_mod

    r = position_flags_mod.position_flags()
    print(f"[OK] {r['flags']} Zellen in {r['frames']} Frames -> {r['path']}")
    for sid, n in sorted(r["per_session"].items(), key=lambda kv: -kv[1]):
        print(f"  {sid:34} {n}")
    i = position_flags_mod.interval_flags()
    print(f"[OK] {i['plies']} Plies geprueft, {i['unseen']} ohne sichtbaren Zug -> {i['path']}")


@realgames_app.command("audit-flags")
def realgames_audit_flags(
    occupancy: bool = typer.Option(False, "--occupancy/--all",
                                   help="Only flags disputing whether the square is OCCUPIED. Use "
                                        "it whenever the proposer comes from another domain: a "
                                        "model that never saw this piece set reads shapes badly, "
                                        "and its type flags are its own gap, not your labels."),
    visible: bool = typer.Option(False, "--visible/--any-coverage",
                                 help="Drop the cells the matte measured as covered. `OcclusionLoss` "
                                      "masks those out of the class loss anyway, so a verdict on "
                                      "them reaches no model."),
) -> None:
    """Question every FEN label with the models the proposals already ran — confident learning.

    Per session and class, `t_j` is the mean self-confidence over the cells labelled `j`
    (Northcutt Eqn. 2) and a cell is flagged when the argmax over the classes reaching their own
    threshold is not its label (Eqn. 1), ranked by normalized margin. DERIVED: the run rewrites
    `audit-flags.jsonl` whole, so it is never a ledger — human verdicts live in `corrections.jsonl`.
    """
    from . import audit_flags as audit_mod

    r = audit_mod.audit_flags(occupancy_only=occupancy, visible_only=visible)
    rate = r["flags"] / r["cells_scanned"] if r["cells_scanned"] else 0.0
    for s in r["skipped"]:
        print(f"[SKIP] {s['session']}: {s['reason']}")
    if r["dropped_by_scope"]:
        print(f"[i] scope={r['scope']}: {r['dropped_by_scope']} type/colour flags left out")
    if r["dropped_as_covered"]:
        print(f"[i] coverage={r['coverage_scope']}: {r['dropped_as_covered']} covered cells left out")
    print(f"[OK] {r['flags']} flags over {r['cells_scanned']} cells ({rate:.1%}) "
          f"in {len(r['sessions'])} sessions -> {r['path']}")


@session_app.command("archive")
def session_archive(
    session: str = typer.Argument(..., help="Session ID."),
    reason: str = typer.Option(..., "--reason",
                               help="Why it is being parked. Recorded beside the session."),
) -> None:
    """Park a session: its crops and manifest rows leave the pool, the frames stay.

    Reversible with `restore` plus a re-slice. The reason is required because `data/` is
    gitignored and a parked session with no recorded motive is a question nobody can answer
    later.
    """
    from . import sessions as sessions_mod

    r = _session_call(sessions_mod.archive_session, session, reason)
    print(f"[OK] archived {session} — {r.get('removed_crops', 0)} crops left the pool")


@session_app.command("restore")
def session_restore(
    session: str = typer.Argument(..., help="Session ID."),
) -> None:
    """Bring an archived session back. Re-slice afterwards to put its crops in the pool."""
    from . import sessions as sessions_mod

    _session_call(sessions_mod.restore_session, session)
    print(f"[OK] restored {session} — run `chesslab slice --session {session}` to re-slice")


@session_app.command("trim")
def session_trim(
    session: str = typer.Argument(..., help="Session ID."),
    keep: int = typer.Option(..., "--keep", help="Number of frames to keep, from the start."),
) -> None:
    """Drop the tail of a session, with its crops and manifest rows."""
    from . import sessions as sessions_mod

    r = _session_call(sessions_mod.trim_session, session, keep)
    print(f"[OK] {session} trimmed to {keep} frames — "
          f"{r.get('removed_frames', 0)} frames, {r.get('removed_crops', 0)} crops removed")


def _out_size(value: str | None) -> tuple[int, int] | None:
    """`WxH` from a command line — a bad one is a message, not a stack."""
    if not value:
        return None
    try:
        return labeling_mod.parse_out_size(value)
    except ValueError as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1) from None


def _target_sessions(session: str | None, every: bool) -> list[str]:
    """One session, or every ACTIVE one — archived sessions stay out of bulk verbs.

    Archiving is a retirement with a stated reason; re-boarding or re-parking one behind the
    user's back undoes that. `list_sessions` returns both kinds, so the filter belongs here.
    """
    if not (session or every):
        print("[FAIL] specify a session ID or --all.")
        raise typer.Exit(1)
    if not every:
        return [session]
    from . import sessions as sessions_mod
    return [s["session_id"] for s in sessions_mod.list_sessions() if not s["archived"]]


def _session_call(fn, *args):
    """Run a `sessions` operation, turning its errors into a message and an exit code.

    `NothingToDo` is separated from the rest on purpose: "every row already has corners" is not
    a mistake, it is an answer, and it should not read like a crash.
    """
    from .sessions import NothingToDo

    try:
        return fn(*args)
    except NothingToDo as e:
        print(f"[--] {e}")
        raise typer.Exit(0) from e
    except (ValueError, FileNotFoundError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e


@app.command("slice")
def slice_cmd(
    session: str = typer.Option(None, "--session", help="Slice session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Slice all sessions."),
    profile: str = typer.Option(None, "--profile", help="Override profile (default: from session.yaml)."),
    pad_up: float = typer.Option(None, "--pad-up", help="Override crop height upward."),
    pad_side: float = typer.Option(None, "--pad-side", help="Override side crop extension."),
    out_size: str = typer.Option(None, "--out-size", help="Crop size WxH, e.g. 96x128."),
    preview: str = typer.Option(None, "--preview", help="Session ID: visually check label vs crop."),
    variant_tag: str = typer.Option(None, "--variant-tag",
                                    help="Store crops/manifest with variant tag (crops/<tag>/)."),
) -> None:
    """Session logs -> 64 labeled square crops per position + manifest."""
    raise typer.Exit(labeling_mod.run_slice(
        session=session, slice_all=all_sessions, profile=profile,
        pad_up=pad_up, pad_side=pad_side, out_size=out_size, preview=preview,
        variant_tag=variant_tag,
    ))


@app.command("stats")
def stats_cmd(
    manifest: str = typer.Option(None, "--manifest", help="Manifest path (default: data/crops/default/manifest.jsonl)."),
    json_out: bool = typer.Option(False, "--json"),
) -> None:
    """Dataset report: 13-class distribution + light/dark coverage + warnings."""
    raise typer.Exit(dataset_mod.run_stats(manifest=manifest, json_out=json_out))


@app.command("split")
def split_cmd(
    val_frac: float = typer.Option(config.DEFAULT_VAL_FRAC, "--val-frac"),
    test_frac: float = typer.Option(config.DEFAULT_TEST_FRAC, "--test-frac"),
    max_empty_ratio: float = typer.Option(config.DEFAULT_MAX_EMPTY_RATIO, "--max-empty-ratio"),
    max_class_ratio: float | None = typer.Option(None, "--max-class-ratio", help="Cap each piece class at R * smallest class (balances pawns downward; train only)."),
    seed: int = typer.Option(config.SEED, "--seed"),
    allow_degenerate: bool = typer.Option(False, "--allow-degenerate", help="Allow degenerate split (class only in one session etc.)."),
) -> None:
    """Session-based split (against data leakage) + class balancing (train only) -> split.json."""
    raise typer.Exit(dataset_mod.run_split(val_frac=val_frac, test_frac=test_frac,
                                           max_empty_ratio=max_empty_ratio, seed=seed,
                                           max_class_ratio=max_class_ratio,
                                           allow_degenerate=allow_degenerate))


@occluders_app.command("composite")
def occluders_composite(
    video: str = typer.Option(..., "--video", help="Board clip (ArUco per frame)."),
    fen: str = typer.Option(..., "--fen", help="The position the board holds for the whole clip."),
    occluders: str = typer.Option(str(config.DATA.occluders), "--occluders", help="RGBA tiles."),
    tag: str = typer.Option("comp", "--tag", help="Crop pool `data/crops/<tag>/` + manifest."),
    stride: int = typer.Option(composite_mod.STRIDE, "--stride",
                               help="Frames between two boards. On the turntable that is an "
                                    "ANGLE: 0.43 deg per frame, so 8 is ~3.4 deg."),
    board_size: int = typer.Option(0, "--board-size",
                                   help="Warp-Aufloesung in px. 0 = aus dem Quad der Quelle "
                                        "gemessen, was der Clip wirklich hergibt (`measured_board_"
                                        "size`). Fest 1280 rechnete 1080p-Clips um 1,93x hoch."),
    out_size: str = typer.Option("128x128", "--out-size",
                                 help="Crop size WxH. 128 wie der echte Export: bei 80 liegt der "
                                      "Crop schon auf der Modellgroesse und hat keine Reserve, "
                                      "waehrend echte Crops noch Detail uebrig haben."),
    seed: int = typer.Option(42, "--seed"),
) -> None:
    """Lay occluders over a board clip and cut crops with an EXACT coverage per cell.

    The second target replaces the hand-marked `occluded` class: coverage is a fraction the
    composite knows, not a yes/no somebody had to judge (docs/occluder-plates.md)."""
    from pathlib import Path

    from . import composite as comp

    try:
        with locks.pool_lock(config.DATA.crops / tag, f"composite {Path(video).name}"):
            res = comp.build_from_video(
                video=Path(video), plate_dir=Path(occluders),
                out_root=config.DATA.crops / tag,
                manifest=config.DATA.crops / tag / "manifest.jsonl",
                fen=fen, board_size=board_size, out_size=_out_size(out_size),
                stride=stride, seed=seed)
    except RuntimeError as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1) from None
    if res.get("error"):
        print(f"[FAIL] {res['error']}")
        raise typer.Exit(1)
    print(f"[OK] {res['crops']} Kacheln aus {res['frames']} Brettern "
          f"({res['skipped']} ohne Marker uebersprungen), "
          f"{res['covered_over_half']} ueber 50% verdeckt ({res['share']:.1%}).")


@occluders_app.command("extract")
def occluders_extract(
    src: str = typer.Option(str(config.DATA.footage / "occluders"), "--in",
                            help="Folder of clips shot over a backdrop."),
    out: str = typer.Option(str(config.DATA.occluders), "--out", help="Where the RGBA tiles land."),
    stride: int = typer.Option(2, "--stride", help="Take every Nth frame before novelty filtering."),
    max_iou: float = typer.Option(0.85, "--max-iou",
                                  help="Overlap above which a pose counts as one already kept."),
    min_cover: float = typer.Option(0.02, "--min-cover",
                                    help="Skip frames covering less than this share of the stage."),
) -> None:
    """Cut hands/arms free of their backdrop into RGBA tiles (alpha = exact coverage).

    No green screen and no clean plate needed: the backdrop is the clip's own temporal median, and
    the matte keys on chroma against it. Shadow is treated as background on purpose — a shaded
    square stays readable, and counting it would rebuild the over-flagging this replaces."""
    import json
    from pathlib import Path

    from . import occluders as occ

    clips = sorted(Path(src).glob("*.mp4"))
    if not clips:
        print(f"[FAIL] no .mp4 in {src}")
        raise typer.Exit(1)
    total, summaries = 0, []
    for clip in clips:
        s = occ.extract(clip, Path(out), stride=stride, max_iou=max_iou, min_cover=min_cover)
        summaries.append(s)
        total += s.get("written", 0)
        print(f"  {s['video']:<28} {s.get('written', 0):>4} Kacheln  "
              f"(dünn {s.get('skipped_thin', 0)}, doppelt {s.get('skipped_duplicate', 0)})")
    (Path(out) / "occluders.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    print(f"[OK] {total} Kacheln in {out}")


@occluders_app.command("recut")
def occluders_recut(
    name: str = typer.Argument(..., help="Recording name under data/recordings/."),
) -> None:
    """Recompute coverage for every frame whose alpha a human corrected in the matte view.

    The paint tool writes pixels (`mattes/<stem>.fixed.webp`); the numbers come from here, through
    the same `crops_for_frame` cut the training image goes through. One cut, one truth.
    """
    from . import matte as matte_mod

    try:
        res = matte_mod.recut_fixed(name)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e
    print(f"[OK] {res['recut']} korrigierte Alphas neu geschnitten "
          f"({res['frames']} Zeilen) -> {res['path']}")


@occluders_app.command("close-seams")
def occluders_close_seams(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_sessions: bool = typer.Option(False, "--all", help="Every session that has a matte.jsonl."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Report only, touch nothing."),
) -> None:
    """Close the hairline the concept UNION leaves in alphas already on disk, and recut coverage.

    Watch and arm come from two SAM concepts and meet on a line neither covers. `alpha_sam3` does
    this for every new matte; this is the one-off for the ones cut before it did.
    """
    from . import matte as matte_mod

    if bool(name) == all_sessions:
        print("[ERR] name or --all, not both")
        raise typer.Exit(1)
    if all_sessions:
        from .sessions import all_sessions as _all

        names = [sid[3:] for sid, _ in _all() if sid.startswith("rg-")]
    else:
        names = [name]
    total = {"closed": 0, "frames": 0, "crossed": 0}
    for one in names:
        try:
            res = matte_mod.close_seams(one, dry_run=dry_run, progress=not all_sessions)
        except (FileNotFoundError, ValueError, KeyError, OSError) as e:
            print(f"[ERR] {one}: {e}")
            continue
        for k in total:
            total[k] += res[k]
        if res["closed"]:
            print(f"[OK] {one}: {res['closed']}/{res['frames']} Alphas geschlossen, "
                  f"+{res['px']} px, {res['crossed']} Zellen wechseln die Schwelle"
                  f"{' (dry-run)' if dry_run else ''}")
    if len(names) > 1:
        print(f"[OK] gesamt {total['closed']}/{total['frames']} Alphas, "
              f"{total['crossed']} Zellen wechseln PIECE_VISIBLE_MAX")


@occluders_app.command("gate-train")
def occluders_gate_train(
    backbone: str = typer.Option("mobilenet_v3_small", "--backbone"),
    size: int = typer.Option(320, "--size", help="Kantenlaenge, in der der Kopf das Brett sieht."),
    epochs: int = typer.Option(8, "--epochs"),
    holdout: int = typer.Option(4, "--holdout", help="GANZE Sessions, die nur geprueft werden."),
    batch: int = typer.Option(32, "--batch"),
    workers: int = typer.Option(4, "--workers", help="Loader-Prozesse; 8 ist die Obergrenze."),
    lr: float = typer.Option(3e-4, "--lr"),
    tag: str = typer.Option("", "--tag", help="Eigener Ordner unter data/models/, fuer Vergleiche."),
) -> None:
    """Den Hand-Gate auf SAM 3s Urteil trainieren — das Ja/Nein, das kein Alpha braucht.

    SAM ist der Lehrer UND der Pruefer: die zurueckgehaltenen Sessions werden gegen sein Urteil
    gemessen, nicht gegen ein Frame-Sample derselben Beleuchtung.
    """
    from . import hand_gate

    r = hand_gate.train_gate(backbone=backbone, size=size, epochs=epochs, holdout=holdout,
                             batch=batch, workers=workers, lr=lr, tag=tag)
    c = r["chosen"]
    print(f"[OK] {r['train_boards']} Bretter trainiert, {r['val_boards']} geprueft "
          f"({r['val_hands']} mit Hand) -> {r['path']}")
    cov = r["coverage"]
    print(f"     Veto {c['thr']}: recall {c['recall']}, {c['false_pos']} saubere Bretter verworfen "
          f"({100 * c['clean_lost']:.1f} %)")
    print(f"     Felder > 0.15: recall {cov['recall']} praezision {cov['precision']}, "
          f"MAE {cov['mae']} | {r['ms_per_board']} ms je Brett")


@occluders_app.command("gate-scan")
def occluders_gate_scan(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_sessions: bool = typer.Option(False, "--all", help="Jede Session mit gespeicherten Brettern."),
    tag: str = typer.Option("", "--tag", help="Welcher Lauf unter data/models/ gelesen wird."),
) -> None:
    """Den Hand-Gate ueber eine Session laufen lassen -> `gate.jsonl` neben `matte.jsonl`.

    Getrennte Datei mit Absicht: SAMs Messung und die des Schuelers duerfen nie in derselben Zeile
    stehen, sonst weiss spaeter niemand, wessen Zahl in den Trainingssatz gelaufen ist.
    """
    from . import hand_gate
    from .realgames import bundles_with_stored

    names = bundles_with_stored() if all_sessions else [name]
    if not names or names == [None]:
        raise typer.BadParameter("Name oder --all angeben.")
    for one in names:
        r = hand_gate.gate_scan(one, tag=tag)
        print(f"[OK] {one}: {r['frames']} Bretter, {r['veto']} mit Veto -> {r['path']}", flush=True)


@occluders_app.command("alpha-worker")
def occluders_alpha_worker(
    name: str | None = typer.Argument(None, help="Recording name under data/recordings/."),
    all_sessions: bool = typer.Option(False, "--all",
                                      help="Every exported session in ONE process — the weights "
                                           "load once instead of per session (6-10 min each)."),
    limit: int = typer.Option(0, "--limit",
                              help="Target mattes per session (0 = all). Counts what is already "
                                   "there, so a second round only fills the gap."),
    reason: str = typer.Option("occluded", "--reason",
                               help="Which dirty rows to matte: `occluded` (FEN still valid, the "
                                    "labelable ones) or `all`."),
    reported: bool = typer.Option(False, "--reported",
                                  help="Re-measure exactly the frames a human reported dirty in "
                                       "the labeling stream. Overrides --limit and any matte "
                                       "already there — the report is a verdict on that matte."),
) -> None:
    """Cut the hand out of a session's dirty pile with SAM 3: alpha per frame, coverage per square.

    Runs long by design (11.9 s a frame) and appends every row as it lands, so it can be stopped
    and resumed at any point. The pile itself was chosen by the frame scan (`docs/frame-scan.md`).
    """
    from . import matte as matte_mod

    config.cap_blas_threads()          # GPU path: the BLAS arenas are 3.2 GB of dead reservation
    matte_mod.exit_with_parent()

    if bool(name) == all_sessions:
        print("[ERR] name or --all, not both")
        raise typer.Exit(1)
    if all_sessions:
        from .sessions import all_sessions

        names = [sid[3:] for sid, _ in all_sessions() if sid.startswith("rg-")]
        res = matte_mod.alpha_worker_all(names, limit=limit or None, reason=reason)
        print(f"[OK] {res['alphas']} Alphas ueber {res['sessions']} Sessions "
              f"({res['already']} lagen schon vor)", flush=True)
        sys.stdout.flush()
        os._exit(0)
    frames = None
    if reported:
        from .realgames import reported_dirty

        frames = {f"{index:06d}" for index in reported_dirty(f"rg-{name}")}
        if not frames:
            print(f"[OK] {name}: nothing reported dirty by hand")
            raise typer.Exit(0)
        print(f"[i] {len(frames)} frames reported, re-measuring those")
    try:
        res = matte_mod.alpha_worker(name, limit=limit or None, reason=reason, frames=frames)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e
    skipped = ", ".join(f"{k}: {v}" for k, v in sorted(res["skipped"].items())) or "keine"
    print(f"[OK] {res['alphas']} Alphas aus {res['frames']} Frames "
          f"({res['already']} lagen schon vor) -> {res['path']}", flush=True)
    print(f"     uebersprungen — {skipped}", flush=True)
    # Measured twice on 2026-08-19: the run finishes its frames, writes them, and then never
    # exits — the ROCm teardown wedges. Everything is on disk (each row is appended and flushed),
    # so leave without unwinding — but drop the weights first, like the `--all` path: a wedge
    # BEFORE `os._exit` left the worker alive holding its VRAM (measured 2026-08-21).
    matte_mod.unload_models()
    sys.stdout.flush()
    os._exit(0)


@dataset_app.command("verify")
def dataset_verify() -> None:
    """Consistency checks: files exist/loadable, out_size, labels, split disjointness."""
    raise typer.Exit(dataset_mod.run_verify())


@app.command("ingest")
def ingest_cmd(
    adapter: str = typer.Argument(..., help="synthetic (rendered dataset)."),
    root: str = typer.Argument(..., help="Path to locally extracted dataset."),
    tag: str | None = typer.Option(None, "--tag", help="Name for sessions/dataset (default: pretrain-<adapter>)."),
    board_size: int = typer.Option(900, "--board-size", help="Warp resolution (px). Keep moderate (phone source), otherwise upscale blur."),
    limit: int | None = typer.Option(None, "--limit", help="Only the first N images (quick test)."),
    debug_overlay: int = typer.Option(0, "--debug-overlay", help="Warp N frames + overlay FEN labels (visual check against label swapping)."),
    no_build: bool = typer.Option(False, "--no-build", help="Only slice, don't build a dataset."),
) -> None:
    """Ingest a corner-annotated dataset into our crop format -> pretrain dataset.

    Afterwards: `chesslab train --dataset <tag> --backbone mobilenet_v3_small`, then on
    your own sessions `train --dataset <yours> --resume <pretrain-run>`. IMPORTANT: before the big
    run with `--debug-overlay 8` check orientation (wrong corners silently swap all labels)."""
    from . import ingest as ingest_mod

    t = tag or f"pretrain-{adapter.lower()}"
    try:
        summary = ingest_mod.run_ingest(
            adapter, root, tag=t, board_size=board_size,
            limit=limit, debug_overlay_n=debug_overlay, build=not no_build)
    except (ValueError, FileNotFoundError) as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1)
    print(f"[OK] {summary['adapter']}: {summary['items']} images, {summary['sessions']} sessions, "
          f"{summary['crops']} crops -> {summary['manifest']}")
    if summary.get("overlays"):
        print(f"[OK] Visual check: {len(summary['overlays'])} overlay PNGs in "
              f"{Path(summary['overlays'][0]).parent} — please review BEFORE starting the big pretrain.")
    if summary.get("dataset"):
        print(f"[OK] Dataset '{summary['dataset']}' built: {summary.get('dataset_counts')}")
    raise typer.Exit(0)


@dataset_app.command("build")
def dataset_build_cmd(
    name: str = typer.Argument(..., help="Name of the dataset."),
    sessions: str = typer.Option(..., "--sessions", help="Comma-separated session IDs."),
    per_cell_cap: int = typer.Option(config.DEDUP.per_cell_cap, "--cap", help="Max. crops per (session,square,piece)."),
    # Reads the config default instead of hardcoding one: `--no-phash` used to default to False,
    # so the CLI forced `phash_enabled=True` whatever `config.DEDUP` said — the setting was
    # unreachable from the one place the project keeps its policy.
    phash: bool = typer.Option(config.DEDUP.phash_enabled, "--phash/--no-phash",
                               help="Perceptual-hash dedup (dhash). OFF by default since "
                                    "2026-07-30: it discarded 54.8% of the corpus, none of it "
                                    "pixel-identical, and cost 42 misses against 17. See "
                                    "config.DedupDefaults."),
    hamming: int = typer.Option(config.DEDUP.phash_hamming, "--hamming"),
    per_position: int = typer.Option(
        None, "--per-position",
        help="Keep only N boards per distinct position, spread over the interval. The rig records "
             "every 0.1 s while the board stands still, so the corpus is 246 positions over 9 386 "
             "boards; 16 per position measured BETTER on macro recall than all of them."),
    rotate: bool = typer.Option(False, "--rotate/--no-rotate",
                                help="90/180/270° augmentation (off by default: quadruples the train split "
                                     "on disk and contradicts the fixed-camera assumption)."),
    allow_degenerate: bool = typer.Option(False, "--allow-degenerate", help="Allow degenerate dataset (class only in one session etc.)."),
    no_pack: bool = typer.Option(False, "--no-pack", help="Skip packing crops into a memmap (default: pack for fast training)."),
    pack_size: str = typer.Option(
        None, "--pack-size",
        help="Pack at the MODEL's size (e.g. 80x80) instead of the crop file's. Scales once."),
    source_manifest: str | None = typer.Option(None, "--source-manifest",
                                               help="Crop pool(s) to filter, comma-separated. Default: "
                                                    "crops/default/manifest.jsonl. Needed after `ingest "
                                                    "--tag X --no-build`, which writes crops/X/manifest.jsonl."),
    classes: str | None = typer.Option(None, "--classes",
                                       help="pieces13 (13, default) | pieces (14, with `occluded`, "
                                            "which has zero rows in the corpus). pieces13 NARROWS the "
                                            "existing labels at build time — no crop is re-labelled, "
                                            "only `occluded` rows are dropped. With --like this is "
                                            "the ONE flag that still "
                                            "wins over the donor: a twin that differs in its class "
                                            "list is the whole point of building one."),
    like: str | None = typer.Option(None, "--like",
                                    help="Build the TWIN of this dataset: its session split, its "
                                         "dedup policy and its class balancing, all verbatim and "
                                         "OVERRIDING the flags above. Use it for any build meant to "
                                         "be compared with a model trained on that dataset — "
                                         "neither the split nor the old defaults are recoverable "
                                         "otherwise, and a near-twin is worse than no twin."),
    add_test: str | None = typer.Option(None, "--add-test",
                                        help="With --like: extra session IDs (comma-separated) "
                                             "appended to the TEST split. Train and val stay "
                                             "byte-identical, so every model trained against the "
                                             "donor stays comparable. Note it changes the margin "
                                             "metric, which is a max over empty crops - more crops "
                                             "can only raise it, so numbers from the donor's test "
                                             "set are NOT comparable to numbers from this one."),
    force_train: str | None = typer.Option(None, "--force-train",
                                          help="Session IDs (comma-separated) pinned to TRAIN. "
                                               "Pins the whole split group, so naming one block of "
                                               "a clip keeps the clip together. Use it for material "
                                               "that must not sit in a holdout - the only position "
                                               "a composite corpus has, an all-empty lighting "
                                               "capture - and say in the dataset why."),
    add_train: str | None = typer.Option(None, "--add-train",
                                         help="With --like: extra session IDs appended to the TRAIN "
                                              "split. Unlike --add-test this CHANGES what the model "
                                              "sees, so the result is a new corpus, not a twin - "
                                              "only the test split stays comparable with the "
                                              "donor's."),
) -> None:
    """Build named dataset from session selection (filter -> dedup -> rotation -> split -> pack)."""
    from . import dataset_build as db

    sids = [s.strip() for s in sessions.split(",") if s.strip()]
    srcs = [s.strip() for s in source_manifest.split(",") if s.strip()] if source_manifest else None
    try:
        res = db.build_dataset(name, sids, source_manifest=srcs,
                               per_cell_cap=per_cell_cap, phash_enabled=phash,
                               phash_hamming=hamming, per_position=per_position,
                               rotations=(config.DEDUP.rotations_augmented if rotate else config.DEDUP.rotations),
                               allow_degenerate=allow_degenerate, pack=not no_pack,
                               pack_size=_out_size(pack_size),
                               class_mode=classes, like=like,
                               force_train=[s.strip() for s in (force_train or '').split(',') if s.strip()],
                               add_test=[s.strip() for s in (add_test or '').split(',') if s.strip()],
                               add_train=[s.strip() for s in (add_train or '').split(',') if s.strip()])
    except ValueError as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1)
    c = res["counts"]
    print(f"[OK] Dataset '{res['name']}': raw {c['raw']} -> dedup {c['after_dedup']} -> "
          f"final {c['final']}. Split: {res['split_counts']}.")
    for w in res["warnings"]:
        print(f"  ! {w}")


@dataset_app.command("build-synth")
def dataset_build_synth_cmd(
    name: str = typer.Argument(..., help="Name of the dataset."),
    renders: str = typer.Option(..., "--renders", help="Render output root (searches recursively "
                                                       "for <i>.json + <i>.jpg/.png, so --shards "
                                                       "subdirs are found automatically)."),
    board_size: int = typer.Option(config.SYNTH.warp_board_size, "--board-size",
                                   help="Warp resolution (px). 1100 ~ 137 px/square, matching the "
                                        "framed renders (~134); 900 silently upscaled crops."),
    per_cell_cap: int = typer.Option(config.DEDUP.per_cell_cap, "--cap",
                                     help="Max. crops per (session,square,piece). NOTE: with "
                                          "views-per-scene 4 the default 4 keeps only ~68% of the "
                                          "focus classes (one scene's 4 views fill the cap) — use "
                                          "--cap 8 for large balanced synth runs."),
    val_frac: float = typer.Option(config.DEFAULT_VAL_FRAC, "--val-frac",
                                   help="Val fraction (sessions). Synth holdout is uncapped — "
                                        "0.05 shrinks the memmap considerably vs the default."),
    test_frac: float = typer.Option(config.DEFAULT_TEST_FRAC, "--test-frac",
                                    help="Test fraction (sessions)."),
    rotate: bool = typer.Option(False, "--rotate/--no-rotate",
                                help="Record 90-degree rotation augmentation (applied on-the-fly at "
                                     "train time — nothing is materialized). OFF by default, like "
                                     "`dataset build`: it contradicts the fixed-camera assumption "
                                     "and diverse renders already carry the variance."),
    workers: int | None = typer.Option(None, "--workers", help="Pixel-pass processes (default: auto)."),
    classes: str = typer.Option("pieces13", "--classes",
                                help="pieces13 (13, default) | pieces (14, with `occluded`). "
                                     "pieces13 narrows the FEN labels at build time."),
) -> None:
    """Fused synthetic build: renders -> packed memmap directly.

    Skips the crop-PNG middle copy (~60 GB on a 100k/class set) and phash (synth scenes have no
    near-duplicates). One pixel pass: load each render once, warp once, crop straight into
    ``packed_images.u8``. Rotation augmentation happens at train time, not on disk."""
    from .synth_build import build_synth_dataset

    try:
        res = build_synth_dataset(name, renders, board_size=board_size, per_cell_cap=per_cell_cap,
                                  rotations=(config.DEDUP.rotations_augmented if rotate
                                             else config.DEDUP.rotations),
                                  val_frac=val_frac, test_frac=test_frac, workers=workers,
                                  class_mode=classes)
    except (ValueError, RuntimeError) as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1)
    c = res["counts"]
    print(f"[OK] Dataset '{res['name']}': raw {c['raw']} -> final {c['final']}. "
          f"Split: {res['split_counts']}. Packed: {res['packed']['gb']} GB.")
    for w in res["warnings"]:
        print(f"  ! {w}")


@dataset_app.command("pack")
def dataset_pack_cmd(
    name: str = typer.Argument(..., help="Dataset to pack."),
    pack_size: str = typer.Option(None, "--pack-size",
                                  help="Pack at the MODEL's resolution (e.g. 80x80) instead of the "
                                       "crop file's. The crop store went to 128 px for the label "
                                       "view; packing that verbatim costs 22.6 GB where the 80 px "
                                       "recipe needs 9.5, and every batch then pays a resize."),
    from_: str = typer.Option(None, "--from",
                              help="Read another dataset's memmap instead of decoding a second "
                                   "copy. For a variant whose manifest only re-SELECTS rows the "
                                   "owner already packed; refused when it needs a crop the owner "
                                   "does not carry. Deletes this dataset's own memmap if present."),
) -> None:
    """Pack a dataset's crops into one memmap for fast training (1M+ PNG I/O fix).

    Decodes every crop once into ``data/datasets/<name>/packed_images.u8``; `train --dataset <name>`
    then reads from the memmap instead of opening 1M files per epoch. Re-run after rebuilding.
    """
    if from_:
        from .training.pack import link_pack

        try:
            link_pack(name, from_)
        except (FileNotFoundError, ValueError) as e:
            print(f"[FAIL] {e}")
            raise typer.Exit(1) from None
        return
    from .training.pack import pack_dataset

    try:
        res = pack_dataset(name, out_size=_out_size(pack_size))
    except (FileNotFoundError, ValueError) as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1) from None
    print(f"[OK] packed '{name}': {res['n']} crops, {res['gb']} GB -> {res['path']}")


@dataset_app.command("folds")
def dataset_folds_cmd(
    name: str = typer.Argument(..., help="Built dataset to cut into folds."),
    k: int = typer.Option(4, "-k", "--folds", help="Number of folds (docs/cross-labeling-literature.md: 4)."),
    seed: int | None = typer.Option(None, "--seed", help="Default: the dataset's own split seed."),
    val_frac: float | None = typer.Option(None, "--val-frac", help="Default: the dataset's own."),
    prefix: str = typer.Option("split-f", "--prefix", help="File name prefix, e.g. split-f0.json."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Report only, write nothing."),
    force: bool = typer.Option(False, "--force", help="Overwrite existing fold files."),
    allow_asymmetric: bool = typer.Option(False, "--allow-asymmetric",
                                          help="Proceed although the dataset was deduped train-only."),
) -> None:
    """Session-grouped cross-validation folds: k `split-f<i>.json` beside the dataset's split.

    For out-of-fold label auditing — every session is predicted by a model that never trained
    on it. All folds share the one pack, so nothing is re-packed."""
    from . import dataset_build as db

    try:
        db.make_folds(name, k, seed=seed, val_frac=val_frac, prefix=prefix,
                     dry_run=dry_run, force=force, allow_asymmetric=allow_asymmetric)
    except (ValueError, FileNotFoundError) as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1) from None


@dataset_app.command("list")
def dataset_list_cmd() -> None:
    """List existing datasets."""
    from . import dataset_build as db

    for d in db.list_datasets():
        print(f"{d['name']}: {d['n_sessions']} sessions, {d['counts'].get('final', '?')} crops, "
              f"split {d.get('split_counts', {})}")


@dataset_app.command("delete")
def dataset_delete_cmd(name: str = typer.Argument(...)) -> None:
    """Delete dataset (raw material/sessions remain)."""
    from . import dataset_build as db

    try:
        db.delete_dataset(name)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        raise typer.Exit(1) from None
    print(f"[OK] Dataset '{name}' deleted.")


@app.command("train")
def train_cmd(
    backbone: str = typer.Option(
        config.DEFAULT_BACKBONE,
        "--backbone",
        help="Any timm model (default: mobilenetv4_conv_small_035, what every shipped model is) "
             "| mobilenet_v3_small | smallcnn. WARNING: `smallcnn` hard-crashes ROCm-Windows.",
    ),
    epochs: int = typer.Option(config.DEFAULT_EPOCHS, "--epochs"),
    batch_size: int = typer.Option(config.DEFAULT_BATCH_SIZE, "--batch-size"),
    input_size: str = typer.Option(
        None, "--input-size",
        help="Model input WxH (e.g. 80x80), scaled in memory. Default: the crop's own size."),
    lr: float = typer.Option(config.DEFAULT_LR, "--lr"),
    no_amp: bool = typer.Option(False, "--no-amp", help="Disable AMP/autocast."),
    seed: int = typer.Option(config.SEED, "--seed"),
    out: str = typer.Option(None, "--out", help="Run directory (default: data/models/run-<ts>)."),
    patience: int = typer.Option(config.DEFAULT_PATIENCE, "--patience", help="Early stopping patience."),
    num_workers: int | None = typer.Option(
        None,
        "--num-workers",
        help=f"DataLoader workers (default: {config.DEFAULT_NUM_WORKERS}).",
    ),
    crop_norm: str = typer.Option("fixed", "--crop-norm",
                                 help="fixed | per-crop. per-crop standardises EACH crop by its own "
                                      "mean/std instead of the dataset's. It is the contrast stretch "
                                      "GroupNorm was doing inside the network: a black piece on a dark "
                                      "square carries 6 grey levels against 40 on a light one, and doing "
                                      "it here lets BatchNorm fold away (5x fewer graph nodes)."),
    input_repr: str = typer.Option("rgb", "--input-repr",
                                   help="rgb | gray+sobel | rgb+sobel | sobel. What the first "
                                        "convolution is fed. The sobel channel is |Gx|+|Gy| of the "
                                        "luminance: taking the MAGNITUDE rectifies away whether the "
                                        "piece is darker or lighter than its square. MEASURED AND "
                                        "LOST on the 18-clip harness (whole-board occupancy: rgb "
                                        "0.9978, rgb+sobel 0.0308, gray+sobel 0.0307) — keep `rgb` "
                                        "unless you are re-running the experiment."),
    norm: str | None = typer.Option(None, "--norm", help="batchnorm (default) | groupnorm | none."),
    dataset: str | None = typer.Option(None, "--dataset", help="Named dataset (otherwise global manifest/split)."),
    resume: str | None = typer.Option(None, "--resume", help="Run name whose weights are loaded as warm-start (continue training)."),
    head: str = typer.Option("occlusion", "--head",
                             help="occlusion (default) | combined. `occlusion` adds a "
                                  "sigmoid coverage unit beside the classes and trains it from the "
                                  "manifest's `coverage` — see docs/occluder-plates.md."),
    scales: str | None = typer.Option(None, "--scales", help="Multi-Scale-Training: Komma-Liste von Eingabegrößen "
                                      "(z.B. 64,96,128). Pro Batch wird zufällig eine gewählt → ein Modell für alle "
                                      "Auflösungen (size-agnostisch, für günstige Low-Res-Inferenz)."),
    erase_p: float | None = typer.Option(None, "--erase-p", help="Override RandomErasing/Cutout prob (anti-shortcut)."),
      jitter_translate: float | None = typer.Option(None, "--jitter-translate",
                                                  help="Override the affine translation jitter, as a "
                                                       "fraction of the crop. The default 0.03 is ~3.3 % "
                                                       "of a cell, and real footage arrives at ~9 % "
                                                       "(measured on the test clips) - the corpus used "
                                                       "to supply that variation by being mis-cut, and "
                                                         "since it was aligned it no longer does."),
      hard_negative_multiplier: float = typer.Option(
          1.0,
          "--hard-negative-multiplier",
          help="Sampling weight for paths in data/reports/hard_empty.jsonl (1 = disabled).",
      ),
    swa: bool = typer.Option(False, "--swa",
                             help="Gewichte ueber die letzten Epochen mitteln (SWA). Findet flache Minima, die die Konfidenz richtiger von falschen Vorhersagen besser trennen (FMFP, ECCV 2022). Der Plan davor bleibt unveraendert."),
    swa_lr: float = typer.Option(5e-4, "--swa-lr", help="Konstante Rate ab dem SWA-Start."),
    swa_start: float = typer.Option(0.75, "--swa-start",
                                    help="Anteil der Epochen, ab dem gemittelt wird."),
    visible_max: float = typer.Option(None, "--visible-max",
                                      help="Coverage-Grenze der TRAININGS-Maske (Vorgabe "
                                           "PIECE_VISIBLE_MAX = 0.15). Die Metriken bleiben auf "
                                           "der Vorgabe, damit Laeufe vergleichbar bleiben."),
    allow_unpacked: bool = typer.Option(False, "--allow-unpacked",
                                        help="Training ohne Memmap zulassen. Ohne das bricht ein "
                                             "packbarer Datensatz ab, statt still auf den "
                                             "langsamen Datei-Loader zu fallen."),
    split: str | None = typer.Option(None, "--split", help="Split file inside the dataset "
                                     "(default: split.json). Lets several folds share ONE packed "
                                     "corpus instead of packing the same crops per fold."),
    loss: str = typer.Option("ce", "--loss", help="ce | focal — focal down-weights the easy, "
                                                  "already-solved crops (needs --head combined)."),
    focal_gamma: float = typer.Option(2.0, "--focal-gamma", help="Focal loss gamma (0 = weighted CE)."),
    class_weight: str | None = typer.Option(None, "--class-weight", help="Per-class loss weight "
                                            "override as comma-separated KEY=VALUE (e.g. "
                                            "'occupied=2.0' or 'empty=0.9,occupied=2.0'). Applied "
                                            "on top of split.json's inverse-frequency weights."),
    weight_decay: float | None = typer.Option(None, "--weight-decay",
                                              help="AdamW-Zerfall. Ohne Angabe PyTorchs 0,01 — "
                                                   "der Wert, auf dem jeder bisherige Lauf lief, "
                                                   "ohne dass ihn jemand gewaehlt haette."),
    label_smoothing: float = typer.Option(0.0, "--label-smoothing",
                                          help="Gegen ueberzeugte Fehler: die Konfidenz auf "
                                               "Fehlern liegt bei 0,75-0,84."),
    weight_cap: float | None = typer.Option(None, "--weight-cap",
                                            help="Verhaeltnis groesstes/kleinstes Klassengewicht "
                                                 "hoechstens SO. Geglaettet (w ~ 1/n^a), nicht "
                                                 "beschnitten; der Verlustmassstab bleibt gleich. "
                                                 "Ungekappt sind es ~12x."),
    sched: str = typer.Option("cosine", "--sched",
                              help="cosine (default) | none. The cosine period is tied to --epochs, "
                                   "so a longer run is a different trajectory, not a longer one: "
                                   "more steps AND more time at a high rate move together. Use "
                                   "'none' to pin the rate when the question is whether LONGER "
                                   "training helps, so the epoch count is the only variable."),
) -> None:
    """Train per-square CNN on the ROCm GPU (board accuracy = checkpoint metric)."""
    from .training.train import run_train

    scale_list = [int(s) for s in scales.split(",") if s.strip()] if scales else None
    cw: dict[str, float] = {}
    for item in (s.strip() for s in (class_weight or "").split(",") if s.strip()):
        if "=" not in item:
            print(f"[FAIL] --class-weight expects KEY=VALUE, got {item!r}.")
            raise typer.Exit(1)
        k, v = item.split("=", 1)
        cw[k.strip()] = float(v)
    raise typer.Exit(run_train(backbone=backbone, epochs=epochs, per_crop=(crop_norm == "per-crop"),
                               input_repr=input_repr, batch_size=batch_size, lr=lr,
                               no_amp=no_amp, seed=seed, out=out, patience=patience,
                               num_workers=num_workers, norm=norm, dataset=dataset, resume=resume,
                               head=head, scales=scale_list, input_size=input_size,
                               erase_p=erase_p,
                                 loss=loss, focal_gamma=focal_gamma, class_weight=cw or None,
                                 sched=sched, jitter_translate=jitter_translate,
                                 hard_negative_multiplier=hard_negative_multiplier, split=split,
                                 swa=swa, swa_lr=swa_lr, swa_start=swa_start,
                                 allow_unpacked=allow_unpacked, visible_max=visible_max,
                                 weight_cap=weight_cap, weight_decay=weight_decay,
                                 label_smoothing=label_smoothing))


@app.command("eval")
def eval_cmd(
    run: str = typer.Option(..., "--run", help="Run directory from `train`."),
    split: str = typer.Option("test", "--split", help="train | val | test | all (no split filter)"),
    input_size: int | None = typer.Option(None, "--input-size", help="Eingabegröße für die Auswertung "
                                           "(z.B. 64/96/128). Misst die Genauigkeit bei einer Deployment-Auflösung "
                                           "(für die Auflösungs-Kurve eines Multi-Scale-Modells)."),
    dataset: str | None = typer.Option(None, "--dataset",
                                       help="Measure against THIS dataset instead of the one the "
                                            "run was trained on. Writes eval_<split>__<dataset>.json "
                                            "so the run's own numbers stay put, and warns about "
                                            "sessions the run trained on."),
    split_file: str | None = typer.Option(None, "--split-file",
                                          help="Split file inside the dataset (default: split.json, "
                                               "or the run's own). Names a fold, e.g. split-f0.json."),
    sessions: str | None = typer.Option(None, "--sessions",
                                        help="Comma-separated session IDs to narrow the split to."),
) -> None:
    """Board accuracy, per-class recall, per-session table and confusion matrix (text + PNG)."""
    from .training.evaluate import run_eval

    raise typer.Exit(run_eval(run=run, split_name=split, input_size=input_size, dataset=dataset,
                              split_file=split_file,
                              sessions=[s.strip() for s in sessions.split(",") if s.strip()]
                              if sessions else None))


@app.command("reliance")
def reliance_cmd(
    run: str = typer.Option(..., "--run", help="Run directory from `train`."),
    split: str = typer.Option("test", "--split", help="train | val | test"),
    per_class: int = typer.Option(16, "--per-class", help="Crops sampled per class for the occlusion test."),
) -> None:
    """Background reliance: per-class `piece_frac` (does it read the piece or the board?).

    Mask-free Zeiler & Fergus occlusion: piece_frac near 1 = decision driven by the FIGURE,
    near 0 = by the surrounding BOARD (the shortcut). Occupied classes < 45% are flagged WEAK.
    Writes `<run>/reliance.json` for reproducible before/after comparison. NOTE: the split shares
    the same physical board, so the shortcut inflates in-distribution recall — trust THIS metric
    over recall when judging robustness."""
    import json
    from pathlib import Path

    from .training.gradcam import reliance_for_run

    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] no config.json in {run_dir} — first run `chesslab train`.")
        raise typer.Exit(1)
    stats = reliance_for_run(run_dir, split=split, per_class=per_class)
    typer.echo(f"{'class':>8}  {'n':>4}  {'piece%':>7}  {'base':>5}  flag")
    for r in sorted(stats, key=lambda s: s["piece_frac"]):
        pf = r["piece_frac"] * 100
        weak = r["cls"] not in ("empty", "occluded") and pf < 45
        typer.echo(f"{r['cls']:>8}  {r['n']:>4}  {pf:>6.1f}%  {r['base_prob']:>5.2f}  {'WEAK' if weak else ''}")
    occ = [r for r in stats if r["cls"] not in ("empty", "occluded")]
    if occ:
        typer.echo(f"\nmean piece_frac (occupied classes): "
                   f"{sum(r['piece_frac'] for r in occ) / len(occ) * 100:.1f}%")
    (run_dir / "reliance.json").write_text(
        json.dumps({"split": split, "per_class": per_class, "classes": stats}, indent=2), encoding="utf-8")
    typer.echo(f"wrote {run_dir / 'reliance.json'}")


@app.command("export")
def export_cmd(
    run: str = typer.Option(..., "--run", help="Run directory from `train`."),
    fmt: str = typer.Option("torchscript", "--format",
                            help="torchscript | onnx | qnn | onnx-qnn | all "
                                 "(qnn = INT8/QDQ ONNX for the on-device Hexagon NPU)"),
    infer_size: str | None = typer.Option(
        None, "--infer-size",
        help="Set the model's inference size WxH (e.g. 96x96) in its config.json, then export at "
             "it. Omit to use what the model already declares. What a crop carries is "
             "board_size/8 * (1 + 2*pad_side) px — 110 on the fixed rig — see specs/22."),
) -> None:
    """Export best.pt to TorchScript/ONNX + model_card.json (handoff to inference app)."""
    from .training.evaluate import run_export

    size = _out_size(infer_size)
    raise typer.Exit(run_export(run=run, fmt=fmt, infer_size=size))


@app.command("quantize")
def quantize_cmd(
    run: str = typer.Option(..., "--run", help="Run directory (must already contain model.onnx)."),
    limit: int = typer.Option(128, "--limit", help="Number of calibration crops (class-balanced)."),
    activation: str = typer.Option("quint16", "--activation",
                                   help="quint16 (A16W8, recommended for HTP) | quint8 (pure INT8)."),
    weight: str = typer.Option("quint8", "--weight", help="quint8 | qint8 (weight dtype)."),
    per_channel: bool = typer.Option(
        True, "--per-channel/--per-tensor",
        help="One weight scale per output channel (default) or one per tensor. Per-channel was "
             "the only phantom-free graph measured in specs/26 phase 02; per-tensor is the "
             "historical HTP constraint — use it if the NPU refuses the per-channel graph."),
) -> None:
    """Static-quantize model.onnx -> model.qnn.onnx (INT8 QDQ) for the Hexagon NPU QNN EP."""
    from .training.quantize import run_quantize

    raise typer.Exit(run_quantize(run=run, limit=limit, activation_type=activation,
                                  weight_type=weight, per_channel=per_channel))


@synth_app.command("render")
def synth_render(
    out: str = typer.Option(..., "--out", help="Target directory (required)."),
    blend: str = typer.Option(None, "--blend", help="Blender scene (default: synth/assets/Chess Scene.blend)."),
    pieces_dir: str = typer.Option(None, "--pieces-dir", help="Scanned piece templates (default: synth_pieces/)."),
    board_texture: str | None = typer.Option(None, "--board-texture",
                                             help="Rectified board photo texture (default: synth_pieces/board_texture.png"
                                                  " if present, otherwise procedural wood)."),
    n: int = typer.Option(200, "--n", help="Number of positions to render."),
    seed: int = typer.Option(42, "--seed"),
    fens: str | None = typer.Option(None, "--fens", help="FEN list (otherwise fallback starting position)."),
    res: int = typer.Option(1024, "--res", help="Render resolution (px)."),
    views_per_scene: int = typer.Option(1, "--views-per-scene",
                                        help="Views (camera+light) per piece setup. >1 = scene reuse: "
                                             "render same scene multiple times -> significantly faster."),
    samples: int = typer.Option(24, "--samples", help="EEVEE TAA render samples (lower = faster)."),
    max_obliqueness: float = typer.Option(0.20, "--max-obliqueness",
                                          help="Max camera obliqueness (offset/height). Matched to real ~0.06 top-down "
                                               "camera; image is reprojected to top-down via homography during ingest."),
    piece_scale: float = typer.Option(1.0, "--piece-scale",
                                      help="Global piece scale factor (match crop fill to the real camera; >1 = larger)."),
    cam_distance_jitter: float = typer.Option(0.0, "--cam-distance-jitter",
                                              help="Vary camera distance per view over a band (0 = fixed). "
                                                   "H = base * uniform(1-j .. 1+j); e.g. 0.4 -> ~0.6x-1.4x distance "
                                                   "(closer = stronger perspective/lean + bigger piece)."),
    occlusion_p: float = typer.Option(0.0, "--occlusion-p",
                                      help="Fraction of views with a rendered occluder (fist/forearm that casts a "
                                           "shadow); covered squares are labeled `occluded`. 0 = none."),
    isolate_p: float = typer.Option(0.0, "--isolate-p",
                                    help="Curriculum stage 1: fraction of scenes on a NON-board "
                                         "randomized ground (solid/gradient/noise, no 8x8, no frame) "
                                         "so only the piece carries information. 1.0 = all."),
    frame_frac: float = typer.Option(0.80, "--frame-frac",
                                     help="Target share of the frame the board fills (largest extent). "
                                          "Drives effective px/square: 0.80 ~ 102 px/square at --res 1024. "
                                          "0 = leave the focal length alone (old behaviour, ~39% = 51 px)."),
    borderless_p: float = typer.Option(0.0, "--borderless-p",
                                       help="Fraction of scenes with a BORDERLESS procedural board (checker runs "
                                            "edge-to-edge, no frame) — anti edge-shortcut for rim pieces. 0 = none."),
    shards: int = typer.Option(1, "--shards",
                               help="Parallel Blender processes. One process leaves the machine at ~20%; "
                                    "4 shards reach ~90% GPU (~4x wall-clock). Output goes to <out>/shard-<k>/ "
                                    "with disjoint seeds and an interleaved split of --fens."),
    blender: str | None = typer.Option(None, "--blender", help="Blender executable (default: blender, via CHESSLAB_BLENDER)."),
) -> None:
    """Generate synthetic board renderings with Blender/EEVEE (v2: board texture + procedural fallback)."""
    import subprocess

    from .config import SYNTH, build_blender_cmd

    repo_root = Path(__file__).resolve().parents[2]
    script = repo_root / "synth" / "render_board_v2.py"

    b = Path(blend) if blend else SYNTH.blend
    p = Path(pieces_dir) if pieces_dir else SYNTH.pieces_dir if SYNTH.pieces_dir.exists() else None
    o = Path(out).resolve()
    fe = Path(fens).resolve() if fens else None
    bl = blender or SYNTH.blender_cmd()

    # Board texture: explicit --board-texture > default path (if present) > None (= procedural)
    bt: Path | None = None
    if board_texture:
        bt = Path(board_texture).resolve()
    elif SYNTH.board_texture.exists():
        bt = SYNTH.board_texture

    def _cmd(out_dir: Path, n_shard: int, seed_shard: int, fens_shard: Path | None) -> list[str]:
        return build_blender_cmd(bl, b, script, out_dir, n=n_shard, seed=seed_shard,
                                 fens=fens_shard, pieces=p, res=res, board_texture=bt,
                                 views_per_scene=views_per_scene, samples=samples,
                                 max_obliqueness=max_obliqueness, piece_scale=piece_scale,
                                 cam_distance_jitter=cam_distance_jitter, occlusion_p=occlusion_p,
                                 borderless_p=borderless_p, isolate_p=isolate_p,
                                 frame_frac=frame_frac)

    shards = max(1, int(shards))
    if shards == 1:
        jobs = [(o, _cmd(o, n, seed, fe))]
    else:
        # Interleaved FEN split (shard k gets lines k, k+shards, ...): every shard sees the same
        # position MIX (density/type distribution) and no two shards render the same FEN.
        fen_lines = ([line for line in fe.read_text(encoding="utf-8").splitlines() if line.strip()]
                     if fe and fe.exists() else [])
        base, rem = divmod(n, shards)
        jobs = []
        for k in range(shards):
            so = o / f"shard-{k}"
            so.mkdir(parents=True, exist_ok=True)
            sfe = None
            if fen_lines:
                sfe = so / "fens.txt"
                sfe.write_text("\n".join(fen_lines[k::shards]) + "\n", encoding="utf-8")
            jobs.append((so, _cmd(so, base + (1 if k < rem else 0), seed + k, sfe)))

    procs: list[tuple[Path, subprocess.Popen]] = []
    log_fhs = []
    try:
        for so, cmd in jobs:
            print(" ".join(cmd))
            # Shard stdout -> shard-k/render.log (concurrent writers would interleave on the tty).
            log_fh = open(so / "render.log", "w", encoding="utf-8") if shards > 1 else None
            if log_fh is not None:
                log_fhs.append(log_fh)
            procs.append((so, subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT)))
    except FileNotFoundError:
        for _so, pr in procs:
            pr.terminate()
        for fh in log_fhs:
            fh.close()
        print(f"[FAIL] Blender not found ('{bl}'). Check path or set CHESSLAB_BLENDER.")
        raise typer.Exit(1)

    failed = [str(so) for so, pr in procs if pr.wait() != 0]
    for fh in log_fhs:
        fh.close()
    if failed:
        print(f"[FAIL] Blender render failed for: {', '.join(failed)}"
              + (" (see shard-*/render.log)" if shards > 1 else ""))
        raise typer.Exit(1)
    print(f"[OK] synth render: {o}" + (f" ({shards} shards)" if shards > 1 else ""))


@synth_app.command("prepare")
def synth_prepare_cmd(
    in_dir: str = typer.Option(..., "--in", help="Scans: each subfolder <piece>/ with .obj/.glb + texture."),
    out_dir: str = typer.Option(None, "--out", help="Target directory (default: synth_pieces/)."),
    smooth_iters: int = typer.Option(0, "--smooth-iters",
                                     help="Taubin smoothing iterations (0 = verbatim). Use ~10 for "
                                          "raw RealityScan exports with visible surface noise — "
                                          "shrink-free, keeps UVs/orientation."),
) -> None:
    """Batch-import scanned pieces (verbatim by default): variant slot, preview, report.

    Then check <out>/<piece>/<variant>_preview.png and review the [WARN] hints."""
    from .config import SYNTH
    from .meshprep import prepare_scan
    from .scan_discover import assess_report, discover_scans

    out = Path(out_dir).resolve() if out_dir else SYNTH.pieces_dir

    items, warnings = discover_scans(Path(in_dir))
    for w in warnings:
        print(f"[WARN] {w}")
    if not items:
        print("[FAIL] no scans found (expected: <in>/<piece>/*.glb/.obj + texture).")
        raise typer.Exit(1)

    from dataclasses import replace as _dc_replace

    from .scan_discover import is_bare_piece, next_variant

    results: list[tuple[str, str, list[str]]] = []
    for item in items:
        # Parity with the web prepare route: a BARE folder name ("wP") means "add a new
        # version" → next free slot. Without this, re-preparing a fresh scan of the same
        # piece silently OVERWROTE v1 — the ground-truth meshes all past renders used.
        if is_bare_piece(item.obj.parent.name):
            item = _dc_replace(item, variant=next_variant(out / item.name))
        pid = f"{item.name}/{item.variant}"
        print(f"--- {pid}: {item.obj.name}" + (f" + {item.tex.name}" if item.tex else " (texture embedded)"))
        try:
            report = prepare_scan(item, out, make_preview=True, smooth_iters=smooth_iters)
        except Exception as e:
            results.append((pid, "fail", [str(e)]))
            continue
        # Provenance like the web route: which scan folder produced this variant.
        (out / item.name / f"{item.variant}.src").write_text(item.obj.parent.name, encoding="utf-8")
        level, msgs = assess_report(report)
        results.append((pid, level, msgs))
        print(f"    {report.get('tris', '?')} triangles, "
              f"holes/open: {report.get('boundary_edges', '?')}, height_ratio: {report.get('height_ratio', '?')}")

    print("\nSummary:")
    for pid, level, msgs in results:
        glyph = {"ok": "[OK]  ", "warn": "[WARN]", "fail": "[FAIL]"}[level]
        print(f"{glyph} {pid}" + ("" if not msgs else " — " + "; ".join(msgs)))
    print(f"\nView previews at: {out}\\<piece>\\<variant>_preview.png — then `chesslab synth render ...`")
    raise typer.Exit(1 if any(lv == "fail" for _, lv, _ in results) else 0)


@synth_app.command("board-texture")
def synth_board_texture(
    image: str = typer.Option(..., "--image", help="Board photo (JPG/PNG) with 4 ArUco markers at the corners."),
    out: str = typer.Option(None, "--out", help="Target path (default: synth_pieces/board_texture.png)."),
    size: int = typer.Option(1024, "--size", help="Square output size (px)."),
    dict_name: str = typer.Option("DICT_4X4_50", "--dict", help="ArUco-Dictionary."),
    margin: float = typer.Option(-0.035, "--margin", help="Marker-to-grid inset (fraction). Negativ = ganzes "
                                 "Brett inkl. Koordinaten-Ring + Rahmen (passt zur Plane-Größe in "
                                 "render_board_v2.BOARD_PLAY_HALF_FRAC). Positiv = nur 8x8-Spielfeld."),
) -> None:
    """Rectify board photo to rectified square texture (for `synth render --board-texture`)."""
    import sys as _sys

    from .config import _REPO_ROOT, SYNTH

    # synth/ lives in repo root (not an installed package) — retrofit for CLI invocation.
    if str(_REPO_ROOT) not in _sys.path:
        _sys.path.insert(0, str(_REPO_ROOT))
    from synth.board_texture import rectify

    out_path = Path(out) if out else SYNTH.board_texture
    try:
        result = rectify(image, str(out_path), size=size, dict_name=dict_name, margin=margin)
        print(f"[OK] board-texture: {result}")
    except SystemExit as e:
        raise typer.Exit(e.code)


@synth_app.command("preview")
def synth_preview(
    obj: str = typer.Option(..., "--obj", help="Prepared piece (.obj, Z-up from `synth prepare`)."),
    out: str = typer.Option(..., "--out", help="Target PNG."),
    tex: str | None = typer.Option(None, "--tex", help="Texture PNG (default: <obj>.png alongside; --clay ignores it)."),
    clay: bool = typer.Option(False, "--clay", help="Render without texture (geometry only — bumps/holes most visible)."),
    blender: str | None = typer.Option(None, "--blender", help="Blender executable (default: auto-detected)."),
) -> None:
    """Render a single piece nicely (orthographic 3/4 view, upright, two light sources)."""
    import subprocess

    from .config import SYNTH

    repo_root = Path(__file__).resolve().parents[2]
    script = repo_root / "synth" / "render_piece.py"
    obj_p = Path(obj).resolve()
    tex_p = None if clay else (Path(tex).resolve() if tex else obj_p.with_suffix(".png"))
    if tex_p is not None and not tex_p.exists():
        print(f"[WARN] Texture {tex_p} missing — rendering clay.")
        tex_p = None
    bl = blender or SYNTH.blender_cmd()
    cmd = [bl, "--background", "--python-exit-code", "1", "--python", str(script), "--",
           str(obj_p), str(Path(out).resolve()), str(tex_p) if tex_p else "-"]
    print(" ".join(cmd))
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError:
        print(f"[FAIL] Blender not found ('{bl}'). Set CHESSLAB_BLENDER.")
        raise typer.Exit(1)
    except subprocess.CalledProcessError as e:
        print("[FAIL] Render failed:\n" + "\n".join((e.stdout or "").splitlines()[-6:]))
        raise typer.Exit(1)
    print(f"[OK] synth preview: {out}")


def main() -> None:
    # Ensure non-ASCII report glyphs (—, umlauts) render on Windows consoles too.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001 - best effort; default encoding is fine elsewhere
            pass
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    app()


if __name__ == "__main__":
    main()
