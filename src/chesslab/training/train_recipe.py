"""Das Rezept eines Laufs: Augmentierung, Modell, Verlust, Optimierer und `config.json`.

Alles, was `run_train` vor der ersten Epoche festlegt und was die `config.json` spaeter nennt.
"""

from __future__ import annotations

from types import SimpleNamespace

from .. import config
from ..cell_rule import brightness_of


class Refused(Exception):
    """Der Lauf startet nicht; der Grund ist schon als `[FAIL]` ausgegeben."""


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


def visible_class_counts(rows: list[dict]) -> dict[str, int]:
    """Klassenhaeufigkeit auf GENAU der Zellmenge, die `OcclusionLoss` benotet.

    Bis 2026-09-22 zaehlte die Gewichtung nur `coverage <= PIECE_VISIBLE_MAX` und liess die
    Dunkelmaske aus — schwarz bis 2,80 % unterbewertet (bN), 4,5x haeufiger unter `CELL_DARK_MIN`.
    """
    from .occlusion import classification_eligible

    counts: dict[str, int] = {}
    for r in rows:
        if classification_eligible(r):
            counts[r["label"]] = counts.get(r["label"], 0) + 1
    return counts


def _occlusion_provenance(occluding: bool, vmax: float | None, dmin: float | None,
                          coverage_weight: str) -> dict:
    """Was der Verlust WIRKLICH maskiert hat — `hard` und `soft` sahen in der config.json gleich aus.

    Unter `soft` liest `occlusion.coverage_weight` `visible_max` nicht; die Zahl dort zu nennen
    behauptete eine Kante, die der Lauf nie hatte (`docs/class-scheme.md`).
    """
    if not occluding:
        return {"visible_max": None, "dark_min": None, "coverage_weight": None}
    return {"visible_max": vmax if coverage_weight == "hard" else None,
            "dark_min": dmin, "coverage_weight": coverage_weight}


#: The per-run overrides of `config.AUGMENT`, by `run_train` argument name.
AUG_KNOBS = ("erase_p", "erase_scale", "jitter_translate", "hflip_p", "vflip_p", "rot180_p",
             "flip_xor_p", "invert_p", "grayscale_p", "brightness", "contrast", "color_jitter",
             "blur_sigma_max", "gamma")


def aug_policy(aug_scale: float | None, **override):
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
    override = {k: v for k, v in override.items() if v is not None}
    if override:
        from dataclasses import replace
        policy = replace(policy, **override)
        print(f"[aug] override erase_p={policy.erase_p} "
              f"jitter_translate={policy.jitter_translate} "
              f"brightness={policy.brightness} contrast={policy.contrast} "
              f"color_jitter={policy.color_jitter} blur={policy.blur_sigma_max} "
              f"gamma={policy.gamma}")
    return policy


def batch_photometric(policy, batch_aug: bool, compile_batch_aug: bool, per_crop: bool,
                      input_repr: str):
    """`(photometric, policy)`: with `--batch-aug` the loader's strengths go to 0 and live here."""
    # Photometrie und Cutout wandern als EIN Batch aufs Geraet (`training/batch_aug.py`); der
    # Loader baut sie dann gar nicht erst, weil ihre Staerken auf 0 stehen.
    photometric = None
    if batch_aug:
        from dataclasses import replace as _replace

        from .batch_aug import BatchGeometry, BatchPhotometric

        if per_crop:
            print('[FAIL] --batch-aug und --crop-norm zusammen: die Normalisierung je Crop '
                  'ist nicht umkehrbar, also kaeme die Photometrie auf den falschen Werten an.')
            raise Refused
        if input_repr != "rgb":
            print(f"[FAIL] --batch-aug braucht --input-repr rgb, nicht {input_repr!r}: die "
                  "Kanalableitung sitzt hinter der Normalisierung, die das Geraet uebernimmt.")
            raise Refused
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
    return photometric, policy


