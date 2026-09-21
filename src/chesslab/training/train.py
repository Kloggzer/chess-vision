"""Stage 5 — Training loop. Aborts clearly without usable ROCm GPU (no silent CPU fallback)."""

from __future__ import annotations

import atexit
import json
import os
import random
import time
from collections import deque
from datetime import datetime
from pathlib import Path

from .. import config, doctor, locks
from ..ioutil import write_json
from ..work_audit import current as current_work_audit
from .data import (
    checkpoint_metrics,
    crop_of_rows,
    filter_rows_by_split,
    load_manifest,
    load_split,
)

#: Loader-Worker, wenn `--batch-aug` den Feed schlank macht. Gemessen 2026-09-07: 1 reicht warm
#: (104 us gegen 127 Budget), ist kalt aber zu langsam (129); 2 sind cold-safe (79).
BATCH_AUG_WORKERS = 2
#: Die gueltigen `--balance`-Werte. Als Freitext fiel ein Tippfehler lautlos auf `situation`
#: zurueck, wurde als der Tippfehler nach `config.json` geschrieben und machte zwei Sweep-Arme
#: heimlich zu demselben Lauf.
BALANCE_MODES = ("none", "situation", "session", "class", "piece")


def check_balance(value: str) -> str:
    if value not in BALANCE_MODES:
        raise ValueError(f"--balance {value!r} is not one of {', '.join(BALANCE_MODES)}")
    return value


def _photometry_of(policy, photometric) -> dict:
    """Die photometrischen Staerken, wie sie WIRKLICH gewuerfelt wurden.

    Mit `--batch-aug` stehen sie im Loader auf 0 und leben in `BatchPhotometric` — `config.json`
    muss den gerechneten Operator nennen, sonst inferiert das Geraet mit anderen Werten.
    """
    src = photometric or policy
    gamma = src.gamma if photometric else policy.gamma
    return {"aug_brightness": src.brightness,
            "aug_contrast": src.contrast,
            "aug_color_jitter": src.saturation if photometric else policy.color_jitter,
            "aug_blur_sigma_max": src.sigma_max if photometric else policy.blur_sigma_max,
            "aug_gamma": list(gamma),
            "aug_erase_p": src.erase_p,
            "aug_erase_scale": list(src.erase_scale),
            "aug_noise_std": src.noise_std if photometric else getattr(policy, "noise_std", 0.0),
            **_geometry_of(policy, photometric)}


def _aug_of(policy, photometric, neighbour_p) -> dict:
    """Derselbe Quell-Vorrang wie `_photometry_of` — sonst nennt `config.json` denselben Regler
    zweimal mit zwei Werten: mit `--batch-aug` steht `policy.erase_p` auf 0, gewuerfelt hat aber
    `BatchPhotometric`."""
    return {"erase_p": (photometric or policy).erase_p, "neighbour_p": neighbour_p or 0.0}


def _geometry_of(policy, photometric) -> dict:
    """Dasselbe fuer die Geometrie: mit `--batch-aug` steht sie im Loader auf 0."""
    g = getattr(photometric, "geometry", None)
    src = g or policy
    return {"aug_jitter_translate": src.translate if g else policy.jitter_translate,
            "aug_jitter_scale": src.scale if g else policy.jitter_scale,
            "aug_hflip_p": getattr(src, "hflip_p", 0.0),
            "aug_vflip_p": getattr(src, "vflip_p", 0.0),
            "aug_rot180_p": getattr(src, "rot180_p", 0.0),
            "aug_flip_xor_p": getattr(src, "flip_xor_p", 0.0)}


#: Alles, was eine Epochengrenze ueberlebt haben muss. `last.pt` traegt nur Gewichte — damit
#: faengt ein Neustart die Cosine bei lr an und zaehlt `patience` von vorn.
STATE_FILE = "state.pt"
#: Ein Zustand gehoert zu SEINEM Rezept. Weicht eines dieser Felder ab, ist es ein anderer Lauf.
STATE_KEYS = ("backbone", "epochs", "batch_size", "lr", "sched", "seed", "dataset", "split_file",
              "head", "norm", "out_size", "batch_aug", "epoch_frac", "balance",
              "checkpoint_policy", "worker_rng_policy")


def _save_state(path, epoch, model, optimizer, scheduler, scaler, sampler, swa_model, swa_sched,
                best_score, best_piece, recent, epochs_no_improve, cfg) -> None:
    """Nach JEDER Epoche, atomar ueber eine Nebendatei — ein Absturz mitten im Schreiben
    duerfte sonst den einzigen Zustand zerreissen."""
    import random as _random

    import numpy as _np
    import torch

    gen = getattr(sampler, "generator", None)
    blob = {
        "epoch": epoch + 1, "config": {k: cfg.get(k) for k in STATE_KEYS},
        "model": model.state_dict(), "optimizer": optimizer.state_dict(),
        "scheduler": scheduler.state_dict(), "scaler": scaler.state_dict(),
        "sampler_generator": gen.get_state() if gen is not None else None,
        "swa_model": swa_model.state_dict() if swa_model is not None else None,
        "swa_sched": swa_sched.state_dict() if swa_sched is not None else None,
        "best_score": best_score, "best_piece": best_piece, "recent": list(recent),
        "epochs_no_improve": epochs_no_improve,
        "rng": {"torch": torch.get_rng_state(), "numpy": _np.random.get_state(),
                "python": _random.getstate(),
                "cuda": torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None},
    }
    tmp = Path(path).with_suffix(".tmp")
    torch.save(blob, tmp)
    tmp.replace(path)


def _load_state(path, cfg):
    """Der Zustand oder None — und ein lauter Abbruch, wenn er zu einem anderen Rezept gehoert."""
    import torch

    blob = torch.load(path, map_location="cpu", weights_only=False)
    want = {k: cfg.get(k) for k in STATE_KEYS}
    have = blob.get("config", {})
    diff = [k for k in STATE_KEYS if have.get(k) != want.get(k)]
    if diff:
        raise ValueError(f"{path} gehoert zu einem anderen Rezept ({', '.join(diff)}) — "
                         f"neues --out waehlen statt fortsetzen.")
    return blob


def _train_lock_path() -> Path:
    """The SAME file the web app's Autopilot serializes on (`platform/app/lib/autopilot-state.ts`).

    Two locks that do not know each other are no lock: the Autopilot started a replay onto the GPU
    while a training held it, and the only remedy was pausing it by hand (2026-08-16).

    `CHESSLAB_TRAIN_SLOT` gibt einem Lauf einen EIGENEN Lock und laesst damit zwei Trainings
    nebeneinander zu. Der Grund, dass es das gibt: gemessen 2026-08-26 kostet ein Lauf 11,7 GB
    Commit von 79,8, und bei 25 ms je Batch ist er datengebunden, nicht rechengebunden. Der Grund,
    dass es NICHT der Default ist: der Lock existiert wegen eines Speicher-Absturzes, und wer
    Slots benutzt, umgeht auch die Serialisierung gegen den Autopilot.
    """
    slot = os.environ.get("CHESSLAB_TRAIN_SLOT")
    if slot:
        return config.DATA.heavy_lock.with_name(f"heavy-{slot}.lock")
    return config.DATA.heavy_lock


def _load_training_pack(dataset: str | None, manifest_rows: list[dict]):
    """Resolve a dataset's pack(s) once, reusing the manifest already held by training."""
    if dataset is None:
        return None
    from .pack import load_packed, resolve_dataset_packs

    multi = resolve_dataset_packs(dataset, manifest_rows=manifest_rows)
    return multi if multi is not None else load_packed(dataset, manifest_rows=manifest_rows)


def _require_pack(dataset: str | None, n_rows: int, allow_unpacked: bool) -> None:
    """Ohne Memmap gar nicht erst starten, sobald der Datensatz gross genug zum Packen ist.

    Ein verworfener Pack fiel bisher still auf den Datei-Loader zurueck: die Folds und der
    SWA-Lauf liefen dreifach langsam an einem veralteten Pack vorbei, ohne dass es jemand sah.
    """
    from ..dataset_build import _PACK_MIN_CROPS

    if allow_unpacked or dataset is None or n_rows < _PACK_MIN_CROPS:
        return
    raise ValueError(
        f"'{dataset}' hat keine nutzbare Memmap ({n_rows} Crops) - das Training bricht ab "
        f"statt still auf den Datei-Loader zu fallen. Grund steht in der WARNING darueber. "
        f"Repack: chesslab dataset pack {dataset} - absichtlich ohne Pack: --allow-unpacked.")


def brightness_of(row: dict) -> float:
    """Ausgeschriebenes `null` ist UNGEMESSEN, nicht dunkel — dieselbe Regel wie
    `occlusion.classification_eligible`. `float(None)` starb im Worker, und
    `np.array([None], dtype=float)` wurde zu `nan` und damit still zu einer zu dunklen Zelle.
    """
    value = row.get("brightness")
    return 255.0 if value is None else float(value)


def _occlusion_provenance(occluding: bool, vmax: float | None, dmin: float | None,
                          coverage_weight: str) -> dict:
    """Was der Verlust WIRKLICH maskiert hat — `hard` und `soft` sahen in der config.json gleich aus.

    Unter `soft` liest `occlusion.coverage_weight` `visible_max` nicht; die Zahl dort zu nennen
    behauptete eine Kante, die der Lauf nie hatte (`docs/coverage-weight-2026-09-16.md`).
    """
    if not occluding:
        return {"visible_max": None, "dark_min": None, "coverage_weight": None}
    return {"visible_max": vmax if coverage_weight == "hard" else None,
            "dark_min": dmin, "coverage_weight": coverage_weight}


def _checkpoint_rank(breakdown, auroc):
    """Rank actual weights by visible identity, then occupancy and error confidence."""
    return (breakdown["visible_piece_acc"], breakdown["visible_occupied_acc"],
            auroc if auroc is not None else 0.0)


def _compact_metrics(rec):
    """Remove unmasked or redundant metrics from an occlusion epoch record."""
    redundant = {"val_acc", "val_macro_recall", "val_board_acc", "val_board_acc_tol1",
                 "val_occupied_acc", "val_occupied_board_acc", "val_piece_acc",
                 "val_visible_acc", "val_visible_n", "val_visible_occupied_n",
                 "val_checkpoint_score", "val_conf_right"}
    return {k: v for k, v in rec.items() if k not in redundant}


def _channels_last_batch(x):
    """Change storage order, preserving the board/cell axes and every input value."""
    import torch

    if x.dim() == 5:
        return x.flatten(0, 1).contiguous(memory_format=torch.channels_last).view_as(x)
    return x.contiguous(memory_format=torch.channels_last)


