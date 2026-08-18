"""Stage 5 — Evaluation. Board accuracy as main metric, plus per-class recall + confusion."""

from __future__ import annotations

import json
from pathlib import Path

from .. import config
from .data import crop_of_rows, filter_rows_by_split, load_manifest, load_split
from .model import stock_batchnorm


def load_run(run_dir: Path):
    """Load model + run config from a run directory (best.pt, otherwise last.pt).

    Public because `chesslab.serving.load_run` (the canonical inference facade,
    see specs/rework/01-serving-facade.md) calls this function with a cache in front.
    """
    import torch

    from .model import build_model
    from .torch_data import input_repr_of

    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    # `occlusion` is a COMBINED head with one sigmoid coverage unit beside the classes — the same
    # arithmetic `train.py` uses. Rebuilding it under its own name raised "unknown head", so every
    # run trained with it was unloadable: no eval, no confusion, no export.
    occluding = cfg.get("head") == "occlusion"
    model = build_model(cfg["backbone"], len(cfg["classes"]) + occluding,
                        norm=cfg.get("norm", "batchnorm"),
                        head="combined" if occluding else cfg.get("head", "combined"),
                        classes=cfg["classes"], in_chans=input_repr_of(cfg)[1])
    ckpt = run_dir / "best.pt"
    if not ckpt.exists():
        ckpt = run_dir / "last.pt"
    model.load_state_dict(torch.load(ckpt, map_location="cpu"))
    return model, cfg


# Transition alias: previous private name, in case still referenced somewhere.
_load_run = load_run


