"""The input representation (`--input-repr`): the transform and its parity with OpenCV."""

from __future__ import annotations

import numpy as np
import pytest

from chesslab.training.torch_data import (
    INPUT_REPRS,
    InputRepresentation,
    build_transform,
    input_repr_of,
    luminance,
    sobel_magnitude,
)

torch = pytest.importorskip("torch")
cv2 = pytest.importorskip("cv2")


def test_sobel_magnitude_matches_cv2_sobel_ksize3_reflect101():
    """`sobel_magnitude` IS `|cv2.Sobel(dx)| + |cv2.Sobel(dy)|`, ksize 3, default border.

    Stated as an equality against OpenCV rather than as a property, because the Kotlin port has to
    reproduce one specific kernel and one specific border rule. `BORDER_REFLECT_101` is cv2's
    default and equals torch's `pad(mode="reflect")`, which is what makes the port exact.
    """
    rng = np.random.default_rng(7)
    img = rng.random((17, 23), dtype=np.float32)
    ref = (np.abs(cv2.Sobel(img, cv2.CV_32F, 1, 0, ksize=3, borderType=cv2.BORDER_REFLECT_101))
           + np.abs(cv2.Sobel(img, cv2.CV_32F, 0, 1, ksize=3, borderType=cv2.BORDER_REFLECT_101)))
    got = sobel_magnitude(torch.from_numpy(img)[None]).numpy()[0]
    assert np.abs(ref - got).max() < 1e-5


def test_sobel_rectifies_the_contrast_direction():
    """A dark square on a light field and a light square on a dark field give the SAME magnitude.

    This is the whole claim: the magnitude discards which way the luminance steps, so "piece darker
    or lighter than its square" stops being the question and "is there a silhouette" remains.
    """
    field = torch.full((1, 16, 16), 0.8)
    field[:, 5:11, 5:11] = 0.2
    assert torch.allclose(sobel_magnitude(field), sobel_magnitude(1.0 - field), atol=1e-6)
    assert float(sobel_magnitude(field).max()) > 1.0   # and there IS an edge to be equal about


def test_luminance_is_bt601():
    x = torch.tensor([0.2, 0.4, 0.6]).view(3, 1, 1).expand(3, 2, 2).clone()
    expected = 0.299 * 0.2 + 0.587 * 0.4 + 0.114 * 0.6
    assert torch.allclose(luminance(x), torch.full((1, 2, 2), expected), atol=1e-6)


@pytest.mark.parametrize(("kind", "channels"), sorted(INPUT_REPRS.items()))
def test_transform_emits_the_declared_channel_count(kind, channels):
    """`INPUT_REPRS[kind]` is what the model's stem is built for — a transform that emits a
    different width would only surface as a shape error deep in the first convolution."""
    from PIL import Image

    img = Image.fromarray(np.random.default_rng(1).integers(0, 256, (40, 40, 3), dtype=np.uint8))
    out = build_transform((32, 32), train=False, input_repr=kind)(img)
    assert out.shape == (channels, 32, 32)


def test_gray_sobel_keeps_absolute_scale():
    """The gray channel must still separate a bright crop from a dark one.

    Per-crop standardisation lost 1641 empty squares to phantom pieces precisely because it threw
    absolute scale away; `gray+sobel` adds the rectified view WITHOUT paying that.
    """
    rep = InputRepresentation("gray+sobel")
    dark = rep(torch.full((3, 8, 8), 0.15))
    light = rep(torch.full((3, 8, 8), 0.85))
    assert float(dark[0].mean()) < float(light[0].mean()) - 1.0


def test_input_repr_of_defaults_old_runs_to_rgb():
    assert input_repr_of({}) == ("rgb", 3)
    assert input_repr_of({"input_repr": "gray+sobel"}) == ("gray+sobel", 2)
    with pytest.raises(ValueError, match="unknown input_repr"):
        input_repr_of({"input_repr": "edges"})


def test_normalize_batch_reproduces_the_pil_transform():
    """Serving builds its batch with tensor ops, training with the PIL transform. They have to
    agree — this is the seam `predict_arrays` runs on every live frame."""
    from PIL import Image

    from chesslab.training.torch_data import normalize_batch

    cfg = {"out_size": [16, 16], "input_repr": "gray+sobel"}
    arr = np.random.default_rng(3).integers(0, 256, (2, 16, 16, 3), dtype=np.uint8)
    via_pil = torch.stack([build_transform((16, 16), train=False, input_repr="gray+sobel")(
        Image.fromarray(a)) for a in arr])
    batch = torch.from_numpy(arr).permute(0, 3, 1, 2).float().div_(255)
    assert torch.allclose(normalize_batch(cfg, batch), via_pil, atol=1e-5)


def test_packed_eval_fast_path_is_bit_exact_to_the_pil_transform():
    """Skipping PIL for an exact-size memmap crop must not change a single float."""
    from PIL import Image

    arr = np.random.default_rng(847291).integers(0, 256, (32, 32, 3), dtype=np.uint8)
    tf = build_transform((32, 32), train=False)

    assert torch.equal(tf.from_uint8_hwc(arr), tf(Image.fromarray(arr)))


def test_build_model_stem_follows_the_channel_count():
    from chesslab.training.model import build_model

    m = build_model("smallcnn", 2, in_chans=2, norm="none")
    assert m(torch.zeros(1, 2, 32, 32)).shape == (1, 2)
