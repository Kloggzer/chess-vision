"""Why the GPU idles: how the step scales with work per kernel, and how many ops it launches.

ROCm-Windows gives torch.profiler no device activity — the chrome trace carries CPU rows only,
and the table's "Self CUDA" column is attribution, not measurement (`aten::result_type`, a pure
metadata op, came back with 36 ms of it). So the launch-bound question is answered by growing the
batch instead: more work per kernel at a constant kernel count. Flat step time means overhead,
rising step time means compute.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from pathlib import Path

from chesslab.ioutil import write_json

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

#: Das ERSTE Glied laeuft am Ende noch einmal: sonst bleibt offen, ob der Abstand die Variante war
#: oder der Warmlauf.
SIZES = (1, 2, 4, 8, 16, 1)
VARIANTS = ("eager", "compile", "compile-cudagraph", "compile-fused", "eager-fused", "eager-repeat")


def line_fit(scaling: list[dict]) -> dict | None:
    """Kleinste Quadrate `ms = fest + je_crop * crops` — die Rezeptzahl aus dem Lauf, nicht von Hand."""
    pts = [(r["crops"], r["ms_per_step"]) for r in scaling if "ms_per_step" in r and not r.get("repeat")]
    if len(pts) < 2:
        return None
    mx = sum(c for c, _ in pts) / len(pts)
    my = sum(m for _, m in pts) / len(pts)
    slope = sum((c - mx) * (m - my) for c, m in pts) / sum((c - mx) ** 2 for c, _ in pts)
    return {"fixed_ms": round(my - slope * mx, 3), "per_crop_us": round(slope * 1000, 2),
            "points": len(pts)}


def main():
    import torch

    from chesslab.training.model import PrimitiveBatchNorm2d, build_model
    from chesslab.training.occlusion import OcclusionLoss

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run", default="data/models/p4a-v6-s42")
    ap.add_argument("--fixture", type=Path, default=Path("tmp/compile-spike/baseline.pt"))
    ap.add_argument("--steps", type=int, default=8)
    ap.add_argument("--compile", action="store_true")
    ap.add_argument("--aug", action="store_true",
                    help="Time the on-device augmentation alone, eager against compiled.")
    ap.add_argument("--variants", action="store_true",
                    help="Compare ways of cutting launch overhead at the training batch.")
    ap.add_argument("--output", default="tmp/compile-spike/kernels.json")
    args = ap.parse_args()

    cfg = json.loads((Path(args.run) / "config.json").read_text())
    torch.manual_seed(42)
    random.seed(42)
    fixture = torch.load(args.fixture, weights_only=True)
    x, y = fixture["x"].cuda(), fixture["y"].cuda()
    model = build_model(cfg["backbone"], len(cfg["classes"]) + 1, norm=cfg["norm"],
                        board_width=cfg["board_width"], board_layers=cfg["board_layers"]).cuda()
    model.load_state_dict(torch.load(Path(args.run) / "last.pt", map_location="cuda",
                                     weights_only=True))
    criterion = OcclusionLoss(torch.tensor([cfg["effective_class_weights"][c]
                                            for c in cfg["classes"]], device="cuda"))
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg["lr"],
                                  weight_decay=cfg["weight_decay"])
    scaler = torch.amp.GradScaler("cuda")
    norms = [m for m in model.modules() if isinstance(m, PrimitiveBatchNorm2d)]
    if args.compile:
        model.forward = torch.compile(model.forward, fullgraph=True)

    def step(xb, yb):
        optimizer.zero_grad(set_to_none=True)
        with torch.autocast("cuda"):
            loss = criterion(model(xb), yb)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

    saved = {k: v.detach().clone() for k, v in model.state_dict().items()}

    def timed(fn, warmup=15, iters=None):
        for _ in range(warmup):
            fn()
        torch.cuda.synchronize()
        start = time.perf_counter()
        for _ in range(iters or args.steps):
            fn()
        torch.cuda.synchronize()
        return (time.perf_counter() - start) * 1000 / (iters or args.steps)

    def aten_calls(fn):
        with torch.profiler.profile(activities=[torch.profiler.ProfilerActivity.CPU]) as prof:
            for _ in range(args.steps):
                fn()
            torch.cuda.synchronize()
        return round(sum(e.count for e in prof.key_averages()
                         if e.key.startswith("aten::")) / args.steps, 1)

    if args.aug:
        from dataclasses import replace

        from chesslab import config as cfgmod
        from chesslab.training.batch_aug import BatchGeometry, BatchPhotometric

        policy = replace(cfgmod.AUGMENT, **{k: cfg["aug_" + k] for k in cfgmod.AUGMENT.__dataclass_fields__
                                            if "aug_" + k in cfg})
        raw = torch.randint(0, 256, x.shape, dtype=torch.uint8, device="cuda")
        rows = []
        for name in ("eager", "compiled"):
            aug = BatchPhotometric(policy, cfgmod.NORMALIZE_MEAN, cfgmod.NORMALIZE_STD,
                                   from_uint8=True, geometry=BatchGeometry(policy))
            if name == "compiled":
                aug.compile()
            call = aug.__call__
            row = {"variant": name}
            try:
                torch.manual_seed(7)
                out = call(raw)
                torch.cuda.synchronize()
                row["mean"] = round(float(out.mean()), 5)
                row["std"] = round(float(out.std()), 5)
                row["ms_per_batch"] = round(timed(lambda call=call: call(raw)), 3)
                row["aten_per_batch"] = aten_calls(lambda call=call: call(raw))
            except Exception as exc:
                row["error"] = str(exc)[:200]
            rows.append(row)
            print(row, flush=True)
        write_json(Path(args.output), {"torch": torch.__version__, "aug": rows})
        return

    if args.variants:
        import copy

        results, reference = [], None
        for name in VARIANTS:
            net = copy.deepcopy(model)
            net.load_state_dict(saved)
            opt = torch.optim.AdamW(net.parameters(), lr=cfg["lr"],
                                    weight_decay=cfg["weight_decay"],
                                    **({"fused": True} if name.endswith("fused") else {}))
            sc = torch.amp.GradScaler("cuda")
            row = {"variant": name}
            try:
                if name.startswith("compile"):
                    net.forward = torch.compile(
                        net.forward, fullgraph=True,
                        **({"mode": "reduce-overhead"} if "cudagraph" in name else {}))

                def one(net=net, opt=opt, sc=sc):
                    opt.zero_grad(set_to_none=True)
                    with torch.autocast("cuda"):
                        loss = criterion(net(x), y)
                    sc.scale(loss).backward()
                    sc.step(opt)
                    sc.update()
                    return loss

                one()
                torch.cuda.synchronize()
                net.load_state_dict(saved)
                net.zero_grad(set_to_none=True)
                with torch.autocast("cuda"):
                    out = net(x)
                    value = criterion(out, y)
                (value * 1024).backward()
                torch.cuda.synchronize()
                snap = (out.detach().float().clone(),
                        {k: p.grad.detach().float().clone() for k, p in net.named_parameters()})
                if reference is None:
                    reference = snap
                row["max_output_error"] = float((snap[0] - reference[0]).abs().max())
                row["max_gradient_error_scaled"] = max(
                    float((v - reference[1][k]).abs().max()) for k, v in snap[1].items())
                net.load_state_dict(saved)
                row["ms_per_step"] = round(timed(one), 3)
                row["crops_s"] = round(int(x.shape[0]) * 64 * 1000 / row["ms_per_step"])
                row["aten_per_step"] = aten_calls(one)
            except Exception as exc:
                row["error"] = str(exc)[:160]
            results.append(row)
            print(row, flush=True)
        write_json(Path(args.output),
                   {"torch": torch.__version__, "batch_crops": int(x.shape[0]) * 64,
                    "variants": results})
        return


    report = {"torch": torch.__version__, "compiled": args.compile,
              "norm_modules": len(norms), "scaling": [], "ops_per_step": {}}
    base = x.shape[0]
    for n_run, boards in enumerate(SIZES):
        if boards <= base:
            xb, yb = x[:boards].contiguous(), y[:boards * 64]
        else:
            reps = -(-boards // base)
            xb = x.repeat(reps, 1, 1, 1, 1)[:boards].contiguous()
            yb = y.repeat(reps, 1)[:boards * 64]
        try:
            ms = timed(lambda xb=xb, yb=yb: step(xb, yb))
            report["scaling"].append({"boards": boards, "crops": boards * 64,
                                      "ms_per_step": round(ms, 3),
                                      "crops_s": round(boards * 64 * 1000 / ms),
                                      "repeat": boards in SIZES[:n_run]})
        except Exception as exc:
            report["scaling"].append({"boards": boards, "error": str(exc)[:120]})
        print(report["scaling"][-1], flush=True)

    report["fit"] = line_fit(report["scaling"])
    print("fit", report["fit"], flush=True)
    # CPU-side rows ARE real here: every aten call is one dispatch, and dispatch is what the step
    # lacks.
    with torch.profiler.profile(activities=[torch.profiler.ProfilerActivity.CPU]) as prof:
        for _ in range(args.steps):
            step(x, y)
        torch.cuda.synchronize()
    rows = [(e.key, e.count) for e in prof.key_averages() if e.key.startswith("aten::")]
    report["aten_calls_per_step"] = round(sum(c for _, c in rows) / args.steps, 1)
    report["top_ops"] = [{"op": k, "per_step": round(c / args.steps, 1)}
                         for k, c in sorted(rows, key=lambda kv: -kv[1])[:15]]
    print(json.dumps({k: v for k, v in report.items() if k not in ("top_ops", "scaling")}, indent=2))
    for row in report["top_ops"]:
        print(f"{row['per_step']:8.1f}x  {row['op']}")
    write_json(Path(args.output), report)
    print(json.dumps({k: v for k, v in report.items() if k != "top_kernels"}, indent=2))


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)