def build_run_model(recipe: dict, n_out: int, in_chans: int):
    """`(model, device, norm_eff, want_pre)` on the training device."""
    r = SimpleNamespace(**recipe)
    import torch

    from .engine import get_device
    from .model import build_model

    # BatchNorm is broken on ROCm-Windows (MIOpen/HIPRTC) -> default GroupNorm there.
    # batchnorm everywhere, Windows included. The groupnorm-on-Windows default was a workaround
    # for a MIOpen crash on MobileNet batch-norm; all 10 shipped runs are MobileNet + batchnorm on
    # this machine, so the workaround outlived the bug it dodged.
    norm_eff = r.norm or "batchnorm"
    device = get_device(require_gpu=True)
    # Ohne den Schalter misst ein Breiten-Sweep das ImageNet-Vortraining: `_035` bringt als
    # einziges Backbone KEINE Gewichte mit, `_050` und Breite 1,0 schon.
    want_pre = (r.backbone != "smallcnn") if r.pretrained is None else r.pretrained
    model = build_model(r.backbone, n_out, pretrained=want_pre,
                        norm=norm_eff, head="combined", in_chans=in_chans,
                        board_width=r.board_width, board_layers=r.board_layers).to(device)
    if r.channels_last:
        model.to(memory_format=torch.channels_last)
        print("[layout] channels_last model weights and input batches")
    if r.compile_model:
        # Fuses PrimitiveBatchNorm2d's arithmetic back into single kernels; needs Triton, which
        # the pinned stack lacks, so it fails loudly instead of falling back. `reduce-overhead`
        # replays the step as ONE launch; its CUDA graphs reuse the returned tensors on the next
        # replay — read the loss before stepping again (docs/training-speed.md).
        model.forward = torch.compile(model.forward, fullgraph=True,
                                      **({"mode": r.compile_mode} if r.compile_mode else {}))
        print(f"[layout] torch.compile on the model forward, mode={r.compile_mode or 'default'}")
    print(f"[OK] Backbone {r.backbone}, norm={norm_eff}, head={r.head}, "
          f"input_repr={r.input_repr} ({in_chans}ch)")
    return model, device, norm_eff, want_pre


def warm_start(model, resume: str | None, backbone: str, device) -> str | None:
    # Continue training (warm start): load weights from a previous run. Matching tensors
    # are adopted, non-matching ones (e.g. the classification head with changed class count,
    # such as after adding `occluded`) are skipped -> the body transfers, the head learns anew.
    resumed_from = None
    if resume:
        from .data import read_run_config
        from .model import adopt_weights, checkpoint_of

        rd = config.DATA.models / resume
        ckpt = checkpoint_of(rd)
        if not (rd / "config.json").exists() or ckpt is None:
            print(f"[FAIL] Resume run '{resume}' incomplete or not found ({rd}).")
            raise Refused
        rcfg = read_run_config(rd)
        if rcfg.get("backbone") != backbone:
            print(f"[FAIL] Resume backbone {rcfg.get('backbone')!r} != {backbone!r} — choose the same backbone.")
            raise Refused
        keep, skipped = adopt_weights(model, ckpt, device)
        resumed_from = resume
        print(f"[OK] Resumed from '{resume}': {keep} tensors adopted"
              + (f", {skipped} skipped (head with changed class count)" if skipped else ""))
        if not keep:
            print("[FAIL] warm start adopted 0 tensors — the checkpoint does not fit this model. "
                  "Train without --resume, or fix the backbone/head combination.")
            raise Refused
    return resumed_from


