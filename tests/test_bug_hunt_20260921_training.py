"""Funde vom 2026-09-21 im Trainingsweg — je ein Test, der OHNE den Fix rot ist."""

from __future__ import annotations

import json
import os

import numpy as np
import pytest
from PIL import Image

from chesslab import config
from chesslab.training import pack as pack_mod

CROP = 8


@pytest.fixture
def serial_pool(monkeypatch):
    import multiprocessing

    from test_pack import _SerialPool

    monkeypatch.setattr(multiprocessing, "Pool", _SerialPool)


@pytest.fixture
def paths(tmp_path, monkeypatch):
    p = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", p)
    return p


@pytest.mark.usefixtures("serial_pool")
def test_the_board_cut_pack_stamps_its_watchdog_before_it_writes_pixels(paths, monkeypatch):
    """Der Brett-Weg stempelte den Wachhund NACH dem Pixel-Durchlauf.

    Ein Re-Slice waehrend des Packens schreibt dann neue Pixel unter alte Zeilen, und der
    Fingerabdruck beglaubigt genau die neuen Mtimes — `_rewritten_since_pack` meldet fuer immer
    "frisch". Der klassische Zweig daneben stempelt VOR dem ersten Chunk, mit derselben
    Begruendung im Kommentar.
    """
    from test_training_bug_hunt_20260915 import _mixed_dataset

    dd, rows = _mixed_dataset(paths)
    victim = dd / "squares" / "f0000.png"
    before = victim.stat().st_mtime

    def cut_and_reslice(task):
        Image.fromarray(np.full((CROP, CROP, 3), 200, dtype=np.uint8)).save(victim)
        os.utime(victim, (before + 120, before + 120))
        return sum(len(v) for v in task[4].values())

    monkeypatch.setattr(pack_mod, "_cut_session", cut_and_reslice)
    pack_mod.pack_dataset("mix", paths=paths, workers=1)

    _, meta_path = pack_mod._packed_paths(dd)
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert meta["crop_fingerprint"][victim.as_posix()][0] == before, \
        "der Wachhund beglaubigt die Datei, die WAEHREND des Packens neu geschrieben wurde"
    assert pack_mod.load_packed("mix", paths=paths) is None, "Re-Slice blieb unbemerkt"


class _Stop(Exception):
    """Abbruch, sobald die Transformation gebaut ist — weiter braucht der Test nicht zu laufen."""


def _baked_pair(paths, monkeypatch):
    """`src` mit gueltigem Digest, daraus der gebackene Zwilling `dst`."""
    from chesslab.training.pack_bake import bake_pack
    from test_pack_bake import PARAMS, _crop

    dd = paths.datasets / "src"
    dd.mkdir(parents=True)
    crops = [_crop(i) for i in range(4)]
    mm = np.memmap(dd / "packed_images.u8", dtype=np.uint8, mode="w+", shape=(4, 80, 80, 3))
    mm[:] = np.stack(crops)
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


def test_eval_on_a_baked_dataset_does_not_compute_clahe_a_second_time(paths, monkeypatch):
    """`train` laesst CLAHE aus dem Loader, wenn der Pack ihn schon traegt — `run_eval` nicht.

    Die Zahlen des Evals kaemen damit von zweimal CLAHE, also von einem anderen Operator als dem,
    den der Lauf gefahren ist. `link_pack` nennt genau diesen Fehler als Grund, `baked` mitzureichen.
    """
    import torch

    from chesslab.training import evaluate as ev
    from chesslab.training import torch_data

    params = _baked_pair(paths, monkeypatch)
    run_dir = paths.models / "r1"
    run_dir.mkdir(parents=True)
    cfg = {"classes": ["empty"], "out_size": [80, 80], "dataset": "dst", "head": "combined",
           "backbone": "smallcnn", "clahe_clip": params["clip"], "clahe_tile": params["tile"],
           "clahe_min_mean": params["min_mean"], "clahe_max_mean": params["max_mean"],
           "clahe_denoise": params["denoise"]}
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    monkeypatch.setattr(ev, "_load_run", lambda *_a, **_kw: (torch.nn.Identity(), dict(cfg)))

    seen: dict = {}

    def spy(c, out_size=None):
        seen["cfg"] = c
        raise _Stop

    monkeypatch.setattr(torch_data, "eval_transform_for", spy)
    with pytest.raises(_Stop):
        ev.run_eval(str(run_dir), split_name="all", dataset="dst")
    assert float(seen["cfg"].get("clahe_clip", 0.0)) == 0.0, \
        "der gebackene Pack traegt CLAHE schon in den Pixeln"


