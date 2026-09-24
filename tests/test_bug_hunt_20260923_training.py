"""Mutationsprobe auf `src/chesslab/training/`: ungedeckte Wachen und Funde."""
from __future__ import annotations

import json

import numpy as np
import pytest
from PIL import Image

from conftest import write_jsonl

CROP = 64


def _dataset(root, name, classes, labels, *, coverage=None):
    """Ein Brett je Session, eine Zeile je Label; `split.json` nennt `classes` wie der Lauf."""
    dd = root / "datasets" / name
    (dd / "squares").mkdir(parents=True)
    rows = []
    for i, label in enumerate(labels):
        p = dd / "squares" / f"s1_{i}.png"
        Image.fromarray(np.full((CROP, CROP, 3), 30 * i % 255, dtype=np.uint8)).save(p)
        row = {"path": p.as_posix(), "label": label, "session_id": "s1", "frame": "000001",
               "square": f"a{i + 1}", "out_size": [CROP, CROP]}
        if coverage is not None:
            row["coverage"] = coverage[i]
        rows.append(row)
    write_jsonl(dd / "manifest.jsonl", rows)
    (dd / "split.json").write_text(json.dumps({
        "classes": list(classes), "splits": {"train": [], "val": [], "test": ["s1"]}}),
        encoding="utf-8")


def _run(tmp_path, dataset, classes):
    import torch

    from chesslab.training.model import build_model

    run_dir = tmp_path / "run"
    run_dir.mkdir()
    model = build_model("smallcnn", len(classes), norm="batchnorm", head="combined")
    torch.save(model.state_dict(), str(run_dir / "best.pt"))
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": "smallcnn", "classes": list(classes), "out_size": [CROP, CROP],
        "norm": "batchnorm", "head": "combined", "dataset": dataset}), encoding="utf-8")
    return run_dir


def test_a_class_without_a_single_graded_cell_has_no_recall(tmp_path, paths):
    """Fund 1: `recall` schrieb fuer eine Klasse ohne Zelle 0,0 — ungemessen als "nie erkannt".

    Die Zeile geht woertlich nach `model_card.json["metrics"]`, und `ModelCard.kt` laesst `null`
    dort bewusst aus der "lowest recall"-Zeile; eine 0,0 fuehrte sie an.
    """
    from chesslab.training.evaluate import run_eval

    classes = ["empty", "wP", "bK"]
    _dataset(tmp_path, "d", classes, ["empty", "wP", "empty", "wP"])
    run_dir = _run(tmp_path, "d", classes)

    assert run_eval(str(run_dir), split_name="test") == 0

    recall = json.loads((run_dir / "eval_test.json").read_text(encoding="utf-8"))["recall"]
    assert recall["bK"] is None
    assert recall["empty"] is not None and recall["wP"] is not None


def test_a_class_seen_only_under_a_hand_is_unmeasured_too(tmp_path, paths):
    """Dieselbe Leitung ueber die Maske: `recall` rechnet auf den SICHTBAREN Zellen."""
    from chesslab.training.evaluate import run_eval

    classes = ["empty", "wP", "bK"]
    _dataset(tmp_path, "d", classes, ["empty", "wP", "bK", "wP"],
             coverage=[0.0, 0.0, 0.9, 0.0])
    run_dir = _run(tmp_path, "d", classes)

    assert run_eval(str(run_dir), split_name="test") == 0

    recall = json.loads((run_dir / "eval_test.json").read_text(encoding="utf-8"))["recall"]
    assert recall["bK"] is None


def test_eval_json_grades_only_visible_cells(tmp_path, paths):
    """M37 (ungedeckt, genau die Wache, die der abgebrochene Lauf ausgehebelt liegen liess).

    Die einzige Figur liegt unter der Hand: sichtbar ist keine besetzte Zelle, also ist
    `visible_piece_acc` ungemessen — ungefiltert waere es eine Zahl ueber die verdeckte Zelle.
    """
    from chesslab.training.evaluate import run_eval

    classes = ["empty", "wP"]
    _dataset(tmp_path, "d", classes, ["empty", "wP", "empty"], coverage=[0.0, 0.9, 0.0])
    run_dir = _run(tmp_path, "d", classes)

    assert run_eval(str(run_dir), split_name="test") == 0

    out = json.loads((run_dir / "eval_test.json").read_text(encoding="utf-8"))
    assert out["visible_piece_acc"] is None
    assert out["piece_acc"] is not None


def _write_split(dd, name, test):
    (dd / name).write_text(json.dumps({"classes": ["empty", "wP"],
                                       "splits": {"train": [], "val": [], "test": test}}),
                           encoding="utf-8")


