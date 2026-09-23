"""`chesslab session` — everything that edits a recorded session before it is sliced.

`slice` warps every crop through its log row's `corners`, so these verbs decide where the 64 crops
of a frame get cut. Placing corners by hand is absent on purpose: it needs an image to click on.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime

import typer

from .. import config
from ._common import (
    _each_session,
    _exit_on_bulk_failures,
    _require_target,
    _session_call,
    fail_on,
)

session_app = typer.Typer(
    help="Recorded sessions: geometry repair, frame flagging, lifecycle.",
    no_args_is_help=True)


@session_app.command("list")
def session_list() -> None:
    """Active and archived sessions: frames, crops, mode, review state."""
    from .. import sessions as sessions_mod

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
    from .. import sessions as sessions_mod

    # Ein geparkter Frame-Satz kommt als ERROR-DICT zurueck, nicht als Ausnahme — `_session_call`
    # sieht das nicht, und die Erfolgsschluessel darauf ergaben einen Traceback statt [FAIL].
    r = _session_call(sessions_mod.scan_alignment, session)
    if r.get("error"):
        print(f"[FAIL] {session}: {r['error']}")
        raise typer.Exit(1)
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
    from .. import sessions as sessions_mod

    r = _session_call(sessions_mod.autofix_corners, session, max_off)
    if r.get("error"):
        print(f"[FAIL] {session}: {r['error']}")
        raise typer.Exit(1)
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
    from .. import sessions as sessions_mod

    def say(sid: str, r: dict) -> None:
        short = f", {r['too_short']} in zu kurzen Intervallen" if r["too_short"] else ""
        blind = f", {r['unseen']} ohne sichtbaren Zug" if r.get("unseen") else ""
        print(f"[OK] {sid}: {r['scored']}/{r['of']} Frames bewertet über {r['plies']} Intervalle"
              f"{short} — {r['intervals']} Plies geprüft{blind}, backup {r['backup']}", flush=True)

    _, failed = _each_session(session, all_sessions, sessions_mod.settle_scan_session, say)
    _exit_on_bulk_failures(failed)


@session_app.command("temporal-scan")
def session_temporal_scan(
    session: str = typer.Argument(..., help="Canonical session ID (rg- for recordings)."),
    cut: float = typer.Option(config.TEMPORAL_AUDIT_CUT, min=0.0001,
                             help="Normalized anomaly threshold for human review."),
) -> None:
    """Measure SAM-free image anomalies and refresh the Strittig audit cards."""
    from .. import position_flags, temporal_flags

    result = temporal_flags.scan_session(session, cut=cut)
    flags = position_flags.position_flags()
    print(f"[OK] {result['cells']} cells measured; {result['flags']} temporal candidates -> {result['path']}")
    print(f"[OK] {flags['flags']} combined audit cards -> {flags['path']}")
    if flags["stale_temporal"]:
        print(f"[WARN] Temporal scans need refreshing: {', '.join(flags['stale_temporal'])}")


@session_app.command("temporal-mattes")
def session_temporal_mattes(
    session: str = typer.Argument(..., help="Canonical session ID (rg- for recordings)."),
    method: str = typer.Option("local", help="local or difference; both write review proposals."),
    low: float = typer.Option(config.TEMPORAL_MATTE_LOW),
    high: float = typer.Option(config.TEMPORAL_MATTE_HIGH),
    max_gap_s: float = typer.Option(config.TEMPORAL_MATTE_MAX_GAP_S),
    peers: int = typer.Option(config.TEMPORAL_MATTE_PEERS, min=1,
                              help="Clean frames per side whose median is the plate."),
    refine: bool = typer.Option(True, help="Closed-form matting pulls the rim onto the image edge."),
    rgba: bool = typer.Option(False, help="Also write an RGBA view (lossy webp) per frame."),
    workers: int = typer.Option(1, min=1, help="Processes over contiguous frame chunks."),
    device: str = typer.Option("cpu", help="cuda runs the fit in torch; the rim stays closed-form."),
) -> None:
    """Automatically propose three-frame masks for temporal audit candidates."""
    from ..temporal_matte import propose_session

    if device != "cpu" and workers > 1:
        print("[ERR] --device cuda runs in one process; drop --workers.")
        raise typer.Exit(1)
    result = propose_session(session, method=method, low=low, high=high, max_gap_s=max_gap_s,
                             peers=peers, refine=refine, rgba=rgba, workers=workers, device=device)
    print(f"[OK] {result['proposed']} automatic mask proposals; {result['skipped']} without suitable references -> {result['path']}")
    print("[INFO] SAM masks and training coverage were not overwritten.")


@session_app.command("temporal-adopt")
def session_temporal_adopt(
    session: str = typer.Argument(..., help="Canonical session ID (rg- for recordings)."),
    method: str = typer.Option("local", help="Der Zweig unter reports/temporal-mattes/<name>/, den `temporal-mattes` geschrieben hat."),
) -> None:
    """Turn temporal mask proposals with a hand into matte rows for the matte lane."""
    from ..temporal_matte import adopt_proposals

    r = adopt_proposals(session, method=method)
    print(f"[OK] {r['adopted']} temporal mattes adopted, {r['empty']} empty, {r['replaced']} replaced, "
          f"{r['kept_sam']} frames already had a SAM row -> {r['path']}")


@session_app.command("temporal-upsert")
def session_temporal_upsert(
    session: str = typer.Argument(..., help="Canonical session ID (rg- for recordings)."),
    method: str = typer.Option("local", help="Der Zweig unter reports/temporal-mattes/<name>/, den `temporal-mattes` geschrieben hat."),
) -> None:
    """Where SAM found nothing on a frame, temporal's matte replaces it whole."""
    from ..temporal_matte import upsert_proposals

    r = upsert_proposals(session, method=method)
    print(f"[OK] {r['upserted']} frames upserted, {r['sam_found']} where SAM found a hand, "
          f"{r['fixed']} hand-fixed left alone, {r['replaced']} earlier upserts redone -> {r['path']}")


