"""Modell-Inferenz fürs Review: per-Crop Vorhersage + Confidence (Softmax).

Torch-gebunden, läuft bewusst auf CPU (64 Crops pro Frame sind trivial) — so belastet das
interaktive Relabeln die GPU nicht und kann die ROCm-Windows-Instabilität nicht triggern.
"""

from __future__ import annotations

from pathlib import Path

_CACHE: dict[str, tuple] = {}


def _get_model(run_dir: Path, device: str):
    """Modell + config eines Run-Verzeichnisses laden und cachen."""
    key = str(Path(run_dir).resolve())
    if key not in _CACHE:
        import torch  # noqa: F401  (sicherstellen, dass torch da ist)

        from ..training.evaluate import _load_run

        model, cfg = _load_run(Path(run_dir))
        model.eval().to(device)
        _CACHE[key] = (model, cfg)
    return _CACHE[key]


def predict_rows(run_dir: Path, rows: list[dict], device: str = "cpu", batch_size: int = 64) -> list[dict]:
    """Für jede Manifest-Zeile: {'pred_label', 'confidence'} (Reihenfolge wie `rows`)."""
    if not rows:
        return []
    import torch
    from torch.utils.data import DataLoader

    from ..training.torch_data import SquareDataset, build_transform

    model, cfg = _get_model(run_dir, device)
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])
    ds = SquareDataset(rows, classes, build_transform(out_size, train=False))
    loader = DataLoader(ds, batch_size=batch_size, shuffle=False)

    results: list[dict] = []
    with torch.no_grad():
        for x, _ in loader:
            x = x.to(device)
            probs = torch.softmax(model(x), dim=1)
            conf, idx = probs.max(dim=1)
            for c, i in zip(conf.tolist(), idx.tolist()):
                results.append({"pred_label": classes[int(i)], "confidence": round(float(c), 4)})
    return results


def predict_arrays(run_dir: Path, crops: list, device: str = "cpu") -> list[dict]:
    """Wie `predict_rows`, aber aus In-Memory-Crops (BGR np.ndarray) — für Live-Inference.

    Gibt je Crop {'pred_label', 'confidence'} in Eingabe-Reihenfolge. `classes` kommt aus der
    Run-config, kann also 14 (inkl. 'occluded') sein.
    """
    if not crops:
        return []
    import numpy as np
    import torch
    from PIL import Image

    from ..training.torch_data import build_transform

    model, cfg = _get_model(run_dir, device)
    classes = cfg["classes"]
    tf = build_transform(tuple(cfg["out_size"]), train=False)
    batch = torch.stack([tf(Image.fromarray(c[:, :, ::-1].copy())) for c in crops]).to(device)  # BGR->RGB
    with torch.no_grad():
        probs = torch.softmax(model(batch), dim=1)
        conf, idx = probs.max(dim=1)
    return [{"pred_label": classes[int(i)], "confidence": round(float(c), 4)}
            for c, i in zip(conf.tolist(), idx.tolist())]


def model_classes(run_dir: Path, device: str = "cpu") -> list[str]:
    return list(_get_model(run_dir, device)[1]["classes"])


def clear_cache() -> None:
    _CACHE.clear()
