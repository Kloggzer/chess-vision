"""Funde vom 2026-09-22 im Trainingsweg — je ein Test, der OHNE den Fix rot ist.

Alle drei sitzen in `training/gradcam.py`, dem Messweg hinter `chesslab reliance`: eine
Coverage-Spalte wird als Klasse gelesen, der Zuschnitt kommt vom Profil statt vom Lauf, und
benotet werden Zellen, die der Verlust maskiert hat.
"""
from __future__ import annotations

import json

import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("torchvision")

from PIL import Image  # noqa: E402

from chesslab import config  # noqa: E402
from chesslab.training import gradcam  # noqa: E402


class _Fixed(torch.nn.Module):
    """Liefert immer dieselben Logits — die letzte Spalte ist die Coverage des Occlusion-Kopfs."""

    def __init__(self, logits: list[float]) -> None:
        super().__init__()
        self.logits = logits

    def forward(self, x):
        return torch.tensor([self.logits], dtype=torch.float32).repeat(x.shape[0], 1)


def _wire(tmp_path, monkeypatch, model, cfg, rows):
    """`reliance_for_run` ohne Platte: Modell, Manifest und Crop-Leser sind gestellt."""
    monkeypatch.setattr("chesslab.training.evaluate.load_run", lambda _d: (model, cfg))
    Image.new("RGB", (24, 24), (120, 90, 60)).save(tmp_path / "c.png")
    for r in rows:
        r.setdefault("path", str(tmp_path / "c.png"))
    (tmp_path / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    monkeypatch.setattr(gradcam, "_crop_reader", lambda _n, _r: lambda r: Image.open(r["path"]))
    monkeypatch.setattr("chesslab.training.data.load_manifest", lambda _p: rows)
    monkeypatch.setattr("chesslab.training.data.load_split", lambda _p: {"splits": {"test": ["s"]}})
    monkeypatch.setattr("chesslab.training.data.filter_rows_by_split", lambda m, _s, _w: m)


def test_the_coverage_column_is_not_a_class(tmp_path, monkeypatch):
    """Der Occlusion-Kopf haengt eine SIGMOID-Coverage neben die 13 Klassen (`run_export`:
    "a consumer reading `classes.size` logits off a graph one wider would softmax the coverage
    into every probability"). `reliance_for_run` tat genau das — 50 der 59 Laeufe auf der Platte
    tragen `head: occlusion`."""
    classes = list(config.IDENTITY_CLASSES)
    # wP sicher (10 gegen 0), die Coverage-Spalte weit darueber: im Softmax ueber 14 Spalten
    # bleibt von den 1,00 der Klasse nichts uebrig.
    logits = [0.0] * len(classes) + [40.0]
    logits[classes.index("wP")] = 10.0
    cfg = {"classes": classes, "out_size": [16, 16], "head": "occlusion", "pad_side": 0.05}
    rows = [{"label": "wP", "session_id": "s", "square": "e2", "coverage": 0.0}]
    _wire(tmp_path, monkeypatch, _Fixed(logits), cfg, rows)

    stats = gradcam.reliance_for_run(tmp_path, split="test", per_class=1)

    base = next(s["base_prob"] for s in stats if s["cls"] == "wP")
    assert base > 0.9, (f"base_prob {base} — die Coverage-Spalte wurde in den Softmax genommen "
                        "und hat die Klassenwahrscheinlichkeit aufgefressen")


def test_the_crop_composition_comes_from_the_run_not_from_this_machine(tmp_path, monkeypatch):
    """`train`/`run_export` schreiben `pad_side` in die `config.json`, damit ein Verbraucher NICHT
    das Profil seiner eigenen Maschine nimmt (specs/45). Die Mittenmaske tat es trotzdem."""
    classes = list(config.IDENTITY_CLASSES)
    cfg = {"classes": classes, "out_size": [16, 16], "pad_side": 0.25}
    rows = [{"label": "wP", "session_id": "s", "square": "e2", "coverage": 0.0}]
    _wire(tmp_path, monkeypatch, _Fixed([0.0] * len(classes)), cfg, rows)
    seen: list[float] = []
    real = gradcam._center_mask
    monkeypatch.setattr(gradcam, "_center_mask",
                        lambda h, w, frac: (seen.append(frac), real(h, w, frac))[1])

    gradcam.reliance_for_run(tmp_path, split="test", per_class=1)

    want = 1.0 / (1.0 + 2.0 * 0.25)
    assert seen and abs(seen[0] - want) < 1e-9, (
        f"Mittenmaske auf {seen} statt {want:.4f} — gerechnet mit dem Profil dieser Maschine "
        f"(pad_side {config.CROP.pad_side})")


def test_a_masked_cell_does_not_get_graded(tmp_path, monkeypatch):
    """Benotet wird, was der Verlust auch lernt (CLAUDE.md, 2026-08-24). `reliance_for_run` zog
    seine Stichprobe aus ALLEN Zeilen: auf `real13-test-v1-128` sind 7,6 % ueber
    `PIECE_VISIBLE_MAX`, und zwar weiss 11-15 % gegen schwarz 2-7 % — die WEAK-Marke je Klasse
    liefe damit je Klasse auf einer anderen Zellmenge."""
    classes = list(config.IDENTITY_CLASSES)
    cfg = {"classes": classes, "out_size": [16, 16], "pad_side": 0.05}
    rows = [{"label": "wP", "session_id": "s", "square": "e2", "coverage": 0.0},
            {"label": "wP", "session_id": "s", "square": "e3", "coverage": 0.9},
            {"label": "wP", "session_id": "s", "square": "e4", "coverage": 0.9},
            {"label": "wK", "session_id": "s", "square": "e1", "coverage": 0.9}]
    _wire(tmp_path, monkeypatch, _Fixed([0.0] * len(classes)), cfg, rows)

    stats = gradcam.reliance_for_run(tmp_path, split="test", per_class=4)

    by_cls = {s["cls"]: s["n"] for s in stats}
    assert by_cls.get("wP") == 1, f"wP auf {by_cls.get('wP')} Zellen benotet — zwei davon maskiert"
    assert "wK" not in by_cls, "wK hat keine einzige benotungsfaehige Zelle und steht trotzdem da"
