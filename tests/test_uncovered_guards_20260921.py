"""Sperren, die eine Mutationsprobe ungedeckt fand, je mit einem Test fuer ihren Schaden."""

from __future__ import annotations

import io
import json
import os

import numpy as np
import pytest
from PIL import Image

from chesslab import config
from chesslab.training import pack as pack_mod

CROP = 8


@pytest.fixture
def paths(tmp_path, monkeypatch):
    p = config.Paths(root=tmp_path)
    monkeypatch.setattr(pack_mod.config, "DATA", p)
    return p


def _make_dataset(tmp_path, n: int, value: int = 200):
    """Ein winziger gebauter Datensatz: Manifest plus je ein PNG."""
    dd = tmp_path / "datasets" / "ds"
    (dd / "squares").mkdir(parents=True)
    rows = []
    for i in range(n):
        f = dd / "squares" / f"{i:04d}.png"
        Image.fromarray(np.full((CROP, CROP, 3), value, np.uint8)).save(f)
        rows.append({"path": f.as_posix(), "out_size": [CROP, CROP], "label": "empty"})
    (dd / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + chr(10) for r in rows), encoding="utf-8")
    return dd, rows


def _rewrite_keeping_the_byte_size(path, value: int) -> None:
    """Andere Pixel, gleiche Dateigroesse — Fuellbytes hinter dem IEND liest jeder PNG-Leser weg."""
    was = path.stat().st_size
    buf = io.BytesIO()
    Image.fromarray(np.full((CROP, CROP, 3), value, np.uint8)).save(buf, format="PNG")
    data = buf.getvalue()
    assert len(data) <= was, "die Probe braucht ein kleineres Bild als das Original"
    path.write_bytes(data + bytes(was - len(data)))
    stamp = path.stat().st_mtime + 60
    os.utime(path, (stamp, stamp))


def test_a_crop_rewritten_at_the_SAME_byte_size_still_invalidates_the_pack(tmp_path, paths):
    """Der Fingerabdruck ist (mtime, Groesse) — jeder bestehende Test aendert BEIDE.

    Ein Re-Slice schreibt denselben Zuschnitt neu; dass dabei ein Byte mehr anfaellt, ist Zufall
    der Kompression und keine Zusage. Bleibt die Groesse gleich, traegt allein die mtime den
    Befund, und ohne sie serviert `load_packed` die Pixel der vorigen Geometrie weiter.
    """
    dd, _ = _make_dataset(tmp_path, 4)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    assert pack_mod.load_packed("ds", paths=paths) is not None

    sizes = {p.stat().st_size for p in (dd / "squares").glob("*.png")}
    for f in sorted((dd / "squares").glob("*.png")):
        _rewrite_keeping_the_byte_size(f, 0)
    assert {p.stat().st_size for p in (dd / "squares").glob("*.png")} == sizes
    assert pack_mod.decode_crop(str(dd / "squares" / "0000.png"), (CROP, CROP)).max() == 0

    assert pack_mod.load_packed("ds", paths=paths) is None, (
        "der Pack traegt die alten Pixel, die Crops die neuen — und nichts sagt es")


def test_a_memmap_that_is_shorter_than_its_meta_claims_is_refused(tmp_path, paths):
    """`n*h*w*3` ist die einzige Stelle, an der die Datei selbst befragt wird.

    Ein abgebrochenes Kopieren laesst eine kurze `packed_images.u8` zurueck; Meta und Digest
    passen weiter. Wer sie dann auf die volle Zeilenzahl abbildet, liest Zeilen, die es nicht
    gibt — Pixel und Label laufen auseinander, ohne dass ein Lauf abbricht.
    """
    dd, _ = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    img, _meta = pack_mod._packed_paths(dd)
    assert pack_mod.load_packed("ds", paths=paths) is not None

    with open(img, "r+b") as fh:
        fh.truncate(img.stat().st_size - CROP * CROP * 3)

    assert pack_mod.load_packed("ds", paths=paths) is None, (
        "eine kurze Memmap wurde als vollstaendiger Pack ausgegeben")
    # Die Gegenprobe: die kurze Datei traegt die versprochene Form nicht (Windows: OSError).
    with pytest.raises((ValueError, OSError)):
        np.memmap(img, dtype=np.uint8, mode="r", shape=(6, CROP, CROP, 3))


def test_a_big_dataset_without_a_memmap_aborts_instead_of_crawling():
    """Der stille Rueckfall auf den Datei-Loader: die Folds und der SWA-Lauf liefen dreifach
    langsam an einem verworfenen Pack vorbei, ohne dass es jemand sah.
    """
    from chesslab.dataset_build import _PACK_MIN_CROPS
    from chesslab.training.train import _require_pack

    with pytest.raises(ValueError, match="allow-unpacked"):
        _require_pack("real13-mix-v7-128", _PACK_MIN_CROPS, allow_unpacked=False)

    _require_pack("real13-mix-v7-128", _PACK_MIN_CROPS, allow_unpacked=True)
    _require_pack("klein", _PACK_MIN_CROPS - 1, allow_unpacked=False)
    _require_pack(None, _PACK_MIN_CROPS * 10, allow_unpacked=False)


def test_the_unpacked_branch_of_run_train_still_asks_for_the_pack():
    """Die Sperre wirkt nur, wo sie steht: im Zweig OHNE `packed`, vor dem `SquareDataset`."""
    from pathlib import Path

    from chesslab.training import train as tr

    body = Path(tr.__file__).read_text(encoding="utf-8")
    assert body.index("_require_pack(dataset,") < body.index("train_ds = SquareDataset(")


def test_an_unreadable_crop_survives_the_phash_pass(tmp_path):
    """`dedup_phash` wirft weg, was es fuer ein Duplikat haelt — ein Bild, das es gar nicht
    LESEN kann, ist keins. Ohne die Ausnahme verschwinden genau die Zeilen aus dem Datensatz,
    die niemand mehr nachzaehlt, weil sie nie in einem Bericht auftauchen.
    """
    from chesslab.dataset_build import dedup_phash

    good = tmp_path / "gut.png"
    Image.fromarray(np.full((CROP, CROP, 3), 30, np.uint8)).save(good)
    rows = [{"path": good.as_posix(), "label": "wP"},
            {"path": (tmp_path / "gibt-es-nicht.png").as_posix(), "label": "wP"}]

    kept = dedup_phash(rows, 2)

    assert [r["path"] for r in kept] == [r["path"] for r in rows], (
        "die unlesbare Zeile wurde still aus dem Datensatz entfernt")