def _two_session_dataset(root):
    """Zwei Aufnahmen in einem Datensatz; `split.json` testet s1."""
    dd = root / "datasets" / "d"
    (dd / "squares").mkdir(parents=True)
    rows = []
    for sid in ("s1", "s2"):
        for i, label in enumerate(("empty", "wP")):
            p = dd / "squares" / f"{sid}_{i}.png"
            Image.fromarray(np.full((CROP, CROP, 3), 60 * i, dtype=np.uint8)).save(p)
            rows.append({"path": p.as_posix(), "label": label, "session_id": sid,
                         "frame": "000001", "square": f"a{i + 1}", "out_size": [CROP, CROP]})
    write_jsonl(dd / "manifest.jsonl", rows)
    _write_split(dd, "split.json", ["s1"])
    return dd


def test_a_fold_run_is_measured_on_its_own_split(tmp_path, paths):
    """M49 (ungedeckt): ohne `--dataset` misst der Lauf SEINEN Split, nicht den des Korpus."""
    from chesslab.training.evaluate import run_eval

    dd = _two_session_dataset(tmp_path)
    _write_split(dd, "split-f1.json", ["s2"])
    run_dir = _run(tmp_path, "d", ["empty", "wP"])
    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    (run_dir / "config.json").write_text(json.dumps({**cfg, "split_file": "split-f1.json"}),
                                         encoding="utf-8")

    assert run_eval(str(run_dir), split_name="test") == 0

    out = json.loads((run_dir / "eval_test.json").read_text(encoding="utf-8"))
    assert set(out["per_session"]) == {"s2"}


def test_a_pinned_split_must_be_named(tmp_path, paths):
    """M45 (ungedeckt): liegt `split-pin.json` daneben, misst `eval` nicht still gegen `split.json`."""
    from chesslab.training.evaluate import run_eval

    dd = _two_session_dataset(tmp_path)
    _write_split(dd, "split-pin.json", ["s2"])
    run_dir = _run(tmp_path, "d", ["empty", "wP"])

    assert run_eval(str(run_dir), split_name="test") == 1
    assert not (run_dir / "eval_test.json").exists()
    assert run_eval(str(run_dir), split_name="test", split_file="split-pin.json") == 0


def test_a_frozen_session_is_not_spent_by_accident(tmp_path, paths):
    """M48 (ungedeckt): eine eingefrorene Aufnahme wird nur mit `--burn-frozen` gemessen."""
    from chesslab.training.evaluate import run_eval

    _two_session_dataset(tmp_path)
    (tmp_path / "TEST-USED.json").write_text(json.dumps({"frozen": ["s1"]}), encoding="utf-8")
    run_dir = _run(tmp_path, "d", ["empty", "wP"])

    assert run_eval(str(run_dir), split_name="test") == 1
    assert not (run_dir / "eval_test.json").exists()
    assert run_eval(str(run_dir), split_name="test", burn_frozen=True) == 0


def test_session_spread_skips_an_unmeasured_session():
    """M43 (ungedeckt): eine Aufnahme ohne Figur traegt `None`, und das ist kein Minimum."""
    from chesslab.training.evaluate import session_spread

    spread = session_spread({"a": {"visible_piece_acc": 0.9}, "b": {"visible_piece_acc": 0.7},
                             "c": {"visible_piece_acc": None}})

    assert spread["visible_piece_acc"]["n"] == 2
    assert spread["visible_piece_acc"]["min"] == pytest.approx(0.7)


torch = pytest.importorskip("torch")
EVAL_CLASSES = ["empty", "wP", "bK"]


class _Rows(torch.utils.data.Dataset):
    """Je Zeile (Vorhersage, Logit-Hoehe) als `x`; `extra_rows` macht `rows` laenger als den Satz."""

    def __init__(self, rows, labels, preds, scales, extra_rows=0):
        self.rows = rows + [dict(rows[0]) for _ in range(extra_rows)]
        self._n = len(rows)
        self.labels, self.preds, self.scales = labels, preds, scales

    def __len__(self):
        return self._n

    def __getitem__(self, i):
        return (torch.tensor([float(self.preds[i]), float(self.scales[i])]),
                torch.tensor(self.labels[i], dtype=torch.long))


class _Echo(torch.nn.Module):
    def forward(self, x):
        out = torch.zeros(x.shape[0], len(EVAL_CLASSES))
        out[torch.arange(x.shape[0]), x[:, 0].long()] = x[:, 1]
        return out


def _evaluate(labels, preds, scales, coverage, extra_rows=0):
    from chesslab.training.engine import evaluate_dataset

    rows = [{"session_id": "s", "frame": "1", "square": f"a{i}", "coverage": c}
            for i, c in enumerate(coverage)]
    ds = _Rows(rows, labels, preds, scales, extra_rows)
    return evaluate_dataset(_Echo(), ds, "cpu", num_workers=0, keep_workers=False)