def loss_weights(split: dict, classes: list[str], class_weight: dict[str, float] | None,
                 occluding: bool, train_rows: list[dict], weight_cap: float | None, device):
    """`(split, weights)`: the class weights the loss sees, on the device."""
    from .torch_data import class_weights_tensor

    # Per-class weight override on top of split.json's inverse-frequency weights. The
    # occupancy sweep (specs/18) nudges `occupied` by 2-3x — a COST correction on a mild
    # frequency imbalance, deliberately NOT the observed 39x miss/phantom error ratio,
    # which would only teach the model to always guess occupied.
    if class_weight:
        unknown = [c for c in class_weight if c not in classes]
        if unknown:
            print(f"[FAIL] --class-weight names classes not in this dataset: {unknown} "
                  f"(dataset classes: {classes}).")
            raise Refused
    # Die Gewichte in split.json zaehlen ALLE Zellen, der Occlusion-Verlust sieht nur die
    # sichtbaren. Verdeckung ist nicht gleich verteilt — weiss 11-15 %, schwarz 2-6 %, weil die
    # Hand immer von der weissen Seite kommt —, also stimmt die angenommene Haeufigkeit nicht.
    # Hier statt im Split, damit split.json unangetastet bleibt (es ist die Reproduzierbarkeit).
    if occluding:
        from ..dataset import compute_class_weights

        vis_counts = visible_class_counts(train_rows)
        split = {**split, "class_weights": compute_class_weights(vis_counts, classes, weight_cap)}
        if weight_cap is not None:
            print(f"[loss] Gewichte auf {weight_cap:g}x gekappt"
                  + (" — das ist UNGEWICHTET." if weight_cap == 1 else " (geglaettet, nicht beschnitten)."))
    # ZULETZT, sonst umsonst: der Occlusion-Zweig oben schreibt `class_weights` komplett neu.
    # Bis 2026-08-27 stand das Setzen davor und wurde bei JEDEM Occlusion-Lauf still verworfen.
    # Ein gezieltes Gewicht verbietet EINEN Tausch, den der Verlust sonst belohnt (bB -> bP
    # kostet weniger, weil Bauern haeufiger sind).
    if class_weight:
        cw = dict(split.get("class_weights", {}))
        cw.update({c: float(v) for c, v in class_weight.items()})
        split = {**split, "class_weights": cw}
        print("[loss] class-weight override: "
              + ", ".join(f"{c}={class_weight[c]}" for c in sorted(class_weight)))
    weights = class_weights_tensor(split, classes).to(device)
    return split, weights


def build_criterion(recipe: dict, occluding: bool, weights, classes: list[str],
                    train_rows: list[dict], device):
    """`(criterion, vmax, dmin)`; `vmax`/`dmin` are the TRAINING mask (None without occlusion)."""
    r = SimpleNamespace(**recipe)
    import torch.nn as nn

    vmax = dmin = None
    # VOR dem Kopf-Zweig: unter `--head occlusion` sprang die Pruefung ganz aus, also lief
    # `--loss banana` widerspruchslos durch und landete als Provenienz in der config.json.
    if r.loss not in ("ce", "focal"):
        print(f"[FAIL] unknown --loss {r.loss!r} (ce | focal).")
        raise Refused
    if occluding and r.loss != "ce":
        print(f"[FAIL] --head occlusion bringt seinen eigenen Verlust mit; --loss {r.loss!r} "
              f"waere wirkungslos und stuende trotzdem in der config.json.")
        raise Refused
    if occluding:
        from .occlusion import CELL_DARK_MIN, PIECE_VISIBLE_MAX, OcclusionLoss

        # Nur die TRAININGS-Maske. Die Metriken bleiben auf PIECE_VISIBLE_MAX, sonst wuerden
        # zwei Laeufe auf verschiedenen Zellmengen benotet und waeren nicht vergleichbar.
        vmax = PIECE_VISIBLE_MAX if r.visible_max is None else r.visible_max
        dmin = CELL_DARK_MIN if r.dark_min is None else r.dark_min
        criterion = OcclusionLoss(weights, visible_max=vmax, dark_min=dmin,
                                  label_smoothing=r.label_smoothing,
                                  coverage_weight_mode=r.coverage_weight).to(device)
        if r.coverage_weight != "hard":
            from .occlusion import COVERAGE_ZERO_AT

            print(f"[occ] Klassen-Gewicht je Zelle: {r.coverage_weight} — die harte Kante bei "
                  f"{vmax:g} faellt weg, Gewicht 0 erst ab {COVERAGE_ZERO_AT:g} "
                  "(docs/class-scheme.md)")
        if dmin:
            dark = sum(brightness_of(r) < dmin for r in train_rows)
            print(f"[occ] Trainingsmaske zusaetzlich bei Helligkeit < {dmin:g}: "
                  f"{dark} von {len(train_rows)} Zellen ({dark/max(len(train_rows),1)*100:.1f} %) "
                  f"zaehlen im KLASSENverlust nicht mehr — der Coverage-Kopf lernt sie weiter.")
        if r.visible_max is not None and r.coverage_weight == "hard":
            print(f"[occ] Trainingsmaske bei coverage <= {vmax:g} "
                  f"(Bewertung weiterhin bei {PIECE_VISIBLE_MAX:g})")
        elif r.visible_max is not None:
            print(f"[WARN] --visible-max {r.visible_max:g} ist unter --coverage-weight "
                  f"{r.coverage_weight} WIRKUNGSLOS — die Kurve liest die Kante nicht. "
                  f"Die config.json traegt darum visible_max: null.")
    elif r.loss == "ce":
        criterion = nn.CrossEntropyLoss(weight=weights)
    elif r.loss == "focal":
        from .losses import FocalLoss
        if r.head != "combined":
            print(f"[FAIL] --loss focal needs --head combined (logits); head={r.head!r} returns "
                  "log-probs and would be soft-maxed twice.")
            raise Refused
        criterion = FocalLoss(weight=weights, gamma=r.focal_gamma).to(device)
    print(f"[loss] {r.loss}" + (f" gamma={r.focal_gamma}" if r.loss == "focal" else "")
          + f", effective weights: {dict(zip(classes, [round(float(w), 4) for w in weights.tolist()], strict=True))}")
    return criterion, vmax, dmin


