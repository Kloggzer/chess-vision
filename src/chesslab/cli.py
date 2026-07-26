"""Typer entrypoint. One CLI `chesslab`; each stage adds its own subcommands."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import typer

from . import calibration as calibration_mod
from . import collect as collect_mod
from . import config
from . import dataset as dataset_mod
from . import doctor as doctor_mod
from . import labeling as labeling_mod

app = typer.Typer(
    name="chesslab",
    help="Build an auto-labeled chess-piece dataset and train a per-square model.",
    no_args_is_help=True,
    add_completion=False,
)

calibrate_app = typer.Typer(help="Stage 1 — Calibrate camera/board geometry.", no_args_is_help=True)
app.add_typer(calibrate_app, name="calibrate")

lens_app = typer.Typer(help="Camera LENS undistortion (optics) — distinct from `calibrate` (board geometry).",
                       no_args_is_help=True)
app.add_typer(lens_app, name="lens")

collect_app = typer.Typer(help="Stage 3 — Capture positions (raw frame + FEN into session log).", no_args_is_help=True)
app.add_typer(collect_app, name="collect")

dataset_app = typer.Typer(help="Stage 4 — Dataset consistency.", no_args_is_help=True)
app.add_typer(dataset_app, name="dataset")

experiment_app = typer.Typer(help="Stage 7 — Geometry×Photometry bake-off.", no_args_is_help=True)
app.add_typer(experiment_app, name="experiment")

synth_app = typer.Typer(help="Synthetic data pipeline (Blender renderer).", no_args_is_help=True)
app.add_typer(synth_app, name="synth")

feedback_app = typer.Typer(help="Move-tracker undo=bad feedback → hard-negative training crops.",
                           no_args_is_help=True)
app.add_typer(feedback_app, name="track-feedback")


@app.callback()
def _root() -> None:
    """chesslab — staged tool; each stage adds subcommands. See `chesslab --help`."""


@app.command()
def doctor(
    gpu: bool = typer.Option(False, "--gpu", help="Also run ROCm/PyTorch GPU validation (required before training)."),
    camera: int | None = typer.Option(None, "--camera", help="Camera check for index N (open + read one frame)."),
    json_out: bool = typer.Option(False, "--json", help="Also output machine-readable JSON report."),
) -> None:
    """Pre-flight: validate Python, app deps, optional GPU (ROCm) and camera."""
    code = doctor_mod.run(gpu=gpu, camera=camera, json_out=json_out)
    raise typer.Exit(code)


@app.command()
def cameras(
    index: int | None = typer.Option(None, "--index", help="Probe only this camera index (else all)."),
    probe: bool = typer.Option(True, "--probe/--no-probe", help="Measure the real resolutions/fps per index."),
    grab: int = typer.Option(20, "--grab", help="Frames to time per mode when probing."),
) -> None:
    """List connected cameras and probe the resolutions/fps they REALLY deliver.

    The name/index list shows what's connected; the probe table forces MJPG and times real
    frames per mode (CAP_PROP_FPS lies). USB 4K cams need a direct USB-3 port to reach 4K."""
    from .camera import cli_cameras
    raise typer.Exit(cli_cameras(index=index, do_probe=probe, grab=grab))


@calibrate_app.command("check")
def calibrate_check(
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile", help="Profile name."),
    camera: int = typer.Option(0, "--camera", help="Camera index."),
) -> None:
    """Live overlay of the 8×8 grid on the camera image for visual inspection."""
    raise typer.Exit(calibration_mod.calibrate_check(camera=camera, profile=profile))


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
    p = calibration_mod.generate_markers(out, dict_name=dict_name, marker_px=marker_px)
    print(f"[OK] Marker sheet: {p} — print out, cut out, glue one marker centered on each "
          "corner a8/h8/h1/a1. Then run `chesslab calibrate auto`.")


@calibrate_app.command("auto")
def calibrate_auto(
    camera: int = typer.Option(0, "--camera"),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    board_size: int = typer.Option(config.DEFAULT_BOARD_SIZE, "--board-size"),
    dict_name: str = typer.Option("DICT_4X4_50", "--dict"),
    margin: float = typer.Option(0.06, "--margin", help="Fraction by which markers sit OUTSIDE the board (adjust live in --preview with w/e)."),
    min_markers: int = typer.Option(4, "--min-markers", help="Required markers (4 = robust; 2/3 only useful with top-down camera)."),
    preview: bool = typer.Option(False, "--preview", help="Show marker box + board box live (adjust with w/e, s=save)."),
) -> None:
    """Auto-calibrate via ArUco markers (markers outside, board inset; no clicking)."""
    raise typer.Exit(calibration_mod.calibrate_auto(camera=camera, profile=profile, board_size=board_size,
                                                    dict_name=dict_name, margin=margin, preview=preview,
                                                    min_markers=min_markers))


@lens_app.command("calibrate")
def lens_calibrate(
    camera: int = typer.Option(0, "--camera", help="Camera index (the rig camera whose lens this is)."),
    out: str = typer.Option(None, "--out", help="Target .npz (default: data/lens/calib.npz)."),
    min_frames: int = typer.Option(15, "--min-frames", help="Minimum accepted views before solving."),
    cols: int = typer.Option(7, "--cols", help="INNER corners across (7 for a normal 8x8 board)."),
    rows: int = typer.Option(7, "--rows", help="INNER corners down (7 for a normal 8x8 board)."),
    square_mm: float = typer.Option(1.0, "--square-mm", help="Square edge length (world scale only; K/D do not depend on it)."),
    force: bool = typer.Option(False, "--force", help="Overwrite an existing calibration file."),
    alpha: float = typer.Option(None, "--alpha", help="0 = no black borders, 1 = keep all pixels (default: config.LENS.alpha)."),
) -> None:
    """Measure the lens distortion by waving a printed chessboard in front of the camera.

    Frames are captured AUTOMATICALLY (novel pose + cooldown), a live HUD shows which image
    regions are still uncovered, and the solve starts by itself once coverage is adequate.
    Keys: q = quit, space = force capture, u = undo last.

    WARNING: with the 5-50 mm VARIFOCAL lens the result is only valid at the zoom/focus it
    was shot at. Re-run this after touching the lens ring, otherwise undistortion silently
    bends straight lines the wrong way. Board profiles are re-stamped automatically.
    """
    from . import lens as lens_mod
    raise typer.Exit(lens_mod.lens_calibrate(camera=camera, out=out, min_frames=min_frames,
                                             cols=cols, rows=rows, square_mm=square_mm,
                                             force=force, alpha=alpha))


@lens_app.command("calibrate-board")
def lens_calibrate_board(
    sessions: str = typer.Option(None, "--sessions", help="Sessions root (default: data/sessions)."),
    out: str = typer.Option(None, "--out", help="Target .npz (default: data/lens/calib.npz)."),
    force: bool = typer.Option(False, "--force", help="Overwrite an existing calibration file."),
    min_views: int = typer.Option(8, "--min-views", help="Distinct camera poses required before solving."),
    novelty_px: float = typer.Option(30.0, "--novelty-px", help="Minimum board-corner displacement (px) between accepted poses."),
    min_coverage: int = typer.Option(4, "--min-coverage", help="Image regions (of 3x3) the grid points must cover."),
    min_points: int = typer.Option(20, "--min-points", help="Minimum validated inner corners per frame (of 49)."),
    max_frames_per_session: int = typer.Option(6, "--max-frames-per-session", help="Evenly spaced frames tried per session (a fixed camera makes more redundant)."),
    profile: str = typer.Option(None, "--profile", help="Only harvest sessions of this board profile."),
    size: str = typer.Option(None, "--size", help="Calibrate for this frame size (WxH; default: the size with the most views)."),
    max_rms: float = typer.Option(2.0, "--max-rms", help="Refuse to save above this reprojection RMS (px)."),
) -> None:
    """Calibrate the lens from RECORDED sessions — zero interaction, no pattern waving.

    The physical board IS the calibration pattern: real sessions in data/sessions/ store
    per-frame board corners next to the frame image, and different sessions were recorded
    with the camera mounted differently — that pose variety is exactly what
    `calibrateCamera` needs. The board's 7x7 inner checker corners are detected around the
    logged corners (piece-occluded intersections are rejected), poses are gated for
    diversity, and the solve is VALIDATED on a held-out frame: it is only saved when the
    board's grid lines actually get straighter. Board profiles are re-stamped on save,
    same as after `lens calibrate`.
    """
    from . import lens as lens_mod
    raise typer.Exit(lens_mod.lens_calibrate_board(
        sessions=sessions, out=out, force=force, min_views=min_views, novelty_px=novelty_px,
        min_coverage=min_coverage, min_points=min_points,
        max_frames_per_session=max_frames_per_session, profile=profile, size=size,
        max_rms=max_rms))


@lens_app.command("show")
def lens_show(
    path: str = typer.Option(None, "--path", help="Calibration .npz (default: data/lens/calib.npz)."),
) -> None:
    """Print the stored lens calibration (K, distortion, RMS, resolution it was shot at)."""
    from . import lens as lens_mod
    raise typer.Exit(lens_mod.lens_show(path))


@collect_app.command("pgn")
def collect_pgn(
    pgn: str = typer.Option(..., "--pgn", help="PGN file."),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    camera: int = typer.Option(0, "--camera"),
    every: int = typer.Option(1, "--every", help="Only capture every Nth half-move."),
    session: str = typer.Option(None, "--session", help="Session ID (default: timestamp)."),
    ui: bool = typer.Option(False, "--ui", help="Show live dashboard (Stage 6)."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target", help="Target samples per class (UI)."),
) -> None:
    """PGN replay: physically replay a game, capture after each half-move."""
    raise typer.Exit(collect_mod.collect_pgn(pgn=pgn, profile=profile, camera=camera, every=every,
                                             session=session, ui=ui, target=target))


@collect_app.command("live")
def collect_live(
    start_fen: str = typer.Option(None, "--start-fen", help="Starting position as FEN (otherwise initial position)."),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    camera: int = typer.Option(0, "--camera"),
    session: str = typer.Option(None, "--session"),
    ui: bool = typer.Option(False, "--ui", help="Show live dashboard (Stage 6)."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target", help="Target samples per class (UI)."),
) -> None:
    """Free play: type move (SAN/UCI), then capture."""
    raise typer.Exit(collect_mod.collect_live(start_fen=start_fen, profile=profile, camera=camera,
                                              session=session, ui=ui, target=target))


@collect_app.command("play")
def collect_play(
    strategy: str = typer.Option("random", "--strategy", help="random | stockfish | coverage | sweep"),
    max_plies: int = typer.Option(40, "--max-plies", help="Max. half-moves of the generated game (random/stockfish)."),
    seed: int = typer.Option(config.SEED, "--seed", help="Seed for strategy=random."),
    stockfish_path: str = typer.Option(None, "--stockfish-path", help="Path to the UCI binary (for stockfish)."),
    start_fen: str = typer.Option(None, "--start-fen", help="Starting position (otherwise initial position)."),
    profile: str = typer.Option(config.DEFAULT_PROFILE, "--profile"),
    camera: int = typer.Option(0, "--camera"),
    session: str = typer.Option(None, "--session"),
    ui: bool = typer.Option(False, "--ui", help="Show live dashboard (Stage 6)."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target"),
    sets: int = typer.Option(1, "--sets", help="Number of physical piece sets (coverage/sweep): ×N per class."),
    count: int = typer.Option(20, "--count", help="Number of dense setups (only strategy=coverage)."),
    passes: int = typer.Option(1, "--passes", help="sweep: repetitions per color (per pass 8 photos)."),
    pieces: str = typer.Option("special", "--pieces", help="sweep: special | pawn | all."),
    together: bool = typer.Option(False, "--together", help="sweep: both colors simultaneously (half the photo count)."),
    offset: int = typer.Option(0, "--offset", help="sweep: shift rank→piece mapping (0..7)."),
    auto_offset: bool = typer.Option(False, "--auto-offset", help="sweep: offset automatically (cycled across sessions)."),
) -> None:
    """Engine plays the game (random/stockfish), coverage: dense setups targeting rare classes,
    or sweep: piece row systematically moves across the board. You reposition and photograph."""
    raise typer.Exit(collect_mod.collect_play(strategy=strategy, max_plies=max_plies, seed=seed,
                                              stockfish_path=stockfish_path, start_fen=start_fen,
                                              profile=profile, camera=camera, session=session,
                                              ui=ui, target=target, sets=sets, count=count,
                                              passes=passes, pieces=pieces, together=together,
                                              offset=offset, auto_offset=auto_offset))


@app.command("ui")
def ui_cmd(
    sessions: str = typer.Option(None, "--sessions", help="Sessions directory (default: data/sessions)."),
    manifest: str = typer.Option(None, "--manifest", help="Optional manifest (informational only)."),
    target: int = typer.Option(config.UI_TARGET_PER_CLASS, "--target"),
) -> None:
    """Stage 6 — Training data dashboard standalone (without active capture)."""
    from .collect_ui import run_ui

    raise typer.Exit(run_ui(sessions_dir=sessions, manifest=manifest, target_per_class=target))


@app.command("slice")
def slice_cmd(
    session: str = typer.Option(None, "--session", help="Slice session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Slice all sessions."),
    profile: str = typer.Option(None, "--profile", help="Override profile (default: from session.yaml)."),
    pad_up: float = typer.Option(None, "--pad-up", help="Override crop height upward."),
    pad_side: float = typer.Option(None, "--pad-side", help="Override side crop extension."),
    out_size: str = typer.Option(None, "--out-size", help="Crop size WxH, e.g. 96x128."),
    preview: str = typer.Option(None, "--preview", help="Session ID: visually check label vs crop."),
    geometry: str = typer.Option("warp", "--geometry", help="Crop geometry: warp | box3d."),
    photometry: str = typer.Option("none", "--photometry", help="Filter: none | clahe | grayworld | gamma."),
    piece_height: float = typer.Option(config.EXP_PIECE_HEIGHT_CELLS, "--piece-height",
                                       help="box3d: extrusion height in cells."),
    variant_tag: str = typer.Option(None, "--variant-tag",
                                    help="Store crops/manifest with variant tag (squares__<tag>/)."),
) -> None:
    """Session logs -> 64 labeled square crops per position + manifest."""
    raise typer.Exit(labeling_mod.run_slice(
        session=session, slice_all=all_sessions, profile=profile,
        pad_up=pad_up, pad_side=pad_side, out_size=out_size, preview=preview,
        geometry_mode=geometry, photometry=photometry, piece_height_cells=piece_height,
        variant_tag=variant_tag,
    ))


def _csv_list(s: str) -> list[str]:
    return [x.strip() for x in s.split(",") if x.strip()]


@experiment_app.command("run")
def experiment_run(
    sessions: str = typer.Option(..., "--sessions", help="Comma-separated session IDs."),
    geometries: str = typer.Option(",".join(config.EXP_GEOMETRIES), "--geometries", help="e.g. warp,box3d."),
    photometries: str = typer.Option(",".join(config.PHOTOMETRY_METHODS), "--photometries",
                                     help="e.g. none,clahe,grayworld,gamma."),
    heads: str = typer.Option("combined", "--heads", help="Model heads: combined,factored,twostage."),
    epochs: int = typer.Option(config.DEFAULT_EPOCHS, "--epochs"),
    seed: int = typer.Option(config.SEED, "--seed"),
    backbone: str = typer.Option(config.DEFAULT_BACKBONE, "--backbone"),
    eval_split: str = typer.Option("test", "--eval-split", help="Metric split: test | val (val for <3 sessions)."),
    force: bool = typer.Option(False, "--force", help="All stages fresh (otherwise skip completed ones)."),
) -> None:
    """Full grid train Geometry×Photometry×Head + comparison table by board accuracy."""
    from . import experiment as experiment_mod

    raise typer.Exit(experiment_mod.run_experiment(
        _csv_list(sessions), _csv_list(geometries), _csv_list(photometries), _csv_list(heads),
        epochs=epochs, seed=seed, backbone=backbone, eval_split=eval_split, force=force))


@experiment_app.command("table")
def experiment_table(
    sessions: str = typer.Option(..., "--sessions", help="Comma-separated session IDs."),
    geometries: str = typer.Option(",".join(config.EXP_GEOMETRIES), "--geometries"),
    photometries: str = typer.Option(",".join(config.PHOTOMETRY_METHODS), "--photometries"),
    heads: str = typer.Option("combined", "--heads"),
    eval_split: str = typer.Option("test", "--eval-split"),
) -> None:
    """Rebuild comparison table from already-trained runs (no re-training)."""
    from . import experiment as experiment_mod

    raise typer.Exit(experiment_mod.rebuild_table(
        _csv_list(sessions), _csv_list(geometries), _csv_list(photometries), _csv_list(heads),
        eval_split=eval_split))


@experiment_app.command("list")
def experiment_list(
    sessions: str = typer.Option("", "--sessions", help="(optional, irrelevant for table columns)."),
    geometries: str = typer.Option(",".join(config.EXP_GEOMETRIES), "--geometries"),
    photometries: str = typer.Option(",".join(config.PHOTOMETRY_METHODS), "--photometries"),
    heads: str = typer.Option("combined", "--heads"),
) -> None:
    """Status per variant: sliced / dataset / train / eval."""
    from . import experiment as experiment_mod

    raise typer.Exit(experiment_mod.variant_status(
        _csv_list(sessions), _csv_list(geometries), _csv_list(photometries), _csv_list(heads)))


@app.command("stats")
def stats_cmd(
    manifest: str = typer.Option(None, "--manifest", help="Manifest path (default: data/manifests/squares.jsonl)."),
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


@dataset_app.command("verify")
def dataset_verify() -> None:
    """Consistency checks: files exist/loadable, out_size, labels, split disjointness."""
    raise typer.Exit(dataset_mod.run_verify())


@app.command("ingest")
def ingest_cmd(
    adapter: str = typer.Argument(..., help="chesscog | chessred | synthetic (external/synthetic dataset)."),
    root: str = typer.Argument(..., help="Path to locally extracted dataset."),
    tag: str | None = typer.Option(None, "--tag", help="Name for sessions/dataset (default: pretrain-<adapter>)."),
    geometry: str = typer.Option("warp", "--geometry", help="warp (recommended, no intrinsics) | box3d."),
    photometry: str = typer.Option("none", "--photometry", help="none | clahe | grayworld | gamma — must match the finetune dataset."),
    board_size: int = typer.Option(900, "--board-size", help="Warp resolution (px). Keep moderate (phone source), otherwise upscale blur."),
    limit: int | None = typer.Option(None, "--limit", help="Only the first N images (quick test)."),
    debug_overlay: int = typer.Option(0, "--debug-overlay", help="Warp N frames + overlay FEN labels (visual check against label swapping)."),
    no_build: bool = typer.Option(False, "--no-build", help="Only slice, don't build a dataset."),
) -> None:
    """Ingest external dataset (chesscog/ChessReD2K) into our crop format -> pretrain dataset.

    Afterwards: `chesslab train --dataset <tag> --head twostage --backbone mobilenet_v3_small`, then on
    your own sessions `train --dataset <yours> --resume <pretrain-run>`. IMPORTANT: before the big
    run with `--debug-overlay 8` check orientation (wrong corners silently swap all labels)."""
    from . import ingest as ingest_mod

    t = tag or f"pretrain-{adapter.lower()}"
    try:
        summary = ingest_mod.run_ingest(
            adapter, root, tag=t, geometry=geometry, photometry=photometry, board_size=board_size,
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
    no_phash: bool = typer.Option(False, "--no-phash", help="Disable perceptual hash dedup."),
    hamming: int = typer.Option(config.DEDUP.phash_hamming, "--hamming"),
    rotate: bool = typer.Option(False, "--rotate/--no-rotate",
                                help="90/180/270° augmentation (off by default: quadruples the train split "
                                     "on disk and contradicts the fixed-camera assumption)."),
    allow_degenerate: bool = typer.Option(False, "--allow-degenerate", help="Allow degenerate dataset (class only in one session etc.)."),
    no_pack: bool = typer.Option(False, "--no-pack", help="Skip packing crops into a memmap (default: pack for fast training)."),
    source_manifest: str | None = typer.Option(None, "--source-manifest",
                                               help="Crop pool(s) to filter, comma-separated. Default: "
                                                    "manifests/squares.jsonl. Needed after `ingest --tag X "
                                                    "--no-build`, which writes manifests/squares__X.jsonl."),
    classes: str = typer.Option("pieces", "--classes",
                                help="pieces (14, default) | occupancy (2: empty/occupied). "
                                     "`occupancy` COLLAPSES the existing labels at build time — "
                                     "no crop is re-labelled, no row is lost."),
) -> None:
    """Build named dataset from session selection (filter -> dedup -> rotation -> split -> pack)."""
    from . import dataset_build as db

    sids = [s.strip() for s in sessions.split(",") if s.strip()]
    srcs = [s.strip() for s in source_manifest.split(",") if s.strip()] if source_manifest else None
    try:
        res = db.build_dataset(name, sids, source_manifest=srcs,
                               per_cell_cap=per_cell_cap, phash_enabled=not no_phash,
                               phash_hamming=hamming,
                               rotations=(config.DEDUP.rotations_augmented if rotate else config.DEDUP.rotations),
                               allow_degenerate=allow_degenerate, pack=not no_pack,
                               class_mode=classes)
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
    classes: str = typer.Option("pieces", "--classes",
                                help="pieces (14, default) | occupancy (2: empty/occupied). "
                                     "`occupancy` collapses the FEN labels at build time."),
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
def dataset_pack_cmd(name: str = typer.Argument(..., help="Dataset to pack.")) -> None:
    """Pack a dataset's crops into one memmap for fast training (1M+ PNG I/O fix).

    Decodes every crop once into ``data/datasets/<name>/packed_images.u8``; `train --dataset <name>`
    then reads from the memmap instead of opening 1M files per epoch. Re-run after rebuilding.
    """
    from .training.pack import pack_dataset

    res = pack_dataset(name)
    print(f"[OK] packed '{name}': {res['n']} crops, {res['gb']} GB -> {res['path']}")


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

    db.delete_dataset(name)
    print(f"[OK] Dataset '{name}' deleted.")


@app.command("train")
def train_cmd(
    backbone: str = typer.Option(
        config.DEFAULT_BACKBONE,
        "--backbone",
        help="smallcnn | mobilenet_v3_small | any timm model",
    ),
    epochs: int = typer.Option(config.DEFAULT_EPOCHS, "--epochs"),
    batch_size: int = typer.Option(config.DEFAULT_BATCH_SIZE, "--batch-size"),
    lr: float = typer.Option(config.DEFAULT_LR, "--lr"),
    no_amp: bool = typer.Option(False, "--no-amp", help="Disable AMP/autocast."),
    seed: int = typer.Option(config.SEED, "--seed"),
    out: str = typer.Option(None, "--out", help="Run directory (default: data/models/run-<ts>)."),
    patience: int = typer.Option(config.DEFAULT_PATIENCE, "--patience", help="Early stopping patience."),
    num_workers: int | None = typer.Option(None, "--num-workers", help="DataLoader workers (default: 0 on Windows, 4 otherwise)."),
    norm: str | None = typer.Option(None, "--norm", help="batchnorm | groupnorm | none (default: groupnorm on Windows, otherwise batchnorm)."),
    dataset: str | None = typer.Option(None, "--dataset", help="Named dataset (otherwise global manifest/split)."),
    resume: str | None = typer.Option(None, "--resume", help="Run name whose weights are loaded as warm-start (continue training)."),
    head: str = typer.Option("combined", "--head", help="combined | factored | twostage (two-stage Occupancy→Piece)."),
    scales: str | None = typer.Option(None, "--scales", help="Multi-Scale-Training: Komma-Liste von Eingabegrößen "
                                      "(z.B. 64,96,128). Pro Batch wird zufällig eine gewählt → ein Modell für alle "
                                      "Auflösungen (size-agnostisch, für günstige Low-Res-Inferenz)."),
    erase_p: float | None = typer.Option(None, "--erase-p", help="Override RandomErasing/Cutout prob (anti-shortcut)."),
    bg_p: float | None = typer.Option(None, "--bg-p", help="Override background-randomization prob on occupied crops."),
    loss: str = typer.Option("ce", "--loss", help="ce | focal — focal down-weights the easy, "
                                                  "already-solved crops (needs --head combined)."),
    focal_gamma: float = typer.Option(2.0, "--focal-gamma", help="Focal loss gamma (0 = weighted CE)."),
    class_weight: str | None = typer.Option(None, "--class-weight", help="Per-class loss weight "
                                            "override as comma-separated KEY=VALUE (e.g. "
                                            "'occupied=2.0' or 'empty=0.9,occupied=2.0'). Applied "
                                            "on top of split.json's inverse-frequency weights."),
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
    raise typer.Exit(run_train(backbone=backbone, epochs=epochs, batch_size=batch_size, lr=lr,
                               no_amp=no_amp, seed=seed, out=out, patience=patience,
                               num_workers=num_workers, norm=norm, dataset=dataset, resume=resume,
                               head=head, scales=scale_list, erase_p=erase_p, bg_p=bg_p,
                               loss=loss, focal_gamma=focal_gamma, class_weight=cw or None))


@app.command("eval")
def eval_cmd(
    run: str = typer.Option(..., "--run", help="Run directory from `train`."),
    split: str = typer.Option("test", "--split", help="train | val | test"),
    input_size: int | None = typer.Option(None, "--input-size", help="Eingabegröße für die Auswertung "
                                           "(z.B. 64/96/128). Misst die Genauigkeit bei einer Deployment-Auflösung "
                                           "(für die Auflösungs-Kurve eines Multi-Scale-Modells)."),
) -> None:
    """Board accuracy, per-class recall and confusion matrix (text + PNG)."""
    from .training.evaluate import run_eval

    raise typer.Exit(run_eval(run=run, split_name=split, input_size=input_size))


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
) -> None:
    """Export best.pt to TorchScript/ONNX + model_card.json (handoff to inference app)."""
    from .training.evaluate import run_export

    raise typer.Exit(run_export(run=run, fmt=fmt))


@app.command("quantize")
def quantize_cmd(
    run: str = typer.Option(..., "--run", help="Run directory (must already contain model.onnx)."),
    limit: int = typer.Option(128, "--limit", help="Number of calibration crops (class-balanced)."),
    activation: str = typer.Option("quint16", "--activation",
                                   help="quint16 (A16W8, recommended for HTP) | quint8 (pure INT8)."),
    weight: str = typer.Option("quint8", "--weight", help="quint8 | qint8 (weight dtype)."),
) -> None:
    """Static-quantize model.onnx -> model.qnn.onnx (INT8 QDQ) for the Hexagon NPU QNN EP."""
    from .training.quantize import run_quantize

    raise typer.Exit(run_quantize(run=run, limit=limit, activation_type=activation, weight_type=weight))


@app.command("web")
def web_cmd(
    host: str = typer.Option(config.DEFAULT_WEB_HOST, "--host"),
    port: int = typer.Option(config.DEFAULT_WEB_PORT, "--port"),
    source: str | None = typer.Option(
        None, "--source",
        help="Camera source as URL instead of local index (e.g. IP/phone cam "
             "https://host:4444/video/m.jpeg). Overrides the UI index for ALL camera paths. "
             "Use the MJPEG stream for smooth preview."),
    capture_source: str | None = typer.Option(
        None, "--capture-source",
        help="Optional HIGH-RESOLUTION snapshot URL for saving (e.g. "
             "https://host:4444/video/snapshot). Preview stays on the smooth --source stream, "
             "saved frames come sharp from the snapshot (corners re-detected on it)."),
) -> None:
    """Local web UI: browse dataset, relabel, control training (requires `--extra web`)."""
    import os

    from .web.camera import CAMERA_CAPTURE_ENV, CAMERA_SOURCE_ENV

    if source:
        os.environ[CAMERA_SOURCE_ENV] = source   # read by web camera path (effective_source)
        print(f"Camera source (preview): {source}")
    if capture_source:
        os.environ[CAMERA_CAPTURE_ENV] = capture_source
        print(f"Capture source (save, high-resolution): {capture_source}")

    from .web.app import run as run_web

    raise typer.Exit(run_web(host=host, port=port))


@app.command("track")
def track_cmd(
    profile: str = typer.Option("phone", "--profile", help="chesslab calibration profile."),
    source: str = typer.Option("0", "--source", help="Camera: 0=Webcam, URL=IP-Cam."),
    res: str = typer.Option(config.DEFAULT_CAMERA_MODE, "--res",
                            help="Capture mode: "
                                 f"{'|'.join(config.CAMERA_MODES)} (the camera may ignore it)."),
    host: str = typer.Option(config.DEFAULT_TRACK_HOST, "--host"),
    port: int = typer.Option(config.DEFAULT_TRACK_PORT, "--port"),
    motion_thr: float = typer.Option(config.TRACK_DEFAULTS["motion_thr"], "--motion-thr",
                                     help="Motion gate: percent of strongly-changed pixels."),
    motion_px_thr: float = typer.Option(config.TRACK_DEFAULTS["motion_px_thr"], "--motion-px-thr",
                                        help="Per-pixel brightness delta that counts as motion "
                                             "(ignores desk-wobble/jitter sub-threshold shifts)."),
    z_thr: float = typer.Option(config.TRACK_DEFAULTS["z_thr"], "--z-thr",
                                help="z-score threshold above which a square counts as changed."),
    ambiguity_margin_ll: float = typer.Option(config.TRACK_DEFAULTS["ambiguity_margin_ll"],
                                              "--ambiguity-margin",
                                              help="Minimum distance best−second (LL units)."),
    reanchor_ll_floor: float = typer.Option(config.TRACK_DEFAULTS["reanchor_ll_floor"],
                                            "--reanchor-floor",
                                            help="Re-anchor only when best move LL is below it."),
    nudge_timeout_s: float = typer.Option(config.TRACK_DEFAULTS["nudge_timeout_s"], "--nudge-timeout",
                                          help="Seconds until nudge reference patch (without CNN)."),
    drift_window_s: float = typer.Option(config.TRACK_DEFAULTS["drift_window_s"], "--drift-window",
                                         help="Seconds until drift patch of empty squares (without CNN)."),
    no_prior: bool = typer.Option(False, "--no-prior",
                                  help="Disable heuristic prior as ambiguity tie-break."),
    change_thr: float | None = typer.Option(None, "--change-thr", hidden=True,
                                            help="DEPRECATED: replaced by --z-thr."),
    confirm_frames: int | None = typer.Option(None, "--confirm-frames",
                                              help="Confirmation frames per move (default: 1 with CNN, otherwise 2)."),
    settle_frames: int | None = typer.Option(None, "--settle-frames",
                                             help="Settle frames before detection (default: 3 with CNN, otherwise 4)."),
    max_changed: int = typer.Option(config.TRACK_DEFAULTS["max_changed"], "--max-changed",
                                    help="Maximum changed squares (gate)."),
    avg_frames: int | None = typer.Option(None, "--avg-frames",
                                          help="Moving average over N quiet frames (default: 2 with CNN, otherwise 3)."),
    no_live_align: bool = typer.Option(False, "--no-live-align", help="Disable marker tracking."),
    motion_margin: float = typer.Option(config.TRACK_DEFAULTS["motion_margin"], "--motion-margin",
                                        help="Motion ROI beyond board edge (fraction of board edge)."),
    overhang: float = typer.Option(config.TRACK_DEFAULTS["overhang"], "--overhang",
                                   help="Extend diff cells toward back rank (fraction of cell)."),
    motion_hold_s: float = typer.Option(config.TRACK_DEFAULTS["motion_hold_s"], "--motion-hold",
                                        help="Seconds the board must be motion-free before detection resumes."),
    occlusion_color_thr: float = typer.Option(config.TRACK_DEFAULTS["occlusion_color_thr"],
                                              "--occlusion-color-thr",
                                              help="Color-outlier occlusion veto: Mahalanobis sigma vs board gamut (0=off)."),
    min_grid_line_coverage: float = typer.Option(config.TRACK_DEFAULTS["min_grid_line_coverage"],
                                                 "--min-grid-line-coverage",
                                                 help="Grid-line occlusion gate: min visible-line fraction 0..1 (0=off)."),
    reconnect_grace_s: float = typer.Option(config.TRACK_DEFAULTS["reconnect_grace_s"],
                                            "--reconnect-grace",
                                            help="Auto-reattach the camera after this many seconds of no frames (0=off)."),
    diff_clahe_clip: float = typer.Option(config.TRACK_DEFAULTS["diff_clahe_clip"],
                                          "--diff-clahe-clip",
                                          help="CLAHE contrast boost on the diff image for low-contrast moves (0=off, try 2-3)."),
    require_motion_for_move: bool = typer.Option(config.TRACK_DEFAULTS["require_motion_for_move"],
                                                 "--require-motion/--no-require-motion",
                                                 help="Only commit a move if a hand entered since the last reference (suppresses drift/light 'moves')."),
    motion_recency_s: float = typer.Option(config.TRACK_DEFAULTS["motion_recency_s"], "--motion-recency",
                                           help="Commit only within N seconds of the last motion (drift at high stable count is not a move)."),
    cnn_run: str = typer.Option(config.default_tracker_run() or "", "--cnn-run",
                                help="Model run for CNN verification/recovery ('' = off)."),
    detect_scale: float = typer.Option(config.TRACK_DEFAULTS["detect_scale"], "--detect-scale",
                                       help="Detection runs on a downscaled board warp (0.5 = half-res; 1.0 = off)."),
    cnn_conf_thr: float = typer.Option(config.TRACK_DEFAULTS["cnn_conf_thr"], "--cnn-conf-thr",
                                       help="Confidence threshold above which a CNN square counts as reliable."),
    census_thr: float = typer.Option(config.TRACK_DEFAULTS["census_thr"], "--census-thr",
                                     help="Threshold for STRUCTURAL change (census); < = shadow candidate."),
    census_z_weight: float = typer.Option(config.TRACK_DEFAULTS["census_z_weight"],
                                          "--census-z-weight",
                                          help="Structural evidence fusion weight: z_eff = max(z_gray, w*z_census); lifts dark-on-dark moves (0=off)."),
    occl_census_thr: float = typer.Option(config.TRACK_DEFAULTS["occl_census_thr"],
                                          "--occl-census-thr",
                                          help="Baseline occlusion needs census structure above this; flat darkening = shadow, not hand (0=legacy)."),
    cnn_verify: bool = typer.Option(True, "--cnn-verify/--no-cnn-verify",
                                    help="Verify each move via CNN identity (default on, non-blocking)."),
    verify_window: int = typer.Option(config.TRACK_DEFAULTS["verify_window"], "--verify-window",
                                      help="Max CNN frames per pre-commit verify."),
    cnn_min_agreement: float = typer.Option(config.TRACK_DEFAULTS["cnn_min_agreement"],
                                            "--cnn-min-agreement",
                                            help="Agreement threshold for recovery/verify."),
    cnn_margin_squares: int = typer.Option(config.TRACK_DEFAULTS["cnn_margin_squares"],
                                           "--cnn-margin-squares",
                                           help="Recovery margin in squares."),
    recovery_max_plies: int = typer.Option(config.TRACK_DEFAULTS["recovery_max_plies"],
                                           "--recovery-max-plies",
                                           help="CNN deep recovery: max half-moves the conflict-guided search may bridge."),
    min_confident_board: int = typer.Option(config.TRACK_DEFAULTS["min_confident_board"],
                                            "--min-confident-board",
                                            help="Reliable squares for whole-board match."),
    min_confident_recovery: int = typer.Option(config.TRACK_DEFAULTS["min_confident_recovery"],
                                               "--min-confident-recovery",
                                               help="Reliable squares for recovery."),
    cnn_cooldown_s: float = typer.Option(config.TRACK_DEFAULTS["cnn_cooldown_s"], "--cnn-cooldown",
                                         help="Minimum interval (s) between recovery observations."),
    cnn_check_interval_s: float = typer.Option(config.TRACK_DEFAULTS["cnn_check_interval_s"],
                                               "--cnn-check-interval",
                                               help="Interval (s) of periodic CNN check."),
    device: str = typer.Option("auto", "--device", help="Torch device for the CNN: auto|cpu|cuda."),
) -> None:
    """Move tracker: board digitization via frame differencing + CNN verification (web UI)."""
    from .move_tracker.app import run as run_track

    if change_thr is not None:
        print("Note: --change-thr is deprecated (Spec 10) — please use --z-thr.")
    tracker_kwargs = {
        "motion_thr": motion_thr, "motion_px_thr": motion_px_thr, "z_thr": z_thr,
        "ambiguity_margin_ll": ambiguity_margin_ll, "reanchor_ll_floor": reanchor_ll_floor,
        "nudge_timeout_s": nudge_timeout_s, "drift_window_s": drift_window_s,
        "use_prior": not no_prior,
        "confirm_frames": confirm_frames, "settle_frames": settle_frames,
        "max_changed": max_changed, "avg_frames": avg_frames,
        "live_align": not no_live_align,
        "motion_margin": motion_margin, "overhang": overhang,
        "motion_hold_s": motion_hold_s,
        "occlusion_color_thr": occlusion_color_thr,
        "min_grid_line_coverage": min_grid_line_coverage,
        "reconnect_grace_s": reconnect_grace_s,
        "diff_clahe_clip": diff_clahe_clip,
        "require_motion_for_move": require_motion_for_move, "motion_recency_s": motion_recency_s,
        "detect_scale": detect_scale,
        "cnn_run": (cnn_run or None),   # '' or missing run on disk -> feature silently off
        "cnn_conf_thr": cnn_conf_thr, "device": device, "census_thr": census_thr,
        "census_z_weight": census_z_weight, "occl_census_thr": occl_census_thr,
        "cnn_verify": cnn_verify, "verify_window": verify_window,
        "cnn_min_agreement": cnn_min_agreement, "cnn_margin_squares": cnn_margin_squares, "recovery_max_plies": recovery_max_plies,
        "min_confident_board": min_confident_board, "min_confident_recovery": min_confident_recovery,
        "cnn_cooldown_s": cnn_cooldown_s, "cnn_check_interval_s": cnn_check_interval_s,
        "res": res,
    }
    raise typer.Exit(run_track(host=host, port=port, default_profile=profile,
                               default_source=source, tracker_kwargs=tracker_kwargs))


@feedback_app.command("ingest")
def track_feedback_ingest(
    assume_ghost: bool = typer.Option(True, "--assume-ghost/--no-assume-ghost",
                                      help="Label undone frames from fen_before (true only if the "
                                           "undone move was a GHOST, not a mis-identified real move)."),
    visualize: bool = typer.Option(False, "--visualize",
                                   help="Also write per-record label montages to review/ for eyeballing."),
    profile: str = typer.Option("phone", "--profile",
                                help="Fallback profile for records without one (crop geometry)."),
) -> None:
    """Ingest UNDO=bad feedback into hard-negative crops appended to the squares manifest.

    These are the squares the recognizer got wrong. After ingesting, rebuild the dataset
    (`chesslab dataset ...`) and retrain; the crops carry session id 'track-feedback'. Verify with
    --visualize first — labels assume the undone move was a ghost (no piece actually moved)."""
    from .track_feedback import ingest_feedback
    res = ingest_feedback(assume_ghost=assume_ghost, visualize=visualize, default_profile=profile)
    if not res.get("ok"):
        print(f"[FAIL] {res.get('error')}")
        raise typer.Exit(1)
    print(f"[OK] ingested {res['records']} undone move(s) -> {res['crops']} crops "
          f"(session '{res['session_id']}').")
    if res.get("classes"):
        print("      per class: " + ", ".join(f"{k}={v}" for k, v in sorted(res["classes"].items())))
    if res.get("review_dir"):
        print(f"      review montages: {res['review_dir']}")
    raise typer.Exit(0)


@synth_app.command("render")
def synth_render(
    out: str = typer.Option(..., "--out", help="Target directory (required)."),
    blend: str = typer.Option(None, "--blend", help="Blender scene (default: synth_assets/Chess Scene.blend)."),
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