@session_app.command("temporal-pass")
def session_temporal_pass(
    name: str = typer.Argument(..., help="Recording name (or rg- id)."),
    workers: int = typer.Option(4, min=1, help="Processes for the three-frame mattes."),
    method: str = typer.Option("local", help="local oder difference; beide Zweige laufen durch "
                                             "dieselbe Kette."),
) -> None:
    """The temporal SOP in one press: scan, mattes, adopt, SAM over the adopted, upsert, flags."""
    import subprocess

    from .. import position_flags, temporal_flags
    from ..temporal_matte import (
        adopt_proposals,
        pass_inputs,
        propose_session,
        prune_dead_rows,
        upsert_proposals,
        write_pass_report,
    )

    session = name if name.startswith("rg-") else f"rg-{name}"
    started = datetime.now(UTC).isoformat()
    scan = temporal_flags.scan_session(session)
    print(f"[OK] scan: {scan['cells']} cells, {scan['flags']} candidates", flush=True)
    mattes = propose_session(session, method=method, workers=workers)
    print(f"[OK] mattes: {mattes['proposed']} proposals, {mattes['skipped']} skipped", flush=True)
    adopted = adopt_proposals(session, method=method)
    print(f"[OK] adopt: {adopted['adopted']} new, {adopted['kept_sam']} SAM kept", flush=True)
    if adopted["adopted"]:
        # Its own process: SAM's ROCm teardown wedges, and `alpha-worker` leaves via os._exit.
        code = subprocess.call([sys.executable, "-m", "chesslab.cli", "occluders", "alpha-worker",
                                session[3:], "--temporal"])
        if code != 0:
            print(f"[ERR] alpha-worker --temporal exited {code}")
            raise typer.Exit(1)
    upsert = upsert_proposals(session, method=method)
    print(f"[OK] upsert: {upsert['upserted']} frames, {upsert['sam_found']} stay with SAM", flush=True)
    pruned = prune_dead_rows(session)
    print(f"[OK] prune: {pruned['dropped']} superseded temporal rows dropped", flush=True)
    seen = pass_inputs(session)
    flags = position_flags.position_flags()
    print(f"[OK] {flags['flags']} audit cards -> {flags['path']}", flush=True)
    report = write_pass_report(session, {
        "started": started, "finished": datetime.now(UTC).isoformat(),
        "candidates": scan["flags"], "proposals": mattes["proposed"],
        "adopted": adopted["adopted"], "upserted": upsert["upserted"],
        "sam_found": upsert["sam_found"]}, inputs=seen)
    print(f"[OK] pass -> {report}")


