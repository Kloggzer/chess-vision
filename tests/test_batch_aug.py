"""Die Batch-Augmentierung muss dasselbe wuerfeln wie die Kette, die sie ersetzt."""

from dataclasses import replace

import pytest
import torch

from chesslab import config
from chesslab.training.batch_aug import BLUR_P, BatchPhotometric

MEAN, STD = config.NORMALIZE_MEAN, config.NORMALIZE_STD
OFF = {"brightness": 0.0, "contrast": 0.0, "color_jitter": 0.0, "gamma": (1.0, 1.0),
       "blur_sigma_max": 0.1, "erase_p": 0.0, "noise_std": 0.0}


def batch(n=64, size=80, seed=0):
    torch.manual_seed(seed)
    v = torch.rand(n, 3, size, size)
    mean = torch.tensor(MEAN).view(1, 3, 1, 1)
    std = torch.tensor(STD).view(1, 3, 1, 1)
    return (v - mean) / std


def aug(**over):
    return BatchPhotometric(replace(config.AUGMENT, **{**OFF, **over}), MEAN, STD)


def test_everything_off_is_the_identity():
    """Ein Lauf ohne Photometrie darf durch die Batch-Op kein einziges Bit bewegen."""
    a = aug()
    assert not a.active
    x = batch(8)
    assert torch.equal(a(x), x)


def test_each_crop_draws_its_own_factor():
    """Je Batch statt je Bild zu wuerfeln waere eine andere Augmentierung — 64 gleiche Crops
    muessen hinterher 64 verschiedene sein."""
    x = batch(2)[:1].repeat(64, 1, 1, 1)
    out = aug(brightness=0.35)(x)
    means = out.mean(dim=(1, 2, 3))
    assert means.std() > 1e-4, means.std()


def test_the_board_shape_survives():
    """Der Brettkopf liefert `(B, 64, C, H, W)` — gewuerfelt wird trotzdem je CROP."""
    x = batch(128).view(2, 64, 3, 80, 80)
    out = aug(brightness=0.35)(x)
    assert out.shape == x.shape
    flat = out.flatten(0, 1).mean(dim=(1, 2, 3))
    assert flat.std() > 1e-4


def test_blur_hits_about_thirty_percent_and_actually_blurs():
    x = batch(400, seed=1)
    out = aug(blur_sigma_max=1.5)(x)
    touched = (out - x).flatten(1).abs().amax(dim=1) > 1e-4
    share = float(touched.float().mean())
    assert abs(share - BLUR_P) < 0.08, share
    # Weichzeichnen heisst: benachbarte Pixel ruecken zusammen.
    rough = (x[touched].diff(dim=-1).abs().mean(), out[touched].diff(dim=-1).abs().mean())
    assert rough[1] < rough[0]


def test_erase_writes_the_neutral_value_not_a_coloured_one():
    """Cutout fuellt im [0,1]-Raum mit 0; nach der Normalisierung ist das genau `-mean/std`."""
    a = aug(erase_p=1.0)
    out = a(batch(32, seed=2))
    want = (-torch.tensor(MEAN) / torch.tensor(STD)).view(1, 3, 1, 1)
    hit = (out - want).abs().amax(dim=1) < 1e-5
    assert hit.any(), "kein Pixel getroffen"
    assert hit.flatten(1).float().mean() > 0.005


def test_erase_runs_after_the_photometry():
    """Sonst faerbte der Kontrast die geloeschte Flaeche und der Blur schmierte sie aus."""
    out = aug(erase_p=1.0, brightness=0.35, contrast=0.35, blur_sigma_max=1.5)(batch(64, seed=3))
    want = (-torch.tensor(MEAN) / torch.tensor(STD)).view(1, 3, 1, 1)
    assert ((out - want).abs().amax(dim=1) < 1e-5).any()


@pytest.mark.parametrize("knob", ["brightness", "contrast", "color_jitter"])
def test_each_colour_knob_moves_the_pixels_on_its_own(knob):
    x = batch(32, seed=4)
    assert not torch.allclose(aug(**{knob: 0.35})(x), x)


def test_gamma_stays_inside_the_unit_range():
    """Nach `pow` wird wieder geklemmt — ein Wert ausserhalb [0,1] hiesse eine andere Skala."""
    out = aug(gamma=(0.6, 1.8))(batch(32, seed=5))
    mean = torch.tensor(MEAN).view(1, 3, 1, 1)
    std = torch.tensor(STD).view(1, 3, 1, 1)
    v = out * std + mean
    assert float(v.min()) >= -1e-5 and float(v.max()) <= 1 + 1e-5


