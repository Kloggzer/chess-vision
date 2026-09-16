"""Untrainierte Kandidaten-Graphen fuer den Geraete-Vergleich exportieren.

Kein Training, keine Gewichte, keine Genauigkeit: gemessen wird ausschliesslich, was eine
Architektur je Brett KOSTET. Die Graphen gehen nach `data/tmp/arch-bench/` und von dort per
`scripts/bench_arch_run.ps1` aufs Telefon.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from chesslab.ioutil import write_json

ARCHS = {
    "boardnet-p4": "boardattn:cellnet_p4",
    "boardnet-p4w": "boardattn:cellnet_p4w",
    "boardnet-p8": "boardattn:cellnet_p8",
    "p8-plain": "cellnet_p8",
    "p8-convhead": "board:cellnet_p8",
    "boardnet-p8w": "boardattn:cellnet_p8w",
    "mv4-small-035": "boardattn:mobilenetv4_conv_small_035",
    "mv4-small-050": "boardattn:mobilenetv4_conv_small_050",
    "mv4-small": "boardattn:mobilenetv4_conv_small",
    "mv4-medium": "boardattn:mobilenetv4_conv_medium",
    "repvit-m1_1": "boardattn:repvit_m1_1",
    "repvit-m1_5": "boardattn:repvit_m1_5",
}
CELLS = 64
CLASSES = 13
OUT_WIDTH = CLASSES + 1


class _BoardExport(nn.Module):
    """Dieselbe Huelle wie `evaluate.run_export`: das Geraet schickt EIN Brett als `(64,C,H,W)`."""

    def __init__(self, inner: nn.Module) -> None:
        super().__init__()
        self.inner = inner

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.inner(x.unsqueeze(0))


def count_macs(model: nn.Module, example: torch.Tensor) -> int:
    total = 0

    def conv_hook(m, _inp, out):
        nonlocal total
        total += out.shape[0] * int(np.prod(out.shape[2:])) * out.shape[1] * (m.in_channels // m.groups) * int(np.prod(m.kernel_size))

    def linear_hook(m, _inp, out):
        nonlocal total
        total += int(np.prod(out.shape[:-1])) * m.in_features * m.out_features

    handles = [m.register_forward_hook(conv_hook if isinstance(m, nn.Conv2d) else linear_hook)
               for m in model.modules() if isinstance(m, nn.Conv2d | nn.Linear)]
    try:
        with torch.no_grad():
            model(example)
    finally:
        for h in handles:
            h.remove()
    return total


def export_one(name: str, backbone: str, size: int, out_dir: Path, int8: bool) -> dict:
    from chesslab.training.model import build_model, stock_batchnorm

    torch.manual_seed(42)
    model = build_model(backbone, OUT_WIDTH, pretrained=False).eval()
    stock_batchnorm(model)
    # Nur ein Brett-Modell braucht die Huelle; ein Per-Zell-Trunk nimmt `(64,C,H,W)` direkt.
    wrapped = _BoardExport(model).eval() if ":" in backbone else model
    example = torch.randn(CELLS, 3, size, size)

    macs = count_macs(wrapped, example)
    params = sum(p.numel() for p in model.parameters())
    path = out_dir / f"{name}-{size}.onnx"
    torch.onnx.export(wrapped, example, str(path), input_names=["input"],
                      output_names=["logits"], opset_version=17, dynamo=False)
    row = {"name": name, "backbone": backbone, "size": size,
           "mmac_per_crop": round(macs / CELLS / 1e6, 2), "mmac_per_board": round(macs / 1e6, 1), "params_m": round(params / 1e6, 3),
           "onnx_mb": round(path.stat().st_size / 1e6, 2), "file": path.name}
    if int8:
        row["int8_file"] = quantize_one(path, size).name
        row["int8_mb"] = round((path.with_name(path.stem + ".int8.onnx")).stat().st_size / 1e6, 2)
    return row


def quantize_one(fp32: Path, size: int) -> Path:
    """U8/U8-QDQ mit ZUFALLS-Kalibrierung — hier zaehlt allein die Laufzeit, nie die Genauigkeit.

    Vorzeichenlose Gewichte je Tensor, weil der NNAPI-Provider signierte (`type: 3`) und
    kanalweise Gewichte ablehnt; nur Conv/Gemm/MatMul, weil XNNPACKs `qu8`-Softmax den
    Aufmerksamkeitskopf nicht baut (`xnn_create_softmax_nc_qu8`, Status 4).
    """
    from onnxruntime.quantization import CalibrationDataReader, QuantType, quantize_static
    from onnxruntime.quantization.shape_inference import quant_pre_process

    class _RandomReader(CalibrationDataReader):
        def __init__(self) -> None:
            rng = np.random.default_rng(42)
            self._data = [{"input": rng.random((CELLS, 3, size, size), dtype=np.float32)} for _ in range(8)]
            self._it = iter(self._data)

        def get_next(self):
            return next(self._it, None)

    prep = fp32.with_name(fp32.stem + ".prep.onnx")
    out = fp32.with_name(fp32.stem + ".int8.onnx")
    # `skip_symbolic_shape`: der Brettkopf formt `(1,64,C)` um, und die symbolische Inferenz
    # bricht an genau diesem Reshape ab (`assert is_literal(shape_rank)`). Der Graph ist ohnehin
    # auf feste Batchgroesse getract, also traegt die statische Inferenz alles Noetige.
    quant_pre_process(str(fp32), str(prep), skip_symbolic_shape=True)
    try:
        quantize_static(str(prep), str(out), _RandomReader(), per_channel=False,
                        activation_type=QuantType.QUInt8, weight_type=QuantType.QUInt8,
                        op_types_to_quantize=["Conv", "Gemm", "MatMul"])
    finally:
        prep.unlink(missing_ok=True)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="data/tmp/arch-bench")
    ap.add_argument("--size", type=int, action="append", default=None)
    ap.add_argument("--arch", action="append", default=None, choices=sorted(ARCHS))
    ap.add_argument("--int8", action="store_true")
    args = ap.parse_args()

    sizes = args.size or [80]
    names = args.arch or list(ARCHS)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for size in sizes:
        for name in names:
            print(f"[..] {name} @ {size}px", flush=True)
            try:
                row = export_one(name, ARCHS[name], size, out_dir, args.int8)
            except Exception as e:
                print(f"[FAIL] {name} @ {size}: {type(e).__name__}: {e}")
                continue
            rows.append(row)
            print(f"[OK] {row['file']}: {row['mmac_per_crop']} MMAC/Crop, "
                  f"{row['params_m']} M Params, {row['onnx_mb']} MB", flush=True)

    write_json(out_dir / "index.json", rows)
    print(f"\n{len(rows)} Graphen -> {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
