"""Crops to datasets: the root verbs `slice`, `stats`, `split`, `ingest` and `chesslab dataset`."""

from __future__ import annotations

import json
from pathlib import Path

import typer

from .. import config
from .. import dataset as dataset_mod
from .. import labeling as labeling_mod
from ._app import app
from ._common import _out_size, csv_list, fail_on

dataset_app = typer.Typer(help="Stage 4 — Dataset consistency.", no_args_is_help=True)


@app.command("slice")
def slice_cmd(
    session: str = typer.Option(None, "--session", help="Slice session ID."),
    all_sessions: bool = typer.Option(False, "--all", help="Slice all sessions."),
    profile: str = typer.Option(None, "--profile", help="Override profile (default: from session.yaml)."),
    pad_side: float = typer.Option(None, "--pad-side", help="Override side crop extension."),
    out_size: str = typer.Option(None, "--out-size", help="Crop size WxH, e.g. 96x128."),
    preview: str = typer.Option(None, "--preview", help="Session ID: visually check label vs crop."),
    variant_tag: str = typer.Option(None, "--variant-tag",
                                    help="Store crops/manifest with variant tag (crops/<tag>/)."),
    flat_field: bool = typer.Option(False, "--flat-field",
                                    help="Den Beleuchtungsgradienten des Bretts herausrechnen, VOR "
                                         "dem Zuschnitt — eine 8x8-Karte je Session, Median ueber "
                                         "saubere Frames. Gehoert in einen eigenen --variant-tag."),
) -> None:
    """Session logs -> 64 labeled square crops per position + manifest."""
    raise typer.Exit(labeling_mod.run_slice(
        session=session, slice_all=all_sessions, profile=profile,
        pad_side=pad_side, out_size=out_size, preview=preview,
        variant_tag=variant_tag, flat_field=flat_field,
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


@dataset_app.command("verify")
def dataset_verify() -> None:
    """Consistency checks: files exist/loadable, out_size, labels, split disjointness."""
    raise typer.Exit(dataset_mod.run_verify())


@app.command("ingest")
def ingest_cmd(
    adapter: str = typer.Argument(..., help="synthetic (rendered dataset)."),
    root: str = typer.Argument(..., help="Path to locally extracted dataset."),
    tag: str | None = typer.Option(None, "--tag", help="Name for sessions/dataset (default: pretrain-<adapter>)."),
    board_size: int = typer.Option(config.SYNTH.warp_board_size, "--board-size", help="Warp resolution (px). Keep moderate (phone source), otherwise upscale blur."),
    limit: int | None = typer.Option(None, "--limit", help="Only the first N images (quick test)."),
    debug_overlay: int = typer.Option(0, "--debug-overlay", help="Warp N frames + overlay FEN labels (visual check against label swapping)."),
    no_build: bool = typer.Option(False, "--no-build", help="Only slice, don't build a dataset."),
) -> None:
    """Ingest a corner-annotated dataset into our crop format -> pretrain dataset.

    Afterwards: `chesslab train --dataset <tag> --backbone mobilenet_v3_small`, then on
    your own sessions `train --dataset <yours> --resume <pretrain-run>`. IMPORTANT: before the big
    run with `--debug-overlay 8` check orientation (wrong corners silently swap all labels)."""
    from .. import ingest as ingest_mod

    t = tag or f"pretrain-{adapter.lower()}"
    with fail_on(ValueError, FileNotFoundError):
        summary = ingest_mod.run_ingest(
            adapter, root, tag=t, board_size=board_size,
            limit=limit, debug_overlay_n=debug_overlay, build=not no_build)
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
        help="Pack at the MODEL's size (e.g. 80x80) instead of the crop file's. Scales once. "
             "With --from-packs it selects WHICH pack per session is taken (default 80x80)."),
    from_packs: bool = typer.Option(
        False, "--from-packs",
        help="Build from session packs in data/packs/ instead of a crop pool: the rows keep "
             "their mm:// paths, nothing is decoded and no memmap is written into the dataset."),
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
    allow_stale_packs: bool = typer.Option(
        False, "--allow-stale-packs",
        help="With --from-packs: build even when a pack still carries cells a human marked "
             "unusable or relabelled after it was cut. Recorded as stale_packs in dataset.yaml."),
) -> None:
    """Build named dataset from session selection (filter -> dedup -> rotation -> split -> pack)."""
    from .. import dataset_build as db

    srcs = csv_list(source_manifest) if source_manifest else None
    with fail_on(ValueError):
        res = db.build_dataset(name, csv_list(sessions), source_manifest=srcs,
                               per_cell_cap=per_cell_cap, phash_enabled=phash,
                               phash_hamming=hamming, per_position=per_position,
                               rotations=(config.DEDUP.rotations_augmented if rotate else config.DEDUP.rotations),
                               allow_degenerate=allow_degenerate, write_pack=not no_pack,
                               pack_size=_out_size(pack_size), from_packs=from_packs,
                               class_mode=classes, like=like,
                               force_train=csv_list(force_train),
                               add_test=csv_list(add_test),
                               add_train=csv_list(add_train),
                               allow_stale_packs=allow_stale_packs)
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
    from ..synth_build import build_synth_dataset

    with fail_on(ValueError, RuntimeError):
        res = build_synth_dataset(name, renders, board_size=board_size, per_cell_cap=per_cell_cap,
                                  rotations=(config.DEDUP.rotations_augmented if rotate
                                             else config.DEDUP.rotations),
                                  val_frac=val_frac, test_frac=test_frac, workers=workers,
                                  class_mode=classes)
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
        from ..training.pack import link_pack

        with fail_on(FileNotFoundError, ValueError):
            link_pack(name, from_)
        return
    from ..training.pack import pack_dataset

    with fail_on(FileNotFoundError, ValueError):
        res = pack_dataset(name, out_size=_out_size(pack_size))
    print(f"[OK] packed '{name}': {res['n']} crops, {res['gb']} GB -> {res['path']}")