def build_optimizer(recipe: dict, model):
    """`(optimizer, scheduler, scaler, wd, amp)`."""
    r = SimpleNamespace(**recipe)
    import torch

    # AdamW = Adam with decoupled weight decay (docs/references.md#loshchilov-2017). Bis 2026-08-26
    # lief jeder Lauf auf PyTorchs Default 0,01 — bei train_loss 0,03 gegen val_loss 1,33
    # (`docs/evaluation.md`) ist das der erste Knopf, nicht der letzte.
    wd = 0.01 if r.weight_decay is None else r.weight_decay
    # `fused` also takes the GradScaler off its per-step `found_inf.item()`, and THAT is the
    # expensive half: without it every step drains the queue before the next can be filled
    # (20,8 -> 11,9 ms on the spike stack, model arithmetic bit-identical).
    optimizer = torch.optim.AdamW(model.parameters(), lr=r.lr, weight_decay=wd,
                                  **({"fused": True} if r.fused_adamw else {}))
    if r.weight_decay is not None or r.label_smoothing:
        print(f"[reg] weight_decay={wd} label_smoothing={r.label_smoothing}")
    # Cosine annealing without restarts (SGDR, docs/references.md#loshchilov-2016). `T_max=epochs`
    # COUPLES THE SCHEDULE TO THE RUN LENGTH: a 60- and a 200-epoch run follow different rates
    # from their first batch, so runs of different lengths are not directly comparable, and
    # `--patience` cuts a schedule planned for `epochs`. `--sched none` pins the rate — the only
    # way to ask "does LONGER training help?" with one variable. Default is unchanged.
    if r.sched == "none":
        scheduler = torch.optim.lr_scheduler.ConstantLR(optimizer, factor=1.0, total_iters=0)
        print(f"[sched] constant lr {r.lr:g} — no annealing, so epoch count is the only variable")
    else:
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=r.epochs)
    amp = not r.no_amp
    # Loss scaling for half-precision gradients (docs/references.md#micikevicius-2017).
    scaler = torch.amp.GradScaler("cuda", enabled=amp)
    return optimizer, scheduler, scaler, wd, amp


