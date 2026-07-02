"""Training-Router: /api/split, /api/train*, /api/runs*"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, Body, HTTPException

from ..schemas import SplitRequest, TrainRequest
from ..state import TRAIN, train_derive_and_update
from ..util import _img_url, _manifest, _read_jsonl, _run_dirs

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
        raise HTTPException(400, "Split fehlgeschlagen — Datensatzdegenerierung (--allow-degenerate im Web-Tab setzen).")
    return {"ok": True}


@router.post("/api/train")
def train(req: TrainRequest):
    from ... import config
    from ... import dataset as dataset_mod
    from ... import dataset_build as dataset_build_mod
    from ... import serving

    t_proc = TRAIN.get("proc")
    if t_proc is not None and t_proc.poll() is None:
        raise HTTPException(409, "es läuft bereits ein Training.")
    if req.resume and not (config.DATA.models / req.resume / "config.json").exists():
        raise HTTPException(400, f"Resume-Run '{req.resume}' nicht gefunden.")

    # Bevorzugter Weg: auf einem gebauten, benannten Datensatz trainieren (eigener Split).
    if req.dataset:
        dd = dataset_build_mod.dataset_dir(req.dataset)
        if not (dd / "split.json").exists():
            raise HTTPException(400, f"Datensatz '{req.dataset}' nicht gebaut — erst im Datensätze-Tab bauen.")
        sp = json.loads((dd / "split.json").read_text(encoding="utf-8"))
        if sp["counts"]["train"] == 0:
            raise HTTPException(400, "train-Split leer — der Datensatz braucht mind. 2-3 getrennte "
                                "Sessions (Split pro Session gegen Data Leakage).")
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
        log_fh.close()   # Kind hält sein eigenes dupliziertes Handle; Windows-Sperre weg (H3)
        TRAIN.update(proc=proc, log=log_path, cmd=" ".join(cmd), before=before,
                     state="running")
        return {"ok": True, "cmd": TRAIN.get("cmd")}

    # Legacy-Pfad (globales Manifest/Split) — bleibt für Rückwärtskompatibilität.
    manifest_sessions = {r["session_id"] for r in _manifest()}
    if not manifest_sessions:
        raise HTTPException(400, "Kein Datensatz — erst im Tab 'Sammeln' aufnehmen und slicen.")
    split_file = config.DATA.manifests / "split.json"

    def _split_sessions() -> set[str] | None:
        if not split_file.exists():
            return None
        try:
            sp = json.loads(split_file.read_text(encoding="utf-8"))
            return {s for sids in sp["splits"].values() for s in sids}
        except Exception:  # noqa: BLE001
            log.warning("split.json nicht lesbar — wird neu erzeugt.", exc_info=True)
            return None

    if _split_sessions() != manifest_sessions:
        rc = dataset_mod.run_split(val_frac=config.DEFAULT_VAL_FRAC, test_frac=config.DEFAULT_TEST_FRAC,
                                   max_empty_ratio=config.DEFAULT_MAX_EMPTY_RATIO, seed=config.SEED,
                                   max_class_ratio=None, allow_degenerate=False)
        if rc != 0:
            raise HTTPException(400,
                "Split fehlgeschlagen — Datensatz ist degeneriert (Klassen nur in einer Session oder "
                "Val/Test-Split leer). Mehr Sessions mit zufälliger Figur-Linien-Zuordnung aufnehmen, "
                "oder im Datensätze-Tab mit 'Degeneriert zulassen' neu bauen.")

    split = json.loads(split_file.read_text(encoding="utf-8"))
    if split["counts"]["train"] == 0:
        raise HTTPException(400,
            f"Zu wenige Sessions für ein sauberes Training (aktuell {len(manifest_sessions)}). "
            "Train/Val/Test werden pro Session getrennt, um Data Leakage zu vermeiden — dafür "
            "brauchst du mind. 2–3 getrennte Aufnahme-Sessions. Nimm weitere Partien auf, slice "
            "sie und starte erneut.")
    cmd = [sys.executable, "-m", "chesslab.cli", "train", "--backbone", req.backbone,
           "--epochs", str(req.epochs), "--batch-size", str(req.batch_size), "--head", req.head]
    if req.no_amp:
        cmd.append("--no-amp")
    log_path = config.DATA.models / "web_train.log"
    config.DATA.models.mkdir(parents=True, exist_ok=True)
    before = {d.name for d in _run_dirs()}
    log_fh = open(log_path, "w", encoding="utf-8")
    proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, cwd=str(Path.cwd()))
    log_fh.close()   # Kind hält sein eigenes dupliziertes Handle; Windows-Sperre weg (H3)
    TRAIN.update(proc=proc, log=log_path, cmd=" ".join(cmd), before=before,
                 state="running")
    return {"ok": True, "cmd": TRAIN.get("cmd")}


@router.get("/api/train/status")
def train_status():
    # Zustandsableitung (running/done/crashed/stopped/idle) lebt atomar in web/state.py —
    # ein abnormal beendetes Training (Abbruch/Crash) muss erkennbar bleiben, damit das
    # Frontend den Teil-Fortschritt weiter zeigt statt ihn (wegen rc!=0) zu verstecken.
    t = train_derive_and_update()
    state = t["_derived_state"]
    proc = t.get("proc")
    rc = proc.poll() if proc is not None else None
    running = state == "running"
    # Neuestes Run-Verzeichnis (ggf. das gerade gestartete) + dessen Metriken.
    run, metrics = None, []
    dirs = _run_dirs()
    if dirs:
        run = dirs[-1].name
        metrics = _read_jsonl(dirs[-1] / "metrics.jsonl")
    tail = ""
    if t.get("log") and Path(t["log"]).exists():
        tail = "\n".join(Path(t["log"]).read_text(encoding="utf-8").splitlines()[-8:])
    return {"running": running, "state": state, "run": run, "metrics": metrics,
            "log_tail": tail, "returncode": rc}


@router.post("/api/train/stop")
def train_stop():
    """Laufendes (oder nach einem GPU/MIOpen-Crash hängendes) Training beenden + Zustand lösen.
    Das Run-Verzeichnis mit den bis dahin geschriebenen Metriken bleibt erhalten (Teil-Fortschritt)."""
    proc = TRAIN.get("proc")
    killed = False
    if proc is not None and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:  # noqa: BLE001
            log.warning("Trainingsprozess reagierte nicht auf terminate — kill.")
            proc.kill()
        killed = True
    # Letztes (gerade abgebrochenes) Run-Verzeichnis zurückgeben, damit das Frontend dessen
    # Teil-Metriken nachladen kann.
    dirs = _run_dirs()
    run = dirs[-1].name if dirs else None
    TRAIN.update(proc=None, state="stopped")
    return {"ok": True, "killed": killed, "run": run}


@router.get("/api/runs")
def runs():
    import json

    from ... import serving

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
    return sorted(out, key=lambda r: r["run"], reverse=True)   # neueste zuerst


@router.delete("/api/runs/{run}")
def run_delete(run: str):
    import shutil

    from ... import config, serving

    d = config.DATA.models / run
    if "/" in run or "\\" in run or ".." in run or not (d / "config.json").exists():
        raise HTTPException(404, f"Run '{run}' nicht gefunden.")
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
