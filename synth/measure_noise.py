"""Measure the crop-level high-frequency (sensor-noise) energy of real vs synthetic crops.

Motivation: a synthetic crop that is *smoother* than any real crop is trivially separable
from real material, and a network will happily learn that shortcut. The quantity that
captures it is the energy **above** the optics cutoff — everything the lens could not have
produced, i.e. sensor noise plus JPEG grain:

    hf(crop) = std( gray - GaussianBlur(gray, sigma=1.2) )

`empty` crops only, so piece texture cannot confound the comparison. The interesting
statistic is not the mean but the **distribution**: p10 is the cleanest tenth (the tail this
number exists for), p50 the typical crop, p90 the noisiest.

Sources:

    # a directory of crop images (e.g. the sliced real squares of one class)
    uv run python synth/measure_noise.py data/squares/empty --n 400

    # a built dataset: packed memmap (mm:// rows) or crop-file rows, filtered by label
    uv run python synth/measure_noise.py data/datasets/occ-synth --label empty --n 400
    uv run python synth/measure_noise.py data/datasets/occ-real3 --sessions 20260630,20260722

Sampling is seeded, so two runs over the same source are comparable.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import cv2
import numpy as np

from chesslab.ioutil import read_jsonl
from chesslab.training.pack import _manifest_digest
from chesslab.training.packs import MM_PREFIX

#: Optics cutoff. Everything above it is noise, not lens signal — the real webcam's blur
#: kernel is well below this, so a real crop keeps its grain while a clean render has none.
HF_SIGMA = 1.2


def hf_energy(bgr: np.ndarray, sigma: float = HF_SIGMA) -> float:
    """Std of the residual after a sigma-blur: the crop's energy above the optics cutoff."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return float((gray - cv2.GaussianBlur(gray, (0, 0), sigma)).std())


def percentiles(values) -> tuple[float, float, float]:
    """(p10, p50, p90) of the sample."""
    p10, p50, p90 = np.percentile(np.asarray(values, dtype=np.float64), [10, 50, 90])
    return float(p10), float(p50), float(p90)


def _sample(seq: list, n: int, seed: int) -> list:
    picked = list(seq)
    random.Random(seed).shuffle(picked)
    return picked[:n] if n > 0 else picked


def crops_from_dir(d: Path, n: int, seed: int) -> list[np.ndarray]:
    files = sorted(p for p in d.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg"))
    if not files:
        raise ValueError(f"no crop images in {d}")
    out = []
    for f in _sample(files, n, seed):
        img = cv2.imread(str(f))
        if img is not None:
            out.append(img)
    return out


def _packed_source(ds: Path, meta: dict) -> Path:
    """Where this dataset's pixels actually live — a LINK has no memmap of its own."""
    owner = meta.get("packed_from")
    return (ds.parent / owner if owner else ds) / "packed_images.u8"


def crops_from_dataset(ds: Path, label: str, n: int, seed: int,
                       sessions: tuple[str, ...] = ()) -> list[np.ndarray]:
    """Rows of `label` from a built dataset — packed memmap if present, else crop files."""
    rows = read_jsonl(ds / "manifest.jsonl")
    idx = [i for i, r in enumerate(rows)
           if r["label"] == label
           and (not sessions or any(r["session_id"].startswith(s) for s in sessions))]
    if not idx:
        raise ValueError(f"no '{label}' rows in {ds}"
                         + (f" for sessions {sessions}" if sessions else ""))
    picked = _sample(idx, n, seed)
    meta_path = ds / "packed_meta.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        # `meta["paths"]` is the memmap order, the manifest is NOT: a link addresses its owner's
        # superset and a pruned manifest has dropped rows. Reading by row number then measures
        # somebody else's crops and calls the number a measurement.
        if meta.get("digest") != _manifest_digest(rows):
            raise ValueError(f"{ds}: the pack does not match this manifest — re-pack before "
                             f"measuring (a pack is immutable, not automatically current).")
        path2idx = {p: i for i, p in enumerate(meta["paths"])}
        mm = np.memmap(_packed_source(ds, meta), dtype=np.uint8, mode="r",
                       shape=(meta["n"], meta["h"], meta["w"], 3))
        # The memmap stores RGB (see synth_build); hf_energy expects BGR.
        return [np.ascontiguousarray(mm[path2idx[rows[i]["path"]]][:, :, ::-1]) for i in picked]
    if str(rows[0].get("path", "")).startswith(MM_PREFIX):
        return _crops_from_session_packs([rows[i] for i in picked])
    root = Path(__file__).resolve().parents[1]
    out = []
    for i in picked:
        img = cv2.imread(str(root / rows[i]["path"]))
        if img is not None:
            out.append(img)
    # Ein halb gelesener Satz ist kein Messwert: die Perzentile stuenden dann auf dem Rest,
    # ohne dass die Zahl sagt, wovon.
    if len(out) != len(picked):
        raise ValueError(f"{ds}: {len(picked) - len(out)} of {len(picked)} crop files "
                         f"could not be read — re-slice before measuring")
    return out


def _crops_from_session_packs(picked: list[dict]) -> list[np.ndarray]:
    """`mm://`-Zeilen ueber die Session-Packs lesen — die v6-Saetze zitieren ihre Pixel nur."""
    from chesslab import config
    from chesslab.training.packs import resolve_packs

    multi = resolve_packs(picked, config.DATA)
    maps = [np.memmap(f, dtype=np.uint8, mode="r", shape=shape + (3,))
            for f, shape in multi.files]
    return [np.ascontiguousarray(maps[p][r][:, :, ::-1]) for p, r in multi.idx]


def measure(source: str | Path, *, label: str = "empty", n: int = 400, seed: int = 42,
            sessions: tuple[str, ...] = (), sigma: float = HF_SIGMA) -> dict:
    src = Path(source)
    if (src / "manifest.jsonl").exists():
        crops = crops_from_dataset(src, label, n, seed, sessions)
    else:
        crops = crops_from_dir(src, n, seed)
    values = [hf_energy(c, sigma) for c in crops]
    p10, p50, p90 = percentiles(values)
    return {"source": str(src), "n": len(values), "p10": p10, "p50": p50, "p90": p90,
            "mean": float(np.mean(values)), "values": values}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="+", help="crop directory or dataset directory")
    ap.add_argument("--label", default="empty", help="label to keep (dataset sources only)")
    ap.add_argument("--sessions", default="", help="comma-separated session_id prefixes to keep")
    ap.add_argument("--n", type=int, default=400, help="sample size (0 = all)")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--sigma", type=float, default=HF_SIGMA)
    a = ap.parse_args()
    sessions = tuple(s for s in a.sessions.split(",") if s)
    print(f"high-frequency energy (std of residual after sigma={a.sigma} blur), "
          f"label={a.label!r}")
    print(f"{'source':<44} {'n':>5} {'p10':>7} {'p50':>7} {'p90':>7}")
    for s in a.source:
        r = measure(s, label=a.label, n=a.n, seed=a.seed, sessions=sessions, sigma=a.sigma)
        print(f"{r['source']:<44} {r['n']:>5} {r['p10']:>7.2f} {r['p50']:>7.2f} "
              f"{r['p90']:>7.2f}")


if __name__ == "__main__":
    main()
