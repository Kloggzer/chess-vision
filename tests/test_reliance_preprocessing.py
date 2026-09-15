"""`reliance_for_run` misst unter der Vorverarbeitung des LAUFS, nicht unter ImageNet von Hand.

`eval_transform_for` sagt im eigenen Docstring, es sei die eine Stelle, aus der Auswertung,
Kalibrierung und Serving ihre Transformation holen — „reconstructing it by hand is how they
drift". `reliance_for_run` baute sie nach: ein `gray+sobel`-Lauf fuettert 2 Kanaele in einen Stamm,
der 3 bekam, und ein CLAHE-Lauf (das Standardmodell) wurde in einer fremden Domaene gemessen.
"""
from __future__ import annotations

import json

import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("torchvision")

from PIL import Image  # noqa: E402

from chesslab import config  # noqa: E402
from chesslab.training import gradcam  # noqa: E402


class _Stem(torch.nn.Module):
    """Zaehlt, mit wie vielen Kanaelen und in welcher Groesse das Modell wirklich gefuettert wird."""

    def __init__(self, classes: int):
        super().__init__()
        self.seen: list[tuple[int, int, int]] = []
        self.classes = classes

    def forward(self, x):
        self.seen.append((x.shape[1], x.shape[2], x.shape[3]))
        return torch.zeros(x.shape[0], self.classes)


def _run(tmp_path, monkeypatch, cfg_extra: dict):
    classes = list(config.IDENTITY_CLASSES)
    cfg = {"classes": classes, "out_size": [16, 16], **cfg_extra}
    model = _Stem(len(classes))
    monkeypatch.setattr(gradcam, "load_run", lambda _d: (model, cfg), raising=False)
    monkeypatch.setattr("chesslab.training.evaluate.load_run", lambda _d: (model, cfg))

    rows = [{"label": c, "path": str(tmp_path / "c.png"), "session_id": "s"} for c in classes[:2]]
    Image.new("RGB", (24, 24), (120, 90, 60)).save(tmp_path / "c.png")
    manifest = tmp_path / "manifest.jsonl"
    manifest.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    monkeypatch.setattr(gradcam, "_crop_reader", lambda _n, _r: lambda r: Image.open(r["path"]))
    monkeypatch.setattr("chesslab.training.data.load_manifest", lambda _p: rows)
    monkeypatch.setattr("chesslab.training.data.load_split", lambda _p: {"splits": {"test": ["s"]}})
    monkeypatch.setattr("chesslab.training.data.filter_rows_by_split", lambda m, s, split: m)

    gradcam.reliance_for_run(tmp_path, split="test", per_class=1)
    return model.seen


def test_a_gray_sobel_run_is_fed_the_channels_it_was_trained_with(tmp_path, monkeypatch):
    seen = _run(tmp_path, monkeypatch, {"input_repr": "gray+sobel"})

    assert seen, "das Modell wurde gar nicht gerufen"
    assert {c for c, _, _ in seen} == {2}, f"2 Kanaele erwartet, gesehen: {sorted({c for c, _, _ in seen})}"


def test_the_graph_size_decides_not_the_size_the_crops_were_built_at(tmp_path, monkeypatch):
    seen = _run(tmp_path, monkeypatch, {"infer_size": [8, 8]})

    assert {(h, w) for _, h, w in seen} == {(8, 8)}, f"gesehen: {sorted({(h, w) for _, h, w in seen})}"