def _device_batches(loader, device, *, channels_last=False):
    """Yield batches with the next host-to-device copy overlapped with model work.

    The copy stream changes scheduling only: tensor values, random draws and batch order are
    unchanged.  This matters for the small cell models, where a synchronous ``.to(device)``
    between batches leaves the accelerator waiting on the pinned-memory thread.
    """
    from .memory import guarded_batches

    if getattr(getattr(loader, "dataset", None), "low_memory", False):
        for x, y in guarded_batches(loader):
            x = x.to(device, non_blocking=False)
            yield (_channels_last_batch(x) if channels_last else x), y.to(device, non_blocking=False)
        return
    if device.type != "cuda":
        for x, y in guarded_batches(loader):
            yield (_channels_last_batch(x) if channels_last else x), y
        return
    import torch
    iterator = iter(guarded_batches(loader))
    stream = torch.cuda.Stream(device=device)
    pending = None

    def preload():
        nonlocal pending
        try:
            cpu_x, cpu_y = next(iterator)
        except StopIteration:
            pending = None
            return
        with torch.cuda.stream(stream):
            x = cpu_x.to(device, non_blocking=True)
            if channels_last:
                x = _channels_last_batch(x)
            pending = (x, cpu_y.to(device, non_blocking=True))

    preload()
    current = torch.cuda.current_stream(device)
    while pending is not None:
        current.wait_stream(stream)
        x, y = pending
        x.record_stream(current)
        y.record_stream(current)
        preload()
        yield x, y


def _conf_mean(vis_conf, wrong: bool) -> float | None:
    """Mittlere Konfidenz auf falschen bzw. richtigen Vorhersagen."""
    trues, preds, conf = vis_conf
    if not conf:
        return None
    sel = [c for t, p, c in zip(trues, preds, conf, strict=False) if (t != p) is wrong]
    return float(sum(sel) / len(sel)) if sel else None


def _occlusion_diagnostics(val: dict, val_rows: list[dict], classes: list[str],
                           visible_max: float) -> dict[str, float | int]:
    """Derive every coverage/visibility metric from the regular validation's predictions."""
    import numpy as np

    cov_true = val["coverage_trues"]
    cov_pred = val["coverage_probs"]
    true_cls = val["trues"]
    pred_cls = val["preds"]
    from .occlusion import CELL_DARK_MIN

    want, hit = cov_true > 0.5, cov_pred > 0.5
    # Zweiter Grund, dieselbe Zelle nicht zu benoten: zu dunkel zum Lesen. Die Metrik haengt an
    # der KONSTANTE, nicht am Lauf-Flag — sonst waeren zwei Laeufe nicht mehr vergleichbar.
    bright = np.array([brightness_of(r) for r in val_rows], dtype=float)
    visible = (cov_true <= visible_max) & (bright >= CELL_DARK_MIN)
    true_occ = true_cls != classes.index("empty")
    pred_occ = pred_cls != classes.index("empty")
    visible_boards: dict[tuple[str, str], bool] = {}
    for row, is_visible, square_ok in zip(
            val_rows, visible.tolist(), (true_occ == pred_occ).tolist(), strict=True):
        if is_visible:
            key = (row["session_id"], str(row["frame"]))
            visible_boards[key] = visible_boards.get(key, True) and square_ok

    occ_tp = int((want & hit).sum())
    occ_want, occ_hit = int(want.sum()), int(hit.sum())
    vis_n = int(visible.sum())
    vis_occ = visible & true_occ
    vis_occ_n = int(vis_occ.sum())
    return {
        "val_coverage_mae": float(np.abs(cov_pred - cov_true).mean()),
        "val_coverage_recall": occ_tp / occ_want if occ_want else 0.0,
        "val_coverage_precision": occ_tp / occ_hit if occ_hit else 0.0,
        "val_visible_acc": float((pred_cls[visible] == true_cls[visible]).mean())
        if vis_n else float("nan"),
        "val_visible_occupied_acc": float((pred_occ[visible] == true_occ[visible]).mean())
        if vis_n else float("nan"),
        # Die Figurenachse, die `CHECKPOINT_WEIGHTS` benotet. `val_piece_acc` daneben zaehlt
        # verdeckte Zellen mit und haengt damit am Verdeckungsanteil des Splits, nicht am Modell.
        "val_visible_piece_acc": float((pred_cls[vis_occ] == true_cls[vis_occ]).mean())
        if vis_occ_n else float("nan"),
        "val_visible_occupied_n": vis_occ_n,
        "val_visible_occupied_board_acc": (
            sum(visible_boards.values()) / len(visible_boards)
            if visible_boards else float("nan")),
        "val_visible_n": vis_n,
    }


# Zwei Laeufe passen neben den Pack, drei nicht: gemessen 2026-08-29 auf 31,8 GB kosteten drei
# Slots 23,9 GB privat, der 11,7-GB-Pack flog damit aus dem Seitencache und die Loader lasen ihn
# mit 642 Seitenfehlern/s von der SSD zurueck. Bei zweien bleibt er warm.
_MAX_LIVE_TRAININGS = 2


def _max_live_trainings() -> int:
    """Die Obergrenze, `CHESSLAB_MAX_TRAININGS` hebt sie bewusst an (groessere Maschine)."""
    raw = os.environ.get("CHESSLAB_MAX_TRAININGS")
    if not raw:
        return _MAX_LIVE_TRAININGS
    try:
        return max(1, int(raw))
    except ValueError:
        print(f"[WARN] CHESSLAB_MAX_TRAININGS={raw!r} ist keine Zahl — bleibe bei "
              f"{_MAX_LIVE_TRAININGS}.")
        return _MAX_LIVE_TRAININGS


def _live_train_locks() -> list[tuple[Path, dict]]:
    """Jeder `heavy*.lock`, den ein LEBENDER Prozess haelt — der Default-Lock und jeder Slot.

    `locks.held_by` meldet den EIGENEN Lock als frei (damit ein Aufrufer sich nicht selbst als
    fremden Halter sieht), darum wird der eigene Datensatz hier direkt gelesen. Veraltete
    Slot-Locks fallen dabei raus, ohne dass jemand sie loeschen muss.
    """
    lock_path = _train_lock_path()
    inbox = lock_path.parent
    live: list[tuple[Path, dict]] = []
    for path in sorted(inbox.glob(f"{config.DATA.heavy_lock.stem}*.lock")):
        info = locks.held_by(path)
        if info is None:
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError, TypeError):
                continue
            if int(raw.get("childPid") or raw.get("pid") or -1) != os.getpid():
                continue                       # fremd und tot -> veraltet, zaehlt nicht mit
            info = raw
        live.append((path, info))
    return live


def started_at(raw) -> float:
    """`startedAt` als Zeitpunkt, nicht als Zeichenkette — beide Schreiber teilen sich die Datei.

    `locks.acquire` schreibt ORTSZEIT ohne Zone (`datetime.now().isoformat()`), die Web-App
    schreibt UTC mit `Z` (`new Date().toISOString()`) in denselben `heavy*.lock`-Satz. Als Text
    verglichen lag die Reihenfolge um den UTC-Versatz daneben, und der spaeteste trat nicht
    zurueck. Ohne Stempel ist ein Lock UNBEKANNT, nicht der aelteste.
    """
    try:
        ts = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return float("inf")
    return ts.timestamp() if ts.tzinfo else ts.astimezone().timestamp()


def _trainings_ahead_of_us() -> list[dict]:
    """Die Laeufe, die vor uns dran waren, falls wir ueber der Grenze liegen — sonst leer.

    Slot-Locks kennen einander nicht: `CHESSLAB_TRAIN_SLOT` gibt jedem Lauf eine EIGENE Datei
    und der Guard in `scripts/sweep_architectures.sh` prueft nur den eigenen Slot. So starteten
    am 2026-08-29 drei Laeufe (C/D/E, 0,8 s auseinander) auf einer Maschine, die zwei traegt.

    Entschieden wird nach `startedAt`, der spaeteste tritt zurueck. Das haelt auch dem Rennen
    stand, das die drei erzeugt haben: jeder schreibt erst seinen Lock und zaehlt dann, also
    liest jeder dieselbe Reihenfolge — und wer zu frueh zaehlt, um den Dritten zu sehen, wird
    von genau diesem Dritten gesehen.
    """
    cap = _max_live_trainings()
    live = _live_train_locks()
    if len(live) <= cap:
        return []
    order = sorted(live, key=lambda item: (started_at(item[1].get("startedAt")),
                                           int(item[1].get("childPid") or item[1].get("pid") or 0)))
    ours = _train_lock_path()
    rank = next((i for i, (path, _) in enumerate(order) if path == ours), None)
    if rank is None or rank < cap:
        return []
    return [info for _, info in order[:cap]]


def _acquire_train_lock(desc: str) -> bool:
    """False if another LIVE training holds the GPU. A stale lock is reclaimed automatically."""
    holder = locks.acquire(_train_lock_path(), "train", desc)
    if holder is not None:
        print(f"[FAIL] {locks.describe(holder)} is already running. The GPU takes one at a time - "
              "stop it first (Training tab 'Stop', Autopilot pause, or kill the process).")
        return False
    ahead = _trainings_ahead_of_us()
    if ahead:
        _release_train_lock()                  # unser eigener Lock, gerade erst geschrieben
        print(f"[FAIL] {len(ahead)} Trainings laufen bereits, das Maximum ist "
              f"{_max_live_trainings()} — der Datensatz-Pack passt sonst nicht mehr neben sie "
              f"in den Speicher:")
        for info in ahead:
            print(f"        {locks.describe(info)}")
        print("       Warten, eines stoppen, oder bewusst CHESSLAB_MAX_TRAININGS hochsetzen.")
        return False
    return True


def _release_train_lock() -> None:
    locks.release(_train_lock_path())


