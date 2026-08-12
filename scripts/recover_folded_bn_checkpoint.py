"""Recover a trainable timm BatchNorm checkpoint from a fully folded ONNX export."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import onnx
import torch
from onnx import numpy_helper

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab.training.model import build_model  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()

    cfg = json.loads((args.run / "config.json").read_text(encoding="utf-8"))
    graph = onnx.load(args.run / "model.onnx").graph
    initializers = {item.name: numpy_helper.to_array(item) for item in graph.initializer}
    conv_nodes = [node for node in graph.node if node.op_type == "Conv"]
    model = build_model(
        cfg["backbone"],
        len(cfg["classes"]),
        pretrained=False,
        norm=cfg["norm"],
        head=cfg["head"],
        classes=cfg["classes"],
    )
    convs = [module for module in model.modules() if isinstance(module, torch.nn.Conv2d)]
    norms = [module for module in model.modules() if isinstance(module, torch.nn.BatchNorm2d)]
    if not (len(conv_nodes) == len(convs) == len(norms)):
        raise SystemExit(f"cannot pair folded graph: ONNX convs={len(conv_nodes)}, torch convs={len(convs)}, BN={len(norms)}")

    with torch.no_grad():
        for node, conv, norm in zip(conv_nodes, convs, norms, strict=True):
            weight = torch.from_numpy(np.array(initializers[node.input[1]], copy=True))
            bias = torch.from_numpy(np.array(initializers[node.input[2]], copy=True))
            if tuple(weight.shape) != tuple(conv.weight.shape) or tuple(bias.shape) != tuple(norm.bias.shape):
                raise SystemExit(f"shape mismatch at {node.name}: {tuple(weight.shape)} / {tuple(bias.shape)}")
            conv.weight.copy_(weight)
            if conv.bias is not None:
                conv.bias.zero_()
            norm.weight.fill_((1.0 + norm.eps) ** 0.5)
            norm.bias.copy_(bias)
            norm.running_mean.zero_()
            norm.running_var.fill_(1.0)
            norm.num_batches_tracked.zero_()
        model.classifier.weight.copy_(torch.from_numpy(np.array(initializers["classifier.weight"], copy=True)))
        model.classifier.bias.copy_(torch.from_numpy(np.array(initializers["classifier.bias"], copy=True)))

    torch.save(model.state_dict(), args.run / "best.pt")
    print(f"recovered {len(convs)} folded Conv+BN pairs -> {args.run / 'best.pt'}")


if __name__ == "__main__":
    main()
