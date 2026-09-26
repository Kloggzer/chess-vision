"""Refinement Runde 6: `config.json` eines Laufs, je Aufrufer festgehalten."""

from __future__ import annotations

import json

import pytest
from typer.testing import CliRunner

from chesslab.cli import app

CFG = {"classes": ["empty", "wP"], "out_size": [96, 128], "pad_side": 0.1, "backbone": "smallcnn",
       "clahe_clip": 2.0, "clahe_tile": 4}


def _readers():
    from chesslab import occluded_model, runs, serving

    return [runs.read_run_config, lambda d: {"classes": occluded_model.model_classes(d)},
            lambda d: {"classes": serving.run_spec(d).classes}]


@pytest.mark.parametrize("pick", range(3))
def test_every_reader_reads_the_run_config(tmp_path, pick):
    (tmp_path / "config.json").write_text(json.dumps(CFG), encoding="utf-8")
    got = _readers()[pick](tmp_path)
    assert {k: got[k] for k in got} == {k: CFG[k] for k in got}


@pytest.mark.parametrize("pick", range(3))
def test_every_reader_refuses_a_run_without_config(tmp_path, pick):
    with pytest.raises(FileNotFoundError):
        _readers()[pick](tmp_path / "leer")


def test_a_failed_temperature_record_warns_instead_of_raising(tmp_path, capsys):
    from chesslab.training.temperature import _record_temperature

    _record_temperature(tmp_path / "config.json", 1.5)
    assert "[WARN] config.json nicht geschrieben" in capsys.readouterr().out


def test_a_temperature_record_keeps_the_rest_of_the_config(tmp_path):
    from chesslab.training.temperature import _record_temperature

    (tmp_path / "config.json").write_text(json.dumps(CFG), encoding="utf-8")
    _record_temperature(tmp_path / "config.json", 1.23456)
    assert json.loads((tmp_path / "config.json").read_text(encoding="utf-8")) == {
        **CFG, "temperature": 1.2346}


def _run_eval(run):
    from chesslab.training.evaluate import run_eval

    return run_eval(run)


def _run_export(run):
    from chesslab.training.evaluate import run_export

    return run_export(run)


def _run_quantize(run):
    from chesslab.training.quantize import run_quantize

    return run_quantize(run)


def _reliance(run):
    return CliRunner().invoke(app, ["reliance", "--run", run]).exit_code


def _bake(run):
    return CliRunner().invoke(app, ["dataset", "bake", "a", "b", "--model", run]).exit_code


@pytest.mark.parametrize("verb", [_run_eval, _run_export, _run_quantize, _reliance, _bake])
def test_a_verb_on_a_run_without_config_exits_1(tmp_path, verb):
    assert verb(str(tmp_path / "leer")) == 1


@pytest.mark.parametrize("verb", [_run_eval, _run_export, _run_quantize])
def test_the_refusal_is_one_sentence(tmp_path, verb, capsys):
    verb(str(tmp_path))
    assert capsys.readouterr().out == (
        f"[FAIL] no config.json in {tmp_path} — first run `chesslab train`.\n")


def test_bake_names_the_missing_config_instead_of_a_stack(tmp_path):
    out = CliRunner().invoke(app, ["dataset", "bake", "a", "b", "--model", str(tmp_path)])
    assert (out.exit_code, out.output) == (1, f"[FAIL] no config.json in {tmp_path}\n")


SQUARES = [f"{f}{r}" for f in "abcdefgh" for r in range(1, 9)]


def _boards_dataset(root, boards: dict[str, list[str]]):
    """`frame -> squares` of one session `s1`; every crop its own grey value."""
    import numpy as np
    from PIL import Image

    dd = root / "datasets" / "boards"
    (dd / "squares").mkdir(parents=True)
    rows = []
    for frame, squares in boards.items():
        for i, sq in enumerate(squares):
            p = dd / "squares" / f"{frame}_{i}_{sq}.png"
            Image.fromarray(np.full((32, 32, 3), (7 * i + len(rows)) % 256, dtype=np.uint8)).save(p)
            rows.append({"path": p.as_posix(), "label": "empty" if i % 3 else "wP",
                         "session_id": "s1", "frame": frame, "square": sq, "out_size": [32, 32]})
    (dd / "manifest.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n",
                                       encoding="utf-8")
    (dd / "split.json").write_text(json.dumps({
        "classes": ["empty", "wP"], "splits": {"train": [], "val": [], "test": ["s1"]}}),
        encoding="utf-8")