def run_eval(run: str, split_name: str = "test", input_size: int | None = None) -> int:

    from .engine import (
        confusion_matrix,
        evaluate_dataset,
        get_device,
        per_class_recall,
        render_confusion_text,
        save_confusion_png,
    )
    from .torch_data import SquareDataset, eval_transform_for

    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] no config.json in {run_dir} — first run `chesslab train`.")
        return 1
    model, cfg = _load_run(run_dir)
    classes = cfg["classes"]

    ds_name = cfg.get("dataset")          # selber Datensatz wie beim Training (im run-config)
    if ds_name:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(ds_name)
        # The run's OWN split, not the corpus-wide one: a cross-validation fold shares the packed
        # dataset with three others, and `split.json` there names every session — evaluating a
        # fold against it would measure the sessions it trained on.
        manifest_path = dd / "manifest.jsonl"
        split_path = dd / (cfg.get("split_file") or "split.json")
    else:
        manifest_path = config.DATA.manifests / "squares.jsonl"
        split_path = config.DATA.manifests / "split.json"
    if not manifest_path.exists() or not split_path.exists():
        print(f"[FAIL] Manifest/split missing ({manifest_path}). Build/split dataset first.")
        return 1
    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    rows = filter_rows_by_split(manifest, split, split_name)
    if not rows:
        print(f"[FAIL] {split_name} split is empty.")
        return 1

    device = get_device(require_gpu=False)
    model.to(device)
    # Packed memmap when available: required for fused datasets (mm:// rows have no files) and
    # a free speedup for any packed one. Falls back to per-PNG for classic file-backed datasets.
    packed = None
    if ds_name:
        from .pack import load_packed
        packed = load_packed(ds_name)
    tf = eval_transform_for(cfg)
    if packed is not None:
        from .torch_data import PackedSquareDataset
        ds = PackedSquareDataset(rows, classes, tf, packed)
    elif rows and str(rows[0].get("path", "")).startswith("mm://"):
        print(f"[FAIL] dataset '{ds_name}' is a fused synth build but its packed memmap is "
              "missing/stale — re-run `chesslab dataset build-synth`.")
        return 1
    else:
        ds = SquareDataset(rows, classes, tf)
    res = evaluate_dataset(model, ds, device, batch_size=256, input_size=input_size)

    # 1. Board-Accuracy (Hauptmetrik)
    if input_size is not None:
        print(f"[eval @ input_size={input_size}px]")
    print(f"Board accuracy ({split_name}): {res['board_acc']:.4f}")
    # 1b. Occupancy/piece diagnosis: WHERE are the errors (occupancy vs. type vs. color)?
    from .data import occupancy_board_acc, occupancy_piece_breakdown

    bd = occupancy_piece_breakdown(classes, list(res["trues"]), list(res["preds"]))
    occ_bacc = occupancy_board_acc(rows, classes, list(res["trues"]), list(res["preds"]))
    print(f"Occupancy: square {bd['occ_acc']:.4f} | board {occ_bacc:.4f}   "
          f"Figur (auf besetzt): {bd['piece_acc']:.4f}   "
          f"Fehler: Typ {bd['type_err']:.3f} / Farbe {bd['color_err']:.3f}")
    # 2. Per-Klassen-Recall
    cm = confusion_matrix(res["trues"], res["preds"], len(classes))
    recall = per_class_recall(cm)
    print("Per-class recall:")
    for c, r in zip(classes, recall, strict=False):
        print(f"  {c:<6} {r:.3f}")
    # 3. Confusion (Text + PNG), Blick auf König<->Dame und Figur<->empty
    txt = render_confusion_text(cm, classes)
    (run_dir / f"confusion_{split_name}.txt").write_text(txt, encoding="utf-8")
    save_confusion_png(cm, classes, run_dir / f"confusion_{split_name}.png")
    # 4. Square-Accuracy (nur Kontext)
    print(f"Square-Accuracy ({split_name}): {res['square_acc']:.4f}  (nur Kontext)")
    print(f"[OK] Confusion gespeichert: {run_dir / ('confusion_' + split_name + '.txt')} (+ .png)")

    summary = {"split": split_name, "board_acc": res["board_acc"], "square_acc": res["square_acc"],
               "occ_acc": bd["occ_acc"], "occ_board_acc": occ_bacc, "piece_acc": bd["piece_acc"],
               "type_err": bd["type_err"], "color_err": bd["color_err"],
               "recall": {c: float(r) for c, r in zip(classes, recall, strict=False)}}
    (run_dir / f"eval_{split_name}.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return 0


#: The one batch the tracker ever infers: 64 squares of a board, read in a single call.
#: Baked into the exported graph — see `_export_onnx` for why it must not be dynamic.
ONNX_BATCH = 64


def untrained_size_error(cfg: dict, w: int, h: int) -> str | None:
    """Why `(w, h)` is not a size this run may be served at — or None when it is.

    Validated HERE, where the value enters the model's `config.json`, and nowhere else. An
    untrained inference size does not raise, it just loses squares: `occ-v4-f3e20`
    (`scales: [32, 64, 96, 128]`) reads **133** occupied squares as empty at 80 px against 19 at
    96 px and 38 at 64 px, and 916 at 48 px (specs/22, phase 00). A miss licenses a fabricated
    capture, so silence is the expensive failure mode here.
    """
    out_w, out_h = (int(v) for v in cfg["out_size"])
    if (w, h) == (out_w, out_h):
        return None      # the size the crops were built at — nothing new is being asked of anyone
    scales = [int(s) for s in cfg.get("scales") or []]
    if not scales:
        return (f"--infer-size {w}x{h} but this run has no `scales`: it was trained at one size, "
                f"so its infer_size must stay its out_size {out_w}x{out_h}.")
    if w != h:
        return (f"--infer-size {w}x{h} is not square, and this run's trained scales {scales} are "
                "single numbers — only WxW sizes can be checked against them.")
    if w not in scales:
        return (f"--infer-size {w}x{h} is not one of this run's trained scales {scales}. "
                "Untrained sizes fail silently: 80px costs this backbone 133 misses against "
                "96px's 19.")
    return None


def crop_of_dataset(name: str, paths: config.Paths | None = None) -> tuple[float, float] | None:
    """[crop_of_rows][chesslab.training.data.crop_of_rows] for a dataset by name.

    A dataset that is not on this machine any more reads as legacy rather than raising — an
    export must stay possible without the corpus that produced it.
    """
    from ..dataset_build import dataset_dir

    manifest = dataset_dir(name, paths) / "manifest.jsonl" if name else None
    if manifest is None or not manifest.exists():
        return None
    return crop_of_rows(load_manifest(manifest))


def run_export(run: str, fmt: str = "torchscript",
               infer_size: tuple[int, int] | None = None) -> int:
    """Export a run at the inference size ITS OWN config declares (specs/22).

    `infer_size` is the convenience writer for that key: it is stored in the run's `config.json`
    and then read straight back through `infer_size_of`, so the exported graph is always what the
    config says and never a value that existed only in this argument.

    The crop's COMPOSITION (`pad_side`/`pad_up`) is written the same way and for the same reason
    (specs/45): it decides what the 64 crops contain, the consumer has to reproduce it, and only
    the dataset knows it. A run whose dataset cannot say declares nothing and is reported LOUDLY
    as legacy — the serving path then keeps the calibration profile's values, which is the very
    mismatch this key exists to end.
    """
    import torch

    from .data import build_model_card
    from .torch_data import infer_size_of, input_repr_of

    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] kein config.json in {run_dir}.")
        return 1
    model, cfg = _load_run(run_dir)
    model.eval()
    # The primitive BatchNorm exists only so training can avoid MIOpen's broken kernel; the
    # exporter cannot fold its arithmetic into the preceding convolution, and unfolded it ships as
    # dozens of loose nodes per norm. The stock module holds the identical weights.
    stock_batchnorm(model)
    classes = cfg["classes"]
    out_w, out_h = (int(v) for v in cfg["out_size"])
    if infer_size is not None:
        cfg["infer_size"] = [int(infer_size[0]), int(infer_size[1])]
    in_w, in_h = infer_size_of(cfg)
    err = untrained_size_error(cfg, in_w, in_h)
    if err:
        print(f"[FAIL] {err}")
        return 1
    crop = crop_of_dataset(str(cfg.get("dataset") or ""))
    if crop is not None:
        cfg["pad_side"], cfg["pad_up"] = crop
    elif "pad_side" not in cfg:
        # Never removes a declaration already in the file: a value established by hand from the
        # session profiles (which is how the bundled models got theirs) outranks a dataset that
        # has since been rebuilt or moved away.
        print(f"[LEGACY] {run_dir.name} declares NO crop: dataset {cfg.get('dataset')!r} does "
              "not record `pad_side`/`pad_up` for all its rows. Every consumer will keep its own "
              "calibration profile's pads, which is the silent domain shift specs/45 is about — "
              "re-slice the sessions to fix it.")
    # The occlusion head ships ONE extra output beside the classes, and it is a sigmoid coverage,
    # not a class. Declared rather than inferred from `head`: a consumer reading `classes.size`
    # logits off a graph one wider would softmax the coverage into every probability.
    covering = cfg.get("head") == "occlusion"
    if covering:
        cfg["coverage_output"] = True
    if infer_size is not None or crop is not None or covering:
        # Write it before tracing: the graph must be what the config declares, and the config is
        # what every consumer resizes and pads its crops to.
        (run_dir / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False),
                                             encoding="utf-8")

    # ONE size per export — TorchScript and ONNX are traced from the same example, so the two
    # artifacts of a run can never disagree about what the network takes.
    example = torch.randn(ONNX_BATCH, input_repr_of(cfg)[1], in_h, in_w)

    def _export_onnx() -> None:
        # NO dynamic_axes. A dynamic batch dim is not a harmless generalisation here: under ORT's
        # ALL_OPT the Android session answers a [64,3,128,128] input with a [1,2] output and every
        # observation dies on "model returned 2 logits, expected 128". That was diagnosed once
        # already (b24f1f3) and fixed by hand-patching the shipped .onnx, leaving this exporter
        # still emitting the broken shape — so the next two models shipped with it again.
        # Trace at the batch the app actually runs and the shape is baked in.
        torch.onnx.export(model, example, str(run_dir / "model.onnx"),
                          input_names=["input"], output_names=["logits"],
                          opset_version=17, dynamo=False)

    # "qnn" is the INT8/QDQ ONNX for the on-device Hexagon NPU (needs the FP32 onnx first).
    formats = ["torchscript", "onnx", "qnn"] if fmt == "all" else [fmt]
    written: list[str] = []
    for f in formats:
        if f == "torchscript":
            ts = torch.jit.trace(model, example)
            ts.save(str(run_dir / "model.torchscript.pt"))
            written.append("torchscript")
        elif f == "onnx":
            _export_onnx()
            written.append("onnx")
        elif f in ("qnn", "onnx-qnn"):
            # NPU deployment: ensure the FP32 graph exists, then static-quantize it.
            if "onnx" not in written and not (run_dir / "model.onnx").exists():
                _export_onnx()
                written.append("onnx")
            from .quantize import run_quantize

            rc = run_quantize(str(run_dir))
            if rc != 0:
                return rc
            written.append("qnn")
        else:
            print(f"[FAIL] unknown format {f!r} (torchscript | onnx | qnn | onnx-qnn | all).")
            return 1

    metrics = {}
    eval_test = run_dir / "eval_test.json"
    if eval_test.exists():
        metrics = json.loads(eval_test.read_text(encoding="utf-8"))
    card = build_model_card(
        classes=classes, out_size=(out_w, out_h), infer_size=(in_w, in_h),
        backbone=cfg["backbone"], metrics=metrics,
        torch_version=torch.__version__, hip_version=getattr(torch.version, "hip", None),
        exported_formats=written,
    )
    (run_dir / "model_card.json").write_text(json.dumps(card, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] exportiert: {', '.join(written)} @ {in_w}x{in_h} + model_card.json -> {run_dir}")
    return 0
