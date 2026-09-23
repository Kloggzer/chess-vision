"""Gebackener Pack an den Lesestellen neben `train`/`run_eval` — je ein Test, der OHNE den Fix rot ist.

`gradcam._crop_reader` und die Auswerter unter `scripts/` lasen Pack-Pixel und bauten die
Transformation aus `config.json`: auf einem mit CLAHE gebackenen Pack lief CLAHE ein zweites Mal.
"""
from __future__ import annotations

import json

import numpy as np
import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("torchvision")

from PIL import Image  # noqa: E402
from torchvision.transforms.functional import to_pil_image, to_tensor  # noqa: E402

from chesslab import config  # noqa: E402
from chesslab.training import gradcam  # noqa: E402
from chesslab.training.pack import load_packed  # noqa: E402
from chesslab.training.torch_data import _Clahe, eval_transform_for  # noqa: E402

#: Band bis 255: mit dem Band 25-40 aus `test_pack_bake` faellt die gebackene Zelle aus dem Band,
#: und ein zweites CLAHE waere zufaellig die Identitaet — der Test saehe den Fehler nicht.
PARAMS = {"clip": 2.0, "tile": 8, "min_mean": 0.0, "max_mean": 255.0, "denoise": "off"}


def _baked_pair(paths):
    """`src` mit gueltigem Digest, daraus der gebackene Zwilling `dst`."""
    from chesslab.training import pack as pack_mod
    from chesslab.training.pack_bake import bake_pack
    from test_pack_bake import _crop

    dd = paths.datasets / "src"
    dd.mkdir(parents=True)
    mm = np.memmap(dd / "packed_images.u8", dtype=np.uint8, mode="w+", shape=(4, 80, 80, 3))
    mm[:] = np.stack([_crop(i) for i in range(4)])
    mm.flush()
    del mm
    rows = [{"path": f"data/crops/default/empty/c{i}.webp", "label": "empty"} for i in range(4)]
    (dd / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (dd / "split.json").write_text(json.dumps({"classes": ["empty"]}), encoding="utf-8")
    (dd / "packed_meta.json").write_text(json.dumps(
        {"n": 4, "h": 80, "w": 80, "digest": pack_mod._manifest_digest(rows),
         "paths": [r["path"] for r in rows]}), encoding="utf-8")
    bake_pack("src", "dst", dict(PARAMS), paths=paths)
    return PARAMS


@pytest.fixture
def paths(tmp_path, monkeypatch):
    p = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", p)
    return p


def _run_cfg(params: dict, dataset: str) -> dict:
    return {"classes": ["empty"], "out_size": [80, 80], "dataset": dataset, "head": "combined",
            "backbone": "smallcnn", "pad_side": 0.05, "clahe_clip": params["clip"],
            "clahe_tile": params["tile"], "clahe_min_mean": params["min_mean"],
            "clahe_max_mean": params["max_mean"], "clahe_denoise": params["denoise"]}


class _Seen(torch.nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.inputs: list[torch.Tensor] = []

    def forward(self, x):
        self.inputs.append(x.detach().clone())
        return torch.zeros(x.shape[0], 1)


def test_reliance_on_a_baked_pack_does_not_compute_clahe_a_second_time(paths, monkeypatch):
    params = _baked_pair(paths)
    dd = paths.datasets / "dst"
    rows = [{**json.loads(line), "session_id": "s", "square": f"a{i + 1}"}
            for i, line in enumerate((dd / "manifest.jsonl").read_text("utf-8").splitlines())]
    cfg = _run_cfg(params, "dst")
    model = _Seen()
    monkeypatch.setattr("chesslab.training.evaluate.load_run", lambda _d: (model, dict(cfg)))
    monkeypatch.setattr("chesslab.training.data.load_manifest", lambda _p: rows)
    monkeypatch.setattr("chesslab.training.data.load_split", lambda _p: {"splits": {"test": ["s"]}})
    monkeypatch.setattr("chesslab.training.data.filter_rows_by_split", lambda m, _s, _w: m)

    baked = np.array(np.memmap(dd / "packed_images.u8", dtype=np.uint8, mode="r",
                               shape=(4, 80, 80, 3)))
    once = eval_transform_for({**cfg, "clahe_clip": 0.0})
    twice = eval_transform_for(cfg)
    # Derselbe Umweg wie `reliance_for_run` (Tensor und zurueck), damit nur CLAHE unterscheidet.
    seen = [to_pil_image(to_tensor(Image.fromarray(b))) for b in baked]
    want = [once(img) for img in seen]
    assert any(not torch.equal(w, twice(img)) for w, img in zip(want, seen, strict=True)), \
        "Vorbedingung: ein zweites CLAHE muss die Pixel sichtbar aendern"

    gradcam.reliance_for_run(dd, split="test", per_class=4)
    base = model.inputs[0::3]
    assert len(base) == 4
    for x in base:
        assert any(torch.equal(x[0], w) for w in want), \
            "Grad-CAM misst auf Pixeln, die das Modell nie gesehen hat (CLAHE zweimal)"


def test_the_crop_reader_says_which_pack_it_reads(paths, monkeypatch):
    _baked_pair(paths)
    rows = [json.loads(line) for line in
            (paths.datasets / "dst" / "manifest.jsonl").read_text("utf-8").splitlines()]
    assert gradcam._crop_reader("dst", rows).packed is not None
    assert gradcam._crop_reader(None, rows).packed is None


def test_cfg_for_pack_drops_clahe_only_on_a_baked_pack(paths, monkeypatch):
    from chesslab.training.pack_bake import cfg_for_pack

    params = _baked_pair(paths)
    cfg = _run_cfg(params, "dst")
    assert cfg_for_pack(cfg, "dst", load_packed("dst", paths))["clahe_clip"] == 0.0
    assert cfg_for_pack(cfg, "src", load_packed("src", paths)) is cfg, "roher Pack: CLAHE bleibt"
    assert cfg_for_pack(cfg, "dst", None) is cfg, "ohne Pack liest der Loader rohe Dateien"
    with pytest.raises(ValueError, match="input-size"):
        cfg_for_pack(cfg, "dst", load_packed("dst", paths), out_size=(96, 96))


def test_the_baked_pixels_really_are_clahe_once(paths, monkeypatch):
    """Sonst bewiese der erste Test nur, dass zwei Wege gleich falsch rechnen."""
    params = _baked_pair(paths)
    src = np.array(np.memmap(paths.datasets / "src" / "packed_images.u8", dtype=np.uint8,
                             mode="r", shape=(4, 80, 80, 3)))
    dst = np.array(np.memmap(paths.datasets / "dst" / "packed_images.u8", dtype=np.uint8,
                             mode="r", shape=(4, 80, 80, 3)))
    clahe = _Clahe(**params)
    for s, d in zip(src, dst, strict=True):
        assert np.array_equal(np.asarray(clahe(Image.fromarray(s))), d)