def run_config(recipe: dict, **derived) -> dict:
    r = SimpleNamespace(**{**recipe, **derived})
    cfg_written = {
        "backbone": r.backbone, "epochs": r.epochs, "batch_size": r.batch_size, "lr": r.lr,
        # The schedule, not just its peak. Without it a run's trajectory cannot be reconstructed
        # from its config: `lr` is where the cosine STARTS and `epochs` is its period, so two runs
        # with identical `lr` and different `epochs` never saw the same rate at the same step.
        "sched": r.sched, "sched_t_max": r.epochs if r.sched != "none" else None,
        # Wann ein Lauf ENDET gehoert zur Rezeptur: ein Arm mit `patience 7` steigt nach 16
        # Epochen aus, einer mit 60 faehrt durch, und der Unterschied haengt dann am Ausstieg
        # statt am Verfahren. Stand bis 2026-09-17 in keiner config.json.
        "patience": r.patience,
        "batch_aug": r.batch_aug,
        "channels_last": r.channels_last,
        "compile_model": r.compile_model, "compile_mode": r.compile_mode, "fused_adamw": r.fused_adamw,
        "compile_batch_aug": r.compile_batch_aug,
        "low_memory": r.low_memory, "ram_reserve_gb": r.ram_reserve_gb,
        "pin_memory": not r.low_memory,
        "num_workers": r.nw, "eval_workers": r.eval_workers, "prefetch_factor": r.prefetch_factor,
        "checkpoint_policy": "loss-mask-v3",
        "worker_rng_policy": "epoch-seeded-v1",
        "metrics_schema": 3,
        # Was der LAUF gewuerfelt hat, nicht was im Loader stand: mit `--batch-aug` stehen die
        # Staerken dort auf 0, gerechnet werden sie trotzdem — und `config.json` ist das, was
        # Serving und jede spaetere Auswertung lesen.
        **_photometry_of(r.policy, r.photometric),
        "aug_invert_p": getattr(r.policy, "invert_p", 0.0),
        "aug_grayscale_p": getattr(r.policy, "grayscale_p", 0.0),
        "aug_rot90": r.rot90,
        "aug_scale": r.aug_scale,
        "weight_decay": r.wd,
        "label_smoothing": r.label_smoothing,
        "seed": r.seed, "amp": r.amp, "norm": r.norm_eff, "classes": r.classes, "out_size": list(r.out_size),
        "dataset": r.dataset, "split_file": r.split_file, "split": r.split, "resumed_from": r.resumed_from, "head": r.head,
        # eval and export rebuild from this; a head built at another size does not take the checkpoint.
        **({} if not r.board_mode else {"board_width": r.board_width, "board_layers": r.board_layers}),
        # Serving must reproduce this, exactly like `normalize` above.
        **({} if r.clahe_clip <= 0 else {
            "clahe_clip": r.clahe_clip, "clahe_tile": r.clahe_tile,
            "clahe_min_mean": r.clahe_min_mean, "clahe_max_mean": r.clahe_max_mean,
            "clahe_denoise": r.clahe_denoise}),
        **({} if r.crop is None else {"pad_side": r.crop}),
        # What SERVING must reproduce. `normalize.mode` "per_crop" ignores mean/std entirely, and
        # `input_repr` decides both the channel stack AND the stem's fan-in — a consumer that gets
        # either wrong feeds the model something it has never seen, silently.
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD),
                      "mode": "per_crop" if r.per_crop else "fixed"},
        "input_repr": r.input_repr, "in_chans": r.in_chans,
        "scales": r.scales,
        "aug": _aug_of(r.policy, r.photometric, r.neighbour_p),
        # Was WIRKLICH gerechnet wurde: unter `--head occlusion` ist das `OcclusionLoss`,
        # nicht `loss` — die Provenienz nannte sonst einen Verlust, den der Lauf nie anfasste.
        "loss": "occlusion" if r.occluding else r.loss,
        "focal_gamma": r.focal_gamma if (r.loss == "focal" and not r.occluding) else None,
        "class_weight_override": dict(r.class_weight or {}),
        "hard_negative_multiplier": r.hard_negative_multiplier,
        "balance": r.balance,
        # Ohne diese zwei ist ein Lauf aus seiner config.json NICHT reproduzierbar: sie
        # tragen genau die zwei Regler, die den aktuellen Sieger ausmachen. Gefehlt haben
        # sie, bis der Architektur-Sweep die Rezepte vergleichen wollte (2026-08-27).
        "weight_cap": r.weight_cap,
        "class_weight": dict(r.class_weight) if r.class_weight else None,
        "pretrained": r.want_pre,
        "no_empty_cap": r.no_empty_cap,
        "epoch_frac": r.epoch_frac,
        **_occlusion_provenance(r.occluding, r.vmax if r.occluding else None,
                                r.dmin if r.occluding else None, r.coverage_weight),
        "effective_class_weights": dict(zip(r.classes, [float(w) for w in r.weights.tolist()],
                                            strict=True)),
        # Rows a later human verdict overruled, trained on as built (`dataset_build.check_verdicts`).
        "verdict_conflicts": r.verdicts,
    }
    return cfg_written