@session_app.command("temporal-prune")
def session_temporal_prune(
    session: str = typer.Argument(..., help="Canonical session ID (rg- for recordings)."),
) -> None:
    """Drop temporal rows SAM has since re-cut — SAM's later row already wins in read_matte."""
    from ..temporal_matte import prune_dead_rows

    r = prune_dead_rows(session)
    print(f"[OK] {r['dropped']} superseded temporal rows dropped, {r['kept']} rows kept -> {r['path']}")


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
    from .. import sessions as sessions_mod

    def say(sid: str, r: dict) -> None:
        missing = f", {r['missing']} without a readable frame" if r["missing"] else ""
        print(f"[OK] {sid}: {r['written']}/{r['of']} boards{missing}, {r['straightened']} "
              f"geradegezogen — backup {r['backup']}", flush=True)

    _, failed = _each_session(session, all_sessions, sessions_mod.write_boards_session, say)
    _exit_on_bulk_failures(failed)


@session_app.command("pack")
def session_pack_cmd(
    session: str = typer.Option(..., "--session", help="Session ID."),
    size: int = typer.Option(None, "--size", help="Crop side in px. Default: the pack default."),
    pad_side: float = typer.Option(None, "--pad-side", help="Override the profile's side pad."),
    pool: str = typer.Option(None, "--pool",
                             help="Crop pool tag (data/crops/<tag>) for a session that has NO "
                                  "directory — composites, turntable. Their pool file is their "
                                  "source; name it, several pools carry the same session."),
    replace: bool = typer.Option(False, "--replace",
                                 help="Rewrite an existing pack. Needed after new mattes or label "
                                      "fixes: a pack freezes `coverage` and `label` at cut time."),
) -> None:
    """Cut this session ONCE at model size into `data/packs/<session>-<size>/`.

    The 128 px crop pool is the labeling artefact; a dataset built from packs cites this memmap
    instead of copying its pixels. An existing pack is refused unless `--replace` says otherwise.
    """
    from ..training import pack_session, packs

    side = size or packs.DEFAULT_PACK_SIDE
    # `--pool` re-decodes crops the slice already cut, so the pad is the POOL's. Accepted and
    # dropped it would put two framings in one training set (CLAUDE.md 0.1).
    if pool and pad_side is not None:
        print("[FAIL] --pad-side does not apply to --pool: the pool's crops are already cut, "
              "and their pad is whatever `slice` used. Re-slice the pool to change it.")
        raise typer.Exit(1)
    with fail_on(FileNotFoundError, ValueError):
        res = (pack_session.write_pool_pack(session, side, pool=pool, replace=replace) if pool else
               pack_session.write_session_pack(session, side, pad_side=pad_side,
                                               replace=replace))
    again = " (ersetzt)" if res.get("replaced") else ""
    print(f"[OK] pack {res['pack']}: {res['n']} crops, {res['h']}x{res['w']}, {res['gb']} GB{again}")


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
    from .. import sessions as sessions_mod

    def say(sid: str, r: dict) -> None:
        optics = ", Optik aus lens.json" if r.get("lens") else ""
        print(f"[OK] {sid}: {r['rewarped']}/{r['of']} neu gewarpt, {r['no_mesh']} ohne Mesh, "
              f"{r['no_frame']} ohne Bild{optics} — backup {r['backup']}", flush=True)

    _, failed = _each_session(session, all_sessions, sessions_mod.rewarp_boards_session, say)
    _exit_on_bulk_failures(failed)


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
    from .. import sessions as sessions_mod

    def say(sid: str, r: dict) -> None:
        print(f"[OK] {sid}: {r['straightened']}/{r['of']} geradegezogen, {r['already']} schon, "
              f"{r['no_mesh']} ohne Mesh, {r['no_board']} ohne Brett — backup {r['backup']}",
              flush=True)

    _, failed = _each_session(session, all_sessions, sessions_mod.straighten_boards_session, say)
    _exit_on_bulk_failures(failed)


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
    from .. import sessions as sessions_mod

    counts = _session_call(sessions_mod.deletion_cost, session_id)
    if dry_run:
        # The UI shows THIS, then runs the same command without the flag — one count, one truth.
        print(json.dumps(counts))
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
    from .. import sessions as sessions_mod

    freed: list[float] = []

    def say(sid: str, r: dict) -> None:
        freed.append(r["freed_mb"])
        print(f"[OK] {sid}: {r['moved']}/{r['of']} frames parked, {r['freed_mb']} MB -> {r['parked_to']}", flush=True)

    seen, failed = _each_session(session, all_sessions, sessions_mod.park_frames_session, say)
    if all_sessions:
        print(f"[OK] {sum(freed, 0.0) / 1024:.1f} GB parked over {seen} sessions")
    _exit_on_bulk_failures(failed)


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
    from .. import sessions as sessions_mod

    _require_target(session, all_sessions)
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
        _exit_on_bulk_failures(len(rows) - len(ok))
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
    _exit_on_bulk_failures(len(rows) - len(done))


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
    from .. import sessions as sessions_mod

    _require_target(session, all_sessions)

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
    _exit_on_bulk_failures(len(rows) - len(done))


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
    from .. import sessions as sessions_mod

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
    from .. import sessions as sessions_mod

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
    from .. import sessions as sessions_mod

    _session_call(sessions_mod.set_session_reviewed, session, not undo)
    print(f"[OK] {session}: reviewed={'no' if undo else 'yes'}")


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
    from .. import sessions as sessions_mod

    r = _session_call(sessions_mod.archive_session, session, reason)
    print(f"[OK] archived {session} — {r.get('removed_crops', 0)} crops left the pool")