def test_the_config_names_the_erase_probability_the_run_really_drew():
    """`config.json` trug `aug_erase_p: 0.25` und einen Schritt weiter `aug.erase_p: 0.0`.

    Unter `--batch-aug` setzt `run_train` die Loader-Staerken auf 0 und laesst `BatchPhotometric`
    wuerfeln. `_photometry_of` liest die richtige Quelle, der `aug`-Block daneben las weiter die
    genullte Politik — derselbe Regler, zwei Namen, einer davon falsch.
    """
    from dataclasses import replace

    from chesslab.config import AUGMENT, NORMALIZE_MEAN, NORMALIZE_STD
    from chesslab.training.batch_aug import BatchPhotometric
    from chesslab.training.train import _aug_of, _photometry_of

    photometric = BatchPhotometric(AUGMENT, NORMALIZE_MEAN, NORMALIZE_STD, from_uint8=True)
    zeroed = replace(AUGMENT, erase_p=0.0, brightness=0.0, contrast=0.0, noise_std=0.0)

    assert AUGMENT.erase_p > 0, "sonst prueft der Test nichts"
    assert _aug_of(zeroed, photometric, None)["erase_p"] == AUGMENT.erase_p
    assert _aug_of(zeroed, photometric, None)["erase_p"] == \
        _photometry_of(zeroed, photometric)["aug_erase_p"]
    assert _aug_of(AUGMENT, None, 0.3) == {"erase_p": AUGMENT.erase_p, "neighbour_p": 0.3}


@pytest.mark.xfail(strict=True, reason="bekannt und bewusst offen: der Fix aendert Zahlen in "
                                       "bestehenden metrics.jsonl/eval-Dateien — Nutzerentscheid")
def test_a_session_without_a_single_visible_cell_reports_no_accuracy():
    """`visible_piece_acc` sagt korrekt `None`, `square_acc` und `board_acc` daneben sagen 0,0.

    Eine Aufnahme, die nur verdeckte Zellen beitraegt, steht damit als perfekt falsch in der
    Liste und zieht `session_spread` mit — ungemessen ist nicht null.
    """
    from chesslab.training.data import per_session_metrics

    rows = [{"session_id": "s1", "frame": "0", "square": "e2", "coverage": 0.9}]
    m = per_session_metrics(rows, ["empty", "wP"], [1], [0])["s1"]
    assert m["visible_piece_acc"] is None
    assert m["square_acc"] is None and m["board_acc"] is None


@pytest.mark.xfail(strict=True, reason="bekannt und bewusst offen: der Fix aendert Zahlen in "
                                       "bestehenden metrics.jsonl — Nutzerentscheid")
def test_coverage_recall_without_a_single_covered_cell_is_not_zero():
    """Leerer Nenner: `max(1.0, want.sum())` macht aus "nichts zu finden" ein "nichts gefunden"."""
    import torch

    from chesslab.training.occlusion import coverage_metrics

    logits = torch.zeros((4, 3))
    target = torch.zeros((4, 2))                       # jede Zelle frei -> `want` ist leer
    assert coverage_metrics(logits, target)["occ_recall"] is None


@pytest.mark.xfail(strict=True, reason="derselbe leere Nenner eine Ebene hoeher; der Fix aendert "
                                       "Zahlen in bestehenden metrics.jsonl — Nutzerentscheid")
def test_the_epoch_record_uses_one_convention_for_an_empty_denominator():
    """In EINEM Datensatz zwei Konventionen: `val_visible_*` melden `nan`, wenn nichts zu messen
    war, `val_coverage_recall`/`-precision` daneben melden 0,0 — also den schlechtesten Wert."""
    import math

    from chesslab.training.train import _occlusion_diagnostics

    val = {"coverage_trues": np.zeros(2, dtype=np.float32),
           "coverage_probs": np.zeros(2, dtype=np.float32),
           "trues": np.array([0, 0]), "preds": np.array([0, 0])}
    rows = [{"session_id": "s1", "frame": "0"}, {"session_id": "s1", "frame": "0"}]
    diag = _occlusion_diagnostics(val, rows, ["empty", "wP"], 0.15)
    assert math.isnan(diag["val_coverage_recall"]) and math.isnan(diag["val_coverage_precision"])