def _boards_run(tmp_path):
    import torch

    from chesslab.training.model import build_model

    torch.manual_seed(0)
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    torch.save(build_model("smallcnn", 2, norm="batchnorm", head="combined").state_dict(),
               str(run_dir / "best.pt"))
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": "smallcnn", "classes": ["empty", "wP"], "out_size": [32, 32],
        "norm": "batchnorm", "head": "combined", "dataset": "boards"}), encoding="utf-8")
    return run_dir


def test_boards_only_keeps_the_complete_boards_as_before(tmp_path, paths, capsys):
    pytest.importorskip("torch")
    from chesslab.training.evaluate import run_eval

    _boards_dataset(tmp_path, {"000001": SQUARES, "000002": SQUARES[:63],
                               "000003": SQUARES[::-1]})
    run_dir = _boards_run(tmp_path)

    assert run_eval(str(run_dir), split_name="all", boards_only=True) == 0
    assert "[boards-only] 128 von 191 Zeilen (1 unvollstaendige Bretter verworfen)" in (
        capsys.readouterr().out)
    out = json.loads((run_dir / "eval_all.json").read_text(encoding="utf-8"))
    assert out["per_session"]["s1"]["crops"] == 128
    import hashlib

    blob = json.dumps(out, sort_keys=True).encode()
    assert hashlib.sha256(blob).hexdigest()[:16] == "0faa2f31702f744d", blob


def test_boards_only_refuses_a_board_with_a_doubled_square(tmp_path, paths, capsys):
    """64 Zeilen sind noch kein Brett: ein doppeltes Feld verdeckt ein fehlendes."""
    pytest.importorskip("torch")
    from chesslab.training.evaluate import run_eval

    _boards_dataset(tmp_path, {"000001": SQUARES, "000002": [*SQUARES[:63], "a1"]})
    run_dir = _boards_run(tmp_path)

    assert run_eval(str(run_dir), split_name="all", boards_only=True) == 1
    assert "doppelte Felder" in capsys.readouterr().out


def test_the_fit_spread_counts_only_what_this_pass_measured(tmp_path, monkeypatch):
    """Seriell wie `merge_fit_stats`: die alte Zahl einer unlesbaren Zeile bleibt draussen."""
    import cv2
    import numpy as np

    from chesslab import alignment
    from chesslab.realgames.boards import fit_rows_to_grid
    from chesslab.realgames.chunks import merge_fit_stats
    from chesslab.realgames.decode import disk_frames
    from chesslab.realgames.mesh import _field_profile

    (tmp_path / "frames").mkdir()
    grey = {30: 0, 60: 128, 90: 255, 120: 64}
    for i, v in grey.items():
        cv2.imwrite(str(tmp_path / "frames" / f"{i:06d}.png"), np.full((8, 8, 3), v, np.uint8))
    quad = [[1.0, 1.0], [9.0, 1.0], [9.0, 9.0], [1.0, 9.0]]
    verdicts = {0.0: (quad, 17.4, 2.7), 128.0: (None, 1.9, float("nan")),
                64.0: (quad, 30.0, 5.5)}
    monkeypatch.setattr(alignment, "improve_quad", lambda frame, _q, _p: verdicts.get(
        frame.mean(), (None, float("nan"), float("nan"))))
    median = [[0.0, 0.0], [8.0, 0.0], [8.0, 8.0], [0.0, 8.0]]
    rows = [{"frame": f"frames/{i:06d}.png", "corners": median, "align_worst_px": 99.0}
            for i in grey]
    serial = fit_rows_to_grid(rows, _field_profile(median, (8, 8), 8),
                              frames=disk_frames(tmp_path, rows))
    assert (serial["median"], serial["max"]) == (2.7, 5.5)
    merged = merge_fit_stats([serial])
    assert (merged["median"], merged["max"]) == (2.7, 5.5)