def test_macro_recall_averages_only_classes_that_occur():
    """M14 (ungedeckt): ohne `bK` im Val zaehlte dessen Recall als 0 in den Mittelwert."""
    res = _evaluate([0, 1, 1], [0, 1, 1], [5.0] * 3, [0.0] * 3)

    assert res["macro_recall"] == pytest.approx(1.0)


def test_conf_wrong_counts_only_visible_errors():
    """M18 (ungedeckt): der bestehende Test hatte keinen SICHTBAREN Fehler, 0,0 blieb stehen."""
    res = _evaluate([1, 1, 0], [0, 0, 0], [8.0, 1.0, 5.0], [0.0, 0.9, 0.0])

    visible_wrong = float(torch.softmax(torch.tensor([8.0, 0.0, 0.0]), 0).max())
    assert res["conf_wrong"] == pytest.approx(visible_wrong)


def test_rows_and_labels_must_line_up():
    """M20 (ungedeckt): mehr Zeilen als Labels hiesse verschobene Paare in `board_acc`."""
    with pytest.raises(ValueError, match="rows but evaluation produced"):
        _evaluate([0, 1], [0, 1], [5.0, 5.0], [0.0, 0.0], extra_rows=1)


def test_auroc_without_a_single_error_is_chance_not_zero():
    """M30 (ungedeckt): ohne Fehler ist nichts zu trennen — 0,0 hiesse "perfekt falsch sortiert"."""
    from chesslab.training.data import confidence_auroc

    assert confidence_auroc([0, 1], [0, 1], [0.9, 0.8]) == 0.5
    assert confidence_auroc([0, 1], [1, 0], [0.9, 0.8]) == 0.5


def test_auroc_ties_take_average_ranks():
    """M31 (ungedeckt): gleich sichere Zellen trennen nichts, egal in welcher Reihenfolge."""
    from chesslab.training.data import confidence_auroc

    assert confidence_auroc([0, 0, 0, 0], [0, 1, 0, 1], [0.7] * 4) == pytest.approx(0.5)
    assert confidence_auroc([0, 0, 0, 0], [1, 0, 1, 0], [0.7] * 4) == pytest.approx(0.5)


def test_a_board_model_is_graded_in_the_datasets_row_order(tmp_path, paths, monkeypatch):
    """M53 (ungedeckt): der Brettdatensatz sortiert um; die Maske gilt fuer SEINE Reihenfolge."""
    from chesslab.training import engine, evaluate, packs, torch_data

    rows = [{"path": "x", "label": "wP", "session_id": "s1", "frame": "1", "square": "a1",
             "coverage": 0.9},
            {"path": "y", "label": "empty", "session_id": "s2", "frame": "1", "square": "a1",
             "coverage": 0.0}]
    dd = tmp_path / "datasets" / "d"
    dd.mkdir(parents=True)
    write_jsonl(dd / "manifest.jsonl", rows)
    _write_split(dd, "split.json", ["s1", "s2"])
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    cfg = {"backbone": "board:smallcnn", "classes": ["empty", "wP"], "out_size": [CROP, CROP],
           "head": "combined", "dataset": "d"}
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")

    class Reordered:
        def __init__(self, rows, *_a, **_k):
            self.rows = list(reversed(rows))

    def fake_eval(_model, ds, *_a, **_k):
        from chesslab.cell_rule import classification_eligible
        return {"board_acc": 1.0, "square_acc": 1.0, "trues": np.array([0, 1]),
                "preds": np.array([0, 1]), "conf": [0.9, 0.9], "conf_wrong": None,
                "classification_eligible": np.array([classification_eligible(r)
                                                     for r in ds.rows])}

    monkeypatch.setattr(evaluate, "load_run", lambda _d: (torch.nn.Identity(), dict(cfg)))
    monkeypatch.setattr(packs, "resolve_dataset_packs", lambda *a, **k: object())
    monkeypatch.setattr(torch_data, "PackedBoardDataset", Reordered)
    monkeypatch.setattr(engine, "evaluate_dataset", fake_eval)

    assert evaluate.run_eval(str(run_dir), split_name="test") == 0

    out = json.loads((run_dir / "eval_test.json").read_text(encoding="utf-8"))
    assert out["per_session"]["s2"]["visible_piece_acc"] is None
    assert out["per_session"]["s1"]["square_acc"] is None


def test_an_exported_occlusion_run_declares_its_coverage_output(tmp_path, paths):
    """M50 (ungedeckt): ohne `coverage_output` softmaxt ein Verbraucher die Coverage mit."""
    from chesslab.training.evaluate import run_export
    from chesslab.training.model import build_model

    run_dir = tmp_path / "occ"
    run_dir.mkdir()
    model = build_model("smallcnn", 3, norm="batchnorm", head="combined")
    torch.save(model.state_dict(), str(run_dir / "best.pt"))
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": "smallcnn", "classes": ["empty", "wP"], "out_size": [CROP, CROP],
        "norm": "batchnorm", "head": "occlusion"}), encoding="utf-8")

    assert run_export(str(run_dir), fmt="torchscript") == 0

    assert json.loads((run_dir / "config.json").read_text(encoding="utf-8"))["coverage_output"]