def test_uint8_input_lands_on_the_same_scale_as_the_pil_chain():
    """Der Loader liefert CHW-uint8; hier muss dasselbe herauskommen wie aus ToTensor+Normalize."""
    raw = torch.randint(0, 256, (16, 3, 80, 80), dtype=torch.uint8)
    plain = BatchPhotometric(replace(config.AUGMENT, **OFF), MEAN, STD, from_uint8=True)
    mean = torch.tensor(MEAN).view(1, 3, 1, 1)
    std = torch.tensor(STD).view(1, 3, 1, 1)
    want = (raw.float() / 255.0 - mean) / std
    assert torch.allclose(plain(raw), want, atol=1e-6)


def test_noise_runs_before_the_cutout():
    """Sonst truege die geloeschte Flaeche Rauschen statt der neutralen 0."""
    a = aug(noise_std=0.05, erase_p=1.0)
    out = a(batch(48, seed=6))
    want = (-torch.tensor(MEAN) / torch.tensor(STD)).view(1, 3, 1, 1)
    assert ((out - want).abs().amax(dim=1) < 1e-5).any()


def test_config_records_the_photometry_that_ran_not_the_zeroed_loader():
    """`config.json` ist, was Serving liest. Mit --batch-aug stehen die Staerken im Loader auf 0
    und leben im BatchPhotometric — die Datei muss den GERECHNETEN Operator nennen."""
    from chesslab.training.train_recipe import _photometry_of

    loader = replace(config.AUGMENT, **OFF)          # so sieht die Policy im Loader aus
    photo = BatchPhotometric(config.AUGMENT, MEAN, STD, from_uint8=True)
    got = _photometry_of(loader, photo)
    assert got["aug_blur_sigma_max"] == config.AUGMENT.blur_sigma_max
    assert got["aug_brightness"] == config.AUGMENT.brightness
    assert got["aug_contrast"] == config.AUGMENT.contrast
    assert got["aug_color_jitter"] == config.AUGMENT.color_jitter
    assert got["aug_gamma"] == list(config.AUGMENT.gamma)
    assert got["aug_erase_p"] == config.AUGMENT.erase_p
    assert got["aug_noise_std"] == config.AUGMENT.noise_std
    # Ohne --batch-aug bleibt es bei dem, was der Loader wirklich tat.
    assert _photometry_of(loader, None)["aug_blur_sigma_max"] == OFF["blur_sigma_max"]


def test_the_batched_affine_is_torchvisions_affine():
    """Bitgleich, nicht `ungefaehr`: sonst tauscht der Umbau einen bekannten Unterschied gegen
    einen unbekannten. NEAREST und ganze Pixel sind das, was `RandomAffine` zieht."""
    import torchvision.transforms.functional as TF
    from torchvision.transforms import InterpolationMode

    from chesslab.training.batch_aug import _affine

    torch.manual_seed(0)
    img = torch.randint(0, 255, (8, 3, 64, 64)).float()
    tx = torch.randint(-7, 8, (8,)).float()
    ty = torch.randint(-7, 8, (8,)).float()
    s = 1.0 + (torch.rand(8) * 0.06 - 0.03)
    ref = torch.stack([TF.affine(img[i], angle=0.0, translate=[int(tx[i]), int(ty[i])],
                                 scale=float(s[i]), shear=[0.0, 0.0], fill=0,
                                 interpolation=InterpolationMode.NEAREST) for i in range(8)])
    assert torch.equal(_affine(img, tx, ty, s), ref)


def test_the_geometry_runs_after_the_photometry():
    """Der Grund fuer den ganzen Umbau: im Loader lief Photometrie VOR der Affine. Ein 0-Rand,
    den die Affine hereinschiebt, darf danach nicht mehr aufgehellt werden."""
    from chesslab.training.batch_aug import BatchGeometry

    torch.manual_seed(0)
    geo = BatchGeometry(replace(config.AUGMENT, jitter_translate=0.25, jitter_scale=0.0,
                                hflip_p=0.0, vflip_p=0.0, rot180_p=0.0, flip_xor_p=0.0))
    a = BatchPhotometric(replace(config.AUGMENT, **{**OFF, "brightness": 0.35}), MEAN, STD,
                         geometry=geo)
    out = a(batch(32))
    mean = torch.tensor(MEAN).view(1, 3, 1, 1)
    std = torch.tensor(STD).view(1, 3, 1, 1)
    unit = (out * std + mean)
    # Der eingeschobene Rand ist exakt 0 im [0,1]-Raum — die Helligkeit lief davor.
    assert unit.min().item() == pytest.approx(0.0, abs=1e-6)


def test_geometry_off_leaves_the_batch_alone():
    from chesslab.training.batch_aug import BatchGeometry

    geo = BatchGeometry(replace(config.AUGMENT, jitter_translate=0.0, jitter_scale=0.0,
                                hflip_p=0.0, vflip_p=0.0, rot180_p=0.0, flip_xor_p=0.0))
    assert not geo.active
    x = batch(8)
    assert torch.equal(BatchPhotometric(replace(config.AUGMENT, **OFF), MEAN, STD,
                                        geometry=geo)(x), x)
