"""Kanonischer Inference-Einstieg: Run-Spezifikation, Laden, Crops & Vorhersage.

Dies ist die **einzige** unterstützte öffentliche Facade für Modell-Inferenz.
Konsumenten (Web-Inference, CNN-Recovery im move_tracker, CLI-Evaluation)
nutzen ausschließlich dieses Modul. Es stellt sicher, dass **dieselbe** Crop-/Photometrie-
Pipeline verwendet wird wie beim Training des Modells — so ist die Train/Serve-Parität
garantiert.

Regeln:
- torch/PIL nur lazy in Funktionskörpern importieren (ROCm-Windows: CLI/Web müssen ohne
  GPU-Stack starten).
- importiert NIE `chesslab.web` (kein zirkulärer Import).
- Geometrie-Implementierung bleibt in `labeling` (keine Kopie).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import config, labeling

log = logging.getLogger("chesslab.serving")

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

_CACHE: dict[str, tuple] = {}


def clear_cache() -> None:
    """Modell-Cache leeren (Windows-Dateisperren, Run-Löschung)."""
    _CACHE.clear()


# ---------------------------------------------------------------------------
# Run-Spezifikation
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RunSpec:
    """Selbstbeschreibende Spezifikation eines trainierten Modell-Runs.

    Sagt allen Konsumenten, wie sie einen Frame für dieses Modell croppen müssen."""
    run_dir: Path
    classes: list[str]
    out_size: tuple[int, int]   # (W, H)
    geometry: str               # "warp" | "box3d"
    photometry: str             # "none" | "clahe" | "grayworld" | "gamma"
    piece_height_cells: float


def run_spec(run_dir: Path) -> RunSpec:
    """Run-Spezifikation für ein Modell-Verzeichnis auflösen.

    Auflösung:
    1. config.json["variant"] (neu, schreibt `training.train` seit Rework 01).
    2. Fallback: labeling.variant_of_run(run_dir) scannt das zugehörige Manifest.
    3. Fallback-Fallback: ("warp", "none", EXP_PIECE_HEIGHT_CELLS) mit Warnung.
    """
    run_dir = Path(run_dir)
    cfg_path = run_dir / "config.json"
    if not cfg_path.exists():
        raise FileNotFoundError(f"Kein config.json in {run_dir}")

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    classes = cfg.get("classes", config.CLASSES)
    out_size_raw = cfg.get("out_size", [96, 128])
    out_size = (int(out_size_raw[0]), int(out_size_raw[1]))

    variant = cfg.get("variant")
    if variant and isinstance(variant, dict):
        return RunSpec(
            run_dir=run_dir,
            classes=classes,
            out_size=out_size,
            geometry=variant.get("geometry", "warp"),
            photometry=variant.get("photometry", "none"),
            piece_height_cells=float(variant.get("piece_height_cells", config.EXP_PIECE_HEIGHT_CELLS)),
        )

    # Fallback 1: Manifest-Scan
    try:
        geometry, photometry, piece_height_cells = labeling.variant_of_run(run_dir)
    except Exception:
        geometry, photometry, piece_height_cells = "warp", "none", config.EXP_PIECE_HEIGHT_CELLS

    if variant is None:
        log.warning("Run %s hat kein 'variant'-Feld in config.json — per Manifest-Scan: "
                    "geometry=%s photometry=%s piece_height_cells=%.2f",
                    run_dir.name, geometry, photometry, piece_height_cells)

    return RunSpec(
        run_dir=run_dir,
        classes=classes,
        out_size=out_size,
        geometry=geometry,
        photometry=photometry,
        piece_height_cells=float(piece_height_cells),
    )


def model_classes(run_dir: Path) -> list[str]:
    """Klassenliste eines Runs (kurzer Wrapper für run_spec)."""
    return run_spec(run_dir).classes


# ---------------------------------------------------------------------------
# Modell laden
# ---------------------------------------------------------------------------


def load_run(run_dir: Path, device: str = "cpu"):
    """Modell + Run-config aus einem Run-Verzeichnis laden und cachen.

    Gibt (model, cfg) zurück. Das Modell ist eval() und auf `device`.
    """
    key = str(Path(run_dir).resolve())
    if key in _CACHE:
        model, cfg = _CACHE[key]
        model.to(device)
        return model, cfg

    import torch  # noqa: F401

    from .training.evaluate import load_run as _load_run

    model, cfg = _load_run(Path(run_dir))
    model.eval().to(device)
    _CACHE[key] = (model, cfg)
    return model, cfg


# ---------------------------------------------------------------------------
# Crops
# ---------------------------------------------------------------------------


def crops_for_model(frame: np.ndarray, corners, profile, spec: RunSpec) -> list[np.ndarray]:
    """64 BGR-Crops (Reihenfolge `labeling.all_squares()`) für einen Frame,
    exakt mit der Geometrie/Photometrie des übergebenen `RunSpec`.

    Dünner Wrapper um `labeling.crops_for_frame` — die Geometrie-Implementierung
    bleibt dort (Single Source of Truth).
    """
    out_size = spec.out_size
    return labeling.crops_for_frame(
        frame, corners, profile,
        geometry=spec.geometry,
        photometry=spec.photometry,
        piece_height_cells=spec.piece_height_cells,
        out_size=out_size,
    )


# ---------------------------------------------------------------------------
# Vorhersage
# ---------------------------------------------------------------------------


def predict_arrays(run_dir: Path, crops: list[np.ndarray], device: str = "cpu",
                   return_probs: bool = False) -> list[dict]:
    """Vorhersage für In-Memory-Crops (BGR np.ndarray) — für Live-Inference.

    Gibt je Crop {'pred_label', 'confidence'} in Eingabe-Reihenfolge.
    `return_probs=True` ergänzt 'probs': list[float] (voller Softmax,
    Reihenfolge = Klassen aus der Run-config).
    """
    if not crops:
        return []
    import torch
    from PIL import Image

    from .training.torch_data import build_transform

    model, cfg = load_run(run_dir, device)
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])
    tf = build_transform(out_size, train=False)
    batch = torch.stack([tf(Image.fromarray(c[:, :, ::-1].copy())) for c in crops]).to(device)  # BGR->RGB
    with torch.no_grad():
        logits = model(batch)
        probs = torch.softmax(logits, dim=1)
        conf, idx = probs.max(dim=1)
    results: list[dict] = []
    for i, (c, ix) in enumerate(zip(conf.tolist(), idx.tolist(), strict=False)):
        entry: dict = {"pred_label": classes[int(ix)], "confidence": round(float(c), 4)}
        if return_probs:
            entry["probs"] = [round(float(p), 6) for p in probs[i].tolist()]
        results.append(entry)
    return results


def predict_rows(run_dir: Path, rows: list[dict], device: str = "cpu",
                 batch_size: int = 64) -> list[dict]:
    """Für jede Manifest-Zeile: {'pred_label', 'confidence'} (Reihenfolge wie `rows`)."""
    if not rows:
        return []
    import torch
    from torch.utils.data import DataLoader

    from .training.torch_data import SquareDataset, build_transform

    model, cfg = load_run(run_dir, device)
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
            for c, i in zip(conf.tolist(), idx.tolist(), strict=False):
                results.append({"pred_label": classes[int(i)], "confidence": round(float(c), 4)})
    return results


def predict_frame(run_dir: Path, frame: np.ndarray, corners, profile,
                  device: str = "cpu", return_probs: bool = False) -> list[dict]:
    """Komplette Pipeline für einen Frame: run_spec + crops_for_model + predict_arrays.

    Ergebnis je Feld: {"square": "a8", "pred_label": ..., "confidence": ...[, "probs": ...]}.
    """
    spec = run_spec(run_dir)
    crops = crops_for_model(frame, corners, profile, spec)
    preds = predict_arrays(run_dir, crops, device=device, return_probs=return_probs)
    squares = labeling.all_squares()
    return [{"square": sq, **p} for sq, p in zip(squares, preds, strict=False)]
