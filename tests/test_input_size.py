"""The model's input size is a CHOICE, not whatever the crop files happen to be."""

from chesslab import config
from chesslab.labeling import parse_out_size
from chesslab.training.torch_data import SquareDataset, build_transform


def _rows(tmp_path, size: int) -> list[dict]:
    import cv2
    import numpy as np

    out = tmp_path / "empty"
    out.mkdir(parents=True)
    rows = []
    for i in range(3):
        p = out / f"s_{i:04d}_e4.webp"
        cv2.imwrite(str(p), np.full((size, size, 3), 90, np.uint8))
        rows.append({"path": str(p), "label": "empty", "session_id": "s", "frame": f"{i:04d}",
                     "square": "e4", "out_size": [size, size]})
    return rows


def test_a_128_px_store_still_trains_an_80_px_model(tmp_path):
    """The store went to 128 px for the LABEL VIEW; the recipe is 80. `build_transform` starts with
    a Resize, so the scaling happens in memory and one store serves every deployment resolution.

    It matters: at 128 px the shipped net costs 15.47 MMAC per crop against 6.68 — 2.32x, past the
    9.8 knee the SM8650 cost model measures, i.e. 69 ms per board instead of 45.
    """
    rows = _rows(tmp_path, 128)

    for want in (80, 96, 128):
        ds = SquareDataset(rows, config.CLASSES, build_transform((want, want), train=False))
        assert tuple(ds[0][0].shape) == (3, want, want), want


def test_the_override_is_read_before_the_manifest():
    """`train` used to take `out_size` from the first manifest row, so changing the crop store
    silently changed the model. `--input-size` is the explicit answer."""
    assert parse_out_size("80x80") == (80, 80)
    assert parse_out_size("96x128") == (96, 128)