def run_train(backbone: str, epochs: int, batch_size: int, lr: float,
              no_amp: bool, seed: int, out: str | None, patience: int,
              num_workers: int | None = None, norm: str | None = None,
              eval_workers: int = 2, prefetch_factor: int = 2,
              low_memory: bool = True, ram_reserve_gb: float = 0.0,
              per_crop: bool = False, input_repr: str = "rgb",
              dataset: str | None = None, resume: str | None = None,
              continue_run: bool = False, dark_min: float | None = None,
              head: str = "occlusion", scales: list[int] | None = None,
              board_width: int = 128, board_layers: int = 2,
              clahe_clip: float = 0.0, clahe_tile: int = 8,
              clahe_min_mean: float = 0.0, clahe_max_mean: float = 255.0,
              clahe_denoise: str = "off",
              input_size: str | None = None,
              erase_p: float | None = None,
              erase_scale: tuple[float, float] | None = None,
              loss: str = "ce", focal_gamma: float = 2.0,
              class_weight: dict[str, float] | None = None,
              sched: str = "cosine",
              jitter_translate: float | None = None,
              hard_negative_multiplier: float = 1.0,
              split: str | None = None,
              swa: bool = False, swa_lr: float = 5e-4,
              swa_start: float = 0.75, allow_unpacked: bool = False,
              visible_max: float | None = None, weight_cap: float | None = None,
              weight_decay: float | None = None,
              label_smoothing: float = 0.0,
              coverage_weight: str = "hard",
              hflip_p: float | None = None,
              vflip_p: float | None = None,
              rot180_p: float | None = None,
              flip_xor_p: float | None = None,
              invert_p: float | None = None,
              grayscale_p: float | None = None,
              brightness: float | None = None,
              contrast: float | None = None,
              color_jitter: float | None = None,
              blur_sigma_max: float | None = None,
              gamma: tuple[float, float] | None = None,
              balance: str = "none",
              epoch_frac: float = 1.0,
              rot90: bool | None = None,
              batch_aug: bool = False,
              channels_last: bool = False,
              compile_model: bool = False,
              compile_mode: str | None = None,
              compile_batch_aug: bool = False,
              fused_adamw: bool = False,
              aug_scale: float | None = None,
              pretrained: bool | None = None,
              no_empty_cap: bool = False,
              neighbour_p: float | None = None) -> int:
    """`scales`: Multi-Scale-Training (YOLO-Stil). Ist eine Liste wie [64,96,128] gesetzt, wird
    JEDER Batch zufällig auf eine dieser Eingabegrößen skaliert → das size-agnostische Modell
    (AdaptiveAvgPool) lernt alle Auflösungen in EINEM Lauf. So deckt das Training die
    Deployment-Auflösung ab (FixRes) und man kann danach bei beliebiger Größe inferieren.

    Both halves are published: drawing a fresh input size per batch is YOLOv2's multi-scale
    training (docs/references.md#redmon-2016), and the rule that the deployment resolution must
    occur during training is FixRes (docs/references.md#touvron-2019). `lr` is not: see
    docs/references.md §11.
    """
    # GPU precondition (Stage 0 validation path) — mandatory, otherwise abort. This check
    # is torch-free safe and runs BEFORE any torch import, so a missing/broken
    # build is reported clearly here instead of as an ImportError stacktrace.
    check_balance(balance)
    if compile_batch_aug and not batch_aug:
        raise ValueError('--compile-batch-aug requires --batch-aug')
    if compile_mode and not compile_model:
        raise ValueError('--compile-mode requires --compile-model')
    ok, checks = doctor.validate_gpu()
    if not ok:
        print(doctor.render(checks))
        print("[FAIL] No usable ROCm GPU — training aborted (no CPU fallback). "
              "Run `chesslab doctor --gpu` for diagnosis.")
        return 1

    # Single-training GPU guard: refuse to start if another training is live (prevents the
    # concurrent-run out-of-memory crash). Released on exit (normal, exception, or clean stop).
    from .memory import check_ram

    if ram_reserve_gb < 0:
        raise ValueError("ram_reserve_gb must be non-negative")
    check_ram(ram_reserve_gb)
    if low_memory:
        # Was den Speicher rettet, ist der Datei-Lesepfad statt der Memmap (109 statt 1 482 MB je
        # Worker, gemessen) und das fehlende Pinning — NICHT das Abschalten der Worker. Die kosten
        # hier 20,5 von 27,2 s je Epoche. Wer `--num-workers` nennt, bekommt sie also.
        eval_workers = 0
        prefetch_factor = 1
        if num_workers is None:
            num_workers = 0
        print(f"[memory] low-memory mode: direct file reads, {num_workers or 0} loader workers, "
              f"no pinned RAM; reserve {ram_reserve_gb:g} GiB")
    if not _acquire_train_lock(f"{backbone} bs={batch_size} ep={epochs} head={head}"):
        return 1
    if os.environ.get("CHESSLAB_TRAIN_SLOT"):
        print(f"[WARN] Slot {os.environ['CHESSLAB_TRAIN_SLOT']}: eigener Lock, laeuft NEBEN "
              "anderen Trainings und neben dem Autopilot. Speicher im Auge behalten.")
    atexit.register(_release_train_lock)
    # Reduce ROCm/CUDA allocator fragmentation OOM (the allocator can otherwise fail to find a
    # large contiguous block even when plenty of VRAM is free — the earlier crash). Must be set
    # before the first CUDA allocation, i.e. before torch initializes the device.
    os.environ.setdefault("PYTORCH_ALLOC_CONF", "expandable_segments:True")
    # Ebenfalls VOR dem Import: `loader_kwargs` ruft das auch, aber erst wenn OpenBLAS seine
    # Arenen laengst reserviert hat. Die Worker erbten die gekappte Umgebung und standen bei
    # 0,6 GB Commit, der Hauptprozess bei 2,9 — gemessen 2026-08-29, Kappung wirkt nur vorher.
    config.cap_blas_threads()

    import numpy as np
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, WeightedRandomSampler

    from .boardnet import CELLS as BOARD_CELLS
    from .engine import evaluate_dataset, get_device
    from .model import build_model
    from .torch_data import (
        INPUT_REPRS,
        PackedBoardDataset,
        PackedSquareDataset,
        SquareDataset,
        board_collate,
        build_transform,
        class_weights_tensor,
    )

    if input_repr not in INPUT_REPRS:
        print(f"[FAIL] unknown --input-repr {input_repr!r} (one of {sorted(INPUT_REPRS)}).")
        return 1
    if per_crop and input_repr != "rgb":
        print("[FAIL] --crop-norm per-crop and --input-repr are two different answers to the same "
              "question (how to make a dark square legible) — pick one.")
        return 1
    in_chans = INPUT_REPRS[input_repr]

    torch.manual_seed(seed)
    np.random.seed(seed)
    # Die Augmentierung zieht aus `random`, nicht aus torch oder numpy. In Workern seedet PyTorch
    # das selbst; bei `--num-workers 0` niemand — gemessen 2026-08-25, dort waren zwei Laeufe mit
    # gleichem Seed pixelverschieden bei identischer Batch-Reihenfolge.
    random.seed(seed)

    # Held apart from the local `split`, which is REBOUND to the loaded policy dict further down —
    # the collision wrote that dict into config.json and left the guard reading a dict as a path.
    split_file = split
    if dataset:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(dataset)
        manifest_path = dd / "manifest.jsonl"
        # One packed corpus, several splits over it (cross-validation folds): the memmap is
        # 9 GB and packing it per fold copies the same crops four times. `occluded_model.
        # trained_on` reads the name back out of config.json, so the circularity guard follows.
        split_path = dd / (split_file or "split.json")
        # Ein gepinnter Schnitt existiert genau dann, wenn der voreingestellte NICHT gemessen
        # werden soll: `real13-mix-v6-80/split.json` traegt als Val `21-29-35` — die Aufnahme
        # ohne einen einzigen weissen Springer. Wer `--split` vergisst, misst blind.
        pinned = dd / "split-pin.json"
        if split_file is None and pinned.exists():
            print(f"[FAIL] '{dataset}' hat einen gepinnten Schnitt ({pinned.name}), aber --split "
                  "nennt ihn nicht. Entweder `--split split-pin.json` mitgeben oder ausdruecklich "
                  "`--split split.json` sagen.")
            return 1
        if not manifest_path.exists() or not split_path.exists():
            print(f"[FAIL] Dataset '{dataset}' not built ({dd}). First build it in the Datasets tab "
                  "(`chesslab dataset build`), then train.")
            return 1
    else:
        manifest_path = config.DATA.crop_pool / "manifest.jsonl"
        split_path = config.DATA.reports / "split.json"
        if not manifest_path.exists():
            print(f"[FAIL] No manifest ({manifest_path}). First collect data and slice "
                  "(`chesslab slice`), then train.")
            return 1
        if not split_path.exists():
            print(f"[FAIL] No split ({split_path}). First run `chesslab split` "
                  "(train/val/test per session + class balancing), then train.")
            return 1

    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    classes = split["classes"]
    # `occlusion` shares the final linear layer and reads its LAST unit as the coverage logit —
    # one output tensor, so the exported graph keeps its shape (`evaluate.ONNX_BATCH`).
    occluding = head == "occlusion"
    # The FILE's size and the MODEL's size stopped being the same thing when the crop store went
    # to 128 px for the label view (2026-08-17). Reading the manifest silently made the store
    # decide the recipe; `input_size` says it out loud, and `build_transform` does the scaling in
    # memory, so one store serves every deployment resolution.
    from ..labeling import parse_out_size

    out_size = parse_out_size(input_size) if input_size else None
    # A pack built with `--pack-size` already holds the model's resolution, and it is what the
    # loader will actually serve — reading the manifest instead would scale 80 px pixels back up
    # to the 128 px the FILES are, which is worse than either.
    src = "--input-size"
    from .packs import packed_shape

    packed = _load_training_pack(dataset, manifest)
    if out_size is None:
        if packed is not None:
            _, ph, pw = packed_shape(packed)
            out_size, src = (pw, ph), "the pack"
    for r in manifest:
        out_size, src = (out_size, src) if out_size else (tuple(r["out_size"]), "the manifest")
        print(f"[size] training at {out_size[0]}x{out_size[1]} from {r['out_size'][0]}x"
              f"{r['out_size'][1]} crops (from {src})")
        break
    if out_size is None:
        print("[FAIL] empty manifest.")
        return 1

    # Balancing ONLY applied to train (policy is in split.json); val/test stay full.
    from ..dataset import load_priority_paths, subsample_classes

    ts = split.get("train_subsample") or {}
    # The mined hard negatives have to be protected HERE too, not only in the build: the
    # dataset's manifest holds the uncapped rows, so this re-draw is what actually decides
    # which `empty` crops a batch ever sees.
    priority_paths = load_priority_paths()
    if priority_paths:
        print(f"[i] hard-empty keep list: {len(priority_paths)} crops protected from the empty cap")
    if neighbour_p:
        print(f"[aug] Nachbar-Uebersprung auf leeren Zellen: p={neighbour_p:g} "
              f"(Streifen {config.AUGMENT.neighbour_frac})")
    board_mode = backbone.startswith(("board:", "boardattn:"))
    if board_mode and (scales or head != "occlusion"):
        print("[FAIL] board:-Backbones brauchen --head occlusion und vertragen kein --scales: "
              "der Batch traegt eine Zellachse, die beides nicht kennt.")
        return 1
    if no_empty_cap and ts.get("max_empty_ratio"):
        # Der Brett-Arm MUSS ohne Kappe laufen; ein Zell-Arm mit Kappe saehe dann einen anderen
        # Datenpool. Fuer einen gepaarten Sweep gehoert der Schalter auf beide Seiten.
        print("[i] --no-empty-cap: die empty-Kappe des Splits bleibt aus.")
        ts = {**ts, "max_empty_ratio": None}
    if board_mode and ts.get("max_empty_ratio"):
        # Aus einem Brett laesst sich keine Zelle wegwerfen. Das Ausduennen bleibt hier also aus,
        # und `empty` wird ueber die Verlustgewichte ausgeglichen statt ueber den Sampler.
        print("[board] --max-empty-ratio wird ignoriert: der Brettkopf braucht alle 64 Zellen.")
        ts = {**ts, "max_empty_ratio": None}
    train_rows = subsample_classes(
        filter_rows_by_split(manifest, split, "train"),
        max_empty_ratio=ts.get("max_empty_ratio"),
        max_class_ratio=ts.get("max_class_ratio"),
        seed=ts.get("seed", seed),
        priority_paths=priority_paths,
    )
    val_rows = filter_rows_by_split(manifest, split, "val")
    if not train_rows:
        hint = ("rebuild the dataset with more sessions" if dataset
                else "re-slice and run `chesslab split` again")
        print("[FAIL] train split is empty — too few sessions. Train/val/test are separated per "
              f"session (to prevent data leakage); record at least 2-3 sessions and {hint}.")
        return 1
    from collections import Counter as _Counter

    print(f"[OK] train balanced: {len(train_rows)} crops, distribution: "
          + ", ".join(f"{k}={v}" for k, v in sorted(_Counter(r['label'] for r in train_rows).items())))

    # Augmentation policy — optionally override the anti-shortcut knobs per run (ablation/tuning).
    policy = config.AUGMENT
    if aug_scale is not None:
        # EIN Regler ueber alle Staerken. Sie sind samt und sonders von Hand gesetzt und nie
        # abgetastet worden (`config.AugPolicy`), sie kosten 308 ms je Batch und schieben 11 % der
        # Trainingsbilder aus dem Helligkeitsbereich, den die Kamera je liefert — und verhindern
        # das Auswendiglernen trotzdem nicht (99,93 % auf Train). Also abtastbar machen.
        from dataclasses import replace as _replace

        a = aug_scale
        policy = _replace(
            policy,
            brightness=policy.brightness * a, contrast=policy.contrast * a,
            color_jitter=policy.color_jitter * a, noise_std=policy.noise_std * a,
            jitter_translate=policy.jitter_translate * a, jitter_scale=policy.jitter_scale * a,
            erase_p=policy.erase_p * a,
            # Gegen die Untergrenze von GaussianBlur, nicht gegen null: sigma=(0.1, 0)
            # ist kein gueltiges Intervall und bricht den Aufbau.
            blur_sigma_max=0.1 + (policy.blur_sigma_max - 0.1) * a,
            gamma=(1.0 - (1.0 - policy.gamma[0]) * a, 1.0 + (policy.gamma[1] - 1.0) * a),
        )
        print(f"[aug] alle Staerken x{a:g}: brightness {policy.brightness:.3f}, "
              f"gamma {policy.gamma[0]:.2f}-{policy.gamma[1]:.2f}, erase {policy.erase_p:.3f}")
    if (erase_p is not None or erase_scale is not None or jitter_translate is not None
            or hflip_p is not None or vflip_p is not None
            or rot180_p is not None or flip_xor_p is not None
            or invert_p is not None or grayscale_p is not None
            or brightness is not None or gamma is not None
            or contrast is not None or color_jitter is not None
            or blur_sigma_max is not None):
        from dataclasses import replace
        policy = replace(policy, **({"erase_p": erase_p} if erase_p is not None else {}),
                         **({"erase_scale": erase_scale}
                            if erase_scale is not None else {}),
                         **({"jitter_translate": jitter_translate}
                            if jitter_translate is not None else {}),
                         **({"hflip_p": hflip_p} if hflip_p is not None else {}),
                         **({"vflip_p": vflip_p} if vflip_p is not None else {}),
                         **({"rot180_p": rot180_p} if rot180_p is not None else {}),
                         **({"flip_xor_p": flip_xor_p}
                            if flip_xor_p is not None else {}),
                         **({"invert_p": invert_p} if invert_p is not None else {}),
                         **({"grayscale_p": grayscale_p}
                            if grayscale_p is not None else {}),
                         **({"brightness": brightness} if brightness is not None else {}),
                         **({"contrast": contrast} if contrast is not None else {}),
                         **({"color_jitter": color_jitter} if color_jitter is not None else {}),
                         **({"blur_sigma_max": blur_sigma_max}
                            if blur_sigma_max is not None else {}),
                         **({"gamma": gamma} if gamma is not None else {}))
        print(f"[aug] override erase_p={policy.erase_p} "
              f"jitter_translate={policy.jitter_translate} "
              f"brightness={policy.brightness} contrast={policy.contrast} "
              f"color_jitter={policy.color_jitter} blur={policy.blur_sigma_max} "
              f"gamma={policy.gamma}")
    # Packed memmap loader (training.pack): if the dataset was `chesslab dataset pack`ed, read
    # crops from ONE memmap instead of 1M per-item Image.open (the I/O bottleneck).
    # Fused datasets (dataset build-synth) have NO crop files at all — manifest paths are virtual
    # mm:// keys into the memmap. The per-PNG loader would crash on the first batch there.
    fused = bool(train_rows) and str(train_rows[0].get("path", "")).startswith("mm://")
    if fused and packed is None:
        print(f"[FAIL] dataset '{dataset}' has mm:// paths — a fused synth build or a pack-built "
              "dataset — but no usable memmap: re-run `chesslab dataset build-synth`, or check "
              "that dataset.yaml still names its packs under data/packs/.")
        return 1
    # Rotation aug runs on-the-fly (torch_data._RandomRot90) when the dataset was built with
    # non-trivial `rotations` — the build no longer materializes rotated copies (4x disk/memmap).
    want_rot = rot90
    rot90 = False
    if dataset:
        from ..dataset_build import _read_yaml, dataset_dir
        ds_rot = _read_yaml(dataset_dir(dataset) / "dataset.yaml").get("rotations") or []
        rot90 = any(int(d) % 360 for d in ds_rot)
        if rot90:
            print("[aug] on-the-fly 90-degree rotations (dataset built with rotations="
                  f"{list(ds_rot)})")
    if want_rot is not None and want_rot != rot90:
        # Am Lauf statt am Build: jeder Datensatz steht heute auf rotations=[0], und die Frage
        # ist eine Rezeptfrage. Auf einem achsenparallelen Zellcrop bleibt bei Vielfachen von 90°
        # die Feldgeometrie gueltig — und die perspektivische Neigung dreht mit: eine Figur der
        # Reihe 8 neigt nach oben, um 90° gedreht nach rechts, also wie eine auf der a-Linie.
        # Genau die Positionsabhaengigkeit, an der die Grundreihen scheitern.
        rot90 = want_rot
        print(f"[aug] 90-Grad-Drehungen per Flag {'AN' if rot90 else 'AUS'}")
    # Photometrie und Cutout wandern als EIN Batch aufs Geraet (`training/batch_aug.py`); der
    # Loader baut sie dann gar nicht erst, weil ihre Staerken auf 0 stehen.
    photometric = None
    if batch_aug:
        from dataclasses import replace as _replace

        from .batch_aug import BatchGeometry, BatchPhotometric

        if per_crop:
            print('[FAIL] --batch-aug und --crop-norm zusammen: die Normalisierung je Crop '
                  'ist nicht umkehrbar, also kaeme die Photometrie auf den falschen Werten an.')
            return 1
        if input_repr != "rgb":
            print(f"[FAIL] --batch-aug braucht --input-repr rgb, nicht {input_repr!r}: die "
                  "Kanalableitung sitzt hinter der Normalisierung, die das Geraet uebernimmt.")
            return 1
        photometric = BatchPhotometric(policy, config.NORMALIZE_MEAN, config.NORMALIZE_STD,
                                       from_uint8=True, geometry=BatchGeometry(policy))
        if compile_batch_aug:
            photometric.compile()
            print('[batch-aug] compiled arithmetic; eager random draws preserved')
        policy = _replace(policy, brightness=0.0, contrast=0.0, color_jitter=0.0,
                          gamma=(1.0, 1.0), blur_sigma_max=0.1, erase_p=0.0, noise_std=0.0,
                          jitter_translate=0.0, jitter_scale=0.0, hflip_p=0.0, vflip_p=0.0,
                          rot180_p=0.0, flip_xor_p=0.0)
        print('[batch-aug] Photometrie, Affine, Flips und Cutout laufen auf dem Geraet — in '
              'derselben Reihenfolge wie im Loader')

    # Ein gebackener Pack traegt CLAHE schon in den Pixeln (`training/pack_bake.py`). Der LOADER
    # laesst den Operator dann aus, `config.json` behaelt ihn trotzdem — das Serving bekommt rohe
    # Kamerabilder und muss ihn selbst rechnen.
    from .pack_bake import baked_of, skip_baked
    loader_clip = clahe_clip
    baked = baked_of(dataset) if dataset else None
    if baked and packed is not None:
        want = {"clip": clahe_clip, "tile": clahe_tile, "min_mean": clahe_min_mean,
                "max_mean": clahe_max_mean, "denoise": clahe_denoise}
        if skip_baked(baked, want, out_size, packed_shape(packed)[1:]):
            loader_clip = 0.0
            print(f"[bake] CLAHE steckt im Pack ({baked['from']}) — Loader rechnet ihn nicht, "
                  "config.json behaelt ihn fuers Serving")
    tf_kw = {"policy": policy, "per_crop": per_crop, "input_repr": input_repr,
             "clahe_clip": loader_clip, "clahe_tile": clahe_tile,
             "clahe_min_mean": clahe_min_mean, "clahe_max_mean": clahe_max_mean,
             "clahe_denoise": clahe_denoise}
    train_tf = build_transform(out_size, train=True, rot90=rot90,
                               to_uint8=photometric is not None, **tf_kw)
    val_tf = build_transform(out_size, train=False, **tf_kw)
    if packed is not None:
        n, h, w = packed_shape(packed)
        print(f"[pack] fast memmap loader: {n} crops, {n * h * w * 3 / 1e9:.1f} GB")
        if board_mode:
            train_ds = PackedBoardDataset(train_rows, classes, train_tf, packed)
            val_ds = PackedBoardDataset(val_rows, classes, val_tf, packed)
            print(f"[board] {len(train_ds)} Trainings- und {len(val_ds)} Val-Bretter, "
                  f"{train_ds.n_dropped + val_ds.n_dropped} unvollstaendige verworfen")
        else:
            train_ds = PackedSquareDataset(train_rows, classes, train_tf, packed,
                                           with_coverage=occluding, policy=policy,
                                           neighbour_p=neighbour_p or 0.0)
            val_ds = PackedSquareDataset(val_rows, classes, val_tf, packed,
                                         with_coverage=occluding)
    else:
        _require_pack(dataset, len(train_rows) + len(val_rows), allow_unpacked)
        train_ds = SquareDataset(train_rows, classes, train_tf, with_coverage=occluding,
                                 augment=True, policy=policy)
        val_ds = SquareDataset(val_rows, classes, val_tf, with_coverage=occluding)

    for ds in (train_ds, val_ds):
        ds.low_memory = low_memory
        ds.ram_reserve_gb = ram_reserve_gb
    check_ram(ram_reserve_gb)

    # BatchNorm is broken on ROCm-Windows (MIOpen/HIPRTC) -> default GroupNorm there.
    # batchnorm everywhere, Windows included. The groupnorm-on-Windows default was a workaround
    # for a MIOpen crash on MobileNet batch-norm; all 10 shipped runs are MobileNet + batchnorm on
    # this machine, so the workaround outlived the bug it dodged.
    norm_eff = norm or "batchnorm"
    device = get_device(require_gpu=True)
    # Ohne den Schalter misst ein Breiten-Sweep das ImageNet-Vortraining: `_035` bringt als
    # einziges Backbone KEINE Gewichte mit, `_050` und Breite 1,0 schon.
    want_pre = (backbone != "smallcnn") if pretrained is None else pretrained
    model = build_model(backbone, len(classes) + occluding, pretrained=want_pre,
                        norm=norm_eff, head="combined", in_chans=in_chans,
                        board_width=board_width, board_layers=board_layers).to(device)
    if channels_last:
        model.to(memory_format=torch.channels_last)
        print("[layout] channels_last model weights and input batches")
    if compile_model:
        # Fuses PrimitiveBatchNorm2d's hand-derived arithmetic back into single kernels, which is
        # where ROCm-Windows loses its throughput. Needs Triton — the pinned stack has none and
        # fails loudly here rather than falling back (docs/training-stack-spike.md).
        # `reduce-overhead` replays the whole step as ONE launch instead of 463 dispatches, which
        # is what the remaining fixed cost per step is made of. It captures CUDA graphs, so the
        # returned tensors are reused on the next replay — read the loss before stepping again.
        model.forward = torch.compile(model.forward, fullgraph=True,
                                      **({"mode": compile_mode} if compile_mode else {}))
        print(f"[layout] torch.compile on the model forward, mode={compile_mode or 'default'}")
    print(f"[OK] Backbone {backbone}, norm={norm_eff}, head={head}, "
          f"input_repr={input_repr} ({in_chans}ch)")

        # Continue training (warm start): load weights from a previous run. Matching tensors
    # are adopted, non-matching ones (e.g. the classification head with changed class count,
    # such as after adding `occluded`) are skipped -> the body transfers, the head learns anew.
    resumed_from = None
    if resume:
        from .model import adopt_weights, checkpoint_of

        rd = config.DATA.models / resume
        ckpt = checkpoint_of(rd)
        if not (rd / "config.json").exists() or ckpt is None:
            print(f"[FAIL] Resume run '{resume}' incomplete or not found ({rd}).")
            return 1
        rcfg = json.loads((rd / "config.json").read_text(encoding="utf-8"))
        if rcfg.get("backbone") != backbone:
            print(f"[FAIL] Resume backbone {rcfg.get('backbone')!r} != {backbone!r} — choose the same backbone.")
            return 1
        keep, skipped = adopt_weights(model, ckpt, device)
        resumed_from = resume
        print(f"[OK] Resumed from '{resume}': {keep} tensors adopted"
              + (f", {skipped} skipped (head with changed class count)" if skipped else ""))
        if not keep:
            print("[FAIL] warm start adopted 0 tensors — the checkpoint does not fit this model. "
                  "Train without --resume, or fix the backbone/head combination.")
            return 1

    # Per-class weight override on top of split.json's inverse-frequency weights. The
    # occupancy sweep (specs/18) nudges `occupied` by 2-3x — a COST correction on a mild
    # frequency imbalance, deliberately NOT the observed 39x miss/phantom error ratio,
    # which would only teach the model to always guess occupied.
    if class_weight:
        unknown = [c for c in class_weight if c not in classes]
        if unknown:
            print(f"[FAIL] --class-weight names classes not in this dataset: {unknown} "
                  f"(dataset classes: {classes}).")
            return 1
    # Die Gewichte in split.json zaehlen ALLE Zellen, der Occlusion-Verlust sieht nur die
    # sichtbaren. Verdeckung ist nicht gleich verteilt — weiss 11-15 %, schwarz 2-6 %, weil die
    # Hand immer von der weissen Seite kommt —, also stimmt die angenommene Haeufigkeit nicht.
    # Hier statt im Split, damit split.json unangetastet bleibt (es ist die Reproduzierbarkeit).
    if occluding:
        from ..dataset import compute_class_weights
        from .occlusion import PIECE_VISIBLE_MAX
        from .torch_data import coverage_of

        # Vierte Stelle derselben Regel: ein ausgeschriebenes `null` warf hier `TypeError` kurz
        # vor dem Training — und diese Zaehlung IST das Rezept (die Gewichte in `split.json`).
        vis_counts: dict[str, int] = {}
        for r in train_rows:
            if coverage_of(r) <= PIECE_VISIBLE_MAX:
                vis_counts[r["label"]] = vis_counts.get(r["label"], 0) + 1
        split = {**split, "class_weights": compute_class_weights(vis_counts, classes, weight_cap)}
        if weight_cap is not None:
            print(f"[loss] Gewichte auf {weight_cap:g}x gekappt"
                  + (" — das ist UNGEWICHTET." if weight_cap == 1 else " (geglaettet, nicht beschnitten)."))
    # ZULETZT, sonst umsonst: der Occlusion-Zweig oben schreibt `class_weights` komplett neu.
    # Bis 2026-08-27 stand das Setzen davor und wurde bei JEDEM Occlusion-Lauf still verworfen —
    # also bei allen. Ein gezieltes Gewicht ist etwas anderes als der pauschale Ausgleich: es
    # verbietet EINEN Tausch, den der Verlust sonst belohnt (bB -> bP kostet weniger, weil Bauern
    # haeufiger sind).
    if class_weight:
        cw = dict(split.get("class_weights", {}))
        cw.update({c: float(v) for c, v in class_weight.items()})
        split = {**split, "class_weights": cw}
        print("[loss] class-weight override: "
              + ", ".join(f"{c}={class_weight[c]}" for c in sorted(class_weight)))
    weights = class_weights_tensor(split, classes).to(device)
    # VOR dem Kopf-Zweig: unter `--head occlusion` sprang die Pruefung ganz aus, also lief
    # `--loss banana` widerspruchslos durch und landete als Provenienz in der config.json.
    if loss not in ("ce", "focal"):
        print(f"[FAIL] unknown --loss {loss!r} (ce | focal).")
        return 1
    if occluding and loss != "ce":
        print(f"[FAIL] --head occlusion bringt seinen eigenen Verlust mit; --loss {loss!r} "
              f"waere wirkungslos und stuende trotzdem in der config.json.")
        return 1
    if occluding:
        from .occlusion import CELL_DARK_MIN, PIECE_VISIBLE_MAX, OcclusionLoss

        # Nur die TRAININGS-Maske. Die Metriken bleiben auf PIECE_VISIBLE_MAX, sonst wuerden
        # zwei Laeufe auf verschiedenen Zellmengen benotet und waeren nicht vergleichbar.
        vmax = PIECE_VISIBLE_MAX if visible_max is None else visible_max
        dmin = CELL_DARK_MIN if dark_min is None else dark_min
        criterion = OcclusionLoss(weights, visible_max=vmax, dark_min=dmin,
                                  label_smoothing=label_smoothing,
                                  coverage_weight_mode=coverage_weight).to(device)
        if coverage_weight != "hard":
            from .occlusion import COVERAGE_ZERO_AT

            print(f"[occ] Klassen-Gewicht je Zelle: {coverage_weight} — die harte Kante bei "
                  f"{vmax:g} faellt weg, Gewicht 0 erst ab {COVERAGE_ZERO_AT:g} "
                  "(docs/coverage-weight-2026-09-16.md)")
        if dmin:
            dark = sum(brightness_of(r) < dmin for r in train_rows)
            print(f"[occ] Trainingsmaske zusaetzlich bei Helligkeit < {dmin:g}: "
                  f"{dark} von {len(train_rows)} Zellen ({dark/max(len(train_rows),1)*100:.1f} %) "
                  f"zaehlen im KLASSENverlust nicht mehr — der Coverage-Kopf lernt sie weiter.")
        if visible_max is not None and coverage_weight == "hard":
            print(f"[occ] Trainingsmaske bei coverage <= {vmax:g} "
                  f"(Bewertung weiterhin bei {PIECE_VISIBLE_MAX:g})")
        elif visible_max is not None:
            print(f"[WARN] --visible-max {visible_max:g} ist unter --coverage-weight "
                  f"{coverage_weight} WIRKUNGSLOS — die Kurve liest die Kante nicht. "
                  f"Die config.json traegt darum visible_max: null.")
    elif loss == "ce":
        criterion = nn.CrossEntropyLoss(weight=weights)
    elif loss == "focal":
        from .losses import FocalLoss
        if head != "combined":
            print(f"[FAIL] --loss focal needs --head combined (logits); head={head!r} returns "
                  "log-probs and would be soft-maxed twice.")
            return 1
        criterion = FocalLoss(weight=weights, gamma=focal_gamma).to(device)
    print(f"[loss] {loss}" + (f" gamma={focal_gamma}" if loss == "focal" else "")
          + f", effective weights: {dict(zip(classes, [round(float(w), 4) for w in weights.tolist()], strict=True))}")
    # AdamW = Adam with decoupled weight decay (docs/references.md#loshchilov-2017). Bis 2026-08-26
    # lief jeder Lauf auf PyTorchs Default 0,01 — bei train_loss 0,03 gegen val_loss 1,33
    # (`docs/measurement-floor.md`) ist das der erste Knopf, nicht der letzte.
    wd = 0.01 if weight_decay is None else weight_decay
    # `fused` also takes the GradScaler off its per-step `found_inf.item()`, and THAT is the
    # expensive half: without it every step drains the queue before the next can be filled
    # (20,8 -> 11,9 ms on the spike stack, model arithmetic bit-identical).
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=wd,
                                  **({"fused": True} if fused_adamw else {}))
    if weight_decay is not None or label_smoothing:
        print(f"[reg] weight_decay={wd} label_smoothing={label_smoothing}")
    # Cosine annealing without restarts; the schedule comes from SGDR
    # (docs/references.md#loshchilov-2016), where the cosine runs over the period T_i.
    #
    # `T_max=epochs` COUPLES THE SCHEDULE TO THE RUN LENGTH. "The same run but longer" is not the
    # same run: a 60-epoch and a 200-epoch run follow different learning-rate trajectories from
    # their first batch, and a plateau in the last epochs may be the cosine floor rather than
    # convergence. Two consequences worth stating: runs of different lengths are not directly
    # comparable, and `--patience` interacts with this, because early stopping cuts a schedule
    # that was planned for `epochs`.
    # `--sched none` pins the rate instead, which is the only way to ask "does LONGER training
    # help?" with one variable. Under a cosine tied to `epochs`, a 200-epoch run is not a
    # 60-epoch run continued: the period stretches with it, so more steps and more time at a high
    # rate move together and neither can be attributed. Default is unchanged.
    if sched == "none":
        scheduler = torch.optim.lr_scheduler.ConstantLR(optimizer, factor=1.0, total_iters=0)
        print(f"[sched] constant lr {lr:g} — no annealing, so epoch count is the only variable")
    else:
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    amp = not no_amp
    # Loss scaling for half-precision gradients (docs/references.md#micikevicius-2017).
    scaler = torch.amp.GradScaler("cuda", enabled=amp)

    # DataLoader-Tuning: der Crop-Datensatz ist I/O-gebunden (Mio. kleine PNGs). Parallele Worker
    # sind der größte Hebel; auf Windows empirisch bis 8 stabil verifiziert (kein Deadlock) → Default
    # 8 statt 0. persistent_workers spart das Neu-Spawnen je Epoche (teuer bei Windows-spawn),
    # prefetch_factor hält Batches vor. Mit --num-workers 0 überschreibbar, falls doch Probleme.
    # Mit `--batch-aug` kostet der Feed 76 statt 985 us je Crop, und 2 Worker liegen damit unter
    # dem GPU-Budget (kalt 79 us gegen 127). Die 8 des Defaults waeren dann reine Verschwendung —
    # und Worker sind die Stellschraube, an der die Speicher-Abstuerze hingen (`docs/batch-aug.md`).
    lean_default = BATCH_AUG_WORKERS if photometric is not None else config.DEFAULT_NUM_WORKERS
    nw = num_workers if num_workers is not None else lean_default
    if num_workers is None and photometric is not None:
        print(f"[batch-aug] {nw} Loader-Worker statt {config.DEFAULT_NUM_WORKERS} "
              "— der Feed liegt unter dem GPU-Budget (--num-workers ueberschreibt das)")
    if nw < 0 or eval_workers < 0 or prefetch_factor < 1:
        raise ValueError("workers must be non-negative and prefetch_factor must be positive")
    loader_kw = {"batch_size": batch_size,
                 **config.loader_kwargs(nw, prefetch_factor=prefetch_factor, pin_memory=not low_memory)}
    eval_batch = batch_size
    if board_mode:
        # `--batch-size` zaehlt jetzt BRETTER, also 64x so viele Crops. 4 Bretter = 256 Crops.
        loader_kw = {**loader_kw, "batch_size": max(1, batch_size // BOARD_CELLS),
                     "collate_fn": board_collate}
        # Die Auswertung baut ihren EIGENEN Loader und muss dieselbe Umrechnung sehen. Ohne sie
        # las sie 256 BRETTER statt 256 Crops — 3,2 GB je Charge, was den Lauf am 28.08. auf
        # 10,9 GB Commit trieb, waehrend der Per-Zell-Arm bei 2,5 GB stand.
        eval_batch = loader_kw["batch_size"]
        print(f"[board] batch_size {batch_size} Crops = {loader_kw['batch_size']} Bretter je Schritt")
    sampler = None
    # Eine SITUATION ist (Session, Feld, Klasse) — dieselbe Figur auf demselben Feld, ueber die
    # Frames hinweg. Der Korpus traegt 1 643 davon auf 184 735 Crops, und die Gruppen sind 13,6x
    # ungleich (p10 18, p90 245): die groessten 10 % holen 30 % aller Ziehungen. `wK` kennt 22
    # Platzierungen, jede 131-fach je Epoche. Gleiche Ziehungsmasse je Situation laesst die
    # Lichtvariation der Frames drin und nimmt nur die Schieflage raus.
    situation_w = None
    if balance != "none":
        import collections

        keys = [(r["session_id"], r["square"], r["label"]) for r in train_rows]
        groups = collections.Counter(keys)
        # Situation: jede (Session, Feld, Klasse) gleich oft, egal wie viele Frames sie traegt.
        situation_w = [1.0 / groups[k] for k in keys]
        if balance == "piece":
            # Wie `class`, aber `empty` behaelt seinen natuerlichen Anteil. Grund: `class` drueckt
            # empty von 54 % auf 7,7 %, und empty-Zellen sind der Hauptlieferant sauberer
            # NEGATIVBEISPIELE fuer den Verdeckungskopf — dessen Precision fiel dadurch von 0,944
            # auf 0,680 (2026-08-26). Die zwoelf Figurenklassen teilen sich den Rest zu gleichen
            # Teilen, empty bleibt wie es ist.
            per_piece: dict[str, int] = collections.Counter()
            for _sid, _sq, lab in set(keys):
                if lab != "empty":
                    per_piece[lab] += 1
            n_empty = sum(1 for k in keys if k[2] == "empty")
            situation_w = [w if k[2] == "empty" else w / per_piece[k[2]]
                           for w, k in zip(situation_w, keys, strict=True)]
            # empty auf seinen Crop-Anteil normieren, damit `piece` nur die Figuren umverteilt.
            share = n_empty / len(keys)
            w_empty = sum(w for w, k in zip(situation_w, keys, strict=True) if k[2] == "empty")
            w_piece = sum(w for w, k in zip(situation_w, keys, strict=True) if k[2] != "empty")
            scale = (share / (1 - share)) * w_piece / max(w_empty, 1e-12)
            situation_w = [w * scale if k[2] == "empty" else w
                           for w, k in zip(situation_w, keys, strict=True)]
        if balance == "class":
            # Der Ausgleich im SAMPLER statt im Verlust: jede Klasse gleich oft, darunter jede
            # Situation gleich oft. Gewichtete CE skaliert Gradienten und verzerrt damit die
            # Schrittweite; ein Sampler aendert nur, was im Batch liegt. Gehoert mit
            # `--weight-cap 1` zusammen, sonst wird zweimal ausgeglichen.
            per_class: dict[str, int] = collections.Counter()
            for _sid, _sq, lab in set(keys):
                per_class[lab] += 1
            situation_w = [w / per_class[k[2]] for w, k in zip(situation_w, keys, strict=True)]
        if balance == "session":
            # Und darueber jede SESSION gleich oft. Val ist eine zurueckgehaltene Session, also
            # ist Licht und Kamera die Achse, auf der generalisiert werden muss; heute streuen
            # die Anteile 18,8x (0,8 % bis 15,6 %), mit Situations-Balance noch 2,0x.
            per_session: dict[str, int] = collections.Counter()
            for sid, _sq, _lab in set(keys):
                per_session[sid] += 1
            situation_w = [w / per_session[k[0]] for w, k in zip(situation_w, keys, strict=True)]
        print(f"[sampler] balance={balance}: {len(groups)} Situationen aus "
              f"{len({k[0] for k in keys})} Sessions, Gruppen "
              f"{min(groups.values())}-{max(groups.values())} Crops")
    if hard_negative_multiplier != 1.0:
        if hard_negative_multiplier < 1.0:
            print("[FAIL] --hard-negative-multiplier must be at least 1.")
            return 1
        if not priority_paths:
            print("[FAIL] --hard-negative-multiplier needs data/reports/hard_empty.jsonl.")
            return 1
        base_w = [hard_negative_multiplier if row.get("path") in priority_paths else 1.0
                  for row in train_rows]
        if situation_w is not None:
            base_w = [a * b for a, b in zip(base_w, situation_w, strict=True)]
        sample_weights = torch.tensor(base_w, dtype=torch.double)
        hard_count = sum(row.get("path") in priority_paths for row in train_rows)
        print(f"[hard-negative] {hard_count} protected crops sampled at {hard_negative_multiplier:g}x weight")
    elif situation_w is not None:
        sample_weights = torch.tensor(situation_w, dtype=torch.double)
    if epoch_frac != 1.0 and situation_w is None and hard_negative_multiplier == 1.0:
        # Ohne Balance und ohne Hard Negatives gibt es noch keinen Sampler — einer mit
        # Gleichgewichten zieht dieselbe Verteilung, nur weniger davon.
        sample_weights = torch.ones(len(train_rows), dtype=torch.double)
        situation_w = []
    if hard_negative_multiplier != 1.0 or situation_w is not None:
        # `num_samples` war immer len(train_rows) — Konvention, nicht Notwendigkeit. Der Korpus
        # traegt 1 643 Situationen auf 184 735 Crops; wer sie gleichmaessig zieht, braucht fuer
        # eine Epoche nicht jede Kopie. Die Cosine haengt an --epochs, nicht an der Epochengroesse,
        # also ist das echte Wanduhrzeit und keine Verkuerzung des Zeitplans.
        n_draw = max(1, int(round(epoch_frac * len(train_rows))))
        generator = torch.Generator().manual_seed(seed)
        sampler = WeightedRandomSampler(sample_weights, n_draw, replacement=True,
                                        generator=generator)
        if epoch_frac != 1.0:
            print(f"[sampler] {n_draw} Ziehungen je Epoche statt {len(train_rows)} "
                  f"({epoch_frac:g}x)")
    # Alles, was Zeilen gegen Vorhersagen haelt, muss die Reihenfolge des DATENSATZES nehmen:
    # der Brettdatensatz behaelt nur vollstaendige Bretter und sortiert sie nach Feld.
    score_rows = getattr(val_ds, "rows", None) or val_rows

    if board_mode and sampler is not None:
        # Ein Brett so oft ziehen, wie der Zell-Sampler es getroffen HAETTE: die Summe der
        # Zellgewichte ist genau diese Randwahrscheinlichkeit. Exakt zwischen den Brettern,
        # nicht innerhalb — jeder Besuch trainiert alle 64 Zellen (`docs/measurement-floor.md`).
        by_path = dict(zip((r["path"] for r in train_rows), sample_weights.tolist(), strict=True))
        cells = [by_path[r["path"]] for r in train_ds.rows]
        board_w = torch.tensor(
            [sum(cells[i:i + BOARD_CELLS]) for i in range(0, len(cells), BOARD_CELLS)],
            dtype=torch.double)
        n_draw = max(1, int(round(epoch_frac * len(board_w))))
        sampler = WeightedRandomSampler(board_w, n_draw, replacement=True,
                                        generator=torch.Generator().manual_seed(seed))
        print(f"[board] Sampler ueber {len(board_w)} Bretter, {n_draw} Ziehungen je Epoche")
    train_loader = DataLoader(train_ds, shuffle=sampler is None, sampler=sampler, drop_last=False, **loader_kw)

    # The crop's COMPOSITION, from ALL rows and not just the first: the pad decides what the
    # examples contain, and serving has to reproduce it (specs/45). Absent = this dataset
    # cannot say, which every consumer must then treat as legacy rather than guess at.
    crop = crop_of_rows(manifest)
    if crop is None:
        print(f"[crop] dataset {dataset!r} does not record pad_side on every row — the "
              "run will declare no crop and every consumer keeps its own profile's pad.")
    else:
        print(f"[crop] pad_side={crop:g} — declared by this run")

    run_dir = Path(out) if out else config.DATA.models / f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    if (run_dir / "metrics.jsonl").exists() and not continue_run:
        raise ValueError(f"{run_dir} already contains metrics; choose a new --out or use --continue.")
    run_dir.mkdir(parents=True, exist_ok=True)
    cfg_written = {
        "backbone": backbone, "epochs": epochs, "batch_size": batch_size, "lr": lr,
        # The schedule, not just its peak. Without it a run's trajectory cannot be reconstructed
        # from its config: `lr` is where the cosine STARTS and `epochs` is its period, so two runs
        # with identical `lr` and different `epochs` never saw the same rate at the same step.
        "sched": sched, "sched_t_max": epochs if sched != "none" else None,
        # Wann ein Lauf ENDET gehoert zur Rezeptur: ein Arm mit `patience 7` steigt nach 16
        # Epochen aus, einer mit 60 faehrt durch, und der Unterschied haengt dann am Ausstieg
        # statt am Verfahren. Stand bis 2026-09-17 in keiner config.json.
        "patience": patience,
        "batch_aug": batch_aug,
        "channels_last": channels_last,
        "compile_model": compile_model, "compile_mode": compile_mode, "fused_adamw": fused_adamw,
        "compile_batch_aug": compile_batch_aug,
        "low_memory": low_memory, "ram_reserve_gb": ram_reserve_gb,
        "pin_memory": not low_memory,
        "num_workers": nw, "eval_workers": eval_workers, "prefetch_factor": prefetch_factor,
        "checkpoint_policy": "loss-mask-v3",
        "worker_rng_policy": "epoch-seeded-v1",
        "metrics_schema": 3,
        # Was der LAUF gewuerfelt hat, nicht was im Loader stand: mit `--batch-aug` stehen die
        # Staerken dort auf 0, gerechnet werden sie trotzdem — und `config.json` ist das, was
        # Serving und jede spaetere Auswertung lesen.
        **_photometry_of(policy, photometric),
        "aug_invert_p": getattr(policy, "invert_p", 0.0),
        "aug_grayscale_p": getattr(policy, "grayscale_p", 0.0),
        "aug_rot90": rot90,
        "aug_scale": aug_scale,
        "weight_decay": wd,
        "label_smoothing": label_smoothing,
        "seed": seed, "amp": amp, "norm": norm_eff, "classes": classes, "out_size": list(out_size),
        "dataset": dataset, "split_file": split_file, "split": split, "resumed_from": resumed_from, "head": head,
        # eval and export rebuild from this; a head built at another size does not take the checkpoint.
        **({} if not board_mode else {"board_width": board_width, "board_layers": board_layers}),
        # Serving must reproduce this, exactly like `normalize` above.
        **({} if clahe_clip <= 0 else {
            "clahe_clip": clahe_clip, "clahe_tile": clahe_tile,
            "clahe_min_mean": clahe_min_mean, "clahe_max_mean": clahe_max_mean,
            "clahe_denoise": clahe_denoise}),
        **({} if crop is None else {"pad_side": crop}),
        # What SERVING must reproduce. `normalize.mode` "per_crop" ignores mean/std entirely, and
        # `input_repr` decides both the channel stack AND the stem's fan-in — a consumer that gets
        # either wrong feeds the model something it has never seen, silently.
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD),
                      "mode": "per_crop" if per_crop else "fixed"},
        "input_repr": input_repr, "in_chans": in_chans,
        "scales": scales,
        "aug": _aug_of(policy, photometric, neighbour_p),
        # Was WIRKLICH gerechnet wurde: unter `--head occlusion` ist das `OcclusionLoss`,
        # nicht `loss` — die Provenienz nannte sonst einen Verlust, den der Lauf nie anfasste.
        "loss": "occlusion" if occluding else loss,
        "focal_gamma": focal_gamma if (loss == "focal" and not occluding) else None,
        "class_weight_override": dict(class_weight or {}),
        "hard_negative_multiplier": hard_negative_multiplier,
        "balance": balance,
        # Ohne diese zwei ist ein Lauf aus seiner config.json NICHT reproduzierbar: sie
        # tragen genau die zwei Regler, die den aktuellen Sieger ausmachen. Gefehlt haben
        # sie, bis der Architektur-Sweep die Rezepte vergleichen wollte (2026-08-27).
        "weight_cap": weight_cap,
        "class_weight": dict(class_weight) if class_weight else None,
        "pretrained": want_pre,
        "no_empty_cap": no_empty_cap,
        "epoch_frac": epoch_frac,
        **_occlusion_provenance(occluding, vmax if occluding else None,
                                dmin if occluding else None, coverage_weight),
        "effective_class_weights": dict(zip(classes, [float(w) for w in weights.tolist()],
                                            strict=True)),
    }
    metrics_path = run_dir / "metrics.jsonl"

    # Compare actual epoch checkpoints, with visible identity accuracy first.
    best_score = (-1.0, -1.0, -1.0)
    best_piece = (-1.0, -1)
    recent: deque = deque(maxlen=3)  # Retained in resume state for diagnostics.
    # SWA mittelt die Gewichte ueber die Epochen statt eine einzelne auszuwaehlen. Es findet
    # flache Minima, und die trennen die Konfidenz richtiger von falschen Vorhersagen besser
    # (FMFP, ECCV 2022 — `docs/references.md`). Nebeneffekt: das Springen der Validierung
    # verschwindet, weil kein Einzelstand mehr die Auswahl traegt.
    swa_model = swa_sched = None
    swa_from = int(epochs * swa_start) if swa else -1
    if swa:
        from torch.optim.swa_utils import SWALR, AveragedModel

        swa_model = AveragedModel(model)
        swa_sched = SWALR(optimizer, swa_lr=swa_lr)
        print(f"[OK] SWA ab Epoche {swa_from}, davor unveraenderter {sched}-Plan; "
              f"danach konstant {swa_lr}")
    epochs_no_improve = 0
    start_epoch = 0
    # Fortsetzen heisst: derselbe Plan an derselben Stelle. Gewichte allein reichen dafuer nicht —
    # Optimizer-Momente, Cosine-Position, Sampler-Strom und die Zufallsstaende gehoeren dazu.
    state_path = run_dir / STATE_FILE
    if continue_run and state_path.exists():
        blob = _load_state(state_path, cfg_written)
        model.load_state_dict(blob["model"])
        optimizer.load_state_dict(blob["optimizer"])
        scheduler.load_state_dict(blob["scheduler"])
        scaler.load_state_dict(blob["scaler"])
        if blob.get("sampler_generator") is not None and getattr(sampler, "generator", None):
            sampler.generator.set_state(blob["sampler_generator"])
        if swa_model is not None and blob.get("swa_model") is not None:
            swa_model.load_state_dict(blob["swa_model"])
            swa_sched.load_state_dict(blob["swa_sched"])
        best_score = tuple(blob["best_score"])
        best_piece = tuple(blob["best_piece"])
        recent = deque(blob["recent"], maxlen=3)
        epochs_no_improve = blob["epochs_no_improve"]
        start_epoch = blob["epoch"]
        torch.set_rng_state(blob["rng"]["torch"].to(torch.uint8).cpu())
        np.random.set_state(blob["rng"]["numpy"])
        random.setstate(blob["rng"]["python"])
        if blob["rng"]["cuda"] is not None and torch.cuda.is_available():
            torch.cuda.set_rng_state_all([t.to(torch.uint8).cpu() for t in blob["rng"]["cuda"]])
        print(f"[OK] fortgesetzt bei Epoche {start_epoch}/{epochs} "
              f"(lr {scheduler.get_last_lr()[0]:.5f}, bester Score {best_score[0]:.4f})")
    elif continue_run:
        if metrics_path.exists():
            raise ValueError(f"{run_dir} has metrics but no {STATE_FILE}; choose a new --out.")
        print(f"[continue] kein {STATE_FILE} in {run_dir} — Lauf beginnt bei Epoche 0.")
    write_json(run_dir / "config.json", cfg_written)
    print(f"[OK] GPU ready ({device}); run directory: {run_dir}")
    for epoch in range(start_epoch, epochs):
        t_epoch = time.perf_counter()
        model.train()
        running_sum = torch.zeros((), dtype=torch.float64, device=device)
        seen = 0
        t_data = 0.0
        t_fetch = time.perf_counter()
        for x, y in _device_batches(train_loader, device, channels_last=channels_last):
            t_data += time.perf_counter() - t_fetch
            if photometric is not None:
                x = photometric(x)
            if scales:
                # Multi-Scale: gesamten Batch auf eine zufällige Eingabegröße bringen (uniform je
                # Batch, damit stapelbar). Modell ist size-agnostisch → lernt alle Auflösungen.
                s = int(np.random.choice(scales))
                if s != x.shape[-1]:
                    x = torch.nn.functional.interpolate(x, size=(s, s), mode="bilinear", align_corners=False)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type="cuda", enabled=amp):
                loss = criterion(model(x), y)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            running_sum.add_(loss.detach().double() * x.size(0))
            seen += x.size(0)
            t_fetch = time.perf_counter()
        # Sobald SWA uebernimmt, haelt SWALR die Rate — der Cosine-Plan darf dann nicht
        # weiterlaufen, sonst treten zwei Scheduler gegen denselben Optimizer an.
        if swa_from < 0 or epoch < swa_from:
            scheduler.step()
        # Synchronize once before stopping the timer. The epoch record divides this SUM by
        # seen below; averaging here as well would silently divide the reported loss twice.
        running = float(running_sum)
        t_train = time.perf_counter() - t_epoch

        t0 = time.perf_counter()
        val = evaluate_dataset(model, val_ds, device, criterion=criterion, batch_size=eval_batch, num_workers=eval_workers,
                               prefetch_factor=prefetch_factor)
        t_val = time.perf_counter() - t0
        work_audit = current_work_audit()
        validation_key = (id(model), id(val_ds), epoch)
        if work_audit is not None:
            work_audit.record_work("validation inference passes", validation_key, seconds=t_val)
        t0 = time.perf_counter()
        true_labels = val["trues"].tolist()
        pred_labels = val["preds"].tolist()
        from .data import confidence_auroc, visible_confidence

        # Auf denselben Zellen wie die Genauigkeits-Terme: verdeckte Zellen irren zu 55-63 %,
        # dabei aber unsicher — sie druecken conf_wrong um acht Punkte und schoenen damit
        # genau das Mass, das ueberzeugte Fehler aufdecken soll (gemessen 2026-08-24).
        # Die Vorhersagen folgen der Reihenfolge des DATENSATZES, nicht der von `val_rows`:
        # der Brettdatensatz behaelt nur vollstaendige Bretter und sortiert sie nach Feld.
        # Mit `val_rows` indiziert, lief das in einen IndexError statt in falsche Zahlen.
        vis_conf = visible_confidence(score_rows, true_labels, pred_labels, val.get("conf") or [])
        auroc = confidence_auroc(*vis_conf)
        _, bd = checkpoint_metrics(score_rows, classes, true_labels, pred_labels,
                                       auroc=auroc)
        # Select actual epoch weights by visible identity accuracy; calibration breaks ties.
        score = _checkpoint_rank(bd, auroc)
        t_score = time.perf_counter() - t0
        # --- occlusion validation diagnostics ---
        # The regular class metrics intentionally still score every crop for backwards
        # compatibility.  For an occlusion-head run we additionally measure:
        #   * continuous coverage quality
        #   * class/occupancy quality only where the piece is actually visible
        #
        occ_diag = {}
        if occluding:
            from .occlusion import PIECE_VISIBLE_MAX

            occ_diag = _occlusion_diagnostics(val, score_rows, classes, PIECE_VISIBLE_MAX)

        rec = {
            "epoch": epoch,
            "train_loss": running / max(seen, 1),
            "val_loss": val["loss"],
            "val_acc": val["square_acc"],
            "val_macro_recall": val["macro_recall"],
            "val_board_acc": val["board_acc"],
            "val_visible_board_acc": val["visible_board_acc"],
            "val_board_acc_tol1": val["board_acc_tol1"],
            "val_occupied_acc": bd["visible_occupied_acc"],
            "val_occupied_board_acc": bd["occupied_board_acc"],
            "val_piece_acc": bd["visible_piece_acc"],
            # Die Zahl, die zwei gleich genaue Modelle trennt: ueberzeugte Fehler brechen
            # die Dekodierung, unsichere lassen sich korrigieren.
            "val_conf_wrong": _conf_mean(vis_conf, wrong=True),
            "val_conf_auroc": auroc,
            "val_conf_right": _conf_mean(vis_conf, wrong=False),
            # TODO: das ist `visible_piece_acc`, also dieselbe Zahl wie `val_piece_acc` eine
            # Zeile hoeher — der gewichtete Score aus CHECKPOINT_WEIGHTS wird in `_` verworfen.
            "val_checkpoint_score": score[0],
            "lr": scheduler.get_last_lr()[0],
            # Where the wall clock went. Without it "the GPU idles between epochs" is a guess:
            # the eval loader, the metric block and the checkpoint are three different suspects.
            "t_train_s": round(t_train, 2), "t_data_s": round(t_data, 2),
            "t_val_s": round(t_val, 2), "t_score_s": round(t_score, 2),
        }
        if occ_diag:
            rec.update(occ_diag)
            rec = _compact_metrics(rec)
        rec["metrics_schema"] = 3

        with metrics_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec) + "\n")
        print(f"epoch {epoch:>3} | train_loss {rec['train_loss']:.4f} | val_loss {rec['val_loss']:.4f} "
              f"| visible_piece_acc {score[0]:.4f}")

        if occ_diag:
            print(
                f"          coverage_mae {occ_diag['val_coverage_mae']:.4f} "
                f"| cov_recall@0.5 {occ_diag['val_coverage_recall']:.4f} "
                f"| cov_precision@0.5 {occ_diag['val_coverage_precision']:.4f} "
                f"| visible_acc {occ_diag['val_visible_acc']:.4f} "
                f"| visible_occupied_acc {occ_diag['val_visible_occupied_acc']:.4f} "
                f"| visible_piece_acc {occ_diag['val_visible_piece_acc']:.4f} "
                f"| visible_occupied_board_acc {occ_diag['val_visible_occupied_board_acc']:.4f}"
            )

        torch.save(model.state_dict(), run_dir / "last.pt")
        # Keep the first checkpoint attaining the best visible identity accuracy.
        # best.pt may break accuracy ties using occupancy and confidence.
        if bd["visible_piece_acc"] > best_piece[0]:
            best_piece = (bd["visible_piece_acc"], epoch)
            torch.save(model.state_dict(), run_dir / "best_piece.pt")
        # Bis `swa_from` laeuft das Rezept unveraendert; erst danach wird gemittelt und die
        # Rate konstant gehalten. Sonst waere es ein anderes Rezept, kein A/B.
        if swa_model is not None and epoch >= swa_from:
            swa_model.update_parameters(model)
            swa_sched.step()
        recent.append(score)
        if score > best_score:
            best_score = score
            epochs_no_improve = 0
            torch.save(model.state_dict(), run_dir / "best.pt")
        else:
            epochs_no_improve += 1
        _save_state(state_path, epoch, model, optimizer, scheduler, scaler, sampler,
                    swa_model, swa_sched, best_score, best_piece, recent, epochs_no_improve,
                    cfg_written)
        if epochs_no_improve >= patience:
            print(f"[OK] Early stopping: no visible-piece improvement for {patience} epochs.")
            break

    print(f"[OK] done. best visible_piece_acc={best_score[0]:.4f} (visible_occupied_acc={best_score[1]:.4f}, "
          f"confidence_auroc={best_score[2]:.4f}); best.pt in {run_dir}")
    print(f"[OK] best_piece.pt: visible_piece_acc={best_piece[0]:.4f} bei Epoche {best_piece[1]} "
          "— gegen best.pt messen, bevor eine Stufe darauf aufbaut.")

    # SWA abschliessen: die gemittelten Gewichte haben NIE einen Batch gesehen, ihre
    # BatchNorm-Statistiken sind daher die des letzten Einzelstands. Ohne diesen Durchlauf
    # ueber die Trainingsdaten ist ein SWA-Modell unbrauchbar.
    if swa_model is not None:
        from torch.optim.swa_utils import update_bn

        print("[i] SWA: BatchNorm-Statistiken werden neu geschaetzt ...", flush=True)
        update_bn(train_loader, swa_model, device=device)
        inner = swa_model.module
        torch.save(inner.state_dict(), run_dir / "swa.pt")
        sv = evaluate_dataset(inner, val_ds, device, criterion=criterion,
                              batch_size=eval_batch, num_workers=0, keep_workers=False)
        sva = visible_confidence(score_rows, list(sv["trues"]), list(sv["preds"]),
                                 sv.get("conf") or [])
        _, sbd = checkpoint_metrics(score_rows, classes, list(sv["trues"]), list(sv["preds"]),
                                    auroc=confidence_auroc(*sva))
        # Dasselbe Tupel wie `best_score`: der gewichtete Score aus `checkpoint_metrics` lag
        # hier im Median 0,163 ueber `visible_piece_acc`, also gewann swa.pt jeden Vergleich.
        srank = _checkpoint_rank(sbd, sbd["calibration"])
        print(f"[OK] swa.pt: visible_piece_acc {srank[0]:.4f} "
              f"(visible_occupied_acc {srank[1]:.4f}, auroc {srank[2]:.4f}) "
              f"— gegen best.pt {best_score[0]:.4f} messen")

    # Temperatur auf val anpassen und mitschreiben: der Dekoder soll keine handgesetzte
    # Konstante brauchen, jedes Modell bringt seine eigene mit. Argmax und Genauigkeit
    # aendern sich dabei nicht, nur die Wahrscheinlichkeiten werden ehrlich.
    try:
        from .data import fit_temperature

        model.load_state_dict(torch.load(run_dir / "best.pt", map_location=device))
        # num_workers=0: a fresh worker loader built AFTER the last epoch deadlocks on Windows
        # spawn — two 60-epoch runs hung here for 36 h with every checkpoint already written.
        # One eval pass does not earn workers anyway.
        cal = evaluate_dataset(model, val_ds, device, batch_size=eval_batch,
                               num_workers=0, keep_workers=False)
        eligible = cal["classification_eligible"]
        temp = fit_temperature(cal.get("logits")[eligible], cal["trues"][eligible],
                               n_classes=len(classes))
        cfg_path = run_dir / "config.json"
        cfg_now = json.loads(cfg_path.read_text(encoding="utf-8"))
        cfg_now["temperature"] = round(temp, 4)
        write_json(cfg_path, cfg_now)
        print(f"[OK] Temperatur {temp:.3f} auf val angepasst -> config.json "
              f"(conf auf Fehlern {cal['conf_wrong']:.3f})")
    except Exception as e:  # noqa: BLE001 — Kalibrierung darf keinen Lauf kippen
        print(f"[WARN] Temperatur nicht angepasst: {e}")
    return 0
