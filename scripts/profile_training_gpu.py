"""Profile a resident real training batch; only a disposable model is updated."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import random
import sys
import time
from dataclasses import replace
from pathlib import Path

from chesslab.ioutil import write_json

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")


def main():
    import numpy as np
    import torch
    from PIL import Image

    from chesslab import config
    from chesslab.training.model import build_model
    from chesslab.training.occlusion import OcclusionLoss
    from chesslab.training.torch_data import build_transform

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run", default="data/models/p4a-v6-s42")
    ap.add_argument("--output", default="tmp/gpu-profile.json")
    ap.add_argument("--steps", type=int, default=50)
    ap.add_argument("--experiments", action="store_true")
    ap.add_argument("--compile-test", action="store_true",
                    help="Compare eager and compiled forward/backward using an externally provided Triton.")
    ap.add_argument("--write-fixture", type=Path)
    ap.add_argument("--fixture", type=Path, help="Reuse exact baseline tensors and compare across stacks.")
    args = ap.parse_args()
    cfg = json.loads((Path(args.run) / "config.json").read_text())
    torch.manual_seed(42)
    random.seed(42)
    dd = Path("data/datasets") / cfg["dataset"]
    groups = {}
    with (dd / "manifest.jsonl").open(encoding="utf-8") as f:
        for index, line in enumerate(f):
            row = json.loads(line)
            if row["session_id"] in cfg["split"]["splits"]["train"]:
                group = groups.setdefault((row["session_id"], row["frame"]), [])
                group.append((index, row))
                if sum(len(g) == 64 for g in groups.values()) >= 4:
                    break
    boards = [sorted(g, key=lambda item: (item[1]["square"][1], item[1]["square"][0]))
              for g in groups.values() if len(g) == 64][:4]
    assert len(boards) == 4
    pack = dd / "packed_images.u8"
    mm = np.memmap(pack, dtype=np.uint8, mode="r",
                   shape=(pack.stat().st_size // (80 * 80 * 3), 80, 80, 3))
    policy = replace(config.AUGMENT, **{k: cfg["aug_" + k] for k in config.AUGMENT.__dataclass_fields__
                                      if "aug_" + k in cfg})
    tf = build_transform((80, 80), train=True, policy=policy)
    x = torch.stack([torch.stack([tf(Image.fromarray(np.array(mm[i]))) for i, _ in b])
                     for b in boards]).cuda()
    y = torch.tensor([[cfg["classes"].index(r["label"]), r.get("coverage", 0),
                       r.get("brightness", 255)] for b in boards for _, r in b], device="cuda")
    fixture = torch.load(args.fixture, weights_only=True) if args.fixture else None
    if fixture is not None:
        x, y = fixture["x"].cuda(), fixture["y"].cuda()
    model = build_model(cfg["backbone"], len(cfg["classes"]) + 1, norm=cfg["norm"],
                        board_width=cfg["board_width"], board_layers=cfg["board_layers"]).cuda()
    model.load_state_dict(torch.load(Path(args.run) / "last.pt", map_location="cuda", weights_only=True))
    criterion = OcclusionLoss(torch.tensor([cfg["effective_class_weights"][c]
                                           for c in cfg["classes"]], device="cuda"))
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg["lr"], weight_decay=cfg["weight_decay"])
    scaler = torch.amp.GradScaler("cuda")
    parity = None
    if args.write_fixture or fixture is not None:
        with torch.autocast("cuda"):
            output = model(x)
            loss = criterion(output, y)
        loss.backward()
        snapshot = {"x": x.cpu(), "y": y.cpu(), "output": output.detach().cpu(),
                    "loss": loss.detach().cpu(),
                    "gradients": {k: p.grad.cpu() for k, p in model.named_parameters()},
                    "buffers": {k: b.cpu() for k, b in model.named_buffers()}}
        if args.write_fixture:
            torch.save(snapshot, args.write_fixture)
        if fixture is not None:
            parity = {}
            for category in ("output", "loss", "gradients", "buffers"):
                actual, expected = snapshot[category], fixture[category]
                pairs = [(actual, expected)] if isinstance(actual, torch.Tensor) else [
                    (actual[k], expected[k]) for k in actual]
                parity[category] = {"equal": all(torch.equal(a, b) for a, b in pairs),
                                    "max_abs_error": max(float((a.double() - b.double()).abs().max())
                                                         for a, b in pairs)}
        model.load_state_dict(torch.load(Path(args.run) / "last.pt", map_location="cuda", weights_only=True))
        model.zero_grad(set_to_none=True)

    def step(sync=False, events=None):
        optimizer.zero_grad(set_to_none=True)
        if events:
            events[0].record()
        with torch.autocast("cuda"):
            loss = criterion(model(x), y)
        if events:
            events[1].record()
        scaler.scale(loss).backward()
        if events:
            events[2].record()
        scaler.step(optimizer)
        scaler.update()
        if events:
            events[3].record()
        if sync:
            loss.item()
        return loss

    for _ in range(15):
        step()
    torch.cuda.synchronize()
    report = {"device": torch.cuda.get_device_name(), "torch": torch.__version__,
              "triton_installed": importlib.util.find_spec("triton") is not None,
              "batch_crops": 256, "steps": args.steps}
    if parity is not None:
        report["baseline_parity"] = parity
    for sync in (True, False):
        torch.cuda.synchronize()
        start = time.perf_counter()
        for _ in range(args.steps):
            step(sync)
        torch.cuda.synchronize()
        report["synchronized_ms" if sync else "queued_ms"] = (time.perf_counter() - start) * 1000 / args.steps
    totals = [0.0] * 3
    for _ in range(10):
        events = [torch.cuda.Event(enable_timing=True) for _ in range(4)]
        step(events=events)
        events[-1].synchronize()
        for i in range(3):
            totals[i] += events[i].elapsed_time(events[i + 1]) / 10
    report["phase_ms"] = dict(zip(("forward_loss", "backward", "optimizer_scaler"), totals, strict=True))
    print(json.dumps(report, indent=2), flush=True)
    if args.experiments or args.compile_test:
        import copy
        import types

        saved = torch.load(Path(args.run) / "last.pt", map_location="cuda", weights_only=True)

        def native_bn(module, value):
            module.num_batches_tracked.add_(1)
            return torch.batch_norm(value.float(), module.weight, module.bias,
                                    module.running_mean, module.running_var, True,
                                    module.momentum, module.eps, False).to(value.dtype)

        def backward_only(net, image):
            with torch.autocast("cuda"):
                output = net(image)
                value = criterion(output, y)
            (value * 1024).backward()
            return output, value

        model.load_state_dict(saved)
        model.zero_grad(set_to_none=True)
        expected, _ = backward_only(model, x)
        expected = expected.detach().clone()
        expected_grad = {k: p.grad.detach().clone() for k, p in model.named_parameters()}
        experiments = {}
        names = (("eager", "compile", "eager_repeat") if args.compile_test else
                 ("eager", "channels_last", "native_bn", "graph", "autotune", "eager_repeat"))
        for name in names:
            net = copy.deepcopy(model)
            net.load_state_dict(saved)
            net.zero_grad(set_to_none=True)
            image = x
            graph = None
            torch.backends.cudnn.benchmark = name == "autotune"
            try:
                if name == "compile":
                    net.forward = torch.compile(net.forward, fullgraph=True)
                if name == "channels_last":
                    net.to(memory_format=torch.channels_last)
                    image = x.flatten(0, 1).contiguous(memory_format=torch.channels_last).view_as(x)
                if name == "native_bn":
                    for module in net.modules():
                        if isinstance(module, torch.nn.BatchNorm2d):
                            module.forward = types.MethodType(native_bn, module)
                if name == "graph":
                    warm = torch.cuda.Stream()
                    warm.wait_stream(torch.cuda.current_stream())
                    with torch.cuda.stream(warm):
                        for _ in range(3):
                            net.zero_grad(set_to_none=True)
                            backward_only(net, image)
                    torch.cuda.current_stream().wait_stream(warm)
                    net.load_state_dict(saved)
                    net.zero_grad(set_to_none=True)
                    graph = torch.cuda.CUDAGraph()
                    with torch.cuda.graph(graph):
                        captured, captured_loss = backward_only(net, image)
                    net.load_state_dict(saved)
                    graph.replay()
                    actual = captured
                else:
                    actual, _ = backward_only(net, image)
                torch.cuda.synchronize()
                delta = (actual.detach().float() - expected.float())
                gradient_error = max(float((p.grad - expected_grad[k]).abs().max())
                                     for k, p in net.named_parameters())
                exact_grad = all(torch.equal(p.grad, expected_grad[k]) for k, p in net.named_parameters())
                row = {"output_equal": torch.equal(actual, expected),
                       "max_output_error": float(delta.abs().max()),
                       "gradients_equal": exact_grad, "max_gradient_error_scaled": gradient_error}
                for _ in range(10):
                    if graph:
                        graph.replay()
                    else:
                        net.zero_grad(set_to_none=True)
                        backward_only(net, image)
                torch.cuda.synchronize()
                start = time.perf_counter()
                for _ in range(args.steps):
                    if graph:
                        graph.replay()
                    else:
                        net.zero_grad(set_to_none=True)
                        backward_only(net, image)
                torch.cuda.synchronize()
                row["forward_backward_ms"] = (time.perf_counter() - start) * 1000 / args.steps
                experiments[name] = row
            except Exception as exc:
                experiments[name] = {"error": str(exc)}
            print(name, experiments[name], flush=True)
        report["experiments"] = experiments
        torch.backends.cudnn.benchmark = False
        if args.compile_test:
            write_json(Path(args.output), report)
            return
        # Measure the optimizer alone using identical states and gradients.
        opt_results = {}
        reference_parameters = None
        for fused in (False, True):
            net = copy.deepcopy(model)
            net.load_state_dict(saved)
            opt = torch.optim.AdamW(net.parameters(), lr=cfg["lr"], weight_decay=cfg["weight_decay"],
                                    **({"fused": True} if fused else {}))
            try:
                for k, p in net.named_parameters():
                    p.grad = expected_grad[k].clone().div_(1024)
                opt.step()
                parameters = {k: p.detach().clone() for k, p in net.named_parameters()}
                if reference_parameters is None:
                    reference_parameters = parameters
                equal = all(torch.equal(p, reference_parameters[k]) for k, p in parameters.items())
                error = max(float((p - reference_parameters[k]).abs().max()) for k, p in parameters.items())
                for _ in range(10):
                    opt.step()
                torch.cuda.synchronize()
                start = time.perf_counter()
                for _ in range(args.steps):
                    opt.step()
                torch.cuda.synchronize()
                opt_results[str(fused)] = {"parameters_equal": equal, "max_parameter_error": error,
                                          "ms": (time.perf_counter() - start) * 1000 / args.steps}
            except Exception as exc:
                opt_results[str(fused)] = {"error": str(exc)}
            print("optimizer fused", fused, opt_results[str(fused)], flush=True)
        report["optimizers"] = opt_results
        validation = []
        left, right = copy.deepcopy(model), copy.deepcopy(model).to(memory_format=torch.channels_last)
        for boards_n in (1, 2, 3, 4):
            for seed in range(3):
                image = torch.randn((boards_n, 64, 3, 80, 80),
                                    generator=torch.Generator().manual_seed(seed + 100)).cuda()
                target = y[:boards_n * 64]
                left.load_state_dict(saved)
                right.load_state_dict(saved)
                left.zero_grad(set_to_none=True)
                right.zero_grad(set_to_none=True)
                with torch.autocast("cuda"):
                    a = left(image)
                    b = right(image.flatten(0, 1).contiguous(memory_format=torch.channels_last).view_as(image))
                    la, lb = criterion(a, target), criterion(b, target)
                (la * 1024).backward()
                (lb * 1024).backward()
                gradients_equal = all(torch.equal(pa.grad, pb.grad)
                                      for pa, pb in zip(left.parameters(), right.parameters(), strict=True))
                buffers_equal = all(torch.equal(ba, bb)
                                    for ba, bb in zip(left.buffers(), right.buffers(), strict=True))
                validation.append({"boards": boards_n, "seed": seed,
                                   "outputs_equal": torch.equal(a, b), "loss_equal": torch.equal(la, lb),
                                   "gradients_equal": gradients_equal, "buffers_equal": buffers_equal})
        report["channels_last_validation"] = validation
        print("channels_last_validation", validation, flush=True)
        write_json(Path(args.output), report)
        return
    try:
        with torch.profiler.profile(activities=[torch.profiler.ProfilerActivity.CPU,
                                               torch.profiler.ProfilerActivity.CUDA]) as prof:
            for _ in range(5):
                step()
            torch.cuda.synchronize()
        table = prof.key_averages().table(sort_by="self_cuda_time_total", row_limit=30)
        Path(args.output).with_suffix(".txt").write_text(table, encoding="utf-8")
        report["profile_table"] = table
    except Exception as exc:
        report["profiler_error"] = str(exc)
    write_json(Path(args.output), report)


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)