def _diag(trues, preds, rows, cov=None):
    from chesslab.training.epoch_metrics import _occlusion_diagnostics

    n = len(trues)
    cov = np.zeros(n, dtype=np.float32) if cov is None else np.asarray(cov, dtype=np.float32)
    val = {"coverage_trues": cov, "coverage_probs": cov.copy(),
           "trues": np.array(trues), "preds": np.array(preds)}
    return _occlusion_diagnostics(val, rows, ["empty", "wP"], 0.15)


def test_epoch_diagnostics_drop_dark_cells_like_the_loss():
    """M57 (ungedeckt): `val_visible_*` rechnete sonst ueber Zellen, die der Verlust ausblendet."""
    rows = [{"session_id": "s", "frame": "0", "brightness": 200.0},
            {"session_id": "s", "frame": "0", "brightness": 10.0}]
    diag = _diag([1, 1], [1, 0], rows)

    assert diag["val_visible_n"] == 1
    assert diag["val_visible_piece_acc"] == pytest.approx(1.0)


def test_epoch_visible_piece_acc_without_a_piece_is_nan():
    """M59 (ungedeckt): der Nachbartest prueft nur `val_coverage_*` auf `nan`."""
    import math

    rows = [{"session_id": "s", "frame": "0"}, {"session_id": "s", "frame": "0"}]

    assert math.isnan(_diag([0, 0], [0, 0], rows)["val_visible_piece_acc"])


def test_conf_mean_without_a_single_error_is_unmeasured():
    """M60 (ungedeckt): `val_conf_wrong` ohne Fehler ist `None`, nicht "null sicher"."""
    from chesslab.training.epoch_metrics import _conf_mean

    assert _conf_mean(([0, 1], [0, 1], [0.9, 0.8]), wrong=True) is None
    assert _conf_mean(([0, 1], [0, 1], [0.9, 0.8]), wrong=False) == pytest.approx(0.85)


def _call_in_run_train(name):
    import ast
    import inspect

    from chesslab.training import epoch_metrics, temperature

    tree = ast.parse(inspect.getsource(temperature) + inspect.getsource(epoch_metrics))
    return [n for n in ast.walk(tree) if isinstance(n, ast.Call)
            and isinstance(n.func, ast.Name) and n.func.id == name]


def test_the_temperature_is_fitted_on_visible_cells_only():
    """M63 (ungedeckt): verdeckte Zellen irren zu 55-63 % UNSICHER und zoegen T nach oben.

    Ueber den Syntaxbaum am echten Aufruf: `run_train` laeuft im Test nicht.
    """
    import ast

    (call,) = _call_in_run_train("fit_temperature")
    for arg in call.args[:2]:
        assert isinstance(arg, ast.Subscript) and ast.unparse(arg.slice) == "eligible", \
            ast.unparse(arg)


def test_epoch_diagnostics_stay_on_the_fixed_mask():
    """M64 (ungedeckt): unter `--visible-max` benotete die Epoche sonst ihre eigene Zellmenge."""
    import ast

    (call,) = _call_in_run_train("_occlusion_diagnostics")

    assert ast.unparse(call.args[3]) == "PIECE_VISIBLE_MAX"


def test_the_packed_loader_hands_the_loss_its_brightness(monkeypatch):
    """M68 (ungedeckt): mit fester 255 im Ziel blendete der Pack-Weg keine dunkle Zelle aus."""
    from chesslab.training import torch_data as td

    rows = [{"label": "wP", "coverage": 0.0, "brightness": 10.0}]
    monkeypatch.setattr(td, "_pack_index",
                        lambda rows, packed: ([("f", (1, 4, 4, 3))],
                                              np.zeros((len(rows), 2), dtype=np.int64)))
    ds = td.PackedSquareDataset(rows, ["wP", "empty"], lambda img: torch.zeros(1),
                                packed=object(), with_coverage=True)
    monkeypatch.setattr(ds, "_memmap", lambda _p: np.zeros((1, 4, 4, 3), dtype=np.uint8))

    _, target = ds[0]

    assert float(target[2]) == pytest.approx(10.0)


def test_an_explicit_zero_class_weight_stays_zero():
    """M69 (ungedeckt): `or 1.0` machte aus einem gewollten 0,0 still ein volles Gewicht."""
    from chesslab.training.torch_data import class_weights_tensor

    w = class_weights_tensor({"class_weights": {"wP": 0.0}}, ["wP", "empty"])

    assert w.tolist() == [0.0, 1.0]