@session_app.command("restore")
def session_restore(
    session: str = typer.Argument(..., help="Session ID."),
) -> None:
    """Bring an archived session back. Re-slice afterwards to put its crops in the pool."""
    from .. import sessions as sessions_mod

    _session_call(sessions_mod.restore_session, session)
    print(f"[OK] restored {session} — run `chesslab slice --session {session}` to re-slice")


@session_app.command("trim")
def session_trim(
    session: str = typer.Argument(..., help="Session ID."),
    keep: int = typer.Option(..., "--keep", help="Number of frames to keep, from the start."),
    yes: bool = typer.Option(False, "--yes", help="Trim without asking."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Print the requested trim and change nothing."),
) -> None:
    """Drop the tail of a session, with its crops and manifest rows."""
    from .. import sessions as sessions_mod

    if dry_run:
        print(json.dumps({"session_id": session, "keep_frames": keep}))
        raise typer.Exit(0)
    counts = _session_call(sessions_mod.deletion_cost, session)
    if counts["corrections"] and not yes:
        print("[FAIL] die Korrekturen sind Handarbeit — mit --yes bestaetigen, wenn das so gemeint ist")
        raise typer.Exit(1)
    if not yes and not typer.confirm(f"  {session} nach Frame {keep} abschneiden?", default=False):
        print("[--] nichts entfernt")
        raise typer.Exit(0)
    r = _session_call(sessions_mod.trim_session, session, keep)
    print(f"[OK] {session} trimmed to {keep} frames — "
          f"{r.get('removed_frames', 0)} frames, {r.get('removed_crops', 0)} crops removed")
