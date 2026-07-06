"""Training router: /api/split, /api/train*, /api/runs*"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import SplitRequest, TrainRequest
from ..state import TRAIN, train_derive_and_update
from ..util import _img_url, _read_jsonl, _run_dirs

log = logging.getLogger("chesslab.web")
router = APIRouter()


@router.post("/api/split")
def split(req: SplitRequest):
    from ... import config
    from ... import dataset as dataset_mod

    rc = dataset_mod.run_split(val_frac=config.DEFAULT_VAL_FRAC, test_frac=config.DEFAULT_TEST_FRAC,
                                max_empty_ratio=req.max_empty_ratio, seed=req.seed,
                                max_class_ratio=req.max_class_ratio,
                                allow_degenerate=req.allow_degenerate)
    if rc != 0:
        raise HTTPException(400, "Split failed — dataset degenerated (set --allow-degenerate in the web tab).")
    return {"ok": True}


@router.post("/api/train")
def train(req: TrainRequest):
    from ... import config
    from ... import dataset as dataset_mod
    from ... import dataset_build as dataset_build_mod

    t_proc = TRAIN.get("proc")
    if t_proc is not None and t_proc.poll() is None:
        raise HTTPException(409, "a training is already running.")
    if req.resume and not (config.DATA.models / req.resume / "config.json").exists():
        raise HTTPException(400, f"Resume run '{req.resume}' not found.")

    # Preferred path: train on a built, named dataset (its own split).
    if req.dataset:
        dd = dataset_build_mod.dataset_dir(req.dataset)
        if not (dd / "split.json").exists():
            raise HTTPException(400, f"Dataset '{req.dataset}' not built — build it first in the datasets tab.")
        sp = json.loads((dd / "split.json").read_text(encoding="utf-8"))
        if sp["counts"]["train"] == 0:
            raise HTTPException(400, "train split empty — the dataset needs at least 2-3 separate "
                                "sessions (split per session against data leakage).")
        cmd = [sys.executable, "-m", "chesslab.cli", "train", "--backbone", req.backbone,
               "--epochs", str(req.epochs), "--batch-size", str(req.batch_size), "--lr", str(req.lr),
               "--patience", str(req.patience), "--dataset", req.dataset, "--head", req.head]
        if req.resume:
            cmd += ["--resume", req.resume]
        if req.no_amp:
            cmd.append("--no-amp")
        config.DATA.models.mkdir(parents=True, exist_ok=True)
        before = {d.name for d in _run_dirs()}
        log_path = config.DATA.models / "web_train.log"
        log_fh = open(log_path, "w", encoding="utf-8")
        proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, cwd=str(Path.cwd()))
        log_fh.close()   # Child holds its own duplicated handle; release Windows lock (H3)
        TRAIN.update(proc=proc, log=log_path, cmd=" ".join(cmd), before=before,
                     state="running")
        return {"ok": True, "cmd": TRAIN.get("cmd")}

    # Legacy path (global manifest/split) — kept for backward compatibility.
    from ...manifest_cache import manifest_stats
    manifest_sessions = set(manifest_stats(config.DATA.manifests / "squares.jsonl")["crops_by_session"])
    if not manifest_sessions:
        raise HTTPException(400, "No dataset — first capture and slice in the 'Collect' tab.")
    split_file = config.DATA.manifests / "split.json"

    def _split_sessions() -> set[str] | None:
        if not split_file.exists():
            return None
        try:
            sp = json.loads(split_file.read_text(encoding="utf-8"))
            return {s for sids in sp["splits"].values() for s in sids}
        except Exception:  # noqa: BLE001
            log.warning("split.json not readable — will be regenerated.", exc_info=True)
            return None

    if _split_sessions() != manifest_sessions:
        rc = dataset_mod.run_split(val_frac=config.DEFAULT_VAL_FRAC, test_frac=config.DEFAULT_TEST_FRAC,
                                    max_empty_ratio=config.DEFAULT_MAX_EMPTY_RATIO, seed=config.SEED,
                                    max_class_ratio=None, allow_degenerate=False)
        if rc != 0:
            raise HTTPException(400,
                "Split failed — dataset is degenerated (classes only in one session or "
                "val/test split empty). Capture more sessions with random piece-line assignments, "
                "or rebuild in the datasets tab with 'Allow degenerate' enabled.")

    split = json.loads(split_file.read_text(encoding="utf-8"))
    if split["counts"]["train"] == 0:
        raise HTTPException(400,
            f"Too few sessions for clean training (currently {len(manifest_sessions)}). "
            "Train/val/test are split per session to avoid data leakage — you need "
            "at least 2-3 separate capture sessions. Capture more games, slice "
            "them, and start again.")
    cmd = [sys.executable, "-m", "chesslab.cli", "train", "--backbone", req.backbone,
           "--epochs", str(req.epochs), "--batch-size", str(req.batch_size), "--head", req.head]
    if req.no_amp:
        cmd.append("--no-amp")
    log_path = config.DATA.models / "web_train.log"
    config.DATA.models.mkdir(parents=True, exist_ok=True)
    before = {d.name for d in _run_dirs()}
    log_fh = open(log_path, "w", encoding="utf-8")
    proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, cwd=str(Path.cwd()))
    log_fh.close()   # Child holds its own duplicated handle; release Windows lock (H3)
    TRAIN.update(proc=proc, log=log_path, cmd=" ".join(cmd), before=before,
                 state="running")
    return {"ok": True, "cmd": TRAIN.get("cmd")}


@router.get("/api/train/status")
def train_status():
    # State derivation (running/done/crashed/stopped/idle) lives atomically in web/state.py —
    # an abnormally terminated training (abort/crash) must remain visible so the
    # frontend continues to show partial progress instead of hiding it (because rc!=0).
    t = train_derive_and_update()
    state = t["_derived_state"]
    proc = t.get("proc")
    rc = proc.poll() if proc is not None else None
    running = state == "running"
    # Latest run directory (possibly the one just started) + its metrics. If the newest run
    # produced NO metrics (crashed on the first epoch, e.g. GPU OOM) and nothing is running,
    # fall back to the newest run that DOES have metrics so the tab isn't blank — and surface
    # the crashed run separately.
    run, metrics, crashed_run = None, [], None
    dirs = _run_dirs()
    if dirs:
        run = dirs[-1].name
        metrics = _read_jsonl(dirs[-1] / "metrics.jsonl")
        if not metrics and not running:
            crashed_run = dirs[-1].name
            for d in reversed(dirs):
                m = _read_jsonl(d / "metrics.jsonl")
                if m:
                    run, metrics = d.name, m
                    break
    tail = ""
    if t.get("log") and Path(t["log"]).exists():
        tail = "\n".join(Path(t["log"]).read_text(encoding="utf-8").splitlines()[-8:])
    return {"running": running, "state": state, "run": run, "metrics": metrics,
            "crashed_run": crashed_run, "log_tail": tail, "returncode": rc}


@router.post("/api/train/stop")
def train_stop():
    """Stop a running (or stuck-after-GPU/MIOpen-crash) training + release state.
    The run directory with metrics written so far is preserved (partial progress)."""
    proc = TRAIN.get("proc")
    killed = False
    if proc is not None and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:  # noqa: BLE001
            log.warning("Training process did not respond to terminate — kill.")
            proc.kill()
        killed = True
    # Return the latest (just-aborted) run directory so the frontend can load its
    # partial metrics.
    dirs = _run_dirs()
    run = dirs[-1].name if dirs else None
    TRAIN.update(proc=None, state="stopped")
    return {"ok": True, "killed": killed, "run": run}


@router.get("/api/runs")
def runs():
    import json


    out = []
    for d in _run_dirs():
        cfg = json.loads((d / "config.json").read_text(encoding="utf-8"))
        metrics = _read_jsonl(d / "metrics.jsonl")
        ev = d / "eval_test.json"
        test_board = (json.loads(ev.read_text(encoding="utf-8")).get("board_acc") if ev.exists() else None)
        out.append({
            "run": d.name, "backbone": cfg.get("backbone"), "dataset": cfg.get("dataset"),
            "n_classes": len(cfg.get("classes", [])), "resumed_from": cfg.get("resumed_from"),
            "has_occluded": "occluded" in cfg.get("classes", []),
            "epochs_done": len(metrics),
            "best_board_acc": max((m.get("val_board_acc", 0) for m in metrics), default=0),
            "best_square_acc": max((m.get("val_acc", 0) for m in metrics), default=0),
            "best_macro_recall": max((m.get("val_macro_recall", 0) for m in metrics), default=0),
            "test_board_acc": test_board,
            "last": metrics[-1] if metrics else None,
        })
    return sorted(out, key=lambda r: r["run"], reverse=True)   # newest first


@router.delete("/api/runs/{run}")
def run_delete(run: str):
    import shutil

    from ... import config, serving

    d = config.DATA.models / run
    if "/" in run or "\\" in run or ".." in run or not (d / "config.json").exists():
        raise HTTPException(404, f"Run '{run}' not found.")
    serving.clear_cache()
    shutil.rmtree(d)
    return {"ok": True, "run": run}


@router.get("/api/runs/{run}/metrics")
def run_metrics(run: str):
    from ... import config

    return {"run": run, "metrics": _read_jsonl(config.DATA.models / run / "metrics.jsonl")}


@router.get("/api/runs/{run}/eval")
def run_eval(run: str):
    import json

    from ... import config

    d = config.DATA.models / run
    evals = {}
    for f in sorted(d.glob("eval_*.json")):
        split = f.stem.replace("eval_", "")
        evals[split] = json.loads(f.read_text(encoding="utf-8"))
        png = d / f"confusion_{split}.png"
        if png.exists():
            evals[split]["confusion_png"] = _img_url(png.as_posix())
    return {"run": run, "evals": evals}


@router.get("/api/runs/{run}/gradcam")
def run_gradcam(run: str, split: str = "test", per_class: int = 1, force_class: str | None = None):
    """Grad-CAM overlays (``per_class`` crops per class) — which pixels drove the decision.

    Generated on demand and cached under ``run_dir/gradcam/``. Returns image URLs
    served via the ``/img`` static mount.
    """
    from ... import config

    d = config.DATA.models / run
    if not (d / "config.json").exists():
        raise HTTPException(404, f"run {run} not found")
    per_class = max(1, min(per_class, 8))
    try:
        from ...training.gradcam import gradcam_for_run

        items = gradcam_for_run(d, split=split, per_class=per_class, force_class=force_class or None)
    except FileNotFoundError as e:
        raise HTTPException(400, f"dataset/split missing: {e}") from e
    except Exception as e:  # noqa: BLE001 — surface any torch/model error to the UI
        log.exception("gradcam failed")
        raise HTTPException(500, str(e)) from e
    return {"run": run, "split": split, "items": [
        {"true": it["true"], "pred": it["pred"], "prob": it["prob"],
         "orig": _img_url(it["orig"].as_posix()), "overlay": _img_url(it["overlay"].as_posix())}
        for it in items
    ]}


@router.get("/api/runs/{run}/reliance")
def run_reliance(run: str, split: str = "test", per_class: int = 8):
    """Background-reliance test: for each class, how much of the decision comes from the piece
    (center) vs. the surrounding board (border). ``piece_frac`` near 1 = reads the figure,
    near 0 = leans on background. See ``chesslab.training.gradcam.reliance_for_run``.
    """
    from ... import config

    d = config.DATA.models / run
    if not (d / "config.json").exists():
        raise HTTPException(404, f"run {run} not found")
    per_class = max(1, min(per_class, 32))
    try:
        from ...training.gradcam import reliance_for_run

        items = reliance_for_run(d, split=split, per_class=per_class)
    except FileNotFoundError as e:
        raise HTTPException(400, f"dataset/split missing: {e}") from e
    except Exception as e:  # noqa: BLE001 — surface any torch/model error to the UI
        log.exception("reliance failed")
        raise HTTPException(500, str(e)) from e
    return {"run": run, "split": split, "items": items}
