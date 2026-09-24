"""Vier Funde in `training/` — je ein Test, der VOR dem Fix rot ist."""

from __future__ import annotations

import json
import os

import numpy as np
import pytest
from PIL import Image

from chesslab import config
from chesslab.training import pack_dataset as pack_mod
from chesslab.training import packs as packs_mod
from conftest import write_jsonl

CROP = 8


@pytest.fixture
def serial_pool(monkeypatch):
    """Der Spion unten ist eine lokale Closure — Windows-Spawn kann sie nicht picklen."""
    import multiprocessing

    from test_pack import _SerialPool

    monkeypatch.setattr(multiprocessing, "Pool", _SerialPool)


def _mixed_dataset(paths):
    """Ein Datensatz, dessen Zeilen TEILS aus Brettern und teils aus Crop-Dateien kommen."""
    dd = paths.datasets / "mix"
    (dd / "squares").mkdir(parents=True)
    game = paths.recordings / "g1"
    (game / "boards").mkdir(parents=True)
    (game / "log.jsonl").write_text("{}\n", encoding="utf-8")

    rows = []
    for i in range(2):                                   # Brett-Zeilen: Quelle ist `boards/`
        p = dd / "squares" / f"b{i:04d}.png"
        Image.fromarray(np.zeros((CROP, CROP, 3), dtype=np.uint8)).save(p)
        rows.append({"path": p.as_posix(), "out_size": [CROP, CROP], "label": "empty",
                     "session_id": "rg-g1", "frame": f"{i:06d}", "square": "e2"})
    for i in range(2):                                   # Datei-Zeilen: Quelle IST die Datei
        p = dd / "squares" / f"f{i:04d}.png"
        Image.fromarray(np.full((CROP, CROP, 3), 9 + i, dtype=np.uint8)).save(p)
        rows.append({"path": p.as_posix(), "out_size": [CROP, CROP], "label": "empty"})
    write_jsonl(dd / "manifest.jsonl", rows)
    return dd, rows


@pytest.mark.usefixtures("serial_pool")
def test_the_board_cut_pack_still_notices_a_re_slice_of_its_file_rows(paths, monkeypatch):
    """`crop_fingerprint: {}` heisst nicht "nichts zu pruefen", sondern "nie wieder pruefen".

    Auf dem Brett-Schnitt-Weg kommen die Kompositen weiter aus ihren Crop-DATEIEN. Mit dem
    leeren Wachhund laeuft `_rewritten_since_pack` durch eine leere Schleife und meldet
    `False` - ein Re-Slice unter denselben Pfaden bleibt damit fuer immer unsichtbar.
    """
    dd, rows = _mixed_dataset(paths)
    monkeypatch.setattr(pack_mod, "_cut_session",
                        lambda task: sum(len(v) for v in task[4].values()))
    pack_mod.pack_dataset("mix", paths=paths, workers=1)

    img, meta_path = packs_mod._packed_paths(dd)
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    watched = set(meta["crop_fingerprint"])
    for r in rows[2:]:
        assert r["path"] in watched, "die Datei-Zeilen tragen keinen Wachhund"

    packed_at = img.stat().st_mtime
    p = dd / "squares" / "f0000.png"
    Image.fromarray(np.full((CROP, CROP, 3), 200, dtype=np.uint8)).save(p)
    os.utime(p, (packed_at + 60, packed_at + 60))
    assert packs_mod.load_packed("mix", paths=paths) is None, "Re-Slice blieb unbemerkt"


def test_a_failed_norm_conversion_is_not_reported_as_an_unknown_backbone(monkeypatch):
    """Das `except Exception` spannt ueber die Norm-Umbauten: jeder Fehler DARIN kam als
    "Backbone unbekannt" heraus, und der echte Grund stand nur noch im Text."""
    from torch import nn

    from chesslab.training import model as model_mod

    monkeypatch.setattr(model_mod, "_create_timm_model",
                        lambda *a, **kw: nn.Sequential(nn.BatchNorm2d(2)))

    def boom(_m):
        raise RuntimeError("MIOpen kaputt")

    monkeypatch.setattr(model_mod, "_convert_bn_to_primitive", boom)
    with pytest.raises(RuntimeError, match="MIOpen kaputt"):
        model_mod.build_model("some_timm_net", num_classes=13, pretrained=False)


def test_a_null_brightness_is_unmeasured_not_pitch_black():
    """`capture_plan.band_of` haelt es schon fest: `None` ist NICHT dunkel. Derselbe
    `or 0.0` lebte in `classification_eligible` weiter und warf jede Zeile mit
    ausgeschriebenem `null` aus JEDER Klassenmetrik."""
    from chesslab.cell_rule import classification_eligible

    assert classification_eligible({"coverage": 0.0, "brightness": None}) is True
    assert classification_eligible({"coverage": 0.0}) is True
    assert classification_eligible({"coverage": 0.0, "brightness": 0.0}) is False


def test_gradcam_reads_a_session_pack_dataset(tmp_path, monkeypatch):
    """`_crop_reader` kannte nur `load_packed`. Die aktuellen Datensaetze (`real13-mix-v7-*`)
    zitieren Session-Packs, also lief es in den `mm://`-Abbruch - mit dem Rat, einen
    Synth-Build neu zu bauen, den es nie gab."""
    from chesslab import dataset_build
    from chesslab.dataset import load_manifest
    from chesslab.training import gradcam
    from test_packs_integration import SIDE, _pixels, _write_pack

    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    _write_pack(paths, "s1-8", "s1", 0)
    dataset_build.build_dataset("seam", ["s1"], rotations=(0,), phash_enabled=False,
                                val_frac=0.0, test_frac=0.0, paths=paths,
                                pack_size=(SIDE, SIDE), allow_degenerate=True, from_packs=True)

    rows = load_manifest(paths.datasets / "seam" / "manifest.jsonl")
    read = gradcam._crop_reader("seam", rows)
    assert np.array_equal(np.array(read(rows[0])), _pixels(0, 0))