@dataset_app.command("bake")
def dataset_bake_cmd(
    name: str = typer.Argument(..., help="Gepackter Datensatz, dessen Pixel gebacken werden."),
    out: str = typer.Argument(..., help="Neuer Datensatzname fuer den gebackenen Pack."),
    model: str | None = typer.Option(None, "--model",
                                     help="Lauf, dessen config.json die CLAHE-Werte liefert."),
    clahe_clip: float = typer.Option(0.0, "--clahe-clip", help="Ohne --model: der clip."),
    clahe_tile: int = typer.Option(8, "--clahe-tile"),
    clahe_min_mean: float = typer.Option(0.0, "--clahe-min-mean"),
    clahe_max_mean: float = typer.Option(255.0, "--clahe-max-mean"),
    clahe_denoise: str = typer.Option("off", "--clahe-denoise"),
    force: bool = typer.Option(False, "--force", help="Vorhandenen Pack ueberschreiben."),
) -> None:
    """CLAHE einmal in die Memmap backen, statt es je Epoche je Crop zu rechnen.

    Nur der FESTE Teil der Kette geht hier hinein; Augmentation bleibt im Loader, sonst saehe das
    Modell 60 Epochen lang dieselbe Verzerrung. Der Lauf braucht danach kein Flag: `train` liest
    `packed_meta.json` und laesst den Operator selbst aus (`training/pack_bake.py`)."""
    from ..training.pack_bake import bake_pack, clahe_params

    if model:
        cfg = json.loads((Path(model) / "config.json").read_text(encoding="utf-8"))
        params = clahe_params(cfg)
    else:
        params = {"clip": clahe_clip, "tile": clahe_tile, "min_mean": clahe_min_mean,
                  "max_mean": clahe_max_mean, "denoise": clahe_denoise}
    with fail_on(ValueError, FileNotFoundError, FileExistsError):
        bake_pack(name, out, params, force=force)


@dataset_app.command("folds")
def dataset_folds_cmd(
    name: str = typer.Argument(..., help="Built dataset to cut into folds."),
    k: int = typer.Option(4, "-k", "--folds", help="Number of folds (docs/cross-labeling-literature.md: 4)."),
    seed: int | None = typer.Option(None, "--seed", help="Default: the dataset's own split seed."),
    val_frac: float | None = typer.Option(None, "--val-frac", help="Default: the dataset's own."),
    prefix: str = typer.Option("split-f", "--prefix", help="File name prefix, e.g. split-f0.json."),
    include_frozen: bool = typer.Option(False, "--include-frozen",
                                        help="Eingefrorene Aufnahmen doch mitschneiden — sie sind "
                                             "danach als Test wertlos."),
    dry_run: bool = typer.Option(False, "--dry-run", help="Report only, write nothing."),
    force: bool = typer.Option(False, "--force", help="Overwrite existing fold files."),
    allow_asymmetric: bool = typer.Option(False, "--allow-asymmetric",
                                          help="Proceed although the dataset was deduped train-only."),
) -> None:
    """Session-grouped cross-validation folds: k `split-f<i>.json` beside the dataset's split.

    For out-of-fold label auditing — every session is predicted by a model that never trained
    on it. All folds share the one pack, so nothing is re-packed."""
    from .. import dataset_build as db

    with fail_on(ValueError, FileNotFoundError):
        db.make_folds(name, k, seed=seed, val_frac=val_frac, prefix=prefix,
                      dry_run=dry_run, force=force, allow_asymmetric=allow_asymmetric,
                      include_frozen=include_frozen)


@dataset_app.command("list")
def dataset_list_cmd() -> None:
    """List existing datasets."""
    from .. import dataset_build as db

    for d in db.list_datasets():
        print(f"{d['name']}: {d['n_sessions']} sessions, {d['counts'].get('final', '?')} crops, "
              f"split {d.get('split_counts', {})}")


@dataset_app.command("delete")
def dataset_delete_cmd(name: str = typer.Argument(...)) -> None:
    """Delete dataset (raw material/sessions remain)."""
    from .. import dataset_build as db

    with fail_on(FileNotFoundError):
        db.delete_dataset(name)
    print(f"[OK] Dataset '{name}' deleted.")
