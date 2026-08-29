"""CLAHE in der Transformationskette: aus heisst bitgleich, an heisst wirklich an."""

import numpy as np
import pytest
import torch
from PIL import Image

from chesslab.training.torch_data import _EvalRgbTransform, build_transform, eval_transform_for


def _crop(seed: int = 0, size: int = 80) -> Image.Image:
    rng = np.random.default_rng(seed)
    # Dunkel und strukturiert — der Fall, fuer den CLAHE ueberhaupt gedacht ist.
    base = rng.integers(8, 48, (size, size, 3), dtype=np.uint8)
    base[20:60, 30:50] = rng.integers(40, 90, (40, 20, 3), dtype=np.uint8)
    return Image.fromarray(base)


def test_clahe_off_is_bit_identical_to_no_clahe():
    """Der Default darf keinen einzigen Altlauf verschieben."""
    img = _crop()
    without = build_transform((80, 80), train=False, per_crop=True)
    with_zero = build_transform((80, 80), train=False, per_crop=True, clahe_clip=0.0)
    assert torch.equal(without(img), with_zero(img))


def test_clahe_off_keeps_the_zero_pil_eval_fast_path():
    """`_EvalRgbTransform` umgeht die PIL-Kette; ohne CLAHE muss dieser Weg erhalten bleiben."""
    assert isinstance(build_transform((80, 80), train=False), _EvalRgbTransform)


def test_clahe_on_closes_the_fast_path():
    """Sonst waere der Schritt beim gepackten Eval still uebersprungen — er sieht uint8 direkt."""
    tf = build_transform((80, 80), train=False, clahe_clip=2.0)
    assert not isinstance(tf, _EvalRgbTransform)


def test_clahe_on_changes_the_pixels():
    img = _crop()
    off = build_transform((80, 80), train=False, per_crop=True)
    on = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0)
    assert not torch.equal(off(img), on(img))


@pytest.mark.parametrize("clip", [1.0, 2.0, 4.0])
def test_clahe_raises_local_contrast_on_a_dark_crop(clip: float):
    """Der Zweck, nicht nur die Verdrahtung: die Streuung im Zellinneren muss steigen."""
    img = _crop()
    off = build_transform((80, 80), train=False, per_crop=False, clahe_clip=0.0)
    on = build_transform((80, 80), train=False, per_crop=False, clahe_clip=clip)
    assert on(img)[:, 8:-8, 8:-8].std() > off(img)[:, 8:-8, 8:-8].std()


def test_eval_transform_reads_the_values_from_the_run_config():
    """Ohne das misst jeder spaetere Eval still ohne CLAHE — die teuerste Art, sich zu taeuschen."""
    cfg = {"out_size": [80, 80], "clahe_clip": 2.0, "clahe_tile": 8}
    img = _crop()
    assert not torch.equal(eval_transform_for(cfg)(img),
                           eval_transform_for({"out_size": [80, 80]})(img))


def test_tile_size_is_honoured():
    img = _crop()
    a = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0, clahe_tile=4)
    b = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0, clahe_tile=16)
    assert not torch.equal(a(img), b(img))


def test_the_transform_survives_pickling():
    """Spawn-DataLoader-Worker bekommen die Transformation gepickelt — ein Modul oder ein
    OpenCV-Handle als Attribut laesst den Lauf erst nach dem Aufbau sterben."""
    import pickle

    img = _crop()
    tf = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0)
    assert torch.equal(pickle.loads(pickle.dumps(tf))(img), tf(img))


def _dark(size: int = 80, level: int = 30) -> Image.Image:
    rng = np.random.default_rng(1)
    return Image.fromarray(rng.integers(level - 6, level + 6, (size, size, 3), dtype=np.uint8))


def _bright(size: int = 80) -> Image.Image:
    rng = np.random.default_rng(2)
    return Image.fromarray(rng.integers(150, 200, (size, size, 3), dtype=np.uint8))


def test_the_window_leaves_cells_outside_it_untouched():
    """Das Fenster ist der ganze Zweck: unter 25 verstaerkt CLAHE Rauschen statt Struktur."""
    on = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0,
                         clahe_min_mean=25.0, clahe_max_mean=40.0)
    off = build_transform((80, 80), train=False, per_crop=True)
    assert torch.equal(on(_bright()), off(_bright())), "helle Zelle muss durchlaufen"
    assert not torch.equal(on(_dark()), off(_dark())), "Zelle im Fenster muss veraendert werden"


def test_a_cell_below_the_window_is_left_alone():
    on = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0,
                         clahe_min_mean=25.0, clahe_max_mean=40.0)
    off = build_transform((80, 80), train=False, per_crop=True)
    assert torch.equal(on(_dark(level=12)), off(_dark(level=12)))


@pytest.mark.parametrize("order", ["pre", "post"])
def test_denoise_order_changes_the_result(order: str):
    plain = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0)
    with_dn = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0,
                              clahe_denoise=order)
    assert not torch.equal(plain(_dark()), with_dn(_dark()))


def test_pre_and_post_are_not_the_same():
    pre = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0, clahe_denoise="pre")
    post = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0, clahe_denoise="post")
    assert not torch.equal(pre(_dark()), post(_dark()))


def test_an_unknown_denoise_fails_loudly():
    with pytest.raises(ValueError, match="denoise"):
        build_transform((80, 80), train=False, clahe_clip=2.0, clahe_denoise="bilateral")


def test_the_window_and_denoise_survive_pickling():
    import pickle

    tf = build_transform((80, 80), train=False, per_crop=True, clahe_clip=2.0,
                         clahe_min_mean=25.0, clahe_max_mean=40.0, clahe_denoise="pre")
    img = _dark()
    assert torch.equal(pickle.loads(pickle.dumps(tf))(img), tf(img))


def test_eval_reads_window_and_denoise_from_the_config():
    cfg = {"out_size": [80, 80], "clahe_clip": 2.0, "clahe_tile": 8,
           "clahe_min_mean": 25.0, "clahe_max_mean": 40.0, "clahe_denoise": "pre"}
    img = _dark()
    plain = {"out_size": [80, 80], "clahe_clip": 2.0, "clahe_tile": 8}
    assert not torch.equal(eval_transform_for(cfg)(img), eval_transform_for(plain)(img))
