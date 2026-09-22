"""Bug-Hunt 2026-09-23: drei Skripte lasen keinen Session-Pack-Satz (`mm://`), seit 2026-09-11.

Ein kleiner Satz aus ZWEI Packs, dessen Manifest die Pack-Reihenfolge umdreht: wer nach Position
statt nach Pfad liest, paart Bild i mit Label j und faellt hier auf.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pytest

from chesslab import config
from chesslab.training import packs

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
CLASSES = ["empty", "wP", "wK"]
SIDE = 8
# (label, square, square_color, coverage, brightness) — Zeile 5 verdeckt, Zeile 6 zu dunkel.
CELLS = (("wP", "e2", "light", 0.0, 120.0), ("wK", "e1", "dark", 0.0, 120.0),
         ("empty", "c4", "light", 0.0, 150.0), ("empty", "d4", "light", 0.0, 150.0),
         ("empty", "f4", "light", None, 150.0), ("wP", "d2", "light", 0.5, 120.0),
         ("wK", "a1", "dark", 0.0, 10.0), ("empty", "b1", "dark", 0.0, 60.0))
PACKS = {"s1-8": ("s1", 0), "s2-8": ("s2", 1)}


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"bh23p_{name}", SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _colour(pack_no: int, row_no: int) -> tuple[int, int, int]:
    return 50 + 100 * pack_no, 5 + 10 * row_no, 30


def _write_pack(paths: config.Paths, name: str) -> list[dict]:
    sid, pack_no = PACKS[name]
    d = paths.packs / name
    d.mkdir(parents=True)
    rows = [{"path": f"mm://{name}/0000/{sq}", "label": lab, "session_id": sid, "frame": "0000",
             "square": sq, "square_color": col, "coverage": cov, "brightness": br,
             "out_size": [16, 16]}                    # der Manifest-Wert, NICHT die Packgroesse
            for lab, sq, col, cov, br in CELLS]
    (d / "manifest.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    packs.write_meta(d, rows, SIDE, SIDE)
    (d / packs._IMAGE).write_bytes(b"".join(
        np.full((SIDE, SIDE, 3), _colour(pack_no, i), np.uint8).tobytes() for i in range(len(rows))))
    return rows


@pytest.fixture
def pack_set(tmp_path, monkeypatch):
    """Datensatz `ds` aus zwei Session-Packs, Zeilen in UMGEKEHRTER Pack-Reihenfolge."""
    from chesslab.dataset import compute_class_weights

    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    rows = [r for name in PACKS for r in _write_pack(paths, name)][::-1]
    dd = paths.datasets / "ds"
    dd.mkdir(parents=True)
    (dd / "manifest.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (dd / "dataset.yaml").write_text("name: ds\npacks: [s1-8, s2-8]\n", encoding="utf-8")
    counts = {c: sum(r["label"] == c for r in rows) for c in CLASSES}
    (dd / "split.json").write_text(json.dumps({
        "classes": CLASSES, "class_weights": compute_class_weights(counts, CLASSES),
        "splits": {"train": ["s1", "s2"], "val": ["s1", "s2"], "test": []}}), encoding="utf-8")
    return rows


def _expected_colour(row: dict) -> tuple[int, int, int]:
    name = packs.pack_name_of(row["path"])
    return _colour(PACKS[name][1], [c[1] for c in CELLS].index(row["square"]))


# --- session_colour ---------------------------------------------------------------------------

def test_session_colour_reads_session_packs(pack_set, monkeypatch, capsys):
    mod = _load("session_colour")
    monkeypatch.setattr(sys, "argv", ["session_colour", "--dataset", "ds", "--per-session", "2"])
    mod.main()
    got = {line.split()[0]: line.split()[1:] for line in capsys.readouterr().out.splitlines()[1:]}
    # Je Session drei helle `empty`, gekappt auf zwei. Zeilen umgekehrt: f4 (G 45) und d4 (G 35).
    assert set(got) == {"s1", "s2"}
    for sid, red in (("s1", 50.0), ("s2", 150.0)):
        n, r_, g_, b_, rb, _lum = got[sid]
        assert int(n) == 2
        assert (float(r_), float(g_), float(b_)) == (red, 40.0, 30.0)
        assert float(rb) == pytest.approx(red / 30.0, abs=1e-3)


# --- gradcam_summary --------------------------------------------------------------------------

def test_gradcam_summary_reads_session_packs(pack_set, tmp_path, monkeypatch, capsys):
    torch = pytest.importorskip("torch")
    from PIL import Image
    from torch import nn

    mod = _load("gradcam_summary")
    model = nn.Sequential(nn.Conv2d(3, 4, 3, padding=1), nn.AdaptiveAvgPool2d(1),
                          nn.Flatten(), nn.Linear(4, len(CLASSES) + 1))
    with torch.no_grad():
        model[3].bias.zero_()
    cfg = {"classes": CLASSES, "out_size": [16, 16], "head": "occlusion"}
    monkeypatch.setattr(mod, "load_run", lambda _r: (model, cfg))
    out, size = tmp_path / "out", 16
    monkeypatch.setattr(sys, "argv", ["gradcam_summary", str(tmp_path / "run"), "--dataset", "ds",
                                      "--out", str(out), "--examples", "10", "--size", str(size)])
    assert mod.main() == 0
    occupied = [r for r in pack_set if r["label"] != "empty"]
    assert f"[i] {len(occupied)} besetzte Zellen" in capsys.readouterr().out
    sheet = np.asarray(Image.open(out / "run-beispiele.png").convert("RGB"))
    for i, row in enumerate(occupied):
        x = 4 + i * (size + 4) + size // 2
        assert tuple(sheet[4 + size // 2, x]) == _expected_colour(row), row["path"]


def test_gradcam_summary_still_refuses_unresolvable_mm_rows(pack_set, tmp_path, monkeypatch):
    mod = _load("gradcam_summary")
    (config.DATA.datasets / "ds" / "dataset.yaml").write_text("name: ds\n", encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["gradcam_summary", str(tmp_path / "run"), "--dataset", "ds",
                                      "--out", str(tmp_path / "out")])
    with pytest.raises(SystemExit) as exc:
        mod.main()
    assert "mm://" in str(exc.value)


# --- lr_range_test: Pack-Leser UND der Verlust, der wirklich faehrt ----------------------------

def _range_args(**kw) -> argparse.Namespace:
    base = {"dataset": "ds", "split": "split.json", "backbone": "mobilenetv4_conv_small_035",
            "seed": 42, "erase_p": 0.0, "head": "occlusion"}
    return argparse.Namespace(**{**base, **kw})


def test_lr_range_test_reads_packs_by_path_at_the_packs_size(pack_set):
    pytest.importorskip("torch")
    mod = _load("lr_range_test")
    ds, _crit, _classes, train_rows, _board, n_out = mod.prepare(_range_args())
    assert len(train_rows) == len(ds) == 2 * len(CELLS) and n_out == len(CLASSES) + 1
    names = [Path(f).parent.name for f, _ in ds._files]
    for (p, j), row in zip(ds.idx, train_rows, strict=True):
        assert packs.read_pack(names[p], config.DATA).paths[j] == row["path"]
    assert tuple(ds[0][0].shape[-2:]) == (SIDE, SIDE)         # Pack, nicht Manifest (16)


def test_lr_range_test_loss_is_the_occlusion_loss_train_runs(pack_set):
    torch = pytest.importorskip("torch")
    from chesslab.dataset import compute_class_weights
    from chesslab.training.train import visible_class_counts

    mod = _load("lr_range_test")
    ds, crit, _classes, train_rows, _board, n_out = mod.prepare(_range_args())
    want = compute_class_weights(visible_class_counts(train_rows), CLASSES)
    assert crit.ce.weight.tolist() == pytest.approx([want[c] for c in CLASSES])
    y = torch.stack([ds[i][1] for i in range(len(ds))])
    _piece, visible, _cov, n_cov = crit.validation_terms(torch.zeros(len(ds), n_out), y)
    # Je Session fallen d2 (Coverage 0,5) und a1 (Helligkeit 10) aus dem Klassenverlust.
    assert float(visible) == 2 * (len(CELLS) - 2) and n_cov == len(ds)


def test_lr_range_test_combined_head_keeps_the_ce_recipe(pack_set):
    pytest.importorskip("torch")
    from torch import nn

    mod = _load("lr_range_test")
    _ds, crit, _classes, _rows, _board, n_out = mod.prepare(_range_args(head="combined"))
    assert isinstance(crit, nn.CrossEntropyLoss) and n_out == len(CLASSES)


def test_fixture_is_not_a_single_pack_in_order(pack_set):
    """Ohne diese beiden Eigenschaften faende der Pfad-Test keinen Positionsfehler."""
    assert len({packs.pack_name_of(r["path"]) for r in pack_set}) == 2
    assert packs.pack_name_of(pack_set[0]["path"]) == "s2-8"


def test_the_door_brings_the_digest_guard(pack_set, monkeypatch):
    """Ein Pack, dessen Manifest weitergezogen ist, wird verweigert statt fremd gepaart."""
    man = config.DATA.packs / "s1-8" / "manifest.jsonl"
    man.write_text(man.read_text(encoding="utf-8").replace('"wK"', '"wQ"', 1), encoding="utf-8")
    mod = _load("session_colour")
    monkeypatch.setattr(sys, "argv", ["session_colour", "--dataset", "ds"])
    with pytest.raises(ValueError, match="digest"):
        mod.main()
