"""Stage 5 — Evaluation. Board accuracy as main metric, plus per-class recall + confusion."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from .. import config
from ..dataset import load_manifest, load_split
from ..ioutil import write_json
from .data import crop_of_rows, dataset_paths, filter_rows_by_split, read_run_config, unnamed_pin
from .model import stock_batchnorm


def load_run(run_dir: Path, weights: str | None = None):
    """Load model + run config from a run directory (best.pt, otherwise last.pt); `serving.load_run`
    caches in front. [weights] names another checkpoint; the temperature was fitted on `best.pt`.
    """
    import torch

    from .model import build_model
    from .torch_data import input_repr_of

    cfg = read_run_config(run_dir)
    # `occlusion` is a COMBINED head with one sigmoid coverage unit beside the classes; rebuilt
    # under its own name it was unloadable.
    occluding = cfg.get("head") == "occlusion"
    model = build_model(cfg["backbone"], len(cfg["classes"]) + occluding,
                        norm=cfg.get("norm", "batchnorm"),
                        head="combined" if occluding else cfg.get("head", "combined"),
                        in_chans=input_repr_of(cfg)[1],
                        board_width=cfg.get("board_width", 128),
                        board_layers=cfg.get("board_layers", 2))
    if weights:
        ckpt = run_dir / weights
        if not ckpt.exists():
            raise FileNotFoundError(f"{run_dir.name} holds no {weights}")
    else:
        ckpt = run_dir / "best.pt"
        if not ckpt.exists():
            ckpt = run_dir / "last.pt"
    model.load_state_dict(torch.load(ckpt, map_location="cpu"))
    return model, cfg




def _frozen_hit(rows: list[dict]) -> set[str]:
    """Eingefrorene Aufnahmen unter den Zeilen, NUR `frozen`: `benchmark` darf beliebig oft gemessen
    werden, nur nie trainieren.
    """
    import json

    from .. import config

    f = config.DATA.root / "TEST-USED.json"
    if not f.is_file():
        return set()
    frozen = set(json.loads(f.read_text(encoding="utf-8")).get("frozen") or [])
    return frozen & {r["session_id"] for r in rows}


def eval_summary(res, classes, recall, bd, occ_bacc, per_session, spread, *,
                 split_name: str, ds_name: str) -> dict:
    """Was in `eval_<split>.json` und `model_card.json["metrics"]` steht. Unqualifiziert heisst
    KORPUSWEIT, `visible_*` nur, was der Verlust lernt. Ausnahme: `occupied_board_acc` ist
    sichtbar.
    """
    from .data import occupancy_piece_breakdown

    every = occupancy_piece_breakdown(classes, res["trues"], res["preds"])
    # `res["square_acc"]` ist die SICHTBARE Zahl; unqualifiziert gehoert die korpusweite hin.
    hits = [t == p for t, p in zip(res["trues"], res["preds"], strict=False)]
    # TODO: `recall` kommt aus der Konfusion ueber die SICHTBAREN Zellen und steht trotzdem
    # unqualifiziert.
    return {"split": split_name, "dataset": ds_name, "board_acc": res["board_acc"],
            "square_acc": (sum(hits) / len(hits)) if hits else 0.0,
            "visible_square_acc": res["square_acc"], "occupied_acc": every["occupied_acc"],
            # Ohne sichtbare Zelle ist auch diese Zahl nicht gemessen, nicht null.
            "occupied_board_acc": occ_bacc if bd.get("n_cells", 1) else None,
            "visible_occupied_board_acc": occ_bacc if bd.get("n_cells", 1) else None,
            # Leerer Nenner ist `None`: `ModelCard.kt` las 0,0 als gemessene Null. FEHLT der Nenner,
            # gilt der alte Vertrag.
            "visible_piece_acc": bd["piece_acc"] if bd.get("n_occupied", 1) else None,
            "visible_occupied_acc": bd["occupied_acc"] if bd.get("n_cells", 1) else None,
            "visible_type_err": bd["type_err"] if bd.get("n_pieces", 1) else None,
            "piece_acc": every["piece_acc"], "type_err": every["type_err"],
            "color_err": every["color_err"],
            "recall": {c: None if r is None else float(r)
                       for c, r in zip(classes, recall, strict=False)},
            "per_session": per_session, "session_spread": spread}


def run_eval(run: str, split_name: str = "test", input_size: int | None = None,
             dataset: str | None = None, split_file: str | None = None,
             sessions: list[str] | None = None, boards_only: bool = False,
             burn_frozen: bool = False, strict_verdicts: bool = False) -> int:
    """`dataset` points the run at a corpus it was not trained on; `split_name="all"` skips the
    split filter, `sessions` narrows it; both guards below only fire there.
    """

    from .boardnet import CELLS as BOARD_CELLS
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
    model, cfg = load_run(run_dir)
    classes = cfg["classes"]

    foreign = bool(dataset) and dataset != cfg.get("dataset")
    # Naming the split file is an override too: a SIBLING fold reads sessions this one trained on.
    overridden = foreign or (bool(split_file) and split_file != cfg.get("split_file"))
    ds_name = dataset or cfg.get("dataset")
    # The run's OWN split: folds share a dataset whose `split.json` names every session.
    default_split = "split.json" if foreign else (cfg.get("split_file") or "split.json")
    manifest_path, split_path = dataset_paths(ds_name, split_file, default_split)
    # Ohne die Pin-Pruefung misst `eval --dataset <gemeinsamer>` gegen den Val ohne weisse Springer.
    pinned = unnamed_pin(ds_name, split_file, default_split) if ds_name else None
    if pinned is not None:
        print(f"[FAIL] '{ds_name}' hat einen gepinnten Schnitt ({pinned.name}), aber "
              "--split-file nennt ihn nicht. Entweder `--split-file split-pin.json` mitgeben "
              "oder ausdruecklich `--split-file split.json` sagen.")
        return 1
    if not manifest_path.exists() or not split_path.exists():
        print(f"[FAIL] Manifest/split missing ({manifest_path}). Build/split dataset first.")
        return 1
    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    # A run's class list is baked into its head; another numbering gives a plausible, meaningless
    # table.
    ds_classes = split.get("classes")
    if ds_classes and list(ds_classes) != list(classes):
        print(f"[FAIL] '{ds_name}' carries {len(ds_classes)} classes ({', '.join(ds_classes)}), "
              f"the run has {len(classes)} ({', '.join(classes)}).")
        return 1
    rows = manifest if split_name == "all" else filter_rows_by_split(manifest, split, split_name)
    if sessions:
        wanted = set(sessions)
        unknown = wanted - {r["session_id"] for r in rows}
        if unknown:
            print(f"[FAIL] --sessions: not in {split_name} of '{ds_name}': {', '.join(sorted(unknown))}")
            return 1
        rows = [r for r in rows if r["session_id"] in wanted]
    if boards_only:
        # Ein Brett-Modell sieht nur VOLLSTAENDIGE Bretter; ohne diesen Schnitt vergleichen die
        # beiden Familien verschiedene Datensaetze.
        from .boardnet import CELLS

        groups: dict[tuple[str, str], list] = {}
        for r in rows:
            groups.setdefault((r["session_id"], r["frame"]), []).append(r)
        kept = [r for v in groups.values() if len(v) == CELLS for r in v]
        print(f"[boards-only] {len(kept)} von {len(rows)} Zeilen "
              f"({len(groups) - len(kept) // CELLS} unvollstaendige Bretter verworfen)")
        rows = kept
    if not rows:
        print(f"[FAIL] {split_name} split is empty.")
        return 1
    from ..dataset_build import check_verdicts

    try:
        verdicts = check_verdicts(rows, split.get("splits") or {}, strict=strict_verdicts)
    except ValueError as e:
        print(f"[FAIL] {e}")
        return 1
    # Eine eingefrorene Aufnahme wird GENAU EINMAL ausgewertet, nach der Auswahl; jede fruehere
    # Messung verbrennt sie.
    frozen = _frozen_hit(rows)
    if frozen and not burn_frozen:
        print(f"[FAIL] {', '.join(sorted(frozen))} ist eingefroren (data/TEST-USED.json). "
              f"Diese Aufnahme wird genau EINMAL gemessen, nach dem Einfrieren des Kandidaten. "
              f"Wenn das jetzt der Fall ist: --burn-frozen.")
        return 1
    if frozen:
        print(f"[!!] --burn-frozen: {', '.join(sorted(frozen))} wird verbraucht. "
              f"Danach traegt die Aufnahme keine Entscheidung mehr.")
    if overridden:
        from ..occluded_model import trained_on
        seen = {s for s in trained_on(run_dir)
                for r in rows if s == r["session_id"] or s.endswith("-" + r["session_id"])}
        if seen:
            print(f"[WARN] {len(seen)} of these sessions are in the run's TRAIN split: "
                  f"{', '.join(sorted(seen))} — these numbers are not held out.")

    device = get_device(require_gpu=False)
    model.to(device)
    # Required for fused datasets (mm:// rows have no files), a free speedup otherwise.
    from .packs import open_dataset_pack

    packed = open_dataset_pack(ds_name, config.DATA, split_rows=rows)
    # Traegt der Pack CLAHE schon in den Pixeln, rechnet der Loader ihn nicht noch einmal.
    from .packs import cfg_for_pack

    cfg = cfg_for_pack(cfg, ds_name, packed)
    tf = eval_transform_for(cfg)
    batch = 256
    # An occlusion run's last logit is the coverage sigmoid: without this, argmax runs one unit too
    # far.
    with_coverage = cfg.get("head") == "occlusion"
    if packed is not None:
        from .torch_data import PackedSquareDataset
        if str(cfg.get("backbone", "")).startswith(("board:", "boardattn:")):
            # Ein Brett-Modell will `(B, 64, C, H, W)`; der flache Loader liefert `(N, C, H, W)`.
            from .torch_data import PackedBoardDataset

            ds = PackedBoardDataset(rows, classes, tf, packed)
            batch = max(1, 256 // BOARD_CELLS)
        else:
            ds = PackedSquareDataset(rows, classes, tf, packed, with_coverage=with_coverage)
    elif rows and str(rows[0].get("path", "")).startswith("mm://"):
        print(f"[FAIL] dataset '{ds_name}' has mm:// paths — a fused synth build or a pack-built "
              "dataset — but no usable memmap: re-run `chesslab dataset build-synth`, or check "
              "that dataset.yaml still names its packs under data/packs/.")
        return 1
    else:
        ds = SquareDataset(rows, classes, tf, with_coverage=with_coverage)
    # Ab hier zaehlt die Reihenfolge des DATENSATZES (nur vollstaendige Bretter, nach Feld
    # sortiert).
    res = evaluate_dataset(model, ds, device, batch_size=batch, input_size=input_size,
                           keep_workers=False)

    rows = getattr(ds, "rows", None) or rows
    if input_size is not None:
        print(f"[eval @ input_size={input_size}px]")
    print(f"Board accuracy ({split_name}): {res['board_acc']:.4f}")
    from .data import occupancy_board_acc, occupancy_piece_breakdown

    vis = np.flatnonzero(res.get("classification_eligible", np.ones(len(rows), dtype=bool)))
    vis_rows = [rows[i] for i in vis]
    vis_trues = [res["trues"][i] for i in vis]
    vis_preds = [res["preds"][i] for i in vis]
    vis_conf = [res["conf"][i] for i in vis]
    bd = occupancy_piece_breakdown(classes, vis_trues, vis_preds)
    occ_bacc = occupancy_board_acc(vis_rows, classes, vis_trues, vis_preds)
    print(f"Occupancy: square {bd['occupied_acc']:.4f} | board {occ_bacc:.4f}   "
          f"Figur (auf besetzt): {bd['piece_acc']:.4f}   "
          f"Fehler: Typ {bd['type_err']:.3f} / Farbe {bd['color_err']:.3f}")
    # Ein Mittelwert sagt nicht, ob es viele laue oder wenige sehr sichere Fehler sind.
    from .data import confident_confusions

    top = confident_confusions(classes, vis_trues, vis_preds, vis_conf)
    if top:
        print(f"Ueberzeugte Fehler (conf auf Fehlern {_fmt(res.get('conf_wrong'))}):")
        for r in top:
            print(f"   {r['true']:>5} -> {r['pred']:<5} n={r['n']:6d}  conf {r['mean_conf']:.3f}")
    # A corpus mean hides the one recording that carries the whole error.
    from .data import per_session_metrics

    per_session = per_session_metrics(rows, classes, list(res["trues"]), list(res["preds"]))
    spread = session_spread(per_session)
    if len(per_session) > 1:
        print("Per session (worst piece accuracy first):")
        for sid, m in sorted(per_session.items(),
                             key=lambda kv: (kv[1].get("visible_piece_acc") is None,
                                             kv[1].get("visible_piece_acc") or 0.0)):
            print(f"  {sid:<34} piece {_fmt(m.get('visible_piece_acc'))}  "
                  f"board {_fmt(m.get('board_acc'))}  occ {_fmt(m.get('occupied_board_acc'))}  "
                  f"square {_fmt(m.get('square_acc'))}  ({m['crops']} crops)")
        for key, sp in spread.items():
            print(f"Streuung {key}: {sp['min']:.4f} bis {sp['max']:.4f} "
                  f"(Median {sp['median']:.4f}, Spanne {sp['range']:.4f}, {sp['n']} Sessions)")
        print("  Der Korpuswert ist ein Mittel darueber. Ein Vergleich zweier Laeufe muss diese "
              "Spanne schlagen, sonst misst er, welche Sessions im Split lagen.")
    cm = confusion_matrix(np.asarray(vis_trues), np.asarray(vis_preds), len(classes))
    # Ohne sichtbare Zelle ist eine Klasse ungemessen, nicht "nie erkannt".
    recall = [float(r) if n else None
              for r, n in zip(per_class_recall(cm), cm.sum(axis=1), strict=True)]
    print("Per-class recall:")
    for c, r in zip(classes, recall, strict=False):
        print(f"  {c:<6} {_fmt(r)}")
    # A foreign eval writes under its own stem: `eval_test.json` is what `run_export` merges into
    # the card.
    stem = f"{split_name}__{ds_name}" if foreign else split_name
    txt = render_confusion_text(cm, classes)
    (run_dir / f"confusion_{stem}.txt").write_text(txt, encoding="utf-8")
    save_confusion_png(cm, classes, run_dir / f"confusion_{stem}.png")
    print(f"Square-Accuracy ({split_name}): {_fmt(res['square_acc'])}  (nur Kontext)")
    print(f"[OK] Confusion gespeichert: {run_dir / ('confusion_' + stem + '.txt')} (+ .png)")

    summary = eval_summary(res, classes, recall, bd, occ_bacc, per_session, spread,
                           split_name=split_name, ds_name=ds_name)
    summary["verdict_conflicts"] = verdicts
    write_json(run_dir / f"eval_{stem}.json", summary)
    print(f"[OK] {run_dir / f'eval_{stem}.json'}")
    return 0


#: The one batch the tracker infers: 64 squares in one call, baked into the graph (see
#: `_export_onnx`).
ONNX_BATCH = 64

#: ORT against torch on one fixed batch; the tolerance scales with the largest logit.
ONNX_PARITY_TOL = 1e-3

#: Key in the run's `config.json` naming the checkpoint and graph of the last ONNX export.
EXPORT_FINGERPRINT = "export_fingerprint"


def export_checkpoint(run_dir: Path) -> Path:
    """The checkpoint `load_run` traces without `weights`: best.pt, else last.pt."""
    best = run_dir / "best.pt"
    return best if best.exists() else run_dir / "last.pt"


def _sha256(path: Path) -> str | None:
    import hashlib

    if not path.is_file():
        return None
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def export_fingerprint(run_dir: Path) -> dict:
    ckpt = export_checkpoint(run_dir)
    return {"checkpoint": ckpt.name, "checkpoint_sha256": _sha256(ckpt),
            "onnx_sha256": _sha256(run_dir / "model.onnx")}


def _fmt(v: float | None) -> str:
    """Eine ungemessene Zahl ist ein Strich, keine 0,0 — `per_session_metrics` sagt dazu `None`."""
    return f"{v:.4f}" if v is not None else "  —   "


def session_spread(per_session: dict[str, dict]) -> dict[str, dict]:
    """Wie weit die Sessions auseinanderliegen: `visible_piece_acc` reichte ueber vier Folds von
    0,584 bis 0,993, mehr als jeder gemessene Rezeptunterschied.
    """
    import statistics as st

    out: dict[str, dict] = {}
    for key in ("visible_piece_acc", "square_acc", "occupied_board_acc"):
        vals = [m[key] for m in per_session.values() if m.get(key) is not None]
        if len(vals) > 1:
            out[key] = {"min": min(vals), "median": st.median(vals), "max": max(vals),
                        "range": max(vals) - min(vals), "n": len(vals)}
    return out


def untrained_size_error(cfg: dict, w: int, h: int) -> str | None:
    """Why `(w, h)` is not a size this run may be served at, or None. An untrained size does not
    raise, it loses squares (133 missed at 80 px against 19 at 96) — and a miss licenses a
    fabricated capture.
    """
    out_w, out_h = (int(v) for v in cfg["out_size"])
    if (w, h) == (out_w, out_h):
        return None  # the crop build size
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


def crop_of_dataset(name: str, paths: config.Paths | None = None) -> float | None:
    """`crop_of_rows` for a dataset by name; a dataset no longer here reads as legacy, so export
    stays possible.
    """
    from ..dataset_build import dataset_dir

    manifest = dataset_dir(name, paths) / "manifest.jsonl" if name else None
    if manifest is None or not manifest.exists():
        return None
    return crop_of_rows(load_manifest(manifest))


def run_export(run: str, fmt: str = "torchscript",
               infer_size: tuple[int, int] | None = None) -> int:
    """Export a run at the inference size ITS OWN config declares (specs/22), written before
    tracing.

    `pad_side` is declared the same way (specs/45); a run whose dataset cannot say is reported
    LOUDLY as legacy."""
    import torch

    from .data import build_model_card
    from .torch_data import infer_size_of, input_repr_of

    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] kein config.json in {run_dir}.")
        return 1
    model, cfg = load_run(run_dir)
    model.eval()
    # Only the stock module folds into the preceding convolution; the weights are identical.
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
    declared = cfg.get("pad_side")
    if crop is not None and declared is not None and abs(float(declared) - crop) > 1e-9:
        # The run's value is what it was trained on; a dataset rebuilt under the same name is not.
        print(f"[FAIL] {run_dir.name} declares pad_side={declared}, but dataset "
              f"{cfg.get('dataset')!r} now says {crop} — rebuilt under the same name? The run's "
              "value stays; decide by hand before exporting.")
        return 1
    new_crop = crop is not None and declared is None
    if new_crop:
        cfg["pad_side"] = crop
    elif declared is None:
        # Never removes a declaration already in the file: hand-established values outrank a rebuilt
        # dataset.
        print(f"[LEGACY] {run_dir.name} declares NO crop: dataset {cfg.get('dataset')!r} does "
              "not record `pad_side` for all its rows. Every consumer will keep its own "
              "calibration profile's pad, which is the silent domain shift specs/45 is about — "
              "re-slice the sessions to fix it.")
    # Declared, not inferred: a consumer reading `classes.size` logits off a wider graph would
    # softmax the coverage into every probability.
    covering = cfg.get("head") == "occlusion"
    if covering:
        cfg["coverage_output"] = True
    if infer_size is not None or new_crop or covering:
        # Before tracing: the graph must be what the config declares.
        (run_dir / "config.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False),
                                             encoding="utf-8")

    # ONE size per export, so TorchScript and ONNX agree.
    example = torch.randn(ONNX_BATCH, input_repr_of(cfg)[1], in_h, in_w)
    if str(cfg.get("backbone", "")).startswith(("board:", "boardattn:")):
        # Die App schickt EIN Brett als `(64, C, H, W)`; die Huelle ergaenzt die Brettachse,
        # bitgleich.
        class _BoardExport(torch.nn.Module):
            def __init__(self, inner):
                super().__init__()
                self.inner = inner

            def forward(self, x):
                return self.inner(x.unsqueeze(0))

        model = _BoardExport(model).eval()

    def _export_onnx() -> str | None:
        # NO dynamic_axes: under ORT's ALL_OPT the Android session answered a [64,3,128,128] input
        # with a [1,2] output. Trace at the batch the app runs and the shape is baked in.
        torch.onnx.export(model, example, str(run_dir / "model.onnx"),
                          input_names=["input"], output_names=["logits"],
                          opset_version=17, dynamo=False)
        return _onnx_parity_error(model, run_dir / "model.onnx", example.shape)

    # "qnn" is the INT8/QDQ ONNX for the on-device Hexagon NPU (needs the FP32 onnx first).
    formats = ["torchscript", "onnx", "qnn"] if fmt == "all" else [fmt]
    written: list[str] = []
    for f in formats:
        if f == "torchscript":
            ts = torch.jit.trace(model, example)
            ts.save(str(run_dir / "model.torchscript.pt"))
            written.append("torchscript")
        elif f == "onnx":
            err = _export_onnx()
            if err:
                print(f"[FAIL] {err}")
                return 1
            written.append("onnx")
        elif f in ("qnn", "onnx-qnn"):
            if "onnx" not in written and not (run_dir / "model.onnx").exists():
                err = _export_onnx()
                if err:
                    print(f"[FAIL] {err}")
                    return 1
                written.append("onnx")
            from .quantize import run_quantize

            rc = run_quantize(str(run_dir))
            if rc != 0:
                return rc
            written.append("qnn")
        else:
            print(f"[FAIL] unknown format {f!r} (torchscript | onnx | qnn | onnx-qnn | all).")
            return 1

    if "onnx" in written:
        cfg[EXPORT_FINGERPRINT] = export_fingerprint(run_dir)
        write_json(run_dir / "config.json", cfg)

    metrics = {}
    eval_test = run_dir / "eval_test.json"
    if eval_test.exists():
        metrics = json.loads(eval_test.read_text(encoding="utf-8"))
    card = build_model_card(
        classes=classes, out_size=(out_w, out_h), infer_size=(in_w, in_h),
        backbone=cfg["backbone"], metrics=metrics,
        torch_version=torch.__version__, hip_version=getattr(torch.version, "hip", None),
        exported_formats=written, normalize=cfg.get("normalize"),
    )
    (run_dir / "model_card.json").write_text(json.dumps(card, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] exportiert: {', '.join(written)} @ {in_w}x{in_h} + model_card.json -> {run_dir}")
    return 0


def _onnx_parity_error(model, onnx_path: Path, shape) -> str | None:
    """Why the written graph does not compute what `model` computes — None when it does."""
    import onnxruntime as ort
    import torch

    x = torch.randn(tuple(shape), generator=torch.Generator().manual_seed(0))
    with torch.no_grad():
        ref = model(x).detach().cpu().numpy()
    so = ort.SessionOptions()
    so.log_severity_level = 3
    sess = ort.InferenceSession(str(onnx_path), so, providers=["CPUExecutionProvider"])
    got = np.asarray(sess.run(None, {"input": x.numpy()})[0])
    if got.shape != ref.shape:
        return f"ONNX gibt {got.shape} aus, torch {ref.shape}"
    worst = float(np.abs(got - ref).max())
    limit = ONNX_PARITY_TOL * max(1.0, float(np.abs(ref).max()))
    if worst > limit:
        return f"ONNX weicht von torch ab: max |d| {worst:.3g} > {limit:.3g} ({onnx_path})"
    return None
