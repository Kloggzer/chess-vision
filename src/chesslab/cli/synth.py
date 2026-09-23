"""`chesslab synth` — the synthetic data pipeline (Blender renderer)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import typer

synth_app = typer.Typer(help="Synthetic data pipeline (Blender renderer).", no_args_is_help=True)

_REPO = Path(__file__).resolve().parents[3]


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
    from ..config import SYNTH, build_blender_cmd

    script = _REPO / "synth" / "render_board_v2.py"

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
    from dataclasses import replace as _dc_replace

    from ..config import SYNTH
    from ..meshprep import prepare_scan
    from ..scan_discover import assess_report, discover_scans, is_bare_piece, next_variant

    out = Path(out_dir).resolve() if out_dir else SYNTH.pieces_dir

    items, warnings = discover_scans(Path(in_dir))
    for w in warnings:
        print(f"[WARN] {w}")
    if not items:
        print("[FAIL] no scans found (expected: <in>/<piece>/*.glb/.obj + texture).")
        raise typer.Exit(1)

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
    from ..config import _REPO_ROOT, SYNTH

    # synth/ lives in repo root (not an installed package) — retrofit for CLI invocation.
    if str(_REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(_REPO_ROOT))
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
    from ..config import SYNTH

    script = _REPO / "synth" / "render_piece.py"
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
